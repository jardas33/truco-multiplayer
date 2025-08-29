#!/usr/bin/env node

/**
 * Debug Render API Script
 * 
 * This script explores the Render API to understand the response structure
 * and find the correct way to deploy.
 */

const https = require('https');

// Render API configuration
const RENDER_API_TOKEN = 'rnd_rQqhfbARLIwJNoYdJVWLS9u7rkHf';

console.log('🔍 Debugging Render API...\n');

// Function to make HTTPS requests to Render API
function makeRequest(path, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.render.com',
            port: 443,
            path: `/v1${path}`,
            method: method,
            headers: {
                'Authorization': `Bearer ${RENDER_API_TOKEN}`,
                'Content-Type': 'application/json',
                'User-Agent': 'Truco-Game-Debugger/1.0'
            }
        };

        const req = https.request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(responseData);
                    resolve({ status: res.statusCode, data: parsed, headers: res.headers });
                } catch (error) {
                    resolve({ status: res.statusCode, data: responseData, headers: res.headers });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }
        
        req.end();
    });
}

// Debug function
async function debugRenderAPI() {
    try {
        console.log('📋 Step 1: Checking user endpoint...');
        const userResponse = await makeRequest('/user');
        console.log('✅ User endpoint response:');
        console.log('   Status:', userResponse.status);
        console.log('   Headers:', JSON.stringify(userResponse.headers, null, 2));
        console.log('   Data:', JSON.stringify(userResponse.data, null, 2));
        
        console.log('\n📋 Step 2: Checking services endpoint...');
        const servicesResponse = await makeRequest('/services');
        console.log('✅ Services endpoint response:');
        console.log('   Status:', servicesResponse.status);
        console.log('   Data:', JSON.stringify(servicesResponse.data, null, 2));
        
        console.log('\n📋 Step 3: Checking teams endpoint...');
        try {
            const teamsResponse = await makeRequest('/teams');
            console.log('✅ Teams endpoint response:');
            console.log('   Status:', teamsResponse.status);
            console.log('   Data:', JSON.stringify(teamsResponse.data, null, 2));
        } catch (teamsError) {
            console.log('❌ Teams endpoint failed:', teamsError.message);
        }
        
        console.log('\n📋 Step 4: Checking owners endpoint...');
        try {
            const ownersResponse = await makeRequest('/owners');
            console.log('✅ Owners endpoint response:');
            console.log('   Status:', ownersResponse.status);
            console.log('   Data:', JSON.stringify(ownersResponse.data, null, 2));
        } catch (ownersError) {
            console.log('❌ Owners endpoint failed:', ownersError.message);
        }
        
        console.log('\n📋 Step 5: Checking account endpoint...');
        try {
            const accountResponse = await makeRequest('/account');
            console.log('✅ Account endpoint response:');
            console.log('   Status:', accountResponse.status);
            console.log('   Data:', JSON.stringify(accountResponse.data, null, 2));
        } catch (accountError) {
            console.log('❌ Account endpoint failed:', accountError.message);
        }
        
        console.log('\n📋 Step 6: Checking available endpoints...');
        console.log('💡 Based on the responses, we can determine:');
        console.log('   1. What endpoints are available');
        console.log('   2. Where to find the owner ID');
        console.log('   3. What service types are supported');
        console.log('   4. How to properly create a service');
        
    } catch (error) {
        console.log('\n❌ Debug failed:', error.message);
    }
}

// Run the debug
debugRenderAPI().catch(console.error);
