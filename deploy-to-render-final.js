#!/usr/bin/env node

/**
 * Final Render Deployment Script
 * 
 * This script uses the correct owner ID and deploys your Truco game
 * or checks the status of your existing service.
 */

const https = require('https');

// Render API configuration
const RENDER_API_TOKEN = 'rnd_rQqhfbARLIwJNoYdJVWLS9u7rkHf';
const OWNER_ID = 'tea-ct6j9io8fa8c73cd72sg'; // From debug output

console.log('🚀 Final Render Deployment - Using Correct Owner ID...\n');

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
                'User-Agent': 'Truco-Game-Deployer-Final/1.0'
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

// Main deployment function
async function deployToRender() {
    try {
        console.log('📋 Step 1: Checking existing services...');
        
        // List existing services
        const servicesResponse = await makeRequest('/services');
        const existingServices = servicesResponse.data || [];
        
        console.log(`📊 Found ${existingServices.length} existing services`);
        
        // Check if truco-game already exists
        const existingTruco = existingServices.find(item => 
            item.service.name === 'truco-game' || 
            item.service.name === 'truco-multiplayer'
        );
        
        if (existingTruco) {
            const service = existingTruco.service;
            console.log(`✅ Found existing service: ${service.name}`);
            console.log(`📱 Service ID: ${service.id}`);
            console.log(`🌐 Status: ${service.suspended === 'not_suspended' ? 'Active' : 'Suspended'}`);
            console.log(`🔗 URL: ${service.serviceDetails?.url || 'Building...'}`);
            console.log(`📊 Dashboard: ${service.dashboardUrl}`);
            
            if (service.serviceDetails?.url) {
                console.log('\n🎉 Your Truco game is already live!');
                console.log(`🌐 Play at: ${service.serviceDetails.url}`);
                console.log(`📊 Monitor at: ${service.dashboardUrl}`);
                
                // Check if we need to redeploy
                console.log('\n📋 Step 2: Checking if redeployment is needed...');
                console.log(`🔄 Last updated: ${service.updatedAt}`);
                console.log(`🌿 Branch: ${service.branch}`);
                console.log(`🔧 Auto-deploy: ${service.autoDeploy}`);
                
                if (service.autoDeploy === 'yes') {
                    console.log('✅ Auto-deploy is enabled - your service will update automatically when you push to GitHub!');
                } else {
                    console.log('⚠️ Auto-deploy is disabled - you may need to manually redeploy');
                }
                
                return;
            } else {
                console.log('\n⏳ Service is building/deploying...');
                console.log('📊 Monitor at: https://dashboard.render.com');
                return;
            }
        }
        
        console.log('\n📋 Step 2: Creating new MCP Server service...');
        
        // Try to create a new MCP Server service
        const newServiceData = {
            name: 'truco-game',
            type: 'mcp_server', // Using MCP Server as in render.yaml
            ownerId: OWNER_ID,
            env: 'node',
            plan: 'free',
            repo: 'https://github.com/jardas33/truco-multiplayer',
            branch: 'main',
            buildCommand: 'npm install',
            startCommand: 'npm start',
            envVars: [
                { key: 'NODE_ENV', value: 'production' },
                { key: 'HOST', value: '0.0.0.0' }
            ]
        };
        
        console.log('🔧 MCP Server configuration:');
        console.log(`   Name: ${newServiceData.name}`);
        console.log(`   Type: ${newServiceData.type}`);
        console.log(`   Owner ID: ${newServiceData.ownerId}`);
        console.log(`   Repository: ${newServiceData.repo}`);
        console.log(`   Branch: ${newServiceData.branch}`);
        console.log(`   Build: ${newServiceData.buildCommand}`);
        console.log(`   Start: ${newServiceData.startCommand}`);
        
        try {
            const createResponse = await makeRequest('/services', 'POST', newServiceData);
            
            if (createResponse.status === 201 || createResponse.status === 200) {
                console.log('\n🎉 SUCCESS! MCP Server service created on Render!');
                console.log(`📱 Service ID: ${createResponse.data.id || 'N/A'}`);
                console.log(`🌐 Status: ${createResponse.data.status || 'Creating'}`);
                console.log(`🔗 Service URL: ${createResponse.data.serviceUrl || 'Building...'}`);
                console.log('\n⏳ Your service is now being deployed...');
                console.log('📊 Check progress at: https://dashboard.render.com');
                
            } else {
                console.log('\n⚠️ Service creation response:', createResponse.status);
                console.log('📄 Response:', JSON.stringify(createResponse.data, null, 2));
                
                // Try alternative service type if MCP Server fails
                console.log('\n🔄 Trying alternative: Web Service...');
                newServiceData.type = 'web_service';
                
                const altResponse = await makeRequest('/services', 'POST', newServiceData);
                if (altResponse.status === 201 || altResponse.status === 200) {
                    console.log('\n🎉 SUCCESS! Web Service created on Render!');
                    console.log(`📱 Service ID: ${altResponse.data.id || 'N/A'}`);
                    console.log(`🌐 Status: ${altResponse.data.status || 'Creating'}`);
                } else {
                    console.log('\n❌ Alternative service type also failed');
                    console.log('📄 Response:', JSON.stringify(altResponse.data, null, 2));
                }
            }
            
        } catch (createError) {
            console.log('\n❌ Could not create service automatically');
            console.log('💡 This might be due to API limitations');
            console.log('📝 Error details:', createError.message);
        }
        
    } catch (error) {
        console.log('\n❌ Deployment failed:', error.message);
    }
    
    console.log('\n📋 Next Steps (if automatic deployment failed):');
    console.log('   1. Go to https://render.com');
    console.log('   2. Sign up/Login with GitHub');
    console.log('   3. Click "New +" → "MCP Server"');
    console.log('   4. Connect your repository: jardas33/truco-multiplayer');
    console.log('   5. Deploy manually (takes 5-10 minutes)');
}

// Run the deployment
deployToRender().catch(console.error);
