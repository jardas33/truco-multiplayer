// 🎮 SHARED GAME FRAMEWORK
// Common utilities and functions for all card games

// Global game state
window.gameFramework = {
    currentGame: null,
    socket: null,
    players: [],
    roomId: null,
    playerId: null,
    isHost: false,
    gameState: 'lobby', // lobby, playing, finished
    cardImages: {},
    cardBackImage: null
};

// 🃏 CARD UTILITIES
class CardUtils {
    static createStandardDeck() {
        const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
        const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
        const deck = [];
        
        for (let suit of suits) {
            for (let rank of ranks) {
                const cardName = `${rank} of ${suit}`;
                deck.push({
                    name: cardName,
                    suit: suit,
                    rank: rank,
                    value: this.getCardValue(rank),
                    image: window.cardImages[cardName] || null,
                    isClickable: false
                });
            }
        }
        
        return deck;
    }
    
    static getCardValue(rank) {
        const values = {
            '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
            'jack': 11, 'queen': 12, 'king': 13, 'ace': 14
        };
        return values[rank] || 0;
    }
    
    static shuffleDeck(deck) {
        const shuffled = [...deck];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
    
    static dealCards(deck, numPlayers, cardsPerPlayer) {
        const hands = Array(numPlayers).fill().map(() => []);
        let cardIndex = 0;
        
        for (let round = 0; round < cardsPerPlayer; round++) {
            for (let player = 0; player < numPlayers; player++) {
                if (cardIndex < deck.length) {
                    hands[player].push(deck[cardIndex]);
                    cardIndex++;
                }
            }
        }
        
        return hands;
    }
    
    static getCardImage(cardName) {
        return window.cardImages[cardName] || null;
    }
    
    static getCardBackImage() {
        return window.cardBackImage || null;
    }
}

// 🎯 PLAYER MANAGEMENT
class PlayerManager {
    static createPlayer(id, name, isBot = false, team = null) {
        return {
            id: id,
            name: name,
            isBot: isBot,
            team: team,
            hand: [],
            score: 0,
            isActive: true,
            hasPlayed: false,
            position: 0
        };
    }
    
    static addBot(players, botName = null) {
        const botNames = ['Bot Alpha', 'Bot Beta', 'Bot Gamma', 'Bot Delta', 'Bot Epsilon'];
        const usedNames = players.filter(p => p.isBot).map(p => p.name);
        const availableNames = botNames.filter(name => !usedNames.includes(name));
        
        if (availableNames.length === 0) return null;
        
        const botName = botName || availableNames[0];
        const newBot = this.createPlayer(`bot_${Date.now()}`, botName, true);
        players.push(newBot);
        return newBot;
    }
    
    static removeBot(players) {
        const botIndex = players.findIndex(p => p.isBot);
        if (botIndex !== -1) {
            return players.splice(botIndex, 1)[0];
        }
        return null;
    }
    
    static getPlayerById(players, id) {
        return players.find(p => p.id === id);
    }
    
    static getPlayerByIndex(players, index) {
        return players[index];
    }
}

// 🌐 SOCKET COMMUNICATION
class SocketManager {
    static initialize(gameType) {
        if (window.gameFramework.socket) {
            window.gameFramework.socket.disconnect();
        }
        
        window.gameFramework.socket = io();
        window.gameFramework.currentGame = gameType;
        
        // Common event listeners
        this.setupCommonListeners();
        
        return window.gameFramework.socket;
    }
    
    static setupCommonListeners() {
        const socket = window.gameFramework.socket;
        
        socket.on('connect', () => {
            console.log('🔗 Connected to server');
        });
        
        socket.on('disconnect', () => {
            console.log('❌ Disconnected from server');
        });
        
        socket.on('error', (error) => {
            console.error('🚨 Socket error:', error);
        });
        
        socket.on('roomJoined', (data) => {
            console.log('🏠 Joined room:', data);
            window.gameFramework.roomId = data.roomId;
            window.gameFramework.playerId = data.playerId;
            window.gameFramework.isHost = data.isHost;
        });
        
        socket.on('playersUpdated', (players) => {
            window.gameFramework.players = players;
            this.updatePlayerList(players);
        });
    }
    
    static updatePlayerList(players) {
        const playerList = document.getElementById('playerList');
        if (!playerList) return;
        
        playerList.innerHTML = '';
        players.forEach((player, index) => {
            const playerDiv = document.createElement('div');
            playerDiv.className = 'player-item';
            playerDiv.innerHTML = `
                <span class="player-name">${player.name}</span>
                <span class="player-team">${player.team || 'No Team'}</span>
                ${player.isBot ? '<span class="bot-indicator">🤖</span>' : ''}
            `;
            playerList.appendChild(playerDiv);
        });
    }
    
    static createRoom(gameType) {
        const socket = window.gameFramework.socket;
        socket.emit('createRoom', { gameType: gameType });
    }
    
    static joinRoom(roomCode) {
        const socket = window.gameFramework.socket;
        socket.emit('joinRoom', { roomCode: roomCode });
    }
    
    static leaveRoom() {
        const socket = window.gameFramework.socket;
        if (socket && window.gameFramework.roomId) {
            socket.emit('leaveRoom', { roomId: window.gameFramework.roomId });
        }
    }
}

// 🎨 UI UTILITIES
class UIUtils {
    static showElement(id) {
        const element = document.getElementById(id);
        if (element) element.style.display = 'block';
    }
    
    static hideElement(id) {
        const element = document.getElementById(id);
        if (element) element.style.display = 'none';
    }
    
    static showMenu() {
        this.showElement('Menu');
        this.hideElement('Game');
    }
    
    static showGame() {
        this.hideElement('Menu');
        this.showElement('Game');
    }
    
    static createButton(text, onClick, className = '') {
        const button = document.createElement('button');
        button.textContent = text;
        button.onclick = onClick;
        if (className) button.className = className;
        return button;
    }
    
    static showPopup(message, duration = 3000) {
        // Create popup element
        const popup = document.createElement('div');
        popup.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #2c3e50, #34495e);
            color: white;
            padding: 20px 30px;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            z-index: 10000;
            font-size: 16px;
            text-align: center;
            border: 2px solid #FFD700;
        `;
        popup.textContent = message;
        
        document.body.appendChild(popup);
        
        // Auto-remove after duration
        setTimeout(() => {
            if (popup.parentNode) {
                popup.parentNode.removeChild(popup);
            }
        }, duration);
        
        return popup;
    }
    
    static showGameMessage(message, type = 'info') {
        const colors = {
            info: '#3498db',
            success: '#2ecc71',
            warning: '#f39c12',
            error: '#e74c3c'
        };
        
        const popup = this.showPopup(message, 4000);
        popup.style.borderColor = colors[type] || colors.info;
        return popup;
    }
}

// 🎮 GAME STATE MANAGEMENT
class GameStateManager {
    static setState(state) {
        window.gameFramework.gameState = state;
        console.log(`🎮 Game state changed to: ${state}`);
    }
    
    static getState() {
        return window.gameFramework.gameState;
    }
    
    static isInLobby() {
        return this.getState() === 'lobby';
    }
    
    static isPlaying() {
        return this.getState() === 'playing';
    }
    
    static isFinished() {
        return this.getState() === 'finished';
    }
}

// 🃏 CARD RENDERING
class CardRenderer {
    static drawCard(x, y, width, height, card, isFaceUp = true) {
        if (!card) return;
        
        if (isFaceUp && card.image) {
            image(card.image, x, y, width, height);
        } else {
            // Draw card back
            const cardBack = CardUtils.getCardBackImage();
            if (cardBack) {
                image(cardBack, x, y, width, height);
            } else {
                // Fallback rectangle
                fill(50, 50, 150);
                stroke(255);
                strokeWeight(2);
                rect(x, y, width, height, 5);
            }
        }
    }
    
    static drawHand(hand, x, y, cardWidth, cardHeight, spacing = 10) {
        if (!hand || hand.length === 0) return;
        
        const totalWidth = (hand.length - 1) * (cardWidth + spacing) + cardWidth;
        const startX = x - totalWidth / 2;
        
        hand.forEach((card, index) => {
            const cardX = startX + index * (cardWidth + spacing);
            this.drawCard(cardX, y, cardWidth, cardHeight, card, true);
        });
    }
    
    static drawCardPile(x, y, width, height, cards, isFaceUp = false) {
        if (!cards || cards.length === 0) return;
        
        // Draw multiple cards with slight offset
        const maxVisible = Math.min(cards.length, 5);
        for (let i = 0; i < maxVisible; i++) {
            const offsetX = i * 2;
            const offsetY = i * 2;
            this.drawCard(x + offsetX, y + offsetY, width, height, cards[i], isFaceUp);
        }
        
        // Show count if more than 5 cards
        if (cards.length > 5) {
            fill(255, 255, 0);
            textAlign(CENTER, CENTER);
            textSize(16);
            text(`+${cards.length - 5}`, x + width/2, y + height/2);
        }
    }
}

// 🎯 GAME SPECIFIC UTILITIES
class GameUtils {
    static getRandomElement(array) {
        return array[Math.floor(Math.random() * array.length)];
    }
    
    static getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    
    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    static formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    static calculateDistance(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    }
}

// 🏠 NAVIGATION
class NavigationManager {
    static goToMainMenu() {
        window.location.href = 'main-menu.html';
    }
    
    static goToGame(gameType) {
        const gameUrls = {
            'truco': 'index.html',
            'poker': 'poker.html',
            'blackjack': 'blackjack.html',
            'hearts': 'hearts.html',
            'spades': 'spades.html',
            'euchre': 'euchre.html',
            'gin-rummy': 'gin-rummy.html',
            'go-fish': 'go-fish.html',
            'war': 'war.html',
            'crazy-eights': 'crazy-eights.html'
        };
        
        const url = gameUrls[gameType];
        if (url) {
            window.location.href = url;
        } else {
            console.error('Unknown game type:', gameType);
        }
    }
    
    static setupBackToMenuButton() {
        const backButton = document.getElementById('backToMainMenuBtn');
        if (backButton) {
            backButton.onclick = () => this.goToMainMenu();
        }
    }
}

// 🎮 INITIALIZATION
class GameFramework {
    static initialize(gameType) {
        console.log(`🎮 Initializing game framework for: ${gameType}`);
        
        // Initialize socket
        SocketManager.initialize(gameType);
        
        // Setup navigation
        NavigationManager.setupBackToMenuButton();
        
        // Load card images
        this.loadCardImages();
        
        // Setup common UI
        this.setupCommonUI();
        
        console.log('✅ Game framework initialized');
    }
    
    static loadCardImages() {
        // Card images should already be loaded by preload.js
        if (window.cardImages) {
            window.gameFramework.cardImages = window.cardImages;
        }
        
        if (window.cardBackImage) {
            window.gameFramework.cardBackImage = window.cardBackImage;
        }
    }
    
    static setupCommonUI() {
        // Add back to menu button if it doesn't exist
        if (!document.getElementById('backToMainMenuBtn')) {
            const backButton = document.createElement('button');
            backButton.id = 'backToMainMenuBtn';
            backButton.textContent = '← Back to Main Menu';
            backButton.style.cssText = `
                position: fixed;
                top: 20px;
                left: 20px;
                z-index: 1000;
                background: linear-gradient(135deg, #e74c3c, #c0392b);
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 14px;
                font-weight: bold;
            `;
            backButton.onclick = () => NavigationManager.goToMainMenu();
            document.body.appendChild(backButton);
        }
    }
}

// Export for use in other files
window.CardUtils = CardUtils;
window.PlayerManager = PlayerManager;
window.SocketManager = SocketManager;
window.UIUtils = UIUtils;
window.GameStateManager = GameStateManager;
window.CardRenderer = CardRenderer;
window.GameUtils = GameUtils;
window.NavigationManager = NavigationManager;
window.GameFramework = GameFramework;
