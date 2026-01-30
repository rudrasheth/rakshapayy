from fastapi import FastAPI
from pydantic import BaseModel
import joblib
import pandas as pd
import numpy as np

app = FastAPI()

# Load Model
try:
    model = joblib.load('fraud_model.pkl')
    le = joblib.load('label_encoder.pkl')
    print("Model loaded successfully.")
except:
    print("Model not found. Please run train_model.py first.")
    model = None
    le = None

class Transaction(BaseModel):
    sender_upi_id: str
    receiver_upi_id: str
    amount: float

@app.post("/predict")
def predict_fraud(tx: Transaction):
    if not model or not le:
        return {"error": "Model not loaded", "risk_score": 0}

    # Preprocess
    # Handle unknown UPI IDs by assigning a default "unknown" code or mapping to a known safe ID
    # For this demo, if unknown, we map to 0 (which might be wrong, but prevents crash)
    sender_enc = 0
    receiver_enc = 0

    try:
        if tx.sender_upi_id in le.classes_:
            sender_enc = le.transform([tx.sender_upi_id])[0]
        if tx.receiver_upi_id in le.classes_:
            receiver_enc = le.transform([tx.receiver_upi_id])[0]
    except Exception as e:
        print(f"Encoding Error: {e}")

    # Predict
    features = np.array([[sender_enc, receiver_enc, tx.amount]])
    probability = model.predict_proba(features)[0][1] # Probability of class 1 (Fraud)

    return {
        "is_fraud": bool(probability > 0.5),
        "risk_score": float(probability * 100)
    }

@app.get("/")
def home():
    return {"message": "Fraud Detection ML Service Running"}
