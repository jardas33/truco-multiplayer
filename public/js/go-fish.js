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
        
        console.log('🃏 Deck created and shuffled, cards:', this.deck.length);
        
        // Deal cards
        this.dealCards();
        
        console.log('🃏 Cards dealt. Player hands:', this.players.map(p => ({ name: p.name, cards: p.hand.length })));
        console.log('🃏 Pond cards:', this.pond.length);
        
        // Check for initial pairs
        this.players.forEach(player => {
            this.checkForPairs(player);
        });
        
        console.log('🎯 Initial pairs found:', this.players.map(p => ({ name: p.name, pairs: p.pairs })));
        
        this.emitEvent('gameStarted', {
            players: this.players.map(p => ({ name: p.name, hand: p.hand, pairs: p.pairs })),
            pond: this.pond,
            currentPlayer: this.currentPlayer
        });
    }

    // Deal cards to all players
    dealCards() {
        // Deal 5 cards to each player (or 7 if 2 players)
        const cardsPerPlayer = this.players.length === 2 ? 7 : 5;
        
        for (let i = 0; i < cardsPerPlayer; i++) {
            for (let player of this.players) {
                if (this.deck.length > 0) {
                    player.hand.push(this.deck.pop());
                }
            }
        }
        
        // Remaining cards go to pond
        this.pond = [...this.deck];
        this.deck = [];
        
        console.log(`🃏 Dealt ${cardsPerPlayer} cards to each player, ${this.pond.length} cards in pond`);
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
            this.goFish(askingPlayer);
            return false;
        }
    }

    // Player goes fishing
    goFish(player) {
        console.log(`🐟 ${player.name} goes fishing!`);
        
        if (this.pond.length === 0) {
            console.log('🐟 Pond is empty!');
            this.endTurn();
            return;
        }
        
        // Draw a card from pond
        const drawnCard = this.pond.pop();
        player.hand.push(drawnCard);
        
        console.log(`🎣 ${player.name} drew ${drawnCard.name}`);
        
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
            .filter(({ index }) => index !== playerIndex && player.hand.length > 0)
            .map(({ player, index }) => ({ name: player.name, index }));
    }

    // Emit event to server
    emitEvent(eventName, data) {
        if (window.gameFramework.socket) {
            // Extract room code from window.gameFramework.roomId (could be object or string)
            const roomCode = typeof window.gameFramework.roomId === 'object' ? 
                window.gameFramework.roomId.roomId : 
                window.gameFramework.roomId;
            
            window.gameFramework.socket.emit(eventName, {
                roomId: roomCode,
                ...data
            });
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
        document.getElementById('createRoomBtn').onclick = () => this.createRoom();
        document.getElementById('joinRoomBtn').onclick = () => this.joinRoom();
        document.getElementById('addBotBtn').onclick = () => this.addBot();
        document.getElementById('removeBotBtn').onclick = () => this.removeBot();
        document.getElementById('startGameBtn').onclick = () => this.startGame();
        
        // Game controls
        document.getElementById('askBtn').onclick = () => this.askForCards();
        document.getElementById('goFishBtn').onclick = () => this.goFish();
        
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
        console.log('🎮 Create Room button clicked');
        
        // Try to create room immediately first
        if (typeof GameFramework !== 'undefined' && GameFramework.createRoom) {
            console.log('✅ GameFramework available, creating room immediately');
            GameFramework.createRoom('go-fish');
            return;
        }
        
        // If not available, wait and retry
        console.log('⏳ GameFramework not ready, waiting...');
        let attempts = 0;
        const maxAttempts = 10;
        
        const tryCreateRoom = () => {
            attempts++;
            console.log(`🔄 Attempt ${attempts}/${maxAttempts} to create room`);
            
            if (typeof GameFramework !== 'undefined' && GameFramework.createRoom) {
                console.log('✅ GameFramework now available, creating room');
                GameFramework.createRoom('go-fish');
                return;
            }
            
            if (attempts < maxAttempts) {
                setTimeout(tryCreateRoom, 200); // Wait 200ms between attempts
            } else {
                console.error('❌ GameFramework still not available after maximum attempts');
                UIUtils.showGameMessage('Game framework not ready. Please refresh the page.', 'error');
            }
        };
        
        setTimeout(tryCreateRoom, 100);
    }

    // Join room
    joinRoom() {
        const roomCode = prompt('Enter room code:');
        if (!roomCode) {
            return;
        }
        GameFramework.joinRoom(roomCode);
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
        this.updateUI();
        
        UIUtils.showGameMessage(`${data.targetPlayer} gave ${data.cardsGiven} ${data.rank}(s) to ${data.askingPlayer}`, 'info');
    }

    // Update go fish
    updateGoFish(data) {
        this.game.players = data.players;
        this.game.pond = data.pond;
        this.game.currentPlayer = data.currentPlayer;
        
        this.isMyTurn = (data.currentPlayer === this.localPlayerIndex);
        this.updateUI();
        
        UIUtils.showGameMessage(`${data.player} went fishing and drew ${data.drawnCard.name}`, 'info');
    }

    // Update turn changed
    updateTurnChanged(data) {
        this.game.currentPlayer = data.currentPlayer;
        this.game.players = data.players;
        
        this.isMyTurn = (data.currentPlayer === this.localPlayerIndex);
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

    // Show player selector
    showPlayerSelector() {
        document.getElementById('playerSelector').style.display = 'flex';
    }

    // Hide player selector
    hidePlayerSelector() {
        document.getElementById('playerSelector').style.display = 'none';
    }

    // Show action controls
    showActionControls() {
        document.getElementById('actionControls').style.display = 'flex';
    }

    // Hide action controls
    hideActionControls() {
        document.getElementById('actionControls').style.display = 'none';
    }

    // Update player selector
    updatePlayerSelector() {
        const targetSelect = document.getElementById('targetPlayerSelect');
        const rankSelect = document.getElementById('rankSelect');
        
        // Update target players
        targetSelect.innerHTML = '';
        const targets = this.game.getAvailableTargets(this.localPlayerIndex);
        targets.forEach(target => {
            const option = document.createElement('option');
            option.value = target.index;
            option.textContent = target.name;
            targetSelect.appendChild(option);
        });
        
        // Update available ranks
        rankSelect.innerHTML = '';
        const ranks = this.game.getAvailableRanks(this.localPlayerIndex);
        ranks.forEach(rank => {
            const option = document.createElement('option');
            option.value = rank;
            option.textContent = rank;
            rankSelect.appendChild(option);
        });
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
    if (!window.game || !window.game.players) {
        console.log('🎨 Go Fish: No game or players available for rendering');
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
    
    console.log('🎨 Drawing Go Fish game state');
    
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
    
    // Draw game elements
    drawGoFishTable();
    drawPlayers();
    drawPond();
    drawGameInfo();
    drawScores();
    drawGameControls();
    drawActionButtons();
    drawGameMessages();
}

function drawGoFishTable() {
    // Draw table shadow
    fill(0, 0, 0, 50);
    noStroke();
    rect(55, 55, width - 100, height - 100, 20);
    
    // Draw table outline with gradient effect
    stroke(0, 150, 200);
    strokeWeight(6);
    noFill();
    rect(50, 50, width - 100, height - 100, 20);
    
    // Draw table surface with gradient
    for (let i = 0; i < height - 120; i += 2) {
        const alpha = map(i, 0, height - 120, 120, 80);
        fill(0, 80, 120, alpha);
        noStroke();
        rect(60, 60 + i, width - 120, 2, 15);
    }
    
    // Add table texture
    for (let i = 0; i < 100; i++) {
        fill(0, 120, 160, 30);
        noStroke();
        ellipse(random(60, width - 60), random(60, height - 60), random(5, 15), random(5, 15));
    }
}

function drawPlayers() {
    if (!window.game.players) return;
    
    const playerY = height * 0.15;
    const playerWidth = 180;
    const playerHeight = 120;
    const spacing = (width - playerWidth * window.game.players.length) / (window.game.players.length + 1);
    
    window.game.players.forEach((player, index) => {
        const playerX = spacing + index * (playerWidth + spacing);
        
        // Draw player area shadow
        fill(0, 0, 0, 80);
        noStroke();
        rect(playerX + 3, playerY - 37, playerWidth, playerHeight, 12);
        
        // Draw player area background
        fill(0, 0, 0, 180);
        stroke(255, 255, 255, 200);
        strokeWeight(2);
        rect(playerX, playerY - 40, playerWidth, playerHeight, 10);
        
        // Highlight current player with golden glow
        if (index === window.game.currentPlayer) {
            stroke(255, 215, 0);
            strokeWeight(4);
            noFill();
            rect(playerX - 5, playerY - 45, playerWidth + 10, playerHeight + 10, 15);
            
            // Add glow effect
            fill(255, 215, 0, 30);
            noStroke();
            rect(playerX - 8, playerY - 48, playerWidth + 16, playerHeight + 16, 18);
        }
        
        // Draw player name with better styling
        fill(255);
        textAlign(CENTER, CENTER);
        textSize(14);
        textStyle(BOLD);
        text(player.name, playerX + playerWidth/2, playerY - 20);
        
        // Draw cards count
        textSize(12);
        textStyle(NORMAL);
        text(`Cards: ${player.hand ? player.hand.length : 0}`, playerX + playerWidth/2, playerY);
        
        // Draw pairs count
        text(`Pairs: ${player.pairs || 0}`, playerX + playerWidth/2, playerY + 15);
        
        // Draw player cards (improved representation)
        if (player.hand && player.hand.length > 0) {
            drawPlayerCards(playerX + playerWidth/2, playerY + 35, player.hand, 25, 35, index === 0);
        } else {
            // Show empty hand indicator
            fill(255, 255, 255, 100);
            textSize(10);
            text('No cards', playerX + playerWidth/2, playerY + 35);
        }
    });
}

function drawPlayerCards(centerX, centerY, cards, cardWidth, cardHeight, isLocalPlayer = false) {
    if (!cards || cards.length === 0) return;
    
    const maxCards = 6; // Show max 6 cards
    const cardsToShow = cards.slice(0, maxCards);
    const spacing = 8;
    const totalWidth = (cardsToShow.length - 1) * (cardWidth + spacing);
    const startX = centerX - totalWidth / 2;
    
    cardsToShow.forEach((card, index) => {
        const x = startX + index * (cardWidth + spacing);
        const y = centerY - cardHeight / 2;
        
        // Add subtle animation
        const time = millis() * 0.001;
        const floatY = y + sin(time + index) * 2;
        
        push();
        
        // Draw card shadow with animation
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
            if (typeof cardImages !== 'undefined' && cardImages[imageName] && cardImages[imageName].width > 0) {
                image(cardImages[imageName], x, floatY, cardWidth, cardHeight);
            } else {
                // Fallback to text
                fill(0);
                textAlign(CENTER, CENTER);
                textSize(8);
                textStyle(BOLD);
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
                textStyle(BOLD);
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

function drawPond() {
    const centerX = width / 2;
    const pondY = height * 0.65;
    
    // Draw pond shadow
    fill(0, 0, 0, 100);
    noStroke();
    rect(centerX - 202, pondY - 52, 404, 104, 12);
    
    // Draw pond area with gradient
    fill(0, 0, 0, 180);
    stroke(255, 255, 255, 200);
    strokeWeight(3);
    rect(centerX - 200, pondY - 50, 400, 100, 10);
    
    // Add animated pond texture
    const time = millis() * 0.001;
    for (let i = 0; i < 20; i++) {
        const x = centerX - 180 + (i * 18) + sin(time + i) * 10;
        const y = pondY - 30 + cos(time + i * 0.5) * 15;
        const size = 8 + sin(time + i) * 4;
        
        fill(0, 100, 150, 40);
        noStroke();
        ellipse(x, y, size, size * 0.6);
    }
    
    // Draw pond label with better styling
    fill(255, 215, 0);
    textAlign(CENTER, CENTER);
    textSize(20);
    textStyle(BOLD);
    text('🐟 Fish Pond', centerX, pondY - 30);
    
    // Draw cards in pond
    if (window.game.pond && window.game.pond.length > 0) {
        drawCards(centerX, pondY + 10, window.game.pond, 50, 70, false);
        
        // Show pond count with animation
        fill(255);
        textSize(14);
        textStyle(BOLD);
        const countY = pondY + 45 + sin(time * 2) * 2;
        text(`${window.game.pond.length} cards`, centerX, countY);
    } else {
        fill(255, 255, 255, 150);
        textSize(14);
        textStyle(NORMAL);
        text('Pond is empty', centerX, pondY + 10);
    }
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
            if (typeof cardImages !== 'undefined' && cardImages[imageName] && cardImages[imageName].width > 0) {
                image(cardImages[imageName], x, y, cardWidth, cardHeight);
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
    // Draw game phase with better styling
    fill(255, 215, 0);
    textAlign(LEFT, TOP);
    textSize(16);
    textStyle(BOLD);
    text(`🎮 Phase: ${window.game.gamePhase || 'playing'}`, 20, 20);
    
    // Draw current player info
    if (window.game.currentPlayer !== undefined && window.game.players[window.game.currentPlayer]) {
        const currentPlayer = window.game.players[window.game.currentPlayer];
        fill(255);
        textSize(14);
        textStyle(NORMAL);
        text(`👤 Current Player: ${currentPlayer.name}`, 20, 45);
    }
    
    // Draw pond info
    fill(255);
    textSize(14);
    text(`🐟 Cards in Pond: ${window.game.pond ? window.game.pond.length : 0}`, 20, 65);
    
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
    const scoresY = 20;
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
    textStyle(BOLD);
    text('🏆 Pairs', scoresX + scoresWidth/2, scoresY + 20);
    
    // Draw player scores
    fill(255);
    textSize(12);
    textStyle(NORMAL);
    textAlign(LEFT, CENTER);
    
    let yOffset = 45;
    window.game.players.forEach((player, index) => {
        const isCurrentPlayer = index === window.game.currentPlayer;
        
        if (isCurrentPlayer) {
            fill(255, 215, 0);
            textStyle(BOLD);
        } else {
            fill(255);
            textStyle(NORMAL);
        }
        
        text(`${player.name}: ${player.pairs || 0}`, scoresX + 10, scoresY + yOffset);
        yOffset += 20;
    });
}

function drawGameControls() {
    if (!window.game || window.game.gameOver) return;
    
    const controlsY = height - 80;
    const controlsX = width / 2;
    
    // Draw controls background
    fill(0, 0, 0, 180);
    stroke(255, 215, 0);
    strokeWeight(2);
    rect(controlsX - 200, controlsY - 30, 400, 60, 10);
    
    // Draw current player info
    if (window.game.currentPlayer !== undefined && window.game.players[window.game.currentPlayer]) {
        const currentPlayer = window.game.players[window.game.currentPlayer];
        fill(255, 215, 0);
        textAlign(CENTER, CENTER);
        textSize(16);
        textStyle(BOLD);
        text(`🎯 ${currentPlayer.name}'s Turn`, controlsX, controlsY - 10);
        
        // Draw available actions
        fill(255);
        textSize(12);
        textStyle(NORMAL);
        text('Ask for cards or Go Fish!', controlsX, controlsY + 10);
    }
}

function drawActionButtons() {
    if (!window.game || window.game.gameOver) return;
    
    const buttonY = height - 40;
    const buttonX = width / 2;
    const buttonWidth = 120;
    const buttonHeight = 35;
    
    // Ask for cards button
    if (window.game.players && window.game.players[window.game.currentPlayer] && 
        window.game.players[window.game.currentPlayer].hand.length > 0) {
        
        // Check if mouse is hovering over button
        const isHovering = mouseX >= buttonX - buttonWidth - 10 && mouseX <= buttonX - 10 &&
                          mouseY >= buttonY - buttonHeight/2 && mouseY <= buttonY + buttonHeight/2;
        
        // Change cursor
        if (isHovering) {
            cursor(HAND);
        }
        
        // Draw button shadow
        fill(0, 0, 0, 100);
        noStroke();
        rect(buttonX - buttonWidth - 10 + 2, buttonY - buttonHeight/2 + 2, buttonWidth, buttonHeight, 8);
        
        // Draw button with hover effect
        fill(isHovering ? 69, 160, 73 : 76, 175, 80);
        stroke(255);
        strokeWeight(2);
        rect(buttonX - buttonWidth - 10, buttonY - buttonHeight/2, buttonWidth, buttonHeight, 8);
        
        // Draw button text
        fill(255);
        textAlign(CENTER, CENTER);
        textSize(12);
        textStyle(BOLD);
        text('Ask for Cards', buttonX - buttonWidth/2 - 10, buttonY);
    }
    
    // Go Fish button
    // Check if mouse is hovering over button
    const isHoveringFish = mouseX >= buttonX + 10 && mouseX <= buttonX + 10 + buttonWidth &&
                          mouseY >= buttonY - buttonHeight/2 && mouseY <= buttonY + buttonHeight/2;
    
    // Change cursor
    if (isHoveringFish) {
        cursor(HAND);
    }
    
    // Draw button shadow
    fill(0, 0, 0, 100);
    noStroke();
    rect(buttonX + 10 + 2, buttonY - buttonHeight/2 + 2, buttonWidth, buttonHeight, 8);
    
    // Draw button with hover effect
    fill(isHoveringFish ? 25, 118, 210 : 33, 150, 243);
    stroke(255);
    strokeWeight(2);
    rect(buttonX + 10, buttonY - buttonHeight/2, buttonWidth, buttonHeight, 8);
    
    // Draw button text
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(12);
    textStyle(BOLD);
    text('🐟 Go Fish!', buttonX + buttonWidth/2 + 10, buttonY);
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
    
    const buttonY = height - 40;
    const buttonX = width / 2;
    const buttonWidth = 120;
    const buttonHeight = 35;
    
    // Check if Ask for Cards button was clicked
    if (mouseX >= buttonX - buttonWidth - 10 && mouseX <= buttonX - 10 &&
        mouseY >= buttonY - buttonHeight/2 && mouseY <= buttonY + buttonHeight/2) {
        console.log('🎯 Ask for Cards button clicked');
        // TODO: Implement ask for cards logic
        showAskForCardsDialog();
    }
    
    // Check if Go Fish button was clicked
    if (mouseX >= buttonX + 10 && mouseX <= buttonX + 10 + buttonWidth &&
        mouseY >= buttonY - buttonHeight/2 && mouseY <= buttonY + buttonHeight/2) {
        console.log('🐟 Go Fish button clicked');
        // TODO: Implement go fish logic
        if (window.goFishClient) {
            window.goFishClient.goFish();
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
    
    // Add test button for debugging
    const testButton = document.createElement('button');
    testButton.textContent = 'Test Start Game';
    testButton.style.cssText = 'position: fixed; top: 10px; right: 10px; z-index: 9999; background: #ff6b6b; color: white; border: none; padding: 10px; border-radius: 5px; cursor: pointer;';
    testButton.onclick = function() {
        console.log('🧪 Test: Starting Go Fish game manually');
        window.goFishClient.startGame();
    };
    document.body.appendChild(testButton);
    
    // Auto-start game after 2 seconds for testing
    setTimeout(() => {
        console.log('🧪 Auto-starting Go Fish game for testing');
        window.goFishClient.startGame();
    }, 2000);
    
    // Add restart button
    const restartButton = document.createElement('button');
    restartButton.textContent = 'Restart Game';
    restartButton.style.cssText = 'position: fixed; top: 10px; right: 150px; z-index: 9999; background: #ff9800; color: white; border: none; padding: 10px; border-radius: 5px; cursor: pointer;';
    restartButton.onclick = function() {
        console.log('🔄 Restarting Go Fish game');
        window.goFishClient.startGame();
    };
    document.body.appendChild(restartButton);
});
