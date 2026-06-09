import re
import os

file_path = r"c:\Users\Arun Panchal\Downloads\ChurnPredictor\app.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Inject data simulation logic into load_data() function
# Look for "if 'recommended_action' not in df.columns:"
injection = """
        if 'complaint_text' not in df.columns:
            import random
            def get_complaint_text(row):
                c = row.get('complaint_count', 0)
                if c == 0: return ""
                if 1 <= c <= 3:
                    return random.choice(["Signal issue last week", "Remote not working", "Billing query"])
                if 4 <= c <= 7:
                    return random.choice(["No signal for 3 days, very frustrated", "Wrong charges on account"])
                if c >= 8:
                    return random.choice(["Terrible service, planning to cancel", "Useless customer care, want refund"])
                return ""
            df['complaint_text'] = df.apply(get_complaint_text, axis=1)
            
        if 'sentiment' not in df.columns:
            def get_sentiment(row):
                text = str(row.get('complaint_text', '')).lower()
                if any(w in text for w in ["cancel", "useless", "terrible", "worst", "fraud"]):
                    return "Angry"
                if any(w in text for w in ["frustrated", "disappointed", "wrong", "issue"]):
                    return "Frustrated"
                return "Neutral"
            df['sentiment'] = df.apply(get_sentiment, axis=1)
"""
content = content.replace("if 'recommended_action' not in df.columns:", injection + "\n        if 'recommended_action' not in df.columns:")

# 2. Inject endpoint
endpoint = """
@app.get("/api/sentiment-summary")
def get_sentiment_summary():
    global df
    if df is None or df.empty:
        return {}
    
    complaining_df = df[df['complaint_count'] > 0]
    if complaining_df.empty:
        return {"angry_count": 0, "frustrated_count": 0, "neutral_count": 0, "angry_pct": 0, "frustrated_pct": 0, "neutral_pct": 0, "top_angry_subscribers": [], "sentiment_by_region": []}

    total = len(complaining_df)
    angry = len(complaining_df[complaining_df['sentiment'] == 'Angry'])
    frustrated = len(complaining_df[complaining_df['sentiment'] == 'Frustrated'])
    neutral = len(complaining_df[complaining_df['sentiment'] == 'Neutral'])

    # Top angry
    top_angry = complaining_df[complaining_df['sentiment'] == 'Angry'].sort_values('complaint_count', ascending=False).head(10)
    top_angry_list = top_angry[['subscriber_id', 'region', 'complaint_count', 'complaint_text']].to_dict(orient='records')

    # Regional
    regional_counts = complaining_df.groupby(['region', 'sentiment']).size().unstack(fill_value=0).reset_index()
    if 'Angry' not in regional_counts: regional_counts['Angry'] = 0
    if 'Frustrated' not in regional_counts: regional_counts['Frustrated'] = 0
    if 'Neutral' not in regional_counts: regional_counts['Neutral'] = 0
    
    reg_list = []
    for _, row in regional_counts.iterrows():
        reg_list.append({
            "region": row['region'],
            "angry": int(row['Angry']),
            "frustrated": int(row['Frustrated']),
            "neutral": int(row['Neutral'])
        })
        
    reg_list.sort(key=lambda x: x['angry'], reverse=True)

    return {
        "angry_count": angry,
        "frustrated_count": frustrated,
        "neutral_count": neutral,
        "angry_pct": (angry / total) * 100 if total > 0 else 0,
        "frustrated_pct": (frustrated / total) * 100 if total > 0 else 0,
        "neutral_pct": (neutral / total) * 100 if total > 0 else 0,
        "top_angry_subscribers": top_angry_list,
        "sentiment_by_region": reg_list
    }
"""
content = content + "\n" + endpoint

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated app.py")
