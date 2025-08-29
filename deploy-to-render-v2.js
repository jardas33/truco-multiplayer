#!/usr/bin/env node

/**
 * Enhanced Render Deployment Script
 * 
 * This script gets the owner ID and attempts to deploy your Truco game
 * directly to Render using the API token.
 */

const https = require('https');

// Render API configuration
const RENDER_API_TOKEN = 'rnd_rQqhfbARLIwJNoYdJVWLS9u7rkHf';

console.log('🚀 Enhanced Render Deployment - Getting Owner ID...\n');

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
                'User-Agent': 'Truco-Game-Deployer/2.0'
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
        console.log('📋 Step 1: Getting account details...');
        
        // Get account details to find owner ID
        const accountResponse = await makeRequest('/user');
        console.log('✅ Account details retrieved');
        
        // Get owner ID from account
        const ownerID = accountResponse.data.id;
        console.log(`👤 Owner ID: ${ownerID}\n`);
        
        console.log('📋 Step 2: Checking existing services...');
        
        // List existing services
        const servicesResponse = await makeRequest('/services');
        const existingServices = servicesResponse.data || [];
        
        console.log(`📊 Found ${existingServices.length} existing services`);
        
        // Check if truco-game already exists
        const existingTruco = existingServices.find(service => 
            service.name === 'truco-game' || 
            service.name === 'truco-multiplayer'
        );
        
        if (existingTruco) {
            console.log(`✅ Found existing service: ${existingTruco.name}`);
            console.log(`📱 Service ID: ${existingTruco.id}`);
            console.log(`🌐 Status: ${existingTruco.status}`);
            console.log(`🔗 URL: ${existingTruco.serviceUrl || 'Building...'}`);
            
            if (existingTruco.status === 'live') {
                console.log('\n🎉 Your Truco game is already live!');
                console.log(`🌐 Play at: ${existingTruco.serviceUrl}`);
                return;
            } else {
                console.log('\n⏳ Service is building/deploying...');
                console.log('📊 Monitor at: https://dashboard.render.com');
                return;
            }
        }
        
        console.log('\n📋 Step 3: Creating new MCP Server service...');
        
        // Try to create a new MCP Server service (as specified in render.yaml)
        const newServiceData = {
            name: 'truco-game',
            serviceType: 'mcp_server', // Using MCP Server as in render.yaml
            ownerID: ownerID,
            env: 'node',
            plan: 'free',
            repoUrl: 'https://github.com/jardas33/truco-multiplayer',
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
        console.log(`   Type: ${newServiceData.serviceType}`);
        console.log(`   Owner ID: ${newServiceData.ownerID}`);
        console.log(`   Repository: ${newServiceData.repoUrl}`);
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
                
                // Wait a moment and check status
                setTimeout(async () => {
                    try {
                        const statusResponse = await makeRequest(`/services/${createResponse.data.id}`);
                        console.log('\n📊 Current Status:');
                        console.log(`   Status: ${statusResponse.data.status}`);
                        console.log(`   Health: ${statusResponse.data.health || 'Unknown'}`);
                        console.log(`   URL: ${statusResponse.data.serviceUrl || 'Still building...'}`);
                    } catch (statusError) {
                        console.log('📊 Status check failed:', statusError.message);
                    }
                }, 5000);
                
            } else {
                console.log('\n⚠️ Service creation response:', createResponse.status);
                console.log('📄 Response:', JSON.stringify(createResponse.data, null, 2));
                
                // Try alternative service type if MCP Server fails
                console.log('\n🔄 Trying alternative: Web Service...');
                newServiceData.serviceType = 'web_service';
                
                const altResponse = await makeRequest('/services', 'POST', newServiceData);
                if (altResponse.status === 201 || altResponse.status === 200) {
                    console.log('\n🎉 SUCCESS! Web Service created on Render!');
                    console.log(`📱 Service ID: ${altResponse.data.id || 'N/A'}`);
                    console.log(`🌐 Status: ${altResponse.data.status || 'Creating'}`);
                } else {
                    console.log('\n❌ Alternative service type also failed');
                }
            }
            
        } catch (createError) {
            console.log('\n❌ Could not create service automatically');
            console.log('💡 This might be due to API limitations');
            console.log('📝 Error details:', createError.message);
        }
        
    } catch (error) {
        console.log('\n❌ Deployment failed:', error.message);
        console.log('\n💡 This usually means:');
        console.log('   1. The API token might not have deployment permissions');
        console.log('   2. Render requires manual service creation for some service types');
        console.log('   3. The MCP server is for monitoring, not deployment');
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
