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
        const { receiver_upi_id, amount } = data;
        let score = 0;
        const reasons: string[] = [];

        // 1. Check if Reported as Scam
        const { count: reportCount, error: reportError } = await supabase
            .from('scam_reports')
            .select('*', { count: 'exact', head: true })
            .eq('scammer_upi_id', receiver_upi_id);

        if (reportError) console.error('Error fetching reports:', reportError);

        if (reportCount && reportCount > 0) {
            score += 80;
            reasons.push(`Flagged as scam by ${reportCount} users`);
        }

        // 2. Velocity Check (Transactions in last 1 hour)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { count: velocityCount, error: velocityError } = await supabase
            .from('transactions')
            .select('*', { count: 'exact', head: true })
            .eq('receiver_upi_id', receiver_upi_id)
            .gte('created_at', oneHourAgo);

        if (velocityError) console.error('Error fetching velocity:', velocityError);

        if (velocityCount && velocityCount > 10) {
            score += 30;
            reasons.push('High transaction velocity (10+ in 1 hour)');
        } else if (velocityCount && velocityCount > 5) {
            score += 10;
            reasons.push('Moderate transaction velocity');
        }

        // 3. High Value Check on Unknown Entity
        // (Simplification: If High Amount and some risk already, amplify it)
        if (amount > 10000 && score > 0) {
            score += 20;
            reasons.push('High value transaction to suspicious account');
        }

        // Determine Verdict
        score = Math.min(score, 100);
        let verdict: RiskResult['verdict'] = 'SAFE';
        if (score >= 70) verdict = 'MALICIOUS';
        else if (score >= 30) verdict = 'SUSPICIOUS';

        return { score, verdict, reasons };
    }
}
