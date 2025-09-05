// TEXAS HOLD'EM POKER GAME LOGIC

class PokerGame {
    constructor() {
        this.deck = [];
        this.communityCards = [];
        this.players = [];
        this.pot = 0;
        this.currentBet = 0;
        this.currentPlayer = 0;
        this.gamePhase = 'preflop'; // preflop, flop, turn, river, showdown
        this.bettingRound = 0;
        this.smallBlind = 10;
        this.bigBlind = 20;
        this.dealerPosition = 0;
        this.sidePots = [];
        this.winners = [];
        this.handRankings = [
            'High Card', 'One Pair', 'Two Pair', 'Three of a Kind',
            'Straight', 'Flush', 'Full House', 'Four of a Kind',
            'Straight Flush', 'Royal Flush'
        ];
    }

    // Initialize the game
    initialize(players) {
        this.players = players.map(player => ({
            ...player,
            hand: [],
            chips: player.startingChips || 1000,
            currentBet: 0,
            totalBet: 0,
            isFolded: false,
            isAllIn: false,
            handRank: null,
            bestHand: null
        }));
        
        this.deck = CardUtils.createStandardDeck();
        this.communityCards = [];
        this.pot = 0;
        this.currentBet = 0;
        this.bettingRound = 0;
        this.gamePhase = 'preflop';
        this.winners = [];
        
        console.log('Poker game initialized with', this.players.length, 'players');
    }

    // Start a new hand
    startNewHand() {
        console.log('Starting new hand');
        
        // Reset player states
        this.players.forEach(player => {
            player.hand = [];
            player.currentBet = 0;
            player.isFolded = false;
            player.isAllIn = false;
            player.handRank = null;
            player.bestHand = null;
        });
        
        // Reset game state
        this.communityCards = [];
        this.pot = 0;
        this.currentBet = 0;
        this.bettingRound = 0;
        this.gamePhase = 'preflop';
        this.winners = [];
        
        // Move dealer button
        this.dealerPosition = (this.dealerPosition + 1) % this.players.length;
        
        // Shuffle deck
        this.deck = CardUtils.createStandardDeck();
        CardUtils.shuffleDeck(this.deck);
        
        // Post blinds
        this.postBlinds();
        
        // Deal hole cards
        this.dealHoleCards();
        
        // Start first betting round
        this.startBettingRound();
    }

    // Post small and big blinds
    postBlinds() {
        console.log('Posting blinds - players:', this.players);
        console.log('Players length:', this.players?.length);
        console.log('Dealer position:', this.dealerPosition);
        
        // Safety check - ensure we have players
        if (!this.players || this.players.length === 0) {
            console.error('ERROR: Cannot post blinds - no players available');
            return;
        }
        
        const smallBlindPos = (this.dealerPosition + 1) % this.players.length;
        const bigBlindPos = (this.dealerPosition + 2) % this.players.length;
        
        console.log('Small blind position:', smallBlindPos);
        console.log('Big blind position:', bigBlindPos);
        console.log('Small blind player:', this.players[smallBlindPos]);
        console.log('Big blind player:', this.players[bigBlindPos]);
        
        // Safety check - ensure players exist at calculated positions
        if (!this.players[smallBlindPos] || !this.players[bigBlindPos]) {
            console.error('ERROR: Cannot post blinds - players not found at calculated positions');
            return;
        }
        
        // Post small blind
        this.players[smallBlindPos].chips -= this.smallBlind;
        this.players[smallBlindPos].currentBet = this.smallBlind;
        this.players[smallBlindPos].totalBet = this.smallBlind;
        this.pot += this.smallBlind;
        
        // Post big blind
        this.players[bigBlindPos].chips -= this.bigBlind;
        this.players[bigBlindPos].currentBet = this.bigBlind;
        this.players[bigBlindPos].totalBet = this.bigBlind;
        this.pot += this.bigBlind;
        this.currentBet = this.bigBlind;
        
        console.log('Blinds posted: SB $' + this.smallBlind + ', BB $' + this.bigBlind);
    }

    // Deal hole cards to all players
    dealHoleCards() {
        for (let i = 0; i < 2; i++) {
            for (let player of this.players) {
                if (!player.isFolded && player.chips > 0) {
                    player.hand.push(this.deck.pop());
                }
            }
        }
        console.log('Hole cards dealt');
    }

    // Start a betting round
    startBettingRound() {
        console.log('Starting ' + this.gamePhase + ' betting round');
        
        // Reset current bets for this round (but preserve totalBet)
        this.players.forEach(player => {
            player.currentBet = 0;
        });
        
        // Don't reset currentBet to 0 - it should be the amount to call
        
        // Emit betting round started event
        this.emitEvent('bettingRoundStarted', {
            phase: this.gamePhase,
            currentPlayer: this.currentPlayer,
            currentBet: this.currentBet,
            pot: this.pot,
            players: this.players
        });
    }

    // Player action (bet, call, raise, fold)
    playerAction(playerIndex, action, amount = 0) {
        const player = this.players[playerIndex];
        if (!player || player.isFolded || player.isAllIn) {
            return false;
        }
        
        console.log('Player ' + player.name + ' ' + action + 's ' + (amount > 0 ? '$' + amount : ''));
        
        switch (action) {
            case 'fold':
                player.isFolded = true;
                break;
                
            case 'call':
                const callAmount = Math.min(this.currentBet - player.currentBet, player.chips);
                player.chips -= callAmount;
                player.currentBet += callAmount;
                player.totalBet += callAmount;
                this.pot += callAmount;
                
                if (player.chips === 0) {
                    player.isAllIn = true;
                }
                break;
                
            case 'raise':
            case 'bet':
                const raiseAmount = Math.min(amount, player.chips);
                player.chips -= raiseAmount;
                player.currentBet += raiseAmount;
                player.totalBet += raiseAmount;
                this.pot += raiseAmount;
                this.currentBet = player.currentBet;
                
                if (player.chips === 0) {
                    player.isAllIn = true;
                }
                break;
        }
        
        // Emit action event
        this.emitEvent('playerAction', {
            playerIndex: playerIndex,
            action: action,
            amount: amount,
            currentBet: this.currentBet,
            pot: this.pot,
            players: this.players
        });
        
        // Move to next player
        this.nextPlayer();
        
        return true;
    }

    // Move to next active player
    nextPlayer() {
        do {
            this.currentPlayer = (this.currentPlayer + 1) % this.players.length;
        } while (this.players[this.currentPlayer].isFolded || this.players[this.currentPlayer].isAllIn);
        
        this.emitEvent('turnChanged', {
            currentPlayer: this.currentPlayer,
            currentBet: this.currentBet,
            pot: this.pot
        });
    }

    // End current betting round
    endBettingRound() {
        console.log('SUCCESS: ' + this.gamePhase + ' betting round complete');
        
        // Check if only one player left (everyone else folded)
        const activePlayers = this.players.filter(p => !p.isFolded);
        if (activePlayers.length <= 1) {
            this.showdown();
            return;
        }
        
        // Move to next phase
        switch (this.gamePhase) {
            case 'preflop':
                this.dealFlop();
                break;
            case 'flop':
                this.dealTurn();
                break;
            case 'turn':
                this.dealRiver();
                break;
            case 'river':
                this.showdown();
                break;
        }
    }

    // Deal the flop (3 community cards)
    dealFlop() {
        this.gamePhase = 'flop';
        this.communityCards = [];
        
        // Burn one card
        this.deck.pop();
        
        // Deal 3 cards
        for (let i = 0; i < 3; i++) {
            this.communityCards.push(this.deck.pop());
        }
        console.log('Flop dealt:', this.communityCards.slice(0, 3).map(c => c.name));
        
        this.emitEvent('communityCards', {
            cards: this.communityCards,
            phase: this.gamePhase
        });
        
        this.startBettingRound();
    }

    // Deal the turn (1 community card)
    dealTurn() {
        this.gamePhase = 'turn';
        
        // Burn one card
        this.deck.pop();
        
        // Deal 1 card
        this.communityCards.push(this.deck.pop());
        console.log('Turn dealt:', this.communityCards[3].name);
        
        this.emitEvent('communityCards', {
            cards: this.communityCards,
            phase: this.gamePhase
        });
        
        this.startBettingRound();
    }

    // Deal the river (1 community card)
    dealRiver() {
        this.gamePhase = 'river';
        
        // Burn one card
        this.deck.pop();
        
        // Deal 1 card
        this.communityCards.push(this.deck.pop());
        console.log('River dealt:', this.communityCards[4].name);
        
        this.emitEvent('communityCards', {
            cards: this.communityCards,
            phase: this.gamePhase
        });
        
        this.startBettingRound();
    }

    // Showdown - determine winner
    showdown() {
        console.log('Showdown!');
        
        const activePlayers = this.players.filter(p => !p.isFolded);
        
        // Evaluate hands for all active players
        activePlayers.forEach(player => {
            const bestHand = this.evaluateHand(player.hand, this.communityCards);
            player.bestHand = bestHand;
            player.handRank = bestHand.rank;
        });
        
        // Sort players by hand strength (best first)
        activePlayers.sort((a, b) => b.handRank - a.handRank);
        
        // Determine winners and distribute pot
        this.distributePot(activePlayers);
        
        this.emitEvent('showdown', {
            winners: this.winners,
            pot: this.pot,
            players: this.players.map(p => ({
                name: p.name,
                hand: p.hand,
                bestHand: p.bestHand,
                handRank: p.handRank
            }))
        });
    }

    // Evaluate hand strength
    evaluateHand(holeCards, communityCards) {
        const allCards = [...holeCards, ...communityCards];
        const bestHand = this.getBestHand(allCards);
        return bestHand;
    }

    // Get best 5-card hand from 7 cards
    getBestHand(cards) {
        if (cards.length < 5) return { rank: 0, name: 'High Card', cards: [] };
        
        const combinations = this.getCombinations(cards, 5);
        let bestHand = { rank: 0, name: 'High Card', cards: [] };
        
        combinations.forEach(combo => {
            const hand = this.rankHand(combo);
            if (hand.rank > bestHand.rank) {
                bestHand = hand;
            }
        });
        
        return bestHand;
    }

    // Generate combinations of r elements from array
    getCombinations(arr, r) {
        if (r === 1) return arr.map(x => [x]);
        if (r === arr.length) return [arr];
        
        const combinations = [];
        for (let i = 0; i <= arr.length - r; i++) {
            const head = arr[i];
            const tailCombos = this.getCombinations(arr.slice(i + 1), r - 1);
            tailCombos.forEach(tail => {
                combinations.push([head, ...tail]);
            });
        }
        return combinations;
    }

    // Rank a 5-card hand
    rankHand(cards) {
        const values = cards.map(c => c.value).sort((a, b) => b - a);
        const suits = cards.map(c => c.suit);
        
        const isFlush = suits.every(suit => suit === suits[0]);
        const isStraight = this.isStraight(values);
        
        if (isStraight && isFlush) {
            if (values[0] === 14 && values[4] === 10) {
                return { rank: 9, name: 'Royal Flush', cards: cards };
            }
            return { rank: 8, name: 'Straight Flush', cards: cards };
        }
        
        const counts = this.getCardCounts(values);
        const countsArray = Object.values(counts).sort((a, b) => b - a);
        
        if (countsArray[0] === 4) {
            return { rank: 7, name: 'Four of a Kind', cards: cards };
        }
        
        if (countsArray[0] === 3 && countsArray[1] === 2) {
            return { rank: 6, name: 'Full House', cards: cards };
        }
        
        if (isFlush) {
            return { rank: 5, name: 'Flush', cards: cards };
        }
        
        if (isStraight) {
            return { rank: 4, name: 'Straight', cards: cards };
        }
        
        if (countsArray[0] === 3) {
            return { rank: 3, name: 'Three of a Kind', cards: cards };
        }
        
        if (countsArray[0] === 2 && countsArray[1] === 2) {
            return { rank: 2, name: 'Two Pair', cards: cards };
        }
        
        if (countsArray[0] === 2) {
            return { rank: 1, name: 'One Pair', cards: cards };
        }
        
        return { rank: 0, name: 'High Card', cards: cards };
    }

    // Check if values form a straight
    isStraight(values) {
        const uniqueValues = [...new Set(values)].sort((a, b) => b - a);
        if (uniqueValues.length !== 5) return false;
        
        // Check for regular straight
        for (let i = 0; i < 4; i++) {
            if (uniqueValues[i] - uniqueValues[i + 1] !== 1) {
                // Check for A-2-3-4-5 straight
                if (uniqueValues[0] === 14 && uniqueValues[1] === 5 && uniqueValues[2] === 4 && uniqueValues[3] === 3 && uniqueValues[4] === 2) {
                    return true;
                }
                return false;
            }
        }
        return true;
    }

    // Get count of each card value
    getCardCounts(values) {
        const counts = {};
        values.forEach(value => {
            counts[value] = (counts[value] || 0) + 1;
        });
        return counts;
    }

    // Distribute pot to winners
    distributePot(activePlayers) {
        if (activePlayers.length === 1) {
            // Only one player left
            const winner = activePlayers[0];
            winner.chips += this.pot;
            this.winners = [{
                player: winner,
                amount: this.pot,
                hand: winner.bestHand
            }];
        } else {
            // Multiple players - split pot
            const winAmount = Math.floor(this.pot / activePlayers.length);
            const remainder = this.pot % activePlayers.length;
            
            this.winners = activePlayers.map((player, index) => {
                const amount = winAmount + (index < remainder ? 1 : 0);
                player.chips += amount;
                return {
                    player: player,
                    amount: amount,
                    hand: player.bestHand
                };
            });
        }
        
        console.log('Pot distributed:', this.winners);
    }

    // Bot decision making
    makeBotDecision(player) {
        console.log('BOT: ' + player.name + ' making decision...');
        
        const handStrength = this.evaluateHand(player.hand, this.communityCards);
        const callAmount = this.currentBet - player.currentBet;
        const canRaise = player.chips > callAmount;
        
        let action = 'fold';
        let amount = 0;
        
        // Simple bot logic based on hand strength
        if (handStrength.rank >= 6) {
            // Very strong hand - always raise
            action = canRaise ? 'raise' : 'call';
            amount = canRaise ? Math.min(this.currentBet * 2, player.chips) : 0;
        } else if (handStrength.rank >= 3) {
            // Good hand - call or small raise
            action = callAmount <= player.chips * 0.1 ? 'call' : 'fold';
            amount = 0;
        } else if (handStrength.rank >= 1) {
            // Weak hand - only call small bets
            action = callAmount <= player.chips * 0.05 ? 'call' : 'fold';
            amount = 0;
        } else {
            // Very weak hand - fold unless it's free
            action = callAmount === 0 ? 'call' : 'fold';
            amount = 0;
        }
        
        console.log('BOT: ' + player.name + ' decides to ' + action + ' ' + (amount > 0 ? '$' + amount : ''));
        this.playerAction(this.currentPlayer, action, amount);
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

    // Get current player
    getCurrentPlayer() {
        return this.players[this.currentPlayer];
    }

    // Get game state for client
    getGameState() {
        return {
            players: this.players,
            communityCards: this.communityCards,
            pot: this.pot,
            currentBet: this.currentBet,
            currentPlayer: this.currentPlayer,
            gamePhase: this.gamePhase,
            winners: this.winners
        };
    }
}

// POKER CLIENT LOGIC
class PokerClient {
    constructor() {
        this.game = new PokerGame();
        this.localPlayerIndex = 0;
        this.isMyTurn = false;
        this.canAct = false;
    }

    // Initialize the client
    initialize() {
        console.log('Initializing Poker client');
        
        // Initialize game framework
        GameFramework.initialize('poker');
        
        // Setup UI event listeners
        this.setupUI();
        
        // Setup socket event listeners
        this.setupSocketListeners();
        
        console.log('SUCCESS: Poker client initialized');
        
        // Test GameFramework availability immediately after initialization
        setTimeout(() => {
            console.log('DEBUG: Post-init test - GameFramework type:', typeof GameFramework);
            console.log('DEBUG: Post-init test - GameFramework.createRoom:', GameFramework?.createRoom);
            console.log('DEBUG: Post-init test - window.gameFramework.socket:', window.gameFramework?.socket);
        }, 100);
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
        document.getElementById('foldBtn').onclick = () => this.playerAction('fold');
        document.getElementById('callBtn').onclick = () => this.playerAction('call');
        document.getElementById('raiseBtn').onclick = () => this.playerAction('raise');
        document.getElementById('betBtn').onclick = () => this.playerAction('bet');
        
        // Copy room code
        document.getElementById('copyRoomCodeBtn').onclick = () => this.copyRoomCode();
    }

    // Setup socket event listeners
    setupSocketListeners() {
        const socket = window.gameFramework.socket;
        
        socket.on('roomCreated', (data) => {
            console.log('Room created:', data);
            const roomCode = data.roomId || data; // Handle both old and new formats
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
        
        socket.on('bettingRoundStarted', (data) => {
            this.updateBettingRound(data);
        });
        
        socket.on('playerAction', (data) => {
            this.updatePlayerAction(data);
        });
        
        socket.on('communityCards', (data) => {
            this.updateCommunityCards(data);
        });
        
        socket.on('showdown', (data) => {
            this.showShowdown(data);
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
        
        // Try to create room immediately first
        console.log('DEBUG: GameFramework type:', typeof GameFramework);
        console.log('DEBUG: GameFramework object:', GameFramework);
        console.log('DEBUG: GameFramework.createRoom:', GameFramework?.createRoom);
        
        if (typeof GameFramework !== 'undefined' && GameFramework.createRoom && window.gameFramework?.socket) {
            console.log('SUCCESS: GameFramework and socket available, creating room immediately');
            GameFramework.createRoom('poker');
            return;
        }
        
        // If not available, wait and retry
        console.log('WAITING: GameFramework not ready, waiting...');
        let attempts = 0;
        const maxAttempts = 10;
        
        const tryCreateRoom = () => {
            attempts++;
            console.log('RETRY: Attempt ' + attempts + '/' + maxAttempts + ' to create room');
            
            if (typeof GameFramework !== 'undefined' && GameFramework.createRoom && window.gameFramework?.socket) {
                console.log('SUCCESS: GameFramework and socket now available, creating room');
                GameFramework.createRoom('poker');
                return;
            }
            
            if (attempts < maxAttempts) {
                setTimeout(tryCreateRoom, 200); // Wait 200ms between attempts
            } else {
                console.error('ERROR: GameFramework still not available after maximum attempts');
                UIUtils.showGameMessage('Game framework not ready. Please refresh the page.', 'error');
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
        console.log('Current game players:', this.game.players);
        
        if (data && data.players) {
            console.log('Initializing game with players:', data.players);
            this.game.initialize(data.players);
        } else {
            console.log('WARNING: No player data provided, using room players');
            // Get players from the room
            const roomPlayers = window.gameFramework.players || [];
            console.log('Room players:', roomPlayers);
            
            if (roomPlayers && roomPlayers.length > 0) {
                // Convert room players to game players
                const gamePlayers = roomPlayers.map(player => ({
                    name: player.name,
                    startingChips: 1000,
                    isBot: player.isBot || false
                }));
                
                console.log('Converted game players:', gamePlayers);
                this.game.initialize(gamePlayers);
            } else {
                console.error('ERROR: No players available to start game');
                UIUtils.showGameMessage('No players available to start game. Please add players first.', 'error');
                return;
            }
        }
        
        console.log('Final game players before startNewHand:', this.game.players);
        console.log('Players length:', this.game.players?.length);
        
        if (this.game.players.length === 0) {
            console.error('ERROR: Cannot start game with 0 players');
            UIUtils.showGameMessage('Cannot start game with 0 players. Please add players first.', 'error');
            return;
        }
        
        // Start the game
        this.game.startNewHand();
        
        // Update game state
        if (typeof gameStateEnum !== 'undefined') {
            gameState = gameStateEnum.Playing;
            window.gameState = gameStateEnum.Playing;
            console.log('Game state set to Playing');
            // Start the draw loop when game starts
            loop();
        }
        
        // Set global game instance
        window.game = this.game;
        console.log('Global game instance set');
        
        // Update UI
        this.updateUI();
        this.showBettingControls();
    }

    // Update game state
    updateGameState(data) {
        this.game.players = data.players || this.game.players;
        this.game.communityCards = data.communityCards || this.game.communityCards;
        this.game.pot = data.pot || this.game.pot;
        this.game.currentBet = data.currentBet || this.game.currentBet;
        this.game.currentPlayer = data.currentPlayer || this.game.currentPlayer;
        this.game.gamePhase = data.gamePhase || this.game.gamePhase;
        this.game.winners = data.winners || this.game.winners;
        
        this.updateUI();
    }

    // Update betting round
    updateBettingRound(data) {
        this.game.gamePhase = data.phase;
        this.game.currentPlayer = data.currentPlayer;
        this.game.currentBet = data.currentBet;
        this.game.pot = data.pot;
        
        this.isMyTurn = (data.currentPlayer === this.localPlayerIndex);
        this.canAct = this.isMyTurn && !this.game.players[this.localPlayerIndex].isFolded;
        
        this.updateUI();
        
        if (this.isMyTurn) {
            this.showBettingControls();
        } else {
            this.hideBettingControls();
        }
    }

    // Update player action
    updatePlayerAction(data) {
        this.game.players[data.playerIndex] = data.players[data.playerIndex];
        this.game.currentBet = data.currentBet;
        this.game.pot = data.pot;
        
        this.updateUI();
    }

    // Update community cards
    updateCommunityCards(data) {
        this.game.communityCards = data.cards;
        this.game.gamePhase = data.phase;
        
        this.updateCommunityCardsDisplay();
    }

    // Show showdown
    showShowdown(data) {
        this.game.winners = data.winners;
        
        let winnerMessage = '';
        if (data.winners.length === 1) {
            winnerMessage = data.winners[0].player.name + ' wins $' + data.winners[0].amount + ' with ' + data.winners[0].hand.name;
        } else {
            winnerMessage = 'Split pot: ' + data.winners.map(w => w.player.name + ' wins $' + w.amount).join(', ');
        }
        
        UIUtils.showGameMessage('Showdown: ' + winnerMessage, 'success');
        this.updateUI();
    }

    // Player action
    playerAction(action) {
        if (!this.canAct) {
            UIUtils.showGameMessage('It\'s not your turn', 'error');
            return;
        }
        
        let amount = 0;
        if (action === 'raise' || action === 'bet') {
            amount = parseInt(document.getElementById('betAmount').value) || 0;
            if (amount <= 0) {
                UIUtils.showGameMessage('Please enter a valid bet amount', 'error');
                return;
            }
        }
        
        const socket = window.gameFramework.socket;
        socket.emit('playerAction', {
            roomId: window.gameFramework.roomId,
            playerIndex: this.localPlayerIndex,
            action: action,
            amount: amount
        });
        
        this.hideBettingControls();
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
        // Update pot display
        document.getElementById('potAmount').textContent = this.game.pot;
        
        // Update call amount
        const localPlayer = this.game.players[this.localPlayerIndex];
        if (localPlayer) {
            const callAmount = this.game.currentBet - localPlayer.currentBet;
            document.getElementById('callAmount').textContent = callAmount;
        }
        
        // Update community cards
        this.updateCommunityCardsDisplay();
        
        // Update player areas
        this.updatePlayerAreas();
    }

    // Update community cards display
    updateCommunityCardsDisplay() {
        const container = document.getElementById('communityCards');
        container.innerHTML = '';
        
        this.game.communityCards.forEach(card => {
            const cardDiv = document.createElement('div');
            cardDiv.className = 'community-card';
            cardDiv.style.cssText = `
                width: 60px;
                height: 84px;
                background: white;
                border: 2px solid #333;
                border-radius: 5px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                font-weight: bold;
                margin: 5px;
            `;
            cardDiv.textContent = card.name;
            container.appendChild(cardDiv);
        });
    }

    // Update player areas
    updatePlayerAreas() {
        // Update player list in the UI
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
                    <div class="player-bet">Bet: $${player.currentBet}</div>
                `;
                
                playerList.appendChild(playerDiv);
            });
        }
    }

    // Show betting controls
    showBettingControls() {
        document.getElementById('bettingControls').style.display = 'flex';
    }

    // Hide betting controls
    hideBettingControls() {
        document.getElementById('bettingControls').style.display = 'none';
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
        
        // Force button colors with !important
        setTimeout(() => {
            if (addBotBtn) {
                addBotBtn.style.setProperty('border', 'none', 'important');
                console.log('RETRY: Add Bot button color forced to green');
            }
            
            if (removeBotBtn) {
                removeBotBtn.style.setProperty('border', 'none', 'important');
                console.log('RETRY: Remove Bot button color forced to red');
            }
            
            if (startGameBtn) {
                startGameBtn.style.setProperty('border', 'none', 'important');
                console.log('RETRY: Start Game button color forced to orange');
            }
        }, 100);
    }

    // Reset client state
    reset() {
        console.log('Resetting Poker client state...');
        this.localPlayerIndex = 0;
        this.isMyTurn = false;
        this.canAct = false;
        this.game = new PokerGame();
        console.log('SUCCESS: Poker client state reset');
    }
}

// POKER RENDERING FUNCTIONS
function drawGameState() {
    if (!window.game || !window.game.players) {
        // Reduced logging to prevent console spam
        if (frameCount % 120 === 0) {
            console.log('Poker: No game or players available for rendering');
        }
        return;
    }
    
    // Frame limiting is handled globally in draw.js
    
    // Reduced logging to prevent console spam
    if (frameCount % 600 === 0) {
        console.log('Drawing poker game state');
    }
    
    // Draw background image
    push();
    imageMode(CORNER);
    if (backgroundImage && backgroundImage.width > 0) {
        // Draw the actual background image
        image(backgroundImage, 0, 0, width, height);
    } else {
        // Fallback to solid background
        background(0, 100, 0);
    }
    pop();
    
    // Draw poker table elements
    drawPokerTable();
    drawCommunityCards();
    drawPlayers();
    drawPot();
    drawGameInfo();
}

function drawPokerTable() {
    // Draw poker table outline with better styling
    push();
    
    // Draw table rim (outermost)
    fill(101, 67, 33); // Darker brown rim
    noStroke();
    ellipse(width/2, height/2, width * 0.9, height * 0.7);
    
    // Draw table edge
    fill(139, 69, 19); // Brown edge
    noStroke();
    ellipse(width/2, height/2, width * 0.88, height * 0.68);
    
    // Draw main table felt
    fill(0, 100, 0, 200);
    noStroke();
    ellipse(width/2, height/2, width * 0.85, height * 0.65);
    
    // Draw inner table highlight
    fill(0, 150, 0, 100);
    noStroke();
    ellipse(width/2, height/2, width * 0.8, height * 0.6);
    
    // Draw subtle felt texture pattern
    fill(0, 120, 0, 60);
    noStroke();
    for (let i = 0; i < 20; i++) {
        const x = width/2 + (i * 40 - 400) % (width * 0.7);
        const y = height/2 + (i * 25 - 250) % (height * 0.5);
        ellipse(x, y, 20, 20);
    }
    
    // Draw table center highlight
    fill(0, 180, 0, 30);
    noStroke();
    ellipse(width/2, height/2, width * 0.3, height * 0.2);
    
    pop();
}

function drawCommunityCards() {
    if (!window.game.communityCards || window.game.communityCards.length === 0) {
        return;
    }
    
    const centerX = width/2;
    const centerY = height/2;
    const cardWidth = 90;  // Increased from 70
    const cardHeight = 126; // Increased from 98 (maintaining aspect ratio)
    const spacing = 25;    // Increased from 20
    
    // Draw community cards in the center with better styling
    const totalWidth = (window.game.communityCards.length - 1) * (cardWidth + spacing);
    const startX = centerX - totalWidth / 2;
    
    window.game.communityCards.forEach((card, index) => {
        const x = startX + index * (cardWidth + spacing);
        const y = centerY - cardHeight/2;
        
        push();
        // Draw card shadow
        fill(0, 0, 0, 50);
        noStroke();
        rect(x + 3, y + 3, cardWidth, cardHeight, 8);
        
        // Draw card background
        fill(255);
        stroke(0);
        strokeWeight(2);
        rect(x, y, cardWidth, cardHeight, 8);
        
        // Draw card content with actual card image
        if (typeof cardImages !== 'undefined' && cardImages[card.name] && cardImages[card.name].width > 0) {
            image(cardImages[card.name], x, y, cardWidth, cardHeight);
        } else {
            // Fallback to text if image not available
            fill(0);
            textAlign(CENTER, CENTER);
            textSize(12);
            textStyle(BOLD);
            text(card.name, x + cardWidth/2, y + cardHeight/2);
        }
        pop();
    });
}

function drawPlayers() {
    if (!window.game.players) return;
    
    const centerX = width/2;
    const centerY = height/2;
    // Use elliptical positioning to match the table shape
    const radiusX = width * 0.35;  // Horizontal radius
    const radiusY = height * 0.25; // Vertical radius (smaller for oval shape)
    
    window.game.players.forEach((player, index) => {
        const angle = (TWO_PI / window.game.players.length) * index - HALF_PI;
        const x = centerX + cos(angle) * radiusX;
        const y = centerY + sin(angle) * radiusY;
        
        push();
        
        // Draw player area with better styling
        fill(0, 0, 0, 180);
        stroke(255, 255, 255, 200);
        strokeWeight(3);
        ellipse(x, y, 140, 100);
        
        // Draw player name with better styling and shadow
        push();
        textAlign(CENTER, CENTER);
        textSize(18); // Increased from 16
        textStyle(BOLD);
        
        // Draw shadow with thicker stroke for stability
        fill(0, 0, 0, 200); // Darker shadow
        stroke(0, 0, 0, 200);
        strokeWeight(2);
        text(player.name, x + 3, y - 25 + 3);
        
        // Main text with outline for stability
        fill(255, 255, 255);
        stroke(0, 0, 0, 100);
        strokeWeight(1);
        text(player.name, x, y - 25);
        pop();
        
        // Draw player chips with better styling and shadow
        push();
        textAlign(CENTER, CENTER);
        textSize(16); // Increased from 14
        textStyle(BOLD);
        
        // Draw shadow with thicker stroke for stability
        fill(0, 0, 0, 200); // Darker shadow
        stroke(0, 0, 0, 200);
        strokeWeight(2);
        text('$' + player.chips, x + 3, y - 5 + 3);
        
        // Main text with outline for stability
        fill(255, 215, 0); // Gold color
        stroke(0, 0, 0, 100);
        strokeWeight(1);
        text('$' + player.chips, x, y - 5);
        pop();
        
        // Draw current bet if any
        if (player.currentBet > 0) {
            push();
            textAlign(CENTER, CENTER);
            textSize(14); // Increased from 12
            textStyle(BOLD);
            
            // Draw shadow with thicker stroke for stability
            fill(0, 0, 0, 200); // Darker shadow
            stroke(0, 0, 0, 200);
            strokeWeight(2);
            text('Bet: $' + player.currentBet, x + 3, y + 15 + 3);
            
            // Main text with outline for stability
            fill(255, 100, 100);
            stroke(0, 0, 0, 100);
            strokeWeight(1);
            text('Bet: $' + player.currentBet, x, y + 15);
            pop();
        }
        
        // Draw player cards
        if (player.hand && player.hand.length > 0) {
            // Show card images for Player 1 (index 0) or if it's the local player
            const shouldShowCardImages = index === 0 || index === window.pokerClient?.localPlayerIndex || player.hand.some(card => card.isRevealed);
            drawPlayerCards(x, y, player.hand, shouldShowCardImages);
        }
        
        // Highlight current player with stable effect
        if (index === window.game.currentPlayer) {
            stroke(255, 255, 0);
            strokeWeight(6);
            noFill();
            ellipse(x, y, 150, 110);
            
            // Add subtle static highlight (no pulsing to prevent flashing)
            stroke(255, 255, 0, 80);
            strokeWeight(2);
            ellipse(x, y, 160, 120);
        }
        
        pop();
    });
}

function drawPlayerCards(x, y, hand, isLocalPlayer) {
    const cardWidth = 60;  // Increased from 45
    const cardHeight = 84; // Increased from 63 (maintaining aspect ratio)
    const spacing = 12;    // Increased from 10
    
    hand.forEach((card, index) => {
        const cardX = x - (hand.length - 1) * (cardWidth + spacing) / 2 + index * (cardWidth + spacing);
        const cardY = y + 30;
        
        push();
        
        // Draw card shadow
        fill(0, 0, 0, 80);
        noStroke();
        rect(cardX + 3, cardY + 3, cardWidth, cardHeight, 6);
        
        // Draw card
        fill(255);
        stroke(0);
        strokeWeight(3);
        rect(cardX, cardY, cardWidth, cardHeight, 6);
        
        // Draw card content (only show for local player or if revealed)
        if (isLocalPlayer || card.isRevealed) {
            // Try to draw actual card image
            if (typeof cardImages !== 'undefined' && cardImages[card.name] && cardImages[card.name].width > 0) {
                image(cardImages[card.name], cardX, cardY, cardWidth, cardHeight);
            } else {
                // Fallback to text if image not available
                fill(0);
                textAlign(CENTER, CENTER);
                textSize(11);
                textStyle(BOLD);
                text(card.name, cardX + cardWidth/2, cardY + cardHeight/2);
            }
        } else {
            // Draw card back image
            if (typeof window.cardBackImage !== 'undefined' && window.cardBackImage && window.cardBackImage.width > 0) {
                image(window.cardBackImage, cardX, cardY, cardWidth, cardHeight);
            } else {
                // Fallback to colored rectangle
                fill(0, 0, 150);
                textAlign(CENTER, CENTER);
                textSize(12);
                textStyle(BOLD);
                text('?', cardX + cardWidth/2, cardY + cardHeight/2);
            }
        }
        
        // Add pattern to card back
        fill(255, 255, 255, 30);
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 2; j++) {
                ellipse(cardX + 8 + i * 8, cardY + 8 + j * 15, 3, 3);
            }
        }
        
        pop();
    });
}

function drawPot() {
    if (window.game.pot > 0) {
        push();
        
        // Draw pot background
        fill(0, 0, 0, 150);
        stroke(255, 215, 0);
        strokeWeight(3);
        ellipse(width/2, height/2 + 100, 120, 60);
        
        // Draw pot text with shadow
        textAlign(CENTER, CENTER);
        textSize(20); // Increased from 18
        textStyle(BOLD);
        
        // Shadow with thicker stroke for stability
        fill(0, 0, 0, 200);
        stroke(0, 0, 0, 200);
        strokeWeight(2);
        text('POT', width/2 + 3, height/2 + 90 + 3);
        
        // Main text with outline for stability
        fill(255, 215, 0); // Gold color
        stroke(0, 0, 0, 100);
        strokeWeight(1);
        text('POT', width/2, height/2 + 90);
        
        textSize(18); // Increased from 16
        // Shadow for amount
        fill(0, 0, 0, 200);
        stroke(0, 0, 0, 200);
        strokeWeight(2);
        text('$' + window.game.pot, width/2 + 3, height/2 + 110 + 3);
        
        // Main text for amount
        fill(255, 215, 0);
        stroke(0, 0, 0, 100);
        strokeWeight(1);
        text('$' + window.game.pot, width/2, height/2 + 110);
        
        pop();
    }
}

function drawGameInfo() {
    push();
    
    // Draw game phase with better styling
    fill(0, 0, 0, 150);
    stroke(255, 255, 255);
    strokeWeight(2);
    rect(15, 15, 200, 60, 10);
    
    textAlign(LEFT, TOP);
    textSize(18); // Increased from 16
    textStyle(BOLD);
    
    // Draw phase with shadow and outline
    fill(0, 0, 0, 200);
    stroke(0, 0, 0, 200);
    strokeWeight(2);
    text('Phase: ' + (window.game.gamePhase || 'preflop'), 27, 27);
    
    fill(255, 255, 255);
    stroke(0, 0, 0, 100);
    strokeWeight(1);
    text('Phase: ' + (window.game.gamePhase || 'preflop'), 25, 25);
    
    // Draw current bet
    if (window.game.currentBet > 0) {
        textSize(16); // Increased from 14
        
        // Shadow for bet text
        fill(0, 0, 0, 200);
        stroke(0, 0, 0, 200);
        strokeWeight(2);
        text('Current Bet: $' + window.game.currentBet, 27, 47);
        
        fill(255, 215, 0);
        stroke(0, 0, 0, 100);
        strokeWeight(1);
        text('Current Bet: $' + window.game.currentBet, 25, 45);
    }
    
    pop();
    
    // Draw hand rankings on the right
    drawHandRankings();
}

function drawHandRankings() {
    const rankings = [
        'Royal Flush', 'Straight Flush', 'Four of a Kind', 'Full House',
        'Flush', 'Straight', 'Three of a Kind', 'Two Pair', 'One Pair', 'High Card'
    ];
    
    const startX = width - 220;
    const startY = 20;
    
    push();
    
    // Draw background
    fill(0, 0, 0, 150);
    stroke(255, 255, 0);
    strokeWeight(2);
    rect(startX - 10, startY - 10, 210, 200, 10);
    
    // Draw title with shadow and outline
    textAlign(LEFT, TOP);
    textSize(18); // Increased from 16
    textStyle(BOLD);
    
    // Shadow for title
    fill(0, 0, 0, 200);
    stroke(0, 0, 0, 200);
    strokeWeight(2);
    text('Hand Rankings', startX + 2, startY + 2);
    
    // Main title text
    fill(255, 255, 0); // Yellow title
    stroke(0, 0, 0, 100);
    strokeWeight(1);
    text('Hand Rankings', startX, startY);
    
    // Draw rankings with improved text
    textSize(14); // Increased from 12
    textStyle(NORMAL);
    rankings.forEach((ranking, index) => {
        const y = startY + 25 + index * 16; // Increased spacing
        
        // Add subtle background for each ranking
        fill(0, 0, 0, 80); // Darker background
        noStroke();
        rect(startX - 5, y - 10, 200, 14, 3); // Slightly taller
        
        // Shadow for each ranking
        fill(0, 0, 0, 200);
        stroke(0, 0, 0, 200);
        strokeWeight(1);
        text(ranking, startX + 1, y + 1);
        
        // Main text
        fill(255, 255, 255);
        stroke(0, 0, 0, 50);
        strokeWeight(0.5);
        text(ranking, startX, y);
    });
    
    pop();
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    window.pokerClient = new PokerClient();
    window.pokerClient.initialize();
});