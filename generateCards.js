const fs = require('fs');
const { createCanvas } = require('canvas');

// Create Images directory if it doesn't exist
if (!fs.existsSync('./public/Images')) {
    fs.mkdirSync('./public/Images', { recursive: true });
}

// Function to create a simple card image
function createCardImage(filename, text) {
    const canvas = createCanvas(100, 150);
    const ctx = canvas.getContext('2d');

    // White background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 100, 150);

    // Black border
    ctx.strokeStyle = 'black';
    ctx.strokeRect(0, 0, 100, 150);

    // Card text
    ctx.fillStyle = 'black';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(text, 50, 75);

    // Save the card
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(`./public/Images/${filename}.png`, buffer);
}

// Generate card back
createCardImage('cardBack', 'BACK');

// Generate all cards
const suits = ['clubs', 'hearts', 'spades', 'diamonds'];
const values = ['A', '2', '3'];

suits.forEach(suit => {
    values.forEach(value => {
        createCardImage(`${value}_${suit}`, `${value}\n${suit}`);
    });
});

console.log('Card images generated successfully!'); 