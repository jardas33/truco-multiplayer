#!/usr/bin/env node

/**
 * Force Render Service Update
 * 
 * This script forces Render to update the service configuration
 * and pull the latest code from GitHub.
 */

const https = require('https');

// Render API configuration
const RENDER_API_TOKEN = 'rnd_rQqhfbARLIwJNoYdJVWLS9u7rkHf';
const SERVICE_ID = 'srv-ct6jo1hu0jms7399376g';

console.log('🚀 Force Updating Render Service Configuration...\n');

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
                'User-Agent': 'Truco-Game-Force-Update/1.0'
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
async function forceUpdate() {
    try {
        console.log('📋 Step 1: Updating service configuration...');
        
        // Update the service configuration with correct settings
        const updateData = {
            buildCommand: 'npm install',
            startCommand: 'npm start',
            envVars: [
                {
                    key: 'NODE_ENV',
                    value: 'production'
                },
                {
                    key: 'HOST',
                    value: '0.0.0.0'
                }
            ]
        };
        
        console.log('🔧 Updating with configuration:', JSON.stringify(updateData, null, 2));
        
        const updateResponse = await makeRequest(`/services/${SERVICE_ID}`, 'PATCH', updateData);
        
        if (updateResponse.status === 200) {
            console.log('✅ Service configuration updated successfully!');
            console.log('   Build Command: npm install');
            console.log('   Start Command: npm start');
            console.log('   Environment Variables: NODE_ENV=production, HOST=0.0.0.0');
        } else {
            console.log('❌ Failed to update service configuration:', updateResponse.status);
            console.log('Response:', JSON.stringify(updateResponse.data, null, 2));
        }
        
        console.log('\n📋 Step 2: Forcing a fresh deployment from latest code...');
        
        // Force a fresh deployment with cache clear
        const deployData = {
            clearCache: 'clear'
        };
        
        const deployResponse = await makeRequest(`/services/${SERVICE_ID}/deploys`, 'POST', deployData);
        
        if (deployResponse.status === 201) {
            console.log('🎉 Fresh deployment triggered successfully!');
            console.log('   Deployment ID:', deployResponse.data.id);
            console.log('   Status:', deployResponse.data.status);
            console.log('   Cache cleared for fresh build');
        } else {
            console.log('❌ Failed to trigger deployment:', deployResponse.status);
            console.log('Response:', JSON.stringify(deployResponse.data, null, 2));
        }
        
        console.log('\n📋 Step 3: Verifying the update...');
        
        // Wait a moment and check the updated service
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const verifyResponse = await makeRequest(`/services/${SERVICE_ID}`);
        
        if (verifyResponse.status === 200) {
            const service = verifyResponse.data;
            console.log('✅ Service verification:');
            console.log(`   Name: ${service.name}`);
            console.log(`   Status: ${service.suspended === 'not_suspended' ? 'Active' : 'Suspended'}`);
            console.log(`   Last Updated: ${service.updatedAt}`);
            
            if (service.serviceDetails?.envSpecificDetails) {
                const details = service.serviceDetails.envSpecificDetails;
                console.log(`   Build Command: ${details.buildCommand || 'Not set'}`);
                console.log(`   Start Command: ${details.startCommand || 'Not set'}`);
            }
        }
        
    } catch (error) {
        console.log('\n❌ Force update failed:', error.message);
    }
    
    console.log('\n🎯 What This Update Does:');
    console.log('   1. ✅ Fixes the start command from "start" to "npm start"');
    console.log('   2. ✅ Ensures proper build command: "npm install"');
    console.log('   3. ✅ Sets production environment variables');
    console.log('   4. ✅ Forces a fresh deployment with latest code');
    console.log('   5. ✅ Clears build cache for clean rebuild');
    
    console.log('\n📊 Monitor Progress:');
    console.log('   Dashboard: https://dashboard.render.com');
    console.log('   Service: truco-multiplayer');
    console.log('   Expected: Status should change to "Building" then "Live"');
    console.log('   Timeline: 5-10 minutes for complete rebuild');
}

// Run the force update
forceUpdate().catch(console.error);
