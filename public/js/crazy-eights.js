// 🎯 CRAZY EIGHTS GAME LOGIC

class CrazyEightsGame {
    constructor() {
        this.deck = [];
        this.players = [];
        this.currentPlayer = 0;
        this.gamePhase = 'playing'; // playing, finished
        this.discardPile = [];
        this.drawPile = [];
        this.currentSuit = null;
        this.currentRank = null;
        this.gameOver = false;
        this.winner = null;
        this.selectedCard = null;
    }

    // Initialize the game
    initialize(players) {
        this.players = players.map((player, index) => ({
            ...player,
            hand: [],
            position: index
        }));
        
        this.deck = CardUtils.createStandardDeck();
        this.discardPile = [];
        this.drawPile = [];
        this.currentSuit = null;
        this.currentRank = null;
        this.gameOver = false;
        this.winner = null;
        this.selectedCard = null;
        
        console.log('🎯 Crazy Eights game initialized with', this.players.length, 'players');
        
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
        console.log('🎯 Starting new Crazy Eights game');
        
        // Reset all hands
        this.players.forEach(player => {
            player.hand = [];
        });
        
        this.discardPile = [];
        this.drawPile = [];
        this.gameOver = false;
        this.winner = null;
        this.selectedCard = null;
        
        // Shuffle deck
        this.deck = CardUtils.shuffleDeck(this.deck);
        
        // Deal cards
        this.dealCards();
        
        // Start discard pile
        this.startDiscardPile();
        
        this.emitEvent('gameStarted', {
            players: this.players.map(p => ({ name: p.name, hand: p.hand })),
            discardPile: this.discardPile,
            drawPile: this.drawPile,
            currentPlayer: this.currentPlayer
        });
    }

    // Deal cards to all players
    dealCards() {
        // Deal 7 cards to each player
        for (let i = 0; i < 7; i++) {
            for (let player of this.players) {
                if (this.deck.length > 0) {
                    player.hand.push(this.deck.pop());
                }
            }
        }
        
        // Remaining cards go to draw pile
        this.drawPile = [...this.deck];
        this.deck = [];
        
        console.log(`🃏 Dealt 7 cards to each player, ${this.drawPile.length} cards in draw pile`);
    }

    // Start the discard pile
    startDiscardPile() {
        // Find a non-8 card to start
        let startCard = null;
        for (let i = 0; i < this.drawPile.length; i++) {
            if (this.drawPile[i].rank !== '8') {
                startCard = this.drawPile.splice(i, 1)[0];
                break;
            }
        }
        
        if (!startCard) {
            // If all cards are 8s, just use the first one
            startCard = this.drawPile.pop();
        }
        
        this.discardPile = [startCard];
        this.currentSuit = startCard.suit;
        this.currentRank = startCard.rank;
        
        console.log(`🎯 Started discard pile with ${startCard.name}`);
    }

    // Check if a card can be played
    canPlayCard(card) {
        // 8s can always be played
        if (card.rank === '8') {
            return true;
        }
        
        // Must match suit or rank
        return card.suit === this.currentSuit || card.rank === this.currentRank;
    }

    // Get playable cards for a player
    getPlayableCards(player) {
        return player.hand.filter(card => this.canPlayCard(card));
    }

    // Player plays a card
    playCard(playerIndex, cardIndex) {
        const player = this.players[playerIndex];
        if (!player || this.currentPlayer !== playerIndex || this.gameOver) {
            return false;
        }
        
        if (cardIndex < 0 || cardIndex >= player.hand.length) {
            return false;
        }
        
        const card = player.hand[cardIndex];
        
        // Check if card can be played
        if (!this.canPlayCard(card)) {
            return false;
        }
        
        // Remove card from hand
        player.hand.splice(cardIndex, 1);
        
        // Add to discard pile
        this.discardPile.push(card);
        
        // Update current suit and rank
        if (card.rank === '8') {
            // 8 was played - need to choose suit
            this.emitEvent('eightPlayed', {
                player: player.name,
                card: card,
                players: this.players.map(p => ({ name: p.name, hand: p.hand })),
                discardPile: this.discardPile,
                drawPile: this.drawPile
            });
            return true;
        } else {
            // Regular card played
            this.currentSuit = card.suit;
            this.currentRank = card.rank;
            
            console.log(`🎯 ${player.name} plays ${card.name}`);
            
            // Check if player won
            if (player.hand.length === 0) {
                this.endGame(player);
                return true;
            }
            
            // Move to next player
            this.nextPlayer();
            
            this.emitEvent('cardPlayed', {
                player: player.name,
                card: card,
                currentSuit: this.currentSuit,
                currentRank: this.currentRank,
                players: this.players.map(p => ({ name: p.name, hand: p.hand })),
                discardPile: this.discardPile,
                drawPile: this.drawPile,
                currentPlayer: this.currentPlayer
            });
            
            return true;
        }
    }

    // Player chooses suit after playing an 8
    chooseSuit(playerIndex, suit) {
        const player = this.players[playerIndex];
        if (!player || this.currentPlayer !== playerIndex) {
            return false;
        }
        
        this.currentSuit = suit;
        this.currentRank = null; // 8 overrides rank
        
        console.log(`🎯 ${player.name} chooses ${suit} as the new suit`);
        
        // Check if player won
        if (player.hand.length === 0) {
            this.endGame(player);
            return true;
        }
        
        // Move to next player
        this.nextPlayer();
        
        this.emitEvent('suitChosen', {
            player: player.name,
            suit: suit,
            currentSuit: this.currentSuit,
            players: this.players.map(p => ({ name: p.name, hand: p.hand })),
            discardPile: this.discardPile,
            drawPile: this.drawPile,
            currentPlayer: this.currentPlayer
        });
        
        return true;
    }

    // Player draws a card
    drawCard(playerIndex) {
        const player = this.players[playerIndex];
        if (!player || this.currentPlayer !== playerIndex || this.gameOver) {
            return false;
        }
        
        if (this.drawPile.length === 0) {
            // Reshuffle discard pile (except top card) into draw pile
            if (this.discardPile.length > 1) {
                const topCard = this.discardPile.pop();
                this.drawPile = CardUtils.shuffleDeck([...this.discardPile]);
                this.discardPile = [topCard];
            } else {
                // No cards to draw
                return false;
            }
        }
        
        const drawnCard = this.drawPile.pop();
        player.hand.push(drawnCard);
        
        console.log(`🎯 ${player.name} draws a card`);
        
        // Check if drawn card can be played
        const canPlay = this.canPlayCard(drawnCard);
        
        this.emitEvent('cardDrawn', {
            player: player.name,
            drawnCard: drawnCard,
            canPlay: canPlay,
            players: this.players.map(p => ({ name: p.name, hand: p.hand })),
            discardPile: this.discardPile,
            drawPile: this.drawPile,
            currentPlayer: this.currentPlayer
        });
        
        // If can't play, move to next player
        if (!canPlay) {
            this.nextPlayer();
            this.emitEvent('turnChanged', {
                currentPlayer: this.currentPlayer,
                players: this.players.map(p => ({ name: p.name, hand: p.hand }))
            });
        }
        
        return true;
    }

    // Move to next player
    nextPlayer() {
        this.currentPlayer = (this.currentPlayer + 1) % this.players.length;
    }

    // End the game
    endGame(winner) {
        console.log('🏆 Game over!');
        this.gameOver = true;
        this.winner = winner;
        
        this.emitEvent('gameOver', {
            winner: {
                name: winner.name,
                cards: winner.hand.length
            },
            finalScores: this.players.map(p => ({ name: p.name, cards: p.hand.length }))
        });
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
            discardPile: this.discardPile,
            drawPile: this.drawPile,
            currentSuit: this.currentSuit,
            currentRank: this.currentRank,
            gameOver: this.gameOver,
            winner: this.winner
        };
    }
}

// 🎮 CRAZY EIGHTS CLIENT LOGIC
class CrazyEightsClient {
    constructor() {
        this.game = new CrazyEightsGame();
        this.localPlayerIndex = 0;
        this.isMyTurn = false;
        this.canAct = false;
        this.selectedCardIndex = null;
        this.waitingForSuitChoice = false;
    }

    // Initialize the client
    initialize() {
        console.log('🎮 Initializing Crazy Eights client');
        
        // Check if dependencies are available
        console.log('🔍 Checking dependencies:');
        console.log('  - GameFramework:', typeof GameFramework);
        console.log('  - CardUtils:', typeof CardUtils);
        console.log('  - UIUtils:', typeof UIUtils);
        console.log('  - window.gameFramework:', typeof window.gameFramework);
        
        // Initialize game framework
        if (typeof GameFramework !== 'undefined') {
            GameFramework.initialize('crazy-eights');
            console.log('✅ GameFramework initialized');
        } else {
            console.error('❌ GameFramework not available');
        }
        
        // Setup UI event listeners
        this.setupUI();
        
        // Setup socket event listeners
        this.setupSocketListeners();
        
        console.log('✅ Crazy Eights client initialized');
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
        document.getElementById('playBtn').onclick = () => this.playCard();
        document.getElementById('drawBtn').onclick = () => this.drawCard();
        document.getElementById('drawPile').onclick = () => this.drawCard();
        
        // Suit selector
        document.querySelectorAll('.suit-selector button').forEach(button => {
            button.onclick = () => this.chooseSuit(button.dataset.suit);
        });
        
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
        
        socket.on('cardPlayed', (data) => {
            this.updateCardPlayed(data);
        });
        
        socket.on('eightPlayed', (data) => {
            this.updateEightPlayed(data);
        });
        
        socket.on('suitChosen', (data) => {
            this.updateSuitChosen(data);
        });
        
        socket.on('cardDrawn', (data) => {
            this.updateCardDrawn(data);
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
            GameFramework.createRoom('crazy-eights');
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
                GameFramework.createRoom('crazy-eights');
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

    // Play card
    playCard() {
        if (!this.canAct || !this.isMyTurn || this.selectedCardIndex === null) {
            return;
        }
        
        const socket = window.gameFramework.socket;
        socket.emit('playCard', {
            roomId: window.gameFramework.roomId,
            playerIndex: this.localPlayerIndex,
            cardIndex: this.selectedCardIndex
        });
        
        this.selectedCardIndex = null;
        this.canAct = false;
        this.hideActionControls();
    }

    // Draw card
    drawCard() {
        if (!this.canAct || !this.isMyTurn) {
            return;
        }
        
        const socket = window.gameFramework.socket;
        socket.emit('drawCard', {
            roomId: window.gameFramework.roomId,
            playerIndex: this.localPlayerIndex
        });
        
        this.canAct = false;
        this.hideActionControls();
    }

    // Choose suit
    chooseSuit(suit) {
        if (!this.waitingForSuitChoice) {
            return;
        }
        
        const socket = window.gameFramework.socket;
        socket.emit('chooseSuit', {
            roomId: window.gameFramework.roomId,
            playerIndex: this.localPlayerIndex,
            suit: suit
        });
        
        this.waitingForSuitChoice = false;
        this.hideSuitSelector();
    }

    // Update card played
    updateCardPlayed(data) {
        this.game.players = data.players;
        this.game.discardPile = data.discardPile;
        this.game.drawPile = data.drawPile;
        this.game.currentSuit = data.currentSuit;
        this.game.currentRank = data.currentRank;
        this.game.currentPlayer = data.currentPlayer;
        
        this.isMyTurn = (data.currentPlayer === this.localPlayerIndex);
        this.updateUI();
        
        UIUtils.showGameMessage(`${data.player} plays ${data.card.name}`, 'info');
    }

    // Update eight played
    updateEightPlayed(data) {
        this.game.players = data.players;
        this.game.discardPile = data.discardPile;
        this.game.drawPile = data.drawPile;
        
        this.waitingForSuitChoice = (data.player === this.game.players[this.localPlayerIndex].name);
        this.updateUI();
        
        if (this.waitingForSuitChoice) {
            this.showSuitSelector();
        }
        
        UIUtils.showGameMessage(`${data.player} plays ${data.card.name} - choose a suit!`, 'warning');
    }

    // Update suit chosen
    updateSuitChosen(data) {
        this.game.players = data.players;
        this.game.discardPile = data.discardPile;
        this.game.drawPile = data.drawPile;
        this.game.currentSuit = data.currentSuit;
        this.game.currentPlayer = data.currentPlayer;
        
        this.isMyTurn = (data.currentPlayer === this.localPlayerIndex);
        this.updateUI();
        
        UIUtils.showGameMessage(`${data.player} chooses ${data.suit}`, 'info');
    }

    // Update card drawn
    updateCardDrawn(data) {
        this.game.players = data.players;
        this.game.discardPile = data.discardPile;
        this.game.drawPile = data.drawPile;
        this.game.currentPlayer = data.currentPlayer;
        
        this.isMyTurn = (data.currentPlayer === this.localPlayerIndex);
        this.updateUI();
        
        UIUtils.showGameMessage(`${data.player} draws a card`, 'info');
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
        UIUtils.showGameMessage(`🏆 ${data.winner.name} wins!`, 'success');
        this.updateUI();
        this.hideActionControls();
    }

    // Update UI
    updateUI() {
        this.updateGameInfo();
        this.updateScores();
        this.updateDiscardPile();
        this.updateDrawPile();
        this.updatePlayerAreas();
        this.updateControls();
    }

    // Update game info
    updateGameInfo() {
        document.getElementById('currentPlayerName').textContent = this.game.players[this.game.currentPlayer]?.name || '-';
        document.getElementById('drawPileCount').textContent = this.game.drawPile.length;
        document.getElementById('drawPileCards').textContent = this.game.drawPile.length;
        
        const localPlayer = this.game.players[this.localPlayerIndex];
        if (localPlayer) {
            document.getElementById('playerCardCount').textContent = localPlayer.hand.length;
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
                <td>${player.hand.length}</td>
            `;
            scoresBody.appendChild(row);
        });
    }

    // Update discard pile
    updateDiscardPile() {
        const discardPile = document.getElementById('discardPile');
        discardPile.innerHTML = '';
        
        if (this.game.discardPile.length > 0) {
            const topCard = this.game.discardPile[this.game.discardPile.length - 1];
            const cardDiv = document.createElement('div');
            cardDiv.className = 'discard-card';
            cardDiv.textContent = topCard.name;
            discardPile.appendChild(cardDiv);
        }
    }

    // Update draw pile
    updateDrawPile() {
        const drawPile = document.getElementById('drawPile');
        const drawPileCards = document.getElementById('drawPileCards');
        drawPileCards.textContent = this.game.drawPile.length;
        
        if (this.game.drawPile.length === 0) {
            drawPile.style.display = 'none';
        } else {
            drawPile.style.display = 'flex';
        }
    }

    // Update player areas
    updatePlayerAreas() {
        // This would update the visual representation of players
        // For now, just log the state
        console.log('Players:', this.game.players.map(p => ({
            name: p.name,
            hand: p.hand.length
        })));
    }

    // Update controls
    updateControls() {
        if (this.isMyTurn && !this.waitingForSuitChoice) {
            this.showActionControls();
            this.updatePlayableCards();
        } else {
            this.hideActionControls();
        }
    }

    // Update playable cards
    updatePlayableCards() {
        const localPlayer = this.game.players[this.localPlayerIndex];
        if (!localPlayer) return;
        
        const playableCards = this.game.getPlayableCards(localPlayer);
        
        // This would update the visual representation of cards
        // For now, just log the playable cards
        console.log('Playable cards:', playableCards.map(c => c.name));
    }

    // Show action controls
    showActionControls() {
        document.getElementById('actionControls').style.display = 'flex';
    }

    // Hide action controls
    hideActionControls() {
        document.getElementById('actionControls').style.display = 'none';
    }

    // Show suit selector
    showSuitSelector() {
        document.getElementById('suitSelector').style.display = 'flex';
    }

    // Hide suit selector
    hideSuitSelector() {
        document.getElementById('suitSelector').style.display = 'none';
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
        console.log('🔄 Resetting Crazy Eights client state...');
        this.localPlayerIndex = 0;
        this.isMyTurn = false;
        this.canAct = false;
        this.game = new CrazyEightsGame();
        console.log('✅ Crazy Eights client state reset');
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    window.crazyEightsClient = new CrazyEightsClient();
    window.crazyEightsClient.initialize();
});
