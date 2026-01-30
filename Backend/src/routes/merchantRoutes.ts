import { Router } from 'express';
import { getMerchantStats } from '../controllers/merchantController';

const router = Router();

router.get('/stats', getMerchantStats);

export default router;
