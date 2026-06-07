import pandas as pd
import numpy as np
import joblib
import xgboost as xgb

def main():
    print("Loading data and model...")
    # 1. Load churn_model.pkl and subscribers_scored.csv
    model = joblib.load('churn_model.pkl')
    
    df = pd.read_csv('subscribers_scored.csv')
    
    # Extract the exact features used for training
    features = [
        'avg_recharge', 'min_recharge', 'recharge_trend', 'complaint_count', 
        'days_since_active', 'tenure_months', 'arpu', 'region_enc', 'package_enc'
    ]
    
    X = df[features]
    
    print("Computing SHAP values using XGBoost native pred_contribs...")
    # 2 & 3. Compute SHAP values for every subscriber
    # Using XGBoost native pred_contribs=True bypasses the need for the `shap` module
    # and directly computes SHAP feature contributions
    dmatrix = xgb.DMatrix(X)
    contribs = model.predict(dmatrix, pred_contribs=True)
    
    # The output is of shape (n_samples, n_features + 1). The last column is the bias.
    shap_values = contribs[:, :-1]
    
    print("Extracting top reasons...")
    # 6. Map feature names to readable labels
    reason_map = {
        'complaint_count': 'High complaints',
        'days_since_active': 'Recent inactivity',
        'avg_recharge': 'Low avg recharge',
        'recharge_trend': 'Declining recharges',
        'arpu': 'Low revenue value',
        'tenure_months': 'Short tenure',
        'min_recharge': 'Low min recharge',
        'region_enc': 'Region factor',
        'package_enc': 'Package factor'
    }
    
    # 4. For each subscriber, extract top 3 features by absolute SHAP value
    churn_reasons_list = []
    
    for i in range(len(X)):
        # Get absolute SHAP values for this row
        row_shap = shap_values[i]
        abs_shap = np.abs(row_shap)
        
        # Get indices of top 3 absolute values
        top_indices = np.argsort(abs_shap)[-3:][::-1]
        
        top_features = [features[idx] for idx in top_indices]
        
        # 5 & 6. Map to readable reasons
        mapped_reasons = [reason_map.get(feat, feat) for feat in top_features]
        
        # 7. Add comma-separated top 3 reasons
        churn_reasons_list.append(", ".join(mapped_reasons))
        
    df['churn_reasons'] = churn_reasons_list
    
    print("Saving final output...")
    # 8. Save final output as subscribers_final.csv
    df.to_csv('subscribers_final.csv', index=False)
    print("Done! Saved as subscribers_final.csv")

if __name__ == "__main__":
    main()
