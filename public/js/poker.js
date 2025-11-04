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
        
        // Play card dealing sound
        if (window.pokerClient) {
            window.pokerClient.playCardSound();
        }
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
        this.soundEnabled = true;
        this.audioContext = null;
    }

    // Initialize the client
    initialize() {
        console.log('Initializing Poker client');
        this.initAudio();
        
        // Initialize game framework
        GameFramework.initialize('poker');
        
        // Setup UI event listeners
        this.setupUI();
        
        // Setup socket event listeners
        this.setupSocketListeners();
        
        console.log('SUCCESS: Poker client initialized');
        
        // Test GameFramework availability immediately after initialization
        setTimeout(() => {
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
            this.localPlayerIndex = data.playerIndex || data.playerIndex === 0 ? data.playerIndex : 0;
            console.log('Local player index set to:', this.localPlayerIndex);
            this.showPlayerCustomization();
            this.showGameControls();
        });
        
        socket.on('gameStarted', (data) => {
            console.log('Game started:', data);
            if (data.localPlayerIndex !== undefined) {
                this.localPlayerIndex = data.localPlayerIndex;
                console.log('Local player index from gameStarted:', this.localPlayerIndex);
            }
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
        const bettingControls = document.getElementById('bettingControls');
        if (bettingControls) {
            bettingControls.style.display = 'flex';
            this.setupBettingControls();
        }
    }

    // Hide betting controls
    hideBettingControls() {
        const bettingControls = document.getElementById('bettingControls');
        if (bettingControls) {
            bettingControls.style.display = 'none';
        }
    }

    // Setup betting controls event listeners
    setupBettingControls() {
        const foldBtn = document.getElementById('foldBtn');
        const callBtn = document.getElementById('callBtn');
        const raiseBtn = document.getElementById('raiseBtn');
        const allInBtn = document.getElementById('allInBtn');
        const betAmountInput = document.getElementById('betAmount');
        const currentBetInfo = document.getElementById('currentBetInfo');

        if (foldBtn) {
            foldBtn.onclick = () => this.fold();
        }

        if (callBtn) {
            callBtn.onclick = () => this.call();
        }

        if (raiseBtn) {
            raiseBtn.onclick = () => this.raise();
        }

        if (allInBtn) {
            allInBtn.onclick = () => this.allIn();
        }

        if (betAmountInput) {
            betAmountInput.oninput = () => this.updateBetAmount();
        }

        // Update current bet info
        if (currentBetInfo && this.game) {
            const callAmount = this.game.currentBet - (this.game.players[0]?.currentBet || 0);
            currentBetInfo.innerHTML = `
                <div>Current Bet: $${this.game.currentBet || 0}</div>
                <div>To Call: $${Math.max(0, callAmount)}</div>
                <div>Your Chips: $${this.game.players[0]?.chips || 0}</div>
            `;
        }
    }

    // Betting actions
    fold() {
        console.log('Player folded');
        this.playFoldSound();
        this.socket.emit('playerAction', {
            action: 'fold',
            roomId: this.roomId
        });
        this.hideBettingControls();
    }

    call() {
        const callAmount = this.game.currentBet - (this.game.players[0]?.currentBet || 0);
        console.log('Player called:', callAmount);
        this.playBetSound();
        this.socket.emit('playerAction', {
            action: 'call',
            amount: callAmount,
            roomId: this.roomId
        });
        this.hideBettingControls();
    }

    raise() {
        const betAmount = parseInt(document.getElementById('betAmount').value) || 0;
        const minRaise = this.game.currentBet * 2;
        const raiseAmount = Math.max(minRaise, betAmount);
        
        console.log('Player raised:', raiseAmount);
        this.playBetSound();
        this.socket.emit('playerAction', {
            action: 'raise',
            amount: raiseAmount,
            roomId: this.roomId
        });
        this.hideBettingControls();
    }

    allIn() {
        const allInAmount = this.game.players[0]?.chips || 0;
        console.log('Player went all in:', allInAmount);
        this.playWinSound();
        this.socket.emit('playerAction', {
            action: 'allIn',
            amount: allInAmount,
            roomId: this.roomId
        });
        this.hideBettingControls();
    }

    updateBetAmount() {
        const betAmount = parseInt(document.getElementById('betAmount').value) || 0;
        const minRaise = this.game.currentBet * 2;
        const maxBet = this.game.players[0]?.chips || 0;
        
        // Update button states based on bet amount
        const callBtn = document.getElementById('callBtn');
        const raiseBtn = document.getElementById('raiseBtn');
        
        if (callBtn) {
            const callAmount = this.game.currentBet - (this.game.players[0]?.currentBet || 0);
            callBtn.textContent = callAmount > 0 ? `✅ Call $${callAmount}` : '✅ Check';
        }
        
        if (raiseBtn) {
            raiseBtn.textContent = betAmount >= minRaise ? `📈 Raise $${betAmount}` : `📈 Raise $${minRaise}`;
        }
    }

    // Sound system
    initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Web Audio API not supported');
            this.soundEnabled = false;
        }
    }

    playSound(type, frequency = 440, duration = 0.1) {
        if (!this.soundEnabled || !this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        // Set frequency and wave type based on sound type
        switch (type) {
            case 'card':
                oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
                oscillator.type = 'sine';
                break;
            case 'bet':
                oscillator.frequency.setValueAtTime(frequency * 1.5, this.audioContext.currentTime);
                oscillator.type = 'square';
                break;
            case 'win':
                oscillator.frequency.setValueAtTime(frequency * 2, this.audioContext.currentTime);
                oscillator.type = 'sawtooth';
                break;
            case 'fold':
                oscillator.frequency.setValueAtTime(frequency * 0.5, this.audioContext.currentTime);
                oscillator.type = 'triangle';
                break;
            default:
                oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
                oscillator.type = 'sine';
        }

        // Set volume envelope
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.1, this.audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    playCardSound() {
        this.playSound('card', 440, 0.1);
    }

    playBetSound() {
        this.playSound('bet', 550, 0.15);
    }

    playWinSound() {
        this.playSound('win', 660, 0.3);
    }

    playFoldSound() {
        this.playSound('fold', 220, 0.2);
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
    // Removed drawChips() - chips were overlapping with player boxes
    drawGameInfo();
    drawBlindIndicators();
}

function drawPokerTable() {
    const centerX = width/2;
    const centerY = height/2;
    const tableWidth = width * 0.75; // Slightly smaller to avoid edge artifacts
    const tableHeight = height * 0.55; // Slightly smaller to avoid edge artifacts
    
    push();
    
    // Draw table shadow (more realistic)
    fill(0, 0, 0, 80);
    noStroke();
    ellipse(centerX + 8, centerY + 8, tableWidth + 16, tableHeight + 16);
    
    // Draw table rim (outermost) - clean ellipse, no extensions
    fill(101, 67, 33);
    noStroke();
    ellipse(centerX, centerY, tableWidth, tableHeight);
    
    // Draw table edge
    fill(139, 69, 19);
    noStroke();
    ellipse(centerX, centerY, tableWidth - 25, tableHeight - 20);
    
    // Draw main table felt - clean gradient without weird shapes
    fill(0, 100, 0); // Base green felt color
    noStroke();
    ellipse(centerX, centerY, tableWidth - 50, tableHeight - 40);
    
    // Draw subtle felt texture dots
    fill(0, 120, 0, 30);
    noStroke();
    for (let i = 0; i < 15; i++) {
        const angle = (TWO_PI / 15) * i;
        const x = centerX + cos(angle) * (tableWidth * 0.2);
        const y = centerY + sin(angle) * (tableHeight * 0.2);
        ellipse(x, y, 6, 6);
    }
    
    pop();
}

function drawCommunityCards() {
    if (!window.game.communityCards || window.game.communityCards.length === 0) {
        return;
    }
    
    const centerX = width/2;
    const centerY = height/2;
    const cardWidth = 80;   // Optimized size for better layout
    const cardHeight = 112; // Maintain aspect ratio
    const spacing = 20;     // Better spacing
    
    // Draw community cards in the center with better styling
    const totalWidth = (window.game.communityCards.length - 1) * (cardWidth + spacing);
    const startX = centerX - totalWidth / 2;
    
    window.game.communityCards.forEach((card, index) => {
        const x = startX + index * (cardWidth + spacing);
        const y = centerY - cardHeight/2;
        
        // Add subtle floating animation
        const time = millis() * 0.001;
        const floatOffset = sin(time + index * 0.5) * 2;
        const finalY = y + floatOffset;
        
        // Use enhanced CardRenderer with options for community cards
        CardRenderer.drawCard(x, finalY, cardWidth, cardHeight, card, true, {
            shadowOffset: 4,
            shadowOpacity: 80,
            borderWidth: 3,
            cornerRadius: 10,
            highlight: false
        });
    });
}

function drawPlayers() {
    if (!window.game.players) return;
    
    const centerX = width/2;
    const centerY = height/2;
    const radiusX = width * 0.35;  // Increased radius for better spacing from center
    const radiusY = height * 0.28; // Increased radius for better spacing
    
    // Store player positions for drawing cards later (after highlights)
    const playerPositions = [];
    
    window.game.players.forEach((player, index) => {
        const angle = (TWO_PI / window.game.players.length) * index - HALF_PI;
        const x = centerX + cos(angle) * radiusX;
        const y = centerY + sin(angle) * radiusY;
        
        // Store position for card drawing later
        playerPositions.push({ x, y, player, index });
        
        push();
        
        // Draw player area shadow
        fill(0, 0, 0, 120);
        noStroke();
        rect(x - 90, y - 60, 180, 130, 12);
        
        // Draw player area background - consistent styling for all players
        fill(20, 20, 30, 250); // Darker background
        stroke(180, 180, 200, 220); // Subtle white border (not bright yellow)
        strokeWeight(2);
        rect(x - 85, y - 55, 170, 120, 10);
        
        // Draw player status indicator (folded/active)
        if (player.isFolded) {
            fill(100, 100, 100, 200);
            stroke(150, 150, 150);
            strokeWeight(2);
            rect(x - 85, y - 55, 170, 120, 10);
            
            textAlign(CENTER, CENTER);
            textSize(18);
            textStyle(BOLD);
            fill(150, 150, 150);
            text('FOLDED', x, y);
        }
        
        // Draw player name with better styling and larger size
        textAlign(CENTER, CENTER);
        textSize(18); // Increased from 16
        textStyle(BOLD);
        fill(255, 255, 255);
        stroke(0, 0, 0);
        strokeWeight(1);
        text(player.name, x, y - 35);
        
        // Draw player status (Open/Folded/All-in)
        textAlign(CENTER, CENTER);
        textSize(12);
        textStyle(NORMAL);
        if (player.isFolded) {
            fill(150, 150, 150);
        } else if (player.isAllIn) {
            fill(255, 100, 100);
        } else {
            fill(100, 255, 100);
        }
        noStroke();
        const statusText = player.isFolded ? 'Folded' : (player.isAllIn ? 'All-In' : 'Active');
        text(statusText, x, y - 18);
        
        // Draw player chips with larger text
        textAlign(CENTER, CENTER);
        textSize(16); // Increased from 14
        textStyle(BOLD);
        fill(255, 215, 0);
        stroke(0, 0, 0);
        strokeWeight(1);
        text('$' + player.chips, x, y - 2);
        
        // Draw current bet if any with larger text
        if (player.currentBet > 0) {
            textAlign(CENTER, CENTER);
            textSize(14); // Increased from 12
            textStyle(BOLD);
            fill(255, 150, 150);
            stroke(0, 0, 0);
            strokeWeight(1);
            text('Bet: $' + player.currentBet, x, y + 18);
        }
        
        // Highlight current player with subtle, professional styling
        // Draw highlight BEFORE cards so cards appear on top
        if (index === window.game.currentPlayer && !player.isFolded) {
            const time = millis() * 0.003;
            const pulseAlpha = 30 + sin(time) * 15;
            const glowSize = 3 + sin(time * 2) * 1;
            
            // Subtle cyan/blue glow instead of bright yellow
            stroke(100, 200, 255, 180);
            strokeWeight(glowSize);
            noFill();
            rect(x - 90, y - 60, 180, 130, 12);
            
            // Add subtle animated glow effect
            fill(100, 200, 255, pulseAlpha);
            noStroke();
            rect(x - 92, y - 62, 184, 134, 14);
        }
        
        pop();
    });
    
    // Draw cards AFTER all player boxes and highlights are drawn
    // This ensures cards are always on top, even over the blue highlight line
    playerPositions.forEach(({ x, y, player, index }) => {
        if (player.hand && player.hand.length > 0 && !player.isFolded) {
            // Only show card faces for local player (or at showdown)
            // Check if it's showdown phase - be more strict
            const gamePhase = window.game?.gamePhase || '';
            const isShowdown = gamePhase.toLowerCase() === 'showdown' || (window.game.winners && window.game.winners.length > 0);
            
            // Get local player index - check multiple sources
            const localPlayerIndex = window.pokerClient?.localPlayerIndex;
            const isLocalPlayer = index === localPlayerIndex;
            
            // STRICT: Only show cards for local player, NEVER for opponents unless showdown
            // Always default to false (card back) unless explicitly local player
            let shouldShowCardImages = false;
            
            if (isLocalPlayer) {
                // Always show local player's cards
                shouldShowCardImages = true;
            } else if (isShowdown) {
                // Only show at showdown
                shouldShowCardImages = true;
            }
            
            // Debug logging (less frequent)
            if (frameCount % 600 === 0) {
                console.log('Card visibility check:', {
                    index,
                    localPlayerIndex,
                    isLocalPlayer,
                    gamePhase,
                    isShowdown,
                    shouldShow: shouldShowCardImages
                });
            }
            
            const cardY = y + 50; // Position cards further below player info
            drawPlayerCards(x, cardY, player.hand, shouldShowCardImages);
        }
    });
}

function drawPlayerCards(x, y, hand, isLocalPlayer) {
    const cardWidth = 60;   // Smaller cards for better layout
    const cardHeight = 84;  // Maintain aspect ratio
    const spacing = 8;      // Tighter spacing
    
    hand.forEach((card, index) => {
        const cardX = x - (hand.length - 1) * (cardWidth + spacing) / 2 + index * (cardWidth + spacing);
        const cardY = y;
        
        // Add subtle floating animation for player cards
        const time = millis() * 0.001;
        const floatOffset = sin(time + index * 0.3) * 1;
        const finalY = cardY + floatOffset;
        
        // Use enhanced CardRenderer with options
        CardRenderer.drawCard(cardX, finalY, cardWidth, cardHeight, card, isLocalPlayer || card.isRevealed, {
            shadowOffset: 4,
            shadowOpacity: 120,
            borderWidth: 2,
            cornerRadius: 8,
            highlight: false
        });
    });
}

function drawPot() {
    // Pot positioned exactly in the center of the table
    const centerX = width/2;
    const centerY = height/2; // True center, not offset
    
    push();
    
    // Add subtle pulsing animation to the pot
    const time = millis() * 0.002;
    const pulseScale = 1 + sin(time) * 0.03;
    const potWidth = 130 * pulseScale;
    const potHeight = 70 * pulseScale;
    
    // Draw pot shadow with more depth
    fill(0, 0, 0, 120);
    noStroke();
    ellipse(centerX + 4, centerY + 4, potWidth, potHeight);
    
    // Draw pot background with more subtle gold color
    fill(218, 165, 32); // More subtle gold
    stroke(184, 134, 11); // Darker gold border
    strokeWeight(4);
    ellipse(centerX, centerY, potWidth, potHeight);
    
    // Draw pot inner circle with gradient effect
    fill(255, 215, 0, 200); // Lighter gold inner
    noStroke();
    ellipse(centerX, centerY, 110 * pulseScale, 55 * pulseScale);
    
    // Draw pot text with better styling and larger size
    textAlign(CENTER, CENTER);
    textSize(20);
    textStyle(BOLD);
    
    // Shadow for better readability
    fill(0, 0, 0, 180);
    text('POT', centerX + 2, centerY - 12);
    text('$' + (window.game.pot || 0), centerX + 2, centerY + 8);
    
    // Main text with better color
    fill(255, 255, 255);
    stroke(0, 0, 0);
    strokeWeight(2);
    text('POT', centerX, centerY - 12);
    text('$' + (window.game.pot || 0), centerX, centerY + 8);
    
    pop();
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
    
    // Draw hand rankings button with better readability
    push();
    // Dark background with white text for better contrast
    fill(30, 30, 50, 240); // Dark blue-gray background
    stroke(255, 215, 0); // Gold border
    strokeWeight(2);
    rect(width - 200, 20, 180, 40, 8);
    
    // White text with black outline for maximum readability
    fill(255, 255, 255);
    textAlign(CENTER, CENTER);
    textSize(15);
    textStyle(BOLD);
    stroke(0, 0, 0);
    strokeWeight(2);
    text('Hand Rankings', width - 110, 40);
    pop();
}

function drawBlindIndicators() {
    if (!window.game || !window.game.players || window.game.players.length < 2) return;
    
    const centerX = width/2;
    const centerY = height/2;
    const radiusX = width * 0.35;
    const radiusY = height * 0.28;
    
    const dealerPosition = window.game.dealerPosition || 0;
    const smallBlindPos = (dealerPosition + 1) % window.game.players.length;
    const bigBlindPos = (dealerPosition + 2) % window.game.players.length;
    
    window.game.players.forEach((player, index) => {
        const angle = (TWO_PI / window.game.players.length) * index - HALF_PI;
        const x = centerX + cos(angle) * radiusX;
        const y = centerY + sin(angle) * radiusY;
        
        push();
        
        // Draw dealer button
        if (index === dealerPosition) {
            fill(255, 215, 0); // Gold
            stroke(255, 255, 255);
            strokeWeight(2);
            ellipse(x, y - 80, 30, 30);
            
            fill(0, 0, 0);
            textAlign(CENTER, CENTER);
            textSize(12);
            textStyle(BOLD);
            noStroke();
            text('D', x, y - 80);
        }
        
        // Draw small blind indicator
        if (index === smallBlindPos) {
            fill(100, 200, 255); // Light blue
            stroke(255, 255, 255);
            strokeWeight(2);
            ellipse(x, y - 80, 28, 28);
            
            fill(0, 0, 0);
            textAlign(CENTER, CENTER);
            textSize(10);
            textStyle(BOLD);
            noStroke();
            text('SB', x, y - 80);
        }
        
        // Draw big blind indicator
        if (index === bigBlindPos) {
            fill(255, 100, 100); // Light red
            stroke(255, 255, 255);
            strokeWeight(2);
            ellipse(x, y - 80, 28, 28);
            
            fill(0, 0, 0);
            textAlign(CENTER, CENTER);
            textSize(10);
            textStyle(BOLD);
            noStroke();
            text('BB', x, y - 80);
        }
        
        pop();
    });
}

function drawChips() {
    if (!window.game.players) return;
    
    const centerX = width/2;
    const centerY = height/2;
    const radiusX = width * 0.35; // Match player positioning
    const radiusY = height * 0.28; // Match player positioning
    
    // Draw chips for each player - positioned in dedicated areas, well away from player boxes
    window.game.players.forEach((player, index) => {
        const angle = (TWO_PI / window.game.players.length) * index - HALF_PI;
        const playerX = centerX + cos(angle) * radiusX;
        const playerY = centerY + sin(angle) * radiusY;
        
        // Position chips in a dedicated area - much further from player box to avoid overlap
        // Move chips outward and to the side based on player position
        const chipRadiusX = width * 0.45; // Further out from center
        const chipRadiusY = height * 0.38; // Further out from center
        let chipX = centerX + cos(angle) * chipRadiusX;
        let chipY = centerY + sin(angle) * chipRadiusY;
        
        // Additional offset for top/bottom players to avoid overlap with player boxes
        // Check if player is in top half (negative Y) or bottom half (positive Y)
        if (sin(angle) < -0.3) {
            // Top player - move chips further up and to the side to avoid overlap
            chipY = chipY - 80; // Move up significantly
            chipX = chipX + (cos(angle) > 0 ? 40 : -40); // Move to the side
        } else if (sin(angle) > 0.3) {
            // Bottom player - move chips further down and to the right (betting controls are on left)
            chipY = chipY + 80; // Move down significantly
            chipX = chipX + 40; // Move to the right side
        }
        
        // Draw chip stack based on player's chips
        drawChipStack(chipX, chipY, player.chips, player.currentBet);
    });
}

function drawChipStack(x, y, totalChips, currentBet) {
    push();
    
    // Draw chip area background with better styling
    fill(20, 20, 30, 200);
    stroke(180, 180, 200, 220);
    strokeWeight(2);
    rect(x - 75, y - 45, 150, 85, 12);
    
    // Draw chip area title with larger text
    fill(255, 215, 0);
    textAlign(CENTER, CENTER);
    textSize(14); // Increased from 12
    textStyle(BOLD);
    stroke(0, 0, 0);
    strokeWeight(1);
    text('Chips', x, y - 28);
    
    // Calculate chip distribution
    const chipValues = [100, 50, 25, 10, 5, 1];
    const chipColors = [
        [200, 0, 0],    // Darker red for 100
        [0, 0, 200],    // Darker blue for 50
        [0, 150, 0],    // Darker green for 25
        [220, 220, 0],  // Darker yellow for 10
        [220, 140, 0],  // Darker orange for 5
        [240, 240, 240] // Light gray for 1
    ];
    
    let remainingChips = totalChips;
    let stackHeight = 0;
    
    // Draw chips from highest to lowest value with improved rendering
    chipValues.forEach((value, index) => {
        const chipCount = Math.floor(remainingChips / value);
        if (chipCount > 0) {
            const maxChipsToShow = Math.min(chipCount, 5); // Show up to 5 chips per value
            
            for (let i = 0; i < maxChipsToShow; i++) {
                const chipX = x + (i % 2) * 28 - 14; // Better spread chips in 2 columns
                const chipY = y - stackHeight - i * 4; // Better vertical spacing
                
                // Draw chip shadow with depth
                fill(0, 0, 0, 120);
                noStroke();
                ellipse(chipX + 3, chipY + 3, 28, 16);
                
                // Draw chip with improved 3D effect
                fill(chipColors[index][0], chipColors[index][1], chipColors[index][2]);
                stroke(0);
                strokeWeight(2);
                ellipse(chipX, chipY, 28, 16);
                
                // Draw chip inner highlight for 3D effect
                fill(255, 255, 255, 60);
                noStroke();
                ellipse(chipX - 5, chipY - 3, 10, 6);
                
                // Draw chip value with better styling
                fill(255);
                textAlign(CENTER, CENTER);
                textSize(9); // Increased from 8
                textStyle(BOLD);
                stroke(0);
                strokeWeight(1);
                text(value, chipX, chipY);
            }
            
            remainingChips -= chipCount * value;
            stackHeight += maxChipsToShow * 4 + 8;
        }
    });
    
    // Draw current bet chips separately with better styling
    if (currentBet > 0) {
        const betChips = Math.min(currentBet, 5); // Show up to 5 bet chips
        for (let i = 0; i < betChips; i++) {
            const chipX = x + (i % 2) * 28 - 14;
            const chipY = y + 25;
            
            // Draw bet chip shadow
            fill(0, 0, 0, 120);
            noStroke();
            ellipse(chipX + 3, chipY + 3, 26, 14);
            
            // Draw bet chip (different color - purple/magenta)
            fill(180, 0, 180);
            stroke(255);
            strokeWeight(2);
            ellipse(chipX, chipY, 26, 14);
            
            // Draw bet indicator
            fill(255);
            textAlign(CENTER, CENTER);
            textSize(8);
            textStyle(BOLD);
            stroke(0);
            strokeWeight(1);
            text('B', chipX, chipY);
        }
    }
    
    // Draw total chips text with larger, clearer text
    fill(255, 255, 255);
    textAlign(CENTER, CENTER);
    textSize(13); // Increased from 10
    textStyle(BOLD);
    stroke(0, 0, 0);
    strokeWeight(2);
    text('$' + totalChips, x, y + 40);
    
    pop();
}

// Hand rankings popup functions
function showHandRankingsPopup() {
    // Create popup background
    const popup = document.createElement('div');
    popup.id = 'handRankingsPopup';
    popup.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.8);
        z-index: 1000;
        display: flex;
        justify-content: center;
        align-items: center;
    `;
    
    // Create popup content
    const content = document.createElement('div');
    content.style.cssText = `
        background: linear-gradient(135deg, #1e3c72, #2a5298);
        color: white;
        padding: 30px;
        border-radius: 15px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        max-width: 600px;
        max-height: 80vh;
        overflow-y: auto;
        text-align: center;
        border: 3px solid #4CAF50;
    `;
    
    content.innerHTML = `
        <h2 style="margin-top: 0; color: #FFD700; text-shadow: 2px 2px 4px rgba(0,0,0,0.5);">🃏 Poker Hand Rankings</h2>
        <div style="text-align: left; line-height: 1.6;">
            <div style="margin: 15px 0; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 8px;">
                <strong style="color: #FFD700;">1. Royal Flush</strong><br>
                A, K, Q, J, 10 all of the same suit. The highest possible hand.
            </div>
            <div style="margin: 15px 0; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 8px;">
                <strong style="color: #FFD700;">2. Straight Flush</strong><br>
                Five cards in sequence, all of the same suit (e.g., 5, 6, 7, 8, 9 of hearts).
            </div>
            <div style="margin: 15px 0; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 8px;">
                <strong style="color: #FFD700;">3. Four of a Kind</strong><br>
                Four cards of the same rank (e.g., four 7s).
            </div>
            <div style="margin: 15px 0; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 8px;">
                <strong style="color: #FFD700;">4. Full House</strong><br>
                Three of a kind plus a pair (e.g., three 8s and two 4s).
            </div>
            <div style="margin: 15px 0; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 8px;">
                <strong style="color: #FFD700;">5. Flush</strong><br>
                Five cards of the same suit, not in sequence.
            </div>
            <div style="margin: 15px 0; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 8px;">
                <strong style="color: #FFD700;">6. Straight</strong><br>
                Five cards in sequence, not all of the same suit.
            </div>
            <div style="margin: 15px 0; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 8px;">
                <strong style="color: #FFD700;">7. Three of a Kind</strong><br>
                Three cards of the same rank (e.g., three 9s).
            </div>
            <div style="margin: 15px 0; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 8px;">
                <strong style="color: #FFD700;">8. Two Pair</strong><br>
                Two different pairs (e.g., two 6s and two 3s).
            </div>
            <div style="margin: 15px 0; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 8px;">
                <strong style="color: #FFD700;">9. One Pair</strong><br>
                Two cards of the same rank (e.g., two 5s).
            </div>
            <div style="margin: 15px 0; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 8px;">
                <strong style="color: #FFD700;">10. High Card</strong><br>
                The highest card when no other hand is made.
            </div>
        </div>
        <button onclick="closeHandRankingsPopup()" style="
            background: #4CAF50;
            color: white;
            border: none;
            padding: 12px 24px;
            font-size: 16px;
            border-radius: 8px;
            cursor: pointer;
            margin-top: 20px;
            font-weight: bold;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        ">Close</button>
    `;
    
    popup.appendChild(content);
    document.body.appendChild(popup);
}

function closeHandRankingsPopup() {
    const popup = document.getElementById('handRankingsPopup');
    if (popup) {
        popup.remove();
    }
}

// Mouse click handling
function mousePressed() {
    // Check if hand rankings button was clicked
    if (mouseX >= width - 200 && mouseX <= width - 20 && 
        mouseY >= 20 && mouseY <= 60) {
        showHandRankingsPopup();
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    window.pokerClient = new PokerClient();
    window.pokerClient.initialize();
});