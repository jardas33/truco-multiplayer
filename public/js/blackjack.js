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
        this.isActing = false; // Prevent duplicate actions
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
        console.log('🃏 Setting up UI event listeners...');
        
        // Room controls
        const createBtn = document.getElementById('createRoomBtn');
        const joinBtn = document.getElementById('joinRoomBtn');
        
        console.log('  - createBtn found:', !!createBtn);
        console.log('  - joinBtn found:', !!joinBtn);
        
        if (createBtn) {
            // Remove any existing handlers
            createBtn.onclick = null;
            createBtn.removeEventListener('click', this.createRoom);
            
            // Attach new handler with explicit binding
            const self = this;
            createBtn.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('🃏 Create Room button CLICKED - onclick handler fired!');
                console.log('  - this context:', self);
                console.log('  - self.createRoom:', typeof self.createRoom);
                if (self && self.createRoom) {
                    self.createRoom();
                } else {
                    console.error('❌ Cannot call createRoom - self or method not available');
                }
            };
            
            // Also add event listener as backup
            createBtn.addEventListener('click', function(e) {
                console.log('🃏 Create Room button CLICKED - addEventListener fired!');
                if (window.blackjackClient && window.blackjackClient.createRoom) {
                    window.blackjackClient.createRoom();
                }
            });
            
            console.log('✅ Create Room button handler attached (both onclick and addEventListener)');
        } else {
            console.error('❌ Create Room button not found in setupUI');
        }
        
        if (joinBtn) {
            // Remove any existing handlers
            joinBtn.onclick = null;
            
            // Attach new handler
            const self = this;
            joinBtn.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('🃏 Join Room button clicked');
                if (self && self.joinRoom) {
                    self.joinRoom();
                }
            };
            
            console.log('✅ Join Room button handler attached');
        } else {
            console.error('❌ Join Room button not found');
        }
        document.getElementById('addBotBtn').onclick = () => this.addBot();
        document.getElementById('removeBotBtn').onclick = () => this.removeBot();
        // Game menu button - return to menu
        const gameMenuBtn = document.getElementById('gameMenuBtn');
        if (gameMenuBtn) {
            gameMenuBtn.onclick = () => {
                if (window.blackjackClient) {
                    window.blackjackClient.showMenu();
                } else {
                    window.location.reload();
                }
            };
        }
        
        document.getElementById('startGameBtn').onclick = () => {
            const roomId = this.getRoomId();
            if (!roomId) {
                console.error('🃏 No room ID available to start game');
                if (typeof UIUtils !== 'undefined') {
                    UIUtils.showGameMessage('Please create or join a room first', 'error');
                } else {
                    alert('Please create or join a room first');
                }
                return;
            }
            
            // Emit startGame event to server
            const socket = window.gameFramework.socket;
            if (socket) {
                console.log('🃏 Emitting startGame to server with roomId:', roomId);
                socket.emit('startGame', roomId);
            } else {
                console.error('🃏 No socket available');
                if (typeof UIUtils !== 'undefined') {
                    UIUtils.showGameMessage('Not connected to server', 'error');
                } else {
                    alert('Not connected to server');
                }
            }
        };
        
        // Game controls
        const hitBtn = document.getElementById('hitBtn');
        const standBtn = document.getElementById('standBtn');
        const doubleBtn = document.getElementById('doubleBtn');
        const splitBtn = document.getElementById('splitBtn');
        const placeBetBtn = document.getElementById('placeBetBtn');
        const betAmountInput = document.getElementById('betAmount');
        
        if (hitBtn) {
            hitBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🃏 Hit button clicked!');
                this.playerAction('hit');
            };
            console.log('✅ Hit button handler attached');
        } else {
            console.warn('⚠️ Hit button not found in DOM');
        }
        
        if (standBtn) {
            standBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🃏 Stand button clicked!');
                this.playerAction('stand');
            };
            console.log('✅ Stand button handler attached');
        } else {
            console.warn('⚠️ Stand button not found in DOM');
        }
        
        if (doubleBtn) {
            doubleBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🃏 Double button clicked!');
                this.playerAction('double');
            };
            console.log('✅ Double button handler attached');
        } else {
            console.warn('⚠️ Double button not found in DOM');
        }
        
        if (splitBtn) {
            splitBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🃏 Split button clicked!');
                this.playerAction('split');
            };
            console.log('✅ Split button handler attached');
        } else {
            console.warn('⚠️ Split button not found in DOM');
        }
        if (placeBetBtn) {
            console.log('✅ Place bet button found, attaching handler');
            placeBetBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                console.log('🃏 Place Bet button clicked!');
                
                // Prevent duplicate betting
                if (this.isActing) {
                    console.log('🃏 Bet already in progress');
                    return;
                }
                
                // Get bet amount from input
                const inputValue = betAmountInput?.value || '10';
                const amount = parseInt(inputValue, 10);
                
                console.log('🃏 Bet amount input value:', inputValue, 'parsed amount:', amount);
                
                // Validate amount is a number
                if (isNaN(amount) || amount <= 0) {
                    console.error('🃏 Invalid bet amount:', amount);
                    const errorMsg = 'Please enter a valid bet amount';
                    if (typeof UIUtils !== 'undefined') {
                        UIUtils.showGameMessage(errorMsg, 'error');
                    } else {
                        alert(errorMsg);
                    }
                    return;
                }
                
                const localPlayer = this.game.players[this.localPlayerIndex];
                
                if (!localPlayer) {
                    console.error('🃏 Local player not found. localPlayerIndex:', this.localPlayerIndex, 'players:', this.game.players);
                    const errorMsg = 'Local player not found';
                    if (typeof UIUtils !== 'undefined') {
                        UIUtils.showGameMessage(errorMsg, 'error');
                    } else {
                        alert(errorMsg);
                    }
                    return;
                }
                
                console.log('🃏 Local player found:', localPlayer.name, 'chips:', localPlayer.chips, 'current bet:', localPlayer.bet);
                
                // Check if already bet
                if (localPlayer.bet > 0) {
                    console.log('🃏 Player already placed a bet:', localPlayer.bet);
                    if (typeof UIUtils !== 'undefined') {
                        UIUtils.showGameMessage('You have already placed a bet', 'info');
                    } else {
                        alert('You have already placed a bet');
                    }
                    return;
                }
                
                // Check game phase
                if (this.game.gamePhase !== 'betting') {
                    console.warn('🃏 Not in betting phase. Current phase:', this.game.gamePhase);
                    const errorMsg = `Cannot bet in ${this.game.gamePhase} phase`;
                    if (typeof UIUtils !== 'undefined') {
                        UIUtils.showGameMessage(errorMsg, 'error');
                    } else {
                        alert(errorMsg);
                    }
                    return;
                }
                
                const minBet = this.game.minBet || 5;
                const maxBet = this.game.maxBet || 1000;
                
                console.log('🃏 Bet limits - min:', minBet, 'max:', maxBet, 'player chips:', localPlayer.chips);
                
                if (amount < minBet) {
                    console.warn('🃏 Bet too low:', amount, '<', minBet);
                    const errorMsg = `Minimum bet is $${minBet}`;
                    if (typeof UIUtils !== 'undefined') {
                        UIUtils.showGameMessage(errorMsg, 'error');
                    } else {
                        alert(errorMsg);
                    }
                    return;
                }
                
                if (amount > maxBet) {
                    console.warn('🃏 Bet too high:', amount, '>', maxBet);
                    const errorMsg = `Maximum bet is $${maxBet}`;
                    if (typeof UIUtils !== 'undefined') {
                        UIUtils.showGameMessage(errorMsg, 'error');
                    } else {
                        alert(errorMsg);
                    }
                    return;
                }
                
                if (amount > localPlayer.chips) {
                    console.warn('🃏 Insufficient chips. Bet:', amount, 'chips:', localPlayer.chips);
                    const errorMsg = 'Insufficient chips';
                    if (typeof UIUtils !== 'undefined') {
                        UIUtils.showGameMessage(errorMsg, 'error');
                    } else {
                        alert(errorMsg);
                    }
                    return;
                }
                
                // All validations passed - place the bet
                console.log('✅ All validations passed, placing bet of $' + amount);
                this.isActing = true;
                placeBetBtn.disabled = true;
                this.placeBet(amount);
            };
            
            // Also add event listener as backup
            placeBetBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🃏 Place Bet button clicked (addEventListener)');
            });
        } else {
            console.error('❌ Place bet button not found in DOM!');
        }
        
        // Copy room code
        const copyBtn = document.getElementById('copyRoomCodeBtn');
        if (copyBtn) copyBtn.onclick = () => this.copyRoomCode();
    }

    // Setup socket event listeners
    setupSocketListeners() {
        if (!window.gameFramework || !window.gameFramework.socket) {
            console.error('❌ Socket not available for setupSocketListeners');
            // Try to wait for socket
            setTimeout(() => this.setupSocketListeners(), 500);
            return;
        }
        
        const socket = window.gameFramework.socket;
        
        socket.on('roomCreated', (data) => {
            console.log('🃏 Room created event received:', data);
            const roomCode = data.roomId || data;
            
            // Add room-created class to hide create/join buttons
            document.body.classList.add('room-created');
            
            this.showRoomCode(roomCode);
            this.showPlayerCustomization();
            this.showGameControls();
            
            console.log('✅ Room UI updated');
        });
        
        socket.on('roomJoined', (data) => {
            console.log('🃏 Room joined:', data);
            if (data.playerIndex !== undefined) {
            this.localPlayerIndex = data.playerIndex;
            }
            // Update roomId from gameFramework if available
            if (window.gameFramework && window.gameFramework.roomId) {
                const roomCode = typeof window.gameFramework.roomId === 'object' ? 
                    window.gameFramework.roomId.roomId : 
                    window.gameFramework.roomId;
                this.showRoomCode(roomCode);
            }
            this.showPlayerCustomization();
            this.showGameControls();
        });
        
        socket.on('playersUpdated', (data) => {
            console.log('🃏 Players updated:', data);
            // Update local player index if we can determine it
            if (Array.isArray(data) && window.gameFramework && window.gameFramework.playerId) {
                const playerIndex = data.findIndex(p => p.id === window.gameFramework.playerId);
                if (playerIndex !== -1) {
                    this.localPlayerIndex = playerIndex;
                }
            }
        });
        
        // ✅ CRITICAL FIX: Handle nickname change success
        socket.on('nicknameChanged', (data) => {
            console.log('✅ Nickname changed successfully:', data);
            
            // ✅ CRITICAL FIX: Store nickname in localStorage for persistence
            if (data.nickname && data.nickname.trim()) {
                localStorage.setItem('blackjackPlayerNickname', data.nickname.trim());
                console.log('🃏 Stored nickname in localStorage:', data.nickname.trim());
            }
            
            // ✅ Reset button state
            const changeBtn = document.getElementById('changeNicknameBtn');
            if (changeBtn) {
                changeBtn.textContent = 'Change';
                changeBtn.disabled = false;
            }
            
            // ✅ Clear input field
            const nicknameInput = document.getElementById('nicknameInput');
            if (nicknameInput) {
                nicknameInput.value = '';
            }
        });
        
        // ✅ CRITICAL FIX: Handle nickname change error
        socket.on('nicknameError', (errorMessage) => {
            console.error('❌ Nickname change error:', errorMessage);
            
            // ✅ Reset button state
            const changeBtn = document.getElementById('changeNicknameBtn');
            if (changeBtn) {
                changeBtn.textContent = 'Change';
                changeBtn.disabled = false;
            }
            
            alert(`Nickname change failed: ${errorMessage}`);
        });
        
        socket.on('gameStarted', (data) => {
            console.log('🃏 gameStarted event received:', data);
            // Transition to game view
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
        
        socket.on('roundStarted', (data) => {
            console.log('🃏 Round started:', data);
            this.game.roundNumber = data.roundNumber || this.game.roundNumber;
            this.game.gamePhase = data.gamePhase || 'betting';
            this.game.players = data.players || this.game.players;
            
            // Update betting limits if provided
            if (data.minBet !== undefined) {
                this.game.minBet = data.minBet;
            }
            if (data.maxBet !== undefined) {
                this.game.maxBet = data.maxBet;
            }
            
            // Update bet input constraints
            const betAmountInput = document.getElementById('betAmount');
            if (betAmountInput) {
                betAmountInput.min = this.game.minBet || 5;
                betAmountInput.max = this.game.maxBet || 1000;
                betAmountInput.value = Math.max(this.game.minBet || 5, parseInt(betAmountInput.value) || this.game.minBet || 5);
            }
            
            // Reset local player state for new round
            if (this.game.players[this.localPlayerIndex]) {
                this.canAct = false;
                this.isMyTurn = false;
            }
            
            this.updateUI();
            this.updateGameControls();
        });
        
        socket.on('turnChanged', (data) => {
            console.log('🃏 Turn changed:', data);
            this.game.currentPlayer = data.currentPlayer;
            this.game.gamePhase = data.gamePhase || this.game.gamePhase;
            
            this.isMyTurn = (data.gamePhase === 'playing' && data.currentPlayer === this.localPlayerIndex);
            if (this.game.players[this.localPlayerIndex]) {
                const localPlayer = this.game.players[this.localPlayerIndex];
                this.canAct = this.isMyTurn && !localPlayer.isBusted && 
                             !localPlayer.isStanding && 
                             !localPlayer.hasBlackjack &&
                             !this.isActing; // Prevent action if already acting
            } else {
                this.canAct = false;
            }
            
            this.updateUI();
            this.updateGameControls();
        });
        
        // Error handling
        socket.on('error', (error) => {
            console.error('❌ Socket error received:', error);
            
            // Reset acting flag if we're in betting flow
            if (this.isActing) {
                console.log('🃏 Resetting isActing flag due to error');
                this.isActing = false;
                const placeBetBtn = document.getElementById('placeBetBtn');
                if (placeBetBtn) {
                    placeBetBtn.disabled = false;
                    console.log('🃏 Re-enabled place bet button after error');
                }
            }
            
            // Show error message
            if (typeof UIUtils !== 'undefined') {
            UIUtils.showGameMessage('Error: ' + error, 'error');
            } else {
                alert('Error: ' + error);
            }
        });
    }

    // Create room
    createRoom() {
        console.log('🃏 ===== CREATE ROOM FUNCTION CALLED =====');
        console.log('🃏 Create Room button clicked');
        console.trace('Stack trace:');
        
        // ✅ CRITICAL FIX: Clear player nickname when creating new room to reset to default names
        localStorage.removeItem('blackjackPlayerNickname');
        console.log('🃏 Cleared blackjackPlayerNickname - names will reset to default');
        
        // Check if socket is ready
        const checkAndCreateRoom = () => {
            if (typeof GameFramework === 'undefined' || !GameFramework.createRoom) {
                console.error('❌ GameFramework not available');
                return false;
            }
            
            // Check if socket is initialized and connected
            if (!window.gameFramework || !window.gameFramework.socket) {
                console.log('⏳ Socket not initialized yet');
                return false;
            }
            
            if (!window.gameFramework.socket.connected) {
                console.log('⏳ Socket not connected yet');
                return false;
            }
            
            console.log('✅ Everything ready, creating room');
            GameFramework.createRoom('blackjack');
            return true;
        };
        
        // Try immediately
        if (checkAndCreateRoom()) {
            return;
        }
        
        // If not ready, wait and retry
        console.log('⏳ Waiting for socket to be ready...');
        let attempts = 0;
        const maxAttempts = 20; // Increased attempts
        
        const tryCreateRoom = () => {
            attempts++;
            console.log(`🔄 Attempt ${attempts}/${maxAttempts} to create room`);
            console.log('  - GameFramework:', typeof GameFramework);
            console.log('  - GameFramework.createRoom:', typeof GameFramework?.createRoom);
            console.log('  - window.gameFramework:', !!window.gameFramework);
            console.log('  - window.gameFramework.socket:', !!window.gameFramework?.socket);
            console.log('  - socket.connected:', window.gameFramework?.socket?.connected);
            
            if (checkAndCreateRoom()) {
                return;
            }
            
            if (attempts < maxAttempts) {
                setTimeout(tryCreateRoom, 300); // Wait 300ms between attempts
            } else {
                console.error('❌ Could not create room after maximum attempts');
                if (typeof UIUtils !== 'undefined' && UIUtils.showGameMessage) {
                    UIUtils.showGameMessage('Unable to create room. Please refresh the page.', 'error');
                } else {
                    alert('Unable to create room. Please refresh the page.');
                }
            }
        };
        
        setTimeout(tryCreateRoom, 200);
    }

    // Join room
    joinRoom() {
        console.log('🃏 Join Room button clicked');
        
        // Try to join room immediately first
        if (typeof GameFramework !== 'undefined' && GameFramework.joinRoom) {
            // Get room code from input if available, otherwise use prompt
            const roomCodeInput = document.getElementById('roomCodeInput');
            let roomCode = null;
            
            if (roomCodeInput && roomCodeInput.value) {
                roomCode = roomCodeInput.value.trim();
            } else {
                roomCode = prompt('Enter room code:');
            }
            
        if (roomCode) {
                console.log('✅ GameFramework available, joining room:', roomCode);
                GameFramework.joinRoom(roomCode);
                return;
            }
        }
        
        // If not available, wait and retry
        console.log('⏳ GameFramework not ready, waiting...');
        let attempts = 0;
        const maxAttempts = 10;
        
        const tryJoinRoom = () => {
            attempts++;
            console.log(`🔄 Attempt ${attempts}/${maxAttempts} to join room`);
            
            if (typeof GameFramework !== 'undefined' && GameFramework.joinRoom) {
                const roomCodeInput = document.getElementById('roomCodeInput');
                let roomCode = null;
                
                if (roomCodeInput && roomCodeInput.value) {
                    roomCode = roomCodeInput.value.trim();
                } else {
                    roomCode = prompt('Enter room code:');
                }
                
                if (roomCode) {
                    console.log('✅ GameFramework now available, joining room:', roomCode);
                    GameFramework.joinRoom(roomCode);
                    return;
                }
            }
            
            if (attempts < maxAttempts) {
                setTimeout(tryJoinRoom, 200); // Wait 200ms between attempts
            } else {
                console.error('❌ GameFramework still not available after maximum attempts');
                if (typeof UIUtils !== 'undefined' && UIUtils.showGameMessage) {
                    UIUtils.showGameMessage('Game framework not ready. Please refresh the page.', 'error');
                } else {
                    alert('Game framework not ready. Please refresh the page.');
                }
            }
        };
        
        setTimeout(tryJoinRoom, 100);
    }

    // Add bot
    addBot() {
        const roomId = this.getRoomId();
        if (!roomId) {
            console.error('No room ID available');
            return;
        }
        
        const socket = window.gameFramework.socket;
        socket.emit('addBot', { roomId: roomId });
    }

    // Remove bot
    removeBot() {
        const roomId = this.getRoomId();
        if (!roomId) {
            console.error('No room ID available');
            return;
        }
        
        const socket = window.gameFramework.socket;
        socket.emit('removeBot', { roomId: roomId });
    }

    // Reset game state for fresh start
    resetGameState() {
        console.log('🃏 Resetting game state for fresh start');
        
        // Reset UI state
        this.isMyTurn = false;
        this.canAct = false;
        this.isActing = false;
        
        // Clear any previous game data
        if (this.game) {
            this.game.players = [];
            this.game.dealer = { hand: [], value: 0, isBusted: false, hasBlackjack: false, holeCardVisible: false };
            this.game.gamePhase = 'betting';
            this.game.currentPlayer = 0;
            this.game.roundNumber = 1;
        }
        
        // Clear player areas container
        const playerAreasContainer = document.getElementById('playerAreasContainer');
        if (playerAreasContainer) {
            playerAreasContainer.innerHTML = '';
        }
        
        // Clear dealer cards
        const dealerCards = document.getElementById('dealerCards');
        if (dealerCards) {
            dealerCards.innerHTML = '';
        }
        
        // Reset dealer value display
        const dealerValue = document.getElementById('dealerValue');
        if (dealerValue) {
            dealerValue.textContent = '0';
        }
        
        // Reset player chips display
        const playerChips = document.getElementById('playerChips');
        if (playerChips) {
            playerChips.textContent = '1000';
        }
        
        // Reset round number
        const roundNumber = document.getElementById('roundNumber');
        if (roundNumber) {
            roundNumber.textContent = '1';
        }
    }

    // Start game
    startGame(data = null) {
        console.log('🃏 Starting Blackjack game with data:', data);
        
        // Reset state for fresh start
        this.resetGameState();
        
        if (data) {
            // Sync with server state
            if (data.localPlayerIndex !== undefined) {
                this.localPlayerIndex = data.localPlayerIndex;
            }
            
            // Update game state from server
            this.game.players = data.players || this.game.players;
            this.game.dealer = data.dealer || this.game.dealer;
            this.game.currentPlayer = data.currentPlayer !== undefined ? data.currentPlayer : this.game.currentPlayer;
            this.game.gamePhase = data.gamePhase || this.game.gamePhase || 'betting';
            this.game.roundNumber = data.roundNumber || this.game.roundNumber || 1;
            
            // Update betting limits
            if (data.minBet !== undefined) {
                this.game.minBet = data.minBet;
            }
            if (data.maxBet !== undefined) {
                this.game.maxBet = data.maxBet;
            }
            
            console.log('🃏 Game state synced:', {
                phase: this.game.gamePhase,
                currentPlayer: this.game.currentPlayer,
                localPlayerIndex: this.localPlayerIndex,
                players: this.game.players.length,
                minBet: this.game.minBet,
                maxBet: this.game.maxBet
            });
            
            // Update bet input constraints
            const betAmountInput = document.getElementById('betAmount');
            if (betAmountInput) {
                betAmountInput.min = this.game.minBet || 5;
                betAmountInput.max = this.game.maxBet || 1000;
                const currentValue = parseInt(betAmountInput.value) || this.game.minBet || 5;
                betAmountInput.value = Math.max(this.game.minBet || 5, Math.min(currentValue, this.game.maxBet || 1000));
            }
        } else {
            // Fallback initialization
            const roomPlayers = window.gameFramework.players || [];
            if (roomPlayers && roomPlayers.length > 0) {
                const gamePlayers = roomPlayers.map(player => ({
                    ...player,
                    hand: [],
                    value: 0,
                    bet: 0,
                    chips: player.startingChips || 1000,
                    isBusted: false,
                    hasBlackjack: false,
                    isStanding: false,
                    canDouble: false,
                    canSplit: false
                }));
                this.game.players = gamePlayers;
                this.game.gamePhase = 'betting';
            } else {
                console.error('ERROR: No players available to start game');
                UIUtils.showGameMessage('No players available to start game. Please add players first.', 'error');
                return;
            }
        }
        
        // Set global game instance
        window.game = this.game;
        
        // TRANSITION: Hide menu completely and show game
        const menuDiv = document.getElementById('Menu');
        const gameDiv = document.getElementById('Game');
        
        if (menuDiv) {
            menuDiv.style.display = 'none';
            menuDiv.style.visibility = 'hidden';
            menuDiv.style.zIndex = '0';
        }
        
        if (gameDiv) {
            // Show game container
            gameDiv.style.display = 'block';
            gameDiv.style.visibility = 'visible';
            gameDiv.style.position = 'fixed';
            gameDiv.style.top = '0';
            gameDiv.style.left = '0';
            gameDiv.style.width = '100%';
            gameDiv.style.height = '100%';
            gameDiv.style.zIndex = '1000';
            gameDiv.style.overflowY = 'auto';
            
            // Ensure blackjack-table fills container
            const blackjackTable = gameDiv.querySelector('.blackjack-table');
            if (blackjackTable) {
                blackjackTable.style.width = '100%';
                blackjackTable.style.height = '100%';
                blackjackTable.style.minHeight = '100vh';
            }
        }
        
        // Update document title
        document.title = 'Blackjack Game';
        
        // Setup navigation buttons for game view
        this.setupGameNavigationButtons();
        
        // Scroll to top
        window.scrollTo(0, 0);
        
        // Small delay to ensure DOM is ready, then update UI
        setTimeout(() => {
            // Update UI based on phase
        this.updateUI();
            this.updateGameControls();
            
            console.log('🃏 Game view displayed, menu hidden, UI updated');
        }, 100);
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
        console.log('🃏 Bet placed:', data);
        if (data.playerIndex !== undefined && this.game.players[data.playerIndex]) {
            this.game.players[data.playerIndex] = { ...this.game.players[data.playerIndex], ...data.player };
        }
        
        // Reset acting flag if this was the local player
        if (data.playerIndex === this.localPlayerIndex) {
            this.isActing = false;
        }
        
        // Update UI to reflect new bets
        this.updateUI();
        this.updateGameControls();
    }

    // Update cards dealt
    updateCardsDealt(data) {
        console.log('🃏 Cards dealt:', data);
        this.game.players = data.players || this.game.players;
        this.game.dealer = data.dealer || this.game.dealer;
        this.game.gamePhase = data.gamePhase || this.game.gamePhase;
        this.game.currentPlayer = data.currentPlayer !== undefined ? data.currentPlayer : this.game.currentPlayer;
        
        // Reset acting flag when cards are dealt
        this.isActing = false;
        
        // Update turn state
        this.isMyTurn = (this.game.gamePhase === 'playing' && this.game.currentPlayer === this.localPlayerIndex);
        if (this.game.players[this.localPlayerIndex]) {
            const localPlayer = this.game.players[this.localPlayerIndex];
            this.canAct = this.isMyTurn && !localPlayer.isBusted && 
                         !localPlayer.isStanding && 
                         !localPlayer.hasBlackjack &&
                         !this.isActing;
        } else {
            this.canAct = false;
        }
        
        this.updateUI();
        this.updateGameControls();
    }

    // Update player action
    updatePlayerAction(data) {
        console.log('🃏 Player action update received:', data);
        console.log('🃏   - playerIndex:', data.playerIndex);
        console.log('🃏   - action:', data.action);
        console.log('🃏   - player:', data.player);
        console.log('🃏   - gamePhase:', data.gamePhase);
        console.log('🃏   - currentPlayer:', data.currentPlayer);
        
        // Update player state - IMPORTANT: preserve hand array properly
        if (data.playerIndex !== undefined && this.game.players[data.playerIndex]) {
            const updatedPlayer = { ...this.game.players[data.playerIndex], ...data.player };
            // CRITICAL: Ensure hand array is properly updated (data.player.hand might replace the array)
            if (data.player && data.player.hand && Array.isArray(data.player.hand)) {
                updatedPlayer.hand = data.player.hand;
            }
            this.game.players[data.playerIndex] = updatedPlayer;
            console.log(`🃏 Updated player ${data.playerIndex} hand:`, updatedPlayer.hand);
            console.log(`🃏 Updated player ${data.playerIndex} value:`, updatedPlayer.value);
        }
        
        this.game.gamePhase = data.gamePhase || this.game.gamePhase;
        this.game.currentPlayer = data.currentPlayer !== undefined ? data.currentPlayer : this.game.currentPlayer;
        
        // Reset acting flag if this was the local player's action
        if (data.playerIndex === this.localPlayerIndex) {
            console.log('🃏 Resetting isActing flag for local player');
            this.isActing = false;
        }
        
        // Update turn state
        this.isMyTurn = (this.game.gamePhase === 'playing' && this.game.currentPlayer === this.localPlayerIndex);
        if (this.game.players[this.localPlayerIndex]) {
            const localPlayer = this.game.players[this.localPlayerIndex];
            this.canAct = this.isMyTurn && !localPlayer.isBusted && 
                         !localPlayer.isStanding && 
                         !localPlayer.hasBlackjack &&
                         !this.isActing; // Don't allow action if already acting
            console.log(`🃏 Turn state - isMyTurn: ${this.isMyTurn}, canAct: ${this.canAct}, isBusted: ${localPlayer.isBusted}, isStanding: ${localPlayer.isStanding}`);
        } else {
            this.canAct = false;
        }
        
        console.log('🃏 Calling updateUI() after player action');
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
        console.log('🃏 Round finished event received:', data);
        
        // IMPORTANT: Update players array with server data (includes updated chips)
        if (data.players && Array.isArray(data.players)) {
            console.log('🃏 Updating players array from server:', data.players.map(p => ({ name: p.name, chips: p.chips, winnings: p.winnings, bet: p.bet })));
            this.game.players = data.players;
        }
        
        this.game.dealer = data.dealer || this.game.dealer;
        this.game.gamePhase = data.gamePhase || 'finished';
        this.game.roundNumber = data.roundNumber || this.game.roundNumber;
        
        this.isMyTurn = false;
        this.canAct = false;
        
        // Show winnings message for local player
        const localPlayer = this.game.players[this.localPlayerIndex];
        if (localPlayer) {
            console.log('🃏 Local player chips after round:', localPlayer.chips);
            console.log('🃏 Local player winnings:', localPlayer.winnings);
            console.log('🃏 Local player bet was:', localPlayer.bet);
            
            if (localPlayer.winnings !== undefined) {
                // Calculate profit (winnings already includes bet back for wins/pushes)
                const profit = localPlayer.winnings - (localPlayer.bet || 0);
                
                if (profit > 0) {
                    console.log(`🃏 Player won! Profit: $${profit} (Total received: $${localPlayer.winnings}, bet was: $${localPlayer.bet})`);
                    if (typeof UIUtils !== 'undefined') {
                        UIUtils.showGameMessage(`You won $${profit}! (Total: $${localPlayer.winnings})`, 'success');
                    } else {
                        alert(`You won $${profit}! (Total: $${localPlayer.winnings})`);
                    }
                } else if (profit === 0 && localPlayer.winnings > 0) {
                    console.log('🃏 Push - bet returned');
                    if (typeof UIUtils !== 'undefined') {
                        UIUtils.showGameMessage(`Push - your bet of $${localPlayer.bet} is returned`, 'info');
                    } else {
                        alert(`Push - your bet of $${localPlayer.bet} is returned`);
                    }
                } else if (localPlayer.winnings === 0) {
                    console.log(`🃏 Player lost $${localPlayer.bet || 0}`);
                    if (typeof UIUtils !== 'undefined') {
                        UIUtils.showGameMessage(`You lost $${localPlayer.bet || 0}`, 'error');
                    } else {
                        alert(`You lost $${localPlayer.bet || 0}`);
                    }
                }
            }
        }
        
        console.log('🃏 Updating UI after round finished');
        this.updateUI();
        this.updateGameControls();
    }

    // Get room ID (handles both object and string formats)
    getRoomId() {
        if (typeof window.gameFramework === 'undefined' || !window.gameFramework.roomId) {
            return null;
        }
        const roomId = window.gameFramework.roomId;
        return typeof roomId === 'object' && roomId.roomId ? roomId.roomId : roomId;
    }

    // Player action
    playerAction(action) {
        // Prevent duplicate actions
        if (this.isActing) {
            console.log('🃏 Action already in progress, ignoring duplicate request');
            return;
        }
        
        if (!this.canAct) {
            if (typeof UIUtils !== 'undefined') {
            UIUtils.showGameMessage('It\'s not your turn', 'error');
            } else {
                alert('It\'s not your turn');
            }
            return;
        }
        
        // Validate action is allowed
        const localPlayer = this.game.players[this.localPlayerIndex];
        if (!localPlayer) {
            console.error('🃏 Local player not found');
            return;
        }
        
        if (localPlayer.isBusted || localPlayer.isStanding || localPlayer.hasBlackjack) {
            if (typeof UIUtils !== 'undefined') {
                UIUtils.showGameMessage('Cannot perform action in current state', 'error');
            } else {
                alert('Cannot perform action in current state');
            }
            return;
        }
        
        // Special validation for double and split
        if (action === 'double') {
            if (localPlayer.hand.length !== 2) {
                if (typeof UIUtils !== 'undefined') {
                    UIUtils.showGameMessage('Can only double down on first two cards', 'error');
                } else {
                    alert('Can only double down on first two cards');
                }
                return;
            }
            if (!localPlayer.canDouble || localPlayer.chips < localPlayer.bet) {
                if (typeof UIUtils !== 'undefined') {
                    UIUtils.showGameMessage('Cannot double down', 'error');
                } else {
                    alert('Cannot double down');
                }
                return;
            }
        }
        
        if (action === 'split') {
            if (localPlayer.hand.length !== 2 || localPlayer.hand[0].rank !== localPlayer.hand[1].rank) {
                if (typeof UIUtils !== 'undefined') {
                    UIUtils.showGameMessage('Can only split pairs', 'error');
                } else {
                    alert('Can only split pairs');
                }
                return;
            }
            if (!localPlayer.canSplit || localPlayer.chips < localPlayer.bet) {
                if (typeof UIUtils !== 'undefined') {
                    UIUtils.showGameMessage('Cannot split', 'error');
                } else {
                    alert('Cannot split');
                }
                return;
            }
        }
        
        // Set acting flag to prevent duplicates
        this.isActing = true;
        this.canAct = false;
        this.updateGameControls(); // Update UI immediately
        
        const roomId = this.getRoomId();
        if (!roomId) {
            console.error('🃏 No room ID available');
            this.isActing = false;
            this.updateGameControls();
            return;
        }
        
        const socket = window.gameFramework.socket;
        if (!socket || !socket.connected) {
            console.error('🃏 Socket not connected');
            this.isActing = false;
            this.updateGameControls();
            if (typeof UIUtils !== 'undefined') {
                UIUtils.showGameMessage('Not connected to server', 'error');
            } else {
                alert('Not connected to server');
            }
            return;
        }
        
        console.log(`🃏 Emitting playerAction: ${action}`);
        console.log(`🃏   - roomId: ${roomId}`);
        console.log(`🃏   - playerIndex: ${this.localPlayerIndex}`);
        console.log(`🃏   - socket.id: ${socket.id}`);
        console.log(`🃏   - socket.connected: ${socket.connected}`);
        
        socket.emit('playerAction', {
            roomId: roomId,
            playerIndex: this.localPlayerIndex,
            action: action
        }, (response) => {
            // Optional acknowledgment callback
            if (response) {
                console.log('🃏 playerAction acknowledgment:', response);
            }
        });
        
        console.log('✅ playerAction event emitted');
    }

    // Place bet
    placeBet(amount) {
        console.log('🃏 placeBet() called with amount:', amount);
        
        const roomId = this.getRoomId();
        if (!roomId) {
            console.error('❌ No room ID available');
            this.isActing = false;
            const placeBetBtn = document.getElementById('placeBetBtn');
            if (placeBetBtn) placeBetBtn.disabled = false;
            if (typeof UIUtils !== 'undefined') {
                UIUtils.showGameMessage('No room ID available', 'error');
            } else {
                alert('No room ID available');
            }
            return;
        }
        
        const socket = window.gameFramework?.socket;
        if (!socket) {
            console.error('❌ No socket available');
            this.isActing = false;
            const placeBetBtn = document.getElementById('placeBetBtn');
            if (placeBetBtn) placeBetBtn.disabled = false;
            if (typeof UIUtils !== 'undefined') {
                UIUtils.showGameMessage('Not connected to server', 'error');
            } else {
                alert('Not connected to server');
            }
            return;
        }
        
        // Verify socket connection
        console.log('🃏 Socket connection status:', {
            connected: socket.connected,
            id: socket.id,
            disconnected: socket.disconnected,
            roomId: roomId
        });
        
        if (!socket.connected) {
            console.error('❌ Socket is not connected!');
            this.isActing = false;
            const placeBetBtn = document.getElementById('placeBetBtn');
            if (placeBetBtn) placeBetBtn.disabled = false;
            if (typeof UIUtils !== 'undefined') {
                UIUtils.showGameMessage('Socket not connected. Please refresh the page.', 'error');
            } else {
                alert('Socket not connected. Please refresh the page.');
            }
            return;
        }
        
        const eventData = {
            roomId: roomId,
            playerIndex: this.localPlayerIndex,
            amount: amount
        };
        
        console.log('🃏 Emitting placeBet event to server:', eventData);
        console.log('🃏 Socket ID:', socket.id);
        console.log('🃏 Socket connected:', socket.connected);
        
        // Emit with callback to verify it was sent
        socket.emit('placeBet', eventData, (response) => {
            console.log('🃏 placeBet event acknowledgment received:', response);
        });
        
        console.log('✅ placeBet event emitted successfully');
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
        console.log('🃏 updateUI called - phase:', this.game.gamePhase);
        console.log('  - Dealer hand length:', this.game.dealer?.hand?.length);
        console.log('  - Players with cards:', this.game.players?.filter(p => p.hand && p.hand.length > 0).map(p => ({ name: p.name, cards: p.hand.length })));
        
        // Update player areas
        this.updatePlayerAreas();
        
        // Update dealer area
        this.updateDealerArea();
        
        // Update game info
        this.updateGameInfo();
        
        console.log('🃏 UI update complete');
    }

    // Update player areas
    updatePlayerAreas() {
        // Update both menu player list and game player areas
        const playerList = document.getElementById('playerList');
        const playerAreasContainer = document.getElementById('playerAreasContainer');
            
        if (playerList && this.game.players) {
            playerList.innerHTML = '';
            this.game.players.forEach((player, index) => {
                const playerDiv = document.createElement('div');
                playerDiv.className = 'player-item';
                
                if (index === this.game.currentPlayer && this.game.gamePhase === 'playing') {
                    playerDiv.classList.add('active');
                }
                
                playerDiv.innerHTML = `
                    <div class="player-name">${player.name}${player.isBot ? ' (Bot)' : ''}</div>
                    <div class="player-chips">Chips: $${player.chips}</div>
                    <div class="player-bet">Bet: $${player.bet}</div>
                    <div class="player-value">Value: ${player.value || 0}</div>
                `;
                
                playerList.appendChild(playerDiv);
            });
        }
        
        // Update game view player areas
        if (playerAreasContainer && this.game.players) {
            playerAreasContainer.innerHTML = '';
            
            this.game.players.forEach((player, index) => {
                const playerDiv = document.createElement('div');
                playerDiv.className = 'player-area';
                
                if (index === this.game.currentPlayer && this.game.gamePhase === 'playing') {
                    playerDiv.classList.add('active');
                }
                
                if (player.isBusted) {
                    playerDiv.classList.add('busted');
                } else if (player.hasBlackjack) {
                    playerDiv.classList.add('blackjack');
                }
                
                let statusText = '';
                if (player.isBusted) {
                    statusText = '<div style="color: #f44336; font-weight: bold; margin-top: 5px;">BUSTED!</div>';
                } else if (player.hasBlackjack) {
                    statusText = '<div style="color: #4CAF50; font-weight: bold; margin-top: 5px;">BLACKJACK!</div>';
                } else if (player.isStanding) {
                    statusText = '<div style="color: #FFD700; margin-top: 5px;">Standing</div>';
                }
                
                const isLocalPlayer = index === this.localPlayerIndex;
                
                // Try to use card images if available
                const cardHTML = player.hand && player.hand.length > 0 ? 
                    player.hand.map((card, cardIndex) => {
                        console.log(`🃏 Rendering player ${player.name} card ${cardIndex}:`, card.name || card);
                        // Try to find card image - handle both formats
                        let cardImageName = null;
                        if (card.name) {
                            const name1 = card.name.toLowerCase().replace(/\s+/g, '_');
                            cardImageName = name1;
                        }
                        
                        // Get card image URL - use direct path
                        const baseUrl = window.location.origin;
                        let imageUrl = null;
                        
                        // Try to get image URL from p5.js image object first
                        let cardImage = null;
                        if (window.cardImages && cardImageName) {
                            cardImage = window.cardImages[cardImageName];
                        }
                        
                        // Try alternative name format if first attempt failed
                        if (!cardImage && card.name) {
                            const altName = card.name.toLowerCase().replace(/\s+/g, '_');
                            if (window.cardImages && window.cardImages[altName]) {
                                cardImage = window.cardImages[altName];
                                if (!cardImageName || !window.cardImages[cardImageName]) {
                                    cardImageName = altName;
                                }
                            }
                        }
                        
                        // Get image URL from p5.js image object or construct direct path
                        if (cardImage && cardImage.elt && cardImage.elt.src) {
                            imageUrl = cardImage.elt.src;
                        } else if (cardImage && cardImage.canvas) {
                            // Convert canvas to data URL
                            imageUrl = cardImage.canvas.toDataURL('image/png');
                        } else if (cardImageName) {
                            // Use direct URL path
                            imageUrl = `${baseUrl}/Images/${cardImageName}.png`;
                        }
                        
                        const shortName = (card.name || '').replace(' of ', ' ').replace(/jack|queen|king|ace/gi, m => {
                            const map = {jack:'J', queen:'Q', king:'K', ace:'A'};
                            return map[m.toLowerCase()] || m;
                        });
                        const cardColor = (card.suit === 'hearts' || card.suit === 'diamonds') ? '#d32f2f' : '#333';
                        const fallbackHtml = '<div style="padding: 8px; background: linear-gradient(135deg, #fff, #f5f5f5); border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"><div style="font-size: 14px; font-weight: bold; color: ' + cardColor + '; text-align: center;">' + shortName + '</div></div>';
                        const escapedFallback = fallbackHtml.replace(/'/g, "\\'").replace(/"/g, '&quot;');
                        
                        if (imageUrl) {
                            // Use card image
                            console.log(`🃏 Using card image URL for player: ${imageUrl.substring(0, 50)}...`);
                            return '<div class="card"><img src="' + imageUrl + '" alt="' + (card.name || shortName) + '" onload="console.log(\'✅ Card image loaded: ' + (card.name || shortName) + '\');" onerror="console.warn(\'❌ Card image failed: ' + (card.name || shortName) + '\'); this.parentElement.innerHTML=\'' + escapedFallback + '\';" style="width: 100%; height: 100%; object-fit: cover; border-radius: 5px;"></div>';
                        } else {
                            console.warn('❌ No image URL found for player card:', card.name, 'cardImageName:', cardImageName);
                            // Fallback to styled text card
                            return '<div class="card" style="background: linear-gradient(135deg, #fff, #f5f5f5); padding: 8px;"><div style="font-size: 14px; font-weight: bold; color: ' + cardColor + '; text-align: center;">' + shortName + '</div></div>';
                        }
                        
                    }).join('') : '';
                
                // ✅ CRITICAL FIX: Show nickname with "(you)" for local player, or just name for others
                const displayName = isLocalPlayer ? `${player.name || 'You'} (you)` : (player.name || `Player ${index + 1}`);
                playerDiv.innerHTML = `
                    <div class="player-name" style="font-weight: bold; margin-bottom: 8px; font-size: 16px; text-shadow: 1px 1px 2px rgba(0,0,0,0.5);">${displayName}${player.isBot ? ' (Bot)' : ''}</div>
                    <div style="font-size: 13px; margin-bottom: 4px; color: #FFD700; font-weight: bold;">💰 Chips: $${player.chips}</div>
                    <div style="font-size: 13px; margin-bottom: 4px; color: #4CAF50; font-weight: bold;">🎲 Bet: $${player.bet}</div>
                    ${player.hand && player.hand.length > 0 ? `
                        <div class="hand-cards" style="margin: 10px 0;">
                            ${cardHTML}
                        </div>
                    ` : ''}
                    <div class="hand-value" style="font-size: 15px; font-weight: bold; margin-top: 8px; color: #FFD700; text-shadow: 1px 1px 2px rgba(0,0,0,0.5);">Value: ${player.value || 0}</div>
                    ${statusText}
                `;
                
                playerAreasContainer.appendChild(playerDiv);
            });
        }
    }

    // Update dealer area
    updateDealerArea() {
        const dealerArea = document.getElementById('dealerArea');
        const dealerCards = document.getElementById('dealerCards');
        const dealerValue = document.getElementById('dealerValue');
        
        if (dealerArea && this.game.dealer) {
            const dealerNameEl = dealerArea.querySelector('.dealer-name');
            if (dealerNameEl) {
                dealerNameEl.textContent = 'Dealer';
            }
        }
        
        if (dealerCards && this.game.dealer && this.game.dealer.hand) {
            dealerCards.innerHTML = '';
            this.game.dealer.hand.forEach((card, index) => {
                const cardDiv = document.createElement('div');
                cardDiv.className = 'card';
                
                // Hide first card if it's the hole card and not visible
                if (index === 0 && !this.game.dealer.holeCardVisible) {
                    cardDiv.classList.add('hidden');
                    cardDiv.innerHTML = ''; // Clear any content, CSS will show the ?
                } else {
                    // Try to use card image if available - handle both formats
                    let cardImageName = null;
                    if (card.name) {
                        const name1 = card.name.toLowerCase().replace(/\s+/g, '_');
                        cardImageName = name1;
                    }
                    
                    // Get card image URL - use direct path (same logic as player cards)
                    const baseUrl = window.location.origin;
                    let imageUrl = null;
                    
                    // Try to get image URL from p5.js image object first
                    let cardImage = null;
                    if (window.cardImages && cardImageName) {
                        cardImage = window.cardImages[cardImageName];
                    }
                    
                    // Try alternative name format if first attempt failed
                    if (!cardImage && card.name) {
                        const altName = card.name.toLowerCase().replace(/\s+/g, '_');
                        if (window.cardImages && window.cardImages[altName]) {
                            cardImage = window.cardImages[altName];
                            if (!cardImageName || !window.cardImages[cardImageName]) {
                                cardImageName = altName;
                            }
                        }
                    }
                    
                    // Get image URL from p5.js image object or construct direct path
                    if (cardImage && cardImage.elt && cardImage.elt.src) {
                        imageUrl = cardImage.elt.src;
                    } else if (cardImage && cardImage.canvas) {
                        // Convert canvas to data URL
                        imageUrl = cardImage.canvas.toDataURL('image/png');
                    } else if (cardImageName) {
                        // Use direct URL path
                        imageUrl = `${baseUrl}/Images/${cardImageName}.png`;
                    }
                    
                    const shortName = card.name ? card.name.replace(' of ', ' ').replace(/jack|queen|king|ace/gi, (match) => {
                        const map = {jack: 'J', queen: 'Q', king: 'K', ace: 'A'};
                        return map[match.toLowerCase()] || match;
                    }) : '';
                    const cardColor = (card.suit === 'hearts' || card.suit === 'diamonds') ? '#d32f2f' : '#333';
                    
                    if (imageUrl) {
                        // Use card image
                        const img = document.createElement('img');
                        img.src = imageUrl;
                        img.alt = card.name || shortName;
                        img.style.width = '100%';
                        img.style.height = '100%';
                        img.style.objectFit = 'cover';
                        img.style.borderRadius = '5px';
                        img.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
                        img.onerror = function() {
                            console.warn('Card image failed to load, using fallback:', card.name);
                            // Fallback to styled text card
                            cardDiv.innerHTML = `<div style="padding: 8px; background: linear-gradient(135deg, #fff, #f5f5f5); border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                                <div style="font-size: 14px; font-weight: bold; color: ${cardColor}; text-align: center;">
                                    ${shortName}
                                </div>
                            </div>`;
                        };
                        cardDiv.appendChild(img);
                    } else {
                        // Fallback to styled text card
                        cardDiv.innerHTML = `<div style="padding: 8px; background: linear-gradient(135deg, #fff, #f5f5f5); border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                            <div style="font-size: 14px; font-weight: bold; color: ${cardColor}; text-align: center;">
                                ${shortName}
                            </div>
                        </div>`;
                    }
                }
                
                dealerCards.appendChild(cardDiv);
            });
        }
        
        if (dealerValue && this.game.dealer) {
            // Show value only if hole card is visible
            if (this.game.dealer.holeCardVisible || this.game.dealer.hand.length <= 1) {
                dealerValue.textContent = `Value: ${this.game.dealer.value}`;
            } else {
                // Only show value of visible card (second card) - use server value if available
                if (this.game.dealer.value !== undefined && this.game.dealer.hand.length > 1) {
                    dealerValue.textContent = `Value: ${this.game.dealer.value}?`;
                } else {
                    // Fallback calculation
                    const visibleCard = this.game.dealer.hand[1];
                    const visibleCardValue = visibleCard ? 
                        (visibleCard.rank === 'ace' ? 11 : 
                         ['jack', 'queen', 'king'].includes(visibleCard.rank) ? 10 : 
                         visibleCard.value) : 0;
                    dealerValue.textContent = `Value: ${visibleCardValue}?`;
                }
            }
        }
    }

    // Update game info
    updateGameInfo() {
        // Update round number
        const roundNumberEl = document.getElementById('roundNumber');
        if (roundNumberEl) {
            roundNumberEl.textContent = this.game.roundNumber || 1;
        }
        
        // Update game phase
        const gamePhaseEl = document.getElementById('gamePhase');
        if (gamePhaseEl) {
            const phase = this.game.gamePhase || 'waiting';
            const phaseDisplay = phase.charAt(0).toUpperCase() + phase.slice(1);
            gamePhaseEl.textContent = phaseDisplay;
        }
        
        // Update total players
        const totalPlayersEl = document.getElementById('totalPlayers');
        if (totalPlayersEl && this.game.players) {
            totalPlayersEl.textContent = this.game.players.length;
        }
        
        // Update player chips
        const playerChipsEl = document.getElementById('playerChips');
        const localPlayer = this.game.players && this.game.players[this.localPlayerIndex];
        if (playerChipsEl && localPlayer) {
            playerChipsEl.textContent = `$${localPlayer.chips || 0}`;
        }
        
        // Update current bet
        const currentBetEl = document.getElementById('currentBet');
        if (currentBetEl && localPlayer) {
            currentBetEl.textContent = `$${localPlayer.bet || 0}`;
        }
        
        // Update player hand value
        const playerHandValueEl = document.getElementById('playerHandValue');
        if (playerHandValueEl && localPlayer) {
            if (localPlayer.hand && localPlayer.hand.length > 0) {
                const value = localPlayer.value || 0;
                if (localPlayer.isBusted) {
                    playerHandValueEl.textContent = `${value} (BUST!)`;
                    playerHandValueEl.style.color = '#f44336';
                } else if (localPlayer.hasBlackjack) {
                    playerHandValueEl.textContent = `${value} (BLACKJACK!)`;
                    playerHandValueEl.style.color = '#4CAF50';
                } else {
                    playerHandValueEl.textContent = value;
                    playerHandValueEl.style.color = '#FFD700';
                }
            } else {
                playerHandValueEl.textContent = '-';
                playerHandValueEl.style.color = '#FFD700';
            }
        }
    }

    // Update game controls
    updateGameControls() {
        const bettingArea = document.getElementById('bettingArea');
        const bettingControls = document.getElementById('bettingControls');
        const hitBtn = document.getElementById('hitBtn');
        const standBtn = document.getElementById('standBtn');
        const doubleBtn = document.getElementById('doubleBtn');
        const splitBtn = document.getElementById('splitBtn');
        const placeBetBtn = document.getElementById('placeBetBtn');
        
        const localPlayer = this.game.players[this.localPlayerIndex];
        const isBettingPhase = this.game.gamePhase === 'betting';
        const needsToBet = localPlayer && localPlayer.bet === 0 && !localPlayer.isBot;
        
        console.log('🃏 updateGameControls - betting phase:', isBettingPhase, 'needsToBet:', needsToBet, 'localPlayer:', localPlayer ? { name: localPlayer.name, bet: localPlayer.bet, isBot: localPlayer.isBot } : null);
        
        // Show betting area during betting phase if player hasn't bet
        if (bettingArea) {
            const shouldShow = isBettingPhase && needsToBet;
            bettingArea.style.display = shouldShow ? 'flex' : 'none';
            console.log('🃏 Betting area display:', shouldShow ? 'flex (visible)' : 'none (hidden)');
            
            // ✅ CRITICAL FIX: Adjust player boxes position based on betting area visibility
            const playerAreasContainer = document.getElementById('playerAreasContainer');
            if (playerAreasContainer) {
                if (shouldShow) {
                    // Move player boxes up when betting area is visible to prevent overlap
                    playerAreasContainer.style.bottom = '200px';
                    console.log('🃏 Player boxes moved up to 200px (betting area visible)');
                } else {
                    // Move player boxes back to original position when betting area is hidden
                    playerAreasContainer.style.bottom = '120px';
                    console.log('🃏 Player boxes moved back to 120px (betting area hidden)');
                }
            }
            
            // Ensure place bet button is enabled if betting area is visible
            if (shouldShow && placeBetBtn) {
                placeBetBtn.disabled = this.isActing || false;
                console.log('🃏 Place bet button enabled:', !this.isActing, 'disabled:', placeBetBtn.disabled);
            }
        } else {
            console.warn('❌ Betting area element not found');
        }
        
        // Show game controls during playing phase
        if (bettingControls) {
            bettingControls.style.display = (this.game.gamePhase === 'playing') ? 'flex' : 'none';
        }
        
        // Don't show buttons if acting
        const canShowButtons = this.canAct && !this.isActing;
        
        if (hitBtn) {
            hitBtn.style.display = canShowButtons ? 'inline-block' : 'none';
            hitBtn.disabled = this.isActing || !this.canAct;
        }
        if (standBtn) {
            standBtn.style.display = canShowButtons ? 'inline-block' : 'none';
            standBtn.disabled = this.isActing || !this.canAct;
        }
        
        // Double down only available on first 2 cards and if player can afford it
        const canDoubleNow = localPlayer && localPlayer.canDouble && localPlayer.hand && localPlayer.hand.length === 2 && localPlayer.chips >= localPlayer.bet;
        if (doubleBtn) {
            doubleBtn.style.display = (canShowButtons && canDoubleNow) ? 'inline-block' : 'none';
            doubleBtn.disabled = this.isActing || !this.canAct || !canDoubleNow;
        }
        
        // Split only available on first 2 cards of same rank
        const canSplitNow = localPlayer && localPlayer.canSplit && localPlayer.hand && localPlayer.hand.length === 2 && 
                            localPlayer.hand[0] && localPlayer.hand[1] && 
                            localPlayer.hand[0].rank === localPlayer.hand[1].rank &&
                            localPlayer.chips >= localPlayer.bet;
        if (splitBtn) {
            splitBtn.style.display = (canShowButtons && canSplitNow) ? 'inline-block' : 'none';
            splitBtn.disabled = this.isActing || !this.canAct || !canSplitNow;
        }
        
        // Update player chips display
        const playerChipsEl = document.getElementById('playerChips');
        if (playerChipsEl && localPlayer) {
            playerChipsEl.textContent = localPlayer.chips;
        }
        
        // Update round number
        const roundNumberEl = document.getElementById('roundNumber');
        if (roundNumberEl) {
            roundNumberEl.textContent = this.game.roundNumber;
        }
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

    // Setup navigation buttons for game view
    setupGameNavigationButtons() {
        console.log('🃏 Setting up game navigation buttons...');
        
        // Back to Main Menu button
        const backToMainMenuBtn = document.getElementById('backToMainMenuGameBtn');
        if (backToMainMenuBtn) {
            backToMainMenuBtn.onclick = () => {
                if (confirm('Are you sure you want to leave the game and return to the main menu? You will lose your current game progress.')) {
                    console.log('🏠 Navigating to main menu...');
                    window.location.href = '/';
                }
            };
            console.log('✅ Back to Main Menu button handler attached');
        } else {
            console.warn('⚠️ Back to Main Menu button not found');
        }
        
        // Blackjack Menu button
        const blackjackMenuBtn = document.getElementById('blackjackMenuGameBtn');
        if (blackjackMenuBtn) {
            blackjackMenuBtn.onclick = () => {
                if (confirm('Are you sure you want to return to the Blackjack menu? You will leave the current game.')) {
                    console.log('🃏 Returning to Blackjack menu...');
                    window.location.reload();
                }
            };
            console.log('✅ Blackjack Menu button handler attached');
        } else {
            console.warn('⚠️ Blackjack Menu button not found');
        }
    }
    
    // Show menu (called from game menu button)
    showMenu() {
        console.log('🃏 Showing Blackjack menu...');
        const menuDiv = document.getElementById('Menu');
        const gameDiv = document.getElementById('Game');
        
        if (menuDiv) {
            menuDiv.style.display = 'flex';
        }
        
        if (gameDiv) {
            gameDiv.style.display = 'none';
        }
        
        // Reset game state
        this.reset();
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
        // ✅ CRITICAL FIX: Show nickname with "(you)" for local player
        const isLocalPlayer = index === (window.blackjackClient?.localPlayerIndex ?? -1);
        const displayName = isLocalPlayer ? `${player.name || 'You'} (you)` : (player.name || `Player ${index + 1}`);
        text(displayName, playerX + playerWidth/2, playerY - 30);
        
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
// Client initialization is handled in blackjack.html
// This prevents duplicate initialization