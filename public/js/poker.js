// 🃏 TEXAS HOLD'EM POKER GAME LOGIC

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
        
        console.log('🃏 Poker game initialized with', this.players.length, 'players');
    }

    // Start a new hand
    startNewHand() {
        console.log('🎯 Starting new hand');
        
        // Reset player states
        this.players.forEach(player => {
            player.hand = [];
            player.currentBet = 0;
            player.totalBet = 0;
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
        
        // Shuffle deck
        this.deck = CardUtils.shuffleDeck(this.deck);
        
        // Post blinds
        this.postBlinds();
        
        // Deal hole cards
        this.dealHoleCards();
        
        // Start betting round
        this.startBettingRound();
    }

    // Post small and big blinds
    postBlinds() {
        console.log('🎯 Posting blinds - players:', this.players);
        console.log('🎯 Players length:', this.players?.length);
        console.log('🎯 Dealer position:', this.dealerPosition);
        
        // Safety check - ensure we have players
        if (!this.players || this.players.length === 0) {
            console.error('❌ Cannot post blinds - no players available');
            return;
        }
        
        const smallBlindPos = (this.dealerPosition + 1) % this.players.length;
        const bigBlindPos = (this.dealerPosition + 2) % this.players.length;
        
        console.log('🎯 Small blind position:', smallBlindPos);
        console.log('🎯 Big blind position:', bigBlindPos);
        console.log('🎯 Small blind player:', this.players[smallBlindPos]);
        console.log('🎯 Big blind player:', this.players[bigBlindPos]);
        
        // Safety check - ensure players exist at calculated positions
        if (!this.players[smallBlindPos] || !this.players[bigBlindPos]) {
            console.error('❌ Cannot post blinds - players not found at calculated positions');
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
        
        console.log(`💰 Blinds posted: SB $${this.smallBlind}, BB $${this.bigBlind}`);
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
        console.log('🃏 Hole cards dealt');
    }

    // Start a betting round
    startBettingRound() {
        console.log(`🎯 Starting ${this.gamePhase} betting round`);
        
        // Reset current bets for this round
        this.players.forEach(player => {
            player.currentBet = 0;
        });
        
        // Find first player to act
        let startPos = this.dealerPosition + 3; // UTG position
        if (this.gamePhase === 'preflop') {
            startPos = this.dealerPosition + 3; // UTG after big blind
        } else {
            startPos = this.dealerPosition + 1; // Small blind first
        }
        
        this.currentPlayer = startPos % this.players.length;
        this.currentBet = 0;
        
        // Emit betting round started event
        this.emitEvent('bettingRoundStarted', {
            phase: this.gamePhase,
            currentPlayer: this.currentPlayer,
            currentBet: this.currentBet,
            pot: this.pot
        });
    }

    // Player action (fold, call, raise, bet)
    playerAction(playerIndex, action, amount = 0) {
        const player = this.players[playerIndex];
        if (!player || player.isFolded || player.isAllIn) {
            return false;
        }
        
        console.log(`🎯 Player ${player.name} ${action}s ${amount > 0 ? '$' + amount : ''}`);
        
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
                const totalBet = this.currentBet + raiseAmount;
                const additionalBet = totalBet - player.currentBet;
                
                player.chips -= additionalBet;
                player.currentBet = totalBet;
                player.totalBet += additionalBet;
                this.pot += additionalBet;
                this.currentBet = totalBet;
                
                if (player.chips === 0) {
                    player.isAllIn = true;
                }
                break;
        }
        
        // Check if betting round is complete
        if (this.isBettingRoundComplete()) {
            this.endBettingRound();
        } else {
            this.nextPlayer();
        }
        
        // Emit action event
        this.emitEvent('playerAction', {
            playerIndex: playerIndex,
            action: action,
            amount: amount,
            pot: this.pot,
            currentBet: this.currentBet
        });
        
        return true;
    }

    // Check if betting round is complete
    isBettingRoundComplete() {
        const activePlayers = this.players.filter(p => !p.isFolded && !p.isAllIn);
        
        if (activePlayers.length <= 1) {
            return true; // Only one player left
        }
        
        // Check if all active players have bet the same amount
        const activeBets = activePlayers.map(p => p.currentBet);
        return activeBets.every(bet => bet === this.currentBet);
    }

    // Move to next player
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
        console.log(`✅ ${this.gamePhase} betting round complete`);
        
        // Move to next phase
        switch (this.gamePhase) {
            case 'preflop':
                this.gamePhase = 'flop';
                this.dealFlop();
                break;
            case 'flop':
                this.gamePhase = 'turn';
                this.dealTurn();
                break;
            case 'turn':
                this.gamePhase = 'river';
                this.dealRiver();
                break;
            case 'river':
                this.gamePhase = 'showdown';
                this.showdown();
                return;
        }
        
        // Start next betting round
        setTimeout(() => {
            this.startBettingRound();
        }, 1000);
    }

    // Deal the flop (3 community cards)
    dealFlop() {
        this.deck.pop(); // Burn card
        for (let i = 0; i < 3; i++) {
            this.communityCards.push(this.deck.pop());
        }
        console.log('🃏 Flop dealt:', this.communityCards.slice(0, 3).map(c => c.name));
        
        this.emitEvent('communityCards', {
            cards: this.communityCards,
            phase: this.gamePhase
        });
    }

    // Deal the turn (4th community card)
    dealTurn() {
        this.deck.pop(); // Burn card
        this.communityCards.push(this.deck.pop());
        console.log('🃏 Turn dealt:', this.communityCards[3].name);
        
        this.emitEvent('communityCards', {
            cards: this.communityCards,
            phase: this.gamePhase
        });
    }

    // Deal the river (5th community card)
    dealRiver() {
        this.deck.pop(); // Burn card
        this.communityCards.push(this.deck.pop());
        console.log('🃏 River dealt:', this.communityCards[4].name);
        
        this.emitEvent('communityCards', {
            cards: this.communityCards,
            phase: this.gamePhase
        });
    }

    // Showdown - determine winners
    showdown() {
        console.log('🏆 Showdown!');
        
        const activePlayers = this.players.filter(p => !p.isFolded);
        
        // Evaluate each player's hand
        activePlayers.forEach(player => {
            const bestHand = this.evaluateHand(player.hand, this.communityCards);
            player.bestHand = bestHand;
            player.handRank = bestHand.rank;
        });
        
        // Sort players by hand strength
        activePlayers.sort((a, b) => this.compareHands(b.bestHand, a.bestHand));
        
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
        
        // Move dealer button
        this.dealerPosition = (this.dealerPosition + 1) % this.players.length;
        
        // Start new hand after delay
        setTimeout(() => {
            this.startNewHand();
        }, 5000);
    }

    // Evaluate a player's best 5-card hand
    evaluateHand(holeCards, communityCards) {
        const allCards = [...holeCards, ...communityCards];
        const bestHand = this.getBestFiveCardHand(allCards);
        return bestHand;
    }

    // Get the best 5-card hand from 7 cards
    getBestFiveCardHand(cards) {
        let bestHand = null;
        let bestRank = -1;
        
        // Generate all possible 5-card combinations
        const combinations = this.getCombinations(cards, 5);
        
        for (let combo of combinations) {
            const handRank = this.rankHand(combo);
            if (handRank.rank > bestRank) {
                bestRank = handRank.rank;
                bestHand = {
                    cards: combo,
                    rank: handRank.rank,
                    name: this.handRankings[handRank.rank],
                    kickers: handRank.kickers
                };
            }
        }
        
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
            for (let combo of tailCombos) {
                combinations.push([head, ...combo]);
            }
        }
        return combinations;
    }

    // Rank a 5-card hand
    rankHand(cards) {
        const sortedCards = cards.sort((a, b) => b.value - a.value);
        const ranks = sortedCards.map(c => c.value);
        const suits = sortedCards.map(c => c.suit);
        
        const rankCounts = {};
        ranks.forEach(rank => {
            rankCounts[rank] = (rankCounts[rank] || 0) + 1;
        });
        
        const counts = Object.values(rankCounts).sort((a, b) => b - a);
        const isFlush = suits.every(suit => suit === suits[0]);
        const isStraight = this.isStraight(ranks);
        
        // Royal Flush
        if (isFlush && isStraight && ranks[0] === 14) {
            return { rank: 9, kickers: ranks };
        }
        
        // Straight Flush
        if (isFlush && isStraight) {
            return { rank: 8, kickers: ranks };
        }
        
        // Four of a Kind
        if (counts[0] === 4) {
            const fourOfAKind = Object.keys(rankCounts).find(rank => rankCounts[rank] === 4);
            const kicker = Object.keys(rankCounts).find(rank => rankCounts[rank] === 1);
            return { rank: 7, kickers: [parseInt(fourOfAKind), parseInt(kicker)] };
        }
        
        // Full House
        if (counts[0] === 3 && counts[1] === 2) {
            const threeOfAKind = Object.keys(rankCounts).find(rank => rankCounts[rank] === 3);
            const pair = Object.keys(rankCounts).find(rank => rankCounts[rank] === 2);
            return { rank: 6, kickers: [parseInt(threeOfAKind), parseInt(pair)] };
        }
        
        // Flush
        if (isFlush) {
            return { rank: 5, kickers: ranks };
        }
        
        // Straight
        if (isStraight) {
            return { rank: 4, kickers: ranks };
        }
        
        // Three of a Kind
        if (counts[0] === 3) {
            const threeOfAKind = Object.keys(rankCounts).find(rank => rankCounts[rank] === 3);
            const kickers = Object.keys(rankCounts)
                .filter(rank => rankCounts[rank] === 1)
                .map(rank => parseInt(rank))
                .sort((a, b) => b - a);
            return { rank: 3, kickers: [parseInt(threeOfAKind), ...kickers] };
        }
        
        // Two Pair
        if (counts[0] === 2 && counts[1] === 2) {
            const pairs = Object.keys(rankCounts)
                .filter(rank => rankCounts[rank] === 2)
                .map(rank => parseInt(rank))
                .sort((a, b) => b - a);
            const kicker = Object.keys(rankCounts).find(rank => rankCounts[rank] === 1);
            return { rank: 2, kickers: [...pairs, parseInt(kicker)] };
        }
        
        // One Pair
        if (counts[0] === 2) {
            const pair = Object.keys(rankCounts).find(rank => rankCounts[rank] === 2);
            const kickers = Object.keys(rankCounts)
                .filter(rank => rankCounts[rank] === 1)
                .map(rank => parseInt(rank))
                .sort((a, b) => b - a);
            return { rank: 1, kickers: [parseInt(pair), ...kickers] };
        }
        
        // High Card
        return { rank: 0, kickers: ranks };
    }

    // Check if ranks form a straight
    isStraight(ranks) {
        const sortedRanks = [...new Set(ranks)].sort((a, b) => b - a);
        
        // Check for regular straight
        for (let i = 0; i < sortedRanks.length - 4; i++) {
            if (sortedRanks[i] - sortedRanks[i + 4] === 4) {
                return true;
            }
        }
        
        // Check for A-2-3-4-5 straight
        if (sortedRanks.includes(14) && sortedRanks.includes(5) && 
            sortedRanks.includes(4) && sortedRanks.includes(3) && sortedRanks.includes(2)) {
            return true;
        }
        
        return false;
    }

    // Compare two hands
    compareHands(hand1, hand2) {
        if (hand1.rank !== hand2.rank) {
            return hand1.rank - hand2.rank;
        }
        
        for (let i = 0; i < hand1.kickers.length; i++) {
            if (hand1.kickers[i] !== hand2.kickers[i]) {
                return hand1.kickers[i] - hand2.kickers[i];
            }
        }
        
        return 0;
    }

    // Distribute pot to winners
    distributePot(activePlayers) {
        if (activePlayers.length === 1) {
            // Only one player left
            activePlayers[0].chips += this.pot;
            this.winners = [{
                player: activePlayers[0],
                amount: this.pot,
                reason: 'Last player standing'
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
                    reason: player.bestHand.name
                };
            });
        }
        
        console.log('💰 Pot distributed:', this.winners);
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
            communityCards: this.communityCards,
            pot: this.pot,
            currentBet: this.currentBet,
            currentPlayer: this.currentPlayer,
            gamePhase: this.gamePhase,
            dealerPosition: this.dealerPosition,
            winners: this.winners
        };
    }
}

// 🎮 POKER CLIENT LOGIC
class PokerClient {
    constructor() {
        this.game = new PokerGame();
        this.localPlayerIndex = 0;
        this.isMyTurn = false;
        this.canAct = false;
    }

    // Initialize the client
    initialize() {
        console.log('🎮 Initializing Poker client');
        
        // Initialize game framework
        GameFramework.initialize('poker');
        
        // Setup UI event listeners
        this.setupUI();
        
        // Setup socket event listeners
        this.setupSocketListeners();
        
        console.log('✅ Poker client initialized');
        
        // Test GameFramework availability immediately after initialization
        setTimeout(() => {
            console.log('🔍 Post-init test - GameFramework type:', typeof GameFramework);
            console.log('🔍 Post-init test - GameFramework.createRoom:', GameFramework?.createRoom);
            console.log('🔍 Post-init test - window.gameFramework.socket:', window.gameFramework?.socket);
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
            UIUtils.showGameMessage(`Error: ${error}`, 'error');
        });
    }

    // Create room
    createRoom() {
        console.log('🎮 Create Room button clicked');
        
        // Try to create room immediately first
        console.log('🔍 Debug - GameFramework type:', typeof GameFramework);
        console.log('🔍 Debug - GameFramework object:', GameFramework);
        console.log('🔍 Debug - GameFramework.createRoom:', GameFramework?.createRoom);
        
        if (typeof GameFramework !== 'undefined' && GameFramework.createRoom && window.gameFramework?.socket) {
            console.log('✅ GameFramework and socket available, creating room immediately');
            GameFramework.createRoom('poker');
            return;
        }
        
        // If not available, wait and retry
        console.log('⏳ GameFramework not ready, waiting...');
        let attempts = 0;
        const maxAttempts = 10;
        
        const tryCreateRoom = () => {
            attempts++;
            console.log(`🔄 Attempt ${attempts}/${maxAttempts} to create room`);
            
            if (typeof GameFramework !== 'undefined' && GameFramework.createRoom && window.gameFramework?.socket) {
                console.log('✅ GameFramework and socket now available, creating room');
                GameFramework.createRoom('poker');
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
        console.log('🎮 Starting game with data:', data);
        console.log('🎮 Current game players:', this.game.players);
        
        if (data && data.players) {
            console.log('🎮 Initializing game with players:', data.players);
            this.game.initialize(data.players);
            this.localPlayerIndex = data.localPlayerIndex;
        } else {
            console.log('⚠️ No player data provided, using room players');
            // Get players from the room
            const roomPlayers = window.gameFramework.players || [];
            console.log('🎮 Room players:', roomPlayers);
            
            if (roomPlayers.length > 0) {
                // Convert room players to game players
                const gamePlayers = roomPlayers.map((player, index) => ({
                    id: player.id,
                    name: player.name,
                    isBot: player.isBot,
                    chips: 1000, // Starting chips
                    hand: [],
                    currentBet: 0,
                    totalBet: 0,
                    isFolded: false,
                    isAllIn: false,
                    handRank: null,
                    bestHand: null
                }));
                
                console.log('🎮 Converted game players:', gamePlayers);
                this.game.initialize(gamePlayers);
                this.localPlayerIndex = 0; // First player is local
            } else {
                console.error('❌ No players available to start game');
                UIUtils.showGameMessage('No players available to start game. Please add players first.', 'error');
                return;
            }
        }
        
        console.log('🎮 Final game players before startNewHand:', this.game.players);
        console.log('🎮 Players length:', this.game.players?.length);
        
        if (this.game.players.length === 0) {
            console.error('❌ Cannot start game with 0 players');
            UIUtils.showGameMessage('Cannot start game with 0 players. Please add players first.', 'error');
            return;
        }
        
        UIUtils.showGame();
        this.game.startNewHand();
    }

    // Player action
    playerAction(action) {
        if (!this.canAct || !this.isMyTurn) {
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
        
        this.canAct = false;
        this.hideBettingControls();
    }

    // Update game state
    updateGameState(data) {
        this.game.players = data.players;
        this.game.communityCards = data.communityCards;
        this.game.pot = data.pot;
        this.game.currentBet = data.currentBet;
        this.game.currentPlayer = data.currentPlayer;
        this.game.gamePhase = data.gamePhase;
        
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
        
        if (this.canAct) {
            this.showBettingControls();
        } else {
            this.hideBettingControls();
        }
        
        this.updateUI();
    }

    // Update player action
    updatePlayerAction(data) {
        this.game.pot = data.pot;
        this.game.currentBet = data.currentBet;
        this.updateUI();
    }

    // Update community cards
    updateCommunityCards(data) {
        this.game.communityCards = data.cards;
        this.game.gamePhase = data.phase;
        this.updateUI();
    }

    // Show showdown
    showShowdown(data) {
        this.game.winners = data.winners;
        this.game.players = data.players;
        
        // Show winner message
        const winnerMessage = data.winners.map(w => 
            `${w.player.name} wins $${w.amount} with ${w.reason}`
        ).join(', ');
        
        UIUtils.showGameMessage(`🏆 ${winnerMessage}`, 'success');
        this.updateUI();
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
            `;
            cardDiv.textContent = card.name;
            container.appendChild(cardDiv);
        });
    }

    // Update player areas
    updatePlayerAreas() {
        // This would update the visual representation of players
        // For now, just log the state
        console.log('Players:', this.game.players.map(p => ({
            name: p.name,
            chips: p.chips,
            hand: p.hand.length,
            isFolded: p.isFolded
        })));
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
        
        // Force button colors with a delay to override any CSS
        setTimeout(() => {
            if (addBotBtn) {
                addBotBtn.style.setProperty('background-color', '#4CAF50', 'important');
                addBotBtn.style.setProperty('color', 'white', 'important');
                addBotBtn.style.setProperty('border', 'none', 'important');
                console.log('🔄 Add Bot button color forced to green');
            }
            
            if (removeBotBtn) {
                removeBotBtn.style.setProperty('background-color', '#f44336', 'important');
                removeBotBtn.style.setProperty('color', 'white', 'important');
                removeBotBtn.style.setProperty('border', 'none', 'important');
                console.log('🔄 Remove Bot button color forced to red');
            }
            
            if (startGameBtn) {
                startGameBtn.style.setProperty('background-color', '#FF9800', 'important');
                startGameBtn.style.setProperty('color', 'white', 'important');
                startGameBtn.style.setProperty('border', 'none', 'important');
                console.log('🔄 Start Game button color forced to orange');
            }
        }, 100);
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
        console.log('🔄 Resetting Poker client state...');
        this.localPlayerIndex = 0;
        this.isMyTurn = false;
        this.canAct = false;
        this.game = new PokerGame();
        console.log('✅ Poker client state reset');
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    window.pokerClient = new PokerClient();
    window.pokerClient.initialize();
});
