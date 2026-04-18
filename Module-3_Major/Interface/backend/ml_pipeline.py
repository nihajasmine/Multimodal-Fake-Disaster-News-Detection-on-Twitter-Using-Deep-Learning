import os
import torch
from transformers import RobertaTokenizer, pipeline
import tensorflow as tf
from tensorflow.keras.preprocessing import image as keras_image
import numpy as np
import spacy
from dotenv import load_dotenv
import logging

load_dotenv()
logger = logging.getLogger(__name__)

# ===== PATHS =====
MODEL_PATH = r"C:\Users\HP\Documents\Major_Final\Github-code\Module-3_Major\Notebooks\model.pt"
TOKENIZER_PATH = r"C:\Users\HP\Documents\Major_Final\Github-code\Module-3_Major\Notebooks\tokenizer"
RESNET_PATH = r"C:\Users\HP\Documents\Major_Final\Github-code\Module-2_Mini-2\Notebooks\resnet50_disaster_finetuned.keras"

device = torch.device("cpu")

# ===== ALLOWED VALUES =====
ALLOWED_DISASTER_TYPES = [
    "Cyclone", "Earthquake", "Flood", "Infrastructure",
    "Land Slide", "Non Damage", "Urban Fire", "Wild Fire"
]
ALLOWED_URGENCY = ["High", "Medium", "Low"]

# ===== GLOBALS =====
roberta_model = None
roberta_tokenizer = None
resnet_model = None
nlp = None
sentiment_pipeline_model = None


# ===== LOAD MODELS =====
def init_models():
    global roberta_model, roberta_tokenizer, resnet_model, nlp, sentiment_pipeline_model

    print("Loading models...")

    # ===== MultiTask RoBERTa =====
    try:
        print("Loading MultiTask RoBERTa...")

        roberta_tokenizer = RobertaTokenizer.from_pretrained(TOKENIZER_PATH)

        roberta_model = MultiTaskRoBERTa()   # your class
        roberta_model.load_state_dict(torch.load(MODEL_PATH, map_location=device))
        roberta_model.to(device)
        roberta_model.eval()

    except Exception as e:
        print(f"RoBERTa load failed: {e}")
        roberta_model = None

    # ===== ResNet =====
    try:
        print("Loading ResNet50...")
        resnet_model = tf.keras.models.load_model(RESNET_PATH)
    except Exception as e:
        print(f"ResNet load failed: {e}")
        resnet_model = None

    # ===== spaCy =====
    try:
        nlp = spacy.load("en_core_web_sm")
    except:
        nlp = None

    # ===== Sentiment =====
    try:
        sentiment_pipeline_model = pipeline(
            "sentiment-analysis",
            model="cardiffnlp/twitter-roberta-base-sentiment",
            device=-1
        )
    except:
        sentiment_pipeline_model = None

    print("✅ Models loaded")


# ===== MULTITASK PREDICTION =====
def roberta_predict(text: str):
    if roberta_model is None:
        return "Not Disaster", "Fake"

    try:
        inputs = roberta_tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            padding=True,
            max_length=512
        ).to(device)

        with torch.no_grad():
            out_d, out_r = roberta_model(**inputs)

            pred_d = torch.argmax(out_d, dim=1).item()
            pred_r = torch.argmax(out_r, dim=1).item()

        is_disaster = "Disaster" if pred_d == 1 else "Not Disaster"
        real_or_fake = "Real" if pred_r == 1 else "Fake"

        return is_disaster, real_or_fake

    except Exception as e:
        print(f"RoBERTa error: {e}")
        return "Not Disaster", "Fake"


# ===== RESNET =====
def predict_disaster_type(image_path):
    if resnet_model is None:
        return "Non Damage"

    classes = [
        "Cyclone", "Earthquake", "Flood", "Infrastructure",
        "Land Slide", "Non Damage", "Urban Fire", "Wild Fire"
    ]

    try:
        img = keras_image.load_img(image_path, target_size=(224, 224))
        x = keras_image.img_to_array(img)
        x = np.expand_dims(x, axis=0)
        x = tf.keras.applications.resnet50.preprocess_input(x)

        preds = resnet_model.predict(x)
        idx = np.argmax(preds[0])

        return classes[idx] if idx < len(classes) else "Non Damage"

    except Exception as e:
        print(f"ResNet error: {e}")
        return "Non Damage"


# ===== LOCATION =====
def extract_location(text):
    if nlp is None:
        return "Unknown"

    doc = nlp(text)
    locs = [ent.text.title() for ent in doc.ents if ent.label_ in ["GPE", "LOC"]]
    return ", ".join(locs) if locs else "Unknown"


# ===== URGENCY =====
def predict_urgency(text):
    if sentiment_pipeline_model is None:
        return "Medium"

    try:
        result = sentiment_pipeline_model(text[:512])[0]["label"]

        if "LABEL_0" in result or "negative" in result.lower():
            return "High"
        elif "LABEL_1" in result:
            return "Medium"
        else:
            return "Low"

    except:
        return "Medium"


# ===== RULE FILTER =====
def is_non_event_context(text):
    keywords = [
        "raising day", "anniversary", "awareness",
        "training", "mock drill", "tribute",
        "celebration", "drill"
    ]
    return any(k in text.lower() for k in keywords)


# ===== PIPELINE =====
def process_tweet_pipeline(text, image_path=None):
    disaster_type = "None"
    location = "Unknown"
    urgency = "Medium"

    # Step 1 → multitask model
    is_disaster, real_or_fake = roberta_predict(text)

    # Rule override
    if is_disaster == "Disaster" and is_non_event_context(text):
        is_disaster = "Not Disaster"
        real_or_fake = "Fake"

    # Step 2 → deeper processing
    if is_disaster == "Disaster" and real_or_fake == "Real":

        if image_path and os.path.exists(image_path):
            disaster_type = predict_disaster_type(image_path)
        else:
            disaster_type = "Non Damage"

        location = extract_location(text)
        urgency = predict_urgency(text)

    return {
        "is_disaster": is_disaster,
        "real_or_fake": real_or_fake,
        "disaster_type": disaster_type,
        "location": location,
        "urgency": urgency
    }