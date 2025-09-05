// BLACKJACK GAME LOGIC

class BlackjackGame {
    constructor() {
        this.deck = [];
        this.dealer = {
            hand: [],
            value: 0,
            isBusted: false,
            hasBlackjack: false
        };
        this.players = [];
        this.currentPlayer = 0;
        this.gamePhase = 'betting'; // betting, dealing, playing, dealer, finished
        this.roundNumber = 1;
        this.minBet = 5;
        this.maxBet = 1000;
    }

    // Initialize the game
    initialize(players) {
        this.players = players.map(player => ({
            ...player,
            hand: [],
            value: 0,
            bet: 0,
            chips: player.startingChips || 1000,
            isBusted: false,
            hasBlackjack: false,
            isStanding: false,
            canDouble: false,
            canSplit: false,
            splitHand: null,
            insurance: 0
        }));
        
        this.deck = CardUtils.createStandardDeck();
        this.dealer = {
            hand: [],
            value: 0,
            isBusted: false,
            hasBlackjack: false
        };
        
        this.gamePhase = 'betting';
        this.currentPlayer = 0;
        this.roundNumber = 1;
        
        console.log('Blackjack game initialized with', this.players.length, 'players');
        
        this.emitEvent('gameInitialized', {
            players: this.players,
            gamePhase: this.gamePhase,
            roundNumber: this.roundNumber
        });
    }

    // Start a new round
    startNewRound() {
        console.log('Starting round ' + this.roundNumber);
        
        // Reset all players
        this.players.forEach(player => {
            player.hand = [];
            player.value = 0;
            player.bet = 0;
            player.isBusted = false;
            player.hasBlackjack = false;
            player.isStanding = false;
            player.canDouble = false;
            player.canSplit = false;
            player.splitHand = null;
            player.insurance = 0;
        });
        
        // Reset dealer
        this.dealer = {
            hand: [],
            value: 0,
            isBusted: false,
            hasBlackjack: false
        };
        
        this.gamePhase = 'betting';
        this.currentPlayer = 0;
        
        this.emitEvent('roundStarted', {
            roundNumber: this.roundNumber,
            gamePhase: this.gamePhase
        });
    }

    // Place a bet
    placeBet(playerIndex, amount) {
        const player = this.players[playerIndex];
        if (!player || this.gamePhase !== 'betting') {
            return false;
        }
        
        if (amount < this.minBet || amount > this.maxBet) {
            return false;
        }
        
        if (amount > player.chips) {
            return false;
        }
        
        player.bet = amount;
        player.chips -= amount;
        
        console.log('Player ' + player.name + ' bets $' + amount);
        
        this.emitEvent('betPlaced', {
            playerIndex: playerIndex,
            amount: amount,
            player: player
        });
        
        return true;
    }

    // Deal initial cards
    dealInitialCards() {
        console.log('Dealing initial cards');
        this.gamePhase = 'dealing';
        
        // Deal 2 cards to each player
        for (let i = 0; i < 2; i++) {
            this.players.forEach(player => {
                if (player.bet > 0) {
                    this.dealCard(player);
                }
            });
        }
        
        // Deal 2 cards to dealer (one face down)
        this.dealCard(this.dealer, true);
        this.dealCard(this.dealer, false);
        
        // Check for blackjacks
        this.checkBlackjacks();
        
        this.gamePhase = 'playing';
        this.currentPlayer = 0;
        
        this.emitEvent('cardsDealt', {
            players: this.players,
            dealer: this.dealer,
            gamePhase: this.gamePhase
        });
    }

    // Check for blackjacks
    checkBlackjacks() {
        // Check dealer blackjack
        if (this.dealer.value === 21) {
            this.dealer.hasBlackjack = true;
            console.log('Dealer has blackjack!');
        }
        
        // Check player blackjacks
        this.players.forEach(player => {
            if (player.value === 21) {
                player.hasBlackjack = true;
                console.log('Player ' + player.name + ' has blackjack!');
            }
        });
    }

    // Deal a card
    dealCard(target, isFaceDown = false) {
        if (this.deck.length === 0) {
            this.deck = CardUtils.createStandardDeck();
            CardUtils.shuffleDeck(this.deck);
        }
        
        const card = this.deck.pop();
        target.hand.push(card);
        
        // Calculate new value
        this.calculateValue(target);
        
        console.log('Dealt ' + card.name + ' to ' + (target.name || 'dealer'));
        return card;
    }

    // Calculate hand value
    calculateValue(target) {
        let value = 0;
        let aces = 0;
        
        target.hand.forEach(card => {
            if (card.value === 1) {
                aces++;
                value += 11;
            } else if (card.value >= 11) {
                value += 10;
            } else {
                value += card.value;
            }
        });
        
        // Adjust for aces
        while (value > 21 && aces > 0) {
            value -= 10;
            aces--;
        }
        
        target.value = value;
        
        // Check for bust
        if (value > 21) {
            target.isBusted = true;
        }
    }

    // Player action (hit, stand, double, split)
    playerAction(playerIndex, action) {
        const player = this.players[playerIndex];
        if (!player || this.gamePhase !== 'playing') {
            return false;
        }
        
        if (player.isBusted || player.isStanding || player.hasBlackjack) {
            return false;
        }
        
        console.log('Player ' + player.name + ' ' + action + 's');
        
        switch (action) {
            case 'hit':
                this.dealCard(player);
                if (player.isBusted) {
                    console.log('Player ' + player.name + ' busted!');
                    this.nextPlayer();
                }
                break;
                
            case 'stand':
                player.isStanding = true;
                this.nextPlayer();
                break;
                
            case 'double':
                if (player.canDouble && player.chips >= player.bet) {
                    player.chips -= player.bet;
                    player.bet *= 2;
                    this.dealCard(player);
                    player.isStanding = true;
                    this.nextPlayer();
                }
                break;
                
            case 'split':
                if (player.canSplit && player.chips >= player.bet) {
                    // Implement split logic here
                    player.chips -= player.bet;
                    // This is a simplified version
                    player.isStanding = true;
                    this.nextPlayer();
                }
                break;
        }
        
        this.emitEvent('playerAction', {
            playerIndex: playerIndex,
            action: action,
            player: player,
            gamePhase: this.gamePhase
        });
        
        return true;
    }

    // Move to next player
    nextPlayer() {
        do {
            this.currentPlayer = (this.currentPlayer + 1) % this.players.length;
        } while (this.players[this.currentPlayer].isBusted || 
                 this.players[this.currentPlayer].isStanding || 
                 this.players[this.currentPlayer].hasBlackjack ||
                 this.players[this.currentPlayer].bet === 0);
        
        // If all players are done, dealer's turn
        if (this.currentPlayer === 0) {
            this.dealerTurn();
        }
        
        this.emitEvent('turnChanged', {
            currentPlayer: this.currentPlayer,
            gamePhase: this.gamePhase
        });
    }

    // Dealer's turn
    dealerTurn() {
        console.log('Dealer\'s turn');
        this.gamePhase = 'dealer';
        
        // Show dealer's hole card
        this.emitEvent('dealerTurn', {
            dealer: this.dealer,
            gamePhase: this.gamePhase
        });
        
        // Dealer hits until 17 or bust
        while (this.dealer.value < 17) {
            this.dealCard(this.dealer);
        }
        
        if (this.dealer.value > 21) {
            this.dealer.isBusted = true;
            console.log('Dealer busted!');
        }
        
        this.determineWinners();
    }

    // Determine winners
    determineWinners() {
        console.log('Determining winners');
        this.gamePhase = 'finished';
        
        this.players.forEach(player => {
            if (player.bet === 0) return;
            
            let winnings = 0;
            
            if (player.isBusted) {
                // Player busted, dealer wins
                winnings = 0;
            } else if (this.dealer.isBusted) {
                // Dealer busted, player wins
                if (player.hasBlackjack) {
                    winnings = player.bet * 2.5; // 3:2 payout for blackjack
                } else {
                    winnings = player.bet * 2; // 1:1 payout
                }
            } else if (player.hasBlackjack && !this.dealer.hasBlackjack) {
                // Player blackjack beats dealer
                winnings = player.bet * 2.5; // 3:2 payout
            } else if (this.dealer.hasBlackjack && !player.hasBlackjack) {
                // Dealer blackjack beats player
                winnings = 0;
            } else if (player.value > this.dealer.value) {
                // Player wins
                if (player.hasBlackjack) {
                    winnings = player.bet * 2.5; // 3:2 payout for blackjack
                } else {
                    winnings = player.bet * 2; // 1:1 payout
                }
            } else if (player.value === this.dealer.value) {
                // Push
                winnings = player.bet;
            } else {
                // Dealer wins
                winnings = 0;
            }
            
            player.chips += winnings;
            player.winnings = winnings;
        });
        
        this.emitEvent('roundFinished', {
            players: this.players,
            dealer: this.dealer,
            gamePhase: this.gamePhase
        });
        
        // Start next round after a delay
        setTimeout(() => {
            this.roundNumber++;
            this.startNewRound();
        }, 3000);
    }

    // Emit event to server
    emitEvent(eventName, data) {
        if (window.gameFramework.socket) {
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
            dealer: this.dealer,
            currentPlayer: this.currentPlayer,
            gamePhase: this.gamePhase,
            roundNumber: this.roundNumber
        };
    }
}

// BLACKJACK CLIENT LOGIC
class BlackjackClient {
    constructor() {
        this.game = new BlackjackGame();
        this.localPlayerIndex = 0;
        this.isMyTurn = false;
        this.canAct = false;
    }

    // Initialize the client
    initialize() {
        console.log('Initializing Blackjack client');
        
        // Check if dependencies are available
        console.log('Checking dependencies:');
        console.log('  - GameFramework:', typeof GameFramework);
        console.log('  - CardUtils:', typeof CardUtils);
        
        if (typeof GameFramework !== 'undefined') {
            GameFramework.initialize('blackjack');
            console.log('SUCCESS: GameFramework initialized');
        } else {
            console.error('ERROR: GameFramework not available');
        }
        
        // Setup UI event listeners
        this.setupUI();
        
        // Setup socket event listeners
        this.setupSocketListeners();
        
        console.log('SUCCESS: Blackjack client initialized');
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
        document.getElementById('hitBtn').onclick = () => this.playerAction('hit');
        document.getElementById('standBtn').onclick = () => this.playerAction('stand');
        document.getElementById('doubleBtn').onclick = () => this.playerAction('double');
        document.getElementById('splitBtn').onclick = () => this.playerAction('split');
        
        // Copy room code
        document.getElementById('copyRoomCodeBtn').onclick = () => this.copyRoomCode();
    }

    // Setup socket event listeners
    setupSocketListeners() {
        const socket = window.gameFramework.socket;
        
        socket.on('roomCreated', (data) => {
            console.log('Room created:', data);
            const roomCode = data.roomId || data;
            this.showRoomCode(roomCode);
            this.showPlayerCustomization();
            this.showGameControls();
        });
        
        socket.on('roomJoined', (data) => {
            console.log('Room joined:', data);
            this.localPlayerIndex = data.playerIndex;
            this.showPlayerCustomization();
            this.showGameControls();
        });
        
        socket.on('gameStarted', (data) => {
            console.log('Game started:', data);
            this.startGame(data);
        });
        
        socket.on('gameState', (data) => {
            this.updateGameState(data);
        });
        
        socket.on('betPlaced', (data) => {
            this.updateBetPlaced(data);
        });
        
        socket.on('cardsDealt', (data) => {
            this.updateCardsDealt(data);
        });
        
        socket.on('playerAction', (data) => {
            this.updatePlayerAction(data);
        });
        
        socket.on('dealerTurn', (data) => {
            this.updateDealerTurn(data);
        });
        
        socket.on('roundFinished', (data) => {
            this.updateRoundFinished(data);
        });
        
        // Error handling
        socket.on('error', (error) => {
            console.error('Socket error:', error);
            UIUtils.showGameMessage('Error: ' + error, 'error');
        });
    }

    // Create room
    createRoom() {
        console.log('Create Room button clicked');
        console.log('DEBUG: GameFramework type:', typeof GameFramework);
        console.log('DEBUG: GameFramework object:', GameFramework);
        console.log('DEBUG: GameFramework.createRoom:', GameFramework?.createRoom);
        console.log('DEBUG: window.gameFramework:', window.gameFramework);
        console.log('DEBUG: window.gameFramework.socket:', window.gameFramework?.socket);
        
        if (typeof GameFramework !== 'undefined' && GameFramework.createRoom && window.gameFramework?.socket) {
            console.log('SUCCESS: GameFramework and socket available, creating room immediately');
            GameFramework.createRoom('blackjack');
            return;
        }
        
        // If not available, wait and retry
        console.log('WAITING: GameFramework not ready, waiting...');
        let attempts = 0;
        const maxAttempts = 10;
        
        const tryCreateRoom = () => {
            attempts++;
            console.log('RETRY: Attempt ' + attempts + '/' + maxAttempts + ' to create room');
            console.log('  - GameFramework:', typeof GameFramework);
            console.log('  - GameFramework.createRoom:', GameFramework?.createRoom);
            console.log('  - window.gameFramework.socket:', window.gameFramework?.socket);
            
            if (typeof GameFramework !== 'undefined' && GameFramework.createRoom && window.gameFramework?.socket) {
                console.log('SUCCESS: GameFramework and socket now available, creating room');
                GameFramework.createRoom('blackjack');
                return;
            }
            
            if (attempts < maxAttempts) {
                setTimeout(tryCreateRoom, 200);
            } else {
                console.error('ERROR: GameFramework still not available after maximum attempts');
                if (typeof UIUtils !== 'undefined') {
                    UIUtils.showGameMessage('Game framework not ready. Please refresh the page.', 'error');
                }
            }
        };
        
        setTimeout(tryCreateRoom, 100);
    }

    // Join room
    joinRoom() {
        const roomCode = prompt('Enter room code:');
        if (roomCode) {
            window.gameFramework.socket.emit('joinRoom', { roomCode: roomCode });
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
        console.log('Starting game with data:', data);
        
        if (data && data.players) {
            this.game.initialize(data.players);
        } else {
            const roomPlayers = window.gameFramework.players || [];
            if (roomPlayers && roomPlayers.length > 0) {
                const gamePlayers = roomPlayers.map(player => ({
                    name: player.name,
                    startingChips: 1000,
                    isBot: player.isBot || false
                }));
                this.game.initialize(gamePlayers);
            } else {
                console.error('ERROR: No players available to start game');
                UIUtils.showGameMessage('No players available to start game. Please add players first.', 'error');
                return;
            }
        }
        
        // Start the game
        this.game.startNewRound();
        
        // Update game state
        if (typeof gameStateEnum !== 'undefined') {
            gameState = gameStateEnum.Playing;
            window.gameState = gameStateEnum.Playing;
        }
        
        // Set global game instance
        window.game = this.game;
        
        // Update UI
        this.updateUI();
    }

    // Update game state
    updateGameState(data) {
        this.game.players = data.players || this.game.players;
        this.game.dealer = data.dealer || this.game.dealer;
        this.game.currentPlayer = data.currentPlayer || this.game.currentPlayer;
        this.game.gamePhase = data.gamePhase || this.game.gamePhase;
        this.game.roundNumber = data.roundNumber || this.game.roundNumber;
        
        this.updateUI();
    }

    // Update bet placed
    updateBetPlaced(data) {
        this.game.players[data.playerIndex] = data.player;
        this.updateUI();
    }

    // Update cards dealt
    updateCardsDealt(data) {
        this.game.players = data.players;
        this.game.dealer = data.dealer;
        this.game.gamePhase = data.gamePhase;
        
        this.isMyTurn = (data.gamePhase === 'playing' && this.game.currentPlayer === this.localPlayerIndex);
        this.canAct = this.isMyTurn && !this.game.players[this.localPlayerIndex].isBusted && 
                     !this.game.players[this.localPlayerIndex].isStanding && 
                     !this.game.players[this.localPlayerIndex].hasBlackjack;
        
        this.updateUI();
        this.updateGameControls();
    }

    // Update player action
    updatePlayerAction(data) {
        this.game.players[data.playerIndex] = data.player;
        this.game.gamePhase = data.gamePhase;
        
        this.isMyTurn = (data.gamePhase === 'playing' && this.game.currentPlayer === this.localPlayerIndex);
        this.canAct = this.isMyTurn && !this.game.players[this.localPlayerIndex].isBusted && 
                     !this.game.players[this.localPlayerIndex].isStanding && 
                     !this.game.players[this.localPlayerIndex].hasBlackjack;
        
        this.updateUI();
        this.updateGameControls();
    }

    // Update dealer turn
    updateDealerTurn(data) {
        this.game.dealer = data.dealer;
        this.game.gamePhase = data.gamePhase;
        
        this.isMyTurn = false;
        this.canAct = false;
        
        this.updateUI();
        this.updateGameControls();
    }

    // Update round finished
    updateRoundFinished(data) {
        this.game.players = data.players;
        this.game.dealer = data.dealer;
        this.game.gamePhase = data.gamePhase;
        
        this.isMyTurn = false;
        this.canAct = false;
        
        this.updateUI();
        this.updateGameControls();
    }

    // Player action
    playerAction(action) {
        if (!this.canAct) {
            UIUtils.showGameMessage('It\'s not your turn', 'error');
            return;
        }
        
        const socket = window.gameFramework.socket;
        socket.emit('playerAction', {
            roomId: window.gameFramework.roomId,
            playerIndex: this.localPlayerIndex,
            action: action
        });
    }

    // Place bet
    placeBet(amount) {
        const socket = window.gameFramework.socket;
        socket.emit('placeBet', {
            roomId: window.gameFramework.roomId,
            playerIndex: this.localPlayerIndex,
            amount: amount
        });
    }

    // Copy room code
    copyRoomCode() {
        const roomCode = document.getElementById('roomCodeText').textContent;
        navigator.clipboard.writeText(roomCode).then(() => {
            UIUtils.showGameMessage('Room code copied to clipboard!', 'success');
        });
    }

    // Update UI
    updateUI() {
        // Update player areas
        this.updatePlayerAreas();
        
        // Update dealer area
        this.updateDealerArea();
        
        // Update game info
        this.updateGameInfo();
    }

    // Update player areas
    updatePlayerAreas() {
        const playerList = document.getElementById('playerList');
        if (playerList) {
            playerList.innerHTML = '';
            
            this.game.players.forEach((player, index) => {
                const playerDiv = document.createElement('div');
                playerDiv.className = 'player-item';
                if (index === this.game.currentPlayer) {
                    playerDiv.classList.add('active');
                }
                
                playerDiv.innerHTML = `
                    <div class="player-name">${player.name}</div>
                    <div class="player-chips">$${player.chips}</div>
                    <div class="player-bet">Bet: $${player.bet}</div>
                    <div class="player-value">Value: ${player.value}</div>
                `;
                
                playerList.appendChild(playerDiv);
            });
        }
    }

    // Update dealer area
    updateDealerArea() {
        const dealerArea = document.getElementById('dealerArea');
        if (dealerArea) {
            dealerArea.innerHTML = `
                <div class="dealer-name">Dealer</div>
                <div class="dealer-value">Value: ${this.game.dealer.value}</div>
            `;
        }
    }

    // Update game info
    updateGameInfo() {
        const gameInfo = document.getElementById('gameInfo');
        if (gameInfo) {
            gameInfo.innerHTML = `
                <div>Round: ${this.game.roundNumber}</div>
                <div>Phase: ${this.game.gamePhase}</div>
            `;
        }
    }

    // Update game controls
    updateGameControls() {
        const hitBtn = document.getElementById('hitBtn');
        const standBtn = document.getElementById('standBtn');
        const doubleBtn = document.getElementById('doubleBtn');
        const splitBtn = document.getElementById('splitBtn');
        
        if (hitBtn) hitBtn.style.display = this.canAct ? 'inline-block' : 'none';
        if (standBtn) standBtn.style.display = this.canAct ? 'inline-block' : 'none';
        if (doubleBtn) doubleBtn.style.display = (this.canAct && this.game.players[this.localPlayerIndex]?.canDouble) ? 'inline-block' : 'none';
        if (splitBtn) splitBtn.style.display = (this.canAct && this.game.players[this.localPlayerIndex]?.canSplit) ? 'inline-block' : 'none';
    }

    // Show room code
    showRoomCode(roomCode) {
        console.log('Showing room code:', roomCode);
        const roomCodeText = document.getElementById('roomCodeText');
        const roomCodeDisplay = document.getElementById('roomCodeDisplay');
        
        if (roomCodeText) {
            roomCodeText.textContent = roomCode;
            console.log('SUCCESS: Room code text updated');
        } else {
            console.error('ERROR: roomCodeText element not found');
        }
        
        if (roomCodeDisplay) {
            roomCodeDisplay.style.display = 'block';
            console.log('SUCCESS: Room code display shown');
        } else {
            console.error('ERROR: roomCodeDisplay element not found');
        }
    }

    // Show player customization
    showPlayerCustomization() {
        document.getElementById('playerCustomization').style.display = 'block';
    }

    // Show game controls
    showGameControls() {
        const addBotBtn = document.getElementById('addBotBtn');
        if (addBotBtn) {
            addBotBtn.style.display = 'inline-block';
            addBotBtn.style.setProperty('border', 'none', 'important');
            console.log('SUCCESS: Add Bot button shown and styled green');
        }
        
        const removeBotBtn = document.getElementById('removeBotBtn');
        if (removeBotBtn) {
            removeBotBtn.style.display = 'inline-block';
            removeBotBtn.style.setProperty('border', 'none', 'important');
            console.log('SUCCESS: Remove Bot button shown and styled red');
        }
        
        const startGameBtn = document.getElementById('startGameBtn');
        if (startGameBtn) {
            startGameBtn.style.display = 'inline-block';
            startGameBtn.disabled = false;
            console.log('SUCCESS: Start Game button shown and styled orange');
        }
        
        const gameMenuBtn = document.getElementById('gameMenuBtn');
        if (gameMenuBtn) {
            gameMenuBtn.style.display = 'inline-block';
            console.log('SUCCESS: Game Menu button shown');
        }
    }

    // Reset client state
    reset() {
        console.log('Resetting Blackjack client state...');
        this.localPlayerIndex = 0;
        this.isMyTurn = false;
        this.canAct = false;
        this.game = new BlackjackGame();
        console.log('SUCCESS: Blackjack client state reset');
    }
}

// BLACKJACK RENDERING FUNCTIONS
function drawGameState() {
    if (!window.game || !window.game.players) {
        console.log('Blackjack: No game or players available for rendering');
        return;
    }
    
    console.log('Drawing blackjack game state');
    
    // Clear canvas with blackjack table background
    background(0, 100, 0); // Dark green table
    
    // Draw blackjack table elements
    drawBlackjackTable();
    drawDealerArea();
    drawPlayerAreas();
    drawChips();
    drawGameInfo();
}

function drawBlackjackTable() {
    // Draw table outline
    stroke(0, 150, 0);
    strokeWeight(8);
    noFill();
    rect(50, 50, width - 100, height - 100, 20);
    
    // Draw table felt
    fill(0, 80, 0, 100);
    noStroke();
    rect(60, 60, width - 120, height - 120, 15);
}

function drawDealerArea() {
    const centerX = width / 2;
    const dealerY = height * 0.3;
    
    // Draw dealer area
    fill(0, 0, 0, 150);
    stroke(255);
    strokeWeight(2);
    rect(centerX - 150, dealerY - 50, 300, 100, 10);
    
    // Draw dealer label
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(16);
    text('Dealer', centerX, dealerY - 30);
    
    // Draw dealer cards
    if (window.game.dealer && window.game.dealer.hand) {
        drawCards(centerX, dealerY + 10, window.game.dealer.hand, 80, 123, true);
    }
    
    // Draw dealer value
    if (window.game.dealer && window.game.dealer.value !== undefined) {
        textSize(14);
        text('Value: ' + window.game.dealer.value, centerX, dealerY + 50);
    }
}

function drawPlayerAreas() {
    if (!window.game.players) return;
    
    const playerY = height * 0.7;
    const playerWidth = 200;
    const spacing = (width - playerWidth * window.game.players.length) / (window.game.players.length + 1);
    
    window.game.players.forEach((player, index) => {
        const playerX = spacing + index * (playerWidth + spacing);
        
        // Draw player area
        fill(0, 0, 0, 150);
        stroke(255);
        strokeWeight(2);
        rect(playerX, playerY - 50, playerWidth, 100, 10);
        
        // Highlight current player
        if (index === window.game.currentPlayer) {
            stroke(255, 255, 0);
            strokeWeight(4);
            noFill();
            rect(playerX - 5, playerY - 55, playerWidth + 10, 110, 15);
        }
        
        // Draw player name
        fill(255);
        textAlign(CENTER, CENTER);
        textSize(14);
        text(player.name, playerX + playerWidth/2, playerY - 30);
        
        // Draw player chips
        textSize(12);
        text('Chips: $' + player.chips, playerX + playerWidth/2, playerY - 10);
        
        // Draw player bet
        if (player.bet > 0) {
            text('Bet: $' + player.bet, playerX + playerWidth/2, playerY + 10);
        }
        
        // Draw player cards
        if (player.hand && player.hand.length > 0) {
            drawCards(playerX + playerWidth/2, playerY + 30, player.hand, 60, 84, true);
        }
        
        // Draw player value
        if (player.value !== undefined) {
            textSize(12);
            text('Value: ' + player.value, playerX + playerWidth/2, playerY + 50);
        }
        
        // Draw player status
        if (player.isBusted) {
            fill(255, 0, 0);
            text('BUSTED!', playerX + playerWidth/2, playerY + 70);
        } else if (player.hasBlackjack) {
            fill(0, 255, 0);
            text('BLACKJACK!', playerX + playerWidth/2, playerY + 70);
        }
    });
}

function drawCards(centerX, centerY, cards, cardWidth, cardHeight, showCards) {
    if (!cards || cards.length === 0) return;
    
    const spacing = 15; // Increased spacing for bigger cards
    const totalWidth = (cards.length - 1) * (cardWidth + spacing);
    const startX = centerX - totalWidth / 2;
    
    cards.forEach((card, index) => {
        const x = startX + index * (cardWidth + spacing);
        const y = centerY - cardHeight / 2;
        
        push();
        
        // Draw card shadow
        fill(0, 0, 0, 80);
        noStroke();
        rect(x + 3, y + 3, cardWidth, cardHeight, 6);
        
        // Draw card
        fill(255);
        stroke(0);
        strokeWeight(3);
        rect(x, y, cardWidth, cardHeight, 6);
        
        if (showCards && card.name) {
            // Try to draw actual card image with proper name mapping
            const imageName = card.name.toLowerCase().replace(/\s+/g, '_');
            if (typeof cardImages !== 'undefined' && cardImages[imageName] && cardImages[imageName].width > 0) {
                image(cardImages[imageName], x, y, cardWidth, cardHeight);
            } else {
                // Fallback to text if image not available
                fill(0);
                textAlign(CENTER, CENTER);
                textSize(12); // Increased for bigger cards
                textStyle(BOLD);
                text(card.name, x + cardWidth/2, y + cardHeight/2);
            }
        } else {
            // Draw card back image
            if (typeof window.cardBackImage !== 'undefined' && window.cardBackImage && window.cardBackImage.width > 0) {
                image(window.cardBackImage, x, y, cardWidth, cardHeight);
            } else {
                // Fallback to colored rectangle
                fill(0, 0, 150);
                textAlign(CENTER, CENTER);
                textSize(12); // Increased for bigger cards
                textStyle(BOLD);
                text('?', x + cardWidth/2, y + cardHeight/2);
            }
        }
        
        pop();
    });
}

function drawChips() {
    if (!window.game.players) return;
    
    // Draw chips for each player
    window.game.players.forEach((player, index) => {
        const playerX = 100 + index * 200;
        const playerY = height * 0.7;
        
        // Draw chip stack based on player's chips
        drawChipStack(playerX, playerY + 80, player.chips || 1000, player.bet || 0);
    });
}

function drawChipStack(x, y, totalChips, currentBet) {
    push();
    
    // Calculate chip distribution
    const chipValues = [100, 50, 25, 10, 5, 1];
    const chipColors = [
        [255, 0, 0],    // Red for 100
        [0, 0, 255],    // Blue for 50
        [0, 255, 0],    // Green for 25
        [255, 255, 0],  // Yellow for 10
        [255, 165, 0],  // Orange for 5
        [255, 255, 255] // White for 1
    ];
    
    let remainingChips = totalChips;
    let stackHeight = 0;
    
    // Draw chips from highest to lowest value
    chipValues.forEach((value, index) => {
        const chipCount = Math.floor(remainingChips / value);
        if (chipCount > 0) {
            const maxChipsToShow = Math.min(chipCount, 8); // Limit visual chips to 8 per value
            
            for (let i = 0; i < maxChipsToShow; i++) {
                const chipX = x + (i % 4) * 3 - 4; // Spread chips in a small area
                const chipY = y - stackHeight - i * 2;
                
                // Draw chip
                fill(chipColors[index][0], chipColors[index][1], chipColors[index][2]);
                stroke(0);
                strokeWeight(1);
                ellipse(chipX, chipY, 10, 6);
                
                // Draw chip value
                fill(0);
                textAlign(CENTER, CENTER);
                textSize(5);
                text(value, chipX, chipY);
            }
            
            remainingChips -= chipCount * value;
            stackHeight += maxChipsToShow * 2 + 2;
        }
    });
    
    // Draw current bet chips separately
    if (currentBet > 0) {
        const betChips = Math.min(currentBet, 4); // Show up to 4 bet chips
        for (let i = 0; i < betChips; i++) {
            const chipX = x + i * 4 - 6;
            const chipY = y + 15;
            
            // Draw bet chip (different color)
            fill(255, 0, 255); // Magenta for bet chips
            stroke(255);
            strokeWeight(2);
            ellipse(chipX, chipY, 8, 5);
            
            // Draw bet indicator
            fill(255);
            textAlign(CENTER, CENTER);
            textSize(4);
            text('B', chipX, chipY);
        }
    }
    
    pop();
}

function drawGameInfo() {
    // Draw game phase
    fill(255);
    textAlign(LEFT, TOP);
    textSize(14);
    text('Phase: ' + (window.game.gamePhase || 'betting'), 20, 20);
    
    // Draw round number
    if (window.game.roundNumber) {
        text('Round: ' + window.game.roundNumber, 20, 40);
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    window.blackjackClient = new BlackjackClient();
    window.blackjackClient.initialize();
});