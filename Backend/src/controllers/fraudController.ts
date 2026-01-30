import { Request, Response } from 'express';
import { FraudDetectionService } from '../services/fraudDetectionService';
import { supabase } from '../config/supabase';

export const checkRisk = async (req: Request, res: Response) => {
    try {
        const { sender_upi_id, receiver_upi_id, amount } = req.body;

        if (!receiver_upi_id || !amount) {
            res.status(400).json({ error: 'Missing receiver_upi_id or amount' });
            return;
        }

        // 1. Analyze
        const riskResult = await FraudDetectionService.analyzeTransaction({
            sender_upi_id,
            receiver_upi_id,
            amount
        });

        // 2. Log API call/Transaction Attempt (Async - don't block response?)
        // Ideally we return response fast, but let's await for now to be safe
        const { error } = await supabase.from('transactions').insert({
            sender_upi_id,
            receiver_upi_id,
            amount,
            risk_score: riskResult.score,
            verdict: riskResult.verdict,
            risk_factors: riskResult.reasons
        });

        if (error) {
            console.error('Error logging transaction:', error);
            // We don't fail the request just because logging failed, but good to know
        }

        res.json(riskResult);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
