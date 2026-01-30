"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const reportController_1 = require("../controllers/reportController");
const router = (0, express_1.Router)();
router.post('/report', reportController_1.reportScam);
// Adding a simple stats route here for now, or move to dashboardRoutes
router.get('/stats', reportController_1.getStats);
exports.default = router;
