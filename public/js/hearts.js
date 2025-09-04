// ♥️ HEARTS GAME LOGIC

class HeartsGame {
    constructor() {
        this.deck = [];
        this.players = [];
        this.currentPlayer = 0;
        this.gamePhase = 'passing'; // passing, playing, scoring
        this.roundNumber = 1;
        this.handNumber = 1;
        this.trick = [];
        this.trickLeader = 0;
        this.heartsBroken = false;
        this.scores = [];
        this.passDirection = 'left'; // left, right, across, none
        this.cardsToPass = [];
        this.gameOver = false;
    }

    // Initialize the game
    initialize(players) {
        this.players = players.map((player, index) => ({
            ...player,
            hand: [],
            score: 0,
            roundScore: 0,
            position: index
        }));
        
        this.deck = CardUtils.createStandardDeck();
        this.scores = this.players.map(p => ({ name: p.name, totalScore: 0, roundScores: [] }));
        this.gamePhase = 'passing';
        this.roundNumber = 1;
        this.handNumber = 1;
        this.gameOver = false;
        
        console.log('♥️ Hearts game initialized with', this.players.length, 'players');
        this.startNewHand();
    }

    // Start a new hand
    startNewHand() {
        console.log(`🎯 Starting hand ${this.handNumber} of round ${this.roundNumber}`);
        
        // Reset hand state
        this.players.forEach(player => {
            player.hand = [];
            player.roundScore = 0;
        });
        
        this.trick = [];
        this.trickLeader = 0;
        this.heartsBroken = false;
        this.cardsToPass = [];
        
        // Determine pass direction
        if (this.handNumber % 4 === 1) {
            this.passDirection = 'left';
        } else if (this.handNumber % 4 === 2) {
            this.passDirection = 'right';
        } else if (this.handNumber % 4 === 3) {
            this.passDirection = 'across';
        } else {
            this.passDirection = 'none';
        }
        
        // Deal cards
        this.dealCards();
        
        // Start passing phase
        if (this.passDirection !== 'none') {
            this.gamePhase = 'passing';
            this.emitEvent('passingPhase', {
                direction: this.passDirection,
                players: this.players.map(p => ({ name: p.name, hand: p.hand }))
            });
        } else {
            this.gamePhase = 'playing';
            this.startPlayingPhase();
        }
    }

    // Deal cards to all players
    dealCards() {
        this.deck = CardUtils.shuffleDeck(this.deck);
        
        // Deal 13 cards to each player
        for (let i = 0; i < 13; i++) {
            for (let player of this.players) {
                player.hand.push(this.deck.pop());
            }
        }
        
        // Sort hands
        this.players.forEach(player => {
            player.hand.sort((a, b) => {
                const suitOrder = { 'clubs': 0, 'diamonds': 1, 'spades': 2, 'hearts': 3 };
                if (suitOrder[a.suit] !== suitOrder[b.suit]) {
                    return suitOrder[a.suit] - suitOrder[b.suit];
                }
                return b.value - a.value;
            });
        });
        
        console.log('🃏 Cards dealt to all players');
    }

    // Player selects cards to pass
    selectCardsToPass(playerIndex, cardIndices) {
        const player = this.players[playerIndex];
        if (!player || this.gamePhase !== 'passing' || cardIndices.length !== 3) {
            return false;
        }
        
        // Validate card indices
        if (cardIndices.some(i => i < 0 || i >= player.hand.length)) {
            return false;
        }
        
        // Store cards to pass
        player.cardsToPass = cardIndices.map(i => player.hand[i]);
        
        console.log(`🎯 Player ${player.name} selected cards to pass`);
        
        // Check if all players have selected
        const allPlayersSelected = this.players.every(p => p.cardsToPass && p.cardsToPass.length === 3);
        if (allPlayersSelected) {
            this.executePassing();
        }
        
        return true;
    }

    // Execute the passing of cards
    executePassing() {
        console.log(`🎯 Executing ${this.passDirection} pass`);
        
        // Determine target players
        const targets = [];
        for (let i = 0; i < this.players.length; i++) {
            let targetIndex;
            switch (this.passDirection) {
                case 'left':
                    targetIndex = (i + 1) % this.players.length;
                    break;
                case 'right':
                    targetIndex = (i - 1 + this.players.length) % this.players.length;
                    break;
                case 'across':
                    targetIndex = (i + 2) % this.players.length;
                    break;
            }
            targets.push(targetIndex);
        }
        
        // Pass cards
        for (let i = 0; i < this.players.length; i++) {
            const sourcePlayer = this.players[i];
            const targetPlayer = this.players[targets[i]];
            
            // Remove cards from source player
            const cardsToPass = sourcePlayer.cardsToPass;
            sourcePlayer.hand = sourcePlayer.hand.filter(card => !cardsToPass.includes(card));
            
            // Add cards to target player
            targetPlayer.hand.push(...cardsToPass);
            
            // Sort target player's hand
            targetPlayer.hand.sort((a, b) => {
                const suitOrder = { 'clubs': 0, 'diamonds': 1, 'spades': 2, 'hearts': 3 };
                if (suitOrder[a.suit] !== suitOrder[b.suit]) {
                    return suitOrder[a.suit] - suitOrder[b.suit];
                }
                return b.value - a.value;
            });
        }
        
        // Clear cards to pass
        this.players.forEach(player => {
            delete player.cardsToPass;
        });
        
        this.emitEvent('cardsPassed', {
            direction: this.passDirection,
            players: this.players.map(p => ({ name: p.name, hand: p.hand }))
        });
        
        // Start playing phase
        setTimeout(() => {
            this.startPlayingPhase();
        }, 1000);
    }

    // Start the playing phase
    startPlayingPhase() {
        console.log('🎯 Starting playing phase');
        this.gamePhase = 'playing';
        this.trick = [];
        this.trickLeader = 0;
        this.currentPlayer = 0;
        
        // Find player with 2 of clubs to start
        for (let i = 0; i < this.players.length; i++) {
            if (this.players[i].hand.some(card => card.rank === '2' && card.suit === 'clubs')) {
                this.currentPlayer = i;
                break;
            }
        }
        
        this.emitEvent('playingPhase', {
            currentPlayer: this.currentPlayer,
            players: this.players.map(p => ({ name: p.name, hand: p.hand }))
        });
    }

    // Player plays a card
    playCard(playerIndex, cardIndex) {
        const player = this.players[playerIndex];
        if (!player || this.currentPlayer !== playerIndex || this.gamePhase !== 'playing') {
            return false;
        }
        
        if (cardIndex < 0 || cardIndex >= player.hand.length) {
            return false;
        }
        
        const card = player.hand[cardIndex];
        
        // Validate card play
        if (!this.isValidCardPlay(player, card)) {
            return false;
        }
        
        // Remove card from hand
        player.hand.splice(cardIndex, 1);
        
        // Add to trick
        this.trick.push({
            card: card,
            player: playerIndex,
            playerName: player.name
        });
        
        console.log(`🃏 Player ${player.name} plays ${card.name}`);
        
        // Check if hearts broken
        if (card.suit === 'hearts') {
            this.heartsBroken = true;
        }
        
        // Move to next player
        this.currentPlayer = (this.currentPlayer + 1) % this.players.length;
        
        this.emitEvent('cardPlayed', {
            playerIndex: playerIndex,
            card: card,
            trick: this.trick,
            currentPlayer: this.currentPlayer,
            heartsBroken: this.heartsBroken
        });
        
        // Check if trick is complete
        if (this.trick.length === 4) {
            setTimeout(() => {
                this.completeTrick();
            }, 1000);
        }
        
        return true;
    }

    // Check if card play is valid
    isValidCardPlay(player, card) {
        // First card of trick
        if (this.trick.length === 0) {
            // Must play 2 of clubs on first trick
            if (this.handNumber === 1 && this.trickLeader === 0) {
                return card.rank === '2' && card.suit === 'clubs';
            }
            // Cannot lead hearts unless hearts broken or only hearts in hand
            if (card.suit === 'hearts' && !this.heartsBroken) {
                const hasNonHearts = player.hand.some(c => c.suit !== 'hearts');
                return !hasNonHearts;
            }
            return true;
        }
        
        // Follow suit
        const leadSuit = this.trick[0].card.suit;
        if (card.suit === leadSuit) {
            return true;
        }
        
        // Cannot play hearts or queen of spades unless following suit
        if (card.suit === 'hearts' || (card.rank === 'queen' && card.suit === 'spades')) {
            const hasLeadSuit = player.hand.some(c => c.suit === leadSuit);
            return !hasLeadSuit;
        }
        
        return true;
    }

    // Complete a trick
    completeTrick() {
        console.log('🏆 Trick complete');
        
        // Determine trick winner
        const leadSuit = this.trick[0].card.suit;
        let winningCard = this.trick[0];
        let winningPlayer = 0;
        
        for (let i = 1; i < this.trick.length; i++) {
            const play = this.trick[i];
            if (play.card.suit === leadSuit && play.card.value > winningCard.card.value) {
                winningCard = play;
                winningPlayer = i;
            }
        }
        
        // Calculate trick points
        let trickPoints = 0;
        this.trick.forEach(play => {
            if (play.card.suit === 'hearts') {
                trickPoints += 1;
            } else if (play.card.rank === 'queen' && play.card.suit === 'spades') {
                trickPoints += 13;
            }
        });
        
        // Award points to winner
        const winner = this.players[winningPlayer];
        winner.roundScore += trickPoints;
        
        console.log(`🏆 ${winner.name} wins trick with ${winningCard.card.name} (${trickPoints} points)`);
        
        this.emitEvent('trickComplete', {
            winner: {
                playerIndex: winningPlayer,
                name: winner.name,
                card: winningCard.card
            },
            trick: this.trick,
            points: trickPoints,
            nextPlayer: winningPlayer
        });
        
        // Check if hand is complete
        if (this.players[0].hand.length === 0) {
            this.completeHand();
        } else {
            // Start next trick
            this.trick = [];
            this.trickLeader = winningPlayer;
            this.currentPlayer = winningPlayer;
            
            setTimeout(() => {
                this.emitEvent('nextTrick', {
                    currentPlayer: this.currentPlayer,
                    players: this.players.map(p => ({ name: p.name, hand: p.hand }))
                });
            }, 1000);
        }
    }

    // Complete a hand
    completeHand() {
        console.log('🏆 Hand complete');
        this.gamePhase = 'scoring';
        
        // Check for shooting the moon
        const moonShooter = this.players.find(p => p.roundScore === 26);
        if (moonShooter) {
            console.log(`🌙 ${moonShooter.name} shot the moon!`);
            this.players.forEach(p => {
                if (p === moonShooter) {
                    p.roundScore = 0;
                } else {
                    p.roundScore = 26;
                }
            });
        }
        
        // Update total scores
        this.players.forEach(player => {
            player.score += player.roundScore;
        });
        
        // Update scores array
        this.scores.forEach((score, index) => {
            score.roundScores.push(this.players[index].roundScore);
            score.totalScore = this.players[index].score;
        });
        
        this.emitEvent('handComplete', {
            roundScores: this.players.map(p => p.roundScore),
            totalScores: this.players.map(p => p.score),
            moonShooter: moonShooter ? moonShooter.name : null
        });
        
        // Check for game over
        if (this.players.some(p => p.score >= 100)) {
            this.endGame();
        } else {
            // Start next hand
            this.handNumber++;
            setTimeout(() => {
                this.startNewHand();
            }, 3000);
        }
    }

    // End the game
    endGame() {
        console.log('🏆 Game over');
        this.gameOver = true;
        
        // Find winner (lowest score)
        const winner = this.players.reduce((min, player) => 
            player.score < min.score ? player : min
        );
        
        this.emitEvent('gameOver', {
            winner: {
                name: winner.name,
                score: winner.score
            },
            finalScores: this.players.map(p => ({ name: p.name, score: p.score }))
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
            roundNumber: this.roundNumber,
            handNumber: this.handNumber,
            trick: this.trick,
            heartsBroken: this.heartsBroken,
            passDirection: this.passDirection,
            scores: this.scores,
            gameOver: this.gameOver
        };
    }
}

// 🎮 HEARTS CLIENT LOGIC
class HeartsClient {
    constructor() {
        this.game = new HeartsGame();
        this.localPlayerIndex = 0;
        this.isMyTurn = false;
        this.canAct = false;
        this.selectedCards = [];
    }

    // Initialize the client
    initialize() {
        console.log('🎮 Initializing Hearts client');
        
        // Initialize game framework
        GameFramework.initialize('hearts');
        
        // Setup UI event listeners
        this.setupUI();
        
        // Setup socket event listeners
        this.setupSocketListeners();
        
        console.log('✅ Hearts client initialized');
    }

    // Setup UI event listeners
    setupUI() {
        // Room controls
        document.getElementById('createRoomBtn').onclick = () => this.createRoom();
        document.getElementById('joinRoomBtn').onclick = () => this.joinRoom();
        document.getElementById('addBotBtn').onclick = () => this.addBot();
        document.getElementById('removeBotBtn').onclick = () => this.removeBot();
        document.getElementById('startGameBtn').onclick = () => this.startGame();
        
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
        
        socket.on('passingPhase', (data) => {
            this.updatePassingPhase(data);
        });
        
        socket.on('cardsPassed', (data) => {
            this.updateCardsPassed(data);
        });
        
        socket.on('playingPhase', (data) => {
            this.updatePlayingPhase(data);
        });
        
        socket.on('cardPlayed', (data) => {
            this.updateCardPlayed(data);
        });
        
        socket.on('trickComplete', (data) => {
            this.updateTrickComplete(data);
        });
        
        socket.on('nextTrick', (data) => {
            this.updateNextTrick(data);
        });
        
        socket.on('handComplete', (data) => {
            this.updateHandComplete(data);
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
            GameFramework.createRoom('hearts');
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
                GameFramework.createRoom('hearts');
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

    // Update passing phase
    updatePassingPhase(data) {
        this.game.gamePhase = 'passing';
        this.game.passDirection = data.direction;
        this.game.players = data.players;
        
        this.updateUI();
        this.showPassDirection();
        
        if (this.localPlayerIndex === 0) { // Assuming player 0 is human
            this.showCardSelection();
        }
    }

    // Update cards passed
    updateCardsPassed(data) {
        this.game.players = data.players;
        this.updateUI();
        this.hidePassDirection();
    }

    // Update playing phase
    updatePlayingPhase(data) {
        this.game.gamePhase = 'playing';
        this.game.currentPlayer = data.currentPlayer;
        this.game.players = data.players;
        
        this.isMyTurn = (data.currentPlayer === this.localPlayerIndex);
        this.updateUI();
    }

    // Update card played
    updateCardPlayed(data) {
        this.game.trick = data.trick;
        this.game.currentPlayer = data.currentPlayer;
        this.game.heartsBroken = data.heartsBroken;
        
        this.isMyTurn = (data.currentPlayer === this.localPlayerIndex);
        this.updateUI();
    }

    // Update trick complete
    updateTrickComplete(data) {
        this.game.trick = [];
        this.game.currentPlayer = data.nextPlayer;
        
        this.isMyTurn = (data.nextPlayer === this.localPlayerIndex);
        this.updateUI();
        
        // Show trick result
        UIUtils.showGameMessage(`${data.winner.name} wins trick with ${data.winner.card.name}`, 'info');
    }

    // Update next trick
    updateNextTrick(data) {
        this.game.currentPlayer = data.currentPlayer;
        this.game.players = data.players;
        
        this.isMyTurn = (data.currentPlayer === this.localPlayerIndex);
        this.updateUI();
    }

    // Update hand complete
    updateHandComplete(data) {
        this.game.handNumber++;
        
        // Update scores
        this.updateScores(data);
        
        if (data.moonShooter) {
            UIUtils.showGameMessage(`${data.moonShooter} shot the moon!`, 'warning');
        }
        
        this.updateUI();
    }

    // Show game over
    showGameOver(data) {
        UIUtils.showGameMessage(`🏆 ${data.winner.name} wins with ${data.winner.score} points!`, 'success');
        this.updateUI();
    }

    // Update UI
    updateUI() {
        this.updateGameInfo();
        this.updateScores();
        this.updateTrickArea();
        this.updatePlayerAreas();
    }

    // Update game info
    updateGameInfo() {
        document.getElementById('roundNumber').textContent = this.game.roundNumber;
        document.getElementById('handNumber').textContent = this.game.handNumber;
        document.getElementById('currentPlayerName').textContent = this.game.players[this.game.currentPlayer]?.name || '-';
        document.getElementById('cardsPlayed').textContent = `${this.game.trick.length}/4`;
    }

    // Update scores
    updateScores(data = null) {
        const scoresBody = document.getElementById('scoresBody');
        scoresBody.innerHTML = '';
        
        const scores = data ? data.finalScores : this.game.scores;
        scores.forEach(score => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${score.name}</td>
                <td>${score.roundScores ? score.roundScores[score.roundScores.length - 1] || 0 : 0}</td>
                <td>${score.totalScore || score.score}</td>
            `;
            scoresBody.appendChild(row);
        });
    }

    // Update trick area
    updateTrickArea() {
        const trickArea = document.getElementById('trickArea');
        trickArea.innerHTML = '';
        
        this.game.trick.forEach(play => {
            const cardDiv = document.createElement('div');
            cardDiv.className = 'trick-card';
            cardDiv.textContent = play.card.name;
            if (play.card.suit === 'hearts') {
                cardDiv.className += ' heart';
            } else if (play.card.suit === 'spades') {
                cardDiv.className += ' spade';
            }
            trickArea.appendChild(cardDiv);
        });
    }

    // Update player areas
    updatePlayerAreas() {
        // This would update the visual representation of players
        // For now, just log the state
        console.log('Players:', this.game.players.map(p => ({
            name: p.name,
            hand: p.hand.length,
            score: p.score,
            roundScore: p.roundScore
        })));
    }

    // Show pass direction
    showPassDirection() {
        const passDirection = document.getElementById('passDirection');
        const passDirectionText = document.getElementById('passDirectionText');
        
        passDirectionText.textContent = this.game.passDirection;
        passDirection.className = `pass-direction ${this.game.passDirection}`;
        passDirection.style.display = 'block';
    }

    // Hide pass direction
    hidePassDirection() {
        document.getElementById('passDirection').style.display = 'none';
    }

    // Show card selection
    showCardSelection() {
        // This would show UI for selecting 3 cards to pass
        console.log('Select 3 cards to pass');
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
        console.log('🔄 Resetting Hearts client state...');
        this.localPlayerIndex = 0;
        this.isMyTurn = false;
        this.canAct = false;
        this.game = new HeartsGame();
        console.log('✅ Hearts client state reset');
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    window.heartsClient = new HeartsClient();
    window.heartsClient.initialize();
});
