#!/usr/bin/env node

/**
 * MCP Server Starter for Cursor-Render Integration
 * 
 * This script starts the MCP server to connect Cursor with Render services.
 * Run this before using Cursor with Render integration.
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting MCP Server for Cursor-Render Integration...\n');

// Check if MCP server is installed
const mcpServerPath = path.join(__dirname, 'node_modules', '.bin', 'mcp-server');
const configPath = path.join(__dirname, 'mcp-server-config.json');

console.log('📁 Config file:', configPath);
console.log('🔧 MCP Server path:', mcpServerPath);
console.log('');

// Start MCP server
const mcpProcess = spawn(mcpServerPath, ['--config', configPath], {
    stdio: 'inherit',
    shell: true
});

mcpProcess.on('error', (error) => {
    console.error('❌ Failed to start MCP server:', error.message);
    console.log('\n💡 Try installing MCP server first:');
    console.log('   npm install @modelcontextprotocol/server');
});

mcpProcess.on('close', (code) => {
    console.log(`\n🔌 MCP server stopped with code ${code}`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down MCP server...');
    mcpProcess.kill('SIGINT');
    process.exit(0);
});

console.log('✅ MCP server is starting...');
console.log('📱 Now you can configure Cursor to use this MCP server');
console.log('🔗 Keep this terminal open while using Cursor with Render integration');
