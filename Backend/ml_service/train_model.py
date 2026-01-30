import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
import joblib

# 1. Load Data
try:
    df = pd.read_csv('dataset.csv')
except FileNotFoundError:
    print("dataset.csv not found. Please provide a dataset.")
    exit(1)

print(f"Loaded {len(df)} transactions.")

# 2. Preprocess
# We need to convert UPI IDs to numbers (Label Encoding) for this simple demo model
# In a real model, we would generate features like 'user_age', 'transaction_velocity' etc.
le = LabelEncoder()

# Fit on all possible IDs we might see (concatenating sender/receiver for vocab)
all_ids = pd.concat([df['sender'], df['receiver']]).unique()
le.fit(all_ids)

# Encode columns. Handle unknown IDs gracefully in production by using 'unknown' token, 
# but for this script we just rely on what's in training data or handle errors in prediction.
# Note: This is a VERY BASIC feature implementation.
df['sender_enc'] = le.transform(df['sender'])
df['receiver_enc'] = le.transform(df['receiver'])

X = df[['sender_enc', 'receiver_enc', 'amount']]
y = df['is_fraud']

# 3. Train
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
clf = RandomForestClassifier(n_estimators=100)
clf.fit(X_train, y_train)

# 4. Save
joblib.dump(clf, 'fraud_model.pkl')
joblib.dump(le, 'label_encoder.pkl')

print("Model trained and saved to 'fraud_model.pkl'")
