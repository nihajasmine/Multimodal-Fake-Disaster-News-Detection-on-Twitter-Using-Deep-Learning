import tweepy
import torch
import tensorflow as tf
import numpy as np
import pandas as pd
import requests
import time
import os

from transformers import RobertaTokenizer, RobertaForSequenceClassification
from PIL import Image
from io import BytesIO
import spacy
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

# =============================
# CONFIG
# =============================
BEARER_TOKEN = r"AAAAAAAAAAAAAAAAAAAAAJmm0QEAAAAA2Fx8%2Bsf0gXoJXyDH%2FQ5wszlBO5o%3Dgw2zDqsNMrswJZZ851hz94FKtEN49qA9XxWqZ4WFEXCGg3wpUd"
EXCEL_PATH = "disaster_tweets.xlsx"

TEXT_MODEL_PATH = r"C:\Users\HP\Documents\Mini2_Final\Project\Notebooks\roberta-base-fine-tuned.pth"
IMAGE_MODEL_PATH = r"C:\Users\HP\Documents\Mini2_Final\Project\Notebooks\mobilenetv2_finetuned.h5"

FETCH_COUNT = 10              # MUST be between 10 and 100
FETCH_INTERVAL = 20           # seconds
QUERY = "(disaster OR flood OR earthquake OR fire) lang:en -is:retweet"

IMG_SIZE = 224

LABELS = [
    "Damaged_Infrastructure",
    "Fire_Disaster",
    "Human_Damage",
    "Land_Disaster",
    "Non_Damage",
    "Water_Disaster"
]

# =============================
# LOAD MODELS
# =============================
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

tokenizer = RobertaTokenizer.from_pretrained("roberta-base")
text_model = RobertaForSequenceClassification.from_pretrained(
    "roberta-base", num_labels=2
)
text_model.load_state_dict(torch.load(TEXT_MODEL_PATH, map_location=device))
text_model.to(device)
text_model.eval()

img_model = tf.keras.models.load_model(IMAGE_MODEL_PATH)

nlp = spacy.load("en_core_web_sm")
sentiment_analyzer = SentimentIntensityAnalyzer()

# =============================
# TWITTER CLIENT
# =============================
client = tweepy.Client(bearer_token=BEARER_TOKEN, wait_on_rate_limit=True)

last_seen_id = None  # prevents duplicates

# =============================
# FUNCTIONS
# =============================
def predict_text_prob(text):
    inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True).to(device)
    with torch.no_grad():
        logits = text_model(**inputs).logits
        probs = torch.softmax(logits, dim=1).cpu().numpy()[0]
    return probs[1]

def preprocess_image(url):
    response = requests.get(url, timeout=5)
    img = Image.open(BytesIO(response.content)).convert("RGB")
    img = img.resize((IMG_SIZE, IMG_SIZE))
    img = np.array(img)
    img = tf.keras.applications.mobilenet_v2.preprocess_input(img)
    return np.expand_dims(img, axis=0)

def predict_image_type(image_url):
    try:
        img = preprocess_image(image_url)
        preds = img_model.predict(img, verbose=0)[0]
        idx = int(np.argmax(preds))
        return LABELS[idx], float(preds[idx])
    except Exception:
        return "Unknown", 0.0

def extract_location(text):
    doc = nlp(text)
    locs = [ent.text for ent in doc.ents if ent.label_ in ["GPE", "LOC"]]
    return ", ".join(set(locs)) if locs else "Unknown"

def compute_urgency(text):
    score = sentiment_analyzer.polarity_scores(text)["compound"]
    if score <= -0.6:
        return "High"
    elif score <= -0.2:
        return "Medium"
    else:
        return "Low"

def decision_fusion(text, images):
    t_prob = predict_text_prob(text)

    if not images:
        return (1 if t_prob >= 0.5 else 0), t_prob, "Unknown"

    dtype, img_conf = predict_image_type(images[0])
    img_prob = img_conf if dtype != "Non_Damage" else 1 - img_conf

    alpha = t_prob / (t_prob + img_prob + 1e-8)
    beta = img_prob / (t_prob + img_prob + 1e-8)

    fusion_score = alpha * t_prob + beta * img_prob
    return (1 if fusion_score >= 0.5 else 0), fusion_score, dtype

def save_to_excel(row):
    df = pd.DataFrame([row])
    if not os.path.exists(EXCEL_PATH):
        df.to_excel(EXCEL_PATH, index=False)
    else:
        existing = pd.read_excel(EXCEL_PATH)
        updated = pd.concat([existing, df], ignore_index=True)
        updated.to_excel(EXCEL_PATH, index=False)

# =============================
# MAIN LOOP
# =============================
while True:
    print("\nFetching tweets...\n")

    response = client.search_recent_tweets(
        query=QUERY,
        max_results=FETCH_COUNT,
        since_id=last_seen_id,
        tweet_fields=["created_at", "attachments"],
        expansions=["attachments.media_keys"],
        media_fields=["url"]
    )

    media_map = {}
    if response.includes and "media" in response.includes:
        for media in response.includes["media"]:
            media_map[media.media_key] = media.url

    if response.data:
        last_seen_id = response.data[0].id

        for tweet in response.data:
            images = []
            if tweet.attachments and "media_keys" in tweet.attachments:
                for k in tweet.attachments["media_keys"]:
                    if k in media_map:
                        images.append(media_map[k])

            label, score, dtype = decision_fusion(tweet.text, images)

            if label == 1:
                row = {
                    "tweet": tweet.text,
                    "type": dtype,
                    "location": extract_location(tweet.text),
                    "urgency": compute_urgency(tweet.text),
                    "confidence": round(score, 3)
                }
                save_to_excel(row)
                print("Stored disaster tweet")

    time.sleep(FETCH_INTERVAL)
