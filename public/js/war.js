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

    // Show game message popup
    showGameMessage(message, duration = 4000) { // ✅ UI FIX: 4 seconds for better visibility
        // Remove existing message
        const existingMessage = document.getElementById('game-message');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        // Create new message
        const messageDiv = document.createElement('div');
        messageDiv.id = 'game-message';
        messageDiv.style.cssText = `
            position: fixed;
            top: 60%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 140, 0, 0.95);
            color: white;
            padding: 20px 30px;
            border-radius: 10px;
            border: 2px solid #ff8c00;
            font-size: 18px;
            font-weight: bold;
            text-align: center;
            z-index: 1000;
            box-shadow: 0 4px 20px rgba(255, 140, 0, 0.3);
            max-width: 400px;
            word-wrap: break-word;
        `;
        messageDiv.textContent = message;
        
        document.body.appendChild(messageDiv);
        
        // Auto-remove after duration
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, duration);
    }

    // End the game
    endGame() {
        console.log('🏆 Game over!');
        this.gameOver = true;
        
        // Find winner (player with most cards)
        this.winner = this.players.reduce((max, player) => 
            player.hand.length > max.hand.length ? player : max
        );
        
        // ✅ WINNER ANNOUNCEMENT POPUP
        this.showGameMessage(`🏆 ${this.winner.name} wins with ${this.winner.hand.length} cards!`, 4000);
        
        this.emitEvent('gameOver', {
            winner: {
                name: this.winner.name,
                cards: this.winner.hand.length
            },
            finalScores: this.players.map(p => ({ name: p.name, cards: p.hand.length }))
        });
        
        // ✅ AUTO-START NEW GAME: Start a new game after 5 seconds
        setTimeout(() => {
            console.log('🔄 Auto-starting new War game...');
            this.startNewGame();
        }, 5000);
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
        this.isStartingBattle = false; // ✅ CRITICAL FIX: Prevent race conditions
        this.battleHistory = [];
        this.statistics = {
            totalBattles: 0,
            totalWars: 0,
            longestWar: 0,
            currentWarCount: 0,
            cardsWonByPlayer: {}
        };
        this.animationQueue = [];
        this.isAnimating = false;
        this.pendingBattleTimeout = null; // ✅ CRITICAL FIX: Track pending timeouts
        this.activeParticles = []; // ✅ CRITICAL FIX: Track particles for cleanup
        this.updateUIScheduled = false; // ✅ CRITICAL FIX: Track UI update scheduling
        this.touchStartHandler = null; // ✅ CRITICAL FIX: Track touch handlers for cleanup
        this.touchEndHandler = null; // ✅ CRITICAL FIX: Track touch handlers for cleanup
        this.allTimeouts = []; // ✅ CRITICAL FIX: Track all timeouts for cleanup
        this.htmlCardImages = {}; // ✅ CRITICAL FIX: Store HTML image elements for card images
        this.htmlCardBackImage = null; // ✅ CRITICAL FIX: Store HTML image element for card back
        this.imagesLoaded = false; // ✅ CRITICAL FIX: Track if images are loaded
    }
    
    // ✅ CRITICAL FIX: Load card images as HTML images for war game
    loadCardImages() {
        if (this.imagesLoaded) return;
        
        const baseUrl = window.location.origin;
        const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
        const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
        
        let loadedCount = 0;
        const totalImages = suits.length * ranks.length + 1; // 52 cards + 1 card back
        
        // Load card back image
        const cardBackImg = new Image();
        cardBackImg.src = `${baseUrl}/Images/cardBack.jpg`;
        cardBackImg.onload = () => {
            this.htmlCardBackImage = cardBackImg;
            loadedCount++;
            console.log(`✅ Card back image loaded (${loadedCount}/${totalImages})`);
            if (loadedCount === totalImages) {
                this.imagesLoaded = true;
                console.log('✅ All card images loaded for war game!');
            }
        };
        cardBackImg.onerror = () => {
            console.warn('⚠️ Card back image failed to load, using fallback');
            loadedCount++;
            if (loadedCount === totalImages) {
                this.imagesLoaded = true;
            }
        };
        
        // Load all card images
        suits.forEach(suit => {
            ranks.forEach(rank => {
                const imageName = `${rank}_of_${suit}`;
                const img = new Image();
                img.src = `${baseUrl}/Images/${imageName}.png`;
                img.onload = () => {
                    this.htmlCardImages[imageName] = img;
                    loadedCount++;
                    if (loadedCount === totalImages) {
                        this.imagesLoaded = true;
                        console.log('✅ All card images loaded for war game!');
                    }
                };
                img.onerror = () => {
                    console.warn(`⚠️ Card image failed to load: ${imageName}`);
                    loadedCount++;
                    if (loadedCount === totalImages) {
                        this.imagesLoaded = true;
                    }
                };
            });
        });
    }

    // Initialize the client
    initialize() {
        try {
        console.log('🎮 Initializing War client');
            
            // ✅ CRITICAL FIX: Load card images as HTML images for war game
            this.loadCardImages();
        
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
                UIUtils.showGameMessage('Game framework not available. Please refresh the page.', 'error');
                return;
        }
        
            // ✅ CRITICAL FIX: Setup UI event listeners with error handling
            try {
        this.setupUI();
            } catch (error) {
                console.error('❌ Error setting up UI:', error);
                UIUtils.showGameMessage('Error setting up UI. Some features may not work.', 'error');
            }
        
            // ✅ CRITICAL FIX: Setup socket event listeners with error handling
            try {
        this.setupSocketListeners();
            } catch (error) {
                console.error('❌ Error setting up socket listeners:', error);
                UIUtils.showGameMessage('Error setting up connection. Please refresh the page.', 'error');
            }
        
        console.log('✅ War client initialized');
        } catch (error) {
            console.error('❌ Critical error initializing War client:', error);
            UIUtils.showGameMessage('Failed to initialize game. Please refresh the page.', 'error');
        }
    }

    // Setup UI event listeners
    setupUI() {
        // Room controls
        const createRoomBtn = document.getElementById('createRoomBtn');
        const joinRoomBtn = document.getElementById('joinRoomBtn');
        const addBotBtn = document.getElementById('addBotBtn');
        const removeBotBtn = document.getElementById('removeBotBtn');
        const startGameBtn = document.getElementById('startGameBtn');
        const battleBtn = document.getElementById('battleBtn');
        const copyRoomCodeBtn = document.getElementById('copyRoomCodeBtn');
        
        if (createRoomBtn) {
            createRoomBtn.onclick = () => this.createRoom();
            createRoomBtn.setAttribute('aria-label', 'Create a new game room');
        }
        
        if (joinRoomBtn) {
            joinRoomBtn.onclick = () => this.joinRoom();
            joinRoomBtn.setAttribute('aria-label', 'Join an existing game room');
        }
        
        if (addBotBtn) {
            addBotBtn.onclick = () => this.addBot();
            addBotBtn.setAttribute('aria-label', 'Add a bot player');
        }
        
        if (removeBotBtn) {
            removeBotBtn.onclick = () => this.removeBot();
            removeBotBtn.setAttribute('aria-label', 'Remove a bot player');
        }
        
        if (startGameBtn) {
            startGameBtn.onclick = () => {
                // ✅ CRITICAL FIX: Emit startGame event to server, don't call startGame() directly
                const socket = window.gameFramework?.socket;
                const roomId = window.gameFramework?.roomId;
                if (socket && roomId) {
                    console.log('🎮 Start Game button clicked, emitting startGame event to server');
                    socket.emit('startGame', roomId);
                    // Disable button while starting
                    startGameBtn.disabled = true;
                    startGameBtn.textContent = 'Starting...';
                } else {
                    console.error('❌ Socket or roomId not available');
                    UIUtils.showGameMessage('Connection not available. Please refresh the page.', 'error');
                }
            };
            startGameBtn.setAttribute('aria-label', 'Start the game');
        }
        
        // Game controls
        if (battleBtn) {
            battleBtn.onclick = () => this.startBattle();
            battleBtn.setAttribute('aria-label', 'Start battle');
            
            // ✅ CRITICAL FIX: Add keyboard support
            battleBtn.onkeydown = (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.startBattle();
                }
            };
            
            // ✅ CRITICAL FIX: Add touch support for mobile with cleanup tracking
            this.touchStartHandler = (e) => {
                e.preventDefault();
                battleBtn.style.transform = 'scale(0.95)';
            };
            this.touchEndHandler = (e) => {
                e.preventDefault();
                battleBtn.style.transform = '';
                if (!battleBtn.disabled) {
                    this.startBattle();
                }
            };
            
            battleBtn.addEventListener('touchstart', this.touchStartHandler, { passive: false });
            battleBtn.addEventListener('touchend', this.touchEndHandler, { passive: false });
        }
        
        // ✅ CRITICAL FIX: Add beforeunload cleanup
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
        
        // Copy room code
        if (copyRoomCodeBtn) {
            copyRoomCodeBtn.onclick = () => this.copyRoomCode();
            copyRoomCodeBtn.setAttribute('aria-label', 'Copy room code to clipboard');
        }
        
        // ✅ CRITICAL FIX: Add Enter key handler for room code input
        const roomCodeInput = document.getElementById('roomCodeInput');
        if (roomCodeInput) {
            roomCodeInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.joinRoom();
                }
            });
            roomCodeInput.setAttribute('aria-label', 'Enter room code to join');
        }
        
        // ✅ CRITICAL FIX: Add change nickname button handler
        const changeNicknameBtn = document.getElementById('changeNicknameBtn');
        const nicknameInput = document.getElementById('nicknameInput');
        if (changeNicknameBtn && nicknameInput) {
            changeNicknameBtn.onclick = () => {
                const newNickname = nicknameInput.value.trim();
                if (newNickname && newNickname.length > 0 && newNickname.length <= 12) {
                    const socket = window.gameFramework?.socket;
                    if (socket) {
                        const roomId = window.gameFramework?.roomId;
                        if (roomId) {
                            socket.emit('changeNickname', {
                                roomId: roomId,
                                nickname: newNickname
                            });
                            UIUtils.showGameMessage(`Nickname changed to: ${newNickname}`, 'success');
                        } else {
                            UIUtils.showGameMessage('Not in a room', 'error');
                        }
                    } else {
                        UIUtils.showGameMessage('Connection not available', 'error');
                    }
                } else {
                    UIUtils.showGameMessage('Nickname must be 1-12 characters', 'error');
                }
            };
            
            // Allow Enter key to change nickname
            nicknameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    changeNicknameBtn.click();
                }
            });
        }
    }

    // Setup socket event listeners
    setupSocketListeners() {
        const socket = window.gameFramework.socket;
        
        // ✅ CRITICAL FIX: Validate socket exists
        if (!socket) {
            console.error('❌ Socket not available');
            return;
        }
        
        socket.on('roomCreated', (data) => {
            console.log('🏠 Room created:', data);
            // ✅ CRITICAL FIX: Validate data
            if (!data) {
                console.error('❌ Invalid room created data');
                return;
            }
            const roomCode = data.roomId || data; // Handle both old and new formats
            
            // ✅ CRITICAL FIX: Mark this client as room creator
            window.isRoomCreator = true;
            if (window.gameFramework) {
                window.gameFramework.isRoomCreator = true;
            }
            console.log('✅ This client marked as room creator');
            
            // ✅ CRITICAL FIX: Hide room code input after creating room
            const roomCodeInput = document.getElementById('roomCodeInput');
            if (roomCodeInput) {
                roomCodeInput.style.display = 'none';
            }
            
            // ✅ CRITICAL FIX: Hide create/join buttons
            const createRoomBtn = document.getElementById('createRoomBtn');
            const joinRoomBtn = document.getElementById('joinRoomBtn');
            if (createRoomBtn) createRoomBtn.style.display = 'none';
            if (joinRoomBtn) joinRoomBtn.style.display = 'none';
            
            this.showRoomCode(roomCode);
            this.showPlayerCustomization();
            this.showGameControls(data); // ✅ CRITICAL FIX: Pass data to showGameControls
            
            // ✅ CRITICAL FIX: Update player list if provided
            if (data.players) {
                this.updatePlayerList(data.players);
                this.updateStartGameButton(data.players);
                this.updateAddBotButtonState(data.players.length);
            } else {
                // If players not in data, show buttons anyway for room creator
                console.log('⚠️ Players data not in roomCreated event, showing controls for room creator');
                // Initialize with 1 player (the creator)
                this.updateAddBotButtonState(1);
            }
        });
        
        socket.on('roomJoined', (data) => {
            console.log('🏠 Room joined:', data);
            // ✅ CRITICAL FIX: Validate data
            if (!data) {
                console.error('❌ Invalid room joined data');
                return;
            }
            
            // ✅ CRITICAL FIX: Mark as NOT room creator (we joined, didn't create)
            window.isRoomCreator = false;
            if (window.gameFramework) {
                window.gameFramework.isRoomCreator = false;
            }
            console.log('✅ This client marked as room joiner (not creator)');
            
            // ✅ CRITICAL FIX: Hide room code input after joining room
            const roomCodeInput = document.getElementById('roomCodeInput');
            if (roomCodeInput) {
                roomCodeInput.style.display = 'none';
            }
            
            // ✅ CRITICAL FIX: Hide create/join buttons
            const createRoomBtn = document.getElementById('createRoomBtn');
            const joinRoomBtn = document.getElementById('joinRoomBtn');
            if (createRoomBtn) createRoomBtn.style.display = 'none';
            if (joinRoomBtn) joinRoomBtn.style.display = 'none';
            
            this.localPlayerIndex = data.playerIndex !== undefined ? data.playerIndex : this.localPlayerIndex;
            this.showPlayerCustomization();
            this.showGameControls(data); // ✅ CRITICAL FIX: Pass data to showGameControls
            
            // ✅ CRITICAL FIX: Update player list if provided
            if (data.players) {
                this.updatePlayerList(data.players);
                this.updateStartGameButton(data.players);
                this.updateAddBotButtonState(data.players.length);
            }
        });
        
        // ✅ CRITICAL FIX: Handle player list updates
        socket.on('playerJoined', (data) => {
            console.log('👤 Player joined:', data);
            if (data && data.players) {
                this.updatePlayerList(data.players);
                this.updateStartGameButton(data.players);
                this.updateAddBotButtonState(data.players.length);
            }
        });
        
        socket.on('playerLeft', (data) => {
            console.log('👤 Player left:', data);
            if (data && data.players) {
                this.updatePlayerList(data.players);
                this.updateStartGameButton(data.players);
                this.updateAddBotButtonState(data.players.length);
            }
        });
        
        socket.on('botAdded', (data) => {
            console.log('🤖 Bot added:', data);
            if (data && data.players) {
                this.updatePlayerList(data.players);
                this.updateStartGameButton(data.players);
                this.updateAddBotButtonState(data.players.length);
            }
        });
        
        socket.on('botRemoved', (data) => {
            console.log('🤖 Bot removed:', data);
            if (data && data.players) {
                this.updatePlayerList(data.players);
                this.updateStartGameButton(data.players);
                this.updateAddBotButtonState(data.players.length);
            }
        });
        
        // ✅ CRITICAL FIX: Handle room full event
        socket.on('roomFull', () => {
            console.log('🏠 Room is full');
            this.updateAddBotButtonState(4); // Max players reached
            UIUtils.showGameMessage('Room is full. Maximum 4 players allowed.', 'info');
        });
        
        // ✅ CRITICAL FIX: Handle room not full event
        socket.on('roomNotFull', () => {
            console.log('🏠 Room is not full');
            // Update button state based on current player count
            const playerList = document.getElementById('playerList');
            if (playerList) {
                const currentPlayers = playerList.querySelectorAll('.player-item').length;
                this.updateAddBotButtonState(currentPlayers);
            }
        });
        
        // ✅ CRITICAL FIX: Handle error events from server
        socket.on('error', (errorMessage) => {
            console.error('❌ Server error:', errorMessage);
            UIUtils.showGameMessage(errorMessage || 'An error occurred. Please try again.', 'error');
            // Re-enable buttons if error occurred
            const addBotBtn = document.getElementById('addBotBtn');
            if (addBotBtn && errorMessage.includes('full')) {
                this.updateAddBotButtonState(4); // Assume max reached
            }
        });
        
        socket.on('gameStarted', (data) => {
            console.log('🎮 Game started event received:', data);
            // ✅ CRITICAL FIX: Validate data before starting game
            if (!data) {
                console.error('❌ Invalid game started data - data is null/undefined');
                UIUtils.showGameMessage('Invalid game data received. Please refresh the page.', 'error');
                return;
            }
            if (!data.players || !Array.isArray(data.players)) {
                console.error('❌ Invalid game started data - players missing or not an array');
                console.error('Data received:', data);
                UIUtils.showGameMessage('Invalid game data received. Please refresh the page.', 'error');
                return;
            }
            // Re-enable start button
            const startGameBtn = document.getElementById('startGameBtn');
            if (startGameBtn) {
                startGameBtn.disabled = false;
                startGameBtn.textContent = 'Start Game';
            }
            this.startGame(data);
        });
        
        socket.on('battleStarted', (data) => {
            // ✅ CRITICAL FIX: Validate data
            if (!data) {
                console.error('❌ Invalid battle started data');
                return;
            }
            this.updateBattleStarted(data);
        });
        
        socket.on('battleResolved', (data) => {
            // ✅ CRITICAL FIX: Validate data
            if (!data) {
                console.error('❌ Invalid battle resolved data');
                return;
            }
            this.updateBattleResolved(data);
        });
        
        socket.on('warStarted', (data) => {
            // ✅ CRITICAL FIX: Validate data
            if (!data) {
                console.error('❌ Invalid war started data');
                return;
            }
            this.updateWarStarted(data);
        });
        
        socket.on('warResolved', (data) => {
            // ✅ CRITICAL FIX: Validate data
            if (!data) {
                console.error('❌ Invalid war resolved data');
                return;
            }
            this.updateWarResolved(data);
        });
        
        socket.on('nextBattle', (data) => {
            // ✅ CRITICAL FIX: Validate data
            if (!data) {
                console.error('❌ Invalid next battle data');
                return;
            }
            this.updateNextBattle(data);
        });
        
        socket.on('gameOver', (data) => {
            // ✅ CRITICAL FIX: Validate data
            if (!data) {
                console.error('❌ Invalid game over data');
                return;
            }
            this.showGameOver(data);
        });
        
        // Error handling
        socket.on('error', (error) => {
            console.error('Socket error:', error);
            UIUtils.showGameMessage(`Error: ${error}`, 'error');
        });
        
        // ✅ CRITICAL FIX: Handle disconnection
        socket.on('disconnect', (reason) => {
            console.warn('⚠️ Disconnected from server:', reason);
            this.canAct = false;
            this.hideActionControls();
            UIUtils.showGameMessage('Disconnected from server. Please refresh the page.', 'error');
            
            // Clean up on disconnect
            this.cleanup();
        });
        
        // ✅ CRITICAL FIX: Handle reconnection
        socket.on('reconnect', () => {
            console.log('✅ Reconnected to server');
            UIUtils.showGameMessage('Reconnected to server!', 'success');
            
            // Try to rejoin room if we were in one
            if (window.gameFramework && window.gameFramework.roomId) {
                const roomId = typeof window.gameFramework.roomId === 'object' ? 
                              window.gameFramework.roomId.roomId : 
                              window.gameFramework.roomId;
                if (roomId) {
                    console.log('🔄 Attempting to rejoin room:', roomId);
                    this.joinRoom(roomId);
                }
            }
        });
        
        // ✅ CRITICAL FIX: Handle connection errors
        socket.on('connect_error', (error) => {
            console.error('❌ Connection error:', error);
            UIUtils.showGameMessage('Connection error. Please check your internet connection.', 'error');
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
        console.log('🎮 Join Room button clicked');
        
        // ✅ CRITICAL FIX: Get room code from input field instead of prompt
        const roomCodeInput = document.getElementById('roomCodeInput');
        let roomCode = '';
        
        if (roomCodeInput && roomCodeInput.value) {
            roomCode = roomCodeInput.value.trim().toUpperCase();
        } else {
            // Fallback to prompt if input field doesn't exist
            roomCode = prompt('Enter room code:');
        if (!roomCode) {
            return;
        }
            roomCode = roomCode.trim().toUpperCase();
        }
        
        if (!roomCode) {
            UIUtils.showGameMessage('Please enter a room code', 'error');
            if (roomCodeInput) {
                roomCodeInput.focus();
            }
            return;
        }
        
        // ✅ CRITICAL FIX: Validate room code format
        if (!/^[A-Z0-9]+$/.test(roomCode)) {
            UIUtils.showGameMessage('Invalid room code format. Use only letters and numbers.', 'error');
            if (roomCodeInput) {
                roomCodeInput.focus();
                roomCodeInput.select();
            }
            return;
        }
        
        console.log('✅ Joining room with code:', roomCode);
        
        // Try to join room immediately first
        if (typeof GameFramework !== 'undefined' && GameFramework.joinRoom) {
            console.log('✅ GameFramework available, joining room immediately');
        GameFramework.joinRoom(roomCode);
            return;
        }
        
        // If not available, wait and retry
        console.log('⏳ GameFramework not ready, waiting...');
        let attempts = 0;
        const maxAttempts = 10;
        
        const tryJoinRoom = () => {
            attempts++;
            console.log(`🔄 Attempt ${attempts}/${maxAttempts} to join room`);
            
            if (typeof GameFramework !== 'undefined' && GameFramework.joinRoom) {
                console.log('✅ GameFramework now available, joining room');
                GameFramework.joinRoom(roomCode);
                return;
            }
            
            if (attempts < maxAttempts) {
                setTimeout(tryJoinRoom, 200); // Wait 200ms between attempts
            } else {
                console.error('❌ GameFramework still not available after maximum attempts');
                UIUtils.showGameMessage('Game framework not ready. Please refresh the page.', 'error');
            }
        };
        
        setTimeout(tryJoinRoom, 100);
    }

    // Add bot
    addBot() {
        const socket = window.gameFramework?.socket;
        const roomId = window.gameFramework?.roomId;
        if (!socket || !roomId) {
            console.error('❌ Socket or roomId not available');
            UIUtils.showGameMessage('Connection not available. Please refresh the page.', 'error');
            return;
        }
        
        // ✅ CRITICAL FIX: Check current player count before adding bot
        const playerList = document.getElementById('playerList');
        if (playerList) {
            const currentPlayers = playerList.querySelectorAll('.player-item').length;
            const maxPlayers = 4; // War supports up to 4 players
            if (currentPlayers >= maxPlayers) {
                console.log(`❌ Room is full (${currentPlayers}/${maxPlayers}), cannot add bot`);
                UIUtils.showGameMessage(`Room is full. Maximum ${maxPlayers} players allowed.`, 'error');
                return;
            }
        }
        
        console.log('🤖 Adding bot to room:', roomId);
        socket.emit('addBot', { roomId: roomId });
    }

    // Remove bot
    removeBot() {
        const socket = window.gameFramework.socket;
        socket.emit('removeBot', { roomId: window.gameFramework.roomId });
    }

    // Start game
    startGame(data = null) {
        // ✅ CRITICAL FIX: Validate data before starting game
        if (!data || !data.players || !Array.isArray(data.players)) {
            console.error('❌ Invalid game started data');
            UIUtils.showGameMessage('Invalid game data received. Please refresh the page.', 'error');
            return;
        }
        
        // ✅ CRITICAL FIX: Validate minimum player count
        if (data.players.length < 2) {
            console.error('❌ Insufficient players to start game');
            UIUtils.showGameMessage('Need at least 2 players to start the game.', 'error');
            return;
        }
        
        // ✅ CRITICAL FIX: Initialize game with server data - proper multiplayer synchronization
        this.game.players = data.players.map((player, index) => ({
            ...player,
            hand: Array.isArray(player.hand) ? player.hand : [], // Hand length is shown for card count
            position: index,
            playerIndex: player.playerIndex !== undefined ? player.playerIndex : index
        }));
        this.localPlayerIndex = data.localPlayerIndex !== undefined ? data.localPlayerIndex : 0;
        this.game.battleNumber = data.battleNumber || 1;
        this.game.gamePhase = data.gamePhase || 'playing';
        this.game.currentPlayer = data.currentPlayer !== undefined ? data.currentPlayer : 0;
        this.game.roundNumber = data.roundNumber || 1;
        this.game.battleCards = [];
        this.game.warCards = [];
        this.game.gameOver = false;
        this.game.winner = null;
        this.game.isWar = false;
        
        // ✅ CRITICAL FIX: Validate card count consistency (52 cards total in standard deck)
        const totalCards = this.game.players.reduce((sum, p) => sum + (Array.isArray(p.hand) ? p.hand.length : 0), 0);
        if (totalCards !== 52 && totalCards > 0) {
            console.warn(`⚠️ Card count mismatch: Expected 52, got ${totalCards}. Cards may be in play or game state is inconsistent.`);
        }
        
        // Reset statistics
        this.statistics.totalBattles = 0;
        this.statistics.totalWars = 0;
        this.statistics.longestWar = 0;
        
        // ✅ CRITICAL FIX: Show battle history log when game starts
        // ✅ CRITICAL FIX: Show and position battle history log in bottom right corner
        const historyLog = document.getElementById('battleHistoryLog');
        if (historyLog) {
            historyLog.style.cssText = `
                position: fixed !important;
                bottom: 20px !important;
                right: 20px !important;
                width: 320px !important;
                max-height: 400px !important;
                display: block !important;
                z-index: 2000 !important;
                pointer-events: auto !important;
            `;
            console.log('✅ Battle history log shown in bottom right corner');
        }
        
        // Initialize history log
        this.updateBattleHistoryLog();
        
        // ✅ CRITICAL FIX: Show navigation buttons when game starts and ensure they're clickable
        const navButtons = document.querySelector('.game-navigation-buttons');
        if (navButtons) {
            navButtons.style.display = 'flex';
            navButtons.style.zIndex = '3000';
            navButtons.style.pointerEvents = 'auto';
            console.log('✅ Navigation buttons shown');
        } else {
            console.warn('⚠️ Navigation buttons container not found');
        }
        
        // ✅ CRITICAL FIX: Re-setup navigation buttons to ensure event handlers are attached
        this.setupNavigationButtons();
        
        this.statistics.currentWarCount = 0;
        this.statistics.cardsWonByPlayer = {};
        
        // Set global game instance
        window.game = this.game;
        
        console.log('⚔️ War game started with players:', this.game.players.map(p => ({ name: p.name, cards: p.hand.length })));
        
        UIUtils.showGame();
        this.updateUI();
        
        // ✅ CRITICAL FIX: Show battle button and wait for user to click it (no auto-start - button is mandatory)
        this.canAct = true;
        this.safeSetTimeout(() => {
            this.showActionControls();
            console.log('✅ Battle button shown - waiting for user to click (battle button is mandatory)');
        }, 1500);
    }

    // Start battle
    startBattle() {
        // ✅ CRITICAL FIX: Validate game state before starting battle
        if (!this.canAct || this.game.gameOver) {
            console.log('⚠️ Cannot start battle: canAct=', this.canAct, 'gameOver=', this.game.gameOver);
            return;
        }
        
        // ✅ CRITICAL FIX: Check if there are enough players with cards
        const activePlayers = this.game.players.filter(p => p && p.hand && p.hand.length > 0);
        if (activePlayers.length < 2) {
            console.log('⚠️ Not enough players with cards to start battle');
            return;
        }
        
        // ✅ CRITICAL FIX: Prevent multiple simultaneous battle starts
        if (this.isStartingBattle) {
            console.log('⚠️ Battle already starting');
            return;
        }
        
        this.isStartingBattle = true;
        
        // ✅ CRITICAL FIX: Show loading state on button
        const battleBtn = document.getElementById('battleBtn');
        if (battleBtn) {
            const originalText = battleBtn.textContent;
            battleBtn.disabled = true;
            battleBtn.textContent = '⏳ Starting...';
            battleBtn.style.opacity = '0.7';
            battleBtn.style.cursor = 'wait';
            
            // Store original text to restore later
            battleBtn.dataset.originalText = originalText;
        }
        
        const socket = window.gameFramework.socket;
        if (!socket || !socket.connected) {
            console.error('❌ Socket not connected');
            this.isStartingBattle = false;
            if (battleBtn) {
                battleBtn.disabled = false;
                battleBtn.textContent = battleBtn.dataset.originalText || '⚔️ BATTLE!';
                battleBtn.style.opacity = '1';
                battleBtn.style.cursor = 'pointer';
            }
            return;
        }
        
        const roomId = typeof window.gameFramework.roomId === 'object' ? 
                      window.gameFramework.roomId.roomId : 
                      window.gameFramework.roomId;
        
        if (!roomId) {
            console.error('❌ No room ID available');
            this.isStartingBattle = false;
            if (battleBtn) {
                battleBtn.disabled = false;
                battleBtn.textContent = battleBtn.dataset.originalText || '⚔️ BATTLE!';
                battleBtn.style.opacity = '1';
                battleBtn.style.cursor = 'pointer';
            }
            return;
        }
        
        console.log('🎮 Emitting startBattle event to server:', { roomId, playerIndex: this.localPlayerIndex });
        socket.emit('startBattle', {
            roomId: roomId,
            playerIndex: this.localPlayerIndex
        });
        
        this.canAct = false;
        this.hideActionControls();
        
        // ✅ CRITICAL FIX: Reset flag after server responds (don't reset immediately)
        // The flag will be reset when battleStarted event is received
        console.log('⏳ Waiting for server to start battle...');
    }

    // Update battle started
    updateBattleStarted(data) {
        // ✅ CRITICAL FIX: Validate data before processing
        if (!data) {
            console.error('❌ Invalid battle started data');
            return;
        }
        
        this.game.battleCards = (data.battleCards || []).filter(bc => bc && bc.card);
        this.game.battleNumber = data.battleNumber || this.game.battleNumber;
        this.game.players = (data.players || []).map((p, index) => ({
            ...p,
            hand: Array.isArray(p.hand) ? p.hand : [],
            position: index
        }));
        
        // Update statistics
        this.statistics.totalBattles++;
        
        // Add to battle history (will be updated with winner when resolved)
        if (this.game.battleCards.length > 0) {
            this.battleHistory.push({
                battleNumber: this.game.battleNumber,
                cards: [...this.game.battleCards],
                timestamp: Date.now(),
                winner: null, // Will be set when battle resolves
                isWar: false
            });
            
            // Keep only last 20 battles in history (increased from 10)
            if (this.battleHistory.length > 20) {
                this.battleHistory.shift();
            }
        }
        
        // ✅ CRITICAL FIX: Reset isStartingBattle flag when battle actually starts
        this.isStartingBattle = false;
        
        this.updateUI();
        this.showWarMessage('⚔️ BATTLE! ⚔️', 'battle');
        this.hideActionControls();
        this.createBattleParticles();
        
        // ✅ CRITICAL FIX: Server will handle the delay, but log here for debugging
        console.log('⏳ Cards will appear with delays, server will resolve after 10 seconds');
        
        // ✅ CRITICAL FIX: Clear any pending battle auto-starts
        this.clearPendingActions();
    }
    
    // ✅ CRITICAL FIX: Clear pending actions to prevent race conditions
    clearPendingActions() {
        if (this.pendingBattleTimeout) {
            clearTimeout(this.pendingBattleTimeout);
            this.pendingBattleTimeout = null;
        }
        
        // ✅ CRITICAL FIX: Clear all tracked timeouts
        this.allTimeouts.forEach(timeout => {
            if (timeout) clearTimeout(timeout);
        });
        this.allTimeouts = [];
    }
    
    // ✅ CRITICAL FIX: Safe setTimeout wrapper that tracks timeouts
    safeSetTimeout(callback, delay) {
        const timeout = setTimeout(() => {
            const index = this.allTimeouts.indexOf(timeout);
            if (index > -1) {
                this.allTimeouts.splice(index, 1);
            }
            callback();
        }, delay);
        this.allTimeouts.push(timeout);
        return timeout;
    }
    
    // Create particle effects for battle
    createBattleParticles() {
        const battleArea = document.getElementById('battleArea');
        if (!battleArea) return;
        
        // ✅ CRITICAL FIX: Clean up existing particles first
        const existingParticles = battleArea.querySelectorAll('.battle-particle');
        existingParticles.forEach(p => p.remove());
        
        for (let i = 0; i < 20; i++) {
            const particle = document.createElement('div');
            particle.className = 'battle-particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.top = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 0.5 + 's';
            battleArea.appendChild(particle);
            
            // ✅ CRITICAL FIX: Track timeout for cleanup
            this.safeSetTimeout(() => {
                if (particle.parentNode) {
                    particle.remove();
                }
            }, 2000);
        }
    }

    // Update battle resolved
    updateBattleResolved(data) {
        // ✅ CRITICAL FIX: Validate data
        if (!data) {
            console.error('❌ Invalid battle resolved data');
            return;
        }
        
        // ✅ CRITICAL FIX: Update players with proper playerIndex synchronization for multiplayer
        this.game.players = (data.players || []).map((p, index) => ({
            ...p,
            hand: Array.isArray(p.hand) ? p.hand : [], // Hand length is shown for card count
            position: index,
            playerIndex: p.playerIndex !== undefined ? p.playerIndex : index
        }));
        
        // Update statistics
        if (data.winner) {
            const winnerName = data.winner.name;
            if (winnerName) {
                if (!this.statistics.cardsWonByPlayer[winnerName]) {
                    this.statistics.cardsWonByPlayer[winnerName] = 0;
                }
                this.statistics.cardsWonByPlayer[winnerName] += data.winner.cardsWon || 0;
                
                // ✅ CRITICAL FIX: Highlight winner card with tracked timeout (increased delay for visibility)
                if (data.winner.playerIndex !== undefined) {
                    this.safeSetTimeout(() => {
                        this.highlightWinnerCard(data.winner.playerIndex);
                    }, 1500); // ✅ CRITICAL FIX: Increased to 1500ms so players can see cards before highlight
                }
            }
        }
        
        // Animate card collection
        if (this.game.battleCards && this.game.battleCards.length > 0 && data.winner) {
            this.animateCardCollection(this.game.battleCards.map(bc => bc.card), data.winner.playerIndex);
        }
        
        this.game.battleCards = [];
        
        // ✅ CRITICAL FIX: Update battle history with winner information
        if (data.winner && this.battleHistory.length > 0) {
            const lastEntry = this.battleHistory[this.battleHistory.length - 1];
            if (lastEntry && !lastEntry.winner) {
                lastEntry.winner = {
                    name: data.winner.name,
                    cardsWon: data.winner.cardsWon || 0
                };
            }
        }
        
        this.updateUI();
        this.hideWarMessage();
        this.updateStatistics();
        this.updateBattleHistoryLog(); // ✅ CRITICAL FIX: Update history log after battle resolves
        
        if (data.winner) {
            UIUtils.showGameMessage(`🏆 ${data.winner.name} wins the battle and gets ${data.winner.cardsWon} cards!`, 'success');
            this.createWinnerEffect(data.winner.playerIndex);
        }
    }
    
    // Highlight winner card
    highlightWinnerCard(winnerIndex) {
        const battleArea = document.getElementById('battleArea');
        if (!battleArea) return;
        
        const cards = battleArea.querySelectorAll('.battle-card');
        cards.forEach((card, index) => {
            const battleCard = this.game.battleCards[index];
            if (battleCard && battleCard.playerIndex === winnerIndex) {
                card.classList.add('winner');
                setTimeout(() => {
                    card.classList.remove('winner');
                }, 2000);
            } else if (battleCard) {
                card.classList.add('loser');
                setTimeout(() => {
                    card.classList.remove('loser');
                }, 2000);
            }
        });
    }
    
    // Create winner effect
    createWinnerEffect(playerIndex) {
        const playerElement = document.querySelector(`[data-player-index="${playerIndex}"]`);
        if (playerElement) {
            const effect = document.createElement('div');
            effect.className = 'winner-effect';
            effect.style.position = 'absolute';
            const rect = playerElement.getBoundingClientRect();
            effect.style.left = rect.left + rect.width / 2 + 'px';
            effect.style.top = rect.top + rect.height / 2 + 'px';
            effect.style.transform = 'translate(-50%, -50%)';
            document.body.appendChild(effect);
            
            // ✅ CRITICAL FIX: Track timeout for cleanup
            this.safeSetTimeout(() => effect.remove(), 2000);
        }
    }

    // Update war started
    updateWarStarted(data) {
        // ✅ CRITICAL FIX: Validate data
        if (!data) {
            console.error('❌ Invalid war started data');
            return;
        }
        
        this.game.warCards = (data.warCards || []).filter(wc => wc && wc.card);
        // ✅ CRITICAL FIX: Update players with proper playerIndex synchronization for multiplayer
        this.game.players = (data.players || []).map((p, index) => ({
            ...p,
            hand: Array.isArray(p.hand) ? p.hand : [], // Hand length is shown for card count
            position: index,
            playerIndex: p.playerIndex !== undefined ? p.playerIndex : index
        }));
        this.game.isWar = true;
        this.game.gamePhase = 'war';
        
        // ✅ CRITICAL FIX: Update statistics correctly for consecutive wars
        // Note: currentWarCount is incremented here, but only reset when war is resolved
        // This allows tracking consecutive wars properly
        this.statistics.totalWars++;
        this.statistics.currentWarCount++;
        
        // ✅ CRITICAL FIX: Update longest war only when current exceeds it
        if (this.statistics.currentWarCount > this.statistics.longestWar) {
            this.statistics.longestWar = this.statistics.currentWarCount;
        }
        
        this.updateUI();
        this.showWarMessage('⚔️⚔️⚔️ WAR! ⚔️⚔️⚔️', 'war');
        this.hideActionControls();
        this.createWarEffect();
        
        // ✅ CRITICAL FIX: Animate war cards flipping with tracked timeout - wait for all cards to appear first
        // Calculate max delay: with 4 players, each with 4 cards (3 face-down + 1 face-up), that's 16 cards max
        // At 2400ms between groups and 1200ms between cards, last card appears at ~(3*2400) + (3*1200) = 10800ms
        // Wait an additional 2000ms for war message visibility, then start flipping
        const maxCardDelay = (this.game.players.length * 2400) + (4 * 1200); // Rough estimate
        this.safeSetTimeout(() => {
            this.animateWarCards();
        }, maxCardDelay + 2000); // ✅ CRITICAL FIX: Wait for all cards to appear before starting flip animations
    }
    
    // Create war effect (intense visual)
    createWarEffect() {
        const battleArea = document.getElementById('battleArea');
        if (!battleArea) return;
        
        // ✅ CRITICAL FIX: Clean up existing particles first
        const existingWarParticles = battleArea.querySelectorAll('.war-particle');
        existingWarParticles.forEach(p => p.remove());
        
        // Create war explosion effect
        for (let i = 0; i < 30; i++) {
            const particle = document.createElement('div');
            particle.className = 'war-particle';
            particle.style.left = '50%';
            particle.style.top = '50%';
            const angle = (Math.PI * 2 * i) / 30;
            const distance = 200 + Math.random() * 100;
            particle.style.setProperty('--angle', angle + 'rad');
            particle.style.setProperty('--distance', distance + 'px');
            battleArea.appendChild(particle);
            
            // ✅ CRITICAL FIX: Track timeout for cleanup
            this.safeSetTimeout(() => {
                if (particle.parentNode) {
                    particle.remove();
                }
            }, 1500);
        }
    }
    
    // Animate war cards flipping
    animateWarCards() {
        const battleArea = document.getElementById('battleArea');
        if (!battleArea) return;
        
        const faceDownCards = battleArea.querySelectorAll('.face-down');
        faceDownCards.forEach((card, index) => {
            // ✅ CRITICAL FIX: Match battle card pace - use 1200ms delay between cards (same as battles)
            this.safeSetTimeout(() => {
                card.classList.add('flipping');
                this.safeSetTimeout(() => {
                    card.classList.remove('flipping');
                }, 600);
            }, index * 1200); // ✅ CRITICAL FIX: Changed from 100ms to 1200ms to match battle card pace
        });
    }

    // Update war resolved
    updateWarResolved(data) {
        // ✅ CRITICAL FIX: Validate data
        if (!data) {
            console.error('❌ Invalid war resolved data');
            return;
        }
        
        // ✅ CRITICAL FIX: Update players with proper playerIndex synchronization for multiplayer
        this.game.players = (data.players || []).map((p, index) => ({
            ...p,
            hand: Array.isArray(p.hand) ? p.hand : [], // Hand length is shown for card count
            position: index,
            playerIndex: p.playerIndex !== undefined ? p.playerIndex : index
        }));
        
        // Reset war count
        this.statistics.currentWarCount = 0;
        
        // Update statistics
        if (data.winner && data.winner.name) {
            const winnerName = data.winner.name;
            if (!this.statistics.cardsWonByPlayer[winnerName]) {
                this.statistics.cardsWonByPlayer[winnerName] = 0;
            }
            this.statistics.cardsWonByPlayer[winnerName] += data.winner.cardsWon || 0;
        }
        
        // Animate card collection
        const allWarCards = [
            ...(this.game.battleCards || []).map(bc => bc?.card).filter(c => c),
            ...(this.game.warCards || []).map(wc => wc?.card).filter(c => c)
        ];
        if (allWarCards.length > 0 && data.winner && data.winner.playerIndex !== undefined) {
            this.animateCardCollection(allWarCards, data.winner.playerIndex);
        }
        
        this.game.warCards = [];
        this.game.battleCards = [];
        this.game.isWar = false;
        this.game.gamePhase = 'playing';
        
        // ✅ CRITICAL FIX: Update battle history with war winner information
        if (data.winner && this.battleHistory.length > 0) {
            const lastEntry = this.battleHistory[this.battleHistory.length - 1];
            if (lastEntry && !lastEntry.winner) {
                lastEntry.winner = {
                    name: data.winner.name,
                    cardsWon: data.winner.cardsWon || 0
                };
                lastEntry.isWar = true; // Mark as war
            }
        }
        
        this.updateUI();
        this.hideWarMessage();
        this.updateStatistics();
        this.updateBattleHistoryLog(); // ✅ CRITICAL FIX: Update history log after war resolves
        
        if (data.winner) {
            UIUtils.showGameMessage(`⚔️ ${data.winner.name} wins the war and gets ${data.winner.cardsWon} cards!`, 'success');
            this.createWarVictoryEffect(data.winner.playerIndex);
        }
    }
    
    // Create war victory effect (more intense)
    createWarVictoryEffect(playerIndex) {
        // Create confetti effect
        this.createConfetti();
        
        // Create winner glow
        const playerElement = document.querySelector(`[data-player-index="${playerIndex}"]`);
        if (playerElement) {
            playerElement.classList.add('war-victory');
            // ✅ CRITICAL FIX: Track timeout for cleanup
            this.safeSetTimeout(() => {
                playerElement.classList.remove('war-victory');
            }, 3000);
        }
    }
    
    // Create confetti effect
    createConfetti() {
        // ✅ CRITICAL FIX: Clean up existing confetti first
        const existingConfetti = document.querySelectorAll('.confetti');
        existingConfetti.forEach(c => {
            if (c.parentNode) {
                c.remove();
            }
        });
        
        const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#95E1D3', '#F38181', '#AA96DA'];
        const confettiCount = 50;
        
        for (let i = 0; i < confettiCount; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.top = '-10px';
            confetti.style.animationDelay = Math.random() * 0.5 + 's';
            confetti.style.setProperty('--rotation', (Math.random() * 360) + 'deg');
            confetti.style.setProperty('--x-variance', (Math.random() * 200 - 100) + 'px');
            document.body.appendChild(confetti);
            this.activeParticles.push(confetti);
            
            // ✅ CRITICAL FIX: Track timeout for cleanup
            this.safeSetTimeout(() => {
                if (confetti.parentNode) {
                    confetti.remove();
                    const index = this.activeParticles.indexOf(confetti);
                    if (index > -1) {
                        this.activeParticles.splice(index, 1);
                    }
                }
            }, 3000);
        }
    }

    // Update next battle
    updateNextBattle(data) {
        // ✅ CRITICAL FIX: Validate data and clear pending actions
        this.clearPendingActions();
        
        if (!data) {
            console.error('❌ Invalid next battle data');
            return;
        }
        
        this.game.battleNumber = data.battleNumber || this.game.battleNumber;
        this.game.players = (data.players || []).map((p, index) => ({
            ...p,
            hand: Array.isArray(p.hand) ? p.hand : [],
            position: index
        }));
        
        // ✅ CRITICAL FIX: Check if game should continue
        const activePlayers = this.game.players.filter(p => p.hand && p.hand.length > 0);
        if (activePlayers.length < 2 && !this.game.gameOver) {
            console.log('⚠️ Not enough players with cards - waiting for game over');
            return;
        }
        
        this.canAct = true;
        this.updateUI();
        
        // ✅ CRITICAL FIX: Show battle button and wait for user to click it (no auto-start - button is mandatory)
        this.safeSetTimeout(() => {
            this.showActionControls();
            console.log('✅ Battle button shown - waiting for user to click (battle button is mandatory)');
        }, 4000); // Wait 4 seconds before showing next battle controls
    }

    // Show game over with celebration
    showGameOver(data) {
        // ✅ CRITICAL FIX: Clear any pending actions
        this.clearPendingActions();
        
        // ✅ CRITICAL FIX: Validate data
        if (!data || !data.winner) {
            console.error('❌ Invalid game over data');
            return;
        }
        
        this.game.gameOver = true;
        this.game.winner = this.game.players.find(p => p && p.name === data.winner.name) || data.winner;
        
        // ✅ CRITICAL FIX: Prevent any further actions
        this.canAct = false;
        this.hideActionControls();
        
        // Massive confetti celebration
        this.createVictoryConfetti();
        
        // Create victory screen
        this.createVictoryScreen(data);
        
        // ✅ CRITICAL FIX: Show winner glow on player with proper element selection
        const winnerIndex = this.game.players.findIndex(p => p && p.name === data.winner.name);
        if (winnerIndex !== -1) {
            // Try multiple selectors to find player element
            let playerElement = document.querySelector(`[data-player-index="${winnerIndex}"]`);
            if (!playerElement) {
                // Try finding in scores table
                const scoresBody = document.getElementById('scoresBody');
                if (scoresBody) {
                    const rows = scoresBody.querySelectorAll('tr');
                    if (rows[winnerIndex]) {
                        playerElement = rows[winnerIndex];
                    }
                }
            }
            if (playerElement) {
                playerElement.classList.add('game-winner');
            }
        }
        
        UIUtils.showGameMessage(`🏆 ${data.winner.name} wins the war with ${data.winner.cards || 0} cards!`, 'success');
        this.updateUI();
        
        // ✅ CRITICAL FIX: Show final statistics with tracked timeout
        this.safeSetTimeout(() => {
            this.showFinalStatistics(data);
        }, 4000);
    }
    
    // Create victory confetti (more intense)
    createVictoryConfetti() {
        // ✅ CRITICAL FIX: Clean up existing confetti first
        const existingConfetti = document.querySelectorAll('.confetti');
        existingConfetti.forEach(c => {
            if (c.parentNode) {
                c.remove();
            }
        });
        this.activeParticles = [];
        
        const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#95E1D3', '#F38181', '#AA96DA', '#FFA07A', '#20B2AA'];
        const confettiCount = 100;
        
        for (let i = 0; i < confettiCount; i++) {
            setTimeout(() => {
                const confetti = document.createElement('div');
                confetti.className = 'confetti';
                confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                confetti.style.left = Math.random() * 100 + '%';
                confetti.style.top = '-10px';
                confetti.style.width = (Math.random() * 10 + 8) + 'px';
                confetti.style.height = (Math.random() * 10 + 8) + 'px';
                confetti.style.animationDelay = Math.random() * 0.5 + 's';
                confetti.style.setProperty('--rotation', (Math.random() * 720) + 'deg');
                confetti.style.setProperty('--x-variance', (Math.random() * 400 - 200) + 'px');
                document.body.appendChild(confetti);
                this.activeParticles.push(confetti);
                
                // ✅ CRITICAL FIX: Track timeout for cleanup
                this.safeSetTimeout(() => {
                    if (confetti.parentNode) {
                        confetti.remove();
                        const index = this.activeParticles.indexOf(confetti);
                        if (index > -1) {
                            this.activeParticles.splice(index, 1);
                        }
                    }
                }, 4000);
            }, i * 20);
        }
    }
    
    // ✅ CRITICAL FIX: Cleanup method for memory management
    cleanup() {
        // Clear all timeouts
        this.clearPendingActions();
        
        // ✅ CRITICAL FIX: Remove all event listeners
        const battleBtn = document.getElementById('battleBtn');
        if (battleBtn && this.touchStartHandler && this.touchEndHandler) {
            battleBtn.removeEventListener('touchstart', this.touchStartHandler);
            battleBtn.removeEventListener('touchend', this.touchEndHandler);
            this.touchStartHandler = null;
            this.touchEndHandler = null;
        }
        
        // ✅ CRITICAL FIX: Remove socket listeners to prevent memory leaks
        if (window.gameFramework && window.gameFramework.socket) {
            const socket = window.gameFramework.socket;
            socket.removeAllListeners('roomCreated');
            socket.removeAllListeners('roomJoined');
            socket.removeAllListeners('gameStarted');
            socket.removeAllListeners('battleStarted');
            socket.removeAllListeners('battleResolved');
            socket.removeAllListeners('warStarted');
            socket.removeAllListeners('warResolved');
            socket.removeAllListeners('nextBattle');
            socket.removeAllListeners('gameOver');
            socket.removeAllListeners('error');
            socket.removeAllListeners('disconnect');
            socket.removeAllListeners('reconnect');
            socket.removeAllListeners('connect_error');
        }
        
        // Remove all particles
        this.activeParticles.forEach(p => {
            if (p && p.parentNode) {
                p.remove();
            }
        });
        this.activeParticles = [];
        
        // Remove confetti
        const allConfetti = document.querySelectorAll('.confetti');
        allConfetti.forEach(c => {
            if (c.parentNode) {
                c.remove();
            }
        });
        
        // Remove victory screen if exists
        const victoryScreen = document.getElementById('victoryScreen');
        if (victoryScreen) {
            victoryScreen.remove();
        }
    }
    
    // Create victory screen overlay
    createVictoryScreen(data) {
        const victoryScreen = document.createElement('div');
        victoryScreen.id = 'victoryScreen';
        victoryScreen.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: radial-gradient(circle, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.95) 100%);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 10001;
            animation: victoryFadeIn 0.5s ease-out;
        `;
        
        victoryScreen.innerHTML = `
            <div style="text-align: center; animation: victoryScale 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55);">
                <div style="font-size: 72px; margin-bottom: 20px; animation: victorySpin 2s ease-in-out infinite;">🏆</div>
                <h1 style="color: #FFD700; font-size: 48px; margin: 0 0 20px 0; text-shadow: 0 0 20px rgba(255, 215, 0, 0.8);">
                    ${data.winner.name} Wins!
                </h1>
                <div style="color: white; font-size: 24px; margin-bottom: 30px;">
                    Final Score: ${data.winner.cards} cards
                </div>
                <div style="color: #ccc; font-size: 16px;">
                    Total Battles: ${this.statistics.totalBattles} | Wars: ${this.statistics.totalWars}
                </div>
            </div>
        `;
        
        document.body.appendChild(victoryScreen);
        
        // Add CSS animations if not already in style
        if (!document.getElementById('victoryAnimations')) {
            const style = document.createElement('style');
            style.id = 'victoryAnimations';
            style.textContent = `
                @keyframes victoryFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes victoryScale {
                    from { transform: scale(0); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                @keyframes victorySpin {
                    0%, 100% { transform: rotate(0deg) scale(1); }
                    50% { transform: rotate(360deg) scale(1.2); }
                }
            `;
            document.head.appendChild(style);
        }
        
        // ✅ CRITICAL FIX: Auto-remove after 8 seconds with tracked timeouts
        this.safeSetTimeout(() => {
            victoryScreen.style.animation = 'victoryFadeIn 0.5s ease-out reverse';
            this.safeSetTimeout(() => victoryScreen.remove(), 500);
        }, 8000);
    }
    
    // Show final statistics
    showFinalStatistics(data) {
        if (data.finalScores) {
            const statsText = data.finalScores.map(s => `${s.name}: ${s.cards} cards`).join(' | ');
            UIUtils.showGameMessage(`📊 Final Scores: ${statsText}`, 'info');
            
            // ✅ CRITICAL FIX: Show detailed statistics with tracked timeout
            this.safeSetTimeout(() => {
                const detailStats = `
                    📈 Game Statistics:
                    • Battles Fought: ${this.statistics.totalBattles}
                    • Wars Declared: ${this.statistics.totalWars}
                    • Longest War: ${this.statistics.longestWar} consecutive wars
                `;
                UIUtils.showGameMessage(detailStats, 'info');
            }, 2000);
        }
    }

    // Update UI with performance optimization
    updateUI() {
        // ✅ CRITICAL FIX: Use requestAnimationFrame for smooth updates
        if (this.updateUIScheduled) {
            return; // Already scheduled
        }
        
        this.updateUIScheduled = true;
        requestAnimationFrame(() => {
        this.updateGameInfo();
        this.updateScores();
        this.updateBattleArea();
        this.updatePlayerAreas();
        this.updateBattleHistoryLog(); // ✅ CRITICAL FIX: Update history log on every UI update
            this.updateUIScheduled = false;
        });
    }

    // Update game info with animations
    updateGameInfo() {
        const roundNumberEl = document.getElementById('roundNumber');
        const battleNumberEl = document.getElementById('battleNumber');
        const currentPlayerEl = document.getElementById('currentPlayerName');
        const cardsInPlayEl = document.getElementById('cardsInPlay');
        
        // Animate number changes
        if (roundNumberEl) {
            const newValue = this.game.roundNumber;
            if (roundNumberEl.textContent !== newValue.toString()) {
                roundNumberEl.style.animation = 'numberPulse 0.3s ease-out';
                // ✅ CRITICAL FIX: Track timeout for cleanup
                this.safeSetTimeout(() => {
                    roundNumberEl.textContent = newValue;
                    roundNumberEl.style.animation = '';
                }, 150);
            }
        }
        
        if (battleNumberEl) {
            const newValue = this.game.battleNumber;
            if (battleNumberEl.textContent !== newValue.toString()) {
                battleNumberEl.style.animation = 'numberPulse 0.3s ease-out';
                // ✅ CRITICAL FIX: Track timeout for cleanup
                this.safeSetTimeout(() => {
                    battleNumberEl.textContent = newValue;
                    battleNumberEl.style.animation = '';
                }, 150);
            }
        }
        
        if (currentPlayerEl) {
            const newValue = this.game.players[this.game.currentPlayer]?.name || '-';
            if (currentPlayerEl.textContent !== newValue) {
                currentPlayerEl.style.opacity = '0';
                // ✅ CRITICAL FIX: Track timeout for cleanup
                this.safeSetTimeout(() => {
                    currentPlayerEl.textContent = newValue;
                    currentPlayerEl.style.opacity = '1';
                }, 200);
            }
        }
        
        if (cardsInPlayEl) {
            const newValue = (this.game.battleCards?.length || 0) + (this.game.warCards?.length || 0);
            if (cardsInPlayEl.textContent !== newValue.toString()) {
                cardsInPlayEl.style.animation = 'numberPulse 0.3s ease-out';
                // ✅ CRITICAL FIX: Track timeout for cleanup
                this.safeSetTimeout(() => {
                    cardsInPlayEl.textContent = newValue;
                    cardsInPlayEl.style.animation = '';
                }, 150);
            }
        }
        
        // Add CSS animation if not exists
        if (!document.getElementById('numberPulseAnimation')) {
            const style = document.createElement('style');
            style.id = 'numberPulseAnimation';
            style.textContent = `
                @keyframes numberPulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.3); color: #FFD700; }
                }
            `;
            document.head.appendChild(style);
        }
    }

    // Update scores with enhanced visualization
    updateScores() {
        const scoresBody = document.getElementById('scoresBody');
        if (!scoresBody) return;
        
        // ✅ CRITICAL FIX: Validate players array
        if (!this.game.players || !Array.isArray(this.game.players) || this.game.players.length === 0) {
            scoresBody.innerHTML = '<tr><td colspan="2">No players</td></tr>';
            return;
        }
        
        scoresBody.innerHTML = '';
        
        // Calculate total cards for percentage
        const totalCards = this.game.players.reduce((sum, p) => {
            if (!p || !p.hand) return sum;
            return sum + (Array.isArray(p.hand) ? p.hand.length : 0);
        }, 0);
        
        this.game.players.forEach((player, index) => {
            // ✅ CRITICAL FIX: Validate player exists
            if (!player) {
                console.warn(`⚠️ Player at index ${index} is null/undefined`);
                return;
            }
            
            const row = document.createElement('tr');
            row.setAttribute('data-player-index', index);
            row.setAttribute('data-player-name', player.name || `Player ${index + 1}`);
            
            const cardCount = Array.isArray(player.hand) ? player.hand.length : 0;
            const percentage = totalCards > 0 ? Math.min(100, (cardCount / totalCards * 100)) : 0;
            
            row.innerHTML = `
                <td class="player-name-cell">
                    <div class="player-name-wrapper">
                        <span class="player-name">${player.name || `Player ${index + 1}`}</span>
                        ${player.isBot ? '<span class="bot-badge">🤖</span>' : ''}
                    </div>
                </td>
                <td class="player-cards-cell">
                    <div class="cards-display">
                        <div class="card-count">${cardCount}</div>
                        <div class="card-stack-visual">
                            ${this.createCardStackVisual(cardCount)}
                        </div>
                        <div class="card-progress-bar">
                            <div class="card-progress-fill" style="width: ${percentage}%"></div>
                        </div>
                    </div>
                </td>
            `;
            
            scoresBody.appendChild(row);
        });
    }
    
    // Create visual representation of card stack
    createCardStackVisual(count) {
        if (count === 0) return '<div class="no-cards">No cards</div>';
        
        const stackHeight = Math.min(count * 2, 30);
        const stackElements = [];
        const layers = Math.min(Math.ceil(count / 5), 5);
        
        for (let i = 0; i < layers; i++) {
            stackElements.push(`<div class="card-stack-layer" style="z-index: ${layers - i}; transform: translateY(${i * 2}px);"></div>`);
        }
        
        return `<div class="card-stack" style="height: ${stackHeight}px;">${stackElements.join('')}</div>`;
    }
    
    // Update statistics display
    updateStatistics() {
        const statsContainer = document.getElementById('statisticsContainer');
        if (!statsContainer) {
            // ✅ CRITICAL FIX: Create statistics container if it doesn't exist
            const container = document.createElement('div');
            container.id = 'statisticsContainer';
            container.className = 'statistics-container';
            container.style.cssText = `
                position: fixed;
                bottom: 80px;
                left: 20px;
                background: rgba(0, 0, 0, 0.7);
                color: white;
                padding: 10px;
                border-radius: 8px;
                font-size: 12px;
                z-index: 1000;
            `;
            document.body.appendChild(container);
            statsContainer = container;
        }
        
        statsContainer.innerHTML = `
            <div class="stat-item">
                <span class="stat-label">Battles:</span>
                <span class="stat-value">${this.statistics.totalBattles}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Wars:</span>
                <span class="stat-value">${this.statistics.totalWars}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Longest War:</span>
                <span class="stat-value">${this.statistics.longestWar}</span>
            </div>
        `;
    }
    
    // ✅ CRITICAL FIX: Update battle history log display
    updateBattleHistoryLog() {
        const historyContent = document.getElementById('historyContent');
        if (!historyContent) return;
        
        // Clear and rebuild history
        historyContent.innerHTML = '';
        
        // Show last 10 entries (most recent first)
        const recentHistory = [...this.battleHistory].reverse().slice(0, 10);
        
        recentHistory.forEach((entry, index) => {
            const entryDiv = document.createElement('div');
            entryDiv.className = `history-entry ${entry.isWar ? 'war' : ''} ${entry.winner ? 'winner' : ''}`;
            
            let entryText = `<span class="battle-number">Battle ${entry.battleNumber}:</span> `;
            
            // Show cards played
            if (entry.cards && entry.cards.length > 0) {
                const cardTexts = entry.cards.map((bc, idx) => {
                    const playerName = bc.player?.name || `Player ${bc.playerIndex + 1}`;
                    const cardName = this.getCardDisplayValue(bc.card);
                    return `<span class="player-name">${playerName}</span> played <span class="card-name">${cardName}</span>`;
                }).join(', ');
                entryText += cardTexts;
            }
            
            // Show winner if resolved
            if (entry.winner) {
                entryText += ` → <span class="winner-text">🏆 ${entry.winner.name} wins!</span>`;
                if (entry.winner.cardsWon > 0) {
                    entryText += ` (+${entry.winner.cardsWon} cards)`;
                }
            }
            
            // Show if it was a war
            if (entry.isWar) {
                entryText = `<span class="war-text">⚔️ WAR!</span> ` + entryText;
            }
            
            entryDiv.innerHTML = entryText;
            historyContent.appendChild(entryDiv);
        });
        
        // Auto-scroll to top (most recent)
        historyContent.scrollTop = 0;
    }
    
    // ✅ CRITICAL FIX: Update player areas (called by updateUI but was missing)
    updatePlayerAreas() {
        // Player areas are already displayed in the scores table
        // This method is kept for consistency with other games
        // Additional player visualization can be added here if needed
        const playerAreasContainer = document.getElementById('playerAreas');
        if (playerAreasContainer && this.game.players) {
            playerAreasContainer.innerHTML = '';
            
            this.game.players.forEach((player, index) => {
                if (!player) return;
                
                const playerArea = document.createElement('div');
                playerArea.className = `player-area ${index === this.game.currentPlayer ? 'active' : ''}`;
                playerArea.setAttribute('data-player-index', index);
                
                const cardCount = Array.isArray(player.hand) ? player.hand.length : 0;
                playerArea.innerHTML = `
                    <div class="player-name">${player.name || `Player ${index + 1}`}</div>
                    <div class="player-cards-count">${cardCount} cards</div>
                    ${player.isBot ? '<div class="bot-indicator">🤖 Bot</div>' : ''}
                `;
                
                playerAreasContainer.appendChild(playerArea);
            });
        }
    }

    // Update battle area
    updateBattleArea() {
        const battleArea = document.getElementById('battleArea');
        if (!battleArea) return;
        
        // ✅ CRITICAL FIX: Clear existing content but preserve particles
        const particles = battleArea.querySelectorAll('.battle-particle, .war-particle');
        battleArea.innerHTML = '';
        particles.forEach(p => battleArea.appendChild(p));
        
        // Show battle cards with proper card images and animations
        if (this.game.battleCards && this.game.battleCards.length > 0) {
            this.game.battleCards.forEach((battleCard, index) => {
                // ✅ CRITICAL FIX: Validate battle card data
                if (!battleCard || !battleCard.card) {
                    console.warn(`⚠️ Invalid battle card at index ${index}`);
                    return;
                }
                
                const cardDiv = this.createCardElement(
                    battleCard.card, 
                    'battle-card',
                    {
                        animate: true,
                        delay: index * 1200, // ✅ CRITICAL FIX: Increased delay to 1200ms (1.2 seconds) for much better visibility
                        isWar: false,
                        faceUp: true
                    }
                );
                cardDiv.setAttribute('data-card-id', `battle-${index}`);
                cardDiv.setAttribute('data-player-index', battleCard.playerIndex || index);
                if (battleCard.playerIndex === this.localPlayerIndex) {
                    cardDiv.classList.add('my-card');
                }
            battleArea.appendChild(cardDiv);
        });
        }
        
        // Show war cards with flip animations
        if (this.game.warCards && this.game.warCards.length > 0) {
            // ✅ CRITICAL FIX: Filter out invalid war cards
            const validWarCards = this.game.warCards.filter(wc => wc && wc.card);
            
            if (validWarCards.length > 0) {
                // Group war cards by player
                const warCardsByPlayer = {};
                validWarCards.forEach((warCard, index) => {
                    const playerIndex = warCard.playerIndex !== undefined ? warCard.playerIndex : index;
                    if (!warCardsByPlayer[playerIndex]) {
                        warCardsByPlayer[playerIndex] = [];
                    }
                    warCardsByPlayer[playerIndex].push({...warCard, originalIndex: index});
                });
                
                // Create war card groups
                Object.keys(warCardsByPlayer).forEach((playerIndex, groupIndex) => {
                    const playerCards = warCardsByPlayer[playerIndex];
                    
                    // ✅ CRITICAL FIX: Validate player cards
                    if (!playerCards || playerCards.length === 0) return;
                    
                    // Create container for this player's war cards
                    const playerGroup = document.createElement('div');
                    playerGroup.className = 'war-card-group';
                    playerGroup.setAttribute('data-player-index', playerIndex);
                    
                    playerCards.forEach((warCard, cardIndex) => {
                        // ✅ CRITICAL FIX: Validate war card before creating element
                        if (!warCard || !warCard.card) {
                            console.warn(`⚠️ Invalid war card at index ${cardIndex}`);
                            return;
                        }
                        
                        const cardDiv = this.createCardElement(
                            warCard.card,
                            'battle-card war-card',
                            {
                                animate: true,
                                delay: (groupIndex * 1200 * 2) + (cardIndex * 1200), // ✅ CRITICAL FIX: Match battle card pace - 1200ms between cards (same as battles), 2400ms between groups
                                isWar: true,
                                faceUp: warCard.faceUp !== false // Default to face up if not specified
                            }
                        );
                        cardDiv.setAttribute('data-card-id', `war-${warCard.originalIndex}`);
                        cardDiv.setAttribute('data-player-index', playerIndex);
                        if (warCard.playerIndex === this.localPlayerIndex) {
                            cardDiv.classList.add('my-card');
                        }
                        
                        if (warCard.faceUp === false) {
                            cardDiv.classList.add('face-down');
                        }
                        
                        playerGroup.appendChild(cardDiv);
                    });
                    
                    if (playerGroup.children.length > 0) {
                        battleArea.appendChild(playerGroup);
                    }
                });
            }
        }
        
        // Show message if no cards with enhanced styling
        if ((!this.game.battleCards || this.game.battleCards.length === 0) && 
            (!this.game.warCards || this.game.warCards.length === 0)) {
            const messageDiv = document.createElement('div');
            messageDiv.className = 'battle-message';
            messageDiv.innerHTML = `
                <div class="battle-message-icon">⚔️</div>
                <div class="battle-message-text">Ready for battle!</div>
            `;
            battleArea.appendChild(messageDiv);
        }
    }
    
    // Create card element with proper image and animations
    createCardElement(card, className = '', options = {}) {
        // ✅ CRITICAL FIX: Validate card exists
        if (!card) {
            console.error('❌ Attempted to create card element with null/undefined card');
            const errorDiv = document.createElement('div');
            errorDiv.className = className || 'card';
            errorDiv.textContent = '?';
            errorDiv.style.background = '#ff0000';
            errorDiv.setAttribute('aria-label', 'Invalid card');
            return errorDiv;
        }
        
        const {
            animate = true,
            delay = 0,
            isWinner = false,
            isWar = false,
            faceUp = true
        } = options;
        
                const cardDiv = document.createElement('div');
        cardDiv.className = className || 'card';
        cardDiv.setAttribute('role', 'img');
        cardDiv.setAttribute('aria-label', faceUp ? `${card.name || 'Card'} (${this.getCardDisplayValue(card)})` : 'Face down card');
        
        // Add animation classes
        if (animate) {
            cardDiv.classList.add('card-enter');
            cardDiv.style.animationDelay = `${delay}ms`;
        }
        
        if (isWinner) {
            cardDiv.classList.add('card-winner');
        }
        
        if (isWar) {
            cardDiv.classList.add('card-war');
        }
        
        // Create card inner container for flip effect
        const cardInner = document.createElement('div');
        cardInner.className = 'card-inner';
        if (!faceUp) {
            cardInner.classList.add('flipped');
        }
        
        // Card front
        const cardFront = document.createElement('div');
        cardFront.className = 'card-front';
        
        // Card back
        const cardBack = document.createElement('div');
        cardBack.className = 'card-back';
        
        // ✅ CRITICAL FIX: Use actual card back image if available
        if (this.htmlCardBackImage && this.htmlCardBackImage.complete && this.htmlCardBackImage.naturalWidth > 0) {
            const cardBackImg = document.createElement('img');
            cardBackImg.src = this.htmlCardBackImage.src;
            cardBackImg.alt = 'Card Back';
            cardBackImg.className = 'card-back-image';
            cardBackImg.onerror = () => {
                // Fallback to pattern if image fails
                cardBackImg.style.display = 'none';
                cardBack.innerHTML = '<div class="card-back-pattern">🂠</div>';
            };
            cardBack.appendChild(cardBackImg);
        } else {
            // Try to use window.cardBackImage (p5.js) or fallback to pattern
            if (window.cardBackImage && window.cardBackImage.elt && window.cardBackImage.elt.src) {
                const cardBackImg = document.createElement('img');
                cardBackImg.src = window.cardBackImage.elt.src;
                cardBackImg.alt = 'Card Back';
                cardBackImg.className = 'card-back-image';
                cardBackImg.onerror = () => {
                    cardBackImg.style.display = 'none';
                    cardBack.innerHTML = '<div class="card-back-pattern">🂠</div>';
                };
                cardBack.appendChild(cardBackImg);
            } else {
                // Fallback to pattern if image not loaded
                cardBack.innerHTML = '<div class="card-back-pattern">🂠</div>';
            }
        }
        
        // ✅ CRITICAL FIX: Try to use card image if available with proper error handling and loading state
        if (card.name && faceUp) {
            const imageName = card.name.toLowerCase().replace(/\s+/g, '_');
            let imageSrc = null;
            
            // ✅ CRITICAL FIX: Try HTML images first (faster, more reliable)
            if (this.htmlCardImages[imageName] && this.htmlCardImages[imageName].complete && this.htmlCardImages[imageName].naturalWidth > 0) {
                imageSrc = this.htmlCardImages[imageName].src;
            }
            // ✅ CRITICAL FIX: Try p5.js images as fallback
            else if (window.cardImages && window.cardImages[imageName]) {
                const cardImage = window.cardImages[imageName];
                if (cardImage.elt && cardImage.elt.src) {
                    // p5.js image with HTML element
                    imageSrc = cardImage.elt.src;
                } else if (cardImage.canvas) {
                    // Convert canvas to data URL
                    imageSrc = cardImage.canvas.toDataURL('image/png');
                } else if (cardImage.width > 0) {
                    // Construct path from image name
                    imageSrc = `Images/${imageName}.png`;
                }
            }
            // ✅ CRITICAL FIX: Direct path fallback
            else {
                imageSrc = `Images/${imageName}.png`;
            }
            
            if (imageSrc) {
                const img = document.createElement('img');
                img.src = imageSrc;
                img.alt = card.name || 'Card';
                img.className = 'card-image';
                
                // ✅ CRITICAL FIX: Add loading state
                img.style.opacity = '0';
                img.style.transition = 'opacity 0.3s ease';
                
                img.onload = () => {
                    img.style.opacity = '1';
                };
                
                img.onerror = () => {
                    // ✅ CRITICAL FIX: Fallback if image fails to load
                    img.style.display = 'none';
                    const fallback = document.createElement('div');
                    fallback.className = 'card-text';
                    fallback.innerHTML = `
                        <div class="card-name">${card.name || 'Unknown'}</div>
                        <div class="card-value">${this.getCardDisplayValue(card)}</div>
                    `;
                    cardFront.appendChild(fallback);
                };
                
                cardFront.appendChild(img);
                
                // Add card value overlay
                const valueOverlay = document.createElement('div');
                valueOverlay.className = 'card-value-overlay';
                valueOverlay.textContent = this.getCardDisplayValue(card);
                cardFront.appendChild(valueOverlay);
            } else {
                // Fallback to text with enhanced styling
                const textDiv = document.createElement('div');
                textDiv.className = 'card-text';
                textDiv.innerHTML = `
                    <div class="card-name">${card.name || 'Unknown'}</div>
                    <div class="card-value">${this.getCardDisplayValue(card)}</div>
                `;
                cardFront.appendChild(textDiv);
            }
        } else if (faceUp) {
            // Fallback to text with enhanced styling
            const textDiv = document.createElement('div');
            textDiv.className = 'card-text';
            textDiv.innerHTML = `
                <div class="card-name">${card.name || 'Unknown'}</div>
                <div class="card-value">${this.getCardDisplayValue(card)}</div>
            `;
            cardFront.appendChild(textDiv);
        }
        
        cardInner.appendChild(cardFront);
        cardInner.appendChild(cardBack);
        cardDiv.appendChild(cardInner);
        
        // Add glow effect for high-value cards
        if (card.value && card.value >= 12) {
            cardDiv.classList.add('card-high-value');
        }
        
        return cardDiv;
    }
    
    // Get display value for card
    getCardDisplayValue(card) {
        // ✅ CRITICAL FIX: Validate card and handle edge cases
        if (!card) return '?';
        if (typeof card.value !== 'number') {
            // Try to get value from rank
            if (card.rank) {
                const rankUpper = card.rank.toUpperCase();
                if (rankUpper === 'ACE') return 'A';
                if (rankUpper === 'KING') return 'K';
                if (rankUpper === 'QUEEN') return 'Q';
                if (rankUpper === 'JACK') return 'J';
                return rankUpper;
            }
            return '?';
        }
        if (card.value === 14) return 'A';
        if (card.value === 13) return 'K';
        if (card.value === 12) return 'Q';
        if (card.value === 11) return 'J';
        if (card.value >= 2 && card.value <= 10) {
            return card.value.toString();
        }
        return card.value.toString();
    }
    
    // Animate card flip
    flipCard(cardElement, faceUp = true) {
        if (!cardElement) return;
        const cardInner = cardElement.querySelector('.card-inner');
        if (cardInner) {
            if (faceUp) {
                cardInner.classList.remove('flipped');
            } else {
                cardInner.classList.add('flipped');
            }
        }
    }
    
    // Animate card collection (cards moving to winner)
    animateCardCollection(cards, winnerIndex) {
        // ✅ CRITICAL FIX: Validate cards array
        if (!cards || !Array.isArray(cards) || cards.length === 0) {
            return;
        }
        
        // ✅ CRITICAL FIX: Filter out null/undefined cards
        const validCards = cards.filter(c => c);
        
        // ✅ CRITICAL FIX: Reduce delay based on number of players - fewer players = faster animation
        const playerCount = this.game.players.length;
        const delayPerCard = playerCount <= 2 ? 25 : 35; // Faster for 2 players (25ms) vs more players (35ms)
        
        validCards.forEach((card, index) => {
            // ✅ CRITICAL FIX: Use battle card index if available
            const cardId = card.id || `battle-${index}` || `war-${index}`;
            const cardElement = document.querySelector(`[data-card-id="${cardId}"]`);
            if (cardElement) {
                // ✅ CRITICAL FIX: Track timeout for cleanup - reduced delay for faster card collection
                this.safeSetTimeout(() => {
                    cardElement.classList.add('collecting');
                    // Create flying card
                    this.createFlyingCard(cardElement, winnerIndex, playerCount);
                }, index * delayPerCard);
            }
        });
    }
    
    // Create flying card animation
    createFlyingCard(sourceElement, targetIndex, playerCount = 4) {
        // ✅ CRITICAL FIX: Validate source element
        if (!sourceElement || !sourceElement.parentNode) {
            return;
        }
        
        const flyingCard = sourceElement.cloneNode(true);
        flyingCard.classList.add('flying-card');
        flyingCard.style.position = 'fixed';
        flyingCard.style.zIndex = '10000';
        flyingCard.style.pointerEvents = 'none';
        
        try {
            const rect = sourceElement.getBoundingClientRect();
            flyingCard.style.left = rect.left + 'px';
            flyingCard.style.top = rect.top + 'px';
            flyingCard.style.width = rect.width + 'px';
            flyingCard.style.height = rect.height + 'px';
            
            document.body.appendChild(flyingCard);
            
            // Get target position (player area)
            const targetElement = document.querySelector(`[data-player-index="${targetIndex}"]`);
            const targetRect = targetElement ? targetElement.getBoundingClientRect() : { 
                left: window.innerWidth / 2, 
                top: window.innerHeight / 2 
            };
            
            // ✅ CRITICAL FIX: Faster animation for fewer players - reduce duration and cleanup time
            const animationDuration = playerCount <= 2 ? '0.5s' : '0.6s'; // Faster for 2 players (0.5s) vs more players (0.6s)
            const cleanupDelay = playerCount <= 2 ? 500 : 600; // Faster cleanup for 2 players (500ms) vs more players (600ms)
            
            // ✅ CRITICAL FIX: Animate with tracked timeouts
            this.safeSetTimeout(() => {
                if (flyingCard.parentNode) {
                    flyingCard.style.transition = `all ${animationDuration} cubic-bezier(0.68, -0.55, 0.265, 1.55)`;
                    flyingCard.style.left = targetRect.left + 'px';
                    flyingCard.style.top = targetRect.top + 'px';
                    flyingCard.style.transform = 'scale(0.3) rotate(360deg)';
                    flyingCard.style.opacity = '0';
                    
                    this.safeSetTimeout(() => {
                        if (flyingCard.parentNode) {
                            flyingCard.remove();
                        }
                    }, cleanupDelay);
                }
            }, 10);
        } catch (error) {
            console.error('❌ Error creating flying card:', error);
            if (flyingCard.parentNode) {
                flyingCard.remove();
            }
        }
    }

    // Update player areas
    updatePlayerAreas() {
        // Update player visualization in the game area
        // The scores table already shows player info, but we can add visual indicators
        const scoresBody = document.getElementById('scoresBody');
        if (scoresBody) {
            // Highlight current player or winner
            const rows = scoresBody.querySelectorAll('tr');
            rows.forEach((row, index) => {
                row.classList.remove('active', 'winner');
                if (this.game.currentPlayer === index && !this.game.gameOver) {
                    row.classList.add('active');
                }
                if (this.game.gameOver && this.game.winner && this.game.winner.name === this.game.players[index]?.name) {
                    row.classList.add('winner');
                }
            });
        }
    }

    // Show war message
    showWarMessage(message, type) {
        const warMessage = document.getElementById('warMessage');
        if (!warMessage) {
            console.warn('⚠️ War message element not found');
            return;
        }
        
        warMessage.textContent = message || '';
        warMessage.className = `war-message ${type || 'battle'}`;
        warMessage.style.display = 'block';
        
        // ✅ CRITICAL FIX: Position message above the battle-area box, shifted left but still centered over game box
        // Battle-area is at top: 50%, left: 50%, so we position well above it and slightly to the left
        warMessage.style.position = 'fixed'; // ✅ CRITICAL FIX: Use fixed positioning
        warMessage.style.top = '25%'; // ✅ CRITICAL FIX: Position well above battle-area (which is at 50%) to avoid overlap
        warMessage.style.left = '43%'; // ✅ CRITICAL FIX: Position more to the left, but still over the game box
        warMessage.style.transform = 'translate(-50%, -50%)'; // ✅ CRITICAL FIX: Center both axes
        warMessage.style.zIndex = '2500'; // ✅ CRITICAL FIX: Ensure it's above canvas but below buttons
        warMessage.style.opacity = '1';
        warMessage.style.visibility = 'visible';
        console.log('✅ War message shown above battle-area, shifted left, no overlap');
    }

    // Hide war message
    hideWarMessage() {
        const warMessage = document.getElementById('warMessage');
        if (warMessage) {
            warMessage.style.display = 'none';
            warMessage.style.opacity = '0';
        }
    }

    // Show action controls
    showActionControls() {
        const actionControls = document.getElementById('actionControls');
        if (actionControls) {
            // ✅ CRITICAL FIX: Force all positioning styles to ensure bottom center placement with maximum specificity
            actionControls.style.cssText = `
                display: flex !important;
                opacity: 1 !important;
                z-index: 3000 !important;
                pointer-events: auto !important;
                position: fixed !important;
                bottom: 60px !important;
                top: auto !important;
                left: 50% !important;
                right: auto !important;
                transform: translateX(-50%) !important;
                width: auto !important;
                margin: 0 !important;
                padding: 0 !important;
            `;
            console.log('✅ Action controls shown at bottom center (fixed position with forced CSS)');
            
            // ✅ CRITICAL FIX: Reset button state when showing controls and ensure proper positioning
            const battleBtn = document.getElementById('battleBtn');
            if (battleBtn) {
                battleBtn.disabled = !this.canAct || this.game.gameOver;
                battleBtn.textContent = battleBtn.dataset.originalText || '⚔️ BATTLE!';
                battleBtn.style.opacity = battleBtn.disabled ? '0.5' : '1';
                battleBtn.style.cursor = battleBtn.disabled ? 'not-allowed' : 'pointer';
                battleBtn.style.pointerEvents = 'auto';
                battleBtn.style.zIndex = '3001';
                battleBtn.style.position = 'relative'; // Ensure button is positioned correctly within action-controls
                battleBtn.style.margin = '0'; // ✅ CRITICAL FIX: Remove any margins
                battleBtn.style.top = 'auto'; // ✅ CRITICAL FIX: Ensure top is not set
                battleBtn.style.left = 'auto'; // ✅ CRITICAL FIX: Ensure left is not set
                battleBtn.style.right = 'auto'; // ✅ CRITICAL FIX: Ensure right is not set
                battleBtn.style.bottom = 'auto'; // ✅ CRITICAL FIX: Ensure bottom is not set (let parent control)
                console.log('✅ Battle button reset and made clickable at bottom center');
            } else {
                console.warn('⚠️ Battle button not found');
            }
        } else {
            console.error('❌ Action controls container not found');
        }
    }

    // Hide action controls
    hideActionControls() {
        const actionControls = document.getElementById('actionControls');
        if (actionControls) {
            actionControls.style.display = 'none';
            actionControls.style.opacity = '0';
        }
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
    showGameControls(data = null) {
        const addBotBtn = document.getElementById('addBotBtn');
        const removeBotBtn = document.getElementById('removeBotBtn');
        const startGameBtn = document.getElementById('startGameBtn');
        
        // ✅ CRITICAL FIX: Check if we're the room creator - try multiple sources
        const isRoomCreator = window.isRoomCreator || 
                              window.gameFramework?.isRoomCreator || 
                              (data?.isRoomCreator !== undefined ? data.isRoomCreator : false) ||
                              false;
        
        console.log('🔍 showGameControls - isRoomCreator check:', {
            'window.isRoomCreator': window.isRoomCreator,
            'window.gameFramework?.isRoomCreator': window.gameFramework?.isRoomCreator,
            'data?.isRoomCreator': data?.isRoomCreator,
            'final': isRoomCreator
        });
        
        if (addBotBtn) {
            addBotBtn.style.display = isRoomCreator ? 'inline-block' : 'none';
            if (isRoomCreator) {
            addBotBtn.style.setProperty('background-color', '#4CAF50', 'important');
            addBotBtn.style.setProperty('color', 'white', 'important');
            addBotBtn.style.setProperty('border', 'none', 'important');
            console.log('✅ Add Bot button shown and styled green');
            } else {
                console.log('❌ Add Bot button hidden - not room creator');
            }
        } else {
            console.error('❌ addBotBtn element not found');
        }
        
        if (removeBotBtn) {
            removeBotBtn.style.display = isRoomCreator ? 'inline-block' : 'none';
            if (isRoomCreator) {
            removeBotBtn.style.setProperty('background-color', '#f44336', 'important');
            removeBotBtn.style.setProperty('color', 'white', 'important');
            removeBotBtn.style.setProperty('border', 'none', 'important');
            console.log('✅ Remove Bot button shown and styled red');
            } else {
                console.log('❌ Remove Bot button hidden - not room creator');
            }
        } else {
            console.error('❌ removeBotBtn element not found');
        }
        
        if (startGameBtn) {
            startGameBtn.style.display = isRoomCreator ? 'inline-block' : 'none';
            if (isRoomCreator) {
            startGameBtn.style.setProperty('background-color', '#FF9800', 'important');
            startGameBtn.style.setProperty('color', 'white', 'important');
            startGameBtn.style.setProperty('border', 'none', 'important');
                // Button will be enabled/disabled by updateStartGameButton based on player count
            console.log('✅ Start Game button shown and styled orange');
            } else {
                console.log('❌ Start Game button hidden - not room creator');
            }
        } else {
            console.error('❌ startGameBtn element not found');
        }
        
        // Show game menu button (always visible)
        const gameMenuBtn = document.getElementById('gameMenuBtn');
        if (gameMenuBtn) {
            gameMenuBtn.style.display = 'inline-block';
            console.log('✅ Game Menu button shown');
        }
    }

    // ✅ CRITICAL FIX: Setup navigation buttons with proper event handlers
    setupNavigationButtons() {
        // ✅ CRITICAL FIX: Get buttons from Game section specifically (not Menu section)
        const gameSection = document.getElementById('Game');
        const backToMainMenuBtn = gameSection ? gameSection.querySelector('#backToMainMenuBtn') : document.getElementById('backToMainMenuBtn');
        const backToWarMenuBtn = gameSection ? gameSection.querySelector('#backToWarMenuBtn') : document.getElementById('backToWarMenuBtn');
        
        if (backToMainMenuBtn) {
            // ✅ CRITICAL FIX: Remove ALL existing handlers first (both onclick and addEventListener)
            backToMainMenuBtn.onclick = null;
            // Remove all event listeners by cloning the node
            const newBtn = backToMainMenuBtn.cloneNode(true);
            const parent = backToMainMenuBtn.parentNode;
            parent.replaceChild(newBtn, backToMainMenuBtn);
            const btn = parent.querySelector('#backToMainMenuBtn');
            
            if (btn) {
                // ✅ CRITICAL FIX: Add event handler with maximum priority
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    console.log('🔙 Back to Main Menu clicked - navigating to /');
                    // Navigate to main menu (home page) immediately
                    window.location.href = '/';
                }, true); // Use capture phase for maximum priority
                
                // Also set onclick as backup
                btn.onclick = function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🔙 Back to Main Menu clicked (onclick) - navigating to /');
                    window.location.href = '/';
                };
                
                btn.setAttribute('aria-label', 'Back to Main Menu');
                btn.style.cssText = `
                    pointer-events: auto !important;
                    cursor: pointer !important;
                    z-index: 3001 !important;
                    position: relative !important;
                `;
                console.log('✅ Back to Main Menu button setup and functional', btn);
            } else {
                console.error('❌ Failed to find button after cloning');
            }
        } else {
            console.error('❌ Back to Main Menu button not found in Game section');
        }
        
        if (backToWarMenuBtn) {
            // ✅ CRITICAL FIX: Remove ALL existing handlers first
            backToWarMenuBtn.onclick = null;
            const newBtn = backToWarMenuBtn.cloneNode(true);
            const parent = backToWarMenuBtn.parentNode;
            parent.replaceChild(newBtn, backToWarMenuBtn);
            const btn = parent.querySelector('#backToWarMenuBtn');
            
            if (btn) {
                // ✅ CRITICAL FIX: Add event handler with maximum priority
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    console.log('⚔️ War Menu clicked - navigating to /war.html');
                    window.location.href = '/war.html';
                }, true); // Use capture phase for maximum priority
                
                // Also set onclick as backup
                btn.onclick = function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('⚔️ War Menu clicked (onclick) - navigating to /war.html');
                    window.location.href = '/war.html';
                };
                
                btn.setAttribute('aria-label', 'War Menu');
                btn.style.cssText = `
                    pointer-events: auto !important;
                    cursor: pointer !important;
                    z-index: 3001 !important;
                    position: relative !important;
                `;
                console.log('✅ War Menu button setup and functional', btn);
            } else {
                console.error('❌ Failed to find button after cloning');
            }
        } else {
            console.error('❌ War Menu button not found in Game section');
        }
    }

    // Copy room code
    copyRoomCode() {
        const roomCodeText = document.getElementById('roomCodeText');
        const copySuccessMessage = document.getElementById('copySuccessMessage');
        
        if (!roomCodeText || !roomCodeText.textContent) {
            UIUtils.showGameMessage('No room code to copy', 'error');
            return;
        }
        
        const roomCode = roomCodeText.textContent;
        
        // ✅ CRITICAL FIX: Use clipboard API with fallback
        if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(roomCode).then(() => {
            UIUtils.showGameMessage('Room code copied to clipboard!', 'success');
                
                // Show success message in UI
                if (copySuccessMessage) {
                    copySuccessMessage.style.display = 'block';
                    this.safeSetTimeout(() => {
                        if (copySuccessMessage) {
                            copySuccessMessage.style.display = 'none';
                        }
                    }, 2000);
                }
            }).catch(err => {
                console.error('Failed to copy room code:', err);
                UIUtils.showGameMessage('Failed to copy room code. Please copy manually.', 'error');
            });
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = roomCode;
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                UIUtils.showGameMessage('Room code copied to clipboard!', 'success');
                if (copySuccessMessage) {
                    copySuccessMessage.style.display = 'block';
                    this.safeSetTimeout(() => {
                        if (copySuccessMessage) {
                            copySuccessMessage.style.display = 'none';
                        }
                    }, 2000);
                }
            } catch (err) {
                console.error('Fallback copy failed:', err);
                UIUtils.showGameMessage('Failed to copy room code. Please copy manually.', 'error');
            }
            document.body.removeChild(textArea);
        }
    }
    
    // ✅ CRITICAL FIX: Update player list
    updatePlayerList(players) {
        const playerList = document.getElementById('playerList');
        if (!playerList) return;
        
        if (!players || !Array.isArray(players) || players.length === 0) {
            playerList.innerHTML = '<div style="color: white; padding: 10px; text-align: center;">No players in room</div>';
            return;
        }
        
        playerList.innerHTML = '';
        
        players.forEach((player, index) => {
            if (!player) return;
            
            const playerItem = document.createElement('div');
            playerItem.className = 'player-item';
            playerItem.setAttribute('data-player-index', index);
            
            const isLocalPlayer = index === this.localPlayerIndex;
            const cardCount = Array.isArray(player.hand) ? player.hand.length : 0;
            
            playerItem.innerHTML = `
                <div class="player-name">${isLocalPlayer ? 'You' : (player.name || `Player ${index + 1}`)}${player.isBot ? ' 🤖' : ''}</div>
                <div class="player-cards">${cardCount} cards</div>
            `;
            
            if (player.isBot) {
                playerItem.querySelector('.player-name').style.color = '#4CAF50';
            }
            
            playerList.appendChild(playerItem);
        });
    }
    
    // ✅ CRITICAL FIX: Update start game button state
    updateStartGameButton(players) {
        const startGameBtn = document.getElementById('startGameBtn');
        if (!startGameBtn) return;
        
        const isRoomCreator = window.isRoomCreator || window.gameFramework?.isRoomCreator || false;
        
        if (!isRoomCreator) {
            startGameBtn.style.display = 'none';
            return;
        }
        
        // ✅ CRITICAL FIX: Validate player count (min: 2, max: 4 for War)
        const playerCount = players && Array.isArray(players) ? players.length : 0;
        const minPlayers = 2;
        const maxPlayers = 4;
        
        // Disable if below minimum or above maximum
        startGameBtn.disabled = playerCount < minPlayers || playerCount > maxPlayers;
        
        if (playerCount < minPlayers) {
            startGameBtn.title = `Need at least ${minPlayers} players to start (current: ${playerCount})`;
            startGameBtn.style.opacity = '0.5';
        } else if (playerCount > maxPlayers) {
            startGameBtn.title = `Too many players. Maximum ${maxPlayers} players allowed (current: ${playerCount})`;
            startGameBtn.style.opacity = '0.5';
        } else {
            startGameBtn.title = 'Start the game';
            startGameBtn.style.opacity = '1';
        }
        
        // ✅ CRITICAL FIX: Update Add Bot button state based on player count
        this.updateAddBotButtonState(playerCount);
    }
    
    // ✅ CRITICAL FIX: Update Add Bot button state
    updateAddBotButtonState(playerCount) {
        const addBotBtn = document.getElementById('addBotBtn');
        if (!addBotBtn) return;
        
        const isRoomCreator = window.isRoomCreator || window.gameFramework?.isRoomCreator || false;
        if (!isRoomCreator) {
            return; // Only room creator can add bots
        }
        
        const maxPlayers = 4; // War supports up to 4 players
        
        if (playerCount >= maxPlayers) {
            addBotBtn.disabled = true;
            addBotBtn.style.opacity = '0.5';
            addBotBtn.title = `Room is full (${maxPlayers} players maximum)`;
            console.log(`✅ Add Bot button disabled - room is full (${playerCount}/${maxPlayers})`);
        } else {
            addBotBtn.disabled = false;
            addBotBtn.style.opacity = '1';
            addBotBtn.title = `Add a bot player (${playerCount}/${maxPlayers})`;
            console.log(`✅ Add Bot button enabled - room has space (${playerCount}/${maxPlayers})`);
        }
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
    const cardWidth = 70; // Increased from 50
    const cardHeight = 98; // Increased from 70 (maintaining aspect ratio)
    const spacing = 25; // Increased spacing
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
        
        // Draw card content
        if (card.name) {
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
        }
        
        pop();
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
