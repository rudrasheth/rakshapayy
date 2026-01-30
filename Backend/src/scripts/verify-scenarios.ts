import fetch from 'node-fetch';
import * as fs from 'fs';

const API_URL = 'http://localhost:3000/api';

async function checkRisk(sender: string, receiver: string, amount: number, label: string) {
    try {
        const res = await fetch(`${API_URL}/check-risk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sender_upi_id: sender, receiver_upi_id: receiver, amount })
        });
        const data = await res.json();
        const log = `\n--- Case: ${label} ---\nInput: ${receiver} (₹${amount})\nResult: ${JSON.stringify(data, null, 2)}\n`;

        // Append to file and console
        fs.appendFileSync('verification_results.log', log);
        console.log(log);
    } catch (e) {
        const errorLog = `Error: ${e}\n`;
        fs.appendFileSync('verification_results.log', errorLog);
        console.error(errorLog);
    }
}

async function runTests() {
    // Clear file
    fs.writeFileSync('verification_results.log', '--- Verification Start ---\n');

    // 1. SAFE
    await checkRisk('alice@upi', 'coffee_shop@upi', 150, "SAFE (Standard)");

    // 2. ML/REGEX
    await checkRisk('bob@upi', 'winner_lottery_claim@upi', 25000, "ML/REGEX (Suspicious Pattern)");

    // 3. BLACKLIST (Simulated)
    await checkRisk('charlie@upi', 'mega_offer_kyc@upi', 5000, "ML (Keyword Risk)");
}

runTests();
