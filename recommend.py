import sys
sys.stdout.reconfigure(encoding='utf-8')
import pandas as pd

def get_recommendation(row):
    risk_tier = row.get('risk_tier')
    arpu = row.get('arpu')
    tenure_months = row.get('tenure_months')
    complaint_count = row.get('complaint_count')
    days_since_active = row.get('days_since_active')

    if risk_tier == 'High':
        if arpu > 400:
            return "Proactive call + ₹100 cashback offer"
        else:
            return "SMS recharge reminder + ₹50 discount"
    elif risk_tier == 'Medium':
        if tenure_months > 24:
            return "Package upgrade offer"
        elif complaint_count > 5:
            return "Customer care callback + service check"
        else:
            return "Personalized retention SMS"
    elif risk_tier == 'Low':
        if days_since_active > 60:
            return "Win-back email campaign"
        else:
            return "No action needed"
    
    return "No action needed"

def main():
    print("Loading data...")
    df = pd.read_csv('subscribers_final.csv')
    
    print("Applying recommendation rules...")
    df['recommended_action'] = df.apply(get_recommendation, axis=1)
    
    print("Action Distribution Counts:")
    action_counts = df['recommended_action'].value_counts()
    for action, count in action_counts.items():
        print(f"  - {action}: {count}")
        
    print("\nSaving final enriched dataframe...")
    df.to_csv('subscribers_final.csv', index=False)
    print("Done! Saved to subscribers_final.csv")

if __name__ == "__main__":
    main()
