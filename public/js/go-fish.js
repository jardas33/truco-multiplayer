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
        
        // Shuffle deck
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
        if (data) {
            this.game.initialize(data.players);
            this.localPlayerIndex = data.localPlayerIndex;
        }
        
        UIUtils.showGame();
    }

    // Ask for cards
    askForCards() {
        if (!this.canAct || !this.isMyTurn) {
            return;
        }
        
        const targetPlayerIndex = parseInt(document.getElementById('targetPlayerSelect').value);
        const rank = document.getElementById('rankSelect').value;
        
        if (!targetPlayerIndex || !rank) {
            UIUtils.showGameMessage('Please select a player and rank', 'error');
            return;
        }
        
        const socket = window.gameFramework.socket;
        socket.emit('askForCards', {
            roomId: window.gameFramework.roomId,
            playerIndex: this.localPlayerIndex,
            targetPlayerIndex: targetPlayerIndex,
            rank: rank
        });
    }

    // Go fish
    goFish() {
        if (!this.canAct || !this.isMyTurn) {
            return;
        }
        
        const socket = window.gameFramework.socket;
        socket.emit('goFish', {
            roomId: window.gameFramework.roomId,
            playerIndex: this.localPlayerIndex
        });
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
        return;
    }
    
    console.log('🎨 Drawing Go Fish game state');
    
    // Clear canvas with ocean-like background
    background(0, 50, 100); // Dark blue ocean
    
    // Draw game elements
    drawGoFishTable();
    drawPlayers();
    drawPond();
    drawGameInfo();
}

function drawGoFishTable() {
    // Draw table outline
    stroke(0, 100, 150);
    strokeWeight(8);
    noFill();
    rect(50, 50, width - 100, height - 100, 20);
    
    // Draw table surface
    fill(0, 80, 120, 100);
    noStroke();
    rect(60, 60, width - 120, height - 120, 15);
}

function drawPlayers() {
    if (!window.game.players) return;
    
    const playerY = height * 0.2;
    const playerWidth = 150;
    const spacing = (width - playerWidth * window.game.players.length) / (window.game.players.length + 1);
    
    window.game.players.forEach((player, index) => {
        const playerX = spacing + index * (playerWidth + spacing);
        
        // Draw player area
        fill(0, 0, 0, 150);
        stroke(255);
        strokeWeight(2);
        rect(playerX, playerY - 40, playerWidth, 80, 10);
        
        // Highlight current player
        if (index === window.game.currentPlayer) {
            stroke(255, 255, 0);
            strokeWeight(4);
            noFill();
            rect(playerX - 5, playerY - 45, playerWidth + 10, 90, 15);
        }
        
        // Draw player name
        fill(255);
        textAlign(CENTER, CENTER);
        textSize(12);
        text(player.name, playerX + playerWidth/2, playerY - 20);
        
        // Draw cards count
        textSize(10);
        text(`Cards: ${player.hand ? player.hand.length : 0}`, playerX + playerWidth/2, playerY);
        
        // Draw sets count
        text(`Sets: ${player.sets ? player.sets.length : 0}`, playerX + playerWidth/2, playerY + 15);
        
        // Draw player cards (small representation)
        if (player.hand && player.hand.length > 0) {
            drawPlayerCards(playerX + playerWidth/2, playerY + 30, player.hand, 20, 28);
        }
    });
}

function drawPlayerCards(centerX, centerY, cards, cardWidth, cardHeight) {
    if (!cards || cards.length === 0) return;
    
    const maxCards = 8; // Show max 8 cards
    const cardsToShow = cards.slice(0, maxCards);
    const spacing = 5;
    const totalWidth = (cardsToShow.length - 1) * (cardWidth + spacing);
    const startX = centerX - totalWidth / 2;
    
    cardsToShow.forEach((card, index) => {
        const x = startX + index * (cardWidth + spacing);
        const y = centerY - cardHeight / 2;
        
        // Draw card
        fill(255);
        stroke(0);
        strokeWeight(1);
        rect(x, y, cardWidth, cardHeight, 3);
        
        // Draw card content
        fill(0);
        textAlign(CENTER, CENTER);
        textSize(6);
        text(card.name, x + cardWidth/2, y + cardHeight/2);
    });
    
    // Show "+X more" if there are more cards
    if (cards.length > maxCards) {
        fill(255);
        textAlign(CENTER, CENTER);
        textSize(8);
        text(`+${cards.length - maxCards}`, centerX, centerY + 20);
    }
}

function drawPond() {
    const centerX = width / 2;
    const pondY = height * 0.6;
    
    // Draw pond area
    fill(0, 0, 0, 150);
    stroke(255);
    strokeWeight(2);
    rect(centerX - 200, pondY - 50, 400, 100, 10);
    
    // Draw pond label
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(16);
    text('Pond', centerX, pondY - 30);
    
    // Draw cards in pond
    if (window.game.pond && window.game.pond.length > 0) {
        drawCards(centerX, pondY + 10, window.game.pond, 40, 56, false);
    } else {
        textSize(12);
        text('No cards in pond', centerX, pondY + 10);
    }
}

function drawCards(centerX, centerY, cards, cardWidth, cardHeight, showCards) {
    if (!cards || cards.length === 0) return;
    
    const spacing = 10;
    const maxVisible = Math.min(cards.length, 5);
    const totalWidth = (maxVisible - 1) * (cardWidth + spacing);
    const startX = centerX - totalWidth / 2;
    
    for (let i = 0; i < maxVisible; i++) {
        const x = startX + i * (cardWidth + spacing);
        const y = centerY - cardHeight / 2;
        
        // Draw card
        fill(255);
        stroke(0);
        strokeWeight(2);
        rect(x, y, cardWidth, cardHeight, 5);
        
        if (showCards && cards[i].name) {
            // Draw card content
            fill(0);
            textAlign(CENTER, CENTER);
            textSize(8);
            text(cards[i].name, x + cardWidth/2, y + cardHeight/2);
        } else {
            // Draw card back
            fill(0, 0, 150);
            textAlign(CENTER, CENTER);
            textSize(8);
            text('?', x + cardWidth/2, y + cardHeight/2);
        }
    }
    
    // Show count if more than 5 cards
    if (cards.length > 5) {
        fill(255);
        textAlign(CENTER, CENTER);
        textSize(12);
        text(`+${cards.length - 5}`, centerX, centerY + 40);
    }
}

function drawGameInfo() {
    // Draw game phase
    fill(255);
    textAlign(LEFT, TOP);
    textSize(14);
    text(`Phase: ${window.game.gamePhase || 'playing'}`, 20, 20);
    
    // Draw current player info
    if (window.game.currentPlayer !== undefined && window.game.players[window.game.currentPlayer]) {
        const currentPlayer = window.game.players[window.game.currentPlayer];
        text(`Current Player: ${currentPlayer.name}`, 20, 40);
    }
    
    // Draw winner if game is over
    if (window.game.gameOver && window.game.winner) {
        fill(255, 255, 0);
        textAlign(CENTER, CENTER);
        textSize(24);
        text(`Winner: ${window.game.winner.name}!`, width/2, height/2);
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    window.goFishClient = new GoFishClient();
    window.goFishClient.initialize();
});
