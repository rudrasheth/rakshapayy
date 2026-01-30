import { Router } from 'express';
import { checkRisk } from '../controllers/fraudController';

const router = Router();

router.post('/check-risk', checkRisk);

export default router;
