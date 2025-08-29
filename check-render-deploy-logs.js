#!/usr/bin/env node

/**
 * Check Render Deployment Logs
 * 
 * This script fetches and displays the detailed logs for a specific Render deployment.
 */

const https = require('https');

// Render API configuration
const RENDER_API_TOKEN = 'rnd_rQqhfbARLIwJNoYdJVWLS9u7rkHf';
const SERVICE_ID = 'srv-ct6jo1hu0jms7399376g';

console.log('🔍 Fetching detailed logs for latest failed deployment...\n');

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
                'Accept': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(body));
                    } catch (e) {
                        resolve(body); // Sometimes logs are not JSON
                    }
                } else {
                    reject(new Error(`Request failed with status ${res.statusCode}: ${body}`));
                }
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function getDeploymentLogs() {
    try {
        console.log('📋 Step 1: Getting list of recent deployments...');
        
        const deployments = await makeRequest(`/services/${SERVICE_ID}/deploys`);
        
        if (deployments && deployments.length > 0) {
            console.log(`📊 Found ${deployments.length} deployments`);
            
            // Get the most recent deployment
            const latestDeployment = deployments[0];
            console.log(`🎯 Latest deployment: ${latestDeployment.id}`);
            console.log(`   Status: ${latestDeployment.status}`);
            console.log(`   Commit: ${latestDeployment.commit?.id || 'Unknown'}`);
            console.log(`   Created: ${latestDeployment.createdAt}`);
            
            console.log('\n📋 Step 2: Fetching detailed logs for latest deployment...');
            
            try {
                const logs = await makeRequest(`/services/${SERVICE_ID}/deploys/${latestDeployment.id}/logs`);
                console.log(`\n--- Detailed Logs for ${latestDeployment.id} ---`);
                console.log(logs);
                console.log(`--- End of Logs ---`);
            } catch (logsError) {
                console.log('❌ Could not fetch logs:', logsError.message);
                console.log('Trying alternative log endpoint...');
                
                try {
                    const altLogs = await makeRequest(`/services/${SERVICE_ID}/logs`);
                    console.log(`\n--- Alternative Logs ---`);
                    console.log(altLogs);
                    console.log(`--- End of Alternative Logs ---`);
                } catch (altError) {
                    console.log('❌ Alternative logs also failed:', altError.message);
                }
            }
            
        } else {
            console.log('❌ No deployments found');
        }
        
    } catch (error) {
        console.error('❌ Error fetching deployment logs:', error.message);
    }
}

getDeploymentLogs();
