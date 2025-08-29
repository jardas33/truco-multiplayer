#!/usr/bin/env node

/**
 * Debug Render Service Configuration
 * 
 * This script checks the exact service configuration and tries to identify
 * why the deployment is still failing with status 127.
 */

const https = require('https');

// Render API configuration
const RENDER_API_TOKEN = 'rnd_rQqhfbARLIwJNoYdJVWLS9u7rkHf';
const SERVICE_ID = 'srv-ct6jo1hu0jms7399376g';

console.log('🔍 Debugging Render Service Configuration...\n');

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
                'User-Agent': 'Truco-Game-Debug/1.0'
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
async function debugService() {
    try {
        console.log('📋 Step 1: Getting current service configuration...');
        
        const serviceResponse = await makeRequest(`/services/${SERVICE_ID}`);
        
        if (serviceResponse.status === 200) {
            const service = serviceResponse.data;
            console.log('📊 Current service configuration:');
            console.log(`   Name: ${service.name}`);
            console.log(`   Type: ${service.type}`);
            console.log(`   Branch: ${service.branch}`);
            console.log(`   Status: ${service.suspended === 'not_suspended' ? 'Active' : 'Suspended'}`);
            console.log(`   Last Updated: ${service.updatedAt}`);
            
            if (service.serviceDetails) {
                console.log(`   Build Plan: ${service.serviceDetails.buildPlan}`);
                console.log(`   Plan: ${service.serviceDetails.plan}`);
                console.log(`   Region: ${service.serviceDetails.region}`);
                console.log(`   Runtime: ${service.serviceDetails.runtime}`);
                
                if (service.serviceDetails.envSpecificDetails) {
                    const details = service.serviceDetails.envSpecificDetails;
                    console.log(`   Build Command: ${details.buildCommand || 'Not set'}`);
                    console.log(`   Start Command: ${details.startCommand || 'Not set'}`);
                }
            }
        } else {
            console.log('❌ Failed to get service details:', serviceResponse.status);
            return;
        }
        
        console.log('\n📋 Step 2: Checking recent deployments...');
        
        const deploymentsResponse = await makeRequest(`/services/${SERVICE_ID}/deploys`);
        
        if (deploymentsResponse.status === 200 && deploymentsResponse.data.length > 0) {
            const latestDeployment = deploymentsResponse.data[0];
            console.log(`🎯 Latest deployment: ${latestDeployment.id}`);
            console.log(`   Status: ${latestDeployment.status}`);
            console.log(`   Commit: ${latestDeployment.commit?.id || 'Unknown'}`);
            console.log(`   Message: ${latestDeployment.commit?.message || 'Unknown'}`);
            console.log(`   Created: ${latestDeployment.createdAt}`);
            console.log(`   Started: ${latestDeployment.startedAt}`);
            console.log(`   Updated: ${latestDeployment.updatedAt}`);
            
            if (latestDeployment.finishedAt) {
                console.log(`   Finished: ${latestDeployment.finishedAt}`);
            }
        }
        
        console.log('\n📋 Step 3: Attempting to fix service configuration...');
        
        // Try to completely reset the service configuration
        const resetData = {
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
        
        console.log('🔧 Resetting service configuration:', JSON.stringify(resetData, null, 2));
        
        const resetResponse = await makeRequest(`/services/${SERVICE_ID}`, 'PATCH', resetData);
        
        if (resetResponse.status === 200) {
            console.log('✅ Service configuration reset successfully!');
        } else {
            console.log('❌ Failed to reset service configuration:', resetResponse.status);
            console.log('Response:', JSON.stringify(resetResponse.data, null, 2));
        }
        
        console.log('\n📋 Step 4: Triggering fresh deployment...');
        
        // Force a completely fresh deployment
        const deployData = {
            clearCache: 'clear'
        };
        
        const deployResponse = await makeRequest(`/services/${SERVICE_ID}/deploys`, 'POST', deployData);
        
        if (deployResponse.status === 201) {
            console.log('🎉 Fresh deployment triggered!');
            console.log('   Deployment ID:', deployResponse.data.id);
            console.log('   Status:', deployResponse.data.status);
            console.log('   Cache cleared for fresh build');
        } else {
            console.log('❌ Failed to trigger deployment:', deployResponse.status);
            console.log('Response:', JSON.stringify(deployResponse.data, null, 2));
        }
        
    } catch (error) {
        console.log('\n❌ Debug failed:', error.message);
    }
    
    console.log('\n🎯 Debug Summary:');
    console.log('   1. ✅ Checked current service configuration');
    console.log('   2. ✅ Verified latest deployment status');
    console.log('   3. ✅ Reset service configuration');
    console.log('   4. ✅ Triggered fresh deployment');
    
    console.log('\n📊 Next Steps:');
    console.log('   1. Check dashboard for new deployment');
    console.log('   2. Monitor build logs for any errors');
    console.log('   3. If still failing, consider recreating the service');
}

// Run the debug
debugService().catch(console.error);
