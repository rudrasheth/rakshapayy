import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000/api';

async function testFraudDetection() {
    console.log('\n--- Testing Fraud Detection ---');
    const response = await fetch(`${BASE_URL}/check-risk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            sender_upi_id: 'tester@upi',
            receiver_upi_id: 'scam@upi',
            amount: 5000
        })
    });
    const data = await response.json();
    console.log('Result:', data);
}

async function testReporting() {
    console.log('\n--- Testing Reporting ---');
    const response = await fetch(`${BASE_URL}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            reporter_id: null, // Send null to skip FK check (since we don't have a logged-in user)
            scammer_upi_id: 'scam@upi',
            description: 'Test report from script'
        })
    });
    const data = await response.json();
    console.log('Result:', data);
}

async function testSafeTransaction() {
    console.log('\n--- Testing Safe Transaction ---');
    const response = await fetch(`${BASE_URL}/check-risk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            sender_upi_id: 'alice@upi',
            receiver_upi_id: 'shop-keeper@upi', // Unreported ID
            amount: 500
        })
    });
    const data = await response.json();
    console.log('Result:', data);
}

async function runTests() {
    try {
        await testSafeTransaction();
        await testReporting();
        // Wait a bit or run sequentially
        await testFraudDetection();
    } catch (e) {
        console.error('Test failed:', e);
    }
}

// Check if server is running first
runTests();
console.log('To run this script: npx ts-node src/scripts/test-api.ts');
console.log('Ensure server is running on localhost:3000');
