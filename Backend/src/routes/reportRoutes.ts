import { Router } from 'express';
import { reportScam, getStats } from '../controllers/reportController';

const router = Router();

router.post('/report', reportScam);
// Adding a simple stats route here for now, or move to dashboardRoutes
router.get('/stats', getStats);

export default router;
