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
exports.getStats = exports.reportScam = void 0;
const supabase_1 = require("../config/supabase");
const reportScam = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { reporter_id, scammer_upi_id, description, evidence_url } = req.body;
        if (!scammer_upi_id) {
            res.status(400).json({ error: 'scammer_upi_id is required' });
            return;
        }
        const { data, error } = yield supabase_1.supabase
            .from('scam_reports')
            .insert({
            reporter_id: reporter_id || null, // Optional for public reporting? Or enforce auth
            scammer_upi_id,
            description,
            evidence_url
        })
            .select();
        if (error)
            throw error;
        res.status(201).json({ message: 'Report submitted successfully', report: data[0] });
    }
    catch (err) {
        console.error('Error submitting report:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
exports.reportScam = reportScam;
const getStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // Placeholder for dashboard
    res.json({ message: 'Stats endpoint' });
});
exports.getStats = getStats;
