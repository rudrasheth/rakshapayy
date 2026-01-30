import pandas as pd
import numpy as np
import xgboost as xgb
import joblib
import re
import math
from sklearn.model_selection import train_test_split
from collections import Counter

# --- Configuration ---
DATASET_PATH_PAYSIM = '../datasets/PS_20174392719_1491204439457_log.csv'
DATASET_PATH_UPI = '../datasets/upi_transactions_2024.csv'
DATASET_PATH_SCAM = '../datasets/Updated_Inclusive_Indian_Online_Scam_Dataset (1).csv'
MODEL_PATH = 'fraud_xgb_model.json'

print("--- Starting Advanced Training Pipeline ---")

# --- 1. Feature Engineering Helpers ---
def calculate_entropy(text):
    if not isinstance(text, str) or len(text) == 0:
        return 0
    p, lns = Counter(text), float(len(text))
    return -sum( count/lns * math.log(count/lns, 2) for count in p.values())

def get_vpa_features(vpa):
    if not isinstance(vpa, str):
        vpa = "unknown"
    
    # Heuristic Keywords
    keywords = ['winner', 'lottery', 'offer', 'refund', 'lucky', 'kyc', 'pmcare', 'funds', 'cash']
    has_keyword = 1 if any(k in vpa.lower() for k in keywords) else 0
    
    return {
        'vpa_length': len(vpa),
        'vpa_entropy': calculate_entropy(vpa),
        'keyword_match': has_keyword,
        'is_numeric_handle': 1 if re.search(r'^\d+@', vpa) else 0 # e.g. 98273... can be risky if mostly numbers
    }

# --- 2. Data Ingestion & Merging ---
print("Loading Datasets... (This might take a moment)")
try:
    # Load PaySim (Financial patterns)
    # PaySim cols: step, type, amount, nameOrig, oldbalanceOrg, newbalanceOrig, nameDest, oldbalanceDest, newbalanceDest, isFraud, isFlaggedFraud
    df_ps = pd.read_csv(DATASET_PATH_PAYSIM)
    df_ps = df_ps[['amount', 'isFraud', 'nameDest']].rename(columns={'nameDest': 'receiver_vpa', 'isFraud': 'label'})
    # Sample down PaySim for performance if needed; let's take top 200k for speed in this demo
    df_ps = df_ps.head(200000)
    print(f"Loaded PaySim: {len(df_ps)} rows")

    # Load UPI Data (Real identifiers to mix in) - Assuming structure based on name
    # If this file has different structure, I will adapt. For now assuming simple generic load or skipping if empty.
    # df_upi = pd.read_csv(DATASET_PATH_UPI) 
    # Skipping UPI merge for this step to focus on the large PaySim + Synthetic, 
    # as mixing disjoint schemas needs careful mapping. 
    # We will prioritize synthetic injection for the UPI specific patterns.

except Exception as e:
    print(f"Error loading datasets: {e}")
    print("Falling back to synthetic only mode for demonstration if files missing.")
    df_ps = pd.DataFrame(columns=['amount', 'receiver_vpa', 'label'])

# --- 3. Synthetic Injection ---
print("Injecting 50,000 Synthetic 'Malicious' Records...")

np.random.seed(42)
n_synthetic = 50000

# Malicious Patterns
bad_handles = [
    'reward_kyc_update@oksbi', 'pm_care_fund@upi', 'winner_contest@paytm',
    'lottery_claim@ybl', 'refund_support@axis', 'gpay_rewards@google',
    'phonepe_cashback@ibl', 'customer_care_fraud@hdfc'
]

# Generate random variations
synthetic_vpas = []
for _ in range(n_synthetic):
    base = np.random.choice(bad_handles)
    # Add random string to make it unique but similar
    suffix = str(np.random.randint(100, 999))
    synthetic_vpas.append(base.replace('@', f'{suffix}@'))

synthetic_data = pd.DataFrame({
    'amount': np.random.exponential(scale=5000, size=n_synthetic), # Skewed towards smaller, but occasionally large
    'receiver_vpa': synthetic_vpas,
    'label': 1 # All malicious
})

# Safe Patterns (to balance)
good_handles = ['shop@upi', 'merchant@okicici', 'friend@ybl', 'paytm-merchant@paytm']
synthetic_safe_vpas = []
for _ in range(n_synthetic):
    base = np.random.choice(good_handles)
    suffix = str(np.random.randint(1000, 9999))
    synthetic_safe_vpas.append(base.replace('@', f'{suffix}@'))

synthetic_safe = pd.DataFrame({
    'amount': np.random.uniform(10, 5000, size=n_synthetic),
    'receiver_vpa': synthetic_safe_vpas,
    'label': 0
})

# Merge All
df_final = pd.concat([df_ps, synthetic_data, synthetic_safe], ignore_index=True)
print(f"Total Dataset Size: {len(df_final)} rows")

# --- 4. Feature Extraction ---
print("Extracting Features (Entropy, Keywords)...")

# Apply VPA feature extraction
vpa_features = df_final['receiver_vpa'].apply(get_vpa_features).apply(pd.Series)
df_final = pd.concat([df_final, vpa_features], axis=1)

# Ensure strictly numeric types for X and y
df_final['amount'] = pd.to_numeric(df_final['amount'], errors='coerce').fillna(0)
df_final['label'] = pd.to_numeric(df_final['label'], errors='coerce').fillna(0).astype(int)

# Prepare Training Data
X = df_final[['amount', 'vpa_length', 'vpa_entropy', 'keyword_match', 'is_numeric_handle']]
y = df_final['label']

print("Features Prepared. Sample:")
print(X.head())
print("Label Distribution:", y.value_counts())

# --- 5. Train XGBoost ---
print("Training XGBoost Model...")
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

model = xgb.XGBClassifier(
    n_estimators=100,
    max_depth=6,
    learning_rate=0.1,
    objective='binary:logistic',
    eval_metric='logloss'
)

model.fit(X_train, y_train)

# Evaluate
from sklearn.metrics import accuracy_score, precision_score, recall_score
y_pred = model.predict(X_test)
print(f"Accuracy: {accuracy_score(y_test, y_pred):.4f}")
print(f"Precision: {precision_score(y_test, y_pred):.4f}")
print(f"Recall: {recall_score(y_test, y_pred):.4f}")

# --- 6. Save Model ---
model.save_model(MODEL_PATH)
print(f"Model saved to {MODEL_PATH}")
