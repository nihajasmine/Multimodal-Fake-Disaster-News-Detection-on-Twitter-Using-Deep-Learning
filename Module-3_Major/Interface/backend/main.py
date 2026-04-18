import os
from datetime import datetime
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import uuid
import tweepy
from dotenv import load_dotenv
import requests as http_requests
import mysql.connector

from ml_pipeline import process_tweet_pipeline, init_models

load_dotenv()

app = FastAPI(title="Multimodal Disaster Tweet Detection API")

# Setup CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For Dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
IMAGES_DIR = os.path.join(DATA_DIR, "images")

# Ensure directories exist
os.makedirs(IMAGES_DIR, exist_ok=True)

app.mount("/static", StaticFiles(directory=DATA_DIR), name="static")

def get_db_connection():
    """Connect to the MySQL 'major' database."""
    return mysql.connector.connect(
        host="localhost",
        user="user",
        password="pass",
        database="major"
    )

def init_db():
    """Initialize MySQL Database with required table strictly matching requirements."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS tweets (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tweet_text TEXT,
                image_path VARCHAR(255),
                is_disaster VARCHAR(50),
                disaster_type VARCHAR(50),
                real_or_fake VARCHAR(50),
                location VARCHAR(100),
                latitude FLOAT,
                longitude FLOAT,
                urgency VARCHAR(50),
                timestamp VARCHAR(50)
            )
        """)
        conn.commit()
        cursor.close()
        conn.close()
        print("MySQL Database Connected & Verified.")
    except Exception as e:
        print(f"Database initialization failed: {e}")

@app.on_event("startup")
async def startup_event():
    init_db()
    init_models()


def geocode_location(location: str):
    """
    Uses Nominatim API to get latitude and longitude for a given location.
    Returns (lat, lon) as floats, or (None, None) if not found/failed.
    """
    if not location or location == "Unknown":
        return None, None
        
    try:
        url = f"https://nominatim.openstreetmap.org/search?q={location}&format=json"
        headers = {
            "User-Agent": "DisasterTweetApp/1.0 (Contact: no-reply@example.com)"
        }
        res = http_requests.get(url, headers=headers, timeout=10)
        
        if res.status_code == 200:
            data = res.json()
            if data and len(data) > 0:
                lat = float(data[0].get("lat"))
                lon = float(data[0].get("lon"))
                return lat, lon
    except Exception as e:
        print(f"Geocoding failed for '{location}': {e}")
        
    return None, None


def should_store(results: dict) -> bool:
    """
    STRICT RULE: Only store in database if BOTH conditions are met:
      - is_disaster == "Disaster"
      - real_or_fake == "Real"
    """
    return results.get("is_disaster") == "Disaster" and results.get("real_or_fake") == "Real"


@app.get("/api/tweets")
async def get_tweets():
    """Read and return tweets from MySQL ensuring all have coordinates."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM tweets ORDER BY id DESC")
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return {"success": True, "data": rows}
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})


@app.post("/api/analyze")
async def analyze_manual_tweet(
    tweet_text: str = Form(None),
    image: UploadFile = File(None)
):
    """
    Analyze a single manual tweet — NEVER saves to database.
    Input allows optional text/image.
    """
    text_content = tweet_text if tweet_text is not None else ""
    temp_image_path = None

    if image:
        if not image.filename.lower().endswith(('.png', '.jpg', '.jpeg')):
            raise HTTPException(status_code=400, detail="Only PNG, JPG, JPEG allowed")
        
        temp_image_path = os.path.join(IMAGES_DIR, f"temp_{uuid.uuid4().hex}.png")

        try:
            from PIL import Image as PILImage
            contents = await image.read()
            from io import BytesIO
            pil_img = PILImage.open(BytesIO(contents))
            if pil_img.mode in ("RGBA", "P"):
                pil_img = pil_img.convert("RGB")
            pil_img.save(temp_image_path, "PNG")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Image processing failed: {e}")

    try:
        results = process_tweet_pipeline(text_content, temp_image_path)
    except Exception as e:
        if temp_image_path and os.path.exists(temp_image_path):
            os.remove(temp_image_path)
        raise HTTPException(status_code=500, detail=str(e))

    if temp_image_path and os.path.exists(temp_image_path):
        os.remove(temp_image_path)

    return results


@app.get("/api/fetch-tweets")
async def fetch_latest_tweets():
    """
    Fetch tweets via Twitter, run pipeline, geocode, and explicitly 
    insert to MySQL ONLY if rules align and coordinates exist.
    """
    bearer_token = os.getenv("TWITTER_BEARER_TOKEN")
    if not bearer_token or bearer_token == "your_twitter_bearer_token_here" or bearer_token.strip() == "":
        raise HTTPException(status_code=400, detail="Twitter Bearer Token not configured in .env")

    try:
        client = tweepy.Client(bearer_token=bearer_token)
        query = 'disaster OR flood OR earthquake OR fire OR emergency -is:retweet has:images'
        tweets = client.search_recent_tweets(
            query=query, 
            max_results=10, 
            expansions=['attachments.media_keys'], 
            media_fields=['url']
        )
        
        if not tweets.data:
            return {"success": True, "message": "No new tweets found", "fetched": 0, "stored": 0}

        media_dict = {}
        if tweets.includes and 'media' in tweets.includes:
            for media in tweets.includes['media']:
                media_dict[media.media_key] = media.url

        fetched_count = 0
        stored_count = 0

        for tweet in tweets.data:
            text = tweet.text
            image_url = None
            fetched_count += 1
            
            if tweet.attachments and 'media_keys' in tweet.attachments:
                for key in tweet.attachments['media_keys']:
                    if key in media_dict and media_dict[key]:
                        image_url = media_dict[key]
                        break
            
            full_image_path = None
            image_path_saved = ""
            if image_url:
                try:
                    img_data = http_requests.get(image_url, timeout=10).content
                    filename = f"tweet_{uuid.uuid4().hex}.png"
                    save_path = os.path.join(IMAGES_DIR, filename)
                    
                    from PIL import Image as PILImage
                    from io import BytesIO
                    pil_img = PILImage.open(BytesIO(img_data))
                    if pil_img.mode in ("RGBA", "P"):
                        pil_img = pil_img.convert("RGB")
                    pil_img.save(save_path, "PNG")
                    image_path_saved = f"images/{filename}"
                    full_image_path = save_path
                except Exception as e:
                    print(f"Image fetch/save error: {e}")
            
            # PIPELINE RUN
            results = process_tweet_pipeline(text, full_image_path)
            
            # STRICT DATA DECISION
            if should_store(results):
                location = results.get("location")
                
                # GEOCODING (REQUIRED FOR STORAGE)
                lat, lon = geocode_location(location)
                
                if lat is None or lon is None:
                    print(f"⏭ SKIPPED: Coordinates missing for location '{location}'")
                    if full_image_path and os.path.exists(full_image_path):
                        os.remove(full_image_path)
                    continue
                
                # INSERT TO MYSQL
                try:
                    conn = get_db_connection()
                    cursor = conn.cursor()
                    insert_query = """
                        INSERT INTO tweets 
                        (tweet_text, image_path, is_disaster, disaster_type, real_or_fake, location, latitude, longitude, urgency, timestamp) 
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """
                    values = (
                        text, 
                        image_path_saved, 
                        results["is_disaster"], 
                        results["disaster_type"], 
                        results["real_or_fake"], 
                        location, 
                        lat, 
                        lon, 
                        results["urgency"], 
                        datetime.now().strftime("%Y-%m-%d %H:%M")
                    )
                    cursor.execute(insert_query, values)
                    conn.commit()
                    cursor.close()
                    conn.close()
                    
                    stored_count += 1
                    print(f"✅ STORED IN DB: {text[:80]}...")
                except Exception as e:
                    print(f"Database insert error: {e}")
                    if full_image_path and os.path.exists(full_image_path):
                         os.remove(full_image_path)
            else:
                if full_image_path and os.path.exists(full_image_path):
                    os.remove(full_image_path)
                print(f"❌ REJECTED (Rules): {text[:80]}...")

        return {
            "success": True, 
            "message": f"Processed {fetched_count} tweets, stored {stored_count} valid entries", 
            "fetched": fetched_count, 
            "stored": stored_count
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
