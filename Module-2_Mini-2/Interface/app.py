from flask import Flask, request, jsonify
from flask_cors import CORS

import pandas as pd
import os
import torch
import tensorflow as tf
import numpy as np

from transformers import RobertaTokenizer, RobertaForSequenceClassification
from PIL import Image
import spacy
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

# =============================
# APP
# =============================
app = Flask(__name__)
CORS(app)

# =============================
# LOAD MODELS (ONCE)
# =============================
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

TEXT_MODEL_PATH = r"C:\Users\HP\Documents\Mini2_Final\Project\Notebooks\roberta-base-fine-tuned.pth"
IMAGE_MODEL_PATH = r"C:\Users\HP\Desktop\MINI\disaster_classification_mobilenetv2.h5"

tokenizer = RobertaTokenizer.from_pretrained("roberta-base")
text_model = RobertaForSequenceClassification.from_pretrained(
    "roberta-base", num_labels=2
)
text_model.load_state_dict(torch.load(TEXT_MODEL_PATH, map_location=device))
text_model.to(device)
text_model.eval()

img_model = tf.keras.models.load_model(IMAGE_MODEL_PATH)

nlp = spacy.load("en_core_web_sm")
sentiment = SentimentIntensityAnalyzer()

LABELS = [
    "Damaged_Infrastructure",
    "Fire_Disaster",
    "Human_Damage",
    "Land_Disaster",
    "Non_Damage",
    "Water_Disaster"
]

IMG_SIZE = 224

# =============================
# HELPERS
# =============================
def predict_text_prob(text):
    inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True).to(device)
    with torch.no_grad():
        logits = text_model(**inputs).logits
        probs = torch.softmax(logits, dim=1).cpu().numpy()[0]
    return float(probs[1])

def preprocess_uploaded_image(file_storage):
    img = Image.open(file_storage).convert("RGB")
    img = img.resize((IMG_SIZE, IMG_SIZE))
    img = np.array(img)
    img = tf.keras.applications.mobilenet_v2.preprocess_input(img)
    return np.expand_dims(img, axis=0)

def predict_image_type_from_file(file_storage):
    try:
        img = preprocess_uploaded_image(file_storage)
        preds = img_model.predict(img, verbose=0)[0]
        idx = int(np.argmax(preds))
        return LABELS[idx], float(preds[idx])
    except Exception as e:
        print("Image processing error:", e)
        return "Unknown", 0.0

def extract_location(text):
    doc = nlp(text)
    locs = [ent.text for ent in doc.ents if ent.label_ in ["GPE", "LOC"]]
    return list(set(locs))

def urgency_level(text):
    score = sentiment.polarity_scores(text)["compound"]
    if score <= -0.6:
        return "High"
    elif score <= -0.2:
        return "Medium"
    return "Low"

# =============================
# PREDICT ENDPOINT
# =============================
@app.route("/predict", methods=["POST"])
def predict():
    text = request.form.get("text", "").strip()
    image_file = request.files.get("image")  # uploaded file

    if not text:
        return jsonify({"error": "Text is required"}), 400

    # Text prediction
    t_prob = predict_text_prob(text)

    dtype = "Unknown"
    score = t_prob

    # Image prediction (ONLY if image uploaded)
    if image_file:
        dtype_img, img_conf = predict_image_type_from_file(image_file)
        img_prob = img_conf if dtype_img != "Non_Damage" else 1 - img_conf

        alpha = t_prob / (t_prob + img_prob + 1e-8)
        beta = img_prob / (t_prob + img_prob + 1e-8)

        score = alpha * t_prob + beta * img_prob
        dtype = dtype_img

    is_disaster = score >= 0.5

    result = {
        "disaster": is_disaster,
        "confidence": round(score, 3),
        "type": dtype if is_disaster else "None",
        "location": extract_location(text) if is_disaster else [],
        "urgency": urgency_level(text) if is_disaster else "None"
    }

    return jsonify(result)



@app.route("/latest-tweets", methods=["GET"])
def latest_tweets():
    EXCEL_PATH = r"C:\Users\HP\Documents\Mini2_Final\Project\Interface\disaster_tweets.xlsx"

    if not os.path.exists(EXCEL_PATH):
        return jsonify([])

    df = pd.read_excel(EXCEL_PATH)

    if "tweet" not in df.columns:
        return jsonify([])

    # Reverse order (latest first) and take top 10
    tweets = df["tweet"].dropna().astype(str).tolist()[::-1][:10]

    return jsonify(tweets)


# =============================
# RUN
# =============================
if __name__ == "__main__":
    app.run(debug=True)

