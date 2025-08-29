#!/usr/bin/env node

/**
 * Check Render Service Logs
 * 
 * This script checks the logs and status of your Render service
 * to understand why it's showing as failed.
 */

const https = require('https');

// Render API configuration
const RENDER_API_TOKEN = 'rnd_rQqhfbARLIwJNoYdJVWLS9u7rkHf';
const SERVICE_ID = 'srv-ct6jo1hu0jms7399376g';

console.log('🔍 Checking Render Service Logs and Status...\n');

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
                'User-Agent': 'Truco-Game-Log-Checker/1.0'
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
                    resolve({ status: res.statusCode, data: parsed });
                } catch (error) {
                    resolve({ status: res.statusCode, data: responseData });
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

// Main function
async function checkServiceStatus() {
    try {
        console.log('📋 Step 1: Getting detailed service information...');
        
        // Get detailed service info
        const serviceResponse = await makeRequest(`/services/${SERVICE_ID}`);
        
        if (serviceResponse.status === 200) {
            const service = serviceResponse.data;
            console.log('✅ Service details retrieved:');
            console.log(`   Name: ${service.name}`);
            console.log(`   ID: ${service.id}`);
            console.log(`   Type: ${service.type}`);
            console.log(`   Status: ${service.suspended === 'not_suspended' ? 'Active' : 'Suspended'}`);
            console.log(`   URL: ${service.serviceDetails?.url || 'Not available'}`);
            console.log(`   Last Updated: ${service.updatedAt}`);
            console.log(`   Branch: ${service.branch}`);
            console.log(`   Auto-deploy: ${service.autoDeploy}`);
            
            if (service.serviceDetails) {
                console.log(`   Build Plan: ${service.serviceDetails.buildPlan}`);
                console.log(`   Plan: ${service.serviceDetails.plan}`);
                console.log(`   Region: ${service.serviceDetails.region}`);
                console.log(`   Runtime: ${service.serviceDetails.runtime}`);
                console.log(`   Build Command: ${service.serviceDetails.envSpecificDetails?.buildCommand || 'Not set'}`);
                console.log(`   Start Command: ${service.serviceDetails.envSpecificDetails?.startCommand || 'Not set'}`);
            }
        } else {
            console.log('❌ Failed to get service details:', serviceResponse.status);
            console.log('Response:', JSON.stringify(serviceResponse.data, null, 2));
        }
        
        console.log('\n📋 Step 2: Checking service logs...');
        
        // Try to get service logs
        try {
            const logsResponse = await makeRequest(`/services/${SERVICE_ID}/logs`);
            console.log('✅ Logs response:');
            console.log('   Status:', logsResponse.status);
            console.log('   Data:', JSON.stringify(logsResponse.data, null, 2));
        } catch (logsError) {
            console.log('❌ Could not retrieve logs:', logsError.message);
        }
        
        console.log('\n📋 Step 3: Checking if we can trigger a redeploy...');
        
        // Try to trigger a manual redeploy
        try {
            const redeployData = {
                clearCache: 'do_not_clear'
            };
            
            const redeployResponse = await makeRequest(`/services/${SERVICE_ID}/deploys`, 'POST', redeployData);
            console.log('✅ Redeploy response:');
            console.log('   Status:', redeployResponse.status);
            console.log('   Data:', JSON.stringify(redeployResponse.data, null, 2));
            
            if (redeployResponse.status === 201 || redeployResponse.status === 200) {
                console.log('\n🎉 Redeploy triggered successfully!');
                console.log('⏳ Your service is now rebuilding...');
                console.log('📊 Monitor progress at: https://dashboard.render.com');
            }
            
        } catch (redeployError) {
            console.log('❌ Could not trigger redeploy:', redeployError.message);
        }
        
    } catch (error) {
        console.log('\n❌ Check failed:', error.message);
    }
    
    console.log('\n📋 Next Steps:');
    console.log('   1. Check the dashboard for build logs');
    console.log('   2. Verify your code is compatible with Render');
    console.log('   3. Check if there are any build errors');
    console.log('   4. Consider updating the service configuration');
}

// Run the check
checkServiceStatus().catch(console.error);
