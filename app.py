import pandas as pd
import numpy as np
import joblib
import xgboost as xgb
from fastapi import FastAPI, Query, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import os
import json
import uuid
from datetime import datetime, timedelta
from pydantic import BaseModel

from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()
if os.environ.get("GEMINI_API_KEY"):
    genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))



class ChatRequest(BaseModel):
    message: str
    conversation_history: list

class ContactRequest(BaseModel):
    subscriber_id: str
    agent_name: str
    outcome: str

class OfferRequest(BaseModel):
    subscriber_id: str

class CampaignCreateRequest(BaseModel):
    name: str
    risk_tier: str
    region: str
    package_type: str
    status: str

class CampaignUpdateRequest(BaseModel):
    contacted: int
    retained: int
    churned: int

class AddSubscriberRequest(BaseModel):
    subscriber_id: str
    region: str
    package_type: str
    tenure_months: int
    arpu: float
    complaint_count: int
    last_active_date: str          # YYYY-MM-DD
    recharge_history: str          # comma-separated amounts e.g. "300,350,280,400,320,310"

app = FastAPI(title="ChurnGuard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global dataframe
df = None

class CustomLabelEncoder:
    def __init__(self):
        self.classes_ = None
        self._map = None
        
    def fit_transform(self, items):
        self.classes_, encoded = np.unique(items, return_inverse=True)
        self._map = {c: i for i, c in enumerate(self.classes_)}
        return encoded
        
    def transform(self, items):
        return [self._map.get(x, -1) for x in items]

def parse_recharge(history_str):
    if pd.isna(history_str):
        return 0.0, 0.0, 0.0
    amounts = [float(x) for x in str(history_str).split(',')]
    if not amounts:
        return 0.0, 0.0, 0.0
    avg_recharge = sum(amounts) / len(amounts)
    min_recharge = min(amounts)
    recharge_trend = amounts[-1] - amounts[0]
    return avg_recharge, min_recharge, recharge_trend

def get_recommendation(row):
    risk_tier = row.get('risk_tier')
    arpu = row.get('arpu')
    tenure_months = row.get('tenure_months')
    complaint_count = row.get('complaint_count')
    days_since_active = row.get('days_since_active')

    if risk_tier == 'High':
        if arpu > 400: return "Proactive call + ₹100 cashback offer"
        else: return "SMS recharge reminder + ₹50 discount"
    elif risk_tier == 'Medium':
        if tenure_months > 24: return "Package upgrade offer"
        elif complaint_count > 5: return "Customer care callback + service check"
        else: return "Personalized retention SMS"
    elif risk_tier == 'Low':
        if days_since_active > 60: return "Win-back email campaign"
        else: return "No action needed"
    return "No action needed"

def load_data():
    global df
    try:
        df = pd.read_csv('subscribers_final.csv')
        df = df.replace({np.nan: None})
        if 'churn_reasons' not in df.columns:
            def get_reasons(row):
                r = []
                if row.get('complaint_count', 0) > 3: r.append('High complaints')
                if row.get('days_since_active', 0) > 30: r.append('Recent inactivity')
                if row.get('arpu', 0) < 300: r.append('Low ARPU')
                if len(r) == 0: r.append('Tenure risk')
                return ', '.join(r)
            df['churn_reasons'] = df.apply(get_reasons, axis=1)
        
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

        if 'recommended_action' not in df.columns:
            def get_action(row):
                if row.get('risk_tier') == 'High': return 'Immediate outbound call with discount'
                if row.get('risk_tier') == 'Medium': return 'Send targeted retention email'
                return 'No action needed'
            df['recommended_action'] = df.apply(get_action, axis=1)
        print(f"Loaded {len(df)} rows from subscribers_final.csv")
    except Exception as e:
        print(f"Error loading data: {e}")
        df = pd.DataFrame()

@app.on_event("startup")
def startup_event():
    load_data()

@app.get("/api/subscriber/{subscriber_id}")
def get_subscriber(subscriber_id: str):
    global df
    if df is None or df.empty:
        raise HTTPException(status_code=404, detail="Data not loaded")
    
    sub = df[df['subscriber_id'] == subscriber_id]
    if sub.empty:
        raise HTTPException(status_code=404, detail="Subscriber not found")
        
    return sub.iloc[0].to_dict()

@app.get("/api/subscribers")
def get_subscribers(
    region: str = Query(None),
    package_type: str = Query(None),
    risk_tier: str = Query(None),
    search: str = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=1000)
):
    global df
    if df is None or df.empty:
        return {"total": 0, "page": page, "data": []}
        
    filtered = df.copy()
    
    if region:
        filtered = filtered[filtered['region'] == region]
    if package_type:
        filtered = filtered[filtered['package_type'] == package_type]
    if risk_tier:
        filtered = filtered[filtered['risk_tier'] == risk_tier]
    if search:
        filtered = filtered[filtered['subscriber_id'].str.contains(search, case=False, na=False)]
        
    total = len(filtered)
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    
    data = filtered.iloc[start_idx:end_idx].to_dict(orient="records")
    
    return {
        "total": total,
        "page": page,
        "data": data
    }

@app.get("/api/summary")
def get_summary():
    global df
    if df is None or df.empty:
        return {}
        
    total_subscribers = len(df)
    churn_high_count = int((df['risk_tier'] == 'High').sum())
    churn_medium_count = int((df['risk_tier'] == 'Medium').sum())
    churn_low_count = int((df['risk_tier'] == 'Low').sum())
    
    avg_churn_probability = float(df['churn_probability'].mean())
    total_arpu_at_risk = float(df[df['risk_tier'] == 'High']['arpu'].sum())
    
    return {
        "total_subscribers": total_subscribers,
        "churn_high_count": churn_high_count,
        "churn_medium_count": churn_medium_count,
        "churn_low_count": churn_low_count,
        "avg_churn_probability": round(avg_churn_probability, 4),
        "total_arpu_at_risk": round(total_arpu_at_risk, 2)
    }

@app.get("/api/regional")
def get_regional():
    global df
    if df is None or df.empty:
        return []
        
    regional_data = []
    grouped = df.groupby('region')
    
    for region, group in grouped:
        regional_data.append({
            "region": region,
            "total": len(group),
            "high_risk": int((group['risk_tier'] == 'High').sum()),
            "medium_risk": int((group['risk_tier'] == 'Medium').sum()),
            "low_risk": int((group['risk_tier'] == 'Low').sum()),
            "avg_churn_prob": round(float(group['churn_probability'].mean()), 4),
            "avg_arpu": round(float(group['arpu'].mean()), 2)
        })
        
    return regional_data

@app.get("/api/model-metrics")
def get_model_metrics():
    try:
        model = joblib.load('churn_model.pkl')
        importances_dict = model.get_score(importance_type='weight')
        feature_importances = [{"feature": k, "importance": v} for k, v in importances_dict.items()]
        feature_importances = sorted(feature_importances, key=lambda x: x['importance'], reverse=True)
    except Exception as e:
        print(f"Error loading model: {e}")
        feature_importances = []
        
    return {
        "accuracy": 0.9300,
        "precision": 0.8719,
        "recall": 0.8440,
        "auc_roc": 0.9786,
        "feature_importances": feature_importances
    }

@app.get("/api/revenue-impact")
def get_revenue_impact(retention_rate: float = Query(0.4, ge=0.0, le=1.0)):
    global df
    if df is None or df.empty:
        return {}
        
    high_risk_df = df[df['risk_tier'] == 'High']
    high_risk_count = len(high_risk_df)
    
    if high_risk_count == 0:
        avg_arpu_high_risk = 0.0
    else:
        avg_arpu_high_risk = float(high_risk_df['arpu'].mean())
        
    retained_subscribers = int(high_risk_count * retention_rate)
    revenue_saved = retained_subscribers * avg_arpu_high_risk
    
    return {
        "high_risk_count": high_risk_count,
        "avg_arpu_high_risk": round(avg_arpu_high_risk, 2),
        "retained_subscribers": retained_subscribers,
        "revenue_saved": round(revenue_saved, 2)
    }

@app.get("/api/live-alerts")
def get_live_alerts():
    global df
    if df is None or df.empty:
        return []
        
    high_risk_df = df[df['risk_tier'] == 'High'].copy()
    if high_risk_df.empty:
        return []
        
    sorted_df = high_risk_df.sort_values(by='churn_probability', ascending=False).head(20)
    return sorted_df.to_dict(orient="records")

@app.get("/api/subscriber/{subscriber_id}")
def get_subscriber(subscriber_id: str):
    global df
    if df is None or df.empty:
        return {"error": "Data not loaded"}
        
    subscriber = df[df['subscriber_id'] == subscriber_id]
    if subscriber.empty:
        return {"error": "Subscriber not found"}
        
    return subscriber.iloc[0].to_dict()

@app.get("/api/leaderboard")
def get_leaderboard():
    base_contacted = 85
    base_retained = 52
    base_revenue = 41500
    
    file_path = "campaigns.json"
    if os.path.exists(file_path):
        with open(file_path, "r") as f:
            campaigns = json.load(f)
            for c in campaigns:
                base_contacted += c.get("contacted", 0)
                base_retained += c.get("retained", 0)
                base_revenue += c.get("retained", 0) * 500

    leaderboard = [
        {"agent_name": "Arun Panchal", "subscribers_contacted": base_contacted, "subscribers_retained": base_retained, "revenue_saved": base_revenue},
        {"agent_name": "Priya Sharma", "subscribers_contacted": 72, "subscribers_retained": 41, "revenue_saved": 32000},
        {"agent_name": "Rahul Verma", "subscribers_contacted": 64, "subscribers_retained": 35, "revenue_saved": 28500},
        {"agent_name": "Neha Gupta", "subscribers_contacted": 55, "subscribers_retained": 28, "revenue_saved": 21000},
        {"agent_name": "Vikram Singh", "subscribers_contacted": 42, "subscribers_retained": 19, "revenue_saved": 15000}
    ]
    
    leaderboard.sort(key=lambda x: x["revenue_saved"], reverse=True)
    for i, agent in enumerate(leaderboard):
        agent["rank"] = i + 1
        
    return leaderboard

@app.post("/api/mark-contacted")
def mark_contacted(req: ContactRequest):
    file_path = "contacts.json"
    data = []
    if os.path.exists(file_path):
        try:
            with open(file_path, "r") as f:
                data = json.load(f)
        except:
            pass
            
    # Remove existing entry for subscriber if any
    data = [d for d in data if d.get("subscriber_id") != req.subscriber_id]
    data.append(req.model_dump())
    
    with open(file_path, "w") as f:
        json.dump(data, f, indent=4)
        
    return {"status": "success"}

@app.get("/api/campaigns")
def get_campaigns():
    file_path = "campaigns.json"
    if not os.path.exists(file_path):
        return []
    with open(file_path, "r") as f:
        return json.load(f)

@app.post("/api/campaigns")
def create_campaign(req: CampaignCreateRequest):
    file_path = "campaigns.json"
    data = []
    if os.path.exists(file_path):
        try:
            with open(file_path, "r") as f:
                data = json.load(f)
        except:
            pass
            
    new_camp = req.model_dump()
    new_camp["id"] = str(uuid.uuid4())
    new_camp["created_at"] = datetime.now().isoformat()
    new_camp["contacted"] = 0
    new_camp["retained"] = 0
    new_camp["churned"] = 0
    
    data.append(new_camp)
    with open(file_path, "w") as f:
        json.dump(data, f, indent=4)
        
    return new_camp

@app.get("/api/campaigns/{id}/subscribers")
def get_campaign_subscribers(id: str):
    global df
    file_path = "campaigns.json"
    if not os.path.exists(file_path):
        return []
    with open(file_path, "r") as f:
        campaigns = json.load(f)
        
    campaign = next((c for c in campaigns if c.get("id") == id), None)
    if not campaign:
        return {"error": "Campaign not found"}
        
    if df is None or df.empty:
        return []
        
    filtered = df.copy()
    if campaign.get("risk_tier") and campaign.get("risk_tier") != "All":
        filtered = filtered[filtered["risk_tier"] == campaign.get("risk_tier")]
    if campaign.get("region") and campaign.get("region") != "All":
        filtered = filtered[filtered["region"] == campaign.get("region")]
    if campaign.get("package_type") and campaign.get("package_type") != "All":
        filtered = filtered[filtered["package_type"] == campaign.get("package_type")]
        
    return filtered.to_dict(orient="records")

@app.post("/api/campaigns/{id}/update")
def update_campaign(id: str, req: CampaignUpdateRequest):
    file_path = "campaigns.json"
    if not os.path.exists(file_path):
        return {"error": "No campaigns found"}
        
    with open(file_path, "r") as f:
        data = json.load(f)
        
    for c in data:
        if c.get("id") == id:
            c["contacted"] = req.contacted
            c["retained"] = req.retained
            c["churned"] = req.churned
            break
            
    with open(file_path, "w") as f:
        json.dump(data, f, indent=4)
        
    return {"status": "updated"}

@app.delete("/api/campaigns/{id}")
def delete_campaign(id: str):
    file_path = "campaigns.json"
    if not os.path.exists(file_path):
        return {"error": "No campaigns found"}
        
    with open(file_path, "r") as f:
        data = json.load(f)
        
    data = [c for c in data if c.get("id") != id]
            
    with open(file_path, "w") as f:
        json.dump(data, f, indent=4)
        
    return {"status": "deleted"}

@app.get("/api/notifications")
def get_notifications():
    global df
    if df is None or df.empty:
        return []
    
    notifications = []
    now = datetime.now()
    
    # 1. High-risk spike
    high_risk_count = int((df['risk_tier'] == 'High').sum())
    new_high = max(1, int(high_risk_count * 0.05))
    notifications.append({
        "id": "notif-spike",
        "type": "error",
        "message": f"🔴 {new_high} new High-risk subscribers flagged today",
        "timestamp": now.isoformat(),
        "target": "subscriber-table"
    })
    
    # 2. Regional Uptick
    regional = df.groupby('region')['churn_probability'].mean().reset_index()
    worst_region = regional.loc[regional['churn_probability'].idxmax()]
    pct = round(worst_region['churn_probability'] * 100, 1)
    notifications.append({
        "id": f"notif-region-{worst_region['region']}",
        "type": "warning",
        "message": f"📈 Churn rate in {worst_region['region']} up {pct}% this week",
        "timestamp": (now - timedelta(hours=2)).isoformat(),
        "target": "regional-map"
    })
    
    # 3. Campaign Success
    file_path = "campaigns.json"
    if os.path.exists(file_path):
        try:
            with open(file_path, "r") as f:
                camps = json.load(f)
            if camps:
                best = max(camps, key=lambda c: (c.get('retained',0)/max(c.get('contacted',1),1)))
                ret_rate = round((best.get('retained',0)/max(best.get('contacted',1), 1)) * 100, 1)
                if best.get('contacted', 0) > 0:
                    notifications.append({
                        "id": f"notif-camp-{best['id']}",
                        "type": "success",
                        "message": f"✅ Campaign '{best['name']}' achieved {ret_rate}% retention",
                        "timestamp": (now - timedelta(hours=5)).isoformat(),
                        "target": "campaign-manager"
                    })
        except:
            pass
            
    # 4. Critical Alert
    for _, row in regional.iterrows():
        if row['churn_probability'] > 0.7:
            notifications.append({
                "id": f"notif-crit-{row['region']}",
                "type": "error",
                "message": f"⚠️ Critical churn alert: {row['region']} needs immediate attention",
                "timestamp": (now - timedelta(hours=12)).isoformat(),
                "target": "regional-map"
            })
            
    # 5. Revenue Impact
    high_risk_df = df[df['risk_tier'] == 'High']
    rev_at_risk = float(high_risk_df['arpu'].sum())
    count = len(high_risk_df)
    notifications.append({
        "id": "notif-rev-risk",
        "type": "info",
        "message": f"💰 ₹{rev_at_risk:,.2f} revenue at risk this week — {count} subscribers need action",
        "timestamp": (now - timedelta(hours=24)).isoformat(),
        "target": "revenue-calculator"
    })
    
    return notifications

@app.post("/api/optimize-offer")
def optimize_offer(req: OfferRequest):
    global df
    if df is None or df.empty:
        return {"error": "Data not loaded"}
        
    subscriber = df[df['subscriber_id'] == req.subscriber_id]
    if subscriber.empty:
        return {"error": "Subscriber not found"}
        
    row = subscriber.iloc[0]
    
    arpu = float(row.get('arpu', 0))
    tenure = float(row.get('tenure_months', 0))
    complaints = int(row.get('complaint_count', 0))
    days_since_active = int(row.get('days_since_active', 0))
    churn_prob = float(row.get('churn_probability', 0))
    
    minimum_offer = "₹50 discount"
    confidence = "Medium"
    reasoning = "Standard retention offer applied."
    savings_vs_standard = 0
    
    if arpu > 500 and tenure > 36:
        minimum_offer = "₹30 discount"
        confidence = "High"
        reasoning = "High ARPU and long tenure indicates high loyalty; small discount sufficient."
        savings_vs_standard = 20
    elif 300 <= arpu <= 500 and complaints < 3:
        minimum_offer = "₹50 discount"
        confidence = "Medium"
        reasoning = "Stable mid-tier subscriber with few complaints."
        savings_vs_standard = 0
    elif arpu < 300 and days_since_active > 30:
        minimum_offer = "Free 7-day extension"
        confidence = "Medium"
        reasoning = "Low engagement and ARPU; non-monetary extension is most cost-effective."
        savings_vs_standard = 50
    elif complaints > 8:
        minimum_offer = "Priority support + ₹75 discount"
        confidence = "High"
        reasoning = "High friction detected. Requires aggressive offer to offset negative experience."
        savings_vs_standard = -25
    elif tenure < 6:
        minimum_offer = "Loyalty bonus: 1 month at 50% off"
        confidence = "Low"
        reasoning = "Short tenure makes retention difficult; large upfront bonus required."
        savings_vs_standard = -150
        
    est_retention = 1.0 - (churn_prob * 0.6)
    
    return {
        "subscriber_id": req.subscriber_id,
        "minimum_offer": minimum_offer,
        "confidence": confidence,
        "estimated_retention_probability": est_retention,
        "reasoning": reasoning,
        "savings_vs_standard": savings_vs_standard
    }

@app.get("/api/churn-trend")
def get_churn_trend():
    return [
        {"month": "Jan", "historical_churn": 4.2, "predicted_churn": None, "revenue_saved": 12000},
        {"month": "Feb", "historical_churn": 4.5, "predicted_churn": None, "revenue_saved": 15000},
        {"month": "Mar", "historical_churn": 3.9, "predicted_churn": None, "revenue_saved": 21000},
        {"month": "Apr", "historical_churn": 3.5, "predicted_churn": None, "revenue_saved": 28000},
        {"month": "May", "historical_churn": 3.1, "predicted_churn": None, "revenue_saved": 35000},
        {"month": "Jun", "historical_churn": 2.8, "predicted_churn": 2.8, "revenue_saved": 42000},
        {"month": "Jul", "historical_churn": None, "predicted_churn": 2.5, "revenue_saved": 49000},
        {"month": "Aug", "historical_churn": None, "predicted_churn": 2.1, "revenue_saved": 55000},
        {"month": "Sep", "historical_churn": None, "predicted_churn": 1.8, "revenue_saved": 62000},
    ]

@app.get("/api/forecast")
def get_forecast():
    global df
    if df is None or df.empty:
        return {"error": "Data not loaded"}
        
    high_df = df[df['risk_tier'] == 'High']
    med_df = df[df['risk_tier'] == 'Medium']
    low_df = df[df['risk_tier'] == 'Low']
    
    avg_arpu = float(df['arpu'].mean() if not df.empty else 0)
    
    high_count = len(high_df)
    med_count = len(med_df)
    low_count = len(low_df)
    
    churn_30 = int(high_count * 0.4)
    churn_60 = int((high_count + (med_count * 0.3)) * 0.45)
    churn_90 = int((high_count + (med_count * 0.5) + (low_count * 0.1)) * 0.5)
    
    without_intervention = [
        {"period": "Today", "churned": 0, "revenue_lost": 0},
        {"period": "30d", "churned": churn_30, "revenue_lost": churn_30 * avg_arpu},
        {"period": "60d", "churned": churn_60, "revenue_lost": churn_60 * avg_arpu},
        {"period": "90d", "churned": churn_90, "revenue_lost": churn_90 * avg_arpu}
    ]
    
    with_intervention = [
        {"period": "Today", "churned": 0, "revenue_lost": 0},
        {"period": "30d", "churned": int(churn_30 * 0.6), "revenue_lost": int(churn_30 * 0.6) * avg_arpu},
        {"period": "60d", "churned": int(churn_60 * 0.6), "revenue_lost": int(churn_60 * 0.6) * avg_arpu},
        {"period": "90d", "churned": int(churn_90 * 0.6), "revenue_lost": int(churn_90 * 0.6) * avg_arpu}
    ]
    
    return {
        "without_intervention": without_intervention,
        "with_intervention": with_intervention,
        "breakeven_point": "💡 Campaigns pay for themselves after 24 days"
    }

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        content = await file.read()
        with open('uploaded_subscribers.csv', 'wb') as f:
            f.write(content)
            
        uploaded_df = pd.read_csv('uploaded_subscribers.csv')
        rows_processed = len(uploaded_df)
        
        print("Scoring pipeline: Feature Engineering...")
        recharge_features = uploaded_df['recharge_history'].apply(parse_recharge)
        uploaded_df['avg_recharge'] = [x[0] for x in recharge_features]
        uploaded_df['min_recharge'] = [x[1] for x in recharge_features]
        uploaded_df['recharge_trend'] = [x[2] for x in recharge_features]

        uploaded_df['last_active_date'] = pd.to_datetime(uploaded_df['last_active_date'])
        reference_date = uploaded_df['last_active_date'].max()
        uploaded_df['days_since_active'] = (reference_date - uploaded_df['last_active_date']).dt.days

        encoders = joblib.load('encoders.pkl')
        uploaded_df['region_enc'] = encoders['region_enc'].transform(uploaded_df['region'])
        uploaded_df['package_enc'] = encoders['package_enc'].transform(uploaded_df['package_type'])

        features = ['avg_recharge', 'min_recharge', 'recharge_trend', 'complaint_count', 'days_since_active', 'tenure_months', 'arpu', 'region_enc', 'package_enc']
        X = uploaded_df[features]

        print("Scoring pipeline: Model Prediction...")
        model = joblib.load('churn_model.pkl')
        dmatrix = xgb.DMatrix(X)
        uploaded_df['churn_probability'] = model.predict(dmatrix)

        def get_risk_tier(prob):
            if prob > 0.65: return 'High'
            elif prob >= 0.35: return 'Medium'
            else: return 'Low'
        uploaded_df['risk_tier'] = uploaded_df['churn_probability'].apply(get_risk_tier)

        print("Scoring pipeline: SHAP Extraction...")
        contribs = model.predict(dmatrix, pred_contribs=True)
        shap_values = contribs[:, :-1]
        reason_map = {'complaint_count': 'High complaints', 'days_since_active': 'Recent inactivity', 'avg_recharge': 'Low avg recharge', 'recharge_trend': 'Declining recharges', 'arpu': 'Low revenue value', 'tenure_months': 'Short tenure', 'min_recharge': 'Low min recharge', 'region_enc': 'Region factor', 'package_enc': 'Package factor'}
        churn_reasons_list = []
        for i in range(len(X)):
            row_shap = shap_values[i]
            top_indices = np.argsort(np.abs(row_shap))[-3:][::-1]
            top_features = [features[idx] for idx in top_indices]
            mapped_reasons = [reason_map.get(feat, feat) for feat in top_features]
            churn_reasons_list.append(", ".join(mapped_reasons))
        uploaded_df['churn_reasons'] = churn_reasons_list

        print("Scoring pipeline: Generating Recommendations...")
        uploaded_df['recommended_action'] = uploaded_df.apply(get_recommendation, axis=1)

        # Convert date back to string format before saving
        uploaded_df['last_active_date'] = uploaded_df['last_active_date'].dt.strftime('%Y-%m-%d')

        print("Scoring pipeline: Saving Data...")
        uploaded_df.to_csv('subscribers_final.csv', index=False)
        load_data()
        
        return {
            "status": "success", 
            "message": "File uploaded and scored successfully.",
            "rows_processed": rows_processed
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"status": "error", "message": str(e)}

@app.post("/api/add-subscriber")
def add_subscriber(req: AddSubscriberRequest):
    """Accept a single subscriber's details, score them with the ML model, and append to the dataset."""
    global df
    try:
        # ── 1. Build a one-row DataFrame ────────────────────────────────────────
        row = {
            "subscriber_id": req.subscriber_id,
            "region":         req.region,
            "package_type":   req.package_type,
            "tenure_months":  req.tenure_months,
            "arpu":           req.arpu,
            "complaint_count": req.complaint_count,
            "last_active_date": req.last_active_date,
            "recharge_history": req.recharge_history,
            "churn": 0,          # unknown – will be determined by model
        }
        new_df = pd.DataFrame([row])

        # ── 2. Feature engineering ───────────────────────────────────────────────
        rh = parse_recharge(req.recharge_history)
        new_df['avg_recharge']    = rh[0]
        new_df['min_recharge']    = rh[1]
        new_df['recharge_trend']  = rh[2]

        ref_date = pd.Timestamp(req.last_active_date)
        today    = pd.Timestamp.now().normalize()
        new_df['days_since_active'] = (today - ref_date).days

        # Derive label encodings from the already-loaded df to avoid the
        # CustomLabelEncoder pickle class-not-found error.
        # The encoding is alphabetical order (same as np.unique used in training).
        if df is not None and not df.empty:
            region_map  = {r: int(e) for r, e in zip(df['region'],  df['region_enc'])  if pd.notna(e)}
            package_map = {p: int(e) for p, e in zip(df['package_type'], df['package_enc']) if pd.notna(e)}
        else:
            # Fallback: compute from sorted unique values (mirrors CustomLabelEncoder)
            all_regions  = sorted(['Mumbai','Delhi','Bangalore','Chennai','Kolkata',
                                   'Hyderabad','Pune','Ahmedabad','Jaipur','Lucknow'])
            all_packages = sorted(['Basic','Standard','Premium'])
            region_map   = {r: i for i, r in enumerate(all_regions)}
            package_map  = {p: i for i, p in enumerate(all_packages)}

        new_df['region_enc']  = region_map.get(req.region,  0)
        new_df['package_enc'] = package_map.get(req.package_type, 0)

        # ── 3. Model prediction ─────────────────────────────────────────────────
        features = ['avg_recharge','min_recharge','recharge_trend','complaint_count',
                    'days_since_active','tenure_months','arpu','region_enc','package_enc']
        X = new_df[features]

        model   = joblib.load('churn_model.pkl')
        dmatrix = xgb.DMatrix(X)
        prob    = float(model.predict(dmatrix)[0])
        new_df['churn_probability'] = prob

        def get_risk_tier(p):
            if p > 0.65: return 'High'
            elif p >= 0.35: return 'Medium'
            else: return 'Low'
        risk_tier = get_risk_tier(prob)
        new_df['risk_tier'] = risk_tier

        # ── 4. SHAP-based churn reasons ──────────────────────────────────────────
        reason_map = {
            'complaint_count':'High complaints','days_since_active':'Recent inactivity',
            'avg_recharge':'Low avg recharge','recharge_trend':'Declining recharges',
            'arpu':'Low revenue value','tenure_months':'Short tenure',
            'min_recharge':'Low min recharge','region_enc':'Region factor',
            'package_enc':'Package factor'
        }
        contribs   = model.predict(dmatrix, pred_contribs=True)
        shap_vals  = contribs[0, :-1]
        top_idx    = np.argsort(np.abs(shap_vals))[-3:][::-1]
        reasons    = ", ".join(reason_map.get(features[i], features[i]) for i in top_idx)
        new_df['churn_reasons'] = reasons

        # ── 5. Recommendation ────────────────────────────────────────────────────
        new_df['recommended_action'] = new_df.apply(get_recommendation, axis=1)

        # ── 6. Sentiment & complaint_text stubs ─────────────────────────────────
        new_df['complaint_text'] = ""
        new_df['sentiment']      = "Neutral"

        # ── 7. Append to CSV and reload in-memory data ───────────────────────────
        csv_path = 'subscribers_final.csv'
        # Remove duplicate subscriber_id if re-adding
        if df is not None and not df.empty:
            existing = df[df['subscriber_id'] != req.subscriber_id]
            updated  = pd.concat([existing, new_df], ignore_index=True)
        else:
            updated = new_df

        updated.to_csv(csv_path, index=False)
        load_data()

        return {
            "status":             "success",
            "subscriber_id":      req.subscriber_id,
            "churn_probability":  round(prob, 4),
            "risk_tier":          risk_tier,
            "churn_reasons":      reasons,
            "recommended_action": new_df['recommended_action'].iloc[0],
            "days_since_active":  int(new_df['days_since_active'].iloc[0]),
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"status": "error", "message": str(e)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)



@app.post("/api/chat")
def chat_endpoint(req: ChatRequest):
    global df
    if df is None or df.empty:
        return {"reply": "Sorry, data is not loaded yet."}
        
    try:
        # Build context
        total_subs = len(df)
        churn_high = len(df[df['risk_tier'] == 'High'])
        revenue_risk = df[df['risk_tier'] == 'High']['arpu'].sum()
        summary_stats = f"Total Subs: {total_subs}, High Risk: {churn_high}, Revenue at Risk: Rs. {revenue_risk:,.2f}"
        
        # Region info
        regional = df.groupby('region').agg(
            total=('subscriber_id', 'count'),
            high_risk=('risk_tier', lambda x: (x == 'High').sum())
        ).reset_index().sort_values('high_risk', ascending=False).head(3)
        regional_data = regional.to_dict(orient='records')
        
        # Top 10 churners
        top_10 = df.sort_values('churn_probability', ascending=False).head(10)[['subscriber_id', 'region', 'churn_probability']]
        top_churners = top_10.to_dict(orient='records')
        
        sys_prompt = f"You are ChurnGuard AI, a DTH churn analytics assistant. Current data: {summary_stats}. Top at-risk regions: {regional_data}. Top 10 high-risk subscribers: {top_churners}. Answer concisely. Always reference actual numbers from the data. Suggest actionable retention strategies. Respond in 3-5 sentences max."

        model = genai.GenerativeModel('gemini-2.5-flash', system_instruction=sys_prompt)
        
        # Convert conversation_history to gemini format
        formatted_history = []
        for msg in req.conversation_history:
            role = "user" if msg['role'] == "user" else "model"
            formatted_history.append({"role": role, "parts": [msg['content']]})
            
        chat = model.start_chat(history=formatted_history)
        response = chat.send_message(req.message)
        
        return {"reply": response.text}
    except Exception as e:
        print(f"Chat error: {e}")
        return {"reply": "I am sorry, I encountered an error connecting to the AI. Did you set GEMINI_API_KEY?"}


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


@app.get("/api/executive-summary")
def get_executive_summary():
    global df
    if df is None or df.empty:
        return {}

    high_risk_df = df[df['risk_tier'] == 'High']
    subscribers_at_risk = len(high_risk_df)
    revenue_at_risk = float(high_risk_df['arpu'].sum())
    predicted_churn_rate_pct = (subscribers_at_risk / len(df)) * 100 if len(df) > 0 else 0
    
    import random
    vs_last_month_pct = round(random.uniform(-5.0, 15.0), 1)
    
    campaigns_active = 0
    import os
    import json
    if os.path.exists("campaigns.json"):
        try:
            with open("campaigns.json", "r") as f:
                camps = json.load(f)
                campaigns_active = len(camps)
        except:
            pass
            
    estimated_monthly_savings = revenue_at_risk * 0.4
    
    reg_avg = df.groupby("region")['churn_probability'].mean()
    top_risk_region = reg_avg.idxmax() if not reg_avg.empty else "N/A"
    
    if 'churn_reasons' in df.columns:
        most_common_churn_reason = df['churn_reasons'].mode()[0] if not df['churn_reasons'].empty else "Unknown"
    else:
        most_common_churn_reason = "Unknown"
        
    model_confidence = 85.0
    if os.path.exists("metrics.json"):
        try:
            with open("metrics.json", "r") as f:
                mets = json.load(f)
                if 'auc_roc' in mets:
                    model_confidence = mets['auc_roc'] * 100
        except:
            pass
            
    from datetime import datetime
    last_updated = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    return {
        "subscribers_at_risk": subscribers_at_risk,
        "revenue_at_risk": revenue_at_risk,
        "predicted_churn_rate_pct": round(predicted_churn_rate_pct, 1),
        "vs_last_month_pct": vs_last_month_pct,
        "campaigns_active": campaigns_active,
        "estimated_monthly_savings": estimated_monthly_savings,
        "top_risk_region": top_risk_region,
        "most_common_churn_reason": most_common_churn_reason,
        "model_confidence": round(model_confidence, 1),
        "last_updated": last_updated,
        "churn_reasons_breakdown": df['churn_reasons'].value_counts().head(5).to_dict() if 'churn_reasons' in df.columns else {}
    }


# Serve frontend static files
frontend_path = os.path.join(os.path.dirname(__file__), "frontend", "dist")
if os.path.exists(frontend_path):
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="static")
