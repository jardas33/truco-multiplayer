// ⚔️ WAR GAME LOGIC

class WarGame {
    constructor() {
        this.deck = [];
        this.players = [];
        this.currentPlayer = 0;
        this.gamePhase = 'playing'; // playing, war, finished
        this.roundNumber = 1;
        this.battleNumber = 1;
        this.battleCards = [];
        this.warCards = [];
        this.gameOver = false;
        this.winner = null;
        this.isWar = false;
    }

    // Initialize the game
    initialize(players) {
        this.players = players.map((player, index) => ({
            ...player,
            hand: [],
            position: index
        }));
        
        this.deck = CardUtils.createStandardDeck();
        this.gamePhase = 'playing';
        this.roundNumber = 1;
        this.battleNumber = 1;
        this.battleCards = [];
        this.warCards = [];
        this.gameOver = false;
        this.winner = null;
        this.isWar = false;
        
        console.log('⚔️ War game initialized with', this.players.length, 'players');
        
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
        console.log('🎯 Starting new War game');
        
        // Reset all hands
        this.players.forEach(player => {
            player.hand = [];
        });
        
        this.battleCards = [];
        this.warCards = [];
        this.gameOver = false;
        this.winner = null;
        this.isWar = false;
        
        // Shuffle deck
        this.deck = CardUtils.shuffleDeck(this.deck);
        
        // Deal cards
        this.dealCards();
        
        this.emitEvent('gameStarted', {
            players: this.players.map(p => ({ name: p.name, hand: p.hand })),
            currentPlayer: this.currentPlayer
        });
    }

    // Deal cards to all players
    dealCards() {
        // Deal all cards evenly to players
        let cardIndex = 0;
        while (cardIndex < this.deck.length) {
            for (let player of this.players) {
                if (cardIndex < this.deck.length) {
                    player.hand.push(this.deck[cardIndex]);
                    cardIndex++;
                }
            }
        }
        
        console.log(`🃏 Dealt cards to all players`);
    }

    // Start a battle
    startBattle() {
        if (this.gameOver) return;
        
        console.log(`⚔️ Starting battle ${this.battleNumber}`);
        
        // Each player plays a card
        this.battleCards = [];
        for (let player of this.players) {
            if (player.hand.length > 0) {
                const card = player.hand.shift();
                this.battleCards.push({
                    card: card,
                    player: player,
                    playerIndex: this.players.indexOf(player)
                });
            }
        }
        
        // Check if we have enough cards for battle
        if (this.battleCards.length < 2) {
            this.endGame();
            return;
        }
        
        this.emitEvent('battleStarted', {
            battleCards: this.battleCards,
            battleNumber: this.battleNumber,
            players: this.players.map(p => ({ name: p.name, hand: p.hand }))
        });
        
        // Determine battle result
        setTimeout(() => {
            this.resolveBattle();
        }, 1000);
    }

    // Resolve the battle
    resolveBattle() {
        console.log('🏆 Resolving battle');
        
        // Find highest card
        let highestCard = this.battleCards[0];
        let winners = [this.battleCards[0]];
        
        for (let i = 1; i < this.battleCards.length; i++) {
            const battleCard = this.battleCards[i];
            if (battleCard.card.value > highestCard.card.value) {
                highestCard = battleCard;
                winners = [battleCard];
            } else if (battleCard.card.value === highestCard.card.value) {
                winners.push(battleCard);
            }
        }
        
        // Check for war
        if (winners.length > 1) {
            this.startWar(winners);
        } else {
            this.awardBattle(winners[0]);
        }
    }

    // Start a war
    startWar(warPlayers) {
        console.log('⚔️ WAR!');
        this.isWar = true;
        this.gamePhase = 'war';
        
        // Each player in war plays 3 cards face down, 1 face up
        this.warCards = [];
        const warCardsToPlay = Math.min(3, Math.min(...warPlayers.map(p => p.player.hand.length)));
        
        for (let warPlayer of warPlayers) {
            if (warPlayer.player.hand.length >= warCardsToPlay + 1) {
                // Play face down cards
                for (let i = 0; i < warCardsToPlay; i++) {
                    const card = warPlayer.player.hand.shift();
                    this.warCards.push({
                        card: card,
                        player: warPlayer.player,
                        playerIndex: warPlayer.playerIndex,
                        faceUp: false
                    });
                }
                
                // Play face up card
                const faceUpCard = warPlayer.player.hand.shift();
                this.warCards.push({
                    card: faceUpCard,
                    player: warPlayer.player,
                    playerIndex: warPlayer.playerIndex,
                    faceUp: true
                });
            }
        }
        
        this.emitEvent('warStarted', {
            warCards: this.warCards,
            warPlayers: warPlayers.map(p => p.player.name),
            players: this.players.map(p => ({ name: p.name, hand: p.hand }))
        });
        
        // Resolve war
        setTimeout(() => {
            this.resolveWar();
        }, 2000);
    }

    // Resolve the war
    resolveWar() {
        console.log('🏆 Resolving war');
        
        // Find highest face-up card
        const faceUpCards = this.warCards.filter(wc => wc.faceUp);
        let highestCard = faceUpCards[0];
        let winners = [faceUpCards[0]];
        
        for (let i = 1; i < faceUpCards.length; i++) {
            const warCard = faceUpCards[i];
            if (warCard.card.value > highestCard.card.value) {
                highestCard = warCard;
                winners = [warCard];
            } else if (warCard.card.value === highestCard.card.value) {
                winners.push(warCard);
            }
        }
        
        // Award all cards to winner
        const winner = winners[0];
        const allCards = [...this.battleCards.map(bc => bc.card), ...this.warCards.map(wc => wc.card)];
        
        // Shuffle and add to winner's hand
        const shuffledCards = CardUtils.shuffleDeck(allCards);
        winner.player.hand.push(...shuffledCards);
        
        console.log(`🏆 ${winner.player.name} wins the war and gets ${allCards.length} cards!`);
        
        this.emitEvent('warResolved', {
            winner: {
                name: winner.player.name,
                playerIndex: winner.playerIndex,
                cardsWon: allCards.length
            },
            players: this.players.map(p => ({ name: p.name, hand: p.hand }))
        });
        
        // Reset for next battle
        this.battleCards = [];
        this.warCards = [];
        this.isWar = false;
        this.gamePhase = 'playing';
        this.battleNumber++;
        
        // Check for game over
        if (this.isGameOver()) {
            this.endGame();
        } else {
            setTimeout(() => {
                this.emitEvent('nextBattle', {
                    battleNumber: this.battleNumber,
                    players: this.players.map(p => ({ name: p.name, hand: p.hand }))
                });
            }, 1000);
        }
    }

    // Award battle to winner
    awardBattle(winner) {
        console.log(`🏆 ${winner.player.name} wins the battle!`);
        
        // Award all battle cards to winner
        const allCards = this.battleCards.map(bc => bc.card);
        const shuffledCards = CardUtils.shuffleDeck(allCards);
        winner.player.hand.push(...shuffledCards);
        
        this.emitEvent('battleResolved', {
            winner: {
                name: winner.player.name,
                playerIndex: winner.playerIndex,
                cardsWon: allCards.length
            },
            players: this.players.map(p => ({ name: p.name, hand: p.hand }))
        });
        
        // Reset for next battle
        this.battleCards = [];
        this.battleNumber++;
        
        // Check for game over
        if (this.isGameOver()) {
            this.endGame();
        } else {
            setTimeout(() => {
                this.emitEvent('nextBattle', {
                    battleNumber: this.battleNumber,
                    players: this.players.map(p => ({ name: p.name, hand: p.hand }))
                });
            }, 1000);
        }
    }

    // Check if game is over
    isGameOver() {
        const playersWithCards = this.players.filter(p => p.hand.length > 0);
        return playersWithCards.length <= 1;
    }

    // End the game
    endGame() {
        console.log('🏆 Game over!');
        this.gameOver = true;
        
        // Find winner (player with most cards)
        this.winner = this.players.reduce((max, player) => 
            player.hand.length > max.hand.length ? player : max
        );
        
        this.emitEvent('gameOver', {
            winner: {
                name: this.winner.name,
                cards: this.winner.hand.length
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
            roundNumber: this.roundNumber,
            battleNumber: this.battleNumber,
            battleCards: this.battleCards,
            warCards: this.warCards,
            isWar: this.isWar,
            gameOver: this.gameOver,
            winner: this.winner
        };
    }
}

// 🎮 WAR CLIENT LOGIC
class WarClient {
    constructor() {
        this.game = new WarGame();
        this.localPlayerIndex = 0;
        this.canAct = false;
    }

    // Initialize the client
    initialize() {
        console.log('🎮 Initializing War client');
        
        // Check if dependencies are available
        console.log('🔍 Checking dependencies:');
        console.log('  - GameFramework:', typeof GameFramework);
        console.log('  - CardUtils:', typeof CardUtils);
        console.log('  - UIUtils:', typeof UIUtils);
        console.log('  - window.gameFramework:', typeof window.gameFramework);
        
        // Initialize game framework
        if (typeof GameFramework !== 'undefined') {
            GameFramework.initialize('war');
            console.log('✅ GameFramework initialized');
        } else {
            console.error('❌ GameFramework not available');
        }
        
        // Setup UI event listeners
        this.setupUI();
        
        // Setup socket event listeners
        this.setupSocketListeners();
        
        console.log('✅ War client initialized');
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
        document.getElementById('battleBtn').onclick = () => this.startBattle();
        
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
        
        socket.on('battleStarted', (data) => {
            this.updateBattleStarted(data);
        });
        
        socket.on('battleResolved', (data) => {
            this.updateBattleResolved(data);
        });
        
        socket.on('warStarted', (data) => {
            this.updateWarStarted(data);
        });
        
        socket.on('warResolved', (data) => {
            this.updateWarResolved(data);
        });
        
        socket.on('nextBattle', (data) => {
            this.updateNextBattle(data);
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
            GameFramework.createRoom('war');
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
                GameFramework.createRoom('war');
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

    // Start battle
    startBattle() {
        if (!this.canAct || this.game.gameOver) {
            return;
        }
        
        const socket = window.gameFramework.socket;
        socket.emit('startBattle', {
            roomId: window.gameFramework.roomId,
            playerIndex: this.localPlayerIndex
        });
        
        this.canAct = false;
        this.hideActionControls();
    }

    // Update battle started
    updateBattleStarted(data) {
        this.game.battleCards = data.battleCards;
        this.game.battleNumber = data.battleNumber;
        this.game.players = data.players;
        
        this.updateUI();
        this.showWarMessage('BATTLE!', 'battle');
    }

    // Update battle resolved
    updateBattleResolved(data) {
        this.game.players = data.players;
        this.game.battleCards = [];
        
        this.updateUI();
        this.hideWarMessage();
        
        UIUtils.showGameMessage(`${data.winner.name} wins the battle and gets ${data.winner.cardsWon} cards!`, 'success');
    }

    // Update war started
    updateWarStarted(data) {
        this.game.warCards = data.warCards;
        this.game.players = data.players;
        this.game.isWar = true;
        
        this.updateUI();
        this.showWarMessage('WAR!', 'war');
    }

    // Update war resolved
    updateWarResolved(data) {
        this.game.players = data.players;
        this.game.warCards = [];
        this.game.isWar = false;
        
        this.updateUI();
        this.hideWarMessage();
        
        UIUtils.showGameMessage(`${data.winner.name} wins the war and gets ${data.winner.cardsWon} cards!`, 'success');
    }

    // Update next battle
    updateNextBattle(data) {
        this.game.battleNumber = data.battleNumber;
        this.game.players = data.players;
        
        this.canAct = true;
        this.updateUI();
        this.showActionControls();
    }

    // Show game over
    showGameOver(data) {
        UIUtils.showGameMessage(`🏆 ${data.winner.name} wins the war with ${data.winner.cards} cards!`, 'success');
        this.updateUI();
        this.hideActionControls();
    }

    // Update UI
    updateUI() {
        this.updateGameInfo();
        this.updateScores();
        this.updateBattleArea();
        this.updatePlayerAreas();
    }

    // Update game info
    updateGameInfo() {
        document.getElementById('roundNumber').textContent = this.game.roundNumber;
        document.getElementById('battleNumber').textContent = this.game.battleNumber;
        document.getElementById('currentPlayerName').textContent = this.game.players[this.game.currentPlayer]?.name || '-';
        document.getElementById('cardsInPlay').textContent = this.game.battleCards.length + this.game.warCards.length;
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

    // Update battle area
    updateBattleArea() {
        const battleArea = document.getElementById('battleArea');
        battleArea.innerHTML = '';
        
        // Show battle cards
        this.game.battleCards.forEach(battleCard => {
            const cardDiv = document.createElement('div');
            cardDiv.className = 'battle-card';
            cardDiv.textContent = battleCard.card.name;
            battleArea.appendChild(cardDiv);
        });
        
        // Show war cards (face up only)
        this.game.warCards.forEach(warCard => {
            if (warCard.faceUp) {
                const cardDiv = document.createElement('div');
                cardDiv.className = 'battle-card';
                cardDiv.textContent = warCard.card.name;
                battleArea.appendChild(cardDiv);
            }
        });
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

    // Show war message
    showWarMessage(message, type) {
        const warMessage = document.getElementById('warMessage');
        warMessage.textContent = message;
        warMessage.className = `war-message ${type}`;
        warMessage.style.display = 'block';
    }

    // Hide war message
    hideWarMessage() {
        document.getElementById('warMessage').style.display = 'none';
    }

    // Show action controls
    showActionControls() {
        document.getElementById('actionControls').style.display = 'flex';
    }

    // Hide action controls
    hideActionControls() {
        document.getElementById('actionControls').style.display = 'none';
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
        console.log('🔄 Resetting War client state...');
        this.localPlayerIndex = 0;
        this.isMyTurn = false;
        this.canAct = false;
        this.game = new WarGame();
        console.log('✅ War client state reset');
    }
}

// 🎨 WAR RENDERING FUNCTIONS
function drawGameState() {
    if (!window.game || !window.game.players) {
        console.log('🎨 War: No game or players available for rendering');
        return;
    }
    
    console.log('🎨 Drawing War game state');
    
    // Clear canvas with war theme background
    background(50, 50, 0); // Dark yellow/brown
    
    // Draw game elements
    drawWarTable();
    drawPlayers();
    drawBattlefield();
    drawGameInfo();
}

function drawWarTable() {
    // Draw table outline
    stroke(100, 100, 0);
    strokeWeight(8);
    noFill();
    rect(50, 50, width - 100, height - 100, 20);
    
    // Draw table surface
    fill(80, 80, 0, 100);
    noStroke();
    rect(60, 60, width - 120, height - 120, 15);
}

function drawPlayers() {
    if (!window.game.players) return;
    
    const playerY = height * 0.2;
    const playerWidth = 200;
    const spacing = (width - playerWidth * window.game.players.length) / (window.game.players.length + 1);
    
    window.game.players.forEach((player, index) => {
        const playerX = spacing + index * (playerWidth + spacing);
        
        // Draw player area
        fill(0, 0, 0, 150);
        stroke(255);
        strokeWeight(2);
        rect(playerX, playerY - 60, playerWidth, 120, 10);
        
        // Highlight current player
        if (index === window.game.currentPlayer) {
            stroke(255, 255, 0);
            strokeWeight(4);
            noFill();
            rect(playerX - 5, playerY - 65, playerWidth + 10, 130, 15);
        }
        
        // Draw player name
        fill(255);
        textAlign(CENTER, CENTER);
        textSize(14);
        text(player.name, playerX + playerWidth/2, playerY - 40);
        
        // Draw cards count
        textSize(12);
        text(`Cards: ${player.hand ? player.hand.length : 0}`, playerX + playerWidth/2, playerY - 20);
        
        // Draw player cards (small representation)
        if (player.hand && player.hand.length > 0) {
            drawPlayerCards(playerX + playerWidth/2, playerY + 10, player.hand, 30, 42);
        }
    });
}

function drawPlayerCards(centerX, centerY, cards, cardWidth, cardHeight) {
    if (!cards || cards.length === 0) return;
    
    const maxCards = 6; // Show max 6 cards
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
        text(`+${cards.length - maxCards}`, centerX, centerY + 25);
    }
}

function drawBattlefield() {
    const centerX = width / 2;
    const battlefieldY = height * 0.6;
    
    // Draw battlefield area
    fill(0, 0, 0, 150);
    stroke(255);
    strokeWeight(2);
    rect(centerX - 200, battlefieldY - 50, 400, 100, 10);
    
    // Draw battlefield label
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(16);
    text('Battlefield', centerX, battlefieldY - 30);
    
    // Draw cards in battle
    if (window.game.battleCards && window.game.battleCards.length > 0) {
        drawBattleCards(centerX, battlefieldY + 10, window.game.battleCards);
    } else {
        textSize(12);
        text('No battle in progress', centerX, battlefieldY + 10);
    }
}

function drawBattleCards(centerX, centerY, cards) {
    const cardWidth = 50;
    const cardHeight = 70;
    const spacing = 20;
    const totalWidth = (cards.length - 1) * (cardWidth + spacing);
    const startX = centerX - totalWidth / 2;
    
    cards.forEach((card, index) => {
        const x = startX + index * (cardWidth + spacing);
        const y = centerY - cardHeight / 2;
        
        // Draw card
        fill(255);
        stroke(0);
        strokeWeight(2);
        rect(x, y, cardWidth, cardHeight, 5);
        
        // Draw card content
        if (card.name) {
            fill(0);
            textAlign(CENTER, CENTER);
            textSize(8);
            text(card.name, x + cardWidth/2, y + cardHeight/2);
        }
    });
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
    window.warClient = new WarClient();
    window.warClient.initialize();
});
