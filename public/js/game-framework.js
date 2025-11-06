// SHARED GAME FRAMEWORK
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

// CARD UTILITIES
class CardUtils {
    static createStandardDeck() {
        const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
        // Full standard deck with all ranks (2-10, jack, queen, king, ace)
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

// PLAYER MANAGEMENT
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
        
        const selectedBotName = botName || availableNames[0];
        const newBot = this.createPlayer(`bot_${Date.now()}`, selectedBotName, true);
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

// SOCKET COMMUNICATION
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
            console.log('Connected to server');
        });
        
        socket.on('disconnect', () => {
            console.log('ERROR: Disconnected from server');
        });
        
        socket.on('error', (error) => {
            console.error('WARNING: Socket error:', error);
        });
        
        socket.on('roomCreated', (data) => {
            console.log('🎮 GameFramework: Room created event:', data);
            window.gameFramework.roomId = data.roomId || data; // Handle both old and new formats
            window.gameFramework.playerId = data.playerId || socket.id;
            window.gameFramework.isHost = data.isHost || false;
            
            // Add room-created class to hide create/join buttons
            document.body.classList.add('room-created');
            console.log('✅ room-created class added to body');
        });
        
        socket.on('roomJoined', (data) => {
            console.log('Joined room:', data);
            window.gameFramework.roomId = data.roomId || data; // Handle both old and new formats
            window.gameFramework.playerId = data.playerId || socket.id;
            window.gameFramework.isHost = data.isHost || false;
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
                ${player.isBot ? '<span class="bot-indicator">BOT</span>' : ''}
            `;
            playerList.appendChild(playerDiv);
        });
    }
    
    
    static leaveRoom() {
        const socket = window.gameFramework.socket;
        if (socket && window.gameFramework.roomId) {
            socket.emit('leaveRoom', { roomId: window.gameFramework.roomId });
        }
    }
}

// UI UTILITIES
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
        // Move canvas back to Menu div when returning to menu
        const canvas = document.querySelector('canvas');
        const menuDiv = document.getElementById('Menu');
        if (canvas && menuDiv) {
            try {
                // ✅ CRITICAL FIX: Use DOM appendChild instead of p5.js parent() method
                if (canvas.parentNode) {
                    canvas.parentNode.removeChild(canvas);
                }
                menuDiv.appendChild(canvas);
                console.log('✅ Canvas moved back to Menu div');
            } catch (error) {
                console.error('❌ Error moving canvas to Menu div:', error);
            }
        }
        
        this.showElement('Menu');
        this.hideElement('Game');
    }
    
    static showGame() {
        // Move canvas to Game div before hiding Menu to keep it clickable
        const canvas = document.querySelector('canvas');
        const gameDiv = document.getElementById('Game');
        if (canvas && gameDiv) {
            try {
                // ✅ CRITICAL FIX: Use DOM appendChild instead of p5.js parent() method
                if (canvas.parentNode) {
                    canvas.parentNode.removeChild(canvas);
                }
                gameDiv.appendChild(canvas);
                console.log('✅ Canvas moved to Game div for gameplay');
            } catch (error) {
                console.error('❌ Error moving canvas to Game div:', error);
            }
        }
        
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
    
    static showPopup(message, duration = 4000) { // ✅ UI FIX: 4 seconds for better visibility
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
        
        // Add message to queue
        this.messageQueue.push({ message, type, colors });
        
        // Process queue if not already processing
        if (!this.processingQueue) {
            this.processMessageQueue();
        }
    }
    
    static processMessageQueue() {
        if (this.messageQueue.length === 0) {
            this.processingQueue = false;
            return;
        }
        
        this.processingQueue = true;
        const { message, type, colors } = this.messageQueue.shift();
        
        const popup = this.showPopup(message, 4000); // 4 seconds duration
        popup.style.borderColor = colors[type] || colors.info;
        
        // Process next message after current one finishes
        setTimeout(() => {
            this.processMessageQueue();
        }, 4500); // 4.5 seconds delay between messages
    }
    
    static messageQueue = [];
    static processingQueue = false;
}

// GAME STATE MANAGEMENT
class GameStateManager {
    static setState(state) {
        window.gameFramework.gameState = state;
        console.log(`Game state changed to: ${state}`);
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

// CARD RENDERING
class CardRenderer {
    static drawCard(x, y, width, height, card, isFaceUp = true, options = {}) {
        if (!card) return;
        
        const {
            shadowOffset = 4,
            shadowOpacity = 100,
            borderWidth = 2,
            cornerRadius = 8,
            highlight = false
        } = options;
        
        push();
        
        // Draw card shadow with enhanced depth
        fill(0, 0, 0, shadowOpacity);
        noStroke();
        rect(x + shadowOffset, y + shadowOffset, width, height, cornerRadius);
        
        // Draw card background with gradient effect
        fill(255);
        stroke(0);
        strokeWeight(borderWidth);
        rect(x, y, width, height, cornerRadius);
        
        // Add highlight effect if specified
        if (highlight) {
            fill(255, 255, 0, 30);
            noStroke();
            rect(x, y, width, height, cornerRadius);
        }
        
        // Check if card name is 'back' or if we should show card back (face down)
        const cardNameLower = card.name ? card.name.toLowerCase() : '';
        const shouldDrawCardBack = !isFaceUp || cardNameLower === 'back';
        
        if (!shouldDrawCardBack && card.name) {
            // Try to draw actual card image with proper name mapping
            const imageName = card.name.toLowerCase().replace(/\s+/g, '_');
            
            if (typeof cardImages !== 'undefined' && cardImages[imageName] && cardImages[imageName].width > 0) {
                // Draw image with proper scaling and centering
                imageMode(CORNER);
                image(cardImages[imageName], x, y, width, height);
            } else {
                // Enhanced fallback to text with better styling
                fill(0);
                textAlign(CENTER, CENTER);
                textSize(Math.max(10, width * 0.15));
                textStyle(BOLD);
                
                // Draw text with shadow
                fill(0, 0, 0, 150);
                text(card.name, x + width/2 + 1, y + height/2 + 1);
                fill(0);
                text(card.name, x + width/2, y + height/2);
            }
        } else {
            // Draw card back image with enhanced styling
            // Always try to draw card back, even if image hasn't loaded yet (will use fallback)
            if (typeof window.cardBackImage !== 'undefined' && window.cardBackImage && 
                window.cardBackImage.width !== undefined && window.cardBackImage.width > 0) {
                imageMode(CORNER);
                image(window.cardBackImage, x, y, width, height);
            } else {
                // Enhanced fallback with pattern (always show something for card back)
                fill(0, 0, 150);
                stroke(255, 255, 255);
                strokeWeight(1);
                rect(x, y, width, height, cornerRadius);
                
                // Draw pattern
                fill(255, 255, 255, 100);
                for (let i = 0; i < 3; i++) {
                    for (let j = 0; j < 3; j++) {
                        ellipse(x + width/4 + i * width/4, y + height/4 + j * height/4, 4, 4);
                    }
                }
                
                textAlign(CENTER, CENTER);
                textSize(Math.max(12, width * 0.2));
                textStyle(BOLD);
                fill(255);
                text('?', x + width/2, y + height/2);
            }
        }
        
        pop();
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

// GAME SPECIFIC UTILITIES
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
            'spades': 'spades.html',
            'euchre': 'euchre.html',
            'gin-rummy': 'gin-rummy.html',
            'go-fish': 'go-fish.html',
            'war': 'war.html',
            'prince-of-persia': 'prince-of-persia.html'
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

// INITIALIZATION
class GameFramework {
    static initialize(gameType) {
        console.log(`Initializing game framework for: ${gameType}`);
        
        // Initialize socket
        SocketManager.initialize(gameType);
        
        // Setup navigation
        NavigationManager.setupBackToMenuButton();
        
        // Load card images
        this.loadCardImages();
        
        // Setup common UI
        this.setupCommonUI();
        
        console.log('SUCCESS: Game framework initialized');
        console.log('DEBUG: GameFramework class:', GameFramework);
        console.log('DEBUG: GameFramework.createRoom:', GameFramework.createRoom);
        console.log('DEBUG: window.gameFramework:', window.gameFramework);
        console.log('DEBUG: window.gameFramework.socket:', window.gameFramework?.socket);
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
    
    static createRoom(gameType) {
        if (!window.gameFramework) {
            console.error('❌ window.gameFramework not initialized');
            return;
        }
        
        const socket = window.gameFramework.socket;
        if (!socket) {
            console.error('❌ Socket not available for createRoom');
            console.error('DEBUG: window.gameFramework:', window.gameFramework);
            return;
        }
        
        if (!socket.connected) {
            console.error('❌ Socket not connected');
            socket.once('connect', () => {
                console.log('✅ Socket connected, retrying createRoom');
                this.createRoom(gameType);
            });
            return;
        }
        
        console.log('🎮 Creating room for game type:', gameType);
        console.log('🎮 Socket connected:', socket.connected);
        console.log('🎮 Socket ID:', socket.id);
        socket.emit('createRoom', { gameType: gameType });
        console.log('🎮 createRoom event emitted');
    }
    
    static joinRoom(roomCode) {
        const socket = window.gameFramework.socket;
        if (!socket) {
            console.error('❌ Socket not available for joinRoom');
            return;
        }
        console.log('🎮 Joining room:', roomCode);
        socket.emit('joinRoom', { roomCode: roomCode });
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
// 🎮 MISSING FUNCTIONS FOR NEW GAMES
// Make showInstructions globally available
window.showInstructions = function showInstructions() {
    console.log('📖 Instructions button clicked');
    
    const currentGame = window.location.pathname;
    let instructions = '';
    
    switch(currentGame) {
        case '/truco':
        case '/':
            instructions = `TRUCO GAME RULES:

🎯 OBJECTIVE: Be the first team to win 12 games (1 set)

🃏 CARD VALUES (High to Low):
• Manilhas: 4 of Clubs, 7 of Hearts, Ace of Spades, 7 of Diamonds
• Regular cards: King, Queen, Jack, 10, 9, 8, 6, 5, 4, 3, 2

⚔️ GAMEPLAY:
• 4 players (2 teams of 2)
• Each player gets 3 cards
• Players take turns playing cards
• Highest card wins the trick
• Team that wins 2 tricks wins the game

🔥 TRUCO CALLS:
• "Truco" = 3 games, "6" = 6 games, "9" = 9 games, "12" = 12 games
• Opposing team can accept, raise, or reject
• If rejected, calling team wins the current value`;
            break;
            
        case '/poker':
            instructions = `TEXAS HOLD'EM POKER RULES:

🎯 OBJECTIVE: Win chips by having the best hand or making others fold

🃏 HAND RANKINGS (High to Low):
• Royal Flush: A-K-Q-J-10 of same suit
• Straight Flush: 5 consecutive cards of same suit
• Four of a Kind: 4 cards of same rank
• Full House: 3 of a kind + pair
• Flush: 5 cards of same suit
• Straight: 5 consecutive cards
• Three of a Kind: 3 cards of same rank
• Two Pair: 2 different pairs
• One Pair: 2 cards of same rank
• High Card: Highest single card

⚔️ GAMEPLAY:
• Each player gets 2 hole cards
• 5 community cards are dealt face up
• Betting rounds: Pre-flop, Flop, Turn, River
• Make best 5-card hand from 7 available cards`;
            break;
            
        case '/blackjack':
            instructions = `BLACKJACK RULES:

🎯 OBJECTIVE: Get as close to 21 as possible without going over

🃏 CARD VALUES:
• Aces = 1 or 11 (your choice)
• Face cards (J, Q, K) = 10
• Number cards = face value

⚔️ GAMEPLAY:
• Dealer gives 2 cards to each player
• Players can Hit (take another card) or Stand (keep current hand)
• Dealer must hit on 16 or less, stand on 17 or more
• Closest to 21 without going over wins
• Blackjack (21 with 2 cards) beats other 21s

🎲 SPECIAL ACTIONS:
• Double Down: Double your bet, take exactly 1 more card
• Split: If you have 2 cards of same rank, split into 2 hands
• Insurance: Bet half your wager if dealer shows Ace`;
            break;
            
        case '/go-fish':
            instructions = `GO FISH RULES:

🎯 OBJECTIVE: Collect the most sets of 4 matching cards

🃏 CARD VALUES:
• All cards have equal value
• Sets are 4 cards of same rank (e.g., 4 Kings)

⚔️ GAMEPLAY:
• 2-6 players, 7 cards each (5 if 5+ players)
• On your turn, ask any player for cards of a specific rank
• If they have any, they must give you all cards of that rank
• If they don't have any, say "Go Fish!" and draw from deck
• If you get the 4th card of a set, place the set down
• Game ends when someone runs out of cards

🏆 WINNING:
• Count your completed sets
• Player with most sets wins`;
            break;
            
        case '/war':
            instructions = `WAR CARD GAME RULES:

🎯 OBJECTIVE: Win all the cards in the deck by winning battles

🃏 CARD VALUES (High to Low):
• Ace (14) - Highest value
• King (13), Queen (12), Jack (11)
• 10, 9, 8, 7, 6, 5, 4, 3, 2 (2 = Lowest)

⚔️ GAMEPLAY:
• 2-4 players supported
• Deck is shuffled and divided equally among players
• Each player starts with their portion of the deck
• Players take turns clicking "⚔️ BATTLE!" to start a battle

⚔️ BATTLE RULES:
• Each player plays their top card face up
• Player with the highest card wins the battle
• Winner collects all cards from the battle
• Winner shuffles their collected cards and adds them to the bottom of their deck
• Cards are played in order with animations for visibility

⚔️ WAR RULES (When Cards Tie):
• When multiple players tie with the same card value, WAR begins!
• Each tied player places 3 cards face down
• Then each tied player flips 1 card face up
• Player with the highest face-up card wins ALL the war cards
• If there's still a tie, another WAR begins with the tied players
• War continues until one player has the highest card

📊 BATTLE HISTORY:
• View detailed battle history in the bottom-right corner
• See which cards were played and why each player won
• Battle history shows card values and comparisons

🏆 WINNING:
• First player to collect all cards in the deck wins the game
• Game ends when one player has all cards or others run out`;
            break;
            
        case '/prince-of-persia':
            instructions = `PRINCE OF PERSIA - CLASSIC PLATFORMER:

👑 THE ORIGINAL CLASSIC (1989)

⚔️ CONTROLS:
• Arrow Keys: Move left/right
• Up Arrow: Jump
• Spacebar: Draw sword / Attack
• Run, jump, and fight through the palace

🎯 OBJECTIVE:
• Navigate through dangerous levels
• Defeat guards and avoid traps
• Save the princess within the time limit!

🏰 CLASSIC GAMEPLAY:
• Precision platforming
• Sword fighting mechanics
• Time pressure
• The original Prince of Persia experience`;
            break;
            
        default:
            instructions = 'Instructions for this game are not available yet.';
    }
    
    showCustomInstructionsPopup(instructions);
}

function showCustomInstructionsPopup(instructions) {
    // Remove any existing instructions popup
    const existingPopup = document.getElementById('customInstructionsPopup');
    if (existingPopup) {
        existingPopup.remove();
    }
    
    // Create popup container
    const popupContainer = document.createElement('div');
    popupContainer.id = 'customInstructionsPopup';
    popupContainer.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #2c3e50, #34495e);
        color: white;
        padding: 30px;
        border-radius: 15px;
        box-shadow: 0 15px 40px rgba(0,0,0,0.7);
        z-index: 10000;
        font-family: 'Arial', sans-serif;
        max-width: 600px;
        max-height: 80vh;
        overflow-y: auto;
        border: 3px solid #FFD700;
        animation: fadeInScale 0.3s ease-out;
    `;
    
    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeInScale {
            from {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.8);
            }
            to {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1);
            }
        }
    `;
    document.head.appendChild(style);
    
    // Create title
    const title = document.createElement('div');
    title.textContent = '📖 Game Instructions';
    title.style.cssText = `
        font-size: 24px;
        font-weight: bold;
        color: #FFD700;
        text-align: center;
        margin-bottom: 20px;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
    `;
    
    // Create content area
    const content = document.createElement('div');
    content.style.cssText = `
        font-size: 14px;
        line-height: 1.6;
        white-space: pre-line;
        margin-bottom: 20px;
    `;
    content.textContent = instructions;
    
    // Create close button
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.style.cssText = `
        background: linear-gradient(135deg, #e74c3c, #c0392b);
        color: white;
        border: none;
        padding: 12px 25px;
        border-radius: 8px;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        transition: all 0.3s ease;
        display: block;
        margin: 0 auto;
    `;
    
    // Add hover effect
    closeButton.addEventListener('mouseenter', () => {
        closeButton.style.transform = 'scale(1.05)';
        closeButton.style.boxShadow = '0 8px 20px rgba(0,0,0,0.4)';
    });
    closeButton.addEventListener('mouseleave', () => {
        closeButton.style.transform = 'scale(1)';
        closeButton.style.boxShadow = '0 5px 15px rgba(0,0,0,0.3)';
    });
    
    // Close popup when button is clicked
    closeButton.addEventListener('click', () => {
        popupContainer.remove();
        style.remove();
    });
    
    // Close popup when clicking outside
    popupContainer.addEventListener('click', (e) => {
        if (e.target === popupContainer) {
            popupContainer.remove();
            style.remove();
        }
    });
    
    // Assemble popup
    popupContainer.appendChild(title);
    popupContainer.appendChild(content);
    popupContainer.appendChild(closeButton);
    document.body.appendChild(popupContainer);
}

function closeInstructions() {
    console.log('❌ Close instructions clicked');
    // For new games, this is handled by the alert
}

function showCardValues() {
    console.log('🃏 Card values button clicked');
    
    const currentGame = window.location.pathname;
    
    // Only show card values for Truco game
    if (currentGame === '/truco' || currentGame === '/') {
        const cardValues = `TRUCO CARD VALUES:

🃏 CARD HIERARCHY (High to Low):

• MANILHAS (Highest):
  - 4 of Clubs (Zap)
  - 7 of Hearts (Copas) 
  - Ace of Spades (Espadilha)
  - 7 of Diamonds (Ouros)

• REGULAR CARDS:
  - King, Queen, Jack, 10, 9, 8, 6, 5, 4, 3, 2

🎯 SPECIAL RULES:
• Manilhas always beat regular cards
• Among manilhas, the order is: Zap > Copas > Espadilha > Ouros
• Among regular cards, higher rank beats lower rank
• Suit doesn't matter for regular cards, only rank`;
        
        showCustomInstructionsPopup(cardValues);
    } else {
        // For other games, just show a message that card values are in instructions
        showCustomInstructionsPopup(`CARD VALUES:

This game doesn't have a separate card values system.

Please check the game instructions for specific card values and rules.`);
    }
}

function closeCardValues() {
    console.log('❌ Close card values clicked');
    // For new games, this is handled by the alert
}

function closePopup() {
    console.log('❌ Close popup clicked');
    // For new games, this is handled by the alert
}

window.PlayerManager = PlayerManager;
window.SocketManager = SocketManager;
window.UIUtils = UIUtils;
window.GameStateManager = GameStateManager;
window.CardRenderer = CardRenderer;
window.GameUtils = GameUtils;
window.NavigationManager = NavigationManager;
window.GameFramework = GameFramework;


