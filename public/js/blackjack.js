// 🃏 BLACKJACK GAME LOGIC

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
        
        console.log('🃏 Blackjack game initialized with', this.players.length, 'players');
    }

    // Start a new round
    startNewRound() {
        console.log(`🎯 Starting round ${this.roundNumber}`);
        
        // Reset all hands
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
        
        this.dealer = {
            hand: [],
            value: 0,
            isBusted: false,
            hasBlackjack: false
        };
        
        this.gamePhase = 'betting';
        this.currentPlayer = 0;
        
        // Shuffle deck if needed
        if (this.deck.length < 20) {
            this.deck = CardUtils.shuffleDeck(CardUtils.createStandardDeck());
        }
        
        this.emitEvent('roundStarted', {
            roundNumber: this.roundNumber,
            gamePhase: this.gamePhase
        });
    }

    // Player places bet
    placeBet(playerIndex, amount) {
        const player = this.players[playerIndex];
        if (!player || this.gamePhase !== 'betting') {
            return false;
        }
        
        if (amount < this.minBet || amount > this.maxBet || amount > player.chips) {
            return false;
        }
        
        player.bet = amount;
        player.chips -= amount;
        
        console.log(`💰 Player ${player.name} bets $${amount}`);
        
        // Check if all players have bet
        const allPlayersBetted = this.players.every(p => p.bet > 0);
        if (allPlayersBetted) {
            this.dealInitialCards();
        }
        
        this.emitEvent('betPlaced', {
            playerIndex: playerIndex,
            amount: amount,
            playerChips: player.chips
        });
        
        return true;
    }

    // Deal initial cards
    dealInitialCards() {
        console.log('🃏 Dealing initial cards');
        this.gamePhase = 'dealing';
        
        // Deal two cards to each player
        for (let i = 0; i < 2; i++) {
            for (let player of this.players) {
                if (player.bet > 0) {
                    this.dealCard(player);
                }
            }
        }
        
        // Deal two cards to dealer
        this.dealCard(this.dealer);
        this.dealCard(this.dealer);
        
        // Check for dealer blackjack
        this.dealer.hasBlackjack = this.calculateHandValue(this.dealer.hand) === 21;
        
        // Check for player blackjacks
        this.players.forEach(player => {
            if (player.bet > 0) {
                player.hasBlackjack = this.calculateHandValue(player.hand) === 21;
                if (player.hasBlackjack) {
                    console.log(`🎉 Player ${player.name} has blackjack!`);
                }
            }
        });
        
        this.gamePhase = 'playing';
        this.currentPlayer = 0;
        
        this.emitEvent('cardsDealt', {
            players: this.players.map(p => ({
                name: p.name,
                hand: p.hand,
                value: p.value,
                hasBlackjack: p.hasBlackjack
            })),
            dealer: {
                hand: this.dealer.hand,
                value: this.dealer.value,
                hasBlackjack: this.dealer.hasBlackjack
            },
            gamePhase: this.gamePhase
        });
        
        // Start player turns
        this.startPlayerTurn();
    }

    // Deal a card to a player or dealer
    dealCard(target) {
        if (this.deck.length === 0) {
            this.deck = CardUtils.shuffleDeck(CardUtils.createStandardDeck());
        }
        
        const card = this.deck.pop();
        target.hand.push(card);
        target.value = this.calculateHandValue(target.hand);
        
        console.log(`🃏 Dealt ${card.name} to ${target.name || 'dealer'}`);
        return card;
    }

    // Calculate hand value
    calculateHandValue(hand) {
        let value = 0;
        let aces = 0;
        
        for (let card of hand) {
            if (card.rank === 'ace') {
                aces++;
                value += 11;
            } else if (['jack', 'queen', 'king'].includes(card.rank)) {
                value += 10;
            } else {
                value += parseInt(card.rank);
            }
        }
        
        // Adjust for aces
        while (value > 21 && aces > 0) {
            value -= 10;
            aces--;
        }
        
        return value;
    }

    // Start player turn
    startPlayerTurn() {
        // Find next active player
        while (this.currentPlayer < this.players.length) {
            const player = this.players[this.currentPlayer];
            if (player.bet > 0 && !player.isStanding && !player.isBusted && !player.hasBlackjack) {
                this.updatePlayerOptions(player);
                this.emitEvent('playerTurn', {
                    playerIndex: this.currentPlayer,
                    player: {
                        name: player.name,
                        hand: player.hand,
                        value: player.value,
                        bet: player.bet,
                        chips: player.chips,
                        canDouble: player.canDouble,
                        canSplit: player.canSplit
                    }
                });
                return;
            }
            this.currentPlayer++;
        }
        
        // All players done, dealer's turn
        this.dealerTurn();
    }

    // Update player action options
    updatePlayerOptions(player) {
        player.canDouble = player.hand.length === 2 && player.chips >= player.bet;
        player.canSplit = player.hand.length === 2 && 
                         player.hand[0].rank === player.hand[1].rank && 
                         player.chips >= player.bet;
    }

    // Player action (hit, stand, double, split)
    playerAction(playerIndex, action) {
        const player = this.players[playerIndex];
        if (!player || this.currentPlayer !== playerIndex || this.gamePhase !== 'playing') {
            return false;
        }
        
        console.log(`🎯 Player ${player.name} ${action}s`);
        
        switch (action) {
            case 'hit':
                this.dealCard(player);
                if (player.value > 21) {
                    player.isBusted = true;
                    console.log(`💥 Player ${player.name} busted!`);
                }
                break;
                
            case 'stand':
                player.isStanding = true;
                break;
                
            case 'double':
                if (player.canDouble) {
                    player.chips -= player.bet;
                    player.bet *= 2;
                    this.dealCard(player);
                    player.isStanding = true;
                    if (player.value > 21) {
                        player.isBusted = true;
                    }
                }
                break;
                
            case 'split':
                if (player.canSplit) {
                    player.chips -= player.bet;
                    player.splitHand = {
                        hand: [player.hand.pop()],
                        value: 0,
                        bet: player.bet,
                        isBusted: false,
                        isStanding: false
                    };
                    this.dealCard(player);
                    this.dealCard(player.splitHand);
                    player.value = this.calculateHandValue(player.hand);
                    player.splitHand.value = this.calculateHandValue(player.splitHand.hand);
                }
                break;
        }
        
        this.emitEvent('playerAction', {
            playerIndex: playerIndex,
            action: action,
            player: {
                name: player.name,
                hand: player.hand,
                value: player.value,
                bet: player.bet,
                chips: player.chips,
                isBusted: player.isBusted,
                isStanding: player.isStanding,
                splitHand: player.splitHand
            }
        });
        
        // Move to next player or dealer
        this.currentPlayer++;
        this.startPlayerTurn();
        
        return true;
    }

    // Dealer's turn
    dealerTurn() {
        console.log('🎯 Dealer's turn');
        this.gamePhase = 'dealer';
        
        // Show dealer's hole card
        this.emitEvent('dealerTurn', {
            dealer: {
                hand: this.dealer.hand,
                value: this.dealer.value,
                hasBlackjack: this.dealer.hasBlackjack
            }
        });
        
        // Dealer plays
        setTimeout(() => {
            this.dealerPlay();
        }, 1000);
    }

    // Dealer plays according to rules
    dealerPlay() {
        while (this.dealer.value < 17) {
            this.dealCard(this.dealer);
            
            this.emitEvent('dealerCard', {
                dealer: {
                    hand: this.dealer.hand,
                    value: this.dealer.value
                }
            });
            
            // Small delay between cards
            if (this.dealer.value < 17) {
                setTimeout(() => {
                    this.dealerPlay();
                }, 1000);
                return;
            }
        }
        
        if (this.dealer.value > 21) {
            this.dealer.isBusted = true;
            console.log('💥 Dealer busted!');
        }
        
        // Determine winners
        this.determineWinners();
    }

    // Determine winners and payouts
    determineWinners() {
        console.log('🏆 Determining winners');
        this.gamePhase = 'finished';
        
        const results = [];
        
        this.players.forEach((player, index) => {
            if (player.bet === 0) return;
            
            const result = {
                playerIndex: index,
                playerName: player.name,
                hand: player.hand,
                value: player.value,
                bet: player.bet,
                splitHand: player.splitHand,
                winnings: 0,
                result: ''
            };
            
            // Check main hand
            if (player.isBusted) {
                result.result = 'Busted';
                result.winnings = 0;
            } else if (player.hasBlackjack && !this.dealer.hasBlackjack) {
                result.result = 'Blackjack';
                result.winnings = Math.floor(player.bet * 2.5); // 3:2 payout
            } else if (this.dealer.isBusted) {
                result.result = 'Dealer Busted';
                result.winnings = player.bet * 2;
            } else if (player.value > this.dealer.value) {
                result.result = 'Win';
                result.winnings = player.bet * 2;
            } else if (player.value === this.dealer.value) {
                result.result = 'Push';
                result.winnings = player.bet;
            } else {
                result.result = 'Lose';
                result.winnings = 0;
            }
            
            // Check split hand if exists
            if (player.splitHand) {
                const splitResult = {
                    hand: player.splitHand.hand,
                    value: player.splitHand.value,
                    bet: player.splitHand.bet,
                    winnings: 0,
                    result: ''
                };
                
                if (player.splitHand.isBusted) {
                    splitResult.result = 'Split Busted';
                    splitResult.winnings = 0;
                } else if (this.dealer.isBusted) {
                    splitResult.result = 'Split Win (Dealer Busted)';
                    splitResult.winnings = player.splitHand.bet * 2;
                } else if (player.splitHand.value > this.dealer.value) {
                    splitResult.result = 'Split Win';
                    splitResult.winnings = player.splitHand.bet * 2;
                } else if (player.splitHand.value === this.dealer.value) {
                    splitResult.result = 'Split Push';
                    splitResult.winnings = player.splitHand.bet;
                } else {
                    splitResult.result = 'Split Lose';
                    splitResult.winnings = 0;
                }
                
                result.splitResult = splitResult;
                result.winnings += splitResult.winnings;
            }
            
            // Pay out winnings
            player.chips += result.winnings;
            player.bet = 0;
            player.splitHand = null;
            
            results.push(result);
        });
        
        this.emitEvent('roundComplete', {
            results: results,
            dealer: {
                hand: this.dealer.hand,
                value: this.dealer.value,
                isBusted: this.dealer.isBusted,
                hasBlackjack: this.dealer.hasBlackjack
            }
        });
        
        // Start next round after delay
        setTimeout(() => {
            this.roundNumber++;
            this.startNewRound();
        }, 5000);
    }

    // Emit event to server
    emitEvent(eventName, data) {
        if (window.gameFramework.socket) {
            window.gameFramework.socket.emit(eventName, {
                roomId: window.gameFramework.roomId,
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

// 🎮 BLACKJACK CLIENT LOGIC
class BlackjackClient {
    constructor() {
        this.game = new BlackjackGame();
        this.localPlayerIndex = 0;
        this.isMyTurn = false;
        this.canAct = false;
    }

    // Initialize the client
    initialize() {
        console.log('🎮 Initializing Blackjack client');
        
        // Initialize game framework
        GameFramework.initialize('blackjack');
        
        // Setup UI event listeners
        this.setupUI();
        
        // Setup socket event listeners
        this.setupSocketListeners();
        
        console.log('✅ Blackjack client initialized');
    }

    // Setup UI event listeners
    setupUI() {
        // Room controls
        document.getElementById('createRoomBtn').onclick = () => this.createRoom();
        document.getElementById('joinRoomBtn').onclick = () => this.joinRoom();
        document.getElementById('addBotBtn').onclick = () => this.addBot();
        document.getElementById('removeBotBtn').onclick = () => this.removeBot();
        document.getElementById('startGameBtn').onclick = () => this.startGame();
        
        // Betting controls
        document.getElementById('placeBetBtn').onclick = () => this.placeBet();
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
        
        socket.on('roomCreated', (roomCode) => {
            console.log('🏠 Room created:', roomCode);
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
        
        socket.on('roundStarted', (data) => {
            this.updateRoundInfo(data);
        });
        
        socket.on('betPlaced', (data) => {
            this.updateBettingState(data);
        });
        
        socket.on('cardsDealt', (data) => {
            this.updateCardsDealt(data);
        });
        
        socket.on('playerTurn', (data) => {
            this.updatePlayerTurn(data);
        });
        
        socket.on('playerAction', (data) => {
            this.updatePlayerAction(data);
        });
        
        socket.on('dealerTurn', (data) => {
            this.updateDealerTurn(data);
        });
        
        socket.on('dealerCard', (data) => {
            this.updateDealerCard(data);
        });
        
        socket.on('roundComplete', (data) => {
            this.showRoundResults(data);
        });
    }

    // Create room
    createRoom() {
        const socket = window.gameFramework.socket;
        socket.emit('createRoom', { gameType: 'blackjack' });
    }

    // Join room
    joinRoom() {
        const roomCode = document.getElementById('roomInput').value.trim();
        if (!roomCode) {
            UIUtils.showGameMessage('Please enter a room code', 'error');
            return;
        }
        
        const socket = window.gameFramework.socket;
        socket.emit('joinRoom', { roomCode: roomCode });
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
        this.game.startNewRound();
    }

    // Place bet
    placeBet() {
        const amount = parseInt(document.getElementById('betAmount').value) || 0;
        if (amount <= 0) {
            UIUtils.showGameMessage('Please enter a valid bet amount', 'error');
            return;
        }
        
        const socket = window.gameFramework.socket;
        socket.emit('placeBet', {
            roomId: window.gameFramework.roomId,
            playerIndex: this.localPlayerIndex,
            amount: amount
        });
    }

    // Player action
    playerAction(action) {
        if (!this.canAct || !this.isMyTurn) {
            return;
        }
        
        const socket = window.gameFramework.socket;
        socket.emit('playerAction', {
            roomId: window.gameFramework.roomId,
            playerIndex: this.localPlayerIndex,
            action: action
        });
        
        this.canAct = false;
        this.hideBettingControls();
    }

    // Update round info
    updateRoundInfo(data) {
        document.getElementById('roundNumber').textContent = data.roundNumber;
        this.game.gamePhase = data.gamePhase;
        
        if (data.gamePhase === 'betting') {
            this.showBettingArea();
        } else {
            this.hideBettingArea();
        }
    }

    // Update betting state
    updateBettingState(data) {
        if (data.playerIndex === this.localPlayerIndex) {
            document.getElementById('playerChips').textContent = data.playerChips;
            this.hideBettingArea();
        }
    }

    // Update cards dealt
    updateCardsDealt(data) {
        this.game.players = data.players;
        this.game.dealer = data.dealer;
        this.game.gamePhase = data.gamePhase;
        
        this.updateUI();
        this.hideBettingArea();
    }

    // Update player turn
    updatePlayerTurn(data) {
        this.isMyTurn = (data.playerIndex === this.localPlayerIndex);
        this.canAct = this.isMyTurn;
        
        if (this.canAct) {
            this.showBettingControls(data.player);
        } else {
            this.hideBettingControls();
        }
        
        this.updateUI();
    }

    // Update player action
    updatePlayerAction(data) {
        this.game.players[data.playerIndex] = data.player;
        this.updateUI();
    }

    // Update dealer turn
    updateDealerTurn(data) {
        this.game.dealer = data.dealer;
        this.updateUI();
    }

    // Update dealer card
    updateDealerCard(data) {
        this.game.dealer = data.dealer;
        this.updateUI();
    }

    // Show round results
    showRoundResults(data) {
        this.game.gamePhase = 'finished';
        
        // Show results for local player
        const localResult = data.results.find(r => r.playerIndex === this.localPlayerIndex);
        if (localResult) {
            let message = `${localResult.result}`;
            if (localResult.winnings > 0) {
                message += ` - Won $${localResult.winnings}`;
            }
            if (localResult.splitResult) {
                message += ` | Split: ${localResult.splitResult.result}`;
            }
            
            UIUtils.showGameMessage(message, localResult.winnings > 0 ? 'success' : 'info');
            
            // Update chips
            document.getElementById('playerChips').textContent = this.game.players[this.localPlayerIndex].chips;
        }
        
        this.updateUI();
    }

    // Update UI
    updateUI() {
        // Update dealer area
        this.updateDealerArea();
        
        // Update player areas
        this.updatePlayerAreas();
    }

    // Update dealer area
    updateDealerArea() {
        const dealerArea = document.getElementById('dealerArea');
        const dealerCards = document.getElementById('dealerCards');
        const dealerValue = document.getElementById('dealerValue');
        
        dealerCards.innerHTML = '';
        this.game.dealer.hand.forEach((card, index) => {
            const cardDiv = document.createElement('div');
            cardDiv.className = 'card';
            if (this.game.gamePhase === 'dealing' && index === 1) {
                cardDiv.className += ' hidden';
                cardDiv.textContent = '?';
            } else {
                cardDiv.textContent = card.name;
            }
            dealerCards.appendChild(cardDiv);
        });
        
        if (this.game.gamePhase === 'dealing') {
            dealerValue.textContent = this.game.dealer.hand[0].value;
        } else {
            dealerValue.textContent = this.game.dealer.value;
        }
        
        // Update dealer area styling
        dealerArea.className = 'dealer-area';
        if (this.game.dealer.isBusted) {
            dealerArea.className += ' busted';
        } else if (this.game.dealer.hasBlackjack) {
            dealerArea.className += ' blackjack';
        }
    }

    // Update player areas
    updatePlayerAreas() {
        // This would update the visual representation of players
        // For now, just log the state
        console.log('Players:', this.game.players.map(p => ({
            name: p.name,
            chips: p.chips,
            hand: p.hand.length,
            value: p.value,
            isBusted: p.isBusted,
            hasBlackjack: p.hasBlackjack
        })));
    }

    // Show betting area
    showBettingArea() {
        document.getElementById('bettingArea').style.display = 'flex';
    }

    // Hide betting area
    hideBettingArea() {
        document.getElementById('bettingArea').style.display = 'none';
    }

    // Show betting controls
    showBettingControls(player) {
        const controls = document.getElementById('bettingControls');
        controls.style.display = 'flex';
        
        // Enable/disable buttons based on player options
        document.getElementById('doubleBtn').disabled = !player.canDouble;
        document.getElementById('splitBtn').disabled = !player.canSplit;
    }

    // Hide betting controls
    hideBettingControls() {
        document.getElementById('bettingControls').style.display = 'none';
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
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    window.blackjackClient = new BlackjackClient();
    window.blackjackClient.initialize();
});
