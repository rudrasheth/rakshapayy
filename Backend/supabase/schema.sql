-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles (Extends Supabase Auth)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    full_name TEXT,
    phone_number TEXT UNIQUE,
    is_merchant BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Merchants (Details for merchant users)
CREATE TABLE merchants (
    id UUID REFERENCES profiles(id) PRIMARY KEY, -- Same ID as profile
    business_name TEXT NOT NULL,
    upi_id TEXT UNIQUE NOT NULL,
    risk_score INT DEFAULT 0, -- 0-100 (0 = safe)
    total_transactions INT DEFAULT 0,
    blocked_transactions INT DEFAULT 0
);

-- 3. Scam Reports (Crowd-sourced)
CREATE TABLE scam_reports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    reporter_id UUID REFERENCES profiles(id),
    scammer_upi_id TEXT NOT NULL,
    description TEXT,
    evidence_url TEXT,
    upvotes INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Transactions (Log for analysis)
CREATE TABLE transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sender_id UUID REFERENCES profiles(id), -- Nullable if sender is external/unknown
    sender_upi_id TEXT, -- Captured from request
    receiver_upi_id TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    risk_score INT,
    verdict TEXT CHECK (verdict IN ('SAFE', 'SUSPICIOUS', 'MALICIOUS')),
    risk_factors TEXT[], -- Array of strings e.g., ["VELOCITY_HIGH", "REPORTED_SCAM"]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_scam_reports_upi ON scam_reports(scammer_upi_id);
CREATE INDEX idx_transactions_sender ON transactions(sender_upi_id);
CREATE INDEX idx_transactions_receiver ON transactions(receiver_upi_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);

-- RLS Policies (Basic)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE scam_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Allow read access to all for reports (public registry)
CREATE POLICY "Public reports are viewable by everyone" 
ON scam_reports FOR SELECT USING (true);

-- Allow authenticated users to insert reports
CREATE POLICY "Users can insert reports" 
ON scam_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
