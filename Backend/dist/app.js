"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
const fraudRoutes_1 = __importDefault(require("./routes/fraudRoutes"));
const reportRoutes_1 = __importDefault(require("./routes/reportRoutes"));
const merchantRoutes_1 = __importDefault(require("./routes/merchantRoutes"));
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Routes
app.use('/api', fraudRoutes_1.default);
app.use('/api', reportRoutes_1.default);
app.use('/api/merchant', merchantRoutes_1.default);
// Basic Health Check
app.get('/', (req, res) => {
    res.send('UPI Fraud Detection API is running');
});
// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
exports.default = app;
