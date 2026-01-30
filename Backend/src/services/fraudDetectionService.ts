import { supabase } from '../config/supabase';

interface TransactionCheck {
    sender_upi_id: string;
    receiver_upi_id: string;
    amount: number;
}

interface RiskResult {
    score: number;
    verdict: 'SAFE' | 'SUSPICIOUS' | 'MALICIOUS';
    reasons: string[];
}

export class FraudDetectionService {

    static async analyzeTransaction(data: TransactionCheck): Promise<RiskResult> {
        const { sender_upi_id, receiver_upi_id, amount } = data;
        let score = 0;
        const reasons: string[] = [];
        let verdict: RiskResult['verdict'] = 'SAFE';

        // --- Call Python ML Service ---
        try {
            // Note: In production use value from env, defaulting for demo
            const mlResponse = await fetch('http://127.0.0.1:8000/verify-receiver', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sender_vpa: sender_upi_id,
                    receiver_vpa: receiver_upi_id,
                    amount: amount
                })
            });

            if (mlResponse.ok) {
                const mlResult = await mlResponse.json();
                // Merge ML Score
                if (mlResult.risk_score > 0) {
                    score = mlResult.risk_score;
                    reasons.push(...mlResult.breakdown);
                }
            } else {
                console.error('ML Service Error:', mlResponse.statusText);
            }
        } catch (e) {
            console.error('Failed to connect to ML Service:', e);
            reasons.push('ML Service Unavailable (Fallback to basic rules)');
        }

        // --- Fallback / Additional Node.js Logic (Velocity) if needed ---
        // (The Python service now handles DB + Keywords + ML, so we can rely heavily on it)
        // Keep Velocity check as a fail-safe or double-check
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { count: velocityCount } = await supabase
            .from('transactions')
            .select('*', { count: 'exact', head: true })
            .eq('receiver_upi_id', receiver_upi_id)
            .gte('created_at', oneHourAgo);

        if (velocityCount && velocityCount > 10) {
            // Only add if not already caught by ML service to avoid double counting too much
            // But for safety, let's just ensure we don't go over 100
            if (!reasons.some(r => r.includes('velocity'))) {
                score += 20;
                reasons.push('High transaction velocity (Node.js Check)');
            }
        }

        // Final Verdict
        score = Math.min(score, 100);
        if (score >= 80) verdict = 'MALICIOUS';
        else if (score >= 40) verdict = 'SUSPICIOUS';

        return { score, verdict, reasons };
    }
}
