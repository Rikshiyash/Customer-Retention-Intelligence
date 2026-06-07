import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random

def generate_data():
    # Set random seed for reproducibility
    np.random.seed(42)
    random.seed(42)

    NUM_ROWS = 50000

    # Regions
    regions = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow']
    packages = ['Basic', 'Standard', 'Premium']

    # Base ARPU means per package
    arpu_means = {'Basic': 250, 'Standard': 450, 'Premium': 800}
    arpu_std = {'Basic': 30, 'Standard': 50, 'Premium': 100}

    data = []
    end_date = datetime.now()

    for i in range(1, NUM_ROWS + 1):
        sub_id = f"SUB-{i:05d}"
        region = random.choice(regions)
        pkg = random.choice(packages)
        
        # ARPU
        arpu = max(100, np.random.normal(arpu_means[pkg], arpu_std[pkg]))
        
        # Tenure
        tenure = random.randint(1, 120)
        
        # Complaint count (Poisson, lambda=2.5)
        complaints = np.random.poisson(2.5)
        # Cap at 15
        complaints = min(complaints, 15)
        
        # Last active date (within last 180 days)
        days_inactive = random.randint(0, 180)
        last_active = end_date - timedelta(days=days_inactive)
        
        # Recharge history (last 6 months, correlated with ARPU)
        recharges = []
        for _ in range(6):
            # some variance around ARPU
            amt = max(0, int(np.random.normal(arpu, 50)))
            recharges.append(str(amt))
        recharge_history = ",".join(recharges)
        
        data.append({
            'subscriber_id': sub_id,
            'region': region,
            'package_type': pkg,
            'recharge_history': recharge_history,
            'complaint_count': complaints,
            'last_active_date': last_active.strftime('%Y-%m-%d'),
            'tenure_months': tenure,
            'arpu': round(arpu, 2),
            'days_inactive': days_inactive # temporary for calculating churn
        })

    df = pd.DataFrame(data)

    # Churn logic: High complaint count + low ARPU + recent inactivity (high days_inactive) -> churn=1
    # Create a continuous churn risk score
    # Normalize factors
    df['complaint_score'] = df['complaint_count'] / df['complaint_count'].max()
    df['arpu_score'] = 1 - (df['arpu'] - df['arpu'].min()) / (df['arpu'].max() - df['arpu'].min())
    df['inactivity_score'] = df['days_inactive'] / 180.0

    # Combined risk score (weights can be adjusted to make realistic correlations)
    df['churn_score'] = (df['complaint_score'] * 1.5 + df['arpu_score'] * 1.0 + df['inactivity_score'] * 2.0)
    
    # We want ~25% churn, so we can pick the 75th percentile of churn_score as threshold
    # Add a bit of noise to make it not strictly deterministic
    df['churn_score'] += np.random.normal(0, 0.2, NUM_ROWS)

    threshold = df['churn_score'].quantile(0.75)
    df['churn'] = (df['churn_score'] >= threshold).astype(int)

    # Drop temporary columns
    df = df.drop(columns=['days_inactive', 'complaint_score', 'arpu_score', 'inactivity_score', 'churn_score'])

    df.to_csv('subscribers.csv', index=False)

    churn_rate = df['churn'].mean() * 100
    print(f"Generated {len(df)} rows.")
    print(f"Churn rate: {churn_rate:.2f}%")
    print("Dataset saved to 'subscribers.csv'")

if __name__ == '__main__':
    generate_data()
