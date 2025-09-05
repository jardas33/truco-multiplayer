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
    }

    // Initialize the game
    initialize(players) {
        console.log('🐟 Go Fish: Initializing game with players:', players);
        
        this.players = players.map((player, index) => ({
            ...player,
            hand: [],
            pairs: 0,
            overallWins: player.overallWins || 0, // Initialize overall wins
            position: index
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
        
        // Reset all hands and pairs
        this.players.forEach(player => {
            player.hand = [];
            player.pairs = 0;
        });
        
        this.pond = [];
        this.pairs = [];
        this.gameOver = false;
        this.winner = null;
        
        // Create fresh deck and shuffle
        this.deck = CardUtils.createStandardDeck();
        this.deck = CardUtils.shuffleDeck(this.deck);
        
        // Deal cards
        this.dealCards();
        
        // Check for initial pairs
        this.players.forEach(player => {
            this.checkForPairs(player);
        });
        
        this.emitEvent('gameStarted', {
            players: this.players.map(p => ({ name: p.name, hand: p.hand, pairs: p.pairs })),
            pond: this.pond,
            currentPlayer: this.currentPlayer
        });
        
        // If it's a bot's turn, make them play after a short delay
        const currentPlayer = this.players[this.currentPlayer];
        if (currentPlayer.isBot) {
            setTimeout(() => this.botPlay(), 2000); // 2 second delay for game start
        }
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
                
                // Show pair found message
                this.showGameMessage(`${player.name} found ${pairs} pair(s) of ${rank}s!`, 1500);
            }
        });
    }

    // Player asks for cards
    askForCards(playerIndex, targetPlayerIndex, rank) {
        const askingPlayer = this.players[playerIndex];
        const targetPlayer = this.players[targetPlayerIndex];
        
        if (!askingPlayer || !targetPlayer || this.currentPlayer !== playerIndex) {
            return false;
        }
        
        // Check if asking player has the rank in their hand
        if (!askingPlayer.hand.some(card => card.rank === rank)) {
            return false;
        }
        
        console.log(`🎯 ${askingPlayer.name} asks ${targetPlayer.name} for ${rank}s`);
        
        // Find cards of the requested rank
        const requestedCards = targetPlayer.hand.filter(card => card.rank === rank);
        
        if (requestedCards.length > 0) {
            // Target player has the cards
            targetPlayer.hand = targetPlayer.hand.filter(card => card.rank !== rank);
            askingPlayer.hand.push(...requestedCards);
            
            console.log(`✅ ${targetPlayer.name} gives ${requestedCards.length} ${rank}(s) to ${askingPlayer.name}`);
            
            // Show success message
            this.showGameMessage(`${targetPlayer.name} gives ${requestedCards.length} ${rank}(s) to ${askingPlayer.name}!`, 2000);
            
            // Check for new pairs
            this.checkForPairs(askingPlayer);
            
            this.emitEvent('cardsGiven', {
                askingPlayer: askingPlayer.name,
                targetPlayer: targetPlayer.name,
                rank: rank,
                cardsGiven: requestedCards.length,
                players: this.players.map(p => ({ name: p.name, hand: p.hand, pairs: p.pairs })),
                currentPlayer: this.currentPlayer
            });
            
            // Asking player gets another turn
            return true;
        } else {
            // Target player doesn't have the cards - Go Fish!
            this.showGameMessage(`${targetPlayer.name} says "Go Fish!"`, 1500);
            this.goFish(askingPlayer);
            return false;
        }
    }

    // Player goes fishing
    goFish(player) {
        console.log(`🐟 ${player.name} goes fishing!`);
        
        if (this.pond.length === 0) {
            console.log('🐟 Pond is empty!');
            this.showGameMessage('Pond is empty! Game continues...', 1500);
            this.endTurn();
            return;
        }
        
        // Draw a card from pond
        const drawnCard = this.pond.pop();
        player.hand.push(drawnCard);
        
        console.log(`🎣 ${player.name} drew ${drawnCard.name}`);
        
        // Show what was drawn
        this.showGameMessage(`${player.name} drew ${drawnCard.name}`, 1500);
        
        // Check for pairs
        this.checkForPairs(player);
        
        this.emitEvent('goFish', {
            player: player.name,
            drawnCard: drawnCard,
            players: this.players.map(p => ({ name: p.name, hand: p.hand, pairs: p.pairs })),
            pond: this.pond,
            currentPlayer: this.currentPlayer
        });
        
        // End turn
        this.endTurn();
    }

    // End current player's turn
    endTurn() {
        // Check if game is over
        if (this.isGameOver()) {
            this.endGame();
            return;
        }
        
        // Move to next player
        this.currentPlayer = (this.currentPlayer + 1) % this.players.length;
        
        // Skip players with empty hands
        while (this.players[this.currentPlayer].hand.length === 0 && !this.isGameOver()) {
            this.currentPlayer = (this.currentPlayer + 1) % this.players.length;
        }
        
        this.emitEvent('turnChanged', {
            currentPlayer: this.currentPlayer,
            players: this.players.map(p => ({ name: p.name, hand: p.hand, pairs: p.pairs }))
        });
        
        // If it's a bot's turn, make them play after a delay
        const currentPlayer = this.players[this.currentPlayer];
        if (currentPlayer.isBot) {
            setTimeout(() => this.botPlay(), 1500); // 1.5 second delay for bot thinking
        }
    }
    
    // Bot AI logic
    botPlay() {
        const bot = this.players[this.currentPlayer];
        if (!bot.isBot || bot.hand.length === 0) return;
        
        console.log(`🤖 ${bot.name} is thinking...`);
        
        // Simple bot strategy: ask for a rank they have
        const availableRanks = [...new Set(bot.hand.map(card => card.rank))];
        const targetRank = availableRanks[Math.floor(Math.random() * availableRanks.length)];
        
        // Choose a target player (not themselves)
        const otherPlayers = this.players.filter((p, index) => index !== this.currentPlayer && p.hand.length > 0);
        if (otherPlayers.length === 0) {
            this.goFish(bot);
            return;
        }
        
        const targetPlayer = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
        const targetIndex = this.players.indexOf(targetPlayer);
        
        console.log(`🤖 ${bot.name} asks ${targetPlayer.name} for ${targetRank}s`);
        
        // Show bot action popup
        this.showGameMessage(`${bot.name} asks ${targetPlayer.name} for ${targetRank}s`);
        
        // Execute the ask
        this.askForCards(this.currentPlayer, targetIndex, targetRank);
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
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 20px 30px;
            border-radius: 10px;
            border: 2px solid #64b8ff;
            font-size: 18px;
            font-weight: bold;
            text-align: center;
            z-index: 1000;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
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
        // Game is over when all players have empty hands
        return this.players.every(player => player.hand.length === 0);
    }

    // End the game
    endGame() {
        console.log('🏆 Game over!');
        this.gameOver = true;
        
        // Find winner (most pairs)
        this.winner = this.players.reduce((max, player) => 
            player.pairs > max.pairs ? player : max
        );
        
        // Increment overall wins for the winner
        this.winner.overallWins = (this.winner.overallWins || 0) + 1;
        console.log(`🏆 ${this.winner.name} wins! Total wins: ${this.winner.overallWins}`);
        
        this.emitEvent('gameOver', {
            winner: {
                name: this.winner.name,
                pairs: this.winner.pairs
            },
            finalScores: this.players.map(p => ({ name: p.name, pairs: p.pairs }))
        });
    }

    // Get available ranks for a player
    getAvailableRanks(playerIndex) {
        const player = this.players[playerIndex];
        if (!player) return [];
        
        const ranks = [...new Set(player.hand.map(card => card.rank))];
        return ranks.sort();
    }

    // Get available target players
    getAvailableTargets(playerIndex) {
        return this.players
            .map((player, index) => ({ player, index }))
            .filter(({ player, index }) => index !== playerIndex && player.hand.length > 0)
            .map(({ player, index }) => ({ name: player.name, index }));
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

// 🎮 GO FISH CLIENT LOGIC
class GoFishClient {
    constructor() {
        this.game = new GoFishGame();
        this.localPlayerIndex = 0;
        this.isMyTurn = false;
        this.canAct = false;
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
        document.getElementById('startGameBtn').onclick = () => this.startGame();
        
        // Game controls (only if elements exist)
        const askBtn = document.getElementById('askBtn');
        const goFishBtn = document.getElementById('goFishBtn');
        
        if (askBtn) {
            askBtn.onclick = () => this.askForCards();
        }
        if (goFishBtn) {
            goFishBtn.onclick = () => this.goFish();
        }
        
        // Copy room code
        document.getElementById('copyRoomCodeBtn').onclick = () => this.copyRoomCode();
    }

    // Setup socket event listeners
    setupSocketListeners() {
        const socket = window.gameFramework.socket;
        
        socket.on('roomCreated', (data) => {
            console.log('🏠 Room created:', data);
            const roomCode = data.roomId || data; // Handle both old and new formats
            this.showRoomCode(roomCode);
            this.showPlayerCustomization();
            this.showGameControls();
        });
        
        socket.on('roomJoined', (data) => {
            console.log('🏠 Room joined:', data);
            this.localPlayerIndex = data.playerIndex;
            this.showPlayerCustomization();
            this.showGameControls();
        });
        
        socket.on('gameStarted', (data) => {
            console.log('🎮 Game started:', data);
            this.startGame(data);
        });
        
        socket.on('cardsGiven', (data) => {
            this.updateCardsGiven(data);
        });
        
        socket.on('goFish', (data) => {
            this.updateGoFish(data);
        });
        
        socket.on('turnChanged', (data) => {
            this.updateTurnChanged(data);
        });
        
        socket.on('gameOver', (data) => {
            this.showGameOver(data);
        });
        
        // Error handling
        socket.on('error', (error) => {
            console.error('Socket error:', error);
            UIUtils.showGameMessage(`Error: ${error}`, 'error');
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
        
        if (data) {
            this.game.initialize(data.players);
            this.localPlayerIndex = data.localPlayerIndex || 0;
        } else {
            // Initialize with default players for testing
            const defaultPlayers = [
                { name: 'Player 1', hand: [], pairs: 0 },
                { name: 'Bot 1', hand: [], pairs: 0 },
                { name: 'Bot 2', hand: [], pairs: 0 }
            ];
            this.game.initialize(defaultPlayers);
            this.localPlayerIndex = 0;
        }
        
        // Set global game instance
        window.game = this.game;
        
        // Set game state to Playing
        if (typeof gameStateEnum !== 'undefined') {
            gameState = gameStateEnum.Playing;
            window.gameState = gameStateEnum.Playing;
        }
        
        // Set initial turn state
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

    // Ask for cards
    askForCards(targetPlayerIndex, rank) {
        if (!this.canAct || !this.isMyTurn) {
            console.log('❌ Cannot ask for cards - not my turn or cannot act');
            return;
        }
        
        if (!targetPlayerIndex || !rank) {
            console.log('❌ Missing target player or rank');
            return;
        }
        
        console.log(`🎯 Asking ${this.game.players[targetPlayerIndex]?.name} for ${rank}s`);
        
        // Use the game's askForCards method
        const success = this.game.askForCards(this.localPlayerIndex, targetPlayerIndex, rank);
        
        if (success) {
            console.log('✅ Successfully asked for cards');
            addGameMessage(`Asked ${this.game.players[targetPlayerIndex]?.name} for ${rank}s`, 'info');
            this.updateUI();
        } else {
            console.log('❌ Failed to ask for cards');
            addGameMessage('Failed to ask for cards', 'error');
        }
        
        // Emit to server if connected
        if (window.gameFramework && window.gameFramework.socket) {
            const socket = window.gameFramework.socket;
            socket.emit('askForCards', {
                roomId: window.gameFramework.roomId,
                playerIndex: this.localPlayerIndex,
                targetPlayerIndex: targetPlayerIndex,
                rank: rank
            });
        }
    }

    // Go fish
    goFish() {
        if (!this.canAct || !this.isMyTurn) {
            console.log('❌ Cannot go fish - not my turn or cannot act');
            return;
        }
        
        console.log('🐟 Going fishing!');
        
        // Use the game's goFish method
        this.game.goFish(this.game.players[this.localPlayerIndex]);
        
        // Show message
        addGameMessage('🐟 Going fishing!', 'info');
        
        // Update UI
        this.updateUI();
        
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
        this.game.players = data.players;
        this.game.currentPlayer = data.currentPlayer;
        
        this.isMyTurn = (data.currentPlayer === this.localPlayerIndex);
        this.canAct = this.isMyTurn; // Allow action when it's my turn
        this.updateUI();
        
        UIUtils.showGameMessage(`${data.targetPlayer} gave ${data.cardsGiven} ${data.rank}(s) to ${data.askingPlayer}`, 'info');
    }

    // Update go fish
    updateGoFish(data) {
        this.game.players = data.players;
        this.game.pond = data.pond;
        this.game.currentPlayer = data.currentPlayer;
        
        this.isMyTurn = (data.currentPlayer === this.localPlayerIndex);
        this.canAct = this.isMyTurn; // Allow action when it's my turn
        this.updateUI();
        
        UIUtils.showGameMessage(`${data.player} went fishing and drew ${data.drawnCard.name}`, 'info');
    }

    // Update turn changed
    updateTurnChanged(data) {
        this.game.currentPlayer = data.currentPlayer;
        this.game.players = data.players;
        
        this.isMyTurn = (data.currentPlayer === this.localPlayerIndex);
        this.canAct = this.isMyTurn; // Allow action when it's my turn
        this.updateUI();
    }

    // Show game over
    showGameOver(data) {
        UIUtils.showGameMessage(`🏆 ${data.winner.name} wins with ${data.winner.pairs} pairs!`, 'success');
        this.updateUI();
    }

    // Update UI
    updateUI() {
        this.updateGameInfo();
        this.updateScores();
        this.updatePlayerAreas();
        this.updateControls();
    }

    // Update game info
    updateGameInfo() {
        document.getElementById('currentPlayerName').textContent = this.game.players[this.game.currentPlayer]?.name || '-';
        document.getElementById('pondCount').textContent = this.game.pond.length;
        document.getElementById('pondCards').textContent = this.game.pond.length;
        
        const localPlayer = this.game.players[this.localPlayerIndex];
        if (localPlayer) {
            document.getElementById('playerPairs').textContent = localPlayer.pairs;
        }
    }

    // Update scores
    updateScores() {
        const scoresBody = document.getElementById('scoresBody');
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

    // Update player areas
    updatePlayerAreas() {
        // This would update the visual representation of players
        // For now, just log the state
        console.log('Players:', this.game.players.map(p => ({
            name: p.name,
            hand: p.hand.length,
            pairs: p.pairs
        })));
    }

    // Update controls
    updateControls() {
        if (this.isMyTurn && this.game.players[this.localPlayerIndex].hand.length > 0) {
            this.showPlayerSelector();
            this.showActionControls();
            this.updatePlayerSelector();
        } else {
            this.hidePlayerSelector();
            this.hideActionControls();
        }
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

    // Reset client state
    reset() {
        console.log('🔄 Resetting Go Fish client state...');
        this.localPlayerIndex = 0;
        this.isMyTurn = false;
        this.canAct = false;
        this.game = new GoFishGame();
        console.log('✅ Go Fish client state reset');
    }
}

// 🎨 GO FISH RENDERING FUNCTIONS
function drawGameState() {
    // Card images are loaded globally by preload.js
    // No need to check or load them here
    
    if (!window.game || !window.game.players) {
        // Draw a waiting screen
        background(0, 50, 100);
        fill(255);
        textAlign(CENTER, CENTER);
        textSize(24);
        text('🐟 Go Fish', width/2, height/2 - 50);
        textSize(16);
        text('Waiting for game to start...', width/2, height/2);
        return;
    }
    
    // Clear canvas with beautiful ocean-like background
    background(0, 50, 100); // Dark blue ocean
    
    // Add animated ocean texture
    const time = millis() * 0.001;
    for (let i = 0; i < 50; i++) {
        const x = (i * 20) % width;
        const y = (i * 15) % height;
        const size = 20 + sin(time + i) * 10;
        const alpha = 20 + sin(time * 0.5 + i) * 10;
        
        fill(0, 100, 150, alpha);
        noStroke();
        ellipse(x, y, size, size * 0.5);
    }
    
    // Add floating particles
    for (let i = 0; i < 30; i++) {
        const x = (i * 30 + time * 20) % width;
        const y = (i * 25 + time * 15) % height;
        const size = 2 + sin(time + i) * 1;
        
        fill(255, 255, 255, 30);
        noStroke();
        ellipse(x, y, size, size);
    }
    
    // Reset cursor
    cursor(ARROW);
    
    // Draw modern game elements
    drawModernTable();
    drawOpponentHands();
    drawMainPlayerHand();
    drawModernFishPond();
    drawModernScorePanel();
    drawGameMessages();
    
    // Validate layout spacing (only in development)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        validateLayoutSpacing();
    }
}

function drawModernTable() {
    // Modern gradient background
    for (let y = 0; y < height; y++) {
        const inter = map(y, 0, height, 0, 1);
        const c1 = color(15, 25, 45);  // Dark blue
        const c2 = color(25, 35, 55);  // Lighter blue
        const c = lerpColor(c1, c2, inter);
        fill(c);
    noStroke();
        rect(0, y, width, 1);
    }
    
    // Add subtle pattern overlay
    for (let i = 0; i < 200; i++) {
        const x = random(width);
        const y = random(height);
        const size = random(0.5, 2);
        fill(255, 255, 255, 8);
        noStroke();
        ellipse(x, y, size, size);
    }
}

function drawOpponentHands() {
    if (!window.game.players || window.game.players.length < 3) return;
    
    const cardWidth = 40;
    const cardHeight = 56;
    const spacing = 8;
    
    // Bot 1 (top left) - moved down to avoid score panel
    const bot1X = 50;
    const bot1Y = 80;
    drawOpponentHand(bot1X, bot1Y, window.game.players[1], cardWidth, cardHeight, spacing);
    
    // Bot 2 (top right) - moved down and left to avoid score panel
    const bot2X = width - 250;
    const bot2Y = 80;
    drawOpponentHand(bot2X, bot2Y, window.game.players[2], cardWidth, cardHeight, spacing);
}

function drawOpponentHand(x, y, player, cardWidth, cardHeight, spacing) {
    // Draw player info panel
    fill(0, 0, 0, 200);
    stroke(100, 150, 200);
    strokeWeight(2);
    rect(x, y, 150, 80, 8);
    
    // Player name
    fill(255, 255, 255);
    textAlign(LEFT, CENTER);
    textSize(14);
        noStroke();
    text(player.name, x + 10, y + 20);
    
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
    if (!window.game.players || !window.game.players[0]) return;
    
    const player = window.game.players[0];
    const handY = height - 90; // Moved up slightly more for better positioning
    const cardWidth = 60;
    const cardHeight = 84;
    const spacing = 15;
    const buttonWidth = 70;
    const buttonHeight = 30;
    const buttonSpacing = 20;
    const cardsToButtonsGap = 30; // Gap between cards and buttons
    
    // Calculate total width needed for cards and buttons
    const cardsWidth = (player.hand.length - 1) * (cardWidth + spacing) + cardWidth;
    const buttonsWidth = (buttonWidth * 2) + buttonSpacing;
    const totalWidth = cardsWidth + cardsToButtonsGap + buttonsWidth;
    
    // Center everything
    const startX = (width - totalWidth) / 2;
    const cardsStartX = startX;
    const buttonsStartX = startX + cardsWidth + cardsToButtonsGap;
    
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
    if (window.game.currentPlayer === 0) {
        const buttonY = handY + 20;
        
        // Ask button
        const askX = buttonsStartX;
        const isHoveringAsk = mouseX >= askX && mouseX <= askX + buttonWidth &&
                             mouseY >= buttonY && mouseY <= buttonY + buttonHeight;
        
        fill(isHoveringAsk ? 50 : 76, isHoveringAsk ? 150 : 175, isHoveringAsk ? 50 : 80);
        stroke(255);
        strokeWeight(1);
        rect(askX, buttonY, buttonWidth, buttonHeight, 5);
        
        fill(255);
        textAlign(CENTER, CENTER);
        textSize(12);
        text('Ask', askX + buttonWidth/2, buttonY + buttonHeight/2);
        
        // Go Fish button
        const goFishX = buttonsStartX + buttonWidth + buttonSpacing;
        const isHoveringGoFish = mouseX >= goFishX && mouseX <= goFishX + buttonWidth &&
                                mouseY >= buttonY && mouseY <= buttonY + buttonHeight;
        
        fill(isHoveringGoFish ? 25 : 33, isHoveringGoFish ? 118 : 150, isHoveringGoFish ? 210 : 255);
        stroke(255);
        strokeWeight(1);
        rect(goFishX, buttonY, buttonWidth, buttonHeight, 5);
        
        fill(255);
        textAlign(CENTER, CENTER);
        textSize(12);
        text('Go Fish', goFishX + buttonWidth/2, buttonY + buttonHeight/2);
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
    
    // Draw pond container
    fill(0, 0, 0, 200);
    stroke(100, 150, 200);
    strokeWeight(3);
    rect(centerX - 120, pondY - 60, 240, 120, 15);
    
    // Draw fish icon
    fill(100, 200, 255);
    textAlign(CENTER, CENTER);
    textSize(32);
    noStroke();
    text('🐟', centerX, pondY - 20);
    
    // Draw pond label
    fill(255, 255, 255);
    textSize(16);
    text('Fish Pond', centerX, pondY + 5);
    
    // Draw stacked cards icon
    const cardWidth = 30;
    const cardHeight = 42;
    const stackX = centerX - 40;
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
    
    // Draw card count
    fill(255, 255, 255);
        textSize(14);
    text(`${window.game.pond ? window.game.pond.length : 0} cards`, centerX + 20, pondY + 50);
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
        textSize(12);
        text(`Current Player: ${currentPlayer.name}`, boxX + 10, boxY + 30);
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
        
        text(`${player.name}: ${player.pairs || 0}`, scoresX + 10, scoresY + yOffset);
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
        fill(255, 215, 0);
        textAlign(CENTER, CENTER);
            textSize(18);
            noStroke();
            text(`🎯 ${currentPlayer.name}'s Turn`, controlsX, controlsY - 50);
        
        // Draw available actions
        fill(255);
            textSize(14);
            text('Ask for cards or Go Fish!', controlsX, controlsY - 25);
            
            // Draw player selector
            if (window.game.currentPlayer === 0) { // Only show for human player
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
                text('for rank:', controlsX - 200, controlsY + 35);
                
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

function drawActionButtons() {
    if (!window.game || window.game.gameOver) return;
    
    const buttonY = height - 50; // Adjusted for bigger control box
    const buttonX = 200; // Moved to left side to match control box
    const buttonWidth = 100;
    const buttonHeight = 30;
    
    // Only show buttons for human player's turn
    if (window.game.currentPlayer === 0) {
        // Ask button
        const askButtonX = buttonX - 120;
        const isHoveringAsk = mouseX >= askButtonX - buttonWidth/2 && mouseX <= askButtonX + buttonWidth/2 &&
                          mouseY >= buttonY - buttonHeight/2 && mouseY <= buttonY + buttonHeight/2;
        
        if (isHoveringAsk) {
            cursor(HAND);
        }
        
        // Draw Ask button shadow
        fill(0, 0, 0, 100);
        noStroke();
        rect(askButtonX - buttonWidth/2 + 2, buttonY - buttonHeight/2 + 2, buttonWidth, buttonHeight, 8);
        
        // Draw Ask button with hover effect
        fill(isHoveringAsk ? 69 : 76, isHoveringAsk ? 160 : 175, isHoveringAsk ? 73 : 80);
        stroke(255);
        strokeWeight(2);
        rect(askButtonX - buttonWidth/2, buttonY - buttonHeight/2, buttonWidth, buttonHeight, 8);
        
        // Draw Ask button text
        fill(255);
        textAlign(CENTER, CENTER);
        textSize(11);
        noStroke();
        text('Ask', askButtonX, buttonY);
    
    // Go Fish button
        const goFishButtonX = buttonX + 120;
        const isHoveringGoFish = mouseX >= goFishButtonX - buttonWidth/2 && mouseX <= goFishButtonX + buttonWidth/2 &&
                          mouseY >= buttonY - buttonHeight/2 && mouseY <= buttonY + buttonHeight/2;
    
        if (isHoveringGoFish) {
        cursor(HAND);
    }
    
        // Draw Go Fish button shadow
    fill(0, 0, 0, 100);
    noStroke();
        rect(goFishButtonX - buttonWidth/2 + 2, buttonY - buttonHeight/2 + 2, buttonWidth, buttonHeight, 8);
    
        // Draw Go Fish button with hover effect
        fill(isHoveringGoFish ? 25 : 33, isHoveringGoFish ? 118 : 150, isHoveringGoFish ? 210 : 255);
    stroke(255);
    strokeWeight(2);
        rect(goFishButtonX - buttonWidth/2, buttonY - buttonHeight/2, buttonWidth, buttonHeight, 8);
    
        // Draw Go Fish button text
    fill(255);
    textAlign(CENTER, CENTER);
        textSize(11);
        noStroke();
        text('🐟 Go Fish!', goFishButtonX, buttonY);
    }
}

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
    if (!window.game || window.game.gameOver) return;
    
    // Only handle clicks for human player's turn
    if (window.game.currentPlayer === 0) {
        const handY = height - 90; // Match the new position from drawMainPlayerHand
        const cardWidth = 60;
        const spacing = 15;
        const buttonWidth = 70;
        const buttonHeight = 30;
        const buttonSpacing = 20;
        const cardsToButtonsGap = 30;
        
        // Calculate positions (same as in drawMainPlayerHand)
        const cardsWidth = (window.game.players[0].hand.length - 1) * (cardWidth + spacing) + cardWidth;
        const buttonsWidth = (buttonWidth * 2) + buttonSpacing;
        const totalWidth = cardsWidth + cardsToButtonsGap + buttonsWidth;
        const startX = (width - totalWidth) / 2;
        const buttonsStartX = startX + cardsWidth + cardsToButtonsGap;
        const buttonY = handY + 20;
        
        // Check if Ask button was clicked
        const askX = buttonsStartX;
        if (mouseX >= askX && mouseX <= askX + buttonWidth &&
            mouseY >= buttonY && mouseY <= buttonY + buttonHeight) {
            console.log('🎯 Ask button clicked');
        showAskForCardsDialog();
    }
    
    // Check if Go Fish button was clicked
        const goFishX = buttonsStartX + buttonWidth + buttonSpacing;
        if (mouseX >= goFishX && mouseX <= goFishX + buttonWidth &&
            mouseY >= buttonY && mouseY <= buttonY + buttonHeight) {
        console.log('🐟 Go Fish button clicked');
        if (window.goFishClient) {
            window.goFishClient.goFish();
            }
        }
    }
}

function showAskForCardsDialog() {
    if (!window.game || !window.game.players) return;
    
    const currentPlayer = window.game.players[window.game.currentPlayer];
    if (!currentPlayer || currentPlayer.hand.length === 0) return;
    
    // Get available ranks for current player
    const availableRanks = window.game.getAvailableRanks(window.game.currentPlayer);
    if (availableRanks.length === 0) return;
    
    // Get available target players
    const availableTargets = window.game.getAvailableTargets(window.game.currentPlayer);
    if (availableTargets.length === 0) return;
    
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
    
    dialog.innerHTML = `
        <h3 style="margin: 0 0 15px 0; color: #FFD700;">Ask for Cards</h3>
        <div style="margin: 10px 0;">
            <label style="display: block; margin-bottom: 5px;">Ask player:</label>
            <select id="targetPlayerSelect" style="width: 100%; padding: 5px; margin-bottom: 10px;">
                ${availableTargets.map(target => `<option value="${target.index}">${target.name}</option>`).join('')}
            </select>
        </div>
        <div style="margin: 10px 0;">
            <label style="display: block; margin-bottom: 5px;">for rank:</label>
            <select id="rankSelect" style="width: 100%; padding: 5px; margin-bottom: 15px;">
                ${availableRanks.map(rank => `<option value="${rank}">${rank}</option>`).join('')}
            </select>
        </div>
        <div>
            <button id="askButton" style="background: #4CAF50; color: white; border: none; padding: 10px 20px; margin: 5px; border-radius: 5px; cursor: pointer;">Ask</button>
            <button id="cancelButton" style="background: #f44336; color: white; border: none; padding: 10px 20px; margin: 5px; border-radius: 5px; cursor: pointer;">Cancel</button>
        </div>
    `;
    
    document.body.appendChild(dialog);
    
    // Add event listeners
    document.getElementById('askButton').onclick = function() {
        const targetPlayerIndex = parseInt(document.getElementById('targetPlayerSelect').value);
        const rank = document.getElementById('rankSelect').value;
        
        if (window.goFishClient) {
            window.goFishClient.askForCards(targetPlayerIndex, rank);
        }
        
        document.body.removeChild(dialog);
    };
    
    document.getElementById('cancelButton').onclick = function() {
        document.body.removeChild(dialog);
    };
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    window.goFishClient = new GoFishClient();
    window.goFishClient.initialize();
});

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
    const panelWidth = dims.isSmallScreen ? 200 : 220; // Increased width
    const panelHeight = dims.isSmallScreen ? 200 : 220; // Increased height for overall scores
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
        fill(100, 200, 255);
        textSize(14);
        text(`Current Turn: ${currentPlayer.name}`, panelX + 15, panelY + 50);
    }
    
    // Player scores
    if (window.game && window.game.players) {
        let yOffset = 85; // Slightly more space from title
        window.game.players.forEach((player, index) => {
            const isCurrentPlayer = index === window.game.currentPlayer;
            const textColor = isCurrentPlayer ? color(255, 215, 0) : color(255, 255, 255);
            
            fill(textColor);
            textSize(14);
            text(`${player.name}: ${player.pairs || 0} pairs`, panelX + 15, panelY + yOffset);
            yOffset += 22; // Slightly tighter spacing
        });
        
        // Overall scores section
        yOffset += 15; // More spacing between sections
        fill(255, 215, 0);
        textSize(13);
        textStyle(BOLD);
        text('Overall Wins:', panelX + 15, panelY + yOffset);
        yOffset += 22;
        
        window.game.players.forEach((player, index) => {
            const isCurrentPlayer = index === window.game.currentPlayer;
            const textColor = isCurrentPlayer ? color(255, 215, 0) : color(200, 200, 200);
            
            fill(textColor);
            textSize(12);
            textStyle(NORMAL);
            text(`${player.name}: ${player.overallWins || 0}`, panelX + 15, panelY + yOffset);
            yOffset += 20; // Consistent spacing
        });
    }
}

function drawModernControlPanel() {
    if (!window.game || window.game.gameOver) return;
    
    const panelWidth = 200;
    const panelHeight = 60;
    const panelX = (width - panelWidth) / 2; // Center horizontally
    const panelY = height - 100; // Move to bottom center
    
    // Draw control panel background
    fill(0, 0, 0, 200);
    stroke(100, 150, 200);
    strokeWeight(2);
    rect(panelX, panelY, panelWidth, panelHeight, 10);
    
    // Current player info
    if (window.game.currentPlayer === 0) {
        // Action buttons - centered in smaller panel
        const buttonY = panelY + 15;
        const buttonWidth = 70;
        const buttonHeight = 30;
        const buttonSpacing = 20;
        
        // Ask button
        const askX = panelX + 15;
        const isHoveringAsk = mouseX >= askX && mouseX <= askX + buttonWidth &&
                             mouseY >= buttonY && mouseY <= buttonY + buttonHeight;
        
        fill(isHoveringAsk ? 50 : 76, isHoveringAsk ? 150 : 175, isHoveringAsk ? 50 : 80);
        stroke(255);
        strokeWeight(1);
        rect(askX, buttonY, buttonWidth, buttonHeight, 5);
        
        fill(255);
        textAlign(CENTER, CENTER);
        textSize(12);
        text('Ask', askX + buttonWidth/2, buttonY + buttonHeight/2);
        
        // Go Fish button
        const goFishX = panelX + 15 + buttonWidth + buttonSpacing;
        const isHoveringGoFish = mouseX >= goFishX && mouseX <= goFishX + buttonWidth &&
                                mouseY >= buttonY && mouseY <= buttonY + buttonHeight;
        
        fill(isHoveringGoFish ? 25 : 33, isHoveringGoFish ? 118 : 150, isHoveringGoFish ? 210 : 255);
        stroke(255);
        strokeWeight(1);
        rect(goFishX, buttonY, buttonWidth, buttonHeight, 5);
        
        fill(255);
        textAlign(CENTER, CENTER);
        textSize(12);
        text('Go Fish', goFishX + buttonWidth/2, buttonY + buttonHeight/2);
    }
}
