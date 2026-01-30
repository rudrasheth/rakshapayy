import fetch from 'node-fetch';

const API_URL = 'http://localhost:3000/api';

async function checkRisk(sender: string, receiver: string, amount: number) {
    try {
        const res = await fetch(`${API_URL}/check-risk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sender_upi_id: sender, receiver_upi_id: receiver, amount })
        });
        return await res.json();
    } catch (e) {
        return { error: e };
    }
}

async function runVelocityTest() {
    const receiver = 'target_victim@upi'; // The one being "bombed"
    console.log(`\n--- Starting Velocity Attack Simulation on ${receiver} ---\n`);

    // 1. Initial State
    console.log("1. Initial Check (Should be Safe)...");
    let res = await checkRisk('legit_user_0@upi', receiver, 100);
    console.log(`Result: ${res.verdict} (Score: ${res.score})`);

    // 2. Attack Simulation (different senders rapidly)
    console.log("\n2. Launching Bot Attack (6 different senders)...");
    for (let i = 1; i <= 6; i++) {
        const botSender = `bot_account_${i}@upi`;
        process.stdout.write(`Tx ${i} from ${botSender}... `);
        res = await checkRisk(botSender, receiver, 500);
        console.log(`Verdict: ${res.verdict} | Reasons: ${JSON.stringify(res.risk_factors || res.reasons)}`);
    }

    // 3. Final Check (Should be blocked)
    console.log("\n3. Final Verification (Should be MALICIOUS due to Velocity)...");
    res = await checkRisk('legit_user_final@upi', receiver, 100);
    console.log(`Final Result: ${JSON.stringify(res, null, 2)}`);
}

runVelocityTest();
