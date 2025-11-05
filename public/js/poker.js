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
        document.getElementById('startGameBtn').onclick = () => {
            const roomId = window.gameFramework.roomId;
            if (!roomId) {
                console.error('🎴 No room ID available to start game');
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
                console.log('🎴 Emitting startGame to server with roomId:', roomId);
                socket.emit('startGame', roomId);
            } else {
                console.error('🎴 No socket available');
                if (typeof UIUtils !== 'undefined') {
                    UIUtils.showGameMessage('Not connected to server', 'error');
                } else {
                    alert('Not connected to server');
                }
            }
        };
        
        // Betting controls
        document.getElementById('foldBtn').onclick = () => this.playerAction('fold');
        document.getElementById('callBtn').onclick = () => this.playerAction('call');
        document.getElementById('raiseBtn').onclick = () => this.playerAction('raise');
        document.getElementById('betBtn').onclick = () => this.playerAction('bet');
        
        // Copy room code
        document.getElementById('copyRoomCodeBtn').onclick = () => this.copyRoomCode();
        
        // Back to Main Menu button (in menu)
        const backToMainMenuBtn = document.getElementById('backToMainMenu');
        if (backToMainMenuBtn) {
            backToMainMenuBtn.onclick = () => {
                console.log('🔙 Back to Main Menu clicked');
                window.location.replace('/');
            };
        }
        
        // Back to Poker Menu button (during game)
        const backToMainMenuBtnGame = document.getElementById('backToMainMenuBtn');
        if (backToMainMenuBtnGame) {
            backToMainMenuBtnGame.onclick = () => {
                console.log('🔙 Back to Poker Menu clicked');
                window.location.reload();
            };
        }
        
        // Poker Menu button (gameMenuBtn)
        const gameMenuBtn = document.getElementById('gameMenuBtn');
        if (gameMenuBtn) {
            gameMenuBtn.onclick = () => {
                console.log('🎴 Poker Menu clicked');
                window.location.reload();
            };
        }
    }

    // Setup socket event listeners
    setupSocketListeners() {
        const socket = window.gameFramework.socket;
        
        socket.on('roomCreated', (data) => {
            console.log('Room created:', data);
            const roomCode = data.roomId || data; // Handle both old and new formats
            
            // Store roomId in gameFramework
            if (window.gameFramework) {
                window.gameFramework.roomId = roomCode;
                console.log('🎴 Stored roomId in gameFramework:', roomCode);
            }
            
            this.showRoomCode(roomCode);
            this.showPlayerCustomization();
            this.showGameControls();
            
            // Update start game button based on initial players
            if (data.players) {
                this.updateStartGameButton(data.players);
                this.updatePlayerList(data.players);
            }
        });
        
        socket.on('roomJoined', (data) => {
            console.log('Room joined:', data);
            const roomCode = data.roomId || data; // Handle both old and new formats
            
            // Store roomId in gameFramework
            if (window.gameFramework) {
                window.gameFramework.roomId = roomCode;
                console.log('🎴 Stored roomId in gameFramework:', roomCode);
            }
            
            this.localPlayerIndex = data.playerIndex !== undefined && data.playerIndex !== null ? data.playerIndex : 0;
            console.log('Local player index set to:', this.localPlayerIndex);
            this.showPlayerCustomization();
            this.showGameControls();
            
            // Update start game button based on current players
            if (data.players) {
                this.updateStartGameButton(data.players);
                this.updatePlayerList(data.players);
            }
        });
        
        socket.on('gameStarted', (data) => {
            console.log('🎴 Game started:', data);
            console.log('🎴 Game started - players in data:', data.players ? data.players.length : 'no players');
            console.log('🎴 Game started - full data:', JSON.stringify(data, null, 2));
            
            if (data.localPlayerIndex !== undefined) {
                this.localPlayerIndex = data.localPlayerIndex;
                console.log('🎴 Local player index from gameStarted:', this.localPlayerIndex);
            }
            
            // CRITICAL: Ensure players array exists and is properly initialized
            if (!data.players || data.players.length === 0) {
                console.error('❌ No players in gameStarted event!');
                console.error('❌ Data received:', data);
                // Try to get players from room state if available
                if (data.players === undefined) {
                    data.players = [];
                }
            }
            
            // Sync game state from server
            if (data.players && data.players.length > 0) {
                this.game.players = data.players.map(p => ({
                    ...p,
                    hand: p.hand || [],
                    chips: p.chips || 1000,
                    currentBet: p.currentBet || 0,
                    totalBet: p.totalBet || 0,
                    isFolded: p.isFolded || false,
                    isAllIn: p.isAllIn || false
                }));
                console.log('🎴 Players synced:', this.game.players.length);
            } else {
                console.error('❌ No players to sync - players array is empty or undefined');
                this.game.players = [];
            }
            
            if (data.communityCards) {
                this.game.communityCards = data.communityCards;
            }
            if (data.pot !== undefined) {
                this.game.pot = data.pot;
            }
            if (data.currentBet !== undefined) {
                this.game.currentBet = data.currentBet;
            }
            if (data.currentPlayer !== undefined) {
                this.game.currentPlayer = data.currentPlayer;
            }
            if (data.gamePhase) {
                this.game.gamePhase = data.gamePhase;
            }
            if (data.dealerPosition !== undefined) {
                this.game.dealerPosition = data.dealerPosition;
            }
            if (data.smallBlind !== undefined) {
                this.game.smallBlind = data.smallBlind;
            }
            if (data.bigBlind !== undefined) {
                this.game.bigBlind = data.bigBlind;
            }
            
            this.startGame(data);
        });
        
        socket.on('gameState', (data) => {
            console.log('🎴 gameState event received:', data);
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
        socket.on('playerJoined', (data) => {
            console.log('🎴 Player joined room:', data);
            this.updatePlayerList(data.players || []);
            this.updateStartGameButton(data.players || []);
        });
        
        socket.on('playersUpdated', (players) => {
            console.log('🎴 Players updated:', players);
            this.updatePlayerList(players || []);
            this.updateStartGameButton(players || []);
        });
        
        socket.on('error', (error) => {
            console.error('Socket error:', error);
            UIUtils.showGameMessage('Error: ' + error, 'error');
        });
    }
    
    // Update player list display
    updatePlayerList(players) {
        const playerList = document.getElementById('playerList');
        if (!playerList) return;
        
        console.log('🎴 Updating player list with:', players);
        
        let playerListHTML = '<h3 style="margin: 8px 0 6px 0; font-size: 16px;">Players in Room:</h3>';
        players.forEach((player, index) => {
            const playerType = player.isBot ? '🤖 Bot' : '👤 Player';
            const displayName = player.name || `Player ${index + 1}`;
            
            playerListHTML += `<div style="margin: 3px 0; padding: 6px; border: 1px solid #4CAF50; border-radius: 3px; background-color: rgba(0, 100, 0, 0.8); color: white; font-size: 13px;">
                <strong style="color: #FFD700;">${playerType}:</strong> <span style="color: #FFFFFF;">${displayName}</span>
            </div>`;
        });
        
        playerList.innerHTML = playerListHTML;
        console.log('✅ Player list updated');
    }
    
    // Update start game button state based on player count
    updateStartGameButton(players) {
        const startGameBtn = document.getElementById('startGameBtn');
        if (!startGameBtn) return;
        
        const playerCount = players.length || 0;
        const minPlayers = 2; // Minimum 2 players required to start
        
        if (playerCount < minPlayers) {
            startGameBtn.disabled = true;
            startGameBtn.style.opacity = '0.5';
            startGameBtn.style.cursor = 'not-allowed';
            console.log(`🎴 Start Game button disabled - need ${minPlayers} players, have ${playerCount}`);
        } else {
            startGameBtn.disabled = false;
            startGameBtn.style.opacity = '1';
            startGameBtn.style.cursor = 'pointer';
            console.log(`🎴 Start Game button enabled - ${playerCount} players`);
        }
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
        console.log('🎴 Starting game with data:', data);
        
        // Server now manages all game state, so we just sync from server data
        if (data && data.players) {
            console.log('🎴 Syncing game state from server');
            // Use server data directly - don't re-initialize
            this.game.players = data.players.map(p => ({
                ...p,
                hand: p.hand || [],
                chips: p.chips || 1000,
                currentBet: p.currentBet || 0,
                totalBet: p.totalBet || 0,
                isFolded: p.isFolded || false,
                isAllIn: p.isAllIn || false
            }));
            
            // Sync other game state
            if (data.communityCards) {
                this.game.communityCards = data.communityCards;
            }
            if (data.pot !== undefined) {
                this.game.pot = data.pot;
            }
            if (data.currentBet !== undefined) {
                this.game.currentBet = data.currentBet;
            }
            if (data.currentPlayer !== undefined) {
                this.game.currentPlayer = data.currentPlayer;
            }
            if (data.gamePhase) {
                this.game.gamePhase = data.gamePhase;
            }
            if (data.dealerPosition !== undefined) {
                this.game.dealerPosition = data.dealerPosition;
            }
            if (data.smallBlind !== undefined) {
                this.game.smallBlind = data.smallBlind;
            }
            if (data.bigBlind !== undefined) {
                this.game.bigBlind = data.bigBlind;
            }
        }
        
        console.log('🎴 Game state synced from server');
        console.log('🎴 Players:', this.game.players.length);
        console.log('🎴 Phase:', this.game.gamePhase);
        console.log('🎴 Current player:', this.game.currentPlayer);
        
        // Update game state
        if (typeof gameStateEnum !== 'undefined') {
            gameState = gameStateEnum.Playing;
            window.gameState = gameStateEnum.Playing;
            console.log('🎴 Game state set to Playing');
            // Start the draw loop when game starts
            loop();
        }
        
        // Hide menu and show game buttons during gameplay
        const menuDiv = document.getElementById('Menu');
        if (menuDiv) {
            menuDiv.style.display = 'none';
            console.log('🎴 Menu hidden during gameplay');
        }
        
        // Show Back to Main Menu and Poker Menu buttons during gameplay in center top
        // Remove any existing buttons first to prevent duplicates
        const existingBackBtn = document.getElementById('backToMainMenuBtnGame');
        const existingMenuBtn = document.getElementById('gameMenuBtnGame');
        if (existingBackBtn) existingBackBtn.remove();
        if (existingMenuBtn) existingMenuBtn.remove();
        
        // Create new buttons - they need to be outside the Menu div to be visible
        const backToMainMenuBtn = document.createElement('button');
        backToMainMenuBtn.id = 'backToMainMenuBtnGame';
        backToMainMenuBtn.textContent = '← Back to Main Menu';
        backToMainMenuBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🔙 Back to Main Menu clicked from game');
            
            if (confirm('Are you sure you want to leave the game and return to the main menu? You will lose your current game progress.')) {
                // Clean up socket connection
                const socket = window.gameFramework?.socket;
                const roomId = this.getRoomId();
                if (socket && roomId) {
                    console.log('🎴 Leaving room before navigation:', roomId);
                    socket.emit('leaveRoom', roomId);
                }
                
                // Clean up game state
                window.game = null;
                window.pokerClient = null;
                if (typeof gameState !== 'undefined') {
                    gameState = gameStateEnum.Menu;
                    window.gameState = gameStateEnum.Menu;
                }
                
                // Navigate after cleanup
                setTimeout(() => {
                    window.location.href = '/';
                }, 100);
            }
        };
        document.body.appendChild(backToMainMenuBtn);
        console.log('🎴 Created Back to Main Menu button for gameplay');
        
        const gameMenuBtn = document.createElement('button');
        gameMenuBtn.id = 'gameMenuBtnGame';
        gameMenuBtn.textContent = 'Poker Game Menu';
        gameMenuBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🎴 Poker Menu clicked from game');
            
            if (confirm('Are you sure you want to return to the poker menu? You will lose your current game progress.')) {
                // Clean up socket connection
                const socket = window.gameFramework?.socket;
                const roomId = this.getRoomId();
                if (socket && roomId) {
                    console.log('🎴 Leaving room before reload:', roomId);
                    socket.emit('leaveRoom', roomId);
                }
                
                // Clean up game state
                window.game = null;
                window.pokerClient = null;
                if (typeof gameState !== 'undefined') {
                    gameState = gameStateEnum.Menu;
                    window.gameState = gameStateEnum.Menu;
                }
                
                // Reload after cleanup
                setTimeout(() => {
                    window.location.reload();
                }, 100);
            }
        };
        document.body.appendChild(gameMenuBtn);
        console.log('🎴 Created Poker Menu button for gameplay');
        
        // Style and position the buttons in center top
        if (backToMainMenuBtn) {
            backToMainMenuBtn.style.display = 'inline-block';
            backToMainMenuBtn.style.position = 'fixed';
            backToMainMenuBtn.style.top = '10px';
            backToMainMenuBtn.style.left = '50%';
            backToMainMenuBtn.style.transform = 'translateX(calc(-50% - 80px))'; // Offset to the left of center
            backToMainMenuBtn.style.zIndex = '1000';
            backToMainMenuBtn.style.background = '#6c757d';
            backToMainMenuBtn.style.color = 'white';
            backToMainMenuBtn.style.border = 'none';
            backToMainMenuBtn.style.padding = '8px 16px';
            backToMainMenuBtn.style.borderRadius = '4px';
            backToMainMenuBtn.style.cursor = 'pointer';
            backToMainMenuBtn.style.fontSize = '14px';
            backToMainMenuBtn.style.fontWeight = 'bold';
            backToMainMenuBtn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
            backToMainMenuBtn.style.pointerEvents = 'auto';
            console.log('🎴 Back to Main Menu button shown during gameplay (center top)');
        }
        
        if (gameMenuBtn) {
            gameMenuBtn.style.display = 'inline-block';
            gameMenuBtn.style.position = 'fixed';
            gameMenuBtn.style.top = '10px';
            gameMenuBtn.style.left = '50%';
            gameMenuBtn.style.transform = 'translateX(calc(-50% + 80px))'; // Offset to the right of center
            gameMenuBtn.style.zIndex = '1000';
            gameMenuBtn.style.background = '#2196F3';
            gameMenuBtn.style.color = 'white';
            gameMenuBtn.style.border = 'none';
            gameMenuBtn.style.padding = '8px 16px';
            gameMenuBtn.style.borderRadius = '4px';
            gameMenuBtn.style.cursor = 'pointer';
            gameMenuBtn.style.fontSize = '14px';
            gameMenuBtn.style.fontWeight = 'bold';
            gameMenuBtn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
            gameMenuBtn.style.pointerEvents = 'auto';
            console.log('🎴 Poker Menu button shown during gameplay (center top)');
        }
        
        // Set global game instance
        window.game = this.game;
        console.log('🎴 Global game instance set');
        
        // Update turn state
        this.isMyTurn = (this.game.currentPlayer === this.localPlayerIndex);
        this.canAct = this.isMyTurn && 
                      this.game.players[this.localPlayerIndex] && 
                      !this.game.players[this.localPlayerIndex].isFolded &&
                      !this.game.players[this.localPlayerIndex].isAllIn;
        
        // Log turn state for debugging
        const dealerPos = this.game.dealerPosition !== undefined ? this.game.dealerPosition : 0;
        const smallBlindPos = (dealerPos + 1) % this.game.players.length;
        const bigBlindPos = (dealerPos + 2) % this.game.players.length;
        console.log(`🎴 Turn State Check:`);
        console.log(`🎴   Local Player Index: ${this.localPlayerIndex} (${this.game.players[this.localPlayerIndex]?.name})`);
        console.log(`🎴   Current Player: ${this.game.currentPlayer} (${this.game.players[this.game.currentPlayer]?.name})`);
        console.log(`🎴   Dealer: Position ${dealerPos}, SB: Position ${smallBlindPos}, BB: Position ${bigBlindPos}`);
        console.log(`🎴   Is My Turn: ${this.isMyTurn}, Can Act: ${this.canAct}`);
        if (this.localPlayerIndex === bigBlindPos) {
            console.log(`🎴   ⚠️ You are the Big Blind - you should NOT be acting first!`);
            console.log(`🎴   ⚠️ First to act should be position ${(bigBlindPos + 1) % this.game.players.length}`);
        }
        
        // Update UI
        this.updateUI();
        
        // Show/hide betting controls based on turn
        if (this.isMyTurn && this.canAct) {
            this.showBettingControls();
        } else {
            this.hideBettingControls();
        }
    }

    // Update game state
    updateGameState(data) {
        console.log('🎴 Updating game state:', data);
        
        // Fully sync game state from server
        if (data.players) {
            this.game.players = data.players;
        }
        if (data.communityCards !== undefined) {
            this.game.communityCards = data.communityCards;
        }
        if (data.pot !== undefined) {
            this.game.pot = data.pot;
        }
        if (data.currentBet !== undefined) {
            this.game.currentBet = data.currentBet;
        }
        if (data.currentPlayer !== undefined) {
            this.game.currentPlayer = data.currentPlayer;
        }
        if (data.gamePhase) {
            this.game.gamePhase = data.gamePhase;
        }
        
        // Update turn state
        this.isMyTurn = (data.currentPlayer === this.localPlayerIndex);
        this.canAct = this.isMyTurn && 
                      this.game.players[this.localPlayerIndex] && 
                      !this.game.players[this.localPlayerIndex].isFolded &&
                      !this.game.players[this.localPlayerIndex].isAllIn;
        
        // Log turn state for debugging
        console.log(`🎴 Game State Update: currentPlayer=${data.currentPlayer}, localPlayerIndex=${this.localPlayerIndex}, isMyTurn=${this.isMyTurn}`);
        
        // Show/hide betting controls based on turn
        if (this.isMyTurn && this.canAct) {
            this.showBettingControls();
        } else {
            this.hideBettingControls();
        }
        
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
        console.log('🎴 updatePlayerAction received:', data);
        
        // Handle different data structures from server
        if (data.players && Array.isArray(data.players)) {
            // Full game state update
            this.game.players = data.players;
            this.game.currentBet = data.currentBet || this.game.currentBet;
            this.game.pot = data.pot || this.game.pot;
            this.game.currentPlayer = data.currentPlayer !== undefined ? data.currentPlayer : this.game.currentPlayer;
            this.game.gamePhase = data.gamePhase || this.game.gamePhase;
            if (data.communityCards) {
                this.game.communityCards = data.communityCards;
            }
        } else if (data.player && data.playerIndex !== undefined) {
            // Single player update
            if (!this.game.players) {
                this.game.players = [];
            }
            this.game.players[data.playerIndex] = data.player;
            if (data.currentBet !== undefined) {
                this.game.currentBet = data.currentBet;
            }
            if (data.pot !== undefined) {
                this.game.pot = data.pot;
            }
            if (data.currentPlayer !== undefined) {
                this.game.currentPlayer = data.currentPlayer;
            }
        } else if (data.action && data.playerIndex !== undefined) {
            // Generic playerAction event (just echo from server) - ignore it
            // The server should send gameState instead for poker
            console.log('🎴 Received generic playerAction event - ignoring (should receive gameState instead)');
            return;
        } else {
            console.warn('🎴 updatePlayerAction: Unknown data structure:', data);
            return;
        }
        
        // Update local player index
        if (this.localPlayerIndex !== undefined) {
            this.isMyTurn = (this.game.currentPlayer === this.localPlayerIndex);
            this.canAct = this.isMyTurn && !this.game.players[this.localPlayerIndex]?.isFolded && !this.game.players[this.localPlayerIndex]?.isAllIn;
        }
        
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

    // Get room ID (handles both object and string formats)
    getRoomId() {
        if (typeof window.gameFramework === 'undefined' || !window.gameFramework.roomId) {
            console.error('❌ No roomId in gameFramework');
            return null;
        }
        const roomId = window.gameFramework.roomId;
        const extractedRoomId = typeof roomId === 'object' && roomId.roomId ? roomId.roomId : roomId;
        console.log('🎴 getRoomId:', extractedRoomId);
        return extractedRoomId;
    }

    // Player action
    playerAction(action) {
        if (!this.canAct) {
            UIUtils.showGameMessage('It\'s not your turn', 'error');
            return;
        }
        
        // Get room ID properly
        const roomId = this.getRoomId();
        if (!roomId) {
            console.error('❌ No roomId available for player action');
            UIUtils.showGameMessage('Room not found. Please create or join a room first.', 'error');
            return;
        }
        
        // Validate local player index
        if (this.localPlayerIndex === undefined || this.localPlayerIndex === null) {
            console.error('❌ No localPlayerIndex available for player action');
            UIUtils.showGameMessage('Player index not set. Please wait for game to initialize.', 'error');
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
        
        console.log('🎴 Emitting playerAction:', { roomId, playerIndex: this.localPlayerIndex, action, amount });
        
        const socket = window.gameFramework.socket;
        if (!socket || !socket.connected) {
            console.error('❌ Socket not connected');
            UIUtils.showGameMessage('Not connected to server. Please refresh the page.', 'error');
            return;
        }
        
        socket.emit('playerAction', {
            roomId: roomId,
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
        
        // Update call amount and call button text
        if (this.localPlayerIndex !== undefined) {
            const localPlayer = this.game.players[this.localPlayerIndex];
            if (localPlayer) {
                const callAmount = this.game.currentBet - (localPlayer.currentBet || 0);
                const callAmountElement = document.getElementById('callAmount');
                if (callAmountElement) {
                    callAmountElement.textContent = callAmount;
                }
                
                // Update call button text (Call $X or Check)
                const callBtn = document.getElementById('callBtn');
                if (callBtn) {
                    callBtn.textContent = callAmount > 0 ? `✅ Call $${callAmount}` : '✅ Check';
                }
            }
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
        if (currentBetInfo && this.game && this.localPlayerIndex !== undefined) {
            const localPlayer = this.game.players[this.localPlayerIndex];
            if (localPlayer) {
                const callAmount = this.game.currentBet - (localPlayer.currentBet || 0);
                currentBetInfo.innerHTML = `
                    <div>Current Bet: $${this.game.currentBet || 0}</div>
                    <div>To Call: $${Math.max(0, callAmount)}</div>
                    <div>Your Chips: $${localPlayer.chips || 0}</div>
                `;
            }
        }
        
        // Update call button text immediately when controls are set up
        if (callBtn && this.localPlayerIndex !== undefined) {
            const localPlayer = this.game.players[this.localPlayerIndex];
            if (localPlayer) {
                const callAmount = this.game.currentBet - (localPlayer.currentBet || 0);
                callBtn.textContent = callAmount > 0 ? `✅ Call $${callAmount}` : '✅ Check';
            }
        }
    }

    // Betting actions - use the correct method that emits to server
    fold() {
        console.log('🎴 Player folded');
        this.addHistoryEntry('You folded', 'player-action');
        
        const roomId = this.getRoomId();
        if (!roomId) {
            console.error('❌ No roomId available for fold');
            return;
        }
        
        if (this.localPlayerIndex === undefined || this.localPlayerIndex === null) {
            console.error('❌ No localPlayerIndex available for fold');
            return;
        }
        
        const socket = window.gameFramework?.socket;
        if (!socket || !socket.connected) {
            console.error('❌ Socket not connected');
            return;
        }
        
        socket.emit('playerAction', {
            roomId: roomId,
            playerIndex: this.localPlayerIndex,
            action: 'fold',
            amount: 0
        });
        
        this.hideBettingControls();
    }

    call() {
        const roomId = this.getRoomId();
        if (!roomId) {
            console.error('❌ No roomId available for call');
            return;
        }
        
        if (this.localPlayerIndex === undefined || this.localPlayerIndex === null) {
            console.error('❌ No localPlayerIndex available for call');
            return;
        }
        
        const localPlayer = this.game.players[this.localPlayerIndex];
        if (!localPlayer) {
            console.error('❌ Local player not found');
            return;
        }
        
        const callAmount = Math.min(this.game.currentBet - localPlayer.currentBet, localPlayer.chips);
        console.log('🎴 Player called:', callAmount);
        
        const socket = window.gameFramework?.socket;
        if (!socket || !socket.connected) {
            console.error('❌ Socket not connected');
            return;
        }
        
        socket.emit('playerAction', {
            roomId: roomId,
            playerIndex: this.localPlayerIndex,
            action: 'call',
            amount: callAmount
        });
        
        this.hideBettingControls();
    }

    raise() {
        const roomId = this.getRoomId();
        if (!roomId) {
            console.error('❌ No roomId available for raise');
            return;
        }
        
        if (this.localPlayerIndex === undefined || this.localPlayerIndex === null) {
            console.error('❌ No localPlayerIndex available for raise');
            return;
        }
        
        const betAmountInput = document.getElementById('betAmount');
        if (!betAmountInput) {
            console.error('❌ Bet amount input not found');
            return;
        }
        
        const betAmount = parseInt(betAmountInput.value) || 0;
        const localPlayer = this.game.players[this.localPlayerIndex];
        if (!localPlayer) {
            console.error('❌ Local player not found');
            return;
        }
        
        // Calculate minimum raise: current bet + minimum raise increment (usually big blind)
        const bigBlind = this.game.bigBlind || 20;
        const currentPlayerBet = localPlayer.currentBet || 0;
        const minRaiseTotal = this.game.currentBet + bigBlind; // Minimum total bet after raise
        const minRaiseAmount = minRaiseTotal - currentPlayerBet; // Minimum additional amount to raise
        
        // Calculate total bet amount (current bet + raise)
        let totalBetAmount = betAmount;
        if (betAmount <= 0) {
            // If no amount entered, use minimum raise
            totalBetAmount = minRaiseTotal;
        } else {
            // Ensure bet amount is at least the minimum raise
            totalBetAmount = Math.max(betAmount, minRaiseTotal);
        }
        
        // Cap at player's available chips
        const maxBet = currentPlayerBet + localPlayer.chips;
        totalBetAmount = Math.min(totalBetAmount, maxBet);
        
        // Calculate the actual raise amount (additional chips to put in)
        const raiseAmount = totalBetAmount - currentPlayerBet;
        
        if (raiseAmount <= 0) {
            console.error('❌ Invalid raise amount');
            if (typeof UIUtils !== 'undefined') {
                UIUtils.showGameMessage('Please enter a valid raise amount', 'error');
            } else {
                alert('Please enter a valid raise amount');
            }
            return;
        }
        
        if (raiseAmount < minRaiseAmount) {
            console.error('❌ Raise amount too small. Minimum raise:', minRaiseAmount);
            if (typeof UIUtils !== 'undefined') {
                UIUtils.showGameMessage(`Minimum raise is $${minRaiseAmount} (total bet: $${minRaiseTotal})`, 'error');
            } else {
                alert(`Minimum raise is $${minRaiseAmount} (total bet: $${minRaiseTotal})`);
            }
            return;
        }
        
        if (raiseAmount > localPlayer.chips) {
            console.error('❌ Raise amount exceeds available chips');
            if (typeof UIUtils !== 'undefined') {
                UIUtils.showGameMessage('Insufficient chips', 'error');
            } else {
                alert('Insufficient chips');
            }
            return;
        }
        
        console.log('🎴 Player raised:', raiseAmount);
        this.addHistoryEntry(`You raised to $${totalBetAmount}`, 'player-action');
        
        const socket = window.gameFramework?.socket;
        if (!socket || !socket.connected) {
            console.error('❌ Socket not connected');
            return;
        }
        
        // Emit raise action with total bet amount (server will handle the raise logic)
        socket.emit('playerAction', {
            roomId: roomId,
            playerIndex: this.localPlayerIndex,
            action: 'raise',
            amount: totalBetAmount // Send total bet amount, not just the raise increment
        });
        
        this.hideBettingControls();
    }
    
    allIn() {
        const roomId = this.getRoomId();
        if (!roomId) {
            console.error('❌ No roomId available for allIn');
            return;
        }
        
        if (this.localPlayerIndex === undefined || this.localPlayerIndex === null) {
            console.error('❌ No localPlayerIndex available for allIn');
            return;
        }
        
        const localPlayer = this.game.players[this.localPlayerIndex];
        if (!localPlayer) {
            console.error('❌ Local player not found');
            return;
        }
        
        // All-in amount = current bet + remaining chips (total bet amount)
        const allInAmount = (localPlayer.currentBet || 0) + localPlayer.chips;
        console.log('🎴 Player all-in:', allInAmount, '(currentBet:', localPlayer.currentBet, '+ chips:', localPlayer.chips, ')');
        
        const socket = window.gameFramework?.socket;
        if (!socket || !socket.connected) {
            console.error('❌ Socket not connected');
            return;
        }
        
        socket.emit('playerAction', {
            roomId: roomId,
            playerIndex: this.localPlayerIndex,
            action: 'raise',
            amount: allInAmount
        });
        
        this.hideBettingControls();
        this.addHistoryEntry(`${localPlayer.name || 'You'} went ALL IN with $${localPlayer.chips}`, 'player-action');
    }

    // Add entry to history log
    addHistoryEntry(message, type = 'default') {
        if (!this.historyLog) {
            this.historyLog = [];
        }
        
        const timestamp = new Date().toLocaleTimeString();
        const entry = {
            message: message,
            type: type,
            timestamp: timestamp
        };
        
        this.historyLog.push(entry);
        
        // Keep only last 50 entries
        if (this.historyLog.length > 50) {
            this.historyLog.shift();
        }
        
        // Update UI
        this.updateHistoryLog();
    }
    
    // Update history log display
    updateHistoryLog() {
        const historyLogContent = document.getElementById('historyLogContent');
        if (!historyLogContent) return;
        
        if (!this.historyLog || this.historyLog.length === 0) {
            historyLogContent.innerHTML = '<div style="color: #888; font-style: italic;">No history yet...</div>';
            return;
        }
        
        // Display in reverse order (newest first)
        const reversedHistory = [...this.historyLog].reverse();
        historyLogContent.innerHTML = reversedHistory.map(entry => {
            const className = `history-entry ${entry.type}`;
            return `<div class="${className}"><strong>${entry.timestamp}</strong>: ${entry.message}</div>`;
        }).join('');
    }

    updateBetAmount() {
        const betAmount = parseInt(document.getElementById('betAmount').value) || 0;
        const minRaise = this.game.currentBet * 2;
        const maxBet = this.game.players[0]?.chips || 0;
        
        // Update button states based on bet amount
        const callBtn = document.getElementById('callBtn');
        const raiseBtn = document.getElementById('raiseBtn');
        
        if (callBtn && this.localPlayerIndex !== undefined) {
            const localPlayer = this.game.players[this.localPlayerIndex];
            if (localPlayer) {
                const callAmount = this.game.currentBet - (localPlayer.currentBet || 0);
                callBtn.textContent = callAmount > 0 ? `✅ Call $${callAmount}` : '✅ Check';
            }
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
            // Initially disable if we don't have enough players yet
            // Will be updated when playerJoined/playersUpdated events fire
            startGameBtn.disabled = true;
            startGameBtn.style.opacity = '0.5';
            startGameBtn.style.cursor = 'not-allowed';
            console.log('SUCCESS: Start Game button shown (disabled until 2+ players)');
        }
        
        // Hide Back to Main Menu and Poker Menu buttons during room creation (they'll be shown when game starts)
        const gameMenuBtn = document.getElementById('gameMenuBtn');
        if (gameMenuBtn) {
            gameMenuBtn.style.display = 'none';
        }
        
        const backToMainMenuBtn = document.getElementById('backToMainMenuBtn');
        if (backToMainMenuBtn) {
            backToMainMenuBtn.style.display = 'none';
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

    // Clean up game buttons
    cleanupGameButtons() {
        const backToMainMenuBtn = document.getElementById('backToMainMenuBtnGame');
        const gameMenuBtn = document.getElementById('gameMenuBtnGame');
        if (backToMainMenuBtn) {
            backToMainMenuBtn.remove();
            console.log('🎴 Removed Back to Main Menu button');
        }
        if (gameMenuBtn) {
            gameMenuBtn.remove();
            console.log('🎴 Removed Poker Menu button');
        }
    }
    
    // Reset client state
    reset() {
        console.log('Resetting Poker client state...');
        this.localPlayerIndex = 0;
        this.isMyTurn = false;
        this.canAct = false;
        this.game = new PokerGame();
        this.cleanupGameButtons();
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
    // Calculate positions first, then draw (order matters!)
    drawBetIndicators(); // Calculates and stores all positions (blind, bet, chip), then draws bet indicators
    drawChipIndicators(); // Uses positions from drawBetIndicators, draws chip indicators
    drawBlindIndicators(); // Uses positions from drawBetIndicators, draws blind indicators
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
        
        // Adjust top-middle player (index 0) to be higher - move further from center
        let adjustedRadiusY = radiusY;
        if (index === 0 || Math.abs(angle + HALF_PI) < 0.1) {
            // Top-middle position - increase radius to move player higher
            adjustedRadiusY = radiusY * 1.15; // Move 15% higher
        }
        
        const y = centerY + sin(angle) * adjustedRadiusY;
        
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
        
        // Draw player status indicator (folded/active) - background overlay
        if (player.isFolded) {
            fill(100, 100, 100, 200);
            stroke(150, 150, 150);
            strokeWeight(2);
            rect(x - 85, y - 55, 170, 120, 10);
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
        
        // Draw FOLDED text below chip value (if folded) to avoid overlap
        if (player.isFolded) {
            textAlign(CENTER, CENTER);
            textSize(18);
            textStyle(BOLD);
            fill(150, 150, 150);
            noStroke();
            text('FOLDED', x, y + 18); // Position below chip value
        }
        
        // Current bet is now shown as a visual indicator on the table (see drawBetIndicators)
        
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
        if (!player.isFolded) {
            // Get local player index - check multiple sources
            const localPlayerIndex = window.pokerClient?.localPlayerIndex;
            const isLocalPlayer = index === localPlayerIndex;
            
            // Check if it's showdown phase - be more strict
            const gamePhase = window.game?.gamePhase || '';
            const isShowdown = gamePhase.toLowerCase() === 'showdown' || (window.game.winners && window.game.winners.length > 0);
            
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
            
            // For opponents, always show 2 card backs (even if hand is empty/hidden)
            // For local player, show actual cards if available
            let cardsToShow = [];
            if (isLocalPlayer && player.hand && player.hand.length > 0) {
                cardsToShow = player.hand;
            } else if (!isLocalPlayer) {
                // Opponent - show 2 card backs (create placeholder cards if needed)
                if (player.hand && player.hand.length > 0 && isShowdown) {
                    cardsToShow = player.hand; // Show actual cards at showdown
                } else {
                    // Show 2 card backs for opponents (always show, even if hand is empty or not dealt yet)
                    // Create card objects with proper structure for CardRenderer
                    cardsToShow = [
                        { name: 'back', suit: null, rank: null },
                        { name: 'back', suit: null, rank: null }
                    ];
                }
            }
            
            if (cardsToShow.length > 0) {
                const cardY = y + 50; // Position cards further below player info
                drawPlayerCards(x, cardY, cardsToShow, shouldShowCardImages);
            }
        }
    });
}

function drawPlayerCards(x, y, hand, shouldShowCardImages) {
    // Safety check: ensure hand is valid array
    if (!hand || !Array.isArray(hand) || hand.length === 0) {
        return; // Don't draw anything if hand is invalid
    }
    
    const cardWidth = 60;   // Smaller cards for better layout
    const cardHeight = 84;  // Maintain aspect ratio
    const spacing = 8;      // Tighter spacing
    
    hand.forEach((card, index) => {
        // Safety check: ensure card is valid
        if (!card) {
            return; // Skip invalid cards
        }
        
        const cardX = x - (hand.length - 1) * (cardWidth + spacing) / 2 + index * (cardWidth + spacing);
        const cardY = y;
        
        // Add subtle floating animation for player cards
        const time = millis() * 0.001;
        const floatOffset = sin(time + index * 0.3) * 1;
        const finalY = cardY + floatOffset;
        
        // STRICT: Only use the passed flag - don't check card.isRevealed
        // The caller is responsible for determining visibility (local player or showdown)
        CardRenderer.drawCard(cardX, finalY, cardWidth, cardHeight, card, shouldShowCardImages, {
            shadowOffset: 4,
            shadowOpacity: 120,
            borderWidth: 2,
            cornerRadius: 8,
            highlight: false
        });
    });
}

function drawPot() {
    // Pot position: center when no community cards, move left when community cards appear
    const hasCommunityCards = window.game && window.game.communityCards && window.game.communityCards.length > 0;
    
    // Calculate how far left to move based on community card width
    let potOffsetX = 0;
    if (hasCommunityCards) {
        const cardWidth = 80;
        const spacing = 20;
        const numCards = window.game.communityCards.length;
        const totalCardWidth = (numCards * cardWidth) + ((numCards - 1) * spacing);
        const potWidth = 130; // Pot ellipse width
        // Move pot to the left of the cards with some padding
        potOffsetX = -(totalCardWidth / 2 + potWidth / 2 + 40); // 40px padding
    }
    
    const centerX = width/2 + potOffsetX;
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
    
    // Enhanced game info box with more details
    const infoWidth = 240;
    const infoHeight = window.game && window.game.players ? 140 : 80;
    const infoX = 15;
    const infoY = 15;
    
    // Background with better styling
    fill(0, 0, 0, 180);
    stroke(255, 215, 0); // Gold border
    strokeWeight(2);
    rect(infoX, infoY, infoWidth, infoHeight, 10);
    
    textAlign(LEFT, TOP);
    textSize(14);
    textStyle(BOLD);
    
    let yOffset = infoY + 20;
    
    // Phase
    fill(255, 255, 255);
    noStroke();
    text('Phase: ' + (window.game?.gamePhase || 'waiting'), infoX + 15, yOffset);
    yOffset += 20;
    
    // Current bet
    if (window.game && window.game.currentBet > 0) {
        fill(255, 215, 0); // Gold
        text('Current Bet: $' + window.game.currentBet, infoX + 15, yOffset);
        yOffset += 20;
    }
    
    // Total players
    if (window.game && window.game.players && window.game.players.length > 0) {
        fill(200, 200, 255);
        text('Players: ' + window.game.players.length, infoX + 15, yOffset);
        yOffset += 20;
    } else {
        // Show 0 players if game exists but no players
        fill(200, 200, 255);
        text('Players: 0', infoX + 15, yOffset);
        yOffset += 20;
    }
    
    // Local player chips
    if (window.game && window.game.players && window.pokerClient && window.pokerClient.localPlayerIndex !== undefined) {
        const localPlayer = window.game.players[window.pokerClient.localPlayerIndex];
        if (localPlayer) {
            fill(100, 255, 100);
            text('Your Chips: $' + localPlayer.chips, infoX + 15, yOffset);
            yOffset += 20;
            
            // Current bet for local player
            if (localPlayer.currentBet > 0) {
                fill(255, 200, 100);
                text('Your Bet: $' + localPlayer.currentBet, infoX + 15, yOffset);
                yOffset += 20;
            }
        }
    }
    
    // Pot amount
    if (window.game && window.game.pot > 0) {
        fill(255, 215, 0);
        text('Pot: $' + window.game.pot, infoX + 15, yOffset);
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

function drawChipIndicators() {
    // Draw chip indicators for each player showing their total bet amount (not chips)
    if (!window.game || !window.game.players || window.game.players.length < 2) {
        return;
    }
    
    const centerX = width/2;
    const centerY = height/2;
    const playerRadiusX = width * 0.35;
    const playerRadiusY = height * 0.28;
    
    // Table dimensions for boundary checking
    const tableWidth = width * 0.75;
    const tableHeight = height * 0.55;
    const tableRadiusX = tableWidth / 2 - 50;
    const tableRadiusY = tableHeight / 2 - 40;
    
    // Player box dimensions
    const playerBoxWidth = 180;
    const playerBoxHeight = 130;
    const playerBoxOffsetX = playerBoxWidth / 2;
    const playerBoxOffsetY = playerBoxHeight / 2;
    const cardOffsetY = 50;
    
    // Get dealer position and blind positions
    const dealerPosition = window.game.dealerPosition !== undefined ? window.game.dealerPosition : 0;
    const smallBlindPos = (dealerPosition + 1) % window.game.players.length;
    const bigBlindPos = (dealerPosition + 2) % window.game.players.length;
    
    // Calculate blind and bet indicator positions to avoid overlap
    const blindIndicatorPositions = new Map();
    const betIndicatorPositions = new Map();
    
    // First pass: Calculate blind indicator positions
    window.game.players.forEach((player, index) => {
        if (!player || player.isFolded) return;
        
        const angle = (TWO_PI / window.game.players.length) * index - HALF_PI;
        const playerX = centerX + cos(angle) * playerRadiusX;
        const playerY = centerY + sin(angle) * playerRadiusY;
        
        const absCosAngle = Math.abs(cos(angle));
        const absSinAngle = Math.abs(sin(angle));
        const sinAngle = sin(angle);
        const isTopPlayer = sinAngle < -0.5;
        
        let blindIndicatorX, blindIndicatorY;
        
        if (isTopPlayer) {
            const cardY = playerY + 50;
            const cardWidth = 60;
            const cardSpacing = 8;
            const cardsTotalWidth = (cardWidth * 2) + cardSpacing;
            const cardRightEdge = playerX + (cardsTotalWidth / 2);
            blindIndicatorX = cardRightEdge + 35;
            blindIndicatorY = cardY + 42;
        } else {
            let indicatorRadiusX, indicatorRadiusY;
            if (absCosAngle > absSinAngle) {
                indicatorRadiusX = playerRadiusX * 0.75;
                indicatorRadiusY = playerRadiusY * 0.75;
            } else {
                indicatorRadiusX = playerRadiusX * 0.5;
                indicatorRadiusY = playerRadiusY * 0.5;
            }
            blindIndicatorX = centerX + cos(angle) * indicatorRadiusX;
            blindIndicatorY = centerY + sin(angle) * indicatorRadiusY;
        }
        
        const hasBlindIndicator = (index === dealerPosition || index === smallBlindPos || index === bigBlindPos) && window.game.gamePhase;
        if (hasBlindIndicator) {
            blindIndicatorPositions.set(index, { x: blindIndicatorX, y: blindIndicatorY });
        }
        
        // Calculate bet indicator position if player has a bet
        if (player.currentBet > 0) {
            let betIndicatorX, betIndicatorY;
            
            if (isTopPlayer) {
                const cardY = playerY + 50;
                const cardWidth = 60;
                const cardSpacing = 8;
                const cardsTotalWidth = (cardWidth * 2) + cardSpacing;
                const cardLeftEdge = playerX - (cardsTotalWidth / 2);
                betIndicatorX = cardLeftEdge - 35;
                betIndicatorY = cardY + 42;
            } else {
                betIndicatorX = playerX;
                betIndicatorY = playerY + 80;
            }
            
            betIndicatorPositions.set(index, { x: betIndicatorX, y: betIndicatorY });
        }
    });
    
    // Second pass: Draw chip indicators (showing total bet, not chips)
    // Use positions calculated in drawBetIndicators() to avoid overlap
    // Get chip indicator positions from a global storage (set by drawBetIndicators)
    const chipPositionsFromBet = window.chipIndicatorPositions || new Map();
    
    window.game.players.forEach((player, index) => {
        // Show chips if player has bet something in previous rounds (excluding current bet)
        // Chips = totalBet - currentBet (amount bet in previous rounds, not current round)
        // If player has currentBet > 0, don't show chips (they'll show BET instead)
        // Only show chips if (totalBet - currentBet) > 0
        const chipsAmountDisplay = (player.totalBet || 0) - (player.currentBet || 0);
        if (!player || player.isFolded || chipsAmountDisplay <= 0) return;
        
        const angle = (TWO_PI / window.game.players.length) * index - HALF_PI;
        const playerX = centerX + cos(angle) * playerRadiusX;
        const playerY = centerY + sin(angle) * playerRadiusY;
        
        const absCosAngle = Math.abs(cos(angle));
        const absSinAngle = Math.abs(sin(angle));
        const sinAngle = sin(angle);
        const isTopPlayer = sinAngle < -0.5;
        
        // Get existing indicator positions from global storage (set by drawBetIndicators)
        const blindPos = window.blindIndicatorPositions?.get(index) || blindIndicatorPositions.get(index);
        const betPos = window.betIndicatorPositions?.get(index) || betIndicatorPositions.get(index);
        
        // Use position from drawBetIndicators if available, otherwise calculate
        let chipIndicatorX, chipIndicatorY;
        if (chipPositionsFromBet.has(index)) {
            const pos = chipPositionsFromBet.get(index);
            chipIndicatorX = pos.x;
            chipIndicatorY = pos.y;
        } else {
            // Fallback calculation - place chip indicator well below bet indicator
            if (isTopPlayer) {
                const cardY = playerY + 50;
                const cardWidth = 60;
                const cardSpacing = 8;
                const cardsTotalWidth = (cardWidth * 2) + cardSpacing;
                const cardLeftEdge = playerX - (cardsTotalWidth / 2);
                chipIndicatorX = cardLeftEdge - 35;
                chipIndicatorY = cardY + 42 + 80; // Well below bet indicator
            } else {
                chipIndicatorX = playerX;
                chipIndicatorY = playerY + 130; // Well below bet indicator (which is at playerY + 80)
            }
        }
        
        // Additional safety check: ensure chip indicator is far enough from bet indicator
        if (betPos) {
            const isSidePlayer = absCosAngle > absSinAngle;
            const minDistance = isSidePlayer ? 100 : 80; // Even larger for side players
            const distanceX = chipIndicatorX - betPos.x;
            const distanceY = chipIndicatorY - betPos.y;
            const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
            
            if (distance < minDistance) {
                // Force chip indicator to be below bet indicator with minimum spacing
                if (isSidePlayer) {
                    // For side players, ensure both horizontal and vertical separation
                    const horizontalSep = Math.abs(distanceX);
                    const verticalSep = Math.abs(distanceY);
                    
                    if (horizontalSep < 50) {
                        // Need more horizontal separation
                        const horizontalOffset = minDistance - horizontalSep + 30;
                        if (distanceX > 0) {
                            chipIndicatorX = betPos.x + horizontalOffset;
                        } else {
                            chipIndicatorX = betPos.x - horizontalOffset;
                        }
                    }
                    
                    if (verticalSep < 50) {
                        // Need more vertical separation - chip should be below bet
                        chipIndicatorY = betPos.y + minDistance;
                    }
                } else if (!isTopPlayer) {
                    // Bottom player - just ensure vertical separation
                    chipIndicatorY = betPos.y + minDistance;
                } else {
                    // For top player, move further left
                    const cardY = playerY + 50;
                    const cardWidth = 60;
                    const cardSpacing = 8;
                    const cardsTotalWidth = (cardWidth * 2) + cardSpacing;
                    const cardLeftEdge = playerX - (cardsTotalWidth / 2);
                    chipIndicatorX = cardLeftEdge - 35 - (minDistance - distanceX);
                    chipIndicatorY = cardY + 42 + minDistance;
                }
            }
        }
        
        // Final check and adjustment against blind indicators (already handled in loop above, but double-check)
        if (blindPos) {
            const isSidePlayer = absCosAngle > absSinAngle;
            const minDistanceFromBlind = isSidePlayer ? 120 : 90; // Define the minimum distance
            const dx = chipIndicatorX - blindPos.x;
            const dy = chipIndicatorY - blindPos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < minDistanceFromBlind) {
                const angleAway = atan2(chipIndicatorY - blindPos.y, chipIndicatorX - blindPos.x);
                chipIndicatorX = blindPos.x + cos(angleAway) * minDistanceFromBlind;
                chipIndicatorY = blindPos.y + sin(angleAway) * minDistanceFromBlind;
            }
        }
        
        // Ensure indicator is inside the INNER table circle
        const innerTableRadiusX = tableRadiusX * 0.85;
        const innerTableRadiusY = tableRadiusY * 0.85;
        const dx = (chipIndicatorX - centerX) / innerTableRadiusX;
        const dy = (chipIndicatorY - centerY) / innerTableRadiusY;
        const isInsideTable = (dx * dx + dy * dy) <= 1;
        
        if (!isInsideTable) {
            const angleToCenter = atan2(chipIndicatorY - centerY, chipIndicatorX - centerX);
            chipIndicatorX = centerX + cos(angleToCenter) * (innerTableRadiusX - 40);
            chipIndicatorY = centerY + sin(angleToCenter) * (innerTableRadiusY - 40);
        }
        
        push();
        
        // Draw chip indicator circle (green color for chips)
        const chipColor = [100, 200, 100]; // Green color for chips
        fill(chipColor[0], chipColor[1], chipColor[2]);
        stroke(255, 255, 255);
        strokeWeight(2);
        ellipse(chipIndicatorX, chipIndicatorY, 28, 28);
        
        // Draw "CHIPS" text (shows total bet amount, not current chip count)
        fill(0, 0, 0);
        textAlign(CENTER, CENTER);
        textSize(8);
        textStyle(BOLD);
        noStroke();
        text('CHIPS', chipIndicatorX, chipIndicatorY - 6);
        
        // Draw chips amount below (totalBet - currentBet, i.e., amount from previous rounds)
        const chipsAmountValue = (player.totalBet || 0) - (player.currentBet || 0);
        textSize(9);
        fill(255, 255, 255);
        text('$' + chipsAmountValue, chipIndicatorX, chipIndicatorY + 28);
        
        pop();
    });
}

function drawBetIndicators() {
    // Draw bet indicators for each player showing their current bet amount
    if (!window.game || !window.game.players || window.game.players.length < 2) {
        return;
    }
    
    const centerX = width/2;
    const centerY = height/2;
    const playerRadiusX = width * 0.35;
    const playerRadiusY = height * 0.28;
    
    // Table dimensions for boundary checking
    const tableWidth = width * 0.75;
    const tableHeight = height * 0.55;
    const tableRadiusX = tableWidth / 2 - 50;
    const tableRadiusY = tableHeight / 2 - 40;
    
    // Player box dimensions
    const playerBoxWidth = 180;
    const playerBoxHeight = 130;
    const playerBoxOffsetX = playerBoxWidth / 2;
    const playerBoxOffsetY = playerBoxHeight / 2;
    const cardOffsetY = 50;
    
    // Get dealer position and blind positions
    const dealerPosition = window.game.dealerPosition !== undefined ? window.game.dealerPosition : 0;
    const smallBlindPos = (dealerPosition + 1) % window.game.players.length;
    const bigBlindPos = (dealerPosition + 2) % window.game.players.length;
    
    // First pass: Calculate blind indicator positions to avoid overlap with bet indicators
    const blindIndicatorPositions = new Map(); // Store blind indicator positions by player index
    
    window.game.players.forEach((player, index) => {
        if (!player || player.isFolded) return;
        
        const angle = (TWO_PI / window.game.players.length) * index - HALF_PI;
        const playerX = centerX + cos(angle) * playerRadiusX;
        const playerY = centerY + sin(angle) * playerRadiusY;
        
        const absCosAngle = Math.abs(cos(angle));
        const absSinAngle = Math.abs(sin(angle));
        const sinAngle = sin(angle);
        const isTopPlayer = sinAngle < -0.5;
        
        let blindIndicatorX, blindIndicatorY;
        
        if (isTopPlayer) {
            // Top player - blind indicators are to the RIGHT of cards
            const cardY = playerY + 50;
            const cardWidth = 60;
            const cardSpacing = 8;
            const cardsTotalWidth = (cardWidth * 2) + cardSpacing;
            const cardRightEdge = playerX + (cardsTotalWidth / 2);
            blindIndicatorX = cardRightEdge + 35;
            blindIndicatorY = cardY + 42;
        } else {
            // For other players, calculate blind indicator position
            let indicatorRadiusX, indicatorRadiusY;
            if (absCosAngle > absSinAngle) {
                indicatorRadiusX = playerRadiusX * 0.75;
                indicatorRadiusY = playerRadiusY * 0.75;
            } else {
                indicatorRadiusX = playerRadiusX * 0.5;
                indicatorRadiusY = playerRadiusY * 0.5;
            }
            blindIndicatorX = centerX + cos(angle) * indicatorRadiusX;
            blindIndicatorY = centerY + sin(angle) * indicatorRadiusY;
        }
        
        // Store blind indicator position if this player has one
        const hasBlindIndicator = (index === dealerPosition || index === smallBlindPos || index === bigBlindPos) && window.game.gamePhase;
        if (hasBlindIndicator) {
            blindIndicatorPositions.set(index, { x: blindIndicatorX, y: blindIndicatorY });
        }
    });
    
    // Calculate bet indicator positions first (for overlap checking)
    const betIndicatorPositions = new Map();
    window.game.players.forEach((player, index) => {
        if (!player || player.isFolded || player.currentBet === 0) return;
        
        const angle = (TWO_PI / window.game.players.length) * index - HALF_PI;
        const playerX = centerX + cos(angle) * playerRadiusX;
        const playerY = centerY + sin(angle) * playerRadiusY;
        
        const absCosAngle = Math.abs(cos(angle));
        const absSinAngle = Math.abs(sin(angle));
        const sinAngle = sin(angle);
        const isTopPlayer = sinAngle < -0.5;
        
        let betIndicatorX, betIndicatorY;
        if (isTopPlayer) {
            const cardY = playerY + 50;
            const cardWidth = 60;
            const cardSpacing = 8;
            const cardsTotalWidth = (cardWidth * 2) + cardSpacing;
            const cardLeftEdge = playerX - (cardsTotalWidth / 2);
            betIndicatorX = cardLeftEdge - 35;
            betIndicatorY = cardY + 42;
        } else {
            betIndicatorX = playerX;
            betIndicatorY = playerY + 80;
        }
        
        betIndicatorPositions.set(index, { x: betIndicatorX, y: betIndicatorY });
    });
    
    // Second pass: Calculate chip indicator positions to avoid overlap
    const chipIndicatorPositions = new Map();
    
    // Helper function to check if a position conflicts with any existing indicator
    const checkPositionConflict = (x, y, existingPositions, minDist) => {
        for (const [playerIdx, pos] of existingPositions.entries()) {
            const dx = x - pos.x;
            const dy = y - pos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < minDist) {
                return true; // Conflict detected
            }
        }
        return false; // No conflict
    };
    
    window.game.players.forEach((player, index) => {
        // Only calculate chip positions for players who have chips (totalBet - currentBet > 0)
        const chipsAmountCalc = (player.totalBet || 0) - (player.currentBet || 0);
        if (!player || player.isFolded || chipsAmountCalc <= 0) return;
        
        const angle = (TWO_PI / window.game.players.length) * index - HALF_PI;
        const playerX = centerX + cos(angle) * playerRadiusX;
        const playerY = centerY + sin(angle) * playerRadiusY;
        
        const absCosAngle = Math.abs(cos(angle));
        const absSinAngle = Math.abs(sin(angle));
        const sinAngle = sin(angle);
        const isTopPlayer = sinAngle < -0.5;
        const isBottomPlayer = sinAngle > 0.5;
        const isSidePlayer = absCosAngle > absSinAngle;
        
        const blindPos = blindIndicatorPositions.get(index);
        const betPos = betIndicatorPositions.get(index);
        
        // Check if player also has a current bet (both CHIPS and BET should show)
        const hasCurrentBet = player.currentBet > 0;
        
        // Define minDistanceFromBlind in outer scope so it's available in conflict resolution loop
        const minDistanceFromBlind = isSidePlayer ? 120 : 90;
        
        let chipIndicatorX, chipIndicatorY;
        
        // If player has both chips and current bet, position them appropriately
        if (hasCurrentBet && betPos) {
            // For top/bottom players: side by side horizontally (same Y, different X)
            // For side players: vertical stacking (same X, different Y)
            const indicatorSpacing = 40; // Space between buttons (40px)
            
            if (isTopPlayer) {
                // Top player: BET on left, CHIPS on right (side by side at same height)
                // Use bet position Y exactly, and position chips to the right
                chipIndicatorX = betPos.x + indicatorSpacing;
                chipIndicatorY = betPos.y; // EXACTLY same height as BET
            } else if (isSidePlayer) {
                // Side players: vertical stacking (same X, different Y)
                // Order: Blind (if exists, top) -> Chips (middle) -> Bet (bottom)
                // Use same X position as bet, but different Y (vertical stacking)
                chipIndicatorX = betPos.x; // Same X position (same width)
                
                // Position chips with proper vertical spacing
                // If blind exists, stack: Blind (top) -> Chips (middle) -> Bet (bottom)
                // If no blind, stack: Chips (top) -> Bet (bottom)
                const minVerticalSpacing = 60; // Minimum vertical spacing to prevent overlap
                
                if (blindPos) {
                    // Blind exists - position chips below blind, above bet
                    // Blind is at blindPos.y (top)
                    // Position chips below blind with spacing
                    chipIndicatorY = blindPos.y + minVerticalSpacing;
                    // Bet will be positioned below chips (bet positioning uses chipPos.y + minVerticalSpacing)
                } else {
                    // No blind - position chips above bet
                    // Ensure chips is positioned above bet with proper spacing
                    chipIndicatorY = betPos.y - minVerticalSpacing; // Above bet
                }
                
                // Ensure bet is positioned correctly below chips (this will be handled in drawBetIndicators)
                // Store chip position so bet can reference it
            } else if (isBottomPlayer) {
                // Bottom player: side by side horizontally (same Y, different X)
                // BET on left, CHIPS on right
                chipIndicatorX = betPos.x + indicatorSpacing;
                chipIndicatorY = betPos.y; // Same height as BET
            } else {
                // Other players (left side): CHIPS on left, BET on right (side by side)
                const isLeftSidePlayer = cos(angle) < 0;
                if (isLeftSidePlayer) {
                    chipIndicatorX = betPos.x - indicatorSpacing;
                    chipIndicatorY = betPos.y; // Same height as BET
                } else {
                    chipIndicatorX = betPos.x + indicatorSpacing;
                    chipIndicatorY = betPos.y; // Same height as BET
                }
            }
            
            // Ensure we don't overlap with blind indicators
            if (blindPos) {
                const dx = chipIndicatorX - blindPos.x;
                const dy = chipIndicatorY - blindPos.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < minDistanceFromBlind) {
                    // If chip would overlap blind, move it further away
                    const extraOffset = minDistanceFromBlind - distance + 20;
                    if (isLeftSidePlayer) {
                        chipIndicatorX = blindPos.x - minDistanceFromBlind - extraOffset;
                    } else {
                        chipIndicatorX = blindPos.x + minDistanceFromBlind + extraOffset;
                    }
                }
            }
        } else {
            // No current bet - position chips normally (below or separate)
            
            if (isTopPlayer) {
                // Top player: position chips button between player cards and community cards
                const cardY = playerY + 50;
                const cardWidth = 60;
                const cardSpacing = 8;
                const cardsTotalWidth = (cardWidth * 2) + cardSpacing;
                const cardLeftEdge = playerX - (cardsTotalWidth / 2);
                const cardRightEdge = playerX + (cardsTotalWidth / 2);
                
                // Position chips button between player cards and community cards
                let chipXBase;
                const chipYBase = cardY + 42 + 60; // Position slightly closer to cards (was +70)
                
                if (window.game.communityCards && window.game.communityCards.length > 0) {
                    const centerX = width/2;
                    const centerY = height/2;
                    const communityCardWidth = 80;
                    const communityCardHeight = 112;
                    const communitySpacing = 20;
                    const totalCommunityWidth = (window.game.communityCards.length - 1) * (communityCardWidth + communitySpacing);
                    const communityStartX = centerX - totalCommunityWidth / 2;
                    
                    // Position chips button at the midpoint between player cards and community cards
                    const midpointX = (cardRightEdge + communityStartX) / 2;
                    chipXBase = midpointX;
                } else {
                    // No community cards - position closer to player cards
                    chipXBase = cardLeftEdge - 50;
                }
                
                chipIndicatorX = chipXBase;
                chipIndicatorY = chipYBase;
            } else if (isSidePlayer) {
                // Side players: buttons at same width (X) but different heights (vertical layout)
                // Position chips button directly below or above blind indicator
                if (blindPos) {
                    // Same X position as blind, but different Y (vertical stacking)
                    chipIndicatorX = blindPos.x;
                    // Position chips button directly below blind indicator with more spacing
                    // Increased spacing to prevent buttons from being too close
                    chipIndicatorY = blindPos.y + 70; // Increased vertical spacing (was 50, now 70)
                } else {
                    // No blind - position relative to player
                    const isRightSide = cos(angle) > 0;
                    chipIndicatorX = playerX + (isRightSide ? -60 : 60);
                    chipIndicatorY = playerY + 120;
                }
            } else {
                // Bottom player: position side by side with blind indicator if it exists
                // Check if this player has a blind indicator
                if (blindPos) {
                    // For bottom players, always position chips to the RIGHT of the blind button
                    // Bottom players: BB button on left, CHIPS button on right (side by side)
                    const spacing = 15; // Very close spacing between blind and chips buttons
                    
                    // Always position chips to the right of blind (blind is typically on left for bottom players)
                    chipIndicatorX = blindPos.x + spacing;
                    // Same Y level as blind indicator (horizontal layout for top/bottom players)
                    chipIndicatorY = blindPos.y;
                } else {
                    // No blind indicator - position directly below player
                    chipIndicatorX = playerX;
                    chipIndicatorY = playerY + 150; // Much further below bet indicator
                }
            }
        }
        
        // Aggressive conflict resolution with multiple attempts
        let attempts = 0;
        const maxAttempts = 30;
        while (attempts < maxAttempts) {
            let hasConflict = false;
            
            // Check against blind indicators
            // Skip conflict check for bottom players when positioning chips next to blind (intentional side-by-side)
            if (blindPos && !isBottomPlayer) {
                const dx = chipIndicatorX - blindPos.x;
                const dy = chipIndicatorY - blindPos.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < minDistanceFromBlind) {
                    hasConflict = true;
                    // Move significantly away from blind indicator
                    const angleAway = atan2(chipIndicatorY - blindPos.y, chipIndicatorX - blindPos.x);
                    const extraDistance = minDistanceFromBlind - distance + 20; // Extra buffer
                    chipIndicatorX = blindPos.x + cos(angleAway) * (minDistanceFromBlind + extraDistance);
                    chipIndicatorY = blindPos.y + sin(angleAway) * (minDistanceFromBlind + extraDistance);
                }
            } else if (blindPos && isBottomPlayer) {
                // For bottom player, ensure chips stay at same Y level and close to blind (to the RIGHT)
                // Only check if chips drifted too far away (more than 30px horizontally)
                const dx = chipIndicatorX - blindPos.x;
                const dy = chipIndicatorY - blindPos.y;
                const horizontalDistance = Math.abs(dx);
                const verticalDistance = Math.abs(dy);
                
                // If chips drifted too far horizontally or vertically, snap them back
                // For bottom players, chips should always be to the RIGHT of blind (positive dx)
                if (horizontalDistance > 30 || verticalDistance > 5 || dx < 0) {
                    const spacing = 15;
                    // Always position chips to the right of blind for bottom players
                    chipIndicatorX = blindPos.x + spacing;
                    chipIndicatorY = blindPos.y; // Ensure same Y level
                }
            }
            
            // Check against bet indicators (from first pass)
            // If we're positioning chips next to bet (same height), skip this check
            // Otherwise, ensure proper separation
            if (betPos && !hasCurrentBet) {
                const dx = chipIndicatorX - betPos.x;
                const dy = chipIndicatorY - betPos.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < minDistanceFromBet) {
                    hasConflict = true;
                    // Move significantly away from bet indicator
                    const angleAway = atan2(chipIndicatorY - betPos.y, chipIndicatorX - betPos.x);
                    const extraDistance = minDistanceFromBet - distance + 20; // Extra buffer
                    chipIndicatorX = betPos.x + cos(angleAway) * (minDistanceFromBet + extraDistance);
                    chipIndicatorY = betPos.y + sin(angleAway) * (minDistanceFromBet + extraDistance);
                }
            }
            
            // Check against all other chip indicators already placed
            if (checkPositionConflict(chipIndicatorX, chipIndicatorY, chipIndicatorPositions, 80)) {
                hasConflict = true;
                // For bottom players with blind, try to maintain position relative to blind
                if (isBottomPlayer && blindPos) {
                    // Try to find a position that's still close to blind but doesn't conflict
                    const spacing = 15;
                    chipIndicatorX = blindPos.x + spacing;
                    chipIndicatorY = blindPos.y;
                    // Try small adjustments
                    const adjustment = (attempts % 3) * 5; // 0, 5, or 10px adjustment
                    chipIndicatorX = blindPos.x + spacing + adjustment;
                } else {
                    // Move in a spiral pattern to find a new position
                    const spiralAngle = (attempts * PI / 6);
                    const spiralRadius = 50 + (attempts * 15);
                    chipIndicatorX = playerX + cos(spiralAngle) * spiralRadius;
                    chipIndicatorY = playerY + 150 + sin(spiralAngle) * spiralRadius;
                }
            }
            
            if (!hasConflict) {
                break; // Found a good position
            }
            
            attempts++;
        }
        
        // Final aggressive check against blind indicators
        // Skip this check for bottom players - they should stay close to blind
        if (blindPos && !isBottomPlayer) {
            const dx = chipIndicatorX - blindPos.x;
            const dy = chipIndicatorY - blindPos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < minDistanceFromBlind) {
                const angleAway = atan2(chipIndicatorY - blindPos.y, chipIndicatorX - blindPos.x);
                const extraBuffer = minDistanceFromBlind - distance + 30;
                chipIndicatorX = blindPos.x + cos(angleAway) * (minDistanceFromBlind + extraBuffer);
                chipIndicatorY = blindPos.y + sin(angleAway) * (minDistanceFromBlind + extraBuffer);
            }
        } else if (blindPos && isBottomPlayer) {
            // For bottom players, ensure chips stay to the right of blind at same Y level
            const dx = chipIndicatorX - blindPos.x;
            const dy = chipIndicatorY - blindPos.y;
            if (dx < 0 || Math.abs(dx) > 30 || Math.abs(dy) > 5) {
                // Reset to correct position
                chipIndicatorX = blindPos.x + 15;
                chipIndicatorY = blindPos.y;
            }
        }
        
        // Final aggressive check against bet indicators (only if not positioning next to bet)
        if (betPos && !hasCurrentBet) {
            const dx = chipIndicatorX - betPos.x;
            const dy = chipIndicatorY - betPos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < minDistanceFromBet) {
                const angleAway = atan2(chipIndicatorY - betPos.y, chipIndicatorX - betPos.x);
                const extraBuffer = minDistanceFromBet - distance + 30;
                chipIndicatorX = betPos.x + cos(angleAway) * (minDistanceFromBet + extraBuffer);
                chipIndicatorY = betPos.y + sin(angleAway) * (minDistanceFromBet + extraBuffer);
            }
        }
        
        // Ensure indicator is inside the INNER table circle
        const innerTableRadiusX = tableRadiusX * 0.85;
        const innerTableRadiusY = tableRadiusY * 0.85;
        const dx = (chipIndicatorX - centerX) / innerTableRadiusX;
        const dy = (chipIndicatorY - centerY) / innerTableRadiusY;
        const isInsideTable = (dx * dx + dy * dy) <= 1;
        
        if (!isInsideTable) {
            const angleToCenter = atan2(chipIndicatorY - centerY, chipIndicatorX - centerX);
            chipIndicatorX = centerX + cos(angleToCenter) * (innerTableRadiusX - 40);
            chipIndicatorY = centerY + sin(angleToCenter) * (innerTableRadiusY - 40);
        }
        
        chipIndicatorPositions.set(index, { x: chipIndicatorX, y: chipIndicatorY });
    });
    
    // Store chip, bet, and blind positions globally so other functions can use them
    window.chipIndicatorPositions = chipIndicatorPositions;
    window.betIndicatorPositions = betIndicatorPositions;
    window.blindIndicatorPositions = blindIndicatorPositions;
    
    // Third pass: Draw bet indicators, avoiding both blind and chip indicator positions
    window.game.players.forEach((player, index) => {
        if (!player || player.isFolded || player.currentBet === 0) return; // Only show if player has a bet
        
        const angle = (TWO_PI / window.game.players.length) * index - HALF_PI;
        const playerX = centerX + cos(angle) * playerRadiusX;
        const playerY = centerY + sin(angle) * playerRadiusY;
        
        // Calculate position similar to blind indicators
        const absCosAngle = Math.abs(cos(angle));
        const absSinAngle = Math.abs(sin(angle));
        const sinAngle = sin(angle);
        const isTopPlayer = sinAngle < -0.5;
        
        let indicatorRadiusX, indicatorRadiusY;
        if (absCosAngle > absSinAngle) {
            // Left or right side
            indicatorRadiusX = playerRadiusX * 0.75;
            indicatorRadiusY = playerRadiusY * 0.75;
        } else if (isTopPlayer) {
            // Top position - position to the left of cards (opposite side from blind indicators)
            indicatorRadiusX = playerRadiusX * 0.85;
            indicatorRadiusY = playerRadiusY * 0.85;
        } else {
            // Bottom position
            indicatorRadiusX = playerRadiusX * 0.5;
            indicatorRadiusY = playerRadiusY * 0.5;
        }
        
        let indicatorX = centerX + cos(angle) * indicatorRadiusX;
        let indicatorY = centerY + sin(angle) * indicatorRadiusY;
        
        // Calculate indicator position - ensure it doesn't overlap player box and stays inside table
        let finalIndicatorX = indicatorX;
        let finalIndicatorY = indicatorY;
        
        // Player box boundaries
        const playerBoxLeft = playerX - playerBoxOffsetX;
        const playerBoxRight = playerX + playerBoxOffsetX;
        const playerBoxTop = playerY - playerBoxOffsetY;
        const playerBoxBottom = playerY + playerBoxOffsetY;
        const cardBottom = playerY + cardOffsetY + 84; // Card height is 84
        
        // Indicator size (radius)
        const indicatorSize = 28;
        const textHeight = 20; // Space for text below indicator
        const indicatorTotalHeight = indicatorSize + textHeight;
        
        // Check if this player has blind indicators and chip indicators, get their positions
        const blindPos = blindIndicatorPositions.get(index);
        const chipPos = chipIndicatorPositions.get(index);
        
        if (isTopPlayer) {
            // Top player - position to the LEFT of cards (opposite from blind indicators on right)
            const cardY = playerY + 50;
            const cardWidth = 60;
            const cardSpacing = 8;
            const cardsTotalWidth = (cardWidth * 2) + cardSpacing;
            const cardLeftEdge = playerX - (cardsTotalWidth / 2);
            finalIndicatorX = cardLeftEdge - 35; // Position 35px to the left of cards
            finalIndicatorY = cardY + 42; // Center vertically with cards
            
            // If there are blind indicators on the right, ensure bet indicator is far enough left
            if (blindPos) {
                const minDistance = 60; // Minimum distance between bet and blind indicators
                const distanceX = Math.abs(finalIndicatorX - blindPos.x);
                if (distanceX < minDistance) {
                    // Move bet indicator further left
                    finalIndicatorX = cardLeftEdge - (minDistance - distanceX + 35);
                }
            }
            
            // If there are chip indicators, position bet and chips side by side at same height
            if (chipPos) {
                // For top player, when both chips and bet exist, position them side by side
                // BET should be on the left, CHIPS on the right, at the same Y level
                const indicatorSpacing = 40; // Space between buttons (40px)
                
                // Use the chip's Y position as reference to ensure they're at same height
                finalIndicatorY = chipPos.y; // EXACTLY same height as CHIPS
                
                // Position bet to the left of chips
                finalIndicatorX = chipPos.x - indicatorSpacing;
            }
        } else {
            // For other players, position between player box and cards, but ensure no overlap
            const isSidePlayer = absCosAngle > absSinAngle;
            
            if (isSidePlayer) {
                // Side players: buttons at same width (X) but different heights (vertical layout)
                // Position bet button at same X as blind/chips, but different Y
                const blindPosForBet = blindIndicatorPositions.get(index);
                const chipPosForBet = chipIndicatorPositions.get(index);
                
                if (blindPosForBet || chipPosForBet) {
                    // Use same X position as blind or chips
                    const referenceX = blindPosForBet ? blindPosForBet.x : chipPosForBet.x;
                    finalIndicatorX = referenceX;
                    
                    // Position bet button below chips (or blind if no chips)
                    // Ensure proper vertical spacing to prevent overlap
                    const referenceY = chipPosForBet ? chipPosForBet.y : blindPosForBet.y;
                    const minVerticalSpacing = 60; // Minimum vertical spacing to prevent overlap
                    finalIndicatorY = referenceY + minVerticalSpacing; // Increased vertical spacing
                } else {
                    // No blind or chips - position relative to player
                    const isRightSide = cos(angle) > 0;
                    finalIndicatorX = playerX + (isRightSide ? -60 : 60);
                    finalIndicatorY = playerY + 80;
                }
            } else {
                // Bottom player: position side by side with blind and chips at same height
                // Get blind and chip positions to align bet button with them
                const blindPosForBet = blindIndicatorPositions.get(index);
                const chipPosForBet = chipIndicatorPositions.get(index);
                
                if (blindPosForBet || chipPosForBet) {
                    // Use the same Y level as blind or chip indicator
                    const referenceY = blindPosForBet ? blindPosForBet.y : chipPosForBet.y;
                    finalIndicatorY = referenceY;
                    
                    // Position bet button side by side with existing indicators
                    // Determine order: blind (if exists), then chips (if exists), then bet
                    let currentX;
                    if (blindPosForBet && chipPosForBet) {
                        // Both blind and chips exist - position bet to the right of chips
                        const blindIsLeft = blindPosForBet.x < chipPosForBet.x;
                        if (blindIsLeft) {
                            // Blind on left, chips on right, bet goes further right (same height)
                            currentX = chipPosForBet.x;
                            finalIndicatorX = currentX + 15; // Close horizontal spacing
                        } else {
                            // Chips on left, blind on right, bet goes to left of chips (same height)
                            currentX = chipPosForBet.x;
                            finalIndicatorX = currentX - 15; // Close horizontal spacing
                        }
                    } else if (blindPosForBet) {
                        // Only blind exists - position bet to the right of blind (same height)
                        finalIndicatorX = blindPosForBet.x + 15; // Close horizontal spacing
                    } else if (chipPosForBet) {
                        // Only chips exists - position bet to the right of chips (same height)
                        finalIndicatorX = chipPosForBet.x + 15; // Close horizontal spacing
                    } else {
                        // Fallback
                        finalIndicatorX = playerX;
                        finalIndicatorY = playerY + 80;
                    }
                } else {
                    // No blind or chips - position directly below player box
                    finalIndicatorX = playerX;
                    finalIndicatorY = playerY + 80; // Position between player box and cards
                }
            }
            
            // Check if indicator would overlap player box
            const indicatorLeft = finalIndicatorX - indicatorSize / 2;
            const indicatorRight = finalIndicatorX + indicatorSize / 2;
            const indicatorTop = finalIndicatorY - indicatorSize / 2;
            const indicatorBottom = finalIndicatorY + indicatorTotalHeight / 2;
            
            const overlapsBox = !(indicatorRight < playerBoxLeft || 
                                 indicatorLeft > playerBoxRight || 
                                 indicatorBottom < playerBoxTop || 
                                 indicatorTop > playerBoxBottom);
            
            if (overlapsBox) {
                // Move indicator further from player box
                const angleToPlayer = atan2(playerY - centerY, playerX - centerX);
                // Move indicator closer to center (away from player)
                finalIndicatorX = centerX + cos(angleToPlayer) * (playerRadiusX * 0.3);
                finalIndicatorY = centerY + sin(angleToPlayer) * (playerRadiusY * 0.3);
            }
            
                   // Check if bet indicator overlaps with blind indicator - AGGRESSIVE CHECK
                   if (blindPos) {
                       // Use MUCH larger minimum distance for side players
                       const minDistance = isSidePlayer ? 150 : 95; // Even larger distance for side players
                       const distanceX = finalIndicatorX - blindPos.x;
                       const distanceY = finalIndicatorY - blindPos.y;
                       const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
                       
                       if (distance < minDistance) {
                           // Force bet indicator to opposite side from blind with large separation
                           if (isSidePlayer) {
                               // For side players, ensure bet is on opposite side with massive separation
                               const isRightSide = cos(angle) > 0;
                               const blindIsOnLeft = blindPos.x < playerX;
                               
                               if (blindIsOnLeft) {
                                   // Blind on left, force bet to right with very large offset
                                   finalIndicatorX = blindPos.x + minDistance + 60;
                               } else {
                                   // Blind on right, force bet to left with very large offset
                                   finalIndicatorX = blindPos.x - minDistance - 60;
                               }
                               
                               // Also ensure vertical separation
                               if (Math.abs(distanceY) < 50) {
                                   finalIndicatorY = blindPos.y + (distanceY >= 0 ? minDistance : -minDistance);
                               }
                           } else {
                               // For non-side players, use angle-based movement with larger distance
                               const angleAway = atan2(finalIndicatorY - blindPos.y, finalIndicatorX - blindPos.x);
                               const angleToPlayer = atan2(playerY - centerY, playerX - centerX);
                               const angleDiff = Math.abs(angleAway - angleToPlayer);
                               
                               let adjustedAngle = angleAway;
                               if (angleDiff < PI / 4 || angleDiff > 7 * PI / 4) {
                                   // Too close to player direction, move perpendicular
                                   adjustedAngle = angleToPlayer + PI / 2;
                               }
                               
                               finalIndicatorX = blindPos.x + cos(adjustedAngle) * (minDistance + 10);
                               finalIndicatorY = blindPos.y + sin(adjustedAngle) * (minDistance + 10);
                           }
                       }
                   }
                   
                   // Check if bet indicator overlaps with chip indicator - AGGRESSIVE CHECK
                   if (chipPos) {
                       // Use MUCH larger minimum distance for side players
                       const minDistance = isSidePlayer ? 160 : 110; // Even larger distance for side players
                       const distanceX = finalIndicatorX - chipPos.x;
                       const distanceY = finalIndicatorY - chipPos.y;
                       const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
                       
                       if (distance < minDistance) {
                           // Force bet indicator away from chip indicator with large separation
                           if (isSidePlayer) {
                               // For side players, ensure horizontal AND vertical separation with massive gaps
                               const horizontalSep = Math.abs(distanceX);
                               const verticalSep = Math.abs(distanceY);
                               
                               if (horizontalSep < 90) {
                                   // Too close horizontally - move bet indicator much further horizontally
                                   const horizontalOffset = minDistance - horizontalSep + 60;
                                   if (distanceX > 0) {
                                       finalIndicatorX = chipPos.x + horizontalOffset;
                                   } else {
                                       finalIndicatorX = chipPos.x - horizontalOffset;
                                   }
                               }
                               
                               if (verticalSep < 90) {
                                   // Too close vertically - move bet indicator much further vertically
                                   if (chipPos.y > finalIndicatorY) {
                                       // Chip is below bet - move bet indicator up with extra space
                                       finalIndicatorY = chipPos.y - (minDistance + 30);
                                   } else {
                                       // Chip is above bet - move bet indicator down with extra space
                                       finalIndicatorY = chipPos.y + (minDistance + 30);
                                   }
                               }
                           } else {
                               // For non-side players, move bet indicator up (toward player) to avoid chip indicator below
                               if (chipPos.y > finalIndicatorY) {
                                   // Chip is below bet - move bet indicator up with extra space
                                   finalIndicatorY = chipPos.y - (minDistance + 10);
                               } else {
                                   // Chip is above or to side - use angle-based movement
                                   const angleAway = atan2(finalIndicatorY - chipPos.y, finalIndicatorX - chipPos.x);
                                   const angleToPlayer = atan2(playerY - centerY, playerX - centerX);
                                   const angleDiff = Math.abs(angleAway - angleToPlayer);
                                   
                                   let adjustedAngle = angleAway;
                                   if (angleDiff < PI / 4 || angleDiff > 7 * PI / 4) {
                                       // Too close to player direction, move perpendicular
                                       adjustedAngle = angleToPlayer + PI / 2;
                                   }
                                   
                                   finalIndicatorX = chipPos.x + cos(adjustedAngle) * (minDistance + 10);
                                   finalIndicatorY = chipPos.y + sin(adjustedAngle) * (minDistance + 10);
                               }
                           }
                       }
                   }
        }
        
        // Ensure indicator is inside the INNER table circle (not the outer rim)
        // Use a smaller radius to ensure it stays well inside
        const innerTableRadiusX = tableRadiusX * 0.85; // 85% of table radius = well inside
        const innerTableRadiusY = tableRadiusY * 0.85;
        const dx = (finalIndicatorX - centerX) / innerTableRadiusX;
        const dy = (finalIndicatorY - centerY) / innerTableRadiusY;
        const isInsideTable = (dx * dx + dy * dy) <= 1;
        
        if (!isInsideTable) {
            // Move indicator toward center to keep it well inside table
            const angleToCenter = atan2(finalIndicatorY - centerY, finalIndicatorX - centerX);
            finalIndicatorX = centerX + cos(angleToCenter) * (innerTableRadiusX - 40);
            finalIndicatorY = centerY + sin(angleToCenter) * (innerTableRadiusY - 40);
        }
        
        push();
        
        // Draw bet indicator circle (similar to blind indicators but different color)
        const betColor = [255, 200, 100]; // Orange/gold color for bets
        fill(betColor[0], betColor[1], betColor[2]);
        stroke(255, 255, 255);
        strokeWeight(2);
        ellipse(finalIndicatorX, finalIndicatorY, 28, 28);
        
        // Draw "BET" text
        fill(0, 0, 0);
        textAlign(CENTER, CENTER);
        textSize(9);
        textStyle(BOLD);
        noStroke();
        text('BET', finalIndicatorX, finalIndicatorY - 5);
        
        // Draw bet amount below
        textSize(9);
        fill(255, 255, 255);
        text('$' + player.currentBet, finalIndicatorX, finalIndicatorY + 28);
        
        pop();
    });
}

function drawBlindIndicators() {
    // ALWAYS draw blind indicators if game exists and has players
    if (!window.game || !window.game.players || window.game.players.length < 2) {
        console.log('🎴 drawBlindIndicators: Skipping - game not ready');
        return;
    }
    
    // Debug: Check if gamePhase is set
    if (!window.game.gamePhase) {
        console.log('🎴 drawBlindIndicators: WARNING - gamePhase not set:', window.game.gamePhase);
    }
    
    const centerX = width/2;
    const centerY = height/2;
    const playerRadiusX = width * 0.35;  // Player position radius
    const playerRadiusY = height * 0.28;
    
    // Table dimensions for boundary checking
    const tableWidth = width * 0.75;
    const tableHeight = height * 0.55;
    const tableRadiusX = tableWidth / 2 - 50; // Inner table radius (accounting for rim)
    const tableRadiusY = tableHeight / 2 - 40;
    
    // Player box dimensions (from drawPlayers function)
    const playerBoxWidth = 180;
    const playerBoxHeight = 130;
    const playerBoxOffsetX = playerBoxWidth / 2; // 90px
    const playerBoxOffsetY = playerBoxHeight / 2; // 65px
    const cardOffsetY = 50; // Cards are 50px below player box
    
    // Get dealer position - default to 0 if not set
    const dealerPosition = window.game.dealerPosition !== undefined ? window.game.dealerPosition : 0;
    const smallBlindPos = (dealerPosition + 1) % window.game.players.length;
    const bigBlindPos = (dealerPosition + 2) % window.game.players.length;
    
    // Get blind amounts
    const smallBlindAmount = window.game.smallBlind || 10;
    const bigBlindAmount = window.game.bigBlind || 20;
    
    // Indicator size
    const indicatorRadius = 15; // Radius of indicator circle
    const textOffsetY = 28; // Increased distance below indicator for amount text (was 20)
    
    window.game.players.forEach((player, index) => {
        if (!player || player.isFolded) return; // Skip folded players
        
        const angle = (TWO_PI / window.game.players.length) * index - HALF_PI;
        const playerX = centerX + cos(angle) * playerRadiusX;
        const playerY = centerY + sin(angle) * playerRadiusY;
        
        // Calculate indicator position - closer to player boxes, especially for left/right and top positions
        // For left/right positions (angle near 0 or PI), position closer to player box
        // For top position, position much closer to player box (just below cards, not near center)
        // For bottom position, position between player and center
        const absCosAngle = Math.abs(cos(angle));
        const absSinAngle = Math.abs(sin(angle));
        const sinAngle = sin(angle); // Negative for top, positive for bottom
        
        // If player is on left or right side (horizontal position), position indicator closer
        let indicatorRadiusX, indicatorRadiusY;
        let isTopPlayer = false;
        if (absCosAngle > absSinAngle) {
            // Left or right side - position much closer to player box
            indicatorRadiusX = playerRadiusX * 0.75; // 75% of player radius = closer to player
            indicatorRadiusY = playerRadiusY * 0.75;
        } else if (sinAngle < -0.5) {
            // Top position (angle near -PI/2) - position indicators to the RIGHT of cards
            isTopPlayer = true;
            indicatorRadiusX = playerRadiusX * 0.85; // 85% of player radius = very close to player
            indicatorRadiusY = playerRadiusY * 0.85;
        } else {
            // Bottom position - position between player and center
            indicatorRadiusX = playerRadiusX * 0.5; // 50% of player radius
            indicatorRadiusY = playerRadiusY * 0.5;
        }
        
        let indicatorX = centerX + cos(angle) * indicatorRadiusX;
        let indicatorY = centerY + sin(angle) * indicatorRadiusY;
        
        // For top player, position indicators to the RIGHT of their cards
        let finalIndicatorX = indicatorX;
        let finalIndicatorY = indicatorY;
        
        if (isTopPlayer) {
            // Cards are at playerX (center of cards), playerY + 50
            // From drawPlayerCards: cardWidth = 60, spacing = 8
            // Two cards side by side: total width = (60 * 2) + 8 = 128px
            // Cards are centered at playerX, so:
            // - Left edge = playerX - 64
            // - Right edge = playerX + 64
            const cardY = playerY + 50; // Cards are positioned here
            const cardWidth = 60; // Card width from drawPlayerCards
            const cardSpacing = 8; // Spacing from drawPlayerCards
            const cardsTotalWidth = (cardWidth * 2) + cardSpacing; // 128px total width
            const cardRightEdge = playerX + (cardsTotalWidth / 2); // Right edge of cards = playerX + 64
            finalIndicatorX = cardRightEdge + 35; // Position 35px to the right of cards
            finalIndicatorY = cardY + 42; // Position at middle of cards (card height is 84, so middle is 42)
            
            // For top player, check for overlap with chips/bet indicators
            // Get chip and bet positions from global storage (set by drawBetIndicators)
            const chipPos = window.chipIndicatorPositions?.get(index);
            const betPos = window.betIndicatorPositions?.get(index);
            
            // Check overlap with chip indicator
            if (chipPos) {
                const dx = finalIndicatorX - chipPos.x;
                const dy = finalIndicatorY - chipPos.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const minDistance = 60; // Minimum distance from chip indicator
                if (distance < minDistance) {
                    // Move blind indicator further right to avoid chip
                    finalIndicatorX = chipPos.x + minDistance + 20;
                }
            }
            
            // Check overlap with bet indicator
            if (betPos) {
                const dx = finalIndicatorX - betPos.x;
                const dy = finalIndicatorY - betPos.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const minDistance = 60; // Minimum distance from bet indicator
                if (distance < minDistance) {
                    // Move blind indicator further right to avoid bet
                    finalIndicatorX = betPos.x + minDistance + 20;
                }
            }
        } else {
            // For other players, check for overlaps and table boundaries
            // First check for overlap with chips/bet indicators
            const chipPos = window.chipIndicatorPositions?.get(index);
            const betPos = window.betIndicatorPositions?.get(index);
            
            // Check overlap with chip indicator
            if (chipPos) {
                const dx = indicatorX - chipPos.x;
                const dy = indicatorY - chipPos.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const minDistance = 60; // Minimum distance from chip indicator
                if (distance < minDistance) {
                    // Move blind indicator away from chip
                    const angleAway = atan2(indicatorY - chipPos.y, indicatorX - chipPos.x);
                    indicatorX = chipPos.x + cos(angleAway) * (minDistance + 20);
                    indicatorY = chipPos.y + sin(angleAway) * (minDistance + 20);
                }
            }
            
            // Check overlap with bet indicator
            if (betPos) {
                const dx = indicatorX - betPos.x;
                const dy = indicatorY - betPos.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const minDistance = 60; // Minimum distance from bet indicator
                if (distance < minDistance) {
                    // Move blind indicator away from bet
                    const angleAway = atan2(indicatorY - betPos.y, indicatorX - betPos.x);
                    indicatorX = betPos.x + cos(angleAway) * (minDistance + 20);
                    indicatorY = betPos.y + sin(angleAway) * (minDistance + 20);
                }
            }
            
            // Ensure indicator doesn't overlap with player box
            // Player box extends from (playerX - 90, playerY - 65) to (playerX + 90, playerY + 65)
            // Cards are at playerY + 50 to playerY + 134
            const playerBoxLeft = playerX - playerBoxOffsetX;
            const playerBoxRight = playerX + playerBoxOffsetX;
            const playerBoxTop = playerY - playerBoxOffsetY;
            const playerBoxBottom = playerY + playerBoxOffsetY + cardOffsetY + 84; // Card height is 84
            
            // Check if indicator overlaps with player box
            const indicatorLeft = indicatorX - indicatorRadius;
            const indicatorRight = indicatorX + indicatorRadius;
            const indicatorTop = indicatorY - indicatorRadius;
            const indicatorBottom = indicatorY + indicatorRadius + textOffsetY;
            
            const overlapsBox = !(indicatorRight < playerBoxLeft || 
                                 indicatorLeft > playerBoxRight || 
                                 indicatorBottom < playerBoxTop || 
                                 indicatorTop > playerBoxBottom);
            
            if (overlapsBox) {
                // Move indicator further toward center to avoid overlap
                const adjustedRadiusX = playerRadiusX * 0.25; // Even closer to center
                const adjustedRadiusY = playerRadiusY * 0.25;
                finalIndicatorX = centerX + cos(angle) * adjustedRadiusX;
                finalIndicatorY = centerY + sin(angle) * adjustedRadiusY;
            }
            
            // Ensure indicator is inside table ellipse
            const dx = (finalIndicatorX - centerX) / tableRadiusX;
            const dy = (finalIndicatorY - centerY) / tableRadiusY;
            const isInsideTable = (dx * dx + dy * dy) <= 1;
            
            if (!isInsideTable) {
                // Move indicator toward center to keep it inside
                const angleToCenter = atan2(finalIndicatorY - centerY, finalIndicatorX - centerX);
                finalIndicatorX = centerX + cos(angleToCenter) * (tableRadiusX - 30);
                finalIndicatorY = centerY + sin(angleToCenter) * (tableRadiusY - 30);
            }
        }
        
        push();
        
        // For top player, stack indicators vertically if multiple indicators
        let indicatorOffsetY = 0;
        const indicatorSpacing = 50; // Space between stacked indicators
        const indicatorsToDraw = [];
        
        // Check which indicators this player has
        // D button stays visible all the time (as long as game exists)
        // SB and BB only show during active game phases
        const hasActiveGamePhase = window.game.gamePhase && window.game.gamePhase !== '';
        
        // D button always shows (as long as game exists)
        if (index === dealerPosition) {
            indicatorsToDraw.push({ type: 'D', color: [255, 215, 0], size: 30, text: 'D', amount: null });
        }
        // SB and BB only show during active phases
        if (index === smallBlindPos && hasActiveGamePhase) {
            indicatorsToDraw.push({ type: 'SB', color: [100, 200, 255], size: 28, text: 'SB', amount: null });
        }
        if (index === bigBlindPos && hasActiveGamePhase) {
            indicatorsToDraw.push({ type: 'BB', color: [255, 100, 100], size: 28, text: 'BB', amount: null });
        }
        
        // For top player, center the stack vertically
        if (isTopPlayer && indicatorsToDraw.length > 0) {
            const totalHeight = (indicatorsToDraw.length - 1) * indicatorSpacing;
            indicatorOffsetY = -totalHeight / 2; // Start from top of stack
        }
        
        // Draw each indicator
        indicatorsToDraw.forEach((indicator, i) => {
            const currentY = isTopPlayer ? (finalIndicatorY + indicatorOffsetY) : finalIndicatorY;
            const currentX = isTopPlayer ? finalIndicatorX : finalIndicatorX;
            
            // Draw indicator circle
            fill(indicator.color[0], indicator.color[1], indicator.color[2]);
            stroke(255, 255, 255);
            strokeWeight(2);
            ellipse(currentX, currentY, indicator.size, indicator.size);
            
            // Draw text
            fill(0, 0, 0);
            textAlign(CENTER, CENTER);
            textSize(indicator.type === 'D' ? 12 : 10);
            textStyle(BOLD);
            noStroke();
            text(indicator.text, currentX, currentY);
            
            // Draw amount if applicable (for SB and BB)
            if (indicator.amount !== null) {
                textSize(9);
                fill(255, 255, 255);
                text('$' + indicator.amount, currentX, currentY + textOffsetY);
            }
            
            // Move to next position for stacking (only for top player)
            if (isTopPlayer) {
                indicatorOffsetY += indicatorSpacing;
            }
        });
        
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