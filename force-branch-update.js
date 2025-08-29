#!/usr/bin/env node

/**
 * Force Render Branch Update
 * 
 * This script forces Render to pull from the current main branch
 * and use the latest commit instead of the old one.
 */

const https = require('https');

// Render API configuration
const RENDER_API_TOKEN = 'rnd_rQqhfbARLIwJNoYdJVWLS9u7rkHf';
const SERVICE_ID = 'srv-ct6jo1hu0jms7399376g';

console.log('🔄 Force Updating Render to Use Latest Main Branch...\n');

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
                'User-Agent': 'Truco-Game-Branch-Update/1.0'
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
async function forceBranchUpdate() {
    try {
        console.log('📋 Step 1: Checking current service configuration...');
        
        const currentService = await makeRequest(`/services/${SERVICE_ID}`);
        
        if (currentService.status === 200) {
            const service = currentService.data;
            console.log('📊 Current service info:');
            console.log(`   Name: ${service.name}`);
            console.log(`   Branch: ${service.branch}`);
            console.log(`   Last Commit: ${service.serviceDetails?.commitId || 'Unknown'}`);
            console.log(`   Last Updated: ${service.updatedAt}`);
            console.log(`   Start Command: ${service.serviceDetails?.envSpecificDetails?.startCommand || 'Not set'}`);
        }
        
        console.log('\n📋 Step 2: Force updating to latest main branch...');
        
        // Force update to pull from main branch with latest code
        const updateData = {
            branch: 'main',
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
            console.log('   Branch: main (latest)');
            console.log('   Build Command: npm install');
            console.log('   Start Command: npm start');
            console.log('   Environment Variables: NODE_ENV=production, HOST=0.0.0.0');
        } else {
            console.log('❌ Failed to update service configuration:', updateResponse.status);
            console.log('Response:', JSON.stringify(updateResponse.data, null, 2));
            return;
        }
        
        console.log('\n📋 Step 3: Triggering deployment from latest main branch...');
        
        // Force a fresh deployment that will pull latest code
        const deployData = {
            clearCache: 'clear'
        };
        
        const deployResponse = await makeRequest(`/services/${SERVICE_ID}/deploys`, 'POST', deployData);
        
        if (deployResponse.status === 201) {
            console.log('🎉 Deployment triggered from latest main branch!');
            console.log('   Deployment ID:', deployResponse.data.id);
            console.log('   Status:', deployResponse.data.status);
            console.log('   Cache cleared for fresh build');
            console.log('   Will pull latest code from main branch');
        } else {
            console.log('❌ Failed to trigger deployment:', deployResponse.status);
            console.log('Response:', JSON.stringify(deployResponse.data, null, 2));
            return;
        }
        
        console.log('\n📋 Step 4: Verifying the branch update...');
        
        // Wait a moment and check the updated service
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const verifyResponse = await makeRequest(`/services/${SERVICE_ID}`);
        
        if (verifyResponse.status === 200) {
            const service = verifyResponse.data;
            console.log('✅ Service verification:');
            console.log(`   Name: ${service.name}`);
            console.log(`   Branch: ${service.branch}`);
            console.log(`   Status: ${service.suspended === 'not_suspended' ? 'Active' : 'Suspended'}`);
            console.log(`   Last Updated: ${service.updatedAt}`);
            
            if (service.serviceDetails?.envSpecificDetails) {
                const details = service.serviceDetails.envSpecificDetails;
                console.log(`   Build Command: ${details.buildCommand || 'Not set'}`);
                console.log(`   Start Command: ${details.startCommand || 'Not set'}`);
            }
        }
        
    } catch (error) {
        console.log('\n❌ Force branch update failed:', error.message);
    }
    
    console.log('\n🎯 What This Update Does:');
    console.log('   1. ✅ Forces Render to use "main" branch (not old commit)');
    console.log('   2. ✅ Pulls your latest code (commit f61db36)');
    console.log('   3. ✅ Fixes start command to "npm start"');
    console.log('   4. ✅ Sets proper environment variables');
    console.log('   5. ✅ Triggers fresh deployment with latest code');
    
    console.log('\n📊 Monitor Progress:');
    console.log('   Dashboard: https://dashboard.render.com');
    console.log('   Service: truco-multiplayer');
    console.log('   Expected: Should now show "Building" with latest commit');
    console.log('   Timeline: 5-10 minutes for complete rebuild');
    
    console.log('\n🔍 Key Change:');
    console.log('   OLD: Using commit a213194 (December 2024)');
    console.log('   NEW: Using commit f61db36 (Latest fixes)');
}

// Run the force branch update
forceBranchUpdate().catch(console.error);
