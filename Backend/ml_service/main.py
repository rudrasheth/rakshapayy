from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import pandas as pd
import numpy as np
import xgboost as xgb
import math
import re
from collections import Counter
from supabase import create_client, Client
import os
from dotenv import load_dotenv

# Handle .env loading more robustly
import os
from pathlib import Path
env_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

app = FastAPI()

# --- Configuration ---
MODEL_PATH = 'fraud_xgb_model.json'
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")

# --- Initialize Supabase ---
try:
    if SUPABASE_URL and SUPABASE_KEY:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("Supabase Connected.")
    else:
        print("Warning: Supabase credentials missing.")
        supabase = None
except Exception as e:
    print(f"Supabase Connection Error: {e}")
    supabase = None

# --- Load XGBoost Model ---
try:
    model = xgb.XGBClassifier()
    model.load_model(MODEL_PATH)
    print("XGBoost Model Loaded.")
except Exception as e:
    print(f"Warning: Model load failed ({e}). Predictions will default to 0.")
    model = None

# --- Helper Functions ---
def calculate_entropy(text):
    if not isinstance(text, str) or len(text) == 0:
        return 0
    p, lns = Counter(text), float(len(text))
    return -sum( count/lns * math.log(count/lns, 2) for count in p.values())

class TransactionRequest(BaseModel):
    sender_vpa: str
    receiver_vpa: str
    amount: float
    timestamp: str = None # ISO format preferred

@app.post("/verify-receiver")
async def verify_receiver(tx: TransactionRequest):
    risk_score = 0
    breakdown = []
    
    # --- Tier 1: Database Check (Supabase) ---
    if supabase:
        try:
            response = supabase.table('scam_reports').select("*", count='exact').eq('scammer_upi_id', tx.receiver_vpa).execute()
            if response.count and response.count > 0:
                risk_score += 100
                breakdown.append(f"BLACKLISTED: Found {response.count} scam reports")
        except Exception as e:
            print(f"DB Check Failed: {e}")

    # If already 100, return immediately (Efficiency)
    if risk_score >= 100:
        return {"risk_score": 100, "verdict": "MALICIOUS", "breakdown": breakdown}

    # --- Tier 2: Linguistic Regex Check ---
    keywords = ['winner', 'lottery', 'offer', 'refund', 'lucky', 'kyc', 'pmcare', 'funds', 'cash', 'loan', 'update', 'bonus', 'bonanza', 'prize']
    has_keyword = any(k in tx.receiver_vpa.lower() for k in keywords)
    numeric_handle = bool(re.search(r'^\d+@', tx.receiver_vpa))

    if has_keyword:
        risk_score += 30
        breakdown.append("KEYWORD: Suspicious words in VPA")
    
    if numeric_handle:
        risk_score += 10
        breakdown.append("PATTERN: Numeric-heavy handle")

    # --- Tier 3: ML Inference (XGBoost) ---
    if model:
        # Extract Features match training schema: 
        # ['amount', 'vpa_length', 'vpa_entropy', 'keyword_match', 'is_numeric_handle']
        features = pd.DataFrame([{
            'amount': tx.amount,
            'vpa_length': len(tx.receiver_vpa),
            'vpa_entropy': calculate_entropy(tx.receiver_vpa),
            'keyword_match': 1 if has_keyword else 0,
            'is_numeric_handle': 1 if numeric_handle else 0
        }])
        
        try:
            # Predict Prob (Class 1)
            prob = model.predict_proba(features)[0][1]
            ml_score = int(prob * 100)
            
            if ml_score > 50:
                risk_score += ml_score * 0.5 # Add 50% weight of ML score
                breakdown.append(f"ML: High probability ({ml_score}%) of fraud pattern")
            elif ml_score > 20:
                risk_score += 10
                breakdown.append(f"ML: Moderate probability ({ml_score}%)")
                
        except Exception as e:
            print(f"Inference Error: {e}")
            breakdown.append("ML: Inference failed")

    # --- Tier 4: Gemini LLM Fallback (Smart Semantic Check) ---
    # Only check if not already CONFIRMED malicious (to save API calls/latency)
    # But check if there's any doubt or if user explicitly wants deep scanning
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    if risk_score < 80 and GEMINI_API_KEY:
        try:
            import google.generativeai as genai
            genai.configure(api_key=GEMINI_API_KEY)
            llm_model = genai.GenerativeModel('gemini-pro')
            
            prompt = f"""
            Analyze this UPI ID for fraud risk: '{tx.receiver_vpa}'.
            Is it trying to impersonate a brand, promise money, or look like an official authority?
            Return ONLY a JSON: {{"risk_score": 0-100, "reason": "short explanation"}}
            """
            
            response = llm_model.generate_content(prompt)
            # Basic parsing (LLM might return code blocks)
            clean_text = response.text.replace('```json', '').replace('```', '').strip()
            import json
            llm_result = json.loads(clean_text)
            
            if llm_result.get('risk_score', 0) > 40:
                risk_score = max(risk_score, llm_result['risk_score']) # Take the higher risk
                breakdown.append(f"AI: {llm_result.get('reason')}")
                
        except Exception as e:
            print(f"Gemini Error: {e}")

    # Final Verdict Logic
    final_score = min(risk_score, 100)
    verdict = "SAFE"
    if final_score >= 80: verdict = "MALICIOUS"
    elif final_score >= 40: verdict = "SUSPICIOUS"

    return {
        "risk_score": final_score,
        "verdict": verdict,
        "breakdown": breakdown
    }


if __name__ == "__main__":
    import uvicorn

