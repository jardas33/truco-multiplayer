# 🔗 Cursor + MCP Server + Render Integration Guide

## 🎯 **What This Setup Enables**

By connecting Cursor to Render through the MCP server, you can:
- **Deploy directly from Cursor** to Render
- **Monitor your Truco game** deployment status
- **Access Render logs** for debugging
- **Manage environment variables** from your editor
- **Scale services** without leaving Cursor

---

## ⚙️ **MCP Server Configuration**

### **1. MCP Server Config File**
Your `mcp-server-config.json` is already configured:
```json
{
  "mcpServers": {
    "render": {
      "url": "https://mcp.render.com/mcp",
      "headers": {
        "Authorization": "Bearer rnd_rQqhfbARLIwJNoYdJVWLS9u7rkHf"
      }
    }
  }
}
```

### **2. Cursor Configuration**
The `.cursorrules` file tells Cursor how to use the MCP server.

---

## 🚀 **Setup Steps**

### **Step 1: Install MCP Server (if not already installed)**
```bash
# Install MCP server globally
npm install -g @modelcontextprotocol/server

# Or install locally in your project
npm install @modelcontextprotocol/server
```

### **Step 2: Start MCP Server**
```bash
# Start the MCP server with your config
mcp-server --config mcp-server-config.json
```

### **Step 3: Configure Cursor**
1. **Open Cursor**
2. **Go to Settings** (Cmd/Ctrl + ,)
3. **Search for "MCP"** or "Model Context Protocol"
4. **Add your MCP server configuration**

---

## 🔧 **Alternative Setup Methods**

### **Method 1: Environment Variables**
```bash
export MCP_SERVER_URL="https://mcp.render.com/mcp"
export MCP_SERVER_TOKEN="rnd_rQqhfbARLIwJNoYdJVWLS9u7rkHf"
```

### **Method 2: Cursor Settings File**
Add to your Cursor settings:
```json
{
  "mcp.servers": {
    "render": {
      "url": "https://mcp.render.com/mcp",
      "headers": {
        "Authorization": "Bearer rnd_rQqhfbARLIwJNoYdJVWLS9u7rkHf"
      }
    }
  }
}
```

---

## 📱 **Available MCP Commands**

Once connected, you can use these commands in Cursor:

### **Deployment Commands**
- `deploy to render` - Deploy your current code
- `check render status` - Check deployment status
- `view render logs` - Access application logs

### **Management Commands**
- `scale render service` - Scale your service up/down
- `update render env` - Update environment variables
- `restart render service` - Restart your application

### **Monitoring Commands**
- `render metrics` - View performance metrics
- `render health` - Check service health
- `render incidents` - View any issues

---

## 🎮 **Truco Game Specific Commands**

### **Game Deployment**
```
/deploy truco game to render
```

### **Game Monitoring**
```
/check truco game status
/view truco game logs
/monitor truco game performance
```

### **Game Management**
```
/restart truco game
/scale truco game
/update truco game env
```

---

## 🔍 **Testing the Connection**

### **Test 1: Basic Connection**
1. Start MCP server
2. Open Cursor
3. Try: `/test render connection`

### **Test 2: Service Status**
1. Deploy your Truco game to Render
2. In Cursor, try: `/check render service status`

### **Test 3: Logs Access**
1. In Cursor, try: `/view render logs truco-game`

---

## 🆘 **Troubleshooting**

### **Connection Issues**
- ✅ Verify your Render API token is valid
- ✅ Check if MCP server is running
- ✅ Ensure Cursor has MCP support enabled

### **Authentication Issues**
- ✅ Verify Bearer token format
- ✅ Check token permissions in Render
- ✅ Ensure token hasn't expired

### **Command Issues**
- ✅ Check MCP server logs
- ✅ Verify Cursor MCP integration
- ✅ Test with simple commands first

---

## 💡 **Pro Tips**

1. **Keep your API token secure** - Don't commit it to public repos
2. **Use environment variables** for sensitive data
3. **Test commands incrementally** - Start with simple ones
4. **Monitor MCP server logs** for debugging
5. **Backup your configuration** before making changes

---

## 📚 **Useful Resources**

- **MCP Protocol**: [modelcontextprotocol.io](https://modelcontextprotocol.io)
- **Render API Docs**: [render.com/docs/api](https://render.com/docs/api)
- **Cursor MCP Support**: Check Cursor documentation
- **Community**: MCP Discord/forums for help

---

## 🎉 **What You'll Achieve**

With this setup, you can:
- 🚀 **Deploy your Truco game** directly from Cursor
- 📊 **Monitor performance** in real-time
- 🔧 **Debug issues** without leaving your editor
- ⚡ **Scale automatically** based on demand
- 🌐 **Manage deployments** seamlessly

---

## 🚀 **Ready to Connect!**

Your MCP server configuration is ready. Follow the setup steps to connect Cursor to Render and enjoy seamless deployment and management of your Truco game!

**Next step**: Start the MCP server and configure Cursor to use it. 🎮✨
