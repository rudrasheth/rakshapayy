import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { supabase } from './config/supabase';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

import fraudRoutes from './routes/fraudRoutes';
import reportRoutes from './routes/reportRoutes';
import merchantRoutes from './routes/merchantRoutes';

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', fraudRoutes);
app.use('/api', reportRoutes);
app.use('/api/merchant', merchantRoutes);

// Basic Health Check
app.get('/', (req, res) => {
    res.send('UPI Fraud Detection API is running');
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

export default app;
