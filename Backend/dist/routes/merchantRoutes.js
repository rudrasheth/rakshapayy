"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const merchantController_1 = require("../controllers/merchantController");
const router = (0, express_1.Router)();
router.get('/stats', merchantController_1.getMerchantStats);
exports.default = router;
