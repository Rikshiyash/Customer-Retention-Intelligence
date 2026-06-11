import pandas as pd
import joblib
import xgboost as xgb
import warnings
warnings.filterwarnings('ignore')

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

row = {
    "subscriber_id": "test",
    "region": "Mumbai",
    "package_type": "Standard",
    "tenure_months": 12,
    "arpu": 350.0,
    "complaint_count": 2,
    "last_active_date": "2023-10-01",
    "recharge_history": "300,200,200,0,0,0",
}
new_df = pd.DataFrame([row])

rh = parse_recharge(row["recharge_history"])
new_df['avg_recharge']    = rh[0]
new_df['min_recharge']    = rh[1]
new_df['recharge_trend']  = rh[2]

new_df['days_since_active'] = 10 # Let's say 10 days

# hardcode encodings for test
new_df['region_enc'] = 0
new_df['package_enc'] = 0

features = ['avg_recharge','min_recharge','recharge_trend','complaint_count',
            'days_since_active','tenure_months','arpu','region_enc','package_enc']
X = new_df[features]

model = joblib.load('churn_model.pkl')
dmatrix = xgb.DMatrix(X)
prob = float(model.predict(dmatrix)[0])
print("Prob:", prob)
