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

        // --- 0. Basic Sanity Checks ---
        // Check for Self-Transaction (Sender == Receiver)
        if (sender_upi_id === receiver_upi_id) {
            score += 50; // High risk for self-sending on same VPA (illogical)
            reasons.push('Circular Transaction: Sender and Receiver are identical');
        }

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

        // --- Velocity Check (Bot Blast Detection) ---
        // distinct senders -> same receiver in short window (e.g. 15 mins)
        const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

        // We need to count *distinct* sender_upi_ids
        // Supabase .select with count is good, but for distinct we might need a raw query or a transformation
        // Since we can't easily do SELECT COUNT(DISTINCT) via simple JS SDK client without RPC, 
        // we will fetch the records and count in memory (assuming volume isn't massive for 15 mins typically)
        // OR checks if we can use a helper. 

        const { data: recentTxns, error: velocityError } = await supabase
            .from('transactions')
            .select('sender_upi_id')
            .eq('receiver_upi_id', receiver_upi_id)
            .gte('created_at', fifteenMinsAgo);

        if (!velocityError && recentTxns) {
            const uniqueSenders = new Set(recentTxns.map(t => t.sender_upi_id).filter(id => id !== sender_upi_id));
            // If we see more than 5 DIFFERENT people sending money to this person in 15 mins... suspicious.

            if (uniqueSenders.size >= 5) { // Threshold can be tuned
                score = 100; // Immediate Max Risk
                verdict = 'MALICIOUS';
                reasons.push(`Velocity Anomaly: Targeted by ${uniqueSenders.size} distinct senders in 15m (Bot-like pattern)`);
            }
        }

        // Final Verdict
        score = Math.min(score, 100);
        if (score >= 80) verdict = 'MALICIOUS';
        else if (score >= 40) verdict = 'SUSPICIOUS';

        return { score, verdict, reasons };
    }
}
