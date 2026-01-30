"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMerchantStats = void 0;
const supabase_1 = require("../config/supabase");
const getMerchantStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { merchant_id } = req.query; // Assuming passed as query param for now
        if (!merchant_id) {
            // Just return global stats if no merchant_id (or demo mode)
            // In reality, we'd error out or require auth
        }
        // Mock aggregation for demo purposes (or real DB queries if we had data)
        // 1. Total Transactions
        const { count: totalTx, error: txError } = yield supabase_1.supabase
            .from('transactions')
            .select('*', { count: 'exact', head: true });
        // 2. Blocked/High Risk
        const { count: maliciousTx, error: malError } = yield supabase_1.supabase
            .from('transactions')
            .select('*', { count: 'exact', head: true })
            .in('verdict', ['MALICIOUS', 'SUSPICIOUS']);
        // 3. New Reports
        const { count: reportsCount, error: reportsError } = yield supabase_1.supabase
            .from('scam_reports')
            .select('*', { count: 'exact', head: true });
        if (txError || malError || reportsError) {
            console.error('Error fetching stats', txError, malError, reportsError);
        }
        res.json({
            totalTransactions: totalTx || 0,
            fraudBlocked: maliciousTx || 0,
            totalReports: reportsCount || 0,
            recentAlerts: [
                { id: 1, message: 'High velocity detected on UPI ID X', time: '10 mins ago' },
                { id: 2, message: 'New scam report added matching your customer base', time: '2 hours ago' }
            ]
        });
    }
    catch (err) {
        console.error('Error fetching merchant stats:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
exports.getMerchantStats = getMerchantStats;
