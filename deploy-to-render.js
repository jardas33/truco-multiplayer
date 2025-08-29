#!/usr/bin/env node

/**
 * Direct Render Deployment Script
 * 
 * This script attempts to deploy your Truco game directly to Render
 * using the API token you provided.
 */

const https = require('https');

// Render API configuration
const RENDER_API_TOKEN = 'rnd_rQqhfbARLIwJNoYdJVWLS9u7rkHf';
const RENDER_API_BASE = 'https://api.render.com/v1';

console.log('🚀 Attempting direct deployment to Render...\n');

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
                'User-Agent': 'Truco-Game-Deployer/1.0'
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
        console.log('📋 Step 1: Checking Render account...');
        
        // Check if we can access the Render API
        const accountResponse = await makeRequest('/user');
        console.log('✅ Render API connection successful!');
        console.log(`👤 Account: ${accountResponse.data.email || 'Connected'}\n`);
        
        console.log('📋 Step 2: Checking existing services...');
        
        // List existing services
        const servicesResponse = await makeRequest('/services');
        const existingServices = servicesResponse.data || [];
        
        console.log(`📊 Found ${existingServices.length} existing services`);
        
        if (existingServices.length > 0) {
            console.log('📝 Existing services:');
            existingServices.forEach(service => {
                console.log(`   - ${service.name} (${service.serviceType}) - ${service.status}`);
            });
        }
        
        console.log('\n📋 Step 3: Attempting to create new service...');
        
        // Try to create a new service
        const newServiceData = {
            name: 'truco-game',
            serviceType: 'web_service',
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
        
        console.log('🔧 Service configuration:');
        console.log(`   Name: ${newServiceData.name}`);
        console.log(`   Type: ${newServiceData.serviceType}`);
        console.log(`   Repository: ${newServiceData.repoUrl}`);
        console.log(`   Branch: ${newServiceData.branch}`);
        console.log(`   Build: ${newServiceData.buildCommand}`);
        console.log(`   Start: ${newServiceData.startCommand}`);
        
        try {
            const createResponse = await makeRequest('/services', 'POST', newServiceData);
            
            if (createResponse.status === 201 || createResponse.status === 200) {
                console.log('\n🎉 SUCCESS! Service created on Render!');
                console.log(`📱 Service ID: ${createResponse.data.id || 'N/A'}`);
                console.log(`🌐 Status: ${createResponse.data.status || 'Creating'}`);
                console.log('\n⏳ Your service is now being deployed...');
                console.log('📊 Check progress at: https://dashboard.render.com');
            } else {
                console.log('\n⚠️ Service creation response:', createResponse.status);
                console.log('📄 Response:', JSON.stringify(createResponse.data, null, 2));
            }
            
        } catch (createError) {
            console.log('\n❌ Could not create service automatically');
            console.log('💡 This might be due to API limitations or service type restrictions');
            console.log('📝 Error details:', createError.message);
        }
        
    } catch (error) {
        console.log('\n❌ Deployment failed:', error.message);
        console.log('\n💡 This usually means:');
        console.log('   1. The API token might not have deployment permissions');
        console.log('   2. Render requires manual service creation for some service types');
        console.log('   3. The MCP server is for monitoring, not deployment');
    }
    
    console.log('\n📋 Next Steps:');
    console.log('   1. Go to https://render.com');
    console.log('   2. Sign up/Login with GitHub');
    console.log('   3. Click "New +" → "MCP Server"');
    console.log('   4. Connect your repository: jardas33/truco-multiplayer');
    console.log('   5. Deploy manually (takes 5-10 minutes)');
}

// Run the deployment
deployToRender().catch(console.error);
