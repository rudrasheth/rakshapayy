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
exports.checkRisk = void 0;
const fraudDetectionService_1 = require("../services/fraudDetectionService");
const supabase_1 = require("../config/supabase");
const checkRisk = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { sender_upi_id, receiver_upi_id, amount } = req.body;
        if (!receiver_upi_id || !amount) {
            res.status(400).json({ error: 'Missing receiver_upi_id or amount' });
            return;
        }
        // 1. Analyze
        const riskResult = yield fraudDetectionService_1.FraudDetectionService.analyzeTransaction({
            sender_upi_id,
            receiver_upi_id,
            amount
        });
        // 2. Log API call/Transaction Attempt (Async - don't block response?)
        // Ideally we return response fast, but let's await for now to be safe
        const { error } = yield supabase_1.supabase.from('transactions').insert({
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
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
exports.checkRisk = checkRisk;
