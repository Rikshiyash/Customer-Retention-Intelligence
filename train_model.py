import pandas as pd
import numpy as np
import joblib
import xgboost as xgb

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

def roc_auc_score(y_true, y_scores):
    y_true = np.array(y_true)
    y_scores = np.array(y_scores)
    desc_score_indices = np.argsort(y_scores)[::-1]
    y_true_sorted = y_true[desc_score_indices]
    
    num_positives = np.sum(y_true_sorted)
    num_negatives = len(y_true_sorted) - num_positives
    
    if num_positives == 0 or num_negatives == 0:
        return 0.5
        
    tps = np.cumsum(y_true_sorted)
    fps = np.cumsum(1 - y_true_sorted)
    
    tpr = tps / num_positives
    fpr = fps / num_negatives
    
    auc = np.trapezoid(tpr, fpr)
    return auc

def main():
    print("Loading data...")
    df = pd.read_csv('subscribers.csv')

    print("Parsing recharge history...")
    recharge_features = df['recharge_history'].apply(parse_recharge)
    df['avg_recharge'] = [x[0] for x in recharge_features]
    df['min_recharge'] = [x[1] for x in recharge_features]
    df['recharge_trend'] = [x[2] for x in recharge_features]

    print("Feature engineering...")
    df['last_active_date'] = pd.to_datetime(df['last_active_date'])
    reference_date = df['last_active_date'].max()
    df['days_since_active'] = (reference_date - df['last_active_date']).dt.days

    # Encoders
    region_enc = CustomLabelEncoder()
    package_enc = CustomLabelEncoder()

    df['region_enc'] = region_enc.fit_transform(df['region'])
    df['package_enc'] = package_enc.fit_transform(df['package_type'])

    # Features
    features = [
        'avg_recharge', 'min_recharge', 'recharge_trend', 'complaint_count', 
        'days_since_active', 'tenure_months', 'arpu', 'region_enc', 'package_enc'
    ]
    target = 'churn'

    print("Train/test split...")
    # Stratified split
    train_indices = []
    for t in df[target].unique():
        idx = df[df[target] == t].sample(frac=0.8, random_state=42).index
        train_indices.extend(idx)
        
    train_df = df.loc[train_indices]
    test_df = df.drop(index=train_indices)

    X_train = train_df[features]
    y_train = train_df[target]
    X_test = test_df[features]
    y_test = test_df[target]
    
    X = df[features]
    y = df[target]

    print("Training XGBoost...")
    dtrain = xgb.DMatrix(X_train, label=y_train)
    dtest = xgb.DMatrix(X_test, label=y_test)
    dall = xgb.DMatrix(X, label=y)

    params = {
        'max_depth': 5,
        'learning_rate': 0.1,
        'objective': 'binary:logistic',
        'eval_metric': 'logloss',
        'seed': 42
    }

    model = xgb.train(params, dtrain, num_boost_round=200)

    print("Evaluating model...")
    y_prob = model.predict(dtest)
    y_pred = (y_prob >= 0.5).astype(int)
    
    y_test_arr = y_test.values

    acc = np.mean(y_test_arr == y_pred)
    tp = np.sum((y_test_arr == 1) & (y_pred == 1))
    fp = np.sum((y_test_arr == 0) & (y_pred == 1))
    fn = np.sum((y_test_arr == 1) & (y_pred == 0))
    prec = tp / (tp + fp) if (tp + fp) > 0 else 0
    rec = tp / (tp + fn) if (tp + fn) > 0 else 0
    auc = roc_auc_score(y_test_arr, y_prob)

    print(f"Accuracy:  {acc:.4f}")
    print(f"Precision: {prec:.4f}")
    print(f"Recall:    {rec:.4f}")
    print(f"AUC-ROC:   {auc:.4f}")

    print("\nFeature Importances:")
    importances_dict = model.get_score(importance_type='weight')
    feat_imp = pd.DataFrame([
        {'feature': k, 'importance': v} for k, v in importances_dict.items()
    ])
    if not feat_imp.empty:
        feat_imp = feat_imp.sort_values(by='importance', ascending=False)
        for _, row in feat_imp.iterrows():
            print(f"  {row['feature']}: {row['importance']:.4f}")
    else:
        print("  No features were used in splitting.")

    print("\nScoring all subscribers...")
    df['churn_probability'] = model.predict(dall)

    def get_risk_tier(prob):
        if prob > 0.65:
            return 'High'
        elif prob >= 0.35:
            return 'Medium'
        else:
            return 'Low'

    df['risk_tier'] = df['churn_probability'].apply(get_risk_tier)

    print("Saving enriched dataframe...")
    df.to_csv('subscribers_scored.csv', index=False)

    print("Saving model and encoders...")
    joblib.dump(model, 'churn_model.pkl')
    joblib.dump({'region_enc': region_enc, 'package_enc': package_enc}, 'encoders.pkl')
    print("Done!")

if __name__ == "__main__":
    main()
