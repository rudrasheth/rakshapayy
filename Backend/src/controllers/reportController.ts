import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

export const reportScam = async (req: Request, res: Response) => {
    try {
        const { reporter_id, scammer_upi_id, description, evidence_url } = req.body;

        if (!scammer_upi_id) {
            res.status(400).json({ error: 'scammer_upi_id is required' });
            return;
        }

        const { data, error } = await supabase
            .from('scam_reports')
            .insert({
                reporter_id: reporter_id || null, // Optional for public reporting? Or enforce auth
                scammer_upi_id,
                description,
                evidence_url
            })
            .select();

        if (error) throw error;

        res.status(201).json({ message: 'Report submitted successfully', report: data[0] });

    } catch (err) {
        console.error('Error submitting report:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const getStats = async (req: Request, res: Response) => {
    // Placeholder for dashboard
    res.json({ message: 'Stats endpoint' });
};
