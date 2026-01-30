"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fraudController_1 = require("../controllers/fraudController");
const router = (0, express_1.Router)();
router.post('/check-risk', fraudController_1.checkRisk);
exports.default = router;
