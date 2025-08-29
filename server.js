const express = require('express');
const app = express();

// Health check endpoint for Render
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Basic route
app.get('/', (req, res) => {
    res.send('Truco Game Server - Working Version');
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 