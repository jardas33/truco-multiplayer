// 🐟 GO FISH GAME LOGIC


class GoFishGame {
    constructor() {
        this.deck = [];
        this.players = [];
        this.currentPlayer = 0;
        this.gamePhase = 'playing'; // playing, finished
        this.pond = [];
        this.pairs = [];
        this.gameOver = false;
        this.winner = null;
        this.gameHistory = []; // Array to store game actions
        this.maxHistoryEntries = 20; // Maximum number of history entries to display
    }
    
    // Add entry to game history
    addToHistory(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const entry = {
            message: message,
            type: type, // 'info', 'success', 'warning', 'error'
            timestamp: timestamp
        };
        
        this.gameHistory.unshift(entry); // Add to beginning of array
        
        // Keep only the latest entries
        if (this.gameHistory.length > this.maxHistoryEntries) {
            this.gameHistory = this.gameHistory.slice(0, this.maxHistoryEntries);
        }
    }

    // Initialize the game
    initialize(players) {
        console.log('🐟 Go Fish: Initializing game with players:', players);
        
        this.players = players.map((player, index) => ({
            ...player,
            hand: player.hand || [], // Use existing hand if provided
            pairs: player.pairs || 0,
            overallWins: player.overallWins || 0, // Initialize overall wins
            position: index,
            isBot: player.name.toLowerCase().includes('bot') || player.isBot || false // Detect bots by name or explicit property
        }));
        
        this.deck = CardUtils.createStandardDeck();
        this.pond = [];
        this.pairs = [];
        this.gamePhase = 'playing';
        this.currentPlayer = 0;
        this.gameOver = false;
        this.winner = null;
        
        console.log('🐟 Go Fish game initialized with', this.players.length, 'players');
        
        // Set game state to Playing
        this.state = 'playing';
        if (typeof gameStateEnum !== 'undefined') {
            gameState = gameStateEnum.Playing;
            window.gameState = gameStateEnum.Playing;
        }
        
        // Set global game instance
        window.game = this;
        
        this.startNewGame();
        
        console.log('🐟 Go Fish: Game state after initialization:', {
            players: this.players.length,
            deck: this.deck.length,
            pond: this.pond.length,
            currentPlayer: this.currentPlayer
        });
    }

    // Start a new game
    startNewGame() {
        console.log('🎯 Starting new Go Fish game');
        
        // Check if hands are already provided by server
        const hasHandsFromServer = this.players.some(player => player.hand && player.hand.length > 0);
        
        if (hasHandsFromServer) {
            // Hands already provided by server, just reset pairs
            console.log('🐟 Using hands provided by server');
            this.players.forEach(player => {
                player.pairs = 0;
            });
        } else {
            // Reset all hands and pairs
            this.players.forEach(player => {
                player.hand = [];
                player.pairs = 0;
            });
            
            // Create fresh deck and shuffle
            this.deck = CardUtils.createStandardDeck();
            this.deck = CardUtils.shuffleDeck(this.deck);
            
            // Deal cards
            this.dealCards();
        }
        
        // Only reset pond if not provided by server
        if (!hasHandsFromServer) {
            this.pond = [];
        }
        this.pairs = [];
        this.gameOver = false;
        this.winner = null;
        
        // Pair detection is now handled by the server
        
        this.emitEvent('gameStarted', {
            players: this.players.map(p => ({ name: p.name, hand: p.hand, pairs: p.pairs })),
            pond: this.pond,
            currentPlayer: this.currentPlayer
        });
        
        // Log game start
        this.addToHistory(`🎮 Game started with ${this.players.length} players`, 'info');
        this.addToHistory(`🎯 ${this.players[this.currentPlayer].name} goes first`, 'info');
        
        // Start periodic game over check
        this.startGameOverCheck();
        
        // Check if it's the local player's turn
        const currentPlayer = this.players[this.currentPlayer];
        if (this.isMyTurn) {
            console.log(`👤 ${currentPlayer.name} is a human player - waiting for input`);
        } else {
            console.log(`👤 Waiting for ${currentPlayer.name}'s turn`);
        }
    }
    
    // Start periodic game over check - now handled by server
    startGameOverCheck() {
        // Game over detection is now handled by the server
        console.log('🔍 Game over detection is now handled by the server');
    }

    // Deal cards to all players
    dealCards() {
        // Deal 5 cards to each player (or 7 if 2 players)
        const cardsPerPlayer = this.players.length === 2 ? 7 : 5;
        
        for (let i = 0; i < cardsPerPlayer; i++) {
            for (let player of this.players) {
                if (this.deck.length > 0) {
                    const card = this.deck.pop();
                    player.hand.push(card);
                } else {
                    console.error(`❌ Deck empty! Cannot deal card ${i+1} to ${player.name}`);
                }
            }
        }
        
        // Remaining cards go to pond
        this.pond = [...this.deck];
        this.deck = [];
    }

    // Check for pairs in a player's hand
    checkForPairs(player) {
        // Skip automatic pair detection for human players (they can make pairs manually)
        if (!player.isBot) {
            console.log(`🎯 Skipping automatic pair detection for human player ${player.name}`);
            return;
        }
        
        const rankCounts = {};
        
        // Count cards by rank
        player.hand.forEach(card => {
            rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
        });
        
        // Remove pairs
        Object.keys(rankCounts).forEach(rank => {
            const count = rankCounts[rank];
            const pairs = Math.floor(count / 2);
            
            if (pairs > 0) {
                // Remove pairs from hand
                let removed = 0;
                player.hand = player.hand.filter(card => {
                    if (card.rank === rank && removed < pairs * 2) {
                        removed++;
                        return false;
                    }
                    return true;
                });
                
                // Add to pairs count
                player.pairs += pairs;
                
                console.log(`🎯 ${player.name} found ${pairs} pair(s) of ${rank}s`);
                
                // Log pair found
                this.addToHistory(`🎯 ${player.name} found ${pairs} pair(s) of ${rank}s!`, 'success');
                
                // Show pair found message
                this.showGameMessage(`${player.name} found ${pairs} pair(s) of ${rank}s!`, 2000);
            }
        });
    }
    
    // Manual pair making for human player
    makePairManually(card1, card2, playerIndex = 0) {
        if (!card1 || !card2) return false;
        if (card1.rank !== card2.rank) return false;
        
        const humanPlayer = this.players[playerIndex];
        if (!humanPlayer) return false;
        
        // Remove both cards from hand
        const card1Index = humanPlayer.hand.findIndex(card => card === card1);
        const card2Index = humanPlayer.hand.findIndex(card => card === card2);
        
        if (card1Index === -1 || card2Index === -1) return false;
        
        humanPlayer.hand.splice(Math.max(card1Index, card2Index), 1);
        humanPlayer.hand.splice(Math.min(card1Index, card2Index), 1);
        
        // Add to pairs count
        humanPlayer.pairs += 1;
        
        console.log(`🎯 Human player made a pair of ${card1.rank}s manually`);
        
        // Add to game history
        this.addToHistory(`🎯 You made a pair of ${card1.rank}s!`, 'success');
        
        // Emit to server to update other players
        if (window.gameFramework && window.gameFramework.socket) {
            const socket = window.gameFramework.socket;
            socket.emit('makePair', {
                roomId: window.gameFramework.roomId,
                playerIndex: playerIndex,
                rank: card1.rank
            });
        }
        
        // Log pair found
        this.addToHistory(`🎯 You made a pair of ${card1.rank}s!`, 'success');
        
        // Show pair found message
        this.showGameMessage(`🎉 You made a pair of ${card1.rank}s!`, 2000);
        
        return true;
    }

    // Old askForCards method removed - now handled by server

    // Old goFish method removed - now handled by server
    
    // Trigger fishing visual effect
    triggerFishingEffect() {
        // Create fishing splash effect
        const splash = document.createElement('div');
        splash.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 100px;
            height: 100px;
            background: radial-gradient(circle, rgba(0, 150, 255, 0.8) 0%, rgba(0, 100, 200, 0.4) 50%, transparent 100%);
            border-radius: 50%;
            z-index: 999;
            pointer-events: none;
            animation: splashEffect 1.5s ease-out forwards;
        `;
        
        // Add splash animation keyframes
        if (!document.getElementById('splash-animation')) {
            const style = document.createElement('style');
            style.id = 'splash-animation';
            style.textContent = `
                @keyframes splashEffect {
                    0% {
                        transform: translate(-50%, -50%) scale(0);
                        opacity: 1;
                    }
                    50% {
                        transform: translate(-50%, -50%) scale(1.5);
                        opacity: 0.8;
                    }
                    100% {
                        transform: translate(-50%, -50%) scale(3);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(splash);
        
        // Remove splash after animation
        setTimeout(() => {
            if (splash.parentNode) {
                splash.parentNode.removeChild(splash);
            }
        }, 1500);
        
        // Create water ripples
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                const ripple = document.createElement('div');
                ripple.style.cssText = `
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 20px;
                    height: 20px;
                    border: 2px solid rgba(0, 150, 255, 0.6);
                    border-radius: 50%;
                    z-index: 998;
                    pointer-events: none;
                    animation: rippleEffect 1s ease-out forwards;
                `;
                
                document.body.appendChild(ripple);
                
                setTimeout(() => {
                    if (ripple.parentNode) {
                        ripple.parentNode.removeChild(ripple);
                    }
                }, 1000);
            }, i * 200);
        }
        
        // Add ripple animation keyframes
        if (!document.getElementById('ripple-animation')) {
            const style = document.createElement('style');
            style.id = 'ripple-animation';
            style.textContent = `
                @keyframes rippleEffect {
                    0% {
                        transform: translate(-50%, -50%) scale(0);
                        opacity: 1;
                    }
                    100% {
                        transform: translate(-50%, -50%) scale(4);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    // End current player's turn
    endTurn() {
        console.log(`🔄 Ending turn for ${this.players[this.currentPlayer].name}`);
        console.log(`🔄 Current player hand:`, this.players[this.currentPlayer].hand.map(card => card.name));
        console.log(`🔄 Current player pairs:`, this.players[this.currentPlayer].pairs);
        
        // Check if game is over
        if (this.isGameOver()) {
            console.log(`🏆 Game is over! All players have empty hands and pond is empty.`);
            this.endGame();
            return;
        }
        
        // Move to next player
        this.currentPlayer = (this.currentPlayer + 1) % this.players.length;
        
        // Handle players with empty hands
        while (this.players[this.currentPlayer].hand.length === 0 && !this.isGameOver()) {
            const currentPlayer = this.players[this.currentPlayer];
            console.log(`🔄 ${currentPlayer.name} has no cards - going fishing`);
            this.addToHistory(`🔄 ${currentPlayer.name} has no cards - going fishing`, 'info');
            
            // Send go fish request to server
            if (window.gameFramework && window.gameFramework.socket) {
                const socket = window.gameFramework.socket;
                socket.emit('goFish', {
                    roomId: window.gameFramework.roomId,
                    playerIndex: this.currentPlayer
                });
            }
            return; // Server will handle turn progression
        }
        
        // Log turn change
        console.log(`🔄 Turn changed to ${this.players[this.currentPlayer].name}`);
        this.addToHistory(`🔄 ${this.players[this.currentPlayer].name}'s turn`, 'info');
        
        this.emitEvent('turnChanged', {
            currentPlayer: this.currentPlayer,
            players: this.players.map(p => ({ name: p.name, hand: p.hand, pairs: p.pairs }))
        });
        
        // Check if it's the local player's turn
        const currentPlayer = this.players[this.currentPlayer];
        if (this.isMyTurn) {
            console.log(`👤 ${currentPlayer.name} is a human player - waiting for input`);
        } else {
            console.log(`👤 Waiting for ${currentPlayer.name}'s turn`);
        }
    }
    
    // Bot AI logic - now handled by server
    botPlay() {
        // Bots are now handled by the server-side handleGoFishBotTurn function
        console.log('🤖 Bot logic is now handled by the server');
    }
    
    // Show game message popup
    showGameMessage(message, duration = 2000) {
        // Remove existing message
        const existingMessage = document.getElementById('game-message');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        // Create new message
        const messageDiv = document.createElement('div');
        messageDiv.id = 'game-message';
        messageDiv.style.cssText = `
            position: fixed;
            top: 60%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 140, 0, 0.95);
            color: white;
            padding: 20px 30px;
            border-radius: 10px;
            border: 2px solid #ff8c00;
            font-size: 18px;
            font-weight: bold;
            text-align: center;
            z-index: 1000;
            box-shadow: 0 4px 20px rgba(255, 140, 0, 0.3);
            max-width: 400px;
            word-wrap: break-word;
        `;
        messageDiv.textContent = message;
        
        document.body.appendChild(messageDiv);
        
        // Auto-remove after duration
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, duration);
    }

    // Check if game is over
    isGameOver() {
        // Game is over when all players have empty hands AND pond is empty
        const allPlayersEmpty = this.players.every(player => player.hand.length === 0);
        const pondEmpty = this.pond.length === 0;
        
        console.log(`🔍 Game over check: allPlayersEmpty=${allPlayersEmpty}, pondEmpty=${pondEmpty}`);
        
        return allPlayersEmpty && pondEmpty;
    }

    // End the game
    endGame() {
        console.log('🏆 Game over!');
        this.gameOver = true;
        
        // Clear the game over check interval
        if (this.gameOverCheckInterval) {
            clearInterval(this.gameOverCheckInterval);
            this.gameOverCheckInterval = null;
        }
        
        // Find winner (most pairs)
        this.winner = this.players.reduce((max, player) => 
            player.pairs > max.pairs ? player : max
        );
        
        // Increment overall wins for the winner
        this.winner.overallWins = (this.winner.overallWins || 0) + 1;
        console.log(`🏆 ${this.winner.name} wins! Total wins: ${this.winner.overallWins}`);
        
        // Log game end
        this.addToHistory(`🏆 ${this.winner.name} wins the game with ${this.winner.pairs} pairs!`, 'success');
        this.addToHistory(`🎮 Game Over! ${this.winner.name} now has ${this.winner.overallWins} total wins`, 'info');
        
        // ✅ WINNER ANNOUNCEMENT POPUP
        this.showGameMessage(`🏆 ${this.winner.name} wins with ${this.winner.pairs} pairs!`, 4000);
        
        this.emitEvent('gameOver', {
            winner: {
                name: this.winner.name,
                pairs: this.winner.pairs,
                overallWins: this.winner.overallWins
            },
            finalScores: this.players.map(p => ({ name: p.name, pairs: p.pairs, overallWins: p.overallWins }))
        });
        
        // ✅ AUTO-START NEW GAME: Start a new game after 5 seconds
        setTimeout(() => {
            console.log('🔄 Auto-starting new Go Fish game...');
            this.addToHistory('🔄 Starting new game in 5 seconds...', 'info');
            this.startNewGame();
        }, 5000);
    }

    // Get available ranks for a player
    getAvailableRanks(playerIndex) {
        console.log('🎯 getAvailableRanks called for playerIndex:', playerIndex);
        const player = this.players[playerIndex];
        if (!player) {
            console.log('🎯 No player found for index:', playerIndex);
            return [];
        }
        
        console.log('🎯 Player hand:', player.hand);
        const ranks = [...new Set(player.hand.map(card => card.rank))];
        console.log('🎯 Available ranks result:', ranks.sort());
        return ranks.sort();
    }

    // Get available target players
    getAvailableTargets(playerIndex) {
        console.log('🎯 getAvailableTargets called for playerIndex:', playerIndex);
        console.log('🎯 All players:', this.players.map((p, i) => ({ index: i, name: p.name, handLength: p.hand ? p.hand.length : 'undefined', isBot: p.isBot })));
        
        const targets = this.players
            .map((player, index) => ({ player, index }))
            .filter(({ player, index }) => {
                const isValid = index !== playerIndex && player.hand && player.hand.length > 0;
                console.log(`🎯 Player ${index} (${player.name}): handLength=${player.hand ? player.hand.length : 'undefined'}, isBot=${player.isBot}, isValid=${isValid}`);
                return isValid;
            })
            .map(({ player, index }) => ({ name: player.name, index }));
        
        console.log('🎯 Available targets result:', targets);
        return targets;
    }

    // Emit event to server
    emitEvent(eventName, data) {
        if (window.gameFramework && window.gameFramework.socket && window.gameFramework.roomId) {
            // Extract room code from window.gameFramework.roomId (could be object or string)
            const roomCode = typeof window.gameFramework.roomId === 'object' ? 
                window.gameFramework.roomId.roomId : 
                window.gameFramework.roomId;
            
            window.gameFramework.socket.emit(eventName, {
                roomId: roomCode,
                ...data
            });
        } else {
            console.log(`📡 Event ${eventName} not emitted - no room or socket available`);
        }
    }

    // Get game state for client
    getGameState() {
        return {
            players: this.players,
            currentPlayer: this.currentPlayer,
            gamePhase: this.gamePhase,
            pond: this.pond,
            gameOver: this.gameOver,
            winner: this.winner
        };
    }
}

// Global variables for drag and drop
window.draggedCard = null;
window.dragOffset = { x: 0, y: 0 };

// Centralized function to get player display name from local player's perspective
function getPlayerDisplayName(playerIndex, player) {
    if (!window.game || window.game.localPlayerIndex === undefined) {
        return player.name; // Fallback if game not fully initialized
    }
    
    if (playerIndex === window.game.localPlayerIndex) {
        return `${player.name} (You)`; // Show player name with (You) indicator
    } else {
        return player.name; // Use the actual name from the server (e.g., "Player 1", "Player 2", "Bot 3")
    }
}
window.pairMakingArea = { cards: [] };

// 🎮 GO FISH CLIENT LOGIC
class GoFishClient {
    constructor() {
        this.game = new GoFishGame();
        this.localPlayerIndex = 0;
        this.isMyTurn = false;
        this.canAct = false;
        this.isActing = false; // Track if player is in middle of an action (fishing, asking, etc.)
        this.currentTargetIndex = 0; // Track selected target
        this.currentRankIndex = 0;   // Track selected rank
    }

    // Initialize the client
    initialize() {
        console.log('🎮 Initializing Go Fish client');
        
        // Check if dependencies are available
        console.log('🔍 Checking dependencies:');
        console.log('  - GameFramework:', typeof GameFramework);
        console.log('  - CardUtils:', typeof CardUtils);
        console.log('  - UIUtils:', typeof UIUtils);
        console.log('  - window.gameFramework:', typeof window.gameFramework);
        
        // Initialize game framework
        if (typeof GameFramework !== 'undefined') {
            GameFramework.initialize('go-fish');
            console.log('✅ GameFramework initialized');
        } else {
            console.error('❌ GameFramework not available');
        }
        
        // Setup UI event listeners
        this.setupUI();
        
        // Setup socket event listeners
        this.setupSocketListeners();
        
        console.log('✅ Go Fish client initialized');
    }

    // Setup UI event listeners
    setupUI() {
        // Room controls
        const createBtn = document.getElementById('createRoomBtn');
        const joinBtn = document.getElementById('joinRoomBtn');
        
        if (createBtn) {
            createBtn.onclick = () => this.createRoom();
        }
        
        if (joinBtn) {
            joinBtn.onclick = () => this.joinRoom();
        }
        
        document.getElementById('addBotBtn').onclick = () => this.addBot();
        document.getElementById('removeBotBtn').onclick = () => this.removeBot();
        document.getElementById('startGameBtn').onclick = () => this.emitStartGame();
        
        // Game controls - using p5.js buttons instead of HTML buttons
        
        // Copy room code
        document.getElementById('copyRoomCodeBtn').onclick = () => this.copyRoomCode();
        
        // Nickname change
        const changeNicknameBtn = document.getElementById('changeNicknameBtn');
        if (changeNicknameBtn) {
            changeNicknameBtn.onclick = () => this.changeNickname();
        }
    }

    // Setup socket event listeners
    setupSocketListeners() {
        console.log('🔍 Setting up socket listeners...');
        console.log('🔍 window.gameFramework:', window.gameFramework);
        console.log('🔍 window.gameFramework.socket:', window.gameFramework?.socket);
        
        if (!window.gameFramework || !window.gameFramework.socket) {
            console.error('❌ No socket available! window.gameFramework.socket is undefined');
            return;
        }
        
        const socket = window.gameFramework.socket;
        
        // Debug: Log all socket events
        socket.onAny((eventName, ...args) => {
            console.log('🔍 Socket event received:', eventName, args);
        });
        
        // Add comprehensive socket debugging
        console.log('🔍 Socket connection status:', socket.connected);
        console.log('🔍 Socket ID:', socket.id);
        console.log('🔍 Socket transport:', socket.io.engine.transport.name);
        
        // Test socket communication immediately
        socket.emit('test', { message: 'Client socket test' });
        
        // Add test event listener
        socket.on('test', (data) => {
            console.log('🔍 Test event received from server:', data);
        });
        
        socket.on('roomCreated', (data) => {
            console.log('🏠 Room created:', data);
            const roomCode = data.roomId || data; // Handle both old and new formats
            
            // Set localPlayerIndex for room creator (always 0)
            console.log('🏠 Setting localPlayerIndex for room creator to: 0');
            console.log('🏠 Previous localPlayerIndex:', this.localPlayerIndex);
            this.localPlayerIndex = 0;
            console.log('🏠 New localPlayerIndex:', this.localPlayerIndex);
            
            this.showRoomCode(roomCode);
            this.showPlayerCustomization();
            this.showGameControls();
        });
        
        socket.on('roomJoined', (data) => {
            console.log('🏠 Room joined:', data);
            console.log('🏠 Setting localPlayerIndex to:', data.playerIndex);
            console.log('🏠 Previous localPlayerIndex:', this.localPlayerIndex);
            this.localPlayerIndex = data.playerIndex || 0;
            console.log('🏠 New localPlayerIndex:', this.localPlayerIndex);
            this.showPlayerCustomization();
            this.showGameControls();
        });
        
        socket.on('gameStarted', (data) => {
            console.log('🎮 Game started event received:', data);
            console.log('🎮 Current localPlayerIndex:', this.localPlayerIndex);
            console.log('🎮 Data localPlayerIndex:', data.localPlayerIndex);
            console.log('🔍 DEBUG: Client socket ID:', socket.id);
            console.log('🔍 DEBUG: Client connected:', socket.connected);
            
            // Prevent multiple game initializations
            if (this.game && this.game.state === 'playing') {
                console.log('🎮 Game already started, ignoring gameStarted event');
                return;
            }
            
            // CRITICAL FIX: Always use the localPlayerIndex from gameStarted event
            // This ensures Player 2 gets the correct index even if roomJoined was missed
            if (data.localPlayerIndex !== undefined) {
                console.log('🎮 Setting localPlayerIndex from gameStarted to:', data.localPlayerIndex);
                this.localPlayerIndex = data.localPlayerIndex;
            } else {
                console.log('⚠️ gameStarted event missing localPlayerIndex, keeping current:', this.localPlayerIndex);
            }
            
            this.startGame(data);
        });

        // Backup event listener for gameStarted
        socket.on('gameStarted_backup', (data) => {
            console.log('🎮 Game started BACKUP event received:', data);
            console.log('🎮 Data localPlayerIndex:', data.localPlayerIndex);
            console.log('🔍 DEBUG: Client socket ID:', socket.id);
            
            // Prevent multiple game initializations
            if (this.game && this.game.state === 'playing') {
                console.log('🎮 Game already started, ignoring gameStarted_backup event');
                return;
            }
            
            // Set localPlayerIndex from backup event
            if (data.localPlayerIndex !== undefined) {
                console.log('🎮 Setting localPlayerIndex from gameStarted_backup to:', data.localPlayerIndex);
                this.localPlayerIndex = data.localPlayerIndex;
            }
            
            this.startGame(data);
        });

        // Fallback event listener for gameStarted_fallback
        socket.on('gameStarted_fallback', (data) => {
            console.log('🎮 Game started FALLBACK event received:', data);
            console.log('🎮 Data localPlayerIndex:', data.localPlayerIndex);
            console.log('🔍 DEBUG: Client socket ID:', socket.id);
            
            // Prevent multiple game initializations
            if (this.game && this.game.state === 'playing') {
                console.log('🎮 Game already started, ignoring gameStarted_fallback event');
                return;
            }
            
            // Set localPlayerIndex from fallback event
            if (data.localPlayerIndex !== undefined) {
                console.log('🎮 Setting localPlayerIndex from gameStarted_fallback to:', data.localPlayerIndex);
                this.localPlayerIndex = data.localPlayerIndex;
            }
            
            this.startGame(data);
        });

        // gameStart event handler removed for Go Fish - using gameStarted instead
        
        socket.on('cardsGiven', (data) => {
            this.updateCardsGiven(data);
        });
        
        socket.on('goFish', (data) => {
            console.log('🔍 goFish event received on client!', data);
            console.log('🔍 goFish - askingPlayer:', data.askingPlayer);
            console.log('🔍 goFish - targetPlayer:', data.targetPlayer);
            console.log('🔍 goFish - currentPlayer:', data.currentPlayer);
            console.log('🔍 goFish - playerIndex:', data.playerIndex);
            console.log('🔍 goFish - targetPlayerIndex:', data.targetPlayerIndex);
            console.log('🔍 goFish - drawnCard:', data.drawnCard);
            console.log('🔍 goFish - pairsFound:', data.pairsFound);
            console.log('🔍 goFish - Socket ID:', socket.id);
            console.log('🔍 goFish - Socket connected:', socket.connected);
            console.log('🔍 goFish - this context:', this);
            console.log('🔍 goFish - updateGoFish method exists:', typeof this.updateGoFish);
            this.updateGoFish(data);
        });
        
        console.log('🔍 goFish event listener registered');
        
        socket.on('turnChanged', (data) => {
            console.log('🔍 turnChanged event received on client!', data);
            console.log('🔍 turnChanged - currentPlayer:', data.currentPlayer);
            console.log('🔍 turnChanged - players count:', data.players?.length);
            console.log('🔍 turnChanged - players:', data.players);
            console.log('🔍 turnChanged - Socket ID:', socket.id);
            console.log('🔍 turnChanged - Socket connected:', socket.connected);
            console.log('🔍 turnChanged - this context:', this);
            console.log('🔍 turnChanged - updateTurnChanged method exists:', typeof this.updateTurnChanged);
            this.updateTurnChanged(data);
        });
        
        console.log('🔍 turnChanged event listener registered');
        
        // Debug socket connection
        console.log('🔍 Socket connected:', socket.connected);
        console.log('🔍 Socket ID:', socket.id);
        
        // Test socket communication
        socket.on('connect', () => {
            console.log('🔍 Socket connected successfully!');
            console.log('🔍 Socket ID after connect:', socket.id);
        });
        
        socket.on('disconnect', () => {
            console.log('🔍 Socket disconnected!');
        });
        
        // Add error handling
        socket.on('error', (error) => {
            console.error('🔍 Socket error:', error);
        });
        
        // Add reconnect handling
        socket.on('reconnect', () => {
            console.log('🔍 Socket reconnected!');
        });
        
        // Debug: Listen to all socket events
        const originalEmit = socket.emit;
        socket.emit = function(...args) {
            console.log('🔍 Client emitting:', args[0], args[1]);
            return originalEmit.apply(this, args);
        };
        
        
        socket.on('gameOver', (data) => {
            this.showGameOver(data);
        });
        
        // Handle players updated (for nickname changes)
        socket.on('playersUpdated', (players) => {
            if (this.game && this.game.players) {
                this.game.players = players;
                this.updateUI();
            }
        });
        
        // Handle pair made by human players
        socket.on('pairMade', (data) => {
            this.updatePairMade(data);
        });
        
        // Error handling
        socket.on('error', (error) => {
            console.error('Socket error:', error);
            this.addGameMessage(`Error: ${error}`, 'error');
        });
        
        // Handle disconnection
        socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.addGameMessage('Disconnected from server. Please refresh the page.', 'error');
        });
    }

    // Create room
    createRoom() {
        
        // Try to create room immediately first
        if (typeof GameFramework !== 'undefined' && GameFramework.createRoom) {
            GameFramework.createRoom('go-fish');
            return;
        }
        
        // If not available, wait and retry
        let attempts = 0;
        const maxAttempts = 10;
        
        const tryCreateRoom = () => {
            attempts++;
            
            if (typeof GameFramework !== 'undefined' && GameFramework.createRoom) {
                GameFramework.createRoom('go-fish');
                return;
            }
            
            if (attempts < maxAttempts) {
                setTimeout(tryCreateRoom, 200); // Wait 200ms between attempts
            } else {
                console.error('GameFramework still not available after maximum attempts');
                if (typeof UIUtils !== 'undefined' && UIUtils.showGameMessage) {
                UIUtils.showGameMessage('Game framework not ready. Please refresh the page.', 'error');
                } else {
                    alert('Game framework not ready. Please refresh the page.');
                }
            }
        };
        
        setTimeout(tryCreateRoom, 100);
    }

    // Join room
    joinRoom() {
        const roomCodeInput = document.getElementById('roomCodeInput');
        const roomCode = roomCodeInput ? roomCodeInput.value.trim() : '';
        
        if (!roomCode) {
            alert('Please enter a room code');
            return;
        }
        
        if (typeof GameFramework !== 'undefined' && GameFramework.joinRoom) {
        GameFramework.joinRoom(roomCode);
        } else {
            console.error('GameFramework.joinRoom not available');
            alert('Game framework not ready. Please refresh the page.');
        }
    }

    // Add bot
    addBot() {
        const socket = window.gameFramework.socket;
        socket.emit('addBot', { roomId: window.gameFramework.roomId });
    }

    // Remove bot
    removeBot() {
        const socket = window.gameFramework.socket;
        socket.emit('removeBot', { roomId: window.gameFramework.roomId });
    }

    // Start game
    startGame(data = null) {
        console.log('🎮 Go Fish: Starting game with data:', data);
        console.log('🎮 Current localPlayerIndex before startGame:', this.localPlayerIndex);
        
        if (data && data.players) {
            // Initialize with server data - server sends player-specific data
            console.log('🎮 Initializing game with server data');
            this.game.initialize(data.players);
            
            // Only set localPlayerIndex if it's not already set or if data provides it
            if (data.localPlayerIndex !== undefined) {
                console.log('🎮 Setting localPlayerIndex from data:', data.localPlayerIndex);
                console.log('🎮 Previous localPlayerIndex:', this.localPlayerIndex);
                this.localPlayerIndex = data.localPlayerIndex;
                console.log('🎮 New localPlayerIndex:', this.localPlayerIndex);
            } else {
                console.log('🎮 Data has no localPlayerIndex, keeping current:', this.localPlayerIndex);
            }
            
            // Set current player from server data
            if (data.currentPlayer !== undefined) {
                this.game.currentPlayer = data.currentPlayer;
                console.log('🎮 Setting currentPlayer from server:', data.currentPlayer);
            }
            
            // Set pond data if provided
            if (data.pond) {
                this.game.pond = data.pond;
            }
            
            // Set localPlayerIndex in game object
            this.game.localPlayerIndex = this.localPlayerIndex;
            
        } else if (data && data.hands) {
            // Handle Truco-style game start data
            const players = data.players.map((player, index) => ({
                ...player,
                hand: data.hands[index] || [],
                pairs: 0,
                isBot: player.name.toLowerCase().includes('bot') || player.isBot || false
            }));
            this.game.initialize(players);
            this.localPlayerIndex = data.localPlayerIndex || 0;
        } else {
            // Initialize with default players for testing
            const defaultPlayers = [
                { name: 'Player 1', hand: [], pairs: 0, isBot: false },
                { name: 'Bot 1', hand: [], pairs: 0, isBot: true },
                { name: 'Bot 2', hand: [], pairs: 0, isBot: true }
            ];
            this.game.initialize(defaultPlayers);
            this.localPlayerIndex = 0;
        }
        
        // Set global game instance
        window.game = this.game;
        
        // Set game state to Playing
        this.game.state = 'playing';
        if (typeof gameStateEnum !== 'undefined') {
            gameState = gameStateEnum.Playing;
            window.gameState = gameStateEnum.Playing;
        }
        
        // Set initial turn state (only once)
        this.isMyTurn = (this.game.currentPlayer === this.localPlayerIndex);
        this.canAct = this.isMyTurn; // Allow action when it's my turn
        
        // Update UI
        this.updateUI();
        
        // Show game interface
        if (typeof UIUtils !== 'undefined' && UIUtils.showGame) {
            UIUtils.showGame();
        } else {
            // Fallback: show game div directly
            const gameDiv = document.getElementById('Game');
            const menuDiv = document.getElementById('Menu');
            if (gameDiv) gameDiv.style.display = 'block';
            if (menuDiv) menuDiv.style.display = 'none';
        }
        
        // Start the p5.js draw loop
        if (typeof loop === 'function') {
            loop();
        }
        
        console.log('🎮 Go Fish: Game started successfully');
    }

    // Handle ask for cards from UI
    handleAskForCards() {
        if (!this.canAct || !this.isMyTurn) {
            console.log('❌ Cannot ask for cards - not my turn or cannot act');
            return;
        }
        
        const targetSelect = document.getElementById('targetPlayerSelect');
        const rankSelect = document.getElementById('rankSelect');
        
        if (!targetSelect || !rankSelect) {
            console.log('❌ Missing UI elements for ask for cards');
            return;
        }
        
        const targetPlayerIndex = parseInt(targetSelect.value);
        const rank = rankSelect.value;
        
        if (targetPlayerIndex === undefined || targetPlayerIndex === null || !rank) {
            console.log('❌ Missing target player or rank selection');
            return;
        }
        
        this.askForCards(targetPlayerIndex, rank);
    }

    // Ask for cards
    askForCards(targetPlayerIndex, rank) {
        console.log('🎯 askForCards method called with:', { targetPlayerIndex, rank });
        console.log('🎯 askForCards - canAct:', this.canAct, 'isMyTurn:', this.isMyTurn);
        console.log('🎯 askForCards - this.game exists:', !!this.game);
        console.log('🎯 askForCards - this.localPlayerIndex:', this.localPlayerIndex);
        console.log('🎯 askForCards - this.game.players exists:', !!this.game?.players);
        console.log('🎯 askForCards - this.game.players.length:', this.game?.players?.length);
        
        // Set acting state to prevent additional clicks
        this.isActing = true;
        
        // CRITICAL: Check if this is Player 2 and what's different
        console.log('🎯 PLAYER 2 ASKFORCARDS DEBUG - this context:', this);
        console.log('🎯 PLAYER 2 ASKFORCARDS DEBUG - this.game.currentPlayer:', this.game?.currentPlayer);
        console.log('🎯 PLAYER 2 ASKFORCARDS DEBUG - this.game.localPlayerIndex:', this.game?.localPlayerIndex);
        console.log('🎯 PLAYER 2 ASKFORCARDS DEBUG - targetPlayerIndex:', targetPlayerIndex);
        console.log('🎯 PLAYER 2 ASKFORCARDS DEBUG - this.game.players[targetPlayerIndex]:', this.game?.players?.[targetPlayerIndex]);
        
        if (!this.canAct || !this.isMyTurn) {
            console.log('❌ Cannot ask for cards - not my turn or cannot act');
            console.log('❌ canAct:', this.canAct, 'isMyTurn:', this.isMyTurn);
            return;
        }
        
        if (targetPlayerIndex === undefined || targetPlayerIndex === null || !rank) {
            console.log('❌ Missing target player or rank');
            console.log('❌ targetPlayerIndex:', targetPlayerIndex, 'rank:', rank);
            return;
        }
        
        // Validate that the local player has the rank they're asking for
        const localPlayer = this.game.players[this.localPlayerIndex];
        console.log('🎯 askForCards - localPlayer hand:', localPlayer?.hand);
        console.log('🎯 askForCards - checking for rank:', rank, 'in hand');
        
        if (!localPlayer.hand.some(card => card.rank === rank)) {
            console.log('❌ Cannot ask for a rank you don\'t have');
            this.addGameMessage('You can only ask for ranks you have in your hand!', 'error');
            return;
        }
        
        console.log(`🎯 Asking ${this.game.players[targetPlayerIndex]?.name} for ${rank}s`);
        
        // Don't process game logic on client - let server handle it
        console.log(`🎯 Sending ask for cards request to server`);
        this.addGameMessage(`Asking ${this.game.players[targetPlayerIndex]?.name} for ${rank}s...`, 'info');
        
        // Emit to server if connected
        if (window.gameFramework && window.gameFramework.socket) {
            const socket = window.gameFramework.socket;
            console.log('🎯 Socket status - connected:', socket.connected);
            console.log('🎯 Socket ID:', socket.id);
            console.log('🎯 Room ID:', window.gameFramework.roomId);
            console.log('🎯 Emitting askForCards event to server...');
            socket.emit('askForCards', {
                roomId: window.gameFramework.roomId,
                playerIndex: this.localPlayerIndex,
                targetPlayerIndex: targetPlayerIndex,
                rank: rank
            });
            console.log('🎯 askForCards event emitted successfully');
        } else {
            console.error('❌ Cannot emit askForCards - socket not found or gameFramework not available');
            console.error('❌ window.gameFramework exists:', !!window.gameFramework);
            console.error('❌ window.gameFramework.socket exists:', !!window.gameFramework?.socket);
        }
    }

    // Handle go fish from UI
    handleGoFish() {
        if (!this.canAct || !this.isMyTurn) {
            console.log('❌ Cannot go fish - not my turn or cannot act');
            return;
        }
        
        this.goFish();
    }

    // Go fish
    goFish() {
        if (!this.canAct || !this.isMyTurn) {
            console.log('❌ Cannot go fish - not my turn or cannot act');
            return;
        }
        
        // Set acting state to prevent additional clicks
        this.isActing = true;
        
        console.log('🐟 Going fishing!');
        
        // Don't process game logic on client - let server handle it
        this.addGameMessage('🐟 Going fishing!', 'info');
        
        // Emit to server if connected
        if (window.gameFramework && window.gameFramework.socket) {
            const socket = window.gameFramework.socket;
            socket.emit('goFish', {
                roomId: window.gameFramework.roomId,
                playerIndex: this.localPlayerIndex
            });
        }
    }

    // Update cards given
    updateCardsGiven(data) {
        console.log('🎮 Cards given event received:', data);
        
        // Update game state from server - update all players' hands and pairs
        if (data.players) {
            data.players.forEach((playerData, index) => {
                if (this.game.players[index]) {
                    // Update hand for ALL players (not just local player)
                    this.game.players[index].hand = playerData.hand;
                    
                    // Update pairs for all players
                    this.game.players[index].pairs = playerData.pairs;
                    
                    console.log(`🎯 Updated player ${index} (${this.game.players[index].name}): hand length=${playerData.hand.length}, pairs=${playerData.pairs}`);
                }
            });
        }
        this.game.currentPlayer = data.currentPlayer;
        
        this.isMyTurn = (data.currentPlayer === this.localPlayerIndex);
        this.canAct = this.isMyTurn; // Allow action when it's my turn
        this.isActing = false; // Reset acting state when action completes
        
        // Show appropriate message
        if (data.pairsFound > 0) {
            const message = `${data.askingPlayer} got ${data.cardsGiven} ${data.rank}(s) from ${data.targetPlayer} and made ${data.pairsFound} pair(s)!`;
            this.addGameMessage(message, 'success');
            this.game.addToHistory(message, 'success');
        } else {
            const message = `${data.targetPlayer} gave ${data.cardsGiven} ${data.rank}(s) to ${data.askingPlayer}`;
            this.addGameMessage(message, 'success');
            this.game.addToHistory(message, 'success');
        }
        
        this.updateUI();
    }

    // Update go fish
    updateGoFish(data) {
        console.log('🎮 Go fish event received:', data);
        console.log('🎮 Go fish - currentPlayer before update:', this.game.currentPlayer);
        console.log('🎮 Go fish - localPlayerIndex:', this.localPlayerIndex);
        console.log('🎮 Go fish - isMyTurn before update:', this.isMyTurn);
        console.log('🎮 Go fish - askingPlayer:', data.askingPlayer);
        console.log('🎮 Go fish - targetPlayer:', data.targetPlayer);
        console.log('🎮 Go fish - playerIndex:', data.playerIndex);
        console.log('🎮 Go fish - targetPlayerIndex:', data.targetPlayerIndex);
        
        // Update game state from server - update all players' hands and pairs
        if (data.players) {
            data.players.forEach((playerData, index) => {
                if (this.game.players[index]) {
                    // Update hand for ALL players (not just local player)
                    this.game.players[index].hand = playerData.hand;
                    
                    // Update pairs for all players
                    this.game.players[index].pairs = playerData.pairs;
                    
                    console.log(`🎯 Updated player ${index} (${this.game.players[index].name}): hand length=${playerData.hand.length}, pairs=${playerData.pairs}`);
                }
            });
        }
        this.game.pond = data.pond;
        this.game.currentPlayer = data.currentPlayer;
        
        this.isMyTurn = (data.currentPlayer === this.localPlayerIndex);
        this.canAct = this.isMyTurn; // Allow action when it's my turn
        this.isActing = false; // Reset acting state when action completes
        
        console.log('🎮 Go fish - currentPlayer after update:', this.game.currentPlayer);
        console.log('🎮 Go fish - isMyTurn after update:', this.isMyTurn);
        console.log('🎮 Go fish - canAct after update:', this.canAct);
        
        // Show fishing emoji popup first
        this.showFishingPopup(data);
        
        // Show appropriate message based on context after a delay
        setTimeout(() => {
        if (data.askingPlayer && data.targetPlayer) {
            // This is a result of asking for cards
            if (data.drawnCard) {
                if (data.pairsFound > 0) {
                        const message = `${data.askingPlayer} asked ${data.targetPlayer} for ${data.rank}s - Go Fish! Drew a card and made ${data.pairsFound} pair(s)!`;
                        this.addGameMessage(message, 'info');
                        this.game.addToHistory(message, 'info');
                } else {
                        const message = `${data.askingPlayer} asked ${data.targetPlayer} for ${data.rank}s - Go Fish! Drew a card`;
                        this.addGameMessage(message, 'info');
                        this.game.addToHistory(message, 'info');
                }
            } else {
                    const message = `${data.askingPlayer} asked ${data.targetPlayer} for ${data.rank}s - Go Fish! But the pond is empty`;
                    this.addGameMessage(message, 'warning');
                    this.game.addToHistory(message, 'warning');
            }
        } else {
            // This is a direct go fish action
            if (data.drawnCard) {
                if (data.pairsFound > 0) {
                        const message = `${data.player} went fishing and drew a card, made ${data.pairsFound} pair(s)!`;
                        this.addGameMessage(message, 'info');
                        this.game.addToHistory(message, 'info');
                } else {
                        const message = `${data.player} went fishing and drew a card`;
                        this.addGameMessage(message, 'info');
                        this.game.addToHistory(message, 'info');
                }
            } else {
                    const message = `${data.player} went fishing but the pond is empty`;
                    this.addGameMessage(message, 'warning');
                    this.game.addToHistory(message, 'warning');
            }
        }
        }, 2000); // 2 second delay before showing the result message
        
        this.updateUI();
    }

    // Show fishing emoji popup
    showFishingPopup(data) {
        // Get the correct player name from the current player index
        const currentPlayerIndex = data.currentPlayer;
        const currentPlayer = this.game.players[currentPlayerIndex];
        
        // Debug logging
        console.log('🐟 DEBUG showFishingPopup:');
        console.log('🐟   data.currentPlayer:', currentPlayerIndex);
        console.log('🐟   this.game.players:', this.game.players.map((p, i) => ({ index: i, name: p.name })));
        console.log('🐟   currentPlayer:', currentPlayer);
        console.log('🐟   data.askingPlayer:', data.askingPlayer);
        console.log('🐟   data.player:', data.player);
        
        const playerName = currentPlayer ? currentPlayer.name : (data.askingPlayer || data.player);
        const message = `🐟 ${playerName} is fishing...`;
        
        console.log('🐟   Final playerName:', playerName);
        console.log('🐟   Final message:', message);
        
        // Create a special fishing popup with animation
        if (typeof UIUtils !== 'undefined' && UIUtils.showPopup) {
            const popup = UIUtils.showPopup(message, 2000); // Show for 2 seconds
            popup.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: linear-gradient(135deg, #3498db, #2980b9);
                color: white;
                padding: 30px 40px;
                border-radius: 15px;
                box-shadow: 0 15px 40px rgba(0,0,0,0.6);
                z-index: 10001;
                font-size: 24px;
                text-align: center;
                border: 3px solid #FFD700;
                animation: fishingPulse 1s ease-in-out infinite;
            `;
            
            // Add CSS animation for fishing effect
            if (!document.getElementById('fishingAnimation')) {
                const style = document.createElement('style');
                style.id = 'fishingAnimation';
                style.textContent = `
                    @keyframes fishingPulse {
                        0% { transform: translate(-50%, -50%) scale(1); }
                        50% { transform: translate(-50%, -50%) scale(1.1); }
                        100% { transform: translate(-50%, -50%) scale(1); }
                    }
                `;
                document.head.appendChild(style);
            }
        } else {
            // Fallback to regular message
            this.addGameMessage(message, 'info');
        }
    }

    // Update turn changed
    updateTurnChanged(data) {
        console.log('🎮 Turn changed event received:', data);
        console.log('🎮 Previous currentPlayer:', this.game.currentPlayer);
        console.log('🎮 New currentPlayer:', data.currentPlayer);
        console.log('🎮 localPlayerIndex:', this.localPlayerIndex);
        console.log('🎮 Turn changed - isMyTurn before update:', this.isMyTurn);
        console.log('🎮 Turn changed - players data:', data.players);
        console.log('🎮 Turn changed - current player name:', this.game.players[data.currentPlayer]?.name);
        
        this.game.currentPlayer = data.currentPlayer;
        
        // Update game state from server - update all players' hands and pairs
        if (data.players) {
            data.players.forEach((playerData, index) => {
                if (this.game.players[index]) {
                    // Update hand for ALL players (not just local player)
                    this.game.players[index].hand = playerData.hand;
                    
                    // Update pairs for all players
                    this.game.players[index].pairs = playerData.pairs;
                    
                    console.log(`🎯 Updated player ${index} (${this.game.players[index].name}): hand length=${playerData.hand.length}, pairs=${playerData.pairs}`);
                }
            });
        }
        
        this.isMyTurn = (data.currentPlayer === this.localPlayerIndex);
        this.canAct = this.isMyTurn; // Allow action when it's my turn
        this.isActing = false; // Reset acting state when turn changes
        
        console.log('🎮 Turn changed - isMyTurn after update:', this.isMyTurn);
        console.log('🎮 Turn changed - canAct after update:', this.canAct);
        console.log(`🔄 Turn changed to ${this.game.players[this.game.currentPlayer]?.name}, isMyTurn: ${this.isMyTurn}`);
        
        // Show turn change message
        const currentPlayer = this.game.players[this.game.currentPlayer];
        if (currentPlayer) {
            const message = `🔄 ${currentPlayer.name}'s turn`;
            this.addGameMessage(message, 'info');
            this.game.addToHistory(message, 'info');
        }
        
        this.updateUI();
        
        // Bot logic is now handled by the server
    }

    // Update pair made
    updatePairMade(data) {
        console.log('🎮 Pair made event received:', data);
        
        // Update game state from server - update all players' hands and pairs
        if (data.players) {
            data.players.forEach((playerData, index) => {
                if (this.game.players[index]) {
                    // Update hand for ALL players (not just local player)
                    this.game.players[index].hand = playerData.hand;
                    
                    // Update pairs for all players
                    this.game.players[index].pairs = playerData.pairs;
                    
                    console.log(`🎯 Updated player ${index} (${this.game.players[index].name}): hand length=${playerData.hand.length}, pairs=${playerData.pairs}`);
                }
            });
        }
        this.game.currentPlayer = data.currentPlayer;
        
        this.isMyTurn = (data.currentPlayer === this.localPlayerIndex);
        this.canAct = this.isMyTurn;
        
        // Clear the pair-making area to prevent stale cards
        if (window.pairMakingArea) {
            window.pairMakingArea.cards = [];
            console.log('🎯 Cleared pair-making area after pair made event');
        }
        
        const message = `${data.player} made a pair of ${data.rank}s!`;
        this.addGameMessage(message, 'success');
        this.game.addToHistory(message, 'success');
        this.updateUI();
    }

    // Show game over
    showGameOver(data) {
        const message = `🏆 ${data.winner.name} wins with ${data.winner.pairs} pairs!`;
        UIUtils.showGameMessage(message, 'success');
        this.game.addToHistory(message, 'success');
        this.updateUI();
    }

    // Update UI
    updateUI() {
        // For Go Fish, we only need to update controls since rendering is handled by p5.js
        this.updateControls();
    }

    // Update game info
    updateGameInfo() {
        // Only update if elements exist
        const currentPlayerElement = document.getElementById('currentPlayerName');
        if (currentPlayerElement) {
            currentPlayerElement.textContent = this.game.players[this.game.currentPlayer]?.name || '-';
        }
        
        const pondCountElement = document.getElementById('pondCount');
        if (pondCountElement) {
            pondCountElement.textContent = this.game.pond.length;
        }
        
        const pondCardsElement = document.getElementById('pondCards');
        if (pondCardsElement) {
            pondCardsElement.textContent = this.game.pond.length;
        }
        
        const localPlayer = this.game.players[this.localPlayerIndex];
        if (localPlayer) {
            const playerPairsElement = document.getElementById('playerPairs');
            if (playerPairsElement) {
                playerPairsElement.textContent = localPlayer.pairs;
            }
        }
    }

    // Update scores
    updateScores() {
        const scoresBody = document.getElementById('scoresBody');
        if (scoresBody) {
        scoresBody.innerHTML = '';
        
        this.game.players.forEach(player => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${player.name}</td>
                <td>${player.pairs}</td>
            `;
            scoresBody.appendChild(row);
        });
        }
    }

    // Update player areas
    updatePlayerAreas() {
        const playerAreas = document.getElementById('playerAreas');
        if (!playerAreas) return;
        
        // Clear existing areas
        playerAreas.innerHTML = '';
        
        // Create player areas
        this.game.players.forEach((player, index) => {
            const area = document.createElement('div');
            area.className = `player-area ${index === this.game.currentPlayer ? 'active' : ''}`;
            // Position based on whether this is the local player or not
            const isLocalPlayer = (index === this.localPlayerIndex);
            const isCurrentPlayer = (index === this.game.currentPlayer);
            
            area.style.cssText = `
                position: absolute;
                ${isLocalPlayer ? 'bottom: 20px; left: 50%; transform: translateX(-50%);' : ''}
                ${!isLocalPlayer && index === 0 ? 'top: 20px; left: 50%; transform: translateX(-50%);' : ''}
                ${!isLocalPlayer && index === 1 ? 'top: 20px; left: 50%; transform: translateX(-50%);' : ''}
                ${!isLocalPlayer && index === 2 ? 'top: 50%; left: 20px; transform: translateY(-50%);' : ''}
                ${!isLocalPlayer && index === 3 ? 'top: 50%; right: 20px; transform: translateY(-50%);' : ''}
                ${!isLocalPlayer && index === 4 ? 'top: 20px; left: 20px;' : ''}
                ${!isLocalPlayer && index === 5 ? 'top: 20px; right: 20px;' : ''}
            `;
            
            // Only show hand cards for the local player, others show card count
            const showHand = (index === this.localPlayerIndex);
            
            // Display name: "You" for local player, actual name for others
            const displayName = (index === this.localPlayerIndex) ? 'You' : player.name;
            
            area.innerHTML = `
                <div style="font-weight: bold; margin-bottom: 10px;">${displayName}</div>
                <div style="font-size: 12px; margin-bottom: 5px;">Cards: ${player.hand ? player.hand.length : 0}</div>
                <div style="font-size: 12px; margin-bottom: 5px;">Pairs: ${player.pairs || 0}</div>
                <div class="hand-cards">
                    ${showHand && player.hand ? 
                        player.hand.map(card => 
                            `<div class="card" title="${card.name}">${card.rank}</div>`
                        ).join('') :
                        `🃏 ${player.hand ? player.hand.length : 0} cards`
                    }
                </div>
            `;
            
            playerAreas.appendChild(area);
        });
    }

    // Add game message
    addGameMessage(message, type = 'info') {
        if (typeof UIUtils !== 'undefined' && UIUtils.showGameMessage) {
            UIUtils.showGameMessage(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    // Update controls
    updateControls() {
        // For Go Fish, controls are drawn by p5.js in drawMainPlayerHand()
        // No HTML manipulation needed - just log the state for debugging
        console.log('🎮 updateControls called:');
        console.log('🎮   isMyTurn:', this.isMyTurn);
        console.log('🎮   localPlayerIndex:', this.localPlayerIndex);
        console.log('🎮   currentPlayer:', this.game ? this.game.currentPlayer : 'undefined');
        console.log('🎮   game exists:', !!this.game);
        console.log('🎮   players exist:', !!(this.game && this.game.players));
        console.log('🎮   my hand exists:', !!(this.game && this.game.players && this.game.players[this.localPlayerIndex]));
        console.log('🎮   my hand length:', this.game && this.game.players && this.game.players[this.localPlayerIndex] && this.game.players[this.localPlayerIndex].hand ? this.game.players[this.localPlayerIndex].hand.length : 'undefined');
        
        // Controls are handled by p5.js rendering - no HTML manipulation needed
    }

    // Show player selector (if element exists)
    showPlayerSelector() {
        const playerSelector = document.getElementById('playerSelector');
        if (playerSelector) {
            playerSelector.style.display = 'flex';
        }
    }

    // Hide player selector (if element exists)
    hidePlayerSelector() {
        const playerSelector = document.getElementById('playerSelector');
        if (playerSelector) {
            playerSelector.style.display = 'none';
        }
    }

    // Show action controls (if element exists)
    showActionControls() {
        const actionControls = document.getElementById('actionControls');
        if (actionControls) {
            actionControls.style.display = 'flex';
        }
    }

    // Hide action controls (if element exists)
    hideActionControls() {
        const actionControls = document.getElementById('actionControls');
        if (actionControls) {
            actionControls.style.display = 'none';
        }
    }

    // Update player selector (if elements exist)
    updatePlayerSelector() {
        const targetSelect = document.getElementById('targetPlayerSelect');
        const rankSelect = document.getElementById('rankSelect');
        
        // Only update if elements exist
        if (targetSelect && this.game) {
        targetSelect.innerHTML = '';
        const targets = this.game.getAvailableTargets(this.localPlayerIndex);
        targets.forEach(target => {
            const option = document.createElement('option');
            option.value = target.index;
            option.textContent = target.name;
            targetSelect.appendChild(option);
        });
        }
        
        if (rankSelect && this.game) {
        rankSelect.innerHTML = '';
        const ranks = this.game.getAvailableRanks(this.localPlayerIndex);
        ranks.forEach(rank => {
            const option = document.createElement('option');
            option.value = rank;
            option.textContent = rank;
            rankSelect.appendChild(option);
        });
        }
    }

    // Show room code
    showRoomCode(roomCode) {
        console.log('🎯 Showing room code:', roomCode);
        const roomCodeText = document.getElementById('roomCodeText');
        const roomCodeDisplay = document.getElementById('roomCodeDisplay');
        
        if (roomCodeText) {
            roomCodeText.textContent = roomCode;
            console.log('✅ Room code text updated');
        } else {
            console.error('❌ roomCodeText element not found');
        }
        
        if (roomCodeDisplay) {
            roomCodeDisplay.style.display = 'block';
            console.log('✅ Room code display shown');
        } else {
            console.error('❌ roomCodeDisplay element not found');
        }
    }

    // Show player customization
    showPlayerCustomization() {
        document.getElementById('playerCustomization').style.display = 'block';
    }

    // Show game controls
    showGameControls() {
        const addBotBtn = document.getElementById('addBotBtn');
        const removeBotBtn = document.getElementById('removeBotBtn');
        const startGameBtn = document.getElementById('startGameBtn');
        
        if (addBotBtn) {
            addBotBtn.style.display = 'inline-block';
            addBotBtn.style.setProperty('background-color', '#4CAF50', 'important');
            addBotBtn.style.setProperty('color', 'white', 'important');
            addBotBtn.style.setProperty('border', 'none', 'important');
            console.log('✅ Add Bot button shown and styled green');
        }
        
        if (removeBotBtn) {
            removeBotBtn.style.display = 'inline-block';
            removeBotBtn.style.setProperty('background-color', '#f44336', 'important');
            removeBotBtn.style.setProperty('color', 'white', 'important');
            removeBotBtn.style.setProperty('border', 'none', 'important');
            console.log('✅ Remove Bot button shown and styled red');
        }
        
        if (startGameBtn) {
            startGameBtn.style.display = 'inline-block';
            startGameBtn.style.setProperty('background-color', '#FF9800', 'important');
            startGameBtn.style.setProperty('color', 'white', 'important');
            startGameBtn.style.setProperty('border', 'none', 'important');
            startGameBtn.disabled = false;
            console.log('✅ Start Game button shown and styled orange');
        }
        
        // Show game menu button
        const gameMenuBtn = document.getElementById('gameMenuBtn');
        if (gameMenuBtn) {
            gameMenuBtn.style.display = 'inline-block';
            console.log('✅ Game Menu button shown');
        }
    }

    // Copy room code
    copyRoomCode() {
        const roomCode = document.getElementById('roomCodeText').textContent;
        navigator.clipboard.writeText(roomCode).then(() => {
            UIUtils.showGameMessage('Room code copied to clipboard!', 'success');
        });
    }

    // Change nickname
    changeNickname() {
        const nicknameInput = document.getElementById('nicknameInput');
        const newNickname = nicknameInput.value.trim();
        
        if (!newNickname) {
            this.addGameMessage('Please enter a nickname', 'error');
            return;
        }
        
        if (newNickname.length > 12) {
            this.addGameMessage('Nickname must be 12 characters or less', 'error');
            return;
        }
        
        // Update local player name
        if (this.game && this.game.players && this.game.players[this.localPlayerIndex]) {
            this.game.players[this.localPlayerIndex].name = newNickname;
            this.addGameMessage(`Nickname changed to ${newNickname}`, 'success');
        }
        
        // Emit to server if connected
        if (window.gameFramework && window.gameFramework.socket) {
            const socket = window.gameFramework.socket;
            socket.emit('changeNickname', {
                roomId: window.gameFramework.roomId,
                playerId: window.gameFramework.playerId,
                nickname: newNickname
            });
        }
    }

    // Emit start game to server
    emitStartGame() {
        console.log('🎮 Emitting startGame to server');
        if (window.gameFramework && window.gameFramework.socket && window.gameFramework.roomId) {
            const socket = window.gameFramework.socket;
            socket.emit('startGame', window.gameFramework.roomId);
        } else {
            console.error('❌ Cannot emit startGame - no socket or room ID');
            this.addGameMessage('Error: Not connected to server or room', 'error');
        }
    }

    // Reset client state
    reset() {
        console.log('🔄 Resetting Go Fish client state...');
        this.localPlayerIndex = 0;
        this.isMyTurn = false;
        this.canAct = false;
        this.isActing = false;
        this.game = new GoFishGame();
        console.log('✅ Go Fish client state reset');
    }
}

// 🎨 GO FISH RENDERING FUNCTIONS
function drawGameState() {
    // Card images are loaded globally by preload.js
    // No need to check or load them here
    
    if (!window.game || !window.game.players) {
        // Draw a waiting screen with pond background
        if (window.pondImage) {
            console.log('🐟 Drawing pond background for waiting screen');
            image(window.pondImage, 0, 0, width, height);
        } else {
            console.log('🐟 Pond image not available for waiting screen, using solid background');
        background(0, 50, 100);
        }
        fill(255);
        textAlign(CENTER, CENTER);
        textSize(24);
        text('🐟 Go Fish', width/2, height/2 - 50);
        textSize(16);
        text('Waiting for game to start...', width/2, height/2);
        return;
    }
    
    // Draw pond background image
    if (window.pondImage) {
        // Draw the pond image to fill the entire canvas
        image(window.pondImage, 0, 0, width, height);
    } else {
        console.log('🐟 Pond image not available, using solid background');
        // Fallback to solid color if pond image not loaded
    background(0, 50, 100); // Dark blue ocean
    }
    
    // Reset cursor
    cursor(ARROW);
    
    // Draw modern game elements
    drawModernTable();
    drawOpponentHands();
    drawDraggedCard();
    drawModernFishPond();
    drawModernScorePanel();
    drawGameHistoryPanel();
    drawGameMessages();
    drawGameMenu();
    
    // Draw main player hand LAST to ensure buttons are on top
    drawMainPlayerHand();
    
    // Validate layout spacing (only in development)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        validateLayoutSpacing();
    }
}

function drawModernTable() {
    // Skip background drawing since pond image is already drawn
    // Only add subtle pattern overlay if pond image is not available
    if (!window.pondImage) {
        // Modern gradient background fallback
        for (let y = 0; y < height; y++) {
            const inter = map(y, 0, height, 0, 1);
            const c1 = color(15, 25, 45);  // Dark blue
            const c2 = color(25, 35, 55);  // Lighter blue
            const c = lerpColor(c1, c2, inter);
            fill(c);
        noStroke();
            rect(0, y, width, 1);
        }
    }
    
    // Add subtle pattern overlay (only if pond image is available)
    if (window.pondImage) {
        for (let i = 0; i < 100; i++) {
            const x = random(width);
            const y = random(height);
            const size = random(0.5, 1.5);
            fill(255, 255, 255, 5); // More subtle overlay
        noStroke();
        ellipse(x, y, size, size);
        }
    }
}

function drawOpponentHands() {
    if (!window.game.players || window.game.players.length < 2) return;
    
    const cardWidth = 40;
    const cardHeight = 56;
    const spacing = 8;
    
    // Get opponents (all players except the local player)
    const localPlayerIndex = window.game.localPlayerIndex || 0;
    const opponents = window.game.players.filter((player, index) => index !== localPlayerIndex);
    
    // Removed repetitive opponent hands logs to reduce console spam
    
    if (opponents.length === 0) {
        console.log('🎮 No opponents to draw, returning');
        return;
    }
    
    // Position opponents dynamically based on how many there are
    if (opponents.length === 1) {
        // Single opponent - center top
        const opponentX = width / 2 - 75;
        const opponentY = 80;
        drawOpponentHand(opponentX, opponentY, opponents[0], cardWidth, cardHeight, spacing);
    } else if (opponents.length === 2) {
        // Two opponents - left and right
        const opponent1X = 50;
        const opponent1Y = 80;
        drawOpponentHand(opponent1X, opponent1Y, opponents[0], cardWidth, cardHeight, spacing);
        
        const opponent2X = width - 250;
        const opponent2Y = 80;
        drawOpponentHand(opponent2X, opponent2Y, opponents[1], cardWidth, cardHeight, spacing);
    } else {
        // Three or more opponents - arrange in a row
        const startX = 50;
        const opponentY = 80;
        const opponentSpacing = (width - 100) / opponents.length;
        
        opponents.forEach((opponent, index) => {
            const opponentX = startX + (index * opponentSpacing);
            drawOpponentHand(opponentX, opponentY, opponent, cardWidth, cardHeight, spacing);
        });
    }
}

function drawOpponentHand(x, y, player, cardWidth, cardHeight, spacing) {
    
    
    // Draw player info panel
    fill(0, 0, 0, 200);
    stroke(100, 150, 200);
    strokeWeight(2);
    rect(x, y, 150, 80, 8);
    
    // Player name - show from local player's perspective
    fill(255, 255, 255);
    textAlign(LEFT, CENTER);
    textSize(14);
    noStroke();
    
    // Use centralized function to get player display name
    const playerIndex = window.game.players.indexOf(player);
    const displayName = getPlayerDisplayName(playerIndex, player);
    
    text(displayName, x + 10, y + 20);
    
    // Card count
    fill(200, 200, 200);
    textSize(12);
    text(`Cards: ${player.hand.length}`, x + 10, y + 40);
    
    // Pairs count
    fill(255, 215, 0);
    textSize(12);
    text(`Pairs: ${player.pairs || 0}`, x + 10, y + 60);
    
    // Draw card backs
    const maxCards = Math.min(player.hand.length, 5);
    for (let i = 0; i < maxCards; i++) {
        const cardX = x + i * (cardWidth + spacing);
        const cardY = y + 90;
        
        // Use the drawCard function for consistent styling
        drawCard(cardX, cardY, null, cardWidth, cardHeight, false);
    }
}

function drawMainPlayerHand() {
    if (!window.game.players || !window.game.players[window.game.localPlayerIndex]) return;
    
    const player = window.game.players[window.game.localPlayerIndex];
    // Get canvas dimensions from the actual canvas element to ensure consistency
    const canvas = document.querySelector('canvas');
    const canvasWidth = width;
    const canvasHeight = height;
    
    const handY = height - 150; // Moved up more to give space for pair-making area
    const cardWidth = 60;
    const cardHeight = 84;
    const spacing = 15;
    const buttonWidth = 70;
    const buttonHeight = 30;
    const buttonSpacing = 20;
    const cardsToButtonsGap = 30; // Gap between cards and buttons
    
    // Calculate total width needed for cards and buttons
    const handLength = player.hand.length;
    const cardsWidth = (handLength - 1) * (cardWidth + spacing) + cardWidth;
    const buttonsWidth = (buttonWidth * 2) + buttonSpacing;
    const totalWidth = cardsWidth + cardsToButtonsGap + buttonsWidth;
    
    // Center everything
    const startX = (width - totalWidth) / 2;
    const cardsStartX = startX;
    const buttonsStartX = startX + cardsWidth + cardsToButtonsGap;
    
    // Removed repetitive draw logs to reduce console spam
    
    // Draw hand background - centered
    fill(0, 0, 0, 150);
    stroke(100, 150, 200);
        strokeWeight(2);
    rect(startX - 20, handY - 20, totalWidth + 40, 100, 10);
    
    // Draw player info
    fill(255, 255, 255);
    textAlign(LEFT, CENTER);
    textSize(16);
            noStroke();
    text(`Your Hand (${player.hand.length} cards)`, startX - 10, handY - 5);
    
    // Draw cards with hover effects - centered
    player.hand.forEach((card, index) => {
        const cardX = cardsStartX + index * (cardWidth + spacing);
        const cardY = handY + 10;
        
        // Check for hover
        const isHovered = mouseX >= cardX && mouseX <= cardX + cardWidth && 
                         mouseY >= cardY && mouseY <= cardY + cardHeight;
        
        // Hover effect
        if (isHovered) {
            cursor(HAND);
            // Lift card slightly
            const hoverY = cardY - 10;
            drawCard(cardX, hoverY, card, cardWidth, cardHeight, true);
        } else {
            drawCard(cardX, cardY, card, cardWidth, cardHeight, true);
        }
    });
    
    // Draw action buttons next to the cards
    // Removed repetitive main player hand log to reduce console spam
    
    // Track canvas dimension changes (reduced logging)
    if (window.lastDrawCanvasWidth !== canvasWidth || window.lastDrawCanvasHeight !== canvasHeight) {
        console.log('🔄 Canvas dimensions changed during draw!', canvasWidth, 'x', canvasHeight);
        window.lastDrawCanvasWidth = canvasWidth;
        window.lastDrawCanvasHeight = canvasHeight;
    }
    
    // Removed repetitive canvas dimensions log to reduce console spam
    
    
    if (window.game.currentPlayer === window.game.localPlayerIndex) {
        // Removed repetitive button drawing log to reduce console spam
        const buttonY = handY + 20;
        // Removed repetitive button positions log to reduce console spam
        
        // Ask button (green style to match Go Fish button)
        const askX = buttonsStartX;
        const isHoveringAsk = mouseX >= askX && mouseX <= askX + buttonWidth &&
                             mouseY >= buttonY && mouseY <= buttonY + buttonHeight;
        
        
        // Green button with same style as Go Fish button
        fill(isHoveringAsk ? 50 : 100, isHoveringAsk ? 200 : 255, isHoveringAsk ? 50 : 100); // Green color
        stroke(0);
        strokeWeight(2);
        
        rect(askX, buttonY, buttonWidth, buttonHeight, 5);
        
        
        fill(255); // White text
        textAlign(CENTER, CENTER);
        textSize(14);
        textStyle(BOLD);
        noStroke();
        text('Ask', askX + buttonWidth/2, buttonY + buttonHeight/2);
        
        // Go Fish button
        const goFishX = buttonsStartX + buttonWidth + buttonSpacing;
        const isHoveringGoFish = mouseX >= goFishX && mouseX <= goFishX + buttonWidth &&
                                mouseY >= buttonY && mouseY <= buttonY + buttonHeight;
        
        
        // Blue button
        fill(isHoveringGoFish ? 50 : 100, isHoveringGoFish ? 150 : 200, isHoveringGoFish ? 255 : 255); // Blue color
        stroke(0);
        strokeWeight(2);
        // Removed repetitive button drawing log to reduce console spam
        rect(goFishX, buttonY, buttonWidth, buttonHeight, 5);
        
        fill(255); // White text
        textAlign(CENTER, CENTER);
        textSize(14);
        textStyle(BOLD);
        noStroke();
        text('Go Fish', goFishX + buttonWidth/2, buttonY + buttonHeight/2);
        
        
    } else {
        console.log('🎮 Not drawing buttons - not current player');
    }
    
    // Draw pair-making area
    drawPairMakingArea();
}

function drawPairMakingArea() {
    if (!window.game.players || !window.game.players[window.game.localPlayerIndex]) return;
    
    const player = window.game.players[window.game.localPlayerIndex];
    // Get canvas dimensions from the actual canvas element to ensure consistency
    const canvas = document.querySelector('canvas');
    const canvasWidth = width;
    const canvasHeight = height;
    
    const handY = height - 150; // Match the main player hand position
    const pairAreaWidth = 200;
    const pairAreaHeight = 100; // Taller to accommodate cards
    const pairAreaX = canvasWidth - 500; // More to the left to avoid score box overlap
    const pairAreaY = handY - 20; // 10px higher than before
    
    // Check if player has pairs in hand
    const rankCounts = {};
    player.hand.forEach(card => {
        rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
    });
    
    const hasPairs = Object.values(rankCounts).some(count => count >= 2);
    
    // Draw pair-making area background
    fill(0, 0, 0, 150);
    stroke(hasPairs ? 255 : 100, hasPairs ? 215 : 100, hasPairs ? 0 : 100);
    strokeWeight(2);
    rect(pairAreaX, pairAreaY, pairAreaWidth, pairAreaHeight, 8);
    
    // Draw instruction text
    fill(hasPairs ? 255 : 150, hasPairs ? 215 : 150, hasPairs ? 0 : 150);
    textAlign(CENTER, CENTER);
        textSize(12);
    noStroke();
    
    if (hasPairs) {
        text('Drag cards here to make pairs', pairAreaX + pairAreaWidth/2, pairAreaY + pairAreaHeight/2);
    } else {
        text('No pairs available', pairAreaX + pairAreaWidth/2, pairAreaY + pairAreaHeight/2);
    }
    
    // Draw any cards currently in the pair-making area
    if (window.pairMakingArea && window.pairMakingArea.cards) {
        const cardWidth = 40;
        const cardHeight = 56;
        const cardSpacing = 10;
        const maxCardsPerRow = 3;
        
        window.pairMakingArea.cards.forEach((card, index) => {
            const row = Math.floor(index / maxCardsPerRow);
            const col = index % maxCardsPerRow;
            const cardX = pairAreaX + 10 + col * (cardWidth + cardSpacing);
            const cardY = pairAreaY + 40 + row * (cardHeight + 5);
            
            // Draw mini card with image
            fill(255);
            stroke(0);
            strokeWeight(1);
            rect(cardX, cardY, cardWidth, cardHeight, 4);
            
            // Draw card image if available
            const imageKey = getCardImageKey(card);
            if (window.cardImages && window.cardImages[imageKey]) {
                image(window.cardImages[imageKey], cardX + 2, cardY + 2, cardWidth - 4, cardHeight - 4);
        } else {
                // Fallback to text if image not loaded
                fill(0);
                textAlign(CENTER, CENTER);
                textSize(8);
                noStroke();
                text(card.rank, cardX + cardWidth/2, cardY + cardHeight/2);
            }
        });
    }
}

function drawDraggedCard() {
    if (window.draggedCard) {
        const cardWidth = 60;
        const cardHeight = 84;
        const cardX = mouseX - window.dragOffset.x;
        const cardY = mouseY - window.dragOffset.y;
        
        // Draw dragged card with transparency
        push();
        tint(255, 200); // Semi-transparent
        drawCard(cardX, cardY, window.draggedCard, cardWidth, cardHeight, true);
        pop();
    }
}

function drawCard(x, y, card, cardWidth, cardHeight, isLocalPlayer = false) {
    // Card shadow
    fill(0, 0, 0, 100);
    noStroke();
    rect(x + 3, y + 3, cardWidth, cardHeight, 6);
    
    // Card background
    fill(255, 255, 255);
    stroke(0, 0, 0);
    strokeWeight(1);
    rect(x, y, cardWidth, cardHeight, 6);
    
    if (isLocalPlayer && card) {
        // Draw card image if available
        const imageKey = getCardImageKey(card);
        
        if (window.cardImages && window.cardImages[imageKey]) {
            image(window.cardImages[imageKey], x + 2, y + 2, cardWidth - 4, cardHeight - 4);
        } else {
            // Fallback to text if image not loaded
            fill(0, 0, 0);
            textAlign(CENTER, CENTER);
            textSize(12);
            noStroke();
            text(card.rank, x + cardWidth/2, y + cardHeight/2 - 5);
            
            textSize(10);
            text(card.suit, x + cardWidth/2, y + cardHeight/2 + 8);
        }
    } else {
        // Draw card back for opponent cards
        if (window.cardBackImage) {
            image(window.cardBackImage, x + 2, y + 2, cardWidth - 4, cardHeight - 4);
        } else {
            // Fallback card back pattern
            fill(50, 50, 100);
            noStroke();
            rect(x + 5, y + 5, cardWidth - 10, cardHeight - 10, 2);
        }
    }
}

function drawPlayerCards(centerX, centerY, cards, cardWidth, cardHeight, isLocalPlayer = false) {
    if (!cards || cards.length === 0) return;
    
    const maxCards = 6; // Show max 6 cards
    const cardsToShow = cards.slice(0, maxCards);
    const spacing = 20; // Increased spacing to prevent overlap
    const totalWidth = (cardsToShow.length - 1) * (cardWidth + spacing);
    const startX = centerX - totalWidth / 2;
    
    cardsToShow.forEach((card, index) => {
        const x = startX + index * (cardWidth + spacing);
        const y = centerY - cardHeight / 2;
        
        // Remove animation for stability
        const floatY = y;
        
        push();
        
        // Draw card shadow - removed animation
        fill(0, 0, 0, 60);
        noStroke();
        rect(x + 3, floatY + 3, cardWidth, cardHeight, 4);
        
        // Draw card background
        fill(255);
        stroke(0);
        strokeWeight(2);
        rect(x, floatY, cardWidth, cardHeight, 4);
        
        if (isLocalPlayer) {
            // Show actual card for local player
            const imageName = card.name.toLowerCase().replace(/\s+/g, '_');
            if (typeof window.cardImages !== 'undefined' && window.cardImages[imageName] && window.cardImages[imageName].width > 0) {
                image(window.cardImages[imageName], x, floatY, cardWidth, cardHeight);
            } else {
                // Fallback to text
                fill(0);
                textAlign(CENTER, CENTER);
                textSize(8);
                noStroke();
                text(card.name, x + cardWidth/2, floatY + cardHeight/2);
            }
        } else {
            // Show card back for other players
            if (typeof window.cardBackImage !== 'undefined' && window.cardBackImage && window.cardBackImage.width > 0) {
                image(window.cardBackImage, x, floatY, cardWidth, cardHeight);
            } else {
                // Fallback to colored rectangle with pattern
                fill(0, 0, 150);
                stroke(255);
                strokeWeight(1);
                rect(x + 2, floatY + 2, cardWidth - 4, cardHeight - 4, 3);
                
                fill(255);
                textAlign(CENTER, CENTER);
                textSize(10);
                noStroke();
                text('?', x + cardWidth/2, floatY + cardHeight/2);
            }
        }
        
        pop();
    });
    
    // Show "+X more" if there are more cards
    if (cards.length > maxCards) {
        fill(255);
        textAlign(CENTER, CENTER);
        textSize(10);
        textStyle(BOLD);
        text(`+${cards.length - maxCards}`, centerX, centerY + 25);
    }
}

function drawModernFishPond() {
    const centerX = width / 2;
    const pondY = height * 0.45; // Moved up slightly to avoid opponent cards
    
    // Draw pond container - INCREASED BY 20%
    fill(0, 0, 0, 200);
    stroke(100, 150, 200);
    strokeWeight(3);
    rect(centerX - 168, pondY - 84, 336, 180, 15); // 20% increase: 280x150 → 336x180
    
    // Draw fish icon
    fill(100, 200, 255);
    textAlign(CENTER, CENTER);
    textSize(32);
    noStroke();
    text('🐟', centerX, pondY - 30);
    
    // Draw pond label
    fill(255, 255, 255);
    textSize(16);
    text('Fish Pond', centerX, pondY + 5);
    
    // Draw stacked cards icon
    const cardWidth = 30;
    const cardHeight = 42;
    const stackX = centerX - 60; // Moved left to make room for text on right
    const stackY = pondY + 20;
    
    // Draw card stack
    for (let i = 0; i < 3; i++) {
        const offsetX = i * 2;
        const offsetY = i * 2;
        
        fill(255, 255, 255);
        stroke(0, 0, 0);
        strokeWeight(1);
        rect(stackX + offsetX, stackY + offsetY, cardWidth, cardHeight, 3);
        
        // Card back pattern
        fill(50, 50, 100);
        noStroke();
        rect(stackX + offsetX + 3, stackY + offsetY + 3, cardWidth - 6, cardHeight - 6, 2);
    }
    
    // Draw card count text NEXT TO the cards (on the right side)
    const textX = stackX + cardWidth + 15; // 15px spacing from cards
    const textY = stackY + (cardHeight / 2); // Vertically centered with cards
    
    fill(255, 255, 255);
        textSize(14);
    textAlign(LEFT, CENTER);
    text(`${window.game.pond ? window.game.pond.length : 0} cards`, textX, textY);
}

function drawCards(centerX, centerY, cards, cardWidth, cardHeight, showCards) {
    if (!cards || cards.length === 0) return;
    
    const spacing = 12;
    const maxVisible = Math.min(cards.length, 6);
    const totalWidth = (maxVisible - 1) * (cardWidth + spacing);
    const startX = centerX - totalWidth / 2;
    
    for (let i = 0; i < maxVisible; i++) {
        const x = startX + i * (cardWidth + spacing);
        const y = centerY - cardHeight / 2;
        
        push();
        
        // Draw card shadow with depth
        fill(0, 0, 0, 100);
        noStroke();
        rect(x + 4, y + 4, cardWidth, cardHeight, 8);
        
        // Draw card background
        fill(255);
        stroke(0);
        strokeWeight(2);
        rect(x, y, cardWidth, cardHeight, 6);
        
        if (showCards && cards[i].name) {
            // Try to draw actual card image with proper name mapping
            const imageName = cards[i].name.toLowerCase().replace(/\s+/g, '_');
            if (typeof window.cardImages !== 'undefined' && window.cardImages[imageName] && window.cardImages[imageName].width > 0) {
                image(window.cardImages[imageName], x, y, cardWidth, cardHeight);
            } else {
                // Fallback to text if image not available
                fill(0);
                textAlign(CENTER, CENTER);
                textSize(10);
                textStyle(BOLD);
                text(cards[i].name, x + cardWidth/2, y + cardHeight/2);
            }
        } else {
            // Draw card back image
            if (typeof window.cardBackImage !== 'undefined' && window.cardBackImage && window.cardBackImage.width > 0) {
                image(window.cardBackImage, x, y, cardWidth, cardHeight);
            } else {
                // Fallback to colored rectangle with pattern
                fill(0, 0, 150);
                stroke(255);
                strokeWeight(1);
                rect(x + 2, y + 2, cardWidth - 4, cardHeight - 4, 4);
                
                fill(255);
                textAlign(CENTER, CENTER);
                textSize(12);
                textStyle(BOLD);
                text('?', x + cardWidth/2, y + cardHeight/2);
            }
        }
        
        pop();
    }
    
    // Show count if more than 6 cards
    if (cards.length > 6) {
        fill(255, 215, 0);
        textAlign(CENTER, CENTER);
        textSize(16);
        textStyle(BOLD);
        text(`+${cards.length - 6} more`, centerX, centerY + 60);
    }
}

function drawGameInfo() {
    // Draw game info box (similar to pairs panel)
    const boxX = 20;
    const boxY = 20;
    const boxWidth = 200;
    const boxHeight = 80;
    
    // Draw box shadow
    fill(0, 0, 0, 100);
    noStroke();
    rect(boxX + 3, boxY + 3, boxWidth, boxHeight, 8);
    
    // Draw box background
    fill(0, 0, 0, 200);
    stroke(255, 255, 0);
    strokeWeight(2);
    rect(boxX, boxY, boxWidth, boxHeight, 8);
    
    // Draw game info text (no animations)
    fill(255);
    textAlign(LEFT, TOP);
    textSize(14);
    noStroke();
    text(`Phase: ${window.game.gamePhase || 'playing'}`, boxX + 10, boxY + 10);
    
    // Draw current player info
    if (window.game.currentPlayer !== undefined && window.game.players[window.game.currentPlayer]) {
        const currentPlayer = window.game.players[window.game.currentPlayer];
        const localPlayerIndex = window.game.localPlayerIndex || 0;
        
        // Calculate display name from local player's perspective
        const displayName = getPlayerDisplayName(window.game.currentPlayer, currentPlayer);
        
        textSize(12);
        text(`Current Player: ${displayName}`, boxX + 10, boxY + 30);
    }
    
    // Draw pond info
    textSize(12);
    text(`Cards in Pond: ${window.game.pond ? window.game.pond.length : 0}`, boxX + 10, boxY + 50);
    
    // Draw winner if game is over
    if (window.game.gameOver && window.game.winner) {
        // Draw celebration background
        fill(255, 215, 0, 50);
        noStroke();
        rect(0, 0, width, height);
        
        // Draw winner text with animation
        const time = millis() * 0.001;
        const scale = 1 + sin(time * 3) * 0.1;
        
        push();
        translate(width/2, height/2);
        scale(scale);
        
        fill(255, 255, 0);
        textAlign(CENTER, CENTER);
        textSize(32);
        textStyle(BOLD);
        text(`🏆 Winner: ${window.game.winner.name}!`, 0, -20);
        
        textSize(20);
        text(`With ${window.game.winner.pairs} pairs!`, 0, 20);
        
        pop();
        
        // Draw confetti particles
        drawConfetti();
    }
}

function drawScores() {
    if (!window.game.players) return;
    
    const scoresX = width - 200;
    const scoresY = height - 200; // Moved up to avoid button overlap
    const scoresWidth = 180;
    const scoresHeight = 150;
    
    // Draw scores panel shadow
    fill(0, 0, 0, 100);
    noStroke();
    rect(scoresX + 3, scoresY + 3, scoresWidth, scoresHeight, 10);
    
    // Draw scores panel background
    fill(0, 0, 0, 180);
    stroke(255, 215, 0);
    strokeWeight(2);
    rect(scoresX, scoresY, scoresWidth, scoresHeight, 8);
    
    // Draw scores title
    fill(255, 215, 0);
    textAlign(CENTER, CENTER);
    textSize(16);
    noStroke();
    text('🏆 Pairs', scoresX + scoresWidth/2, scoresY + 20);
    
    // Draw player scores
    fill(255);
    textSize(12);
    textAlign(LEFT, CENTER);
    
    let yOffset = 45;
    window.game.players.forEach((player, index) => {
        const isCurrentPlayer = index === window.game.currentPlayer;
        
        if (isCurrentPlayer) {
            fill(255, 215, 0);
        } else {
            fill(255);
        }
        
        // Calculate display name from local player's perspective
        const displayName = getPlayerDisplayName(index, player);
        
        text(`${displayName}: ${player.pairs || 0}`, scoresX + 10, scoresY + yOffset);
        yOffset += 20;
    });
}

function drawGameControls() {
    if (!window.game || window.game.gameOver) return;
    
    const controlsY = height - 140; // Moved up and made taller
    const controlsX = 280; // Moved more to the right to avoid overlap
    
    // Draw controls background - increased by 30% and moved right
    fill(0, 0, 0, 180);
    stroke(255, 215, 0);
    strokeWeight(2);
    rect(controlsX - 234, controlsY - 78, 468, 156, 10);
    
    // Draw current player info
    if (window.game.currentPlayer !== undefined && window.game.players[window.game.currentPlayer]) {
        const currentPlayer = window.game.players[window.game.currentPlayer];
        const localPlayerIndex = window.game.localPlayerIndex || 0;
        
        // Calculate display name from local player's perspective
        const displayName = getPlayerDisplayName(window.game.currentPlayer, currentPlayer);
        
        fill(255, 215, 0);
        textAlign(CENTER, CENTER);
            textSize(18);
            noStroke();
            text(`🎯 ${displayName}'s Turn`, controlsX, controlsY - 50);
        
        // Draw available actions
        fill(255);
            textSize(14);
            text('Ask for cards or Go Fish!', controlsX, controlsY - 25);
            
            // Draw player selector
            // Only show p5.js buttons if HTML buttons are not visible
            const actionControls = document.getElementById('actionControls');
            const htmlButtonsVisible = actionControls && actionControls.style.display !== 'none';
            
            if (window.game.currentPlayer === this.localPlayerIndex && !htmlButtonsVisible) { // Only show for current player when HTML buttons are hidden
                // Ask player selector
                fill(255);
                textSize(14);
                textAlign(LEFT, CENTER);
                text('Ask player:', controlsX - 200, controlsY + 5);
                
                // Draw target player selector dropdown
                const availableTargets = window.game.getAvailableTargets(window.game.currentPlayer);
                if (availableTargets.length > 0) {
                    // Check if current selection is valid
                    if (this.currentTargetIndex >= availableTargets.length) {
                        this.currentTargetIndex = 0;
                    }
                    
                    fill(255, 255, 255, 200);
                    rect(controlsX - 100, controlsY - 5, 120, 25, 5);
                    fill(0);
                    textAlign(CENTER, CENTER);
        textSize(12);
                    text(availableTargets[this.currentTargetIndex].name, controlsX - 40, controlsY + 8);
                }
                
                // Rank selector
                fill(255);
                textAlign(LEFT, CENTER);
                text('for card:', controlsX - 200, controlsY + 35);
                
                // Draw rank selector dropdown
                const availableRanks = window.game.getAvailableRanks(window.game.currentPlayer);
                if (availableRanks.length > 0) {
                    // Check if current selection is valid
                    if (this.currentRankIndex >= availableRanks.length) {
                        this.currentRankIndex = 0;
                    }
                    
                    fill(255, 255, 255, 200);
                    rect(controlsX - 100, controlsY + 25, 80, 25, 5);
                    fill(0);
                    textAlign(CENTER, CENTER);
                    textSize(12);
                    text(availableRanks[this.currentRankIndex], controlsX - 60, controlsY + 38);
                }
                
                // Instructions for clicking
                fill(255, 255, 0);
                textAlign(CENTER, CENTER);
                textSize(12);
                text('Click dropdowns to select different options', controlsX, controlsY + 65);
            }
    }
}

// drawActionButtons function removed - using HTML buttons instead

function drawGameMessages() {
    if (!window.gameMessages) return;
    
    const messageY = height * 0.4;
    const messageX = width / 2;
    
    window.gameMessages.forEach((message, index) => {
        const alpha = map(message.life, 0, 120, 0, 255);
        const y = messageY + index * 25;
        
        // Draw message background
        fill(0, 0, 0, alpha * 0.7);
        noStroke();
        rect(messageX - 150, y - 10, 300, 20, 10);
        
        // Draw message text
        fill(255, 255, 255, alpha);
        textAlign(CENTER, CENTER);
        textSize(14);
        textStyle(BOLD);
        text(message.text, messageX, y);
        
        // Decrease life
        message.life--;
    });
    
    // Remove expired messages
    window.gameMessages = window.gameMessages.filter(message => message.life > 0);
}

function addGameMessage(text, type = 'info') {
    if (!window.gameMessages) window.gameMessages = [];
    
    const colors = {
        'info': [255, 255, 255],
        'success': [76, 175, 80],
        'error': [244, 67, 54],
        'warning': [255, 152, 0]
    };
    
    window.gameMessages.push({
        text: text,
        type: type,
        life: 120, // 2 seconds at 60fps
        color: colors[type] || colors['info']
    });
    
    // Play sound effect
    playSoundEffect(type);
}

function playSoundEffect(type) {
    // Simple sound effects using Web Audio API
    if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
        const audioContext = new (AudioContext || webkitAudioContext)();
        
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Different frequencies for different message types
        const frequencies = {
            'info': 440,      // A4
            'success': 523,   // C5
            'error': 220,     // A3
            'warning': 330    // E4
        };
        
        oscillator.frequency.setValueAtTime(frequencies[type] || 440, audioContext.currentTime);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
    }
}

function drawConfetti() {
    if (!window.confetti) {
        window.confetti = [];
        // Initialize confetti particles
        for (let i = 0; i < 50; i++) {
            window.confetti.push({
                x: random(width),
                y: random(height),
                vx: random(-3, 3),
                vy: random(-5, -1),
                color: [random(255), random(255), random(255)],
                size: random(3, 8),
                life: 180
            });
        }
    }
    
    // Update and draw confetti
    window.confetti.forEach((particle, index) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.1; // gravity
        particle.life--;
        
        if (particle.life > 0) {
            fill(particle.color[0], particle.color[1], particle.color[2], particle.life);
            noStroke();
            ellipse(particle.x, particle.y, particle.size, particle.size);
        } else {
            window.confetti.splice(index, 1);
        }
    });
}

// Mouse interaction for Go Fish
function mousePressed() {
    console.log('🎯 mousePressed function called!');
    if (!window.game || window.game.gameOver) {
        console.log('🎯 mousePressed - game not ready or game over');
        return;
    }
    
    // Call the Go Fish specific handler
    goFishMousePressed();
}

// Go Fish specific mouse handler - make it globally accessible
window.goFishMousePressed = function goFishMousePressed() {
    console.log('🎯 goFishMousePressed function called!');
    if (!window.game || window.game.gameOver) {
        console.log('🎯 goFishMousePressed - game not ready or game over');
        return;
    }
    
    // Only handle clicks for human player's turn and when not acting
    if (window.game.currentPlayer === window.game.localPlayerIndex && 
        window.goFishClient && !window.goFishClient.isActing) {
        // Get canvas dimensions from the actual canvas element to ensure consistency
        const canvas = document.querySelector('canvas');
        const canvasWidth = width;
        const canvasHeight = height;
        
        console.log('🎯 Canvas dimensions in mousePressed - p5 width:', width, 'p5 height:', height);
        console.log('🎯 Canvas dimensions in mousePressed - canvas width:', canvasWidth, 'canvas height:', canvasHeight);
        
    
    
    // Check for scaling issues
    const canvasRect = canvas.getBoundingClientRect();
    const scaleX = canvasWidth / canvasRect.width;
    const scaleY = canvasHeight / canvasRect.height;
    console.log('🚨 CRITICAL SCALING INFO - scaleX:', scaleX, 'scaleY:', scaleY);
    console.log('🚨 Canvas rect - width:', canvasRect.width, 'height:', canvasRect.height);
    console.log('🚨 Canvas rect - left:', canvasRect.left, 'top:', canvasRect.top);
    console.log('🚨 P5 dimensions - width:', width, 'height:', height);
    
    // Check if there's a significant scaling difference
    if (Math.abs(scaleX - 1) > 0.1 || Math.abs(scaleY - 1) > 0.1) {
        console.log('⚠️ WARNING: Canvas scaling detected! This may cause click detection issues.');
        console.log('⚠️ Consider checking browser zoom level or CSS scaling.');
    }
        
        const handY = height - 150; // Match the new position from drawMainPlayerHand
        const cardWidth = 60;
        const spacing = 15;
        const buttonWidth = 70;
        const buttonHeight = 30;
        const buttonSpacing = 20;
        const cardsToButtonsGap = 30;
        
        // Calculate positions (same as in drawMainPlayerHand)
        const player = window.game.players[window.game.localPlayerIndex];
        const handLength = player.hand.length;
        const cardsWidth = (handLength - 1) * (cardWidth + spacing) + cardWidth;
        const buttonsWidth = (buttonWidth * 2) + buttonSpacing;
        const totalWidth = cardsWidth + cardsToButtonsGap + buttonsWidth;
        const startX = (width - totalWidth) / 2;
        const buttonsStartX = startX + cardsWidth + cardsToButtonsGap;
        const buttonY = handY + 20;
        
        console.log(`🎯 Click detection - handLength: ${handLength}, cardsWidth: ${cardsWidth}, buttonsStartX: ${buttonsStartX}`);
        
        // Check for card dragging
        for (let i = 0; i < player.hand.length; i++) {
            const cardX = startX + i * (cardWidth + spacing);
            const cardY = handY;
            
            if (mouseX >= cardX && mouseX <= cardX + cardWidth &&
                mouseY >= cardY && mouseY <= cardY + 84) {
                
                // Check if player has pairs in hand
                const rankCounts = {};
                player.hand.forEach(card => {
                    rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
                });
                
                const hasPairs = Object.values(rankCounts).some(count => count >= 2);
                if (hasPairs) {
                    window.draggedCard = player.hand[i];
                    window.dragOffset = { x: mouseX - cardX, y: mouseY - cardY };
                    console.log(`🎯 Started dragging card: ${window.draggedCard.name}`);
                }
                return;
            }
        }
        
        // Check if Ask button was clicked
        const askX = buttonsStartX;
        console.log('🎯 Mouse click detection - mouseX:', mouseX, 'mouseY:', mouseY);
        console.log('🎯 Ask button bounds - askX:', askX, 'buttonY:', buttonY, 'buttonWidth:', buttonWidth, 'buttonHeight:', buttonHeight);
        console.log('🎯 Canvas dimensions in mousePressed - p5 width:', width, 'p5 height:', height);
        console.log('🎯 handY calculation - height:', height, 'handY:', handY);
        console.log('🎯 buttonsStartX calculation - startX:', startX, 'cardsWidth:', cardsWidth, 'cardsToButtonsGap:', cardsToButtonsGap);
        
        // Debug canvas element properties
        const canvasElement = document.querySelector('canvas');
        if (canvasElement) {
            const rect = canvasElement.getBoundingClientRect();
            console.log('🎯 Canvas element rect - left:', rect.left, 'top:', rect.top, 'width:', rect.width, 'height:', rect.height);
            console.log('🎯 Canvas element style - width:', canvasElement.style.width, 'height:', canvasElement.style.height);
            console.log('🎯 Canvas element attributes - width:', canvasElement.width, 'height:', canvasElement.height);
        }
        
        
        // p5.js mouseX and mouseY are already in p5.js coordinate system
        // No need to scale them - they should match the button positions directly
        const isAskButtonClicked = mouseX >= askX && mouseX <= askX + buttonWidth &&
                                 mouseY >= buttonY && mouseY <= buttonY + buttonHeight;
        
        console.log('🎯 Ask button click check:', isAskButtonClicked);
        console.log('🎯 Click area info - You clicked at (' + mouseX + ', ' + mouseY + '), but Ask button is at (' + askX + ', ' + buttonY + ') with size ' + buttonWidth + 'x' + buttonHeight);
        console.log('🎯 Canvas dimensions in mousePressed - p5 width:', width, 'p5 height:', height);
        
        
        
        
        // Log all coordinate information
        console.log('🎯 COORDINATE DEBUG:');
        console.log('  Button calculated at:', askX, buttonY, 'size:', buttonWidth, 'x', buttonHeight);
        console.log('  Mouse click at:', mouseX, mouseY);
        console.log('  Distance from button center:', dist(mouseX, mouseY, askX + buttonWidth/2, buttonY + buttonHeight/2));
        console.log('  Canvas dimensions:', width, 'x', height);
        console.log('  Canvas element dimensions:', canvasWidth, 'x', canvasHeight);
        console.log('  Scale factors:', scaleX, 'x', scaleY);
        
        if (isAskButtonClicked) {
            console.log('🎯 Ask button clicked');
            showAskForCardsDialog();
        }
        
        // Check if Go Fish button was clicked
        const goFishX = buttonsStartX + buttonWidth + buttonSpacing;
        const isGoFishButtonClicked = mouseX >= goFishX && mouseX <= goFishX + buttonWidth &&
                                     mouseY >= buttonY && mouseY <= buttonY + buttonHeight;
        
        if (isGoFishButtonClicked) {
            console.log('🐟 Go Fish button clicked');
            if (window.goFishClient) {
                window.goFishClient.goFish();
            }
        }
    }
    
    // Check if View Full History button was clicked
    const dims = getResponsiveDimensions();
    const playerCount = window.game && window.game.players ? window.game.players.length : 3;
    const baseHeight = 120;
    const playerSectionHeight = 25;
    const overallSectionHeight = 40;
    const overallPlayerHeight = 20;
    const padding = 20;
    const calculatedHeight = baseHeight + (playerCount * playerSectionHeight) + overallSectionHeight + (playerCount * overallPlayerHeight) + padding;
    const panelWidth = dims.isSmallScreen ? 240 : 260;
    const panelHeight = Math.max(calculatedHeight, dims.isSmallScreen ? 250 : 280);
    const panelX = 20;
    const panelY = height - panelHeight - 40;
    
    const buttonWidth = 80;
    const buttonHeight = 20;
    const buttonX = panelX + panelWidth - buttonWidth - 10;
    const buttonY = panelY + 35;
    
    if (mouseX >= buttonX && mouseX <= buttonX + buttonWidth &&
        mouseY >= buttonY && mouseY <= buttonY + buttonHeight) {
        console.log('📜 View Full History button clicked');
        showFullGameHistory();
    }
    
    // Check if menu buttons were clicked (top center)
    const backButtonWidth = 160; // Wider for "Back to Main Menu" text
    const restartButtonWidth = 120; // Standard width for "Go Fish Menu"
    const menuButtonHeight = 40;
    const menuButtonSpacing = 20;
    const totalWidth = backButtonWidth + restartButtonWidth + menuButtonSpacing;
    const menuX = (width - totalWidth) / 2; // Center horizontally
    const menuY = 20;
    
    const backButtonX = menuX;
    const restartButtonX = menuX + backButtonWidth + menuButtonSpacing;
    
    // Check if Back to Main Menu button was clicked
    if (mouseX >= backButtonX && mouseX <= backButtonX + backButtonWidth &&
        mouseY >= menuY && mouseY <= menuY + menuButtonHeight) {
        console.log('🔙 Back to Main Menu clicked');
        window.location.href = '/';
        return;
    }
    
    // Check if Back to Go Fish Menu button was clicked
    if (mouseX >= restartButtonX && mouseX <= restartButtonX + restartButtonWidth &&
        mouseY >= menuY && mouseY <= menuY + menuButtonHeight) {
        console.log('🐟 Back to Go Fish Menu clicked');
        window.location.href = '/go-fish.html';
        return;
    } else {
        // Player is acting or not their turn - ignore clicks
        if (window.goFishClient && window.goFishClient.isActing) {
            console.log('🎯 Ignoring click - player is acting');
        } else {
            console.log('🎯 Ignoring click - not player\'s turn');
        }
    }
}

// Mouse release for card dropping
function mouseReleased() {
    if (!window.game || window.game.gameOver) return;
    
    if (window.draggedCard) {
        // Get canvas dimensions from the actual canvas element to ensure consistency
        const canvas = document.querySelector('canvas');
        const canvasWidth = width;
        const canvasHeight = height;
        
        const handY = height - 150;
        const pairAreaWidth = 200;
        const pairAreaHeight = 100;
        const pairAreaX = canvasWidth - 500;
        const pairAreaY = handY - 20;
        
        // Check if dropped on pair-making area
        if (mouseX >= pairAreaX && mouseX <= pairAreaX + pairAreaWidth &&
            mouseY >= pairAreaY && mouseY <= pairAreaY + pairAreaHeight) {
            
            // Add card to pair-making area
            if (!window.pairMakingArea.cards) {
                window.pairMakingArea.cards = [];
            }
            
            window.pairMakingArea.cards.push(window.draggedCard);
            console.log(`🎯 Dropped card ${window.draggedCard.name} in pair-making area`);
            
            // Check if we can make a pair
            if (window.pairMakingArea.cards.length >= 2) {
                const lastTwo = window.pairMakingArea.cards.slice(-2);
                if (lastTwo[0].rank === lastTwo[1].rank) {
                    // Verify that both cards are still in the player's hand
                    const localPlayerIndex = window.game.localPlayerIndex || 0;
                    const playerHand = window.game.players[localPlayerIndex]?.hand || [];
                    const card1InHand = playerHand.some(card => card === lastTwo[0]);
                    const card2InHand = playerHand.some(card => card === lastTwo[1]);
                    
                    if (card1InHand && card2InHand) {
                    // Make the pair
                        if (window.game.makePairManually(lastTwo[0], lastTwo[1], localPlayerIndex)) {
                        // Remove the paired cards from pair-making area
                        window.pairMakingArea.cards = window.pairMakingArea.cards.filter(
                            card => card !== lastTwo[0] && card !== lastTwo[1]
                        );
                            console.log(`🎯 Successfully made pair of ${lastTwo[0].rank}s and cleared pair-making area`);
                        }
                    } else {
                        console.log(`🎯 Cards are no longer in hand - clearing pair-making area`);
                        // Clear the pair-making area if cards are not in hand
                        window.pairMakingArea.cards = [];
                    }
                }
            }
        }
        
        window.draggedCard = null;
        window.dragOffset = { x: 0, y: 0 };
    }
}

// Helper function to get available targets from a players array
function getAvailableTargetsFromPlayers(players, localPlayerIndex) {
    console.log('🎯 getAvailableTargetsFromPlayers called for playerIndex:', localPlayerIndex);
    console.log('🎯 All players:', players);
    
    const availableTargets = [];
    
    for (let i = 0; i < players.length; i++) {
        if (i === localPlayerIndex) continue; // Skip self
        
        const player = players[i];
        const handLength = player.hand ? player.hand.length : 0;
        const isValid = handLength > 0; // Any player with cards (human or bot)
        
        console.log(`🎯 Player ${i} (${player.name}): handLength=${handLength}, isBot=${player.isBot}, isValid=${isValid}`);
        
        if (isValid) {
            // Calculate display name from local player's perspective
            const displayName = getPlayerDisplayName(i, player);
            
            availableTargets.push({
                index: i,
                name: displayName,
                handLength: handLength
            });
        }
    }
    
    console.log('🎯 Available targets result:', availableTargets);
    return availableTargets;
}

function showAskForCardsDialog() {
    console.log('🎯 showAskForCardsDialog called');
    console.log('🎯 window.game:', window.game);
    console.log('🎯 window.game.players:', window.game?.players);
    
    // Debug: Log all player hands
    if (window.game && window.game.players) {
        console.log('🎯 All player hands debug:');
        window.game.players.forEach((player, index) => {
            console.log(`🎯 Player ${index} (${player.name}): handLength=${player.hand ? player.hand.length : 'undefined'}, isBot=${player.isBot}, hand=${player.hand}`);
        });
    }
    
    // Get local player index
    const localPlayerIndex = window.game.localPlayerIndex || 0;
    
    // For Go Fish, we need to filter out card details for other players to maintain privacy
    // but keep the hand length for Ask functionality
    const filteredPlayers = window.game.players.map((player, index) => {
        if (index === localPlayerIndex) {
            // Local player gets full hand details
            return player;
        } else {
            // Other players get hand length but no card details
            return {
                ...player,
                hand: player.hand ? Array(player.hand.length).fill({ hidden: true }) : []
            };
        }
    });
    
    if (!window.game || !window.game.players) {
        console.log('❌ No game or players available');
        return;
    }
    
    // Use local player index instead of current player index
    const localPlayer = window.game.players[localPlayerIndex];
    console.log('🎯 localPlayer:', localPlayer);
    console.log('🎯 localPlayer hand length:', localPlayer?.hand?.length);
    
    if (!localPlayer || localPlayer.hand.length === 0) {
        console.log('❌ No local player or empty hand');
        return;
    }
    
    // Get available ranks for local player
    const availableRanks = window.game.getAvailableRanks(localPlayerIndex);
    console.log('🎯 availableRanks:', availableRanks);
    if (availableRanks.length === 0) {
        console.log('❌ No available ranks');
        return;
    }
    
    // Get available target players using filtered players
    const availableTargets = getAvailableTargetsFromPlayers(filteredPlayers, localPlayerIndex);
    console.log('🎯 availableTargets:', availableTargets);
    if (availableTargets.length === 0) {
        console.log('❌ No available targets - all other players have empty hands');
        // Show a message instead of blocking the dialog
        alert('Cannot ask for cards right now - other players have no cards in their hands. This might be a synchronization issue. Try "Go Fish" instead.');
        return;
    }
    
    // Create dialog
    const dialog = document.createElement('div');
    dialog.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 20px;
        border-radius: 10px;
        border: 2px solid #FFD700;
        z-index: 10000;
        text-align: center;
        min-width: 300px;
    `;
    
    console.log('🎯 Creating Ask dialog with availableRanks:', availableRanks, 'availableTargets:', availableTargets);
    
    dialog.innerHTML = `
        <h3 style="margin: 0 0 15px 0; color: #FFD700;">Ask for Cards</h3>
        <div style="margin: 10px 0;">
            <label style="display: block; margin-bottom: 5px;">Ask player:</label>
            <select id="targetPlayerSelect" style="width: 100%; padding: 5px; margin-bottom: 10px;">
                ${availableTargets.map(target => `<option value="${target.index}">${target.name}</option>`).join('')}
            </select>
        </div>
        <div style="margin: 10px 0;">
            <label style="display: block; margin-bottom: 5px;">for card:</label>
            <select id="rankSelect" style="width: 100%; padding: 5px; margin-bottom: 15px;">
                ${availableRanks.map(rank => `<option value="${rank}">${rank}</option>`).join('')}
            </select>
        </div>
        <div>
            <button id="askButton" style="background: #4CAF50 !important; color: white !important; border: none !important; padding: 10px 20px !important; margin: 5px !important; border-radius: 5px !important; cursor: pointer !important; font-weight: bold !important; transition: background-color 0.3s !important;" onmouseover="this.style.setProperty('background-color', '#45a049', 'important')" onmouseout="this.style.setProperty('background-color', '#4CAF50', 'important')">Ask</button>
            <button id="cancelButton" style="background: #f44336 !important; color: white !important; border: none !important; padding: 10px 20px !important; margin: 5px !important; border-radius: 5px !important; cursor: pointer !important; font-weight: bold !important; transition: background-color 0.3s !important;" onmouseover="this.style.setProperty('background-color', '#da190b', 'important')" onmouseout="this.style.setProperty('background-color', '#f44336', 'important')">Cancel</button>
        </div>
    `;
    
    document.body.appendChild(dialog);
    console.log('🎯 Ask dialog added to DOM');
    
    // Debug: Check if buttons exist
    const askButton = document.getElementById('askButton');
    const cancelButton = document.getElementById('cancelButton');
    console.log('🎯 askButton found:', !!askButton);
    console.log('🎯 cancelButton found:', !!cancelButton);
    
    // Add event listeners
    askButton.onclick = function() {
        console.log('🎯 Dialog Ask button clicked!');
        const targetPlayerIndex = parseInt(document.getElementById('targetPlayerSelect').value);
        const rank = document.getElementById('rankSelect').value;
        
        console.log('🎯 Dialog Ask button - targetPlayerIndex:', targetPlayerIndex, 'rank:', rank);
        console.log('🎯 Dialog Ask button - window.goFishClient exists:', !!window.goFishClient);
        console.log('🎯 Dialog Ask button - window.game exists:', !!window.game);
        console.log('🎯 Dialog Ask button - window.game.currentPlayer:', window.game?.currentPlayer);
        console.log('🎯 Dialog Ask button - window.game.localPlayerIndex:', window.game?.localPlayerIndex);
        
        // CRITICAL: Check Player 2 specific state
        console.log('🎯 PLAYER 2 DEBUG - goFishClient.canAct:', window.goFishClient?.canAct);
        console.log('🎯 PLAYER 2 DEBUG - goFishClient.isMyTurn:', window.goFishClient?.isMyTurn);
        console.log('🎯 PLAYER 2 DEBUG - goFishClient.localPlayerIndex:', window.goFishClient?.localPlayerIndex);
        console.log('🎯 PLAYER 2 DEBUG - goFishClient.game exists:', !!window.goFishClient?.game);
        console.log('🎯 PLAYER 2 DEBUG - goFishClient.game.players length:', window.goFishClient?.game?.players?.length);
        console.log('🎯 PLAYER 2 DEBUG - goFishClient.game.players:', window.goFishClient?.game?.players);
        console.log('🎯 PLAYER 2 DEBUG - target player exists:', !!window.goFishClient?.game?.players?.[targetPlayerIndex]);
        console.log('🎯 PLAYER 2 DEBUG - target player name:', window.goFishClient?.game?.players?.[targetPlayerIndex]?.name);
        console.log('🎯 PLAYER 2 DEBUG - target player isBot:', window.goFishClient?.game?.players?.[targetPlayerIndex]?.isBot);
        
        if (window.goFishClient) {
            console.log('🎯 Calling goFishClient.askForCards...');
            try {
                window.goFishClient.askForCards(targetPlayerIndex, rank);
                console.log('🎯 askForCards call completed');
            } catch (error) {
                console.error('❌ Error calling askForCards:', error);
            }
        } else {
            console.log('❌ goFishClient not available!');
        }
        
        console.log('🎯 Removing dialog from DOM');
        document.body.removeChild(dialog);
    };
    console.log('🎯 Ask button onclick handler attached');
    
    cancelButton.onclick = function() {
        console.log('🎯 Dialog Cancel button clicked!');
        document.body.removeChild(dialog);
    };
    console.log('🎯 Cancel button onclick handler attached');
}

function showFullGameHistory() {
    if (!window.game || !window.game.gameHistory) {
        alert('No game history available');
        return;
    }
    
    // Create modal dialog
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        z-index: 2000;
        display: flex;
        justify-content: center;
        align-items: center;
    `;
    
    // Create dialog content
    const dialog = document.createElement('div');
    dialog.style.cssText = `
        background: rgba(0, 0, 0, 0.95);
        border: 2px solid #ff8c00;
        border-radius: 15px;
        padding: 20px;
        max-width: 600px;
        max-height: 80vh;
        overflow-y: auto;
        color: white;
        font-family: Arial, sans-serif;
    `;
    
    // Title
    const title = document.createElement('h2');
    title.textContent = '📜 Full Game History';
    title.style.cssText = `
        color: #ff8c00;
        margin: 0 0 20px 0;
        text-align: center;
        font-size: 24px;
    `;
    dialog.appendChild(title);
    
    // History container
    const historyContainer = document.createElement('div');
    historyContainer.style.cssText = `
        max-height: 60vh;
        overflow-y: auto;
        padding: 10px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
    `;
    
    // Add all history entries
    window.game.gameHistory.forEach((entry, index) => {
        const entryDiv = document.createElement('div');
        entryDiv.style.cssText = `
            padding: 8px 12px;
            margin: 4px 0;
            border-radius: 5px;
            font-size: 14px;
            border-left: 3px solid;
        `;
        
        // Set color based on entry type
        switch (entry.type) {
            case 'success':
                entryDiv.style.color = '#64ff64';
                entryDiv.style.borderLeftColor = '#64ff64';
                entryDiv.style.backgroundColor = 'rgba(100, 255, 100, 0.1)';
                break;
            case 'warning':
                entryDiv.style.color = '#ffb84d';
                entryDiv.style.borderLeftColor = '#ffb84d';
                entryDiv.style.backgroundColor = 'rgba(255, 184, 77, 0.1)';
                break;
            case 'error':
                entryDiv.style.color = '#ff6464';
                entryDiv.style.borderLeftColor = '#ff6464';
                entryDiv.style.backgroundColor = 'rgba(255, 100, 100, 0.1)';
                break;
            default:
                entryDiv.style.color = '#ffffff';
                entryDiv.style.borderLeftColor = '#64b8ff';
                entryDiv.style.backgroundColor = 'rgba(100, 184, 255, 0.1)';
                break;
        }
        
        // Add timestamp and message
        const timestamp = entry.timestamp || 'Unknown time';
        entryDiv.innerHTML = `
            <div style="font-size: 11px; color: #888; margin-bottom: 2px;">${timestamp}</div>
            <div>${entry.message}</div>
        `;
        
        historyContainer.appendChild(entryDiv);
    });
    
    dialog.appendChild(historyContainer);
    
    // Close button
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.style.cssText = `
        background: #ff8c00;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 5px;
        cursor: pointer;
        font-size: 16px;
        margin-top: 15px;
        width: 100%;
    `;
    
    closeButton.onclick = function() {
        document.body.removeChild(modal);
    };
    
    dialog.appendChild(closeButton);
    modal.appendChild(dialog);
    document.body.appendChild(modal);
    
    // Close on background click
    modal.onclick = function(e) {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    };
}

function drawGameMenu() {
    // Only show menu during gameplay
    if (!window.game || !window.game.players || window.game.players.length === 0) return;
    
    // Menu buttons in top center
    const backButtonWidth = 160; // Wider for "Back to Main Menu" text
    const restartButtonWidth = 120; // Standard width for "Go Fish Menu"
    const menuButtonHeight = 40;
    const menuButtonSpacing = 20;
    const totalWidth = backButtonWidth + restartButtonWidth + menuButtonSpacing;
    const menuX = (width - totalWidth) / 2; // Center horizontally
    const menuY = 20;
    
    // Check if mouse is hovering over buttons
    const backButtonX = menuX;
    const restartButtonX = menuX + backButtonWidth + menuButtonSpacing;
    
    const isHoveringBack = mouseX >= backButtonX && mouseX <= backButtonX + backButtonWidth &&
                          mouseY >= menuY && mouseY <= menuY + menuButtonHeight;
    
    const isHoveringRestart = mouseX >= restartButtonX && mouseX <= restartButtonX + restartButtonWidth &&
                             mouseY >= menuY && mouseY <= menuY + menuButtonHeight;
    
    // Draw Back to Main Menu button (wider, orange theme)
    fill(isHoveringBack ? 255 : 255, 140, 0, 200); // Orange background
    stroke(255, 165, 0); // Orange border
    strokeWeight(2);
    rect(backButtonX, menuY, backButtonWidth, menuButtonHeight, 8);
    
    fill(255, 255, 255);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(14);
    text('← Back to Main Menu', backButtonX + backButtonWidth/2, menuY + menuButtonHeight/2);
    
    // Draw Back to Go Fish Menu button (green theme)
    fill(isHoveringRestart ? 50 : 80, 150, 80, 200); // Green background
    stroke(100, 180, 100); // Light green border
    strokeWeight(2);
    rect(restartButtonX, menuY, restartButtonWidth, menuButtonHeight, 8);
    
    fill(255, 255, 255);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(14);
    text('🐟 Go Fish Menu', restartButtonX + restartButtonWidth/2, menuY + menuButtonHeight/2);
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔍 DOMContentLoaded event fired');
    try {
        console.log('🔍 Creating GoFishClient...');
        window.goFishClient = new GoFishClient();
        console.log('🔍 GoFishClient created successfully');
        console.log('🔍 Calling initialize()...');
        window.goFishClient.initialize();
        console.log('🔍 initialize() called successfully');
    } catch (error) {
        console.error('❌ Error during GoFishClient initialization:', error);
    }
});

// Window resize handling is now consolidated in setup.js

// Modern UI Functions
// cardImages and cardBackImage are loaded globally by preload.js

function loadCardImages() {
    // Card images are already loaded globally by preload.js
    // This function is kept for compatibility but doesn't need to do anything
    console.log('Card images are already loaded globally by preload.js');
}

function getCardImageKey(card) {
    if (!card) return null;
    const rank = card.rank.toLowerCase();
    const suit = card.suit.toLowerCase();
    return `${rank}_of_${suit}`;
}

function getResponsiveDimensions() {
    const minWidth = 800;
    const minHeight = 600;
    
    // Ensure minimum dimensions
    const canvasWidth = Math.max(width, minWidth);
    const canvasHeight = Math.max(height, minHeight);
    
    return {
        width: canvasWidth,
        height: canvasHeight,
        isSmallScreen: width < 1000 || height < 700,
        scale: Math.min(width / 1000, height / 700, 1)
    };
}

function validateLayoutSpacing() {
    // Define safe zones for each component
    const zones = {
        opponent1: { x: 50, y: 80, width: 150, height: 170 }, // 80 + 80 + 10 margin
        opponent2: { x: width - 250, y: 80, width: 150, height: 170 },
        scorePanel: { x: width - 200, y: 50, width: 180, height: 200 },
        fishPond: { x: width/2 - 120, y: height * 0.45 - 60, width: 240, height: 120 },
        mainHand: { x: 50, y: height - 80 - 20, width: width - 100, height: 100 },
        controlPanel: { x: 50, y: height - 200, width: 300, height: 100 }
    };
    
    // Check for overlaps
    const components = Object.keys(zones);
    for (let i = 0; i < components.length; i++) {
        for (let j = i + 1; j < components.length; j++) {
            const a = zones[components[i]];
            const b = zones[components[j]];
            
            if (a.x < b.x + b.width && a.x + a.width > b.x &&
                a.y < b.y + b.height && a.y + a.height > b.y) {
                console.warn(`Layout overlap detected: ${components[i]} and ${components[j]}`);
            }
        }
    }
}

function drawModernScorePanel() {
    const dims = getResponsiveDimensions();
    
    // Calculate dynamic size based on number of players
    const playerCount = window.game && window.game.players ? window.game.players.length : 3;
    const baseHeight = 120; // Base height for title and current turn
    const playerSectionHeight = 25; // Height per player for current scores
    const overallSectionHeight = 40; // Height for "Overall Wins" header
    const overallPlayerHeight = 20; // Height per player for overall wins
    const padding = 20; // Extra padding
    
    const calculatedHeight = baseHeight + (playerCount * playerSectionHeight) + overallSectionHeight + (playerCount * overallPlayerHeight) + padding;
    
    const panelWidth = dims.isSmallScreen ? 240 : 260; // Increased width significantly
    const panelHeight = Math.max(calculatedHeight, dims.isSmallScreen ? 250 : 280); // Dynamic height with minimum
    const panelX = width - panelWidth - 20; // Bottom right with margin
    const panelY = height - panelHeight - 40; // Moved higher with more margin
    
    // Draw score panel background
    fill(0, 0, 0, 200);
    stroke(100, 150, 200);
    strokeWeight(2);
    rect(panelX, panelY, panelWidth, panelHeight, 10);
    
    // Panel title
    fill(255, 215, 0);
    textAlign(LEFT, CENTER);
    textSize(18);
    noStroke();
    text('🏆 Scores', panelX + 15, panelY + 25);
    
    // Current turn indicator
    if (window.game && window.game.currentPlayer !== undefined) {
        const currentPlayer = window.game.players[window.game.currentPlayer];
        const localPlayerIndex = window.game.localPlayerIndex || 0;
        
        // Calculate display name from local player's perspective
        const displayName = getPlayerDisplayName(window.game.currentPlayer, currentPlayer);
        
        fill(100, 200, 255);
        textSize(14);
        text(`Current Turn: ${displayName}`, panelX + 15, panelY + 50);
    }
    
    // Player scores
    if (window.game && window.game.players) {
        let yOffset = 80; // Optimized spacing from title
        
        // Current game scores header
        fill(255, 255, 255);
        textSize(12);
        textStyle(BOLD);
        text('Current Game:', panelX + 15, panelY + yOffset);
        yOffset += 20;
        
        window.game.players.forEach((player, index) => {
            const isLocalPlayer = index === window.game.localPlayerIndex;
            const textColor = isLocalPlayer ? color(255, 215, 0) : color(255, 255, 255);
            
            // Calculate display name from local player's perspective
            const displayName = getPlayerDisplayName(index, player);
            
            fill(textColor);
            textSize(12);
            textStyle(NORMAL);
            text(`${displayName}: ${player.pairs || 0} pairs`, panelX + 15, panelY + yOffset);
            yOffset += 18; // Optimized spacing
        });
        
        // Overall scores section
        yOffset += 12; // Spacing between sections
        fill(255, 215, 0);
        textSize(12);
        textStyle(BOLD);
        text('Overall Wins:', panelX + 15, panelY + yOffset);
        yOffset += 18;
        
        window.game.players.forEach((player, index) => {
            const isLocalPlayer = index === window.game.localPlayerIndex;
            const textColor = isLocalPlayer ? color(255, 215, 0) : color(200, 200, 200);
            
            // Calculate display name from local player's perspective
            const displayName = getPlayerDisplayName(index, player);
            
            fill(textColor);
            textSize(11);
            textStyle(NORMAL);
            text(`${displayName}: ${player.overallWins || 0}`, panelX + 15, panelY + yOffset);
            yOffset += 16; // Optimized spacing
        });
    }
}

function drawGameHistoryPanel() {
    const dims = getResponsiveDimensions();
    
    // Calculate dynamic size based on number of players (same as score panel)
    const playerCount = window.game && window.game.players ? window.game.players.length : 3;
    const baseHeight = 120; // Base height for title
    const playerSectionHeight = 25; // Height per player for current scores
    const overallSectionHeight = 40; // Height for "Overall Wins" header
    const overallPlayerHeight = 20; // Height per player for overall wins
    const padding = 20; // Extra padding
    
    const calculatedHeight = baseHeight + (playerCount * playerSectionHeight) + overallSectionHeight + (playerCount * overallPlayerHeight) + padding;
    
    const panelWidth = dims.isSmallScreen ? 240 : 260; // Same width as score panel
    const panelHeight = Math.max(calculatedHeight, dims.isSmallScreen ? 250 : 280); // Same height as score panel
    const panelX = 20; // Bottom left with margin
    const panelY = height - panelHeight - 40; // Same position as score panel
    
    // Draw history panel background
    fill(0, 0, 0, 200);
    stroke(100, 150, 200);
    strokeWeight(2);
    rect(panelX, panelY, panelWidth, panelHeight, 10);
    
    // Panel title
    fill(255, 215, 0);
    textAlign(LEFT, CENTER);
    textSize(18);
    noStroke();
    text('📜 Game History', panelX + 15, panelY + 25);
    
    // View Full History button
    const buttonWidth = 80;
    const buttonHeight = 20;
    const buttonX = panelX + panelWidth - buttonWidth - 10;
    const buttonY = panelY + 35; // Move below title
    
    // Button background
    fill(50, 100, 150);
    stroke(100, 150, 200);
    strokeWeight(1);
    rect(buttonX, buttonY, buttonWidth, buttonHeight, 5);
    
    // Button text
    fill(255, 255, 255);
    textAlign(CENTER, CENTER);
    textSize(9);
    text('View Full', buttonX + buttonWidth/2, buttonY + buttonHeight/2);
    
    // Draw history entries
    if (window.game && window.game.gameHistory) {
        let yOffset = 65; // Start below button
        const availableHeight = panelHeight - 85; // Account for title, button, and padding
        const lineHeight = 14; // Reduced line height for better fit
        const maxEntries = Math.floor(availableHeight / lineHeight);
        
        // Display history in reverse order (newest first)
        const historyToShow = window.game.gameHistory.slice(0, maxEntries);
        historyToShow.forEach((entry, index) => {
            const textY = panelY + yOffset;
            const bottomBoundary = panelY + panelHeight - 15; // Leave 15px padding from bottom
            
            // Don't draw if text would go outside panel
            if (textY > bottomBoundary) return;
            
            // Set text color based on entry type
            switch (entry.type) {
                case 'success':
                    fill(100, 255, 100); // Green
                    break;
                case 'warning':
                    fill(255, 200, 100); // Orange
                    break;
                case 'error':
                    fill(255, 100, 100); // Red
                    break;
                default:
                    fill(255, 255, 255); // White
                    break;
            }
            
            textSize(10); // Slightly bigger font for better readability
            textStyle(NORMAL);
            textAlign(LEFT, TOP);
            
            // Truncate long text to fit in panel
            const maxWidth = panelWidth - 30; // Leave 15px margin on each side
            let displayText = entry.message;
            if (textWidth(displayText) > maxWidth) {
                // Truncate text to fit
                while (textWidth(displayText + '...') > maxWidth && displayText.length > 0) {
                    displayText = displayText.slice(0, -1);
                }
                displayText += '...';
            }
            
            text(displayText, panelX + 15, textY);
            yOffset += lineHeight;
        });
        
        // Show "..." if there are more entries
        if (window.game.gameHistory.length > maxEntries) {
            const textY = panelY + yOffset;
            if (textY <= panelY + panelHeight - 15) { // Only show if within bounds
                fill(150, 150, 150);
                textSize(9);
                text('...', panelX + 15, textY);
            }
        }
    } else {
        // No history yet
        fill(200, 200, 200);
        textSize(12);
        text('No game history yet...', panelX + 15, panelY + 60);
    }
}

// drawModernControlPanel function removed - using HTML buttons instead

// Go Fish specific windowResized handler to prevent canvas resizing during gameplay
window.goFishWindowResized = function() {
    console.log('🔍 DEBUG: goFishWindowResized called');
    console.log('🔍 DEBUG: window.game exists:', !!window.game);
    
    // CRITICAL: Don't resize canvas during active Go Fish gameplay to prevent button position issues
    // Check if we're on the go-fish page
    const currentPath = window.location.pathname;
    if (currentPath === '/go-fish' || currentPath === '/go-fish.html') {
        console.log('On go-fish page - checking game state');
        
        // Check if game is active and in playing phase
        if (window.game && window.game.gamePhase === 'playing') {
            console.log('Go Fish game active - skipping canvas resize to prevent button position issues');
            return;
        }
    }
    
    console.log('Go Fish windowResized - proceeding with resize');
    resizeCanvas(windowWidth, windowHeight);
};
