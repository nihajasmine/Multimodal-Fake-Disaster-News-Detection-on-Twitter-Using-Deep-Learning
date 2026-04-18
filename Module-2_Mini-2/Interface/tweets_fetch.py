import tweepy
import time

# =========================
# CONFIGURATION
# =========================
BEARER_TOKEN = "AAAAAAAAAAAAAAAAAAAAAN5k4AEAAAAAahoSDuvXDCH6BwFVLg%2BEKKyO0NE%3Db9bnZ05ymBawujIpL5fM2V6DhRK5wMlqdKPv1Q9gIexUvTnpwz"

QUERY = "(disaster OR flood OR earthquake OR fire) lang:en -is:retweet"
TWEETS_PER_REQUEST = 10
FETCH_INTERVAL = 15  # seconds between fetches

# =========================
# AUTHENTICATION
# =========================
client = tweepy.Client(
    bearer_token=BEARER_TOKEN,
    wait_on_rate_limit=True
)

# =========================
# FETCH FUNCTION
# =========================
def fetch_tweets():
    response = client.search_recent_tweets(
        query=QUERY,
        max_results=TWEETS_PER_REQUEST,
        tweet_fields=["created_at", "attachments"],
        expansions=["attachments.media_keys"],
        media_fields=["url", "type"]
    )

    tweets_data = []

    media_dict = {}
    if response.includes and "media" in response.includes:
        for media in response.includes["media"]:
            media_dict[media.media_key] = media.url

    if response.data:
        for tweet in response.data:
            image_urls = []

            if tweet.attachments and "media_keys" in tweet.attachments:
                for key in tweet.attachments["media_keys"]:
                    if key in media_dict:
                        image_urls.append(media_dict[key])

            tweets_data.append({
                "tweet_id": tweet.id,
                "text": tweet.text,
                "created_at": tweet.created_at,
                "images": image_urls  # empty list if no image
            })

    return tweets_data

# =========================
# REAL-TIME LOOP
# =========================
if __name__ == "__main__":
    while True:
        print("\nFetching latest tweets...\n")
        tweets = fetch_tweets()

        for i, tweet in enumerate(tweets, start=1):
            print(f"Tweet {i}")
            print("ID:", tweet["tweet_id"])
            print("Time:", tweet["created_at"])
            print("Text:", tweet["text"])
            print("Images:", tweet["images"])
            print("-" * 50)

        time.sleep(FETCH_INTERVAL)
