// 🚢 BATTLESHIP GAME LOGIC

class BattleshipGame {
    constructor() {
        this.gridSize = 10;
        this.ships = [
            { name: 'Carrier', type: 'carrier', size: 5, color: '#FF6B6B', placed: false },
            { name: 'Battleship', type: 'battleship', size: 4, color: '#4ECDC4', placed: false },
            { name: 'Cruiser', type: 'cruiser', size: 3, color: '#45B7D1', placed: false },
            { name: 'Submarine', type: 'submarine', size: 3, color: '#96CEB4', placed: false },
            { name: 'Destroyer', type: 'destroyer', size: 2, color: '#FFEAA7', placed: false }
        ];
        
        this.gamePhase = 'placement'; // placement, playing, finished
        this.currentPlayer = 0; // 0 = player1, 1 = player2 (in multiplayer)
        this.gameOver = false;
        this.winner = null;
        
        // Multiplayer state
        this.isMultiplayer = false; // Initialize to false for single-player mode
        this.playerReady = false;
        this.opponentReady = false;
        this.playerId = null;
        this.opponentId = null;
        this.isPlayerTurn = false;
        
        // Grids: 0 = human, 1 = AI
        this.playerGrids = [
            this.createEmptyGrid(), // Human grid
            this.createEmptyGrid()  // AI grid
        ];
        
        this.attackGrids = [
            this.createEmptyGrid(), // Human's view of AI grid
            this.createEmptyGrid()  // AI's view of human grid
        ];
        
        this.placedShips = [[], []]; // [humanShips, aiShips]
        this.gameHistory = [];
        this.currentShip = null;
        this.draggedShip = null;
        this.dragOffset = { x: 0, y: 0 };
        
        // AI targeting
        this.aiTargets = [];
        this.aiHits = [];
        this.aiMode = 'hunt'; // hunt, target
        this.aiLastHit = null;
        this.aiTurnScheduled = false; // Prevent double AI turns
        
        // Scoreboard tracking
        this.playerScore = 0;
        this.aiScore = 0;
        this.playerHits = 0;
        this.playerMisses = 0;
        this.aiHitsCount = 0;
        this.aiMisses = 0;
        this.shipsSunk = 0;
        
        // Game tracking (persists across games)
        this.playerGamesWon = 0;
        this.aiGamesWon = 0;
        this.totalPlayerShipsSunk = 0; // Total ships sunk by player across all games
        this.totalAiShipsSunk = 0; // Total ships sunk by AI across all games
        this.totalOpponentShipsSunk = 0; // Total ships sunk by opponent (AI) from player across all games
        
        // Current game tracking (resets each game)
        this.currentGamePlayerShipsSunk = 0;
        this.currentGameAiShipsSunk = 0;
        
        this.initializeGame();
        this.imagesChecked = false; // Initialize images checked flag
    }
    
    createEmptyGrid() {
        const grid = [];
        for (let i = 0; i < this.gridSize; i++) {
            grid[i] = [];
            for (let j = 0; j < this.gridSize; j++) {
                grid[i][j] = { 
                    ship: null, 
                    hit: false, 
                    miss: false,
                    shipId: null
                };
            }
        }
        return grid;
    }
    
    initializeGame() {
        // Check for room settings from menu
        const roomCode = localStorage.getItem('battleshipRoomCode');
        const playerCount = localStorage.getItem('battleshipPlayerCount');
        const gameMode = localStorage.getItem('battleshipGameMode');
        
        if (roomCode) {
            this.addToHistory(`🚢 Room Code: ${roomCode}`, 'info');
            this.addToHistory(`👥 Players: ${playerCount || 2}`, 'info');
            this.addToHistory(`🎮 Mode: ${gameMode || 'create'}`, 'info');
            
            // Initialize multiplayer if in multiplayer mode
            console.log('🚢 Game initialization - gameMode:', gameMode, 'roomCode:', roomCode);
            if (gameMode === 'multiplayer') {
                console.log('🚢 Multiplayer mode detected, room:', roomCode);
                this.isMultiplayer = true;
                this.initializeMultiplayer(roomCode);
            } else if (gameMode === 'singleplayer') {
                console.log('🚢 Single player mode detected (player vs bot)');
                this.isMultiplayer = false;
                this.roomCode = null; // No room code needed for single-player
            } else {
                console.log('🚢 No specific mode set, defaulting to single player');
                this.isMultiplayer = false;
            }
            
            // Don't clear localStorage here - let the HTML script handle it
            // This prevents race conditions between the game initialization and socket setup
        }
        
        // CRITICAL FIX: Show prominent message to start positioning ships
        this.addToHistory('🎮 Game initialized!', 'success');
        this.showGameMessage('⚓ START POSITIONING YOUR SHIPS! Click on a ship in the left panel, then click on the grid to place it.', 6000);
        this.addToHistory('⚓ Click on a ship in the "Your Fleet" panel (left side) to select it, then click on your grid to place it.', 'info');
        this.addToHistory('💡 Tip: Press "R" to rotate ships. Place all 5 ships to start the battle!', 'info');
        this.updateUI();
        console.log('🎨 About to render ships list...');
        this.renderShipsList();
        console.log('✅ Ships list rendered');
        
        // Force visual update to show the message
        if (window.battleshipClient) {
            setTimeout(() => {
                window.battleshipClient.staticRender();
            }, 100);
        }
    }
    
    initializeMultiplayer(roomCode) {
        console.log('🚢 Initializing battleship multiplayer for room:', roomCode);
        this.roomCode = roomCode;
        this.isMultiplayer = true;
        
        // Wait for socket to be available and connected
        const waitForSocket = () => {
            this.socket = window.battleshipSocket;
            this.playerId = this.socket ? this.socket.id : null;
            
            console.log('🚢 Multiplayer setup:');
            console.log('🚢 - roomCode:', this.roomCode);
            console.log('🚢 - isMultiplayer:', this.isMultiplayer);
            console.log('🚢 - playerId:', this.playerId);
            console.log('🚢 - battleshipSocket:', !!this.socket);
            console.log('🚢 - socket.connected:', this.socket?.connected);
            
            if (this.socket && this.socket.connected) {
                console.log('🚢 Using battleship socket, player ID:', this.playerId);
                this.setupMultiplayerListeners();
                
                // ✅ CRITICAL FIX: Update UI to show multiplayer mode
                this.updateUI();
                console.log('🚢 UI updated for multiplayer mode');
            } else {
                console.log('🚢 Socket not ready yet, retrying in 100ms...');
                setTimeout(waitForSocket, 100);
            }
        };
        
        waitForSocket();
    }
    
    setupMultiplayerListeners() {
        if (!this.socket) return;
        
        // Prevent duplicate event listeners
        if (this.listenersSetup) {
            console.log('🚢 Listeners already setup, skipping');
            return;
        }
        this.listenersSetup = true;
        
        // Handle player ready events
        this.socket.on('battleshipPlayerReady', (data) => {
            console.log('🚢 Player ready received:', data);
            this.handlePlayerReady(data);
        });
        
        // Handle game start when both players are ready
        this.socket.on('battleshipGameStart', (data) => {
            console.log('🚢 Game start received:', data);
            this.handleGameStart(data);
        });
        
        // Handle ship placement events
        this.socket.on('battleshipShipPlaced', (data) => {
            console.log('🚢 Received ship placement from opponent:', data);
            this.handleOpponentShipPlaced(data);
        });
        
        // Handle attack events
        this.socket.on('battleshipAttack', (data) => {
            console.log('🚢 Received attack from opponent:', data);
            this.handleOpponentAttack(data);
        });
        
        // Handle attack confirmation events (for the attacker)
        this.socket.on('battleshipAttackResult', (data) => {
            console.log('🚢 Received attack result confirmation:', data);
            this.handleAttackResult(data);
        });
        
        // Handle turn change events
        this.socket.on('battleshipTurnChange', (data) => {
            console.log('🚢 Turn change received:', data);
            this.handleTurnChange(data);
        });
        
        // Handle game over events
        this.socket.on('battleshipGameOver', (data) => {
            console.log('🚢 Game over received:', data);
            this.handleGameOver(data);
        });
    }
    
    handlePlayerReady(data) {
        console.log('🚢 Handling player ready:', data);
        
        if (data.playerId !== this.playerId) {
            this.opponentReady = true;
            this.opponentId = data.playerId;
            this.addToHistory('✅ Opponent is ready!', 'success');
        } else {
            // This is our own ready event
            this.playerReady = true;
            this.addToHistory('✅ You are ready!', 'success');
        }
        
        // If both players are ready, start the game
        if (this.playerReady && this.opponentReady) {
            this.addToHistory('🚀 Both players ready! Starting game...', 'success');
            this.emitGameStart();
        }
    }
    
    handleGameStart(data) {
        console.log('🚢 Handling game start:', data);
        console.log('🚢 Game phase before setting:', this.gamePhase);
        
        // Use server-assigned first player instead of random assignment
        if (data.firstPlayerId) {
            this.isPlayerTurn = (data.firstPlayerId === this.playerId);
            this.currentPlayer = this.isPlayerTurn ? 0 : 1;
            console.log(`🚢 Server assigned first turn to: ${data.firstPlayerId}, isPlayerTurn: ${this.isPlayerTurn}`);
        } else {
            // Fallback to random assignment if server doesn't provide firstPlayerId
            const isPlayer1Turn = Math.random() < 0.5;
            this.isPlayerTurn = isPlayer1Turn;
            this.currentPlayer = isPlayer1Turn ? 0 : 1;
            console.log('🚢 No firstPlayerId from server, using random assignment');
        }
        
        this.gamePhase = 'playing';
        console.log('🚢 Game phase after setting:', this.gamePhase);
        
        this.addToHistory('🚀 Multiplayer battle started!', 'success');
        
        if (this.isPlayerTurn) {
            this.addToHistory('🎯 Your turn to attack!', 'info');
        } else {
            this.addToHistory('⏳ Opponent\'s turn to attack...', 'info');
        }
        
        this.updateUI();
        console.log('🚢 Game phase after updateUI:', this.gamePhase);
        
        // Force a redraw to ensure the UI is updated
        if (window.battleshipClient) {
            window.battleshipClient.staticRender();
        }
    }
    
    handleTurnChange(data) {
        console.log('🚢 Handling turn change:', data);
        
        // In multiplayer, player 0 is always the human player
        this.isPlayerTurn = data.currentPlayer === 0;
        this.currentPlayer = data.currentPlayer;
        
        if (this.isPlayerTurn) {
            this.addToHistory('🎯 Your turn to attack!', 'info');
        } else {
            this.addToHistory('⏳ Opponent\'s turn to attack...', 'info');
        }
        
        this.updateUI();
        
        // Force a redraw to show the updated turn state
        if (window.battleshipClient) {
            window.battleshipClient.staticRender();
        }
    }
    
    handleOpponentShipPlaced(data) {
        // Update opponent's ship placement
        console.log('🚢 Handling opponent ship placement:', data);
        // This would update the opponent's grid display
    }
    
    handleOpponentAttack(data) {
        // Handle attack on player's grid
        console.log('🚢 Handling opponent attack:', data);
        const { x, y, attackingPlayerId } = data;
        
        console.log('🚢 Current playerId:', this.playerId);
        console.log('🚢 Attacking playerId:', attackingPlayerId);
        
        // Only process attacks from the opponent, not our own attacks
        if (attackingPlayerId === this.playerId) {
            console.log('🚢 Ignoring own attack');
            return;
        }
        
        // Initialize processed attacks set if it doesn't exist
        if (!this.processedAttacks) {
            this.processedAttacks = new Set();
        }
        
        // Check if this attack has already been processed (deduplication)
        const attackKey = `${attackingPlayerId}-${x}-${y}`;
        if (this.processedAttacks.has(attackKey)) {
            console.log('🚢 Ignoring duplicate attack:', attackKey);
            return;
        }
        
        // Mark this attack as processed
        this.processedAttacks.add(attackKey);
        
        console.log(`🚢 Attack coordinates: x=${x}, y=${y}`);
        
        // Determine if the attack is a hit or miss based on our own ships
        const gameInstance = window.battleshipGame || this.game;
        if (!gameInstance) {
            console.log('🚢 ERROR: No game instance available for attack handling');
            return;
        }
        
        const cell = gameInstance.playerGrids[0][y][x];
        const isHit = cell.ship !== null;
        
        console.log(`🚢 Attack result: hit=${isHit}, ship=${cell.ship ? cell.ship.name : 'none'}`);
        
        // Update player's grid with the attack result
        if (gameInstance.playerGrids[0][y] && gameInstance.playerGrids[0][y][x]) {
            gameInstance.playerGrids[0][y][x].hit = isHit;
            gameInstance.playerGrids[0][y][x].miss = !isHit;
            console.log(`🚢 Updated player grid [${y}][${x}]: hit=${isHit}, miss=${!isHit}`);
        } else {
            console.log(`🚢 ERROR: Player grid [${y}][${x}] not found!`);
        }
        
        // ✅ CRITICAL FIX: Don't update attack grid here - this is the defender's view
        // The attack grid should only be updated when the attacker receives confirmation
        // from the server, not when processing the opponent's attack
        console.log(`🚢 Defender processing attack - not updating attack grid`);
        
        // Handle ship damage if it's a hit
        let shipSunk = false;
        let shipName = null;
        
        if (isHit && cell.ship) {
            cell.ship.hits++;
            shipName = cell.ship.name;
            console.log(`🚢 Ship ${cell.ship.name} hit! Hits: ${cell.ship.hits}/${cell.ship.size}`);
            
            // Check if ship is sunk
            if (cell.ship.hits >= cell.ship.size) {
                cell.ship.sunk = true;
                shipSunk = true;
                console.log(`🚢 Ship ${cell.ship.name} sunk!`);
                gameInstance.addToHistory(`💥 Opponent sunk your ${cell.ship.name}!`, 'sunk');
            } else {
                // CRITICAL FIX: Don't reveal which ship was hit
                gameInstance.addToHistory(`💥 Opponent hit your ship!`, 'hit');
            }
        } else {
            // CRITICAL FIX: Show who missed
            gameInstance.addToHistory(`💧 Opponent missed!`, 'miss');
        }
        
        // ✅ CRITICAL FIX: Send attack result back to server for the attacker
        if (this.isMultiplayer && this.socket && this.roomCode) {
            this.socket.emit('battleshipAttackResult', {
                roomId: this.roomCode,
                x: x,
                y: y,
                hit: isHit,
                shipSunk: shipSunk,
                shipName: shipName,
                attackingPlayerId: attackingPlayerId
            });
            console.log(`🚢 Sent attack result to server: hit=${isHit}, shipSunk=${shipSunk}, shipName=${shipName}`);
        }
        
        // Force redraw
        if (window.battleshipClient) {
            window.battleshipClient.staticRender();
        }
    }
    
    handleAttackResult(data) {
        // Handle attack result confirmation for the attacker
        console.log('🚢 Handling attack result confirmation:', data);
        const { x, y, hit, shipSunk, shipName } = data;
        
        const gameInstance = window.battleshipGame || this.game;
        if (!gameInstance) {
            console.log('🚢 ERROR: No game instance available for attack result handling');
            return;
        }
        
        // Update the attacker's attack grid with the confirmed result
        if (gameInstance.attackGrids[0][y] && gameInstance.attackGrids[0][y][x]) {
            gameInstance.attackGrids[0][y][x].hit = hit;
            gameInstance.attackGrids[0][y][x].miss = !hit;
            console.log(`🚢 Updated attacker's attack grid [${y}][${x}]: hit=${hit}, miss=${!hit}`);
        } else {
            console.log(`🚢 ERROR: Attack grid [${y}][${x}] not found!`);
        }
        
        // Add to history
        if (hit) {
            if (shipSunk) {
                // Show ship name when sunk (it's okay to reveal when ship is destroyed)
                gameInstance.addToHistory(`💥 You sunk opponent's ${shipName}!`, 'sunk');
            } else {
                // CRITICAL FIX: Don't reveal which ship was hit
                gameInstance.addToHistory(`💥 You hit!`, 'hit');
            }
        } else {
            // CRITICAL FIX: Show who missed (in multiplayer, the attacker is always "You" from attacker's perspective)
            gameInstance.addToHistory(`💧 You missed!`, 'miss');
        }
        
        // Force redraw
        if (window.battleshipClient) {
            window.battleshipClient.staticRender();
        }
    }
    
    handleShipSunk(player, shipName) {
        // Find and mark the ship as sunk
        const ships = this.placedShips[player];
        const ship = ships.find(s => s.name === shipName);
        
        if (ship) {
            ship.sunk = true;
            console.log(`🚢 Ship ${shipName} sunk for player ${player}`);
            this.addToHistory(`💥 Your ${shipName} has been sunk!`, 'error');
        }
    }
    
    handleGameOver(data) {
        console.log('🚢 Handling game over:', data);
        this.endGame(data.winner);
    }
    
    // Emit multiplayer events
    emitShipPlaced(shipData) {
        if (this.isMultiplayer && window.socket && this.roomCode) {
            window.socket.emit('battleshipShipPlaced', {
                roomId: this.roomCode,
                ship: shipData
            });
        }
    }
    
    emitAttack(x, y, hit = null, shipSunk = null) {
        if (this.isMultiplayer && this.socket && this.roomCode) {
            this.socket.emit('battleshipAttack', {
                roomId: this.roomCode,
                x: x,
                y: y,
                hit: hit,
                shipSunk: shipSunk,
                attackingPlayerId: this.playerId
            });
        }
    }
    
    emitPlayerReady() {
        console.log('🚢 emitPlayerReady called');
        console.log('🚢 isMultiplayer:', this.isMultiplayer);
        console.log('🚢 this.socket:', !!this.socket);
        console.log('🚢 roomCode:', this.roomCode);
        console.log('🚢 socket.id:', this.socket?.id);
        
        if (this.isMultiplayer && this.socket && this.roomCode) {
            console.log('🚢 Emitting battleshipPlayerReady event');
            this.socket.emit('battleshipPlayerReady', {
                roomId: this.roomCode,
                playerId: this.socket.id
            });
            console.log('🚢 battleshipPlayerReady event emitted successfully');
        } else {
            console.error('❌ Cannot emit player ready - missing requirements');
            console.error('❌ isMultiplayer:', this.isMultiplayer);
            console.error('❌ this.socket:', !!this.socket);
            console.error('❌ roomCode:', this.roomCode);
        }
    }
    
    emitGameStart() {
        if (this.isMultiplayer && window.socket && this.roomCode) {
            window.socket.emit('battleshipGameStart', {
                roomId: this.roomCode
            });
        }
    }
    
    emitTurnChange() {
        console.log('🚢 emitTurnChange called - isMultiplayer:', this.isMultiplayer, 'socket:', !!this.socket, 'roomCode:', this.roomCode);
        if (this.isMultiplayer && this.socket && this.roomCode) {
            // Use a simple toggle between players instead of relying on opponentId
            const nextPlayer = this.currentPlayer === 0 ? 1 : 0;
            console.log('🚢 Current player:', this.currentPlayer, 'Next player:', nextPlayer);
            
            this.socket.emit('battleshipTurnChange', {
                roomId: this.roomCode,
                currentPlayer: nextPlayer
            });
            console.log('🚢 Turn change emitted');
            
            // Update local turn state
            this.isPlayerTurn = false;
            this.currentPlayer = nextPlayer;
            this.updateUI();
        }
    }
    
    emitGameOver(winner) {
        if (this.isMultiplayer && this.socket && this.roomCode) {
            this.socket.emit('battleshipGameOver', {
                roomId: this.roomCode,
                winner: winner
            });
        }
    }
    
    addToHistory(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        this.gameHistory.push({
            message: message,
            type: type,
            timestamp: timestamp
        });
        this.updateHistoryDisplay();
    }
    
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
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 20px 30px;
            border-radius: 10px;
            border: 2px solid #FFD700;
            font-size: 18px;
            font-weight: bold;
            text-align: center;
            z-index: 2000;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(10px);
            animation: messageSlideIn 0.3s ease-out;
        `;
        messageDiv.textContent = message;
        document.body.appendChild(messageDiv);
        
        // Add CSS animation
        if (!document.getElementById('message-animations')) {
            const style = document.createElement('style');
            style.id = 'message-animations';
            style.textContent = `
                @keyframes messageSlideIn {
                    from { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
                    to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Remove message after duration
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.style.animation = 'messageSlideIn 0.3s ease-out reverse';
                setTimeout(() => {
                    if (messageDiv.parentNode) {
                        messageDiv.remove();
                    }
                }, 300);
            }
        }, duration);
    }
    
    updateHistoryDisplay() {
        const historyContent = document.getElementById('historyContent');
        if (historyContent) {
            historyContent.innerHTML = this.gameHistory
                .slice(-10) // Show last 10 entries
                .map(entry => `<div class="history-entry ${entry.type}">[${entry.timestamp}] ${entry.message}</div>`)
                .join('');
            historyContent.scrollTop = historyContent.scrollHeight;
        }
    }
    
    updateUI() {
        console.log('🔍 updateUI called - gamePhase:', this.gamePhase);
        const gamePhase = document.getElementById('gamePhase');
        const gameStatus = document.getElementById('gameStatus');
        const currentTurn = document.getElementById('currentTurn');
        const startBtn = document.getElementById('startGameBtn');
        const instructions = document.getElementById('instructions');
        
        // Update scoreboard
        this.updateScoreboard();
        
        if (gamePhase) {
            switch (this.gamePhase) {
                case 'placement':
                    gamePhase.textContent = '⚓ Ship Placement Phase';
                    break;
                case 'playing':
                    if (this.isMultiplayer) {
                        gamePhase.textContent = this.isPlayerTurn ? '🎯 Your Turn' : '⏳ Opponent\'s Turn';
                    } else {
                        gamePhase.textContent = this.currentPlayer === 0 ? '🎯 Your Turn' : '🤖 AI Turn';
                    }
                    break;
                case 'finished':
                    gamePhase.textContent = this.winner ? '🏆 Victory!' : '💥 Defeat!';
                    break;
            }
        }
        
        if (gameStatus) {
            switch (this.gamePhase) {
                case 'placement':
                    const placedCount = this.placedShips[0].length;
                    gameStatus.textContent = `Placed ${placedCount}/5 ships`;
                    break;
                case 'playing':
                    if (this.isMultiplayer) {
                        gameStatus.textContent = this.isPlayerTurn ? 'Choose your target' : 'Waiting for opponent...';
                    } else {
                        gameStatus.textContent = this.currentPlayer === 0 ? 'Choose your target' : 'AI is thinking...';
                    }
                    break;
                case 'finished':
                    if (this.isMultiplayer) {
                        gameStatus.textContent = this.winner === 0 ? 'You won!' : 'Opponent won!';
                    } else {
                        gameStatus.textContent = this.winner === 0 ? 'You won!' : 'AI won!';
                    }
                    break;
            }
        }
        
        if (currentTurn) {
            if (this.isMultiplayer) {
                currentTurn.textContent = this.isPlayerTurn ? 'You' : 'Opponent';
            } else {
                currentTurn.textContent = this.currentPlayer === 0 ? 'You' : 'AI';
            }
        }
        
        if (instructions) {
            switch (this.gamePhase) {
                case 'placement':
                    if (this.currentShip) {
                        instructions.textContent = `Placing ${this.currentShip.name}. Click on grid to place. Press 'R' to rotate, 'Esc' to cancel.`;
                    } else {
                        instructions.textContent = 'Click a ship to place it, then click on the grid. Press "R" to rotate, "Esc" to cancel.';
                    }
                    break;
                case 'playing':
                    if (this.isMultiplayer) {
                        instructions.textContent = this.isPlayerTurn ? 'Click on the attack grid to fire!' : 'Opponent is making their move...';
                    } else {
                        instructions.textContent = this.currentPlayer === 0 ? 'Click on the attack grid to fire!' : 'AI is making its move...';
                    }
                    break;
                case 'finished':
                    instructions.textContent = this.winner === 0 ? 'Congratulations! You won!' : 'Game Over! Better luck next time!';
                    break;
            }
        }
        
        if (startBtn) {
            const allShipsPlaced = this.placedShips[0].length === 5;
            startBtn.disabled = !allShipsPlaced || this.gamePhase !== 'placement';
        }
    }
    
    updateScoreboard() {
        const playerScoreEl = document.getElementById('playerScore');
        const aiScoreEl = document.getElementById('aiScore');
        const shipsSunkEl = document.getElementById('shipsSunk');
        const opponentShipsSunkEl = document.getElementById('opponentShipsSunk');
        
        // Show games won and total ships sunk across all games
        if (playerScoreEl) playerScoreEl.textContent = `${this.playerGamesWon} Wins, ${this.totalPlayerShipsSunk} Ships Destroyed`;
        if (aiScoreEl) aiScoreEl.textContent = `${this.aiGamesWon} Wins, ${this.totalAiShipsSunk} Ships Destroyed`;
        if (shipsSunkEl) shipsSunkEl.textContent = `${this.totalPlayerShipsSunk}`;
        if (opponentShipsSunkEl) opponentShipsSunkEl.textContent = `${this.totalOpponentShipsSunk}`;
    }
    
    renderShipsList() {
        const shipsList = document.getElementById('shipsList');
        if (!shipsList) {
            console.log('❌ shipsList element not found');
            return;
        }
        
        console.log('🎨 Rendering ships list...');
        shipsList.innerHTML = this.ships.map((ship, index) => {
            const isPlaced = this.placedShips[0].some(placedShip => placedShip.name === ship.name);
            
            // Check if ship images are loaded
            const hasImage = window.shipImages && window.shipImages[ship.type];
            console.log(`Rendering ship ${ship.name} (${ship.type}): hasImage=${hasImage}`);
            
            return `
                <div class="ship-item ${isPlaced ? 'placed' : ''}" data-ship-index="${index}">
                    <div class="ship-visual horizontal" style="${hasImage ? `background-image: url('${window.location.origin}/Images/${ship.type}.png'); background-size: contain; background-repeat: no-repeat; background-position: center;` : `background: ${ship.color}`}">
                    </div>
                    <div>
                        <div style="font-weight: bold;">${ship.name}</div>
                        <div style="font-size: 0.8em; opacity: 0.8;">Size: ${ship.size} squares</div>
                        ${isPlaced ? '<div style="color: #4CAF50; font-size: 0.8em;">✓ Placed</div>' : ''}
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // Check if ship images are loaded and re-render if needed
    checkAndUpdateShipImages() {
        console.log('🔍 Checking ship images...', window.shipImages);
        if (window.shipImages) {
            // Check if all ship images are loaded
            const allLoaded = this.ships.every(ship => {
                const hasImage = window.shipImages[ship.type];
                console.log(`Ship ${ship.type}:`, hasImage ? 'loaded' : 'not loaded');
                return hasImage;
            });
            if (allLoaded) {
                console.log('✅ All ship images loaded, re-rendering UI');
                // Add a small delay to ensure images are fully processed
                setTimeout(() => {
                    this.renderShipsList();
                    
                    // NO drawing calls - grid will be updated on next draw cycle
                }, 100);
                return true;
            }
        } else {
            console.log('❌ window.shipImages not found');
        }
        return false;
    }
    
    startGame() {
        console.log('🚀 Start game clicked! Placed ships:', this.placedShips[0].length);
        if (this.placedShips[0].length !== 5) {
            this.addToHistory('❌ Please place all ships before starting!', 'error');
            return;
        }
        
        // Check if this is multiplayer mode
        if (this.isMultiplayer && this.roomCode) {
            console.log('🚀 Player ready for multiplayer battleship game');
            console.log('🚀 isMultiplayer:', this.isMultiplayer);
            console.log('🚀 roomCode:', this.roomCode);
            console.log('🚀 window.socket:', !!window.socket);
            
            this.addToHistory('✅ You are ready! Waiting for opponent to finish placing ships...', 'success');
            
            // Emit player ready event to server
            this.emitPlayerReady();
            
            // Disable start button and show waiting message
            const startBtn = document.getElementById('startGameBtn');
            if (startBtn) {
                startBtn.disabled = true;
                startBtn.textContent = 'Waiting for Opponent...';
            }
            
            return;
        }
        
        // Single player mode - set up AI ships
        console.log('🚀 Starting single-player game mode');
        console.log('🚀 isMultiplayer:', this.isMultiplayer);
        console.log('🚀 roomCode:', this.roomCode);
        this.gamePhase = 'playing';
        this.currentPlayer = 0;
        
        // CRITICAL FIX: Clear, prominent message when battle starts
        this.addToHistory('🚀 Battle started!', 'success');
        this.showGameMessage('🎯 YOUR TURN TO ATTACK FIRST! Click on the Attack Grid to fire!', 5000);
        this.addToHistory('🎯 It\'s YOUR turn to attack first! Click on the Attack Grid (right side) to fire.', 'info');
        this.addToHistory('💡 Tip: Click on the Attack Grid to target enemy ships. You\'ll get another turn if you hit!', 'info');
        
        this.updateUI();
        console.log('🚀 Calling setupAIShips()...');
        this.setupAIShips();
        console.log('✅ Game started successfully!');
        
        // Force visual update to show the message
        if (window.battleshipClient) {
            window.battleshipClient.staticRender();
        }
    }
    
    setupAIShips() {
        console.log('🤖 Setting up AI ships...');
        // Clear any previously placed AI ships
        this.placedShips[1] = [];
        this.playerGrids[1] = this.createEmptyGrid();
        
        // AI places ships randomly using the same rules as human player
        const aiShips = [...this.ships];
        let attempts = 0;
        const maxAttempts = 5000; // Increased attempts for better success rate
        
        console.log(`🤖 Attempting to place ${aiShips.length} ships for AI...`);
        
        for (let shipIndex = 0; shipIndex < aiShips.length; shipIndex++) {
            const ship = aiShips[shipIndex];
            let placed = false;
            attempts = 0;
            
            // Try to place each ship with multiple attempts
            while (!placed && attempts < maxAttempts) {
                const orientation = Math.random() < 0.5 ? 'horizontal' : 'vertical';
                const maxX = this.gridSize - (orientation === 'horizontal' ? ship.size - 1 : 0);
                const maxY = this.gridSize - (orientation === 'vertical' ? ship.size - 1 : 0);
                const x = Math.floor(Math.random() * maxX);
                const y = Math.floor(Math.random() * maxY);
                
                if (this.canPlaceShip(1, x, y, ship.size, orientation)) {
                    this.placeShip(1, x, y, ship, orientation);
                    console.log(`🤖 Placed ${ship.name} at (${x}, ${y}) with orientation ${orientation}`);
                    placed = true;
                }
                attempts++;
            }
            
            if (!placed) {
                console.error(`❌ Failed to place ${ship.name} after ${attempts} attempts`);
                this.addToHistory(`⚠️ AI had difficulty placing ${ship.name}.`, 'warning');
            }
        }
        
        console.log(`🤖 AI ship placement complete. Placed ${this.placedShips[1].length} out of ${aiShips.length} ships.`);
        
        if (this.placedShips[1].length < 5) {
            this.addToHistory('⚠️ AI had difficulty placing all ships. Game may be unbalanced.', 'warning');
            console.warn(`⚠️ Only ${this.placedShips[1].length} AI ships placed`);
        } else {
            this.addToHistory('🤖 AI has placed all ships.', 'info');
            console.log('✅ All AI ships placed successfully!');
        }
    }
    
    canPlaceShip(player, x, y, size, orientation) {
        const grid = this.playerGrids[player];
        
        for (let i = 0; i < size; i++) {
            const checkX = orientation === 'horizontal' ? x + i : x;
            const checkY = orientation === 'vertical' ? y + i : y;
            
            // Check bounds
            if (checkX >= this.gridSize || checkY >= this.gridSize) {
                return false;
            }
            if (checkX < 0 || checkY < 0) {
                return false;
            }
            
            // Check if cell is already occupied
            if (grid[checkY][checkX].ship !== null) {
                return false;
            }
            
            // Check adjacent cells (Battleship rules: ships cannot touch)
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    const adjX = checkX + dx;
                    const adjY = checkY + dy;
                    
                    // Skip the current cell and out-of-bounds
                    if ((dx === 0 && dy === 0) || adjX < 0 || adjY < 0 || adjX >= this.gridSize || adjY >= this.gridSize) {
                        continue;
                    }
                    
                    // Check if adjacent cell has a ship
                    if (grid[adjY][adjX].ship !== null) {
                        return false;
                    }
                }
            }
        }
        
        return true;
    }
    
    placeShip(player, x, y, ship, orientation) {
        const grid = this.playerGrids[player];
        const shipData = {
            name: ship.name,
            type: ship.type,
            size: ship.size,
            color: ship.color,
            x: x,
            y: y,
            orientation: orientation,
            hits: 0,
            sunk: false
        };
        
        for (let i = 0; i < ship.size; i++) {
            const placeX = orientation === 'horizontal' ? x + i : x;
            const placeY = orientation === 'vertical' ? y + i : y;
            
            grid[placeY][placeX].ship = shipData;
            grid[placeY][placeX].shipId = this.placedShips[player].length;
            grid[placeY][placeX].isFirstCell = (i === 0); // Mark first cell
        }
        
        this.placedShips[player].push(shipData);
        
        if (player === 0) {
            this.addToHistory(`✅ Placed ${ship.name} at (${x + 1}, ${y + 1})`, 'success');
            this.renderShipsList();
        }
    }
    
    attack(player, x, y) {
        if (this.gameOver) {
            return { valid: false, message: 'Game is already over!' };
        }
        
        // In multiplayer, only allow attacks on opponent's grid
        if (this.isMultiplayer) {
            if (!this.isPlayerTurn) {
                return { valid: false, message: 'Not your turn!' };
            }
            
            // In multiplayer, player 0 attacks player 1's grid
            const attackingPlayer = 0; // The human player is always player 0
            const targetPlayer = 1; // Attack player 1's grid (opponent)
            const attackGrid = this.attackGrids[0]; // Player 0's view of player 1's grid
            
            if (attackGrid[y][x].hit || attackGrid[y][x].miss) {
                return { valid: false, message: 'Already attacked this position!' };
            }
            
            // In multiplayer, we can't determine hit/miss on the attacking client
            // because we don't have the opponent's ship data
            // Don't mark as miss yet - wait for server response
            // The hit/miss will be determined by the server response
            
            // Send attack to server - the server will determine hit/miss
            this.emitAttack(x, y);
            
            this.addToHistory(`💧 You attacked ${String.fromCharCode(65 + y)}${x + 1}!`, 'info');
            this.showGameMessage(`🎯 Attack sent!`, 2000);
            return { valid: true, hit: null, sunk: false };
        } else {
            // Single player mode - original logic
            const targetPlayer = 1 - player;
            const grid = this.playerGrids[targetPlayer];
            const attackGrid = this.attackGrids[player];
            
            if (attackGrid[y][x].hit || attackGrid[y][x].miss) {
                return { valid: false, message: 'Already attacked this position!' };
            }
            
            // CRITICAL FIX: grid is accessed as grid[row][col] where row=y, col=x
            // Verify coordinates are valid
            if (y < 0 || y >= this.gridSize || x < 0 || x >= this.gridSize) {
                console.error(`❌ Invalid coordinates: x=${x}, y=${y}`);
                return { valid: false, message: 'Invalid coordinates!' };
            }
            
            const cell = grid[y][x];
            const isHit = cell.ship !== null;
            
            console.log(`🎯 Attack check: (${x}, ${y}), cell.ship:`, cell.ship ? cell.ship.name : 'null', 'isHit:', isHit);
            
            if (isHit) {
                attackGrid[y][x].hit = true;
                cell.hit = true;
                
                const ship = cell.ship;
                ship.hits++;
                
                // Update scoreboard
                if (player === 0) {
                    this.playerHits++;
                    this.playerScore += 10; // 10 points per hit
                } else {
                    this.aiHitsCount++;
                    this.aiScore += 10;
                }
                
                if (ship.hits >= ship.size) {
                    this.sinkShip(targetPlayer, ship);
                    this.shipsSunk++;
                    
                    // Track ships sunk in current game and total
                    if (player === 0) {
                        // Player sunk AI's ships
                        this.currentGamePlayerShipsSunk++;
                        this.totalPlayerShipsSunk++;
                    } else {
                        // AI sunk player's ships
                        this.currentGameAiShipsSunk++;
                        this.totalAiShipsSunk++;
                        this.totalOpponentShipsSunk++; // Track opponent ships sunk
                    }
                    
                    // CRITICAL FIX: Show who sunk which ship (okay to show ship name when sunk)
                    const sinkerName = this.isMultiplayer ? 
                        (player === 0 ? 'Player 1' : 'Player 2') : 
                        (player === 0 ? 'You' : 'Bot');
                    this.addToHistory(`💥 ${sinkerName} sunk the ${ship.name}!`, 'sunk');
                    this.showGameMessage(`💥 ${ship.name} SUNK!`, 3000);
                    
                    // Bonus points for sinking a ship
                    if (player === 0) {
                        this.playerScore += 50; // 50 bonus points for sinking
                    } else {
                        this.aiScore += 50;
                    }
                    
                    if (this.checkGameOver(targetPlayer)) {
                        this.endGame(player);
                        return { valid: true, hit: true, sunk: true, ship: ship.name, gameOver: true };
                    }
                    
                    return { valid: true, hit: true, sunk: true, ship: ship.name };
                } else {
                    // CRITICAL FIX: Don't reveal which ship was hit
                    const attackerName = this.isMultiplayer ? 
                        (player === 0 ? 'You' : 'Player 2') : 
                        (player === 0 ? 'You' : 'Bot');
                    this.addToHistory(`🎯 ${attackerName} hit!`, 'hit');
                    this.showGameMessage(`🎯 HIT!`, 2000);
                    return { valid: true, hit: true, sunk: false, ship: ship.name };
                }
            } else {
                attackGrid[y][x].miss = true;
                cell.miss = true;
                
                // Update scoreboard
                if (player === 0) {
                    this.playerMisses++;
                } else {
                    this.aiMisses++;
                }
                
                // CRITICAL FIX: Show who missed (Bot, Player 1, or Player 2)
                const misserName = this.isMultiplayer ? 
                    (player === 0 ? 'Player 1' : 'Player 2') : 
                    (player === 0 ? 'You' : 'Bot');
                this.addToHistory(`💧 ${misserName} missed!`, 'miss');
                this.showGameMessage(`💧 ${misserName} missed!`, 1500);
                return { valid: true, hit: false };
            }
        }
    }
    
    sinkShip(player, ship) {
        const grid = this.playerGrids[player];
        ship.sunk = true; // Mark ship as sunk
        
        for (let i = 0; i < ship.size; i++) {
            const x = ship.orientation === 'horizontal' ? ship.x + i : ship.x;
            const y = ship.orientation === 'vertical' ? ship.y + i : ship.y;
            grid[y][x].sunk = true;
        }
    }
    
    checkGameOver(player) {
        if (this.gameOver) return true; // Already over
        return this.placedShips[player].every(ship => ship.hits >= ship.size);
    }
    
    endGame(winner) {
        this.gamePhase = 'finished';
        this.winner = winner;
        this.gameOver = true;
        
        // Track games won
        if (winner === 0) {
            this.playerGamesWon++;
            this.addToHistory('🏆 Congratulations! You won the battle!', 'success');
            this.showGameMessage('🏆 VICTORY! You sunk all enemy ships!', 5000);
            this.triggerVictoryEffect();
        } else {
            this.aiGamesWon++;
            this.addToHistory('💥 Game Over! The AI defeated you!', 'error');
            this.showGameMessage('💥 DEFEAT! The AI sunk all your ships!', 5000);
        }
        
        this.updateUI();
        
        // Auto-restart after 8 seconds
        setTimeout(() => {
            this.resetGame();
        }, 8000);
    }
    
    triggerVictoryEffect() {
        // Create confetti effect
        for (let i = 0; i < 50; i++) {
            setTimeout(() => {
                this.createConfetti();
            }, i * 100);
        }
    }
    
    createConfetti() {
        const confetti = document.createElement('div');
        confetti.style.cssText = `
            position: fixed;
            top: -10px;
            left: ${Math.random() * 100}%;
            width: 10px;
            height: 10px;
            background: ${['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'][Math.floor(Math.random() * 5)]};
            z-index: 3000;
            animation: confettiFall 3s linear forwards;
        `;
        
        if (!document.getElementById('confetti-animations')) {
            const style = document.createElement('style');
            style.id = 'confetti-animations';
            style.textContent = `
                @keyframes confettiFall {
                    to {
                        transform: translateY(100vh) rotate(720deg);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(confetti);
        
        setTimeout(() => {
            if (confetti.parentNode) {
                confetti.remove();
            }
        }, 3000);
    }
    
    endTurn() {
        console.log('🚢 endTurn called - isMultiplayer:', this.isMultiplayer, 'currentPlayer:', this.currentPlayer);
        if (this.isMultiplayer) {
            // In multiplayer, emit turn change to server
            console.log('🚢 Emitting turn change');
            this.emitTurnChange();
        } else {
            // Single player mode
            this.currentPlayer = 1 - this.currentPlayer;
            console.log('🚢 Turn switched to player:', this.currentPlayer);
            this.updateUI();
            
            // CRITICAL FIX: Only trigger AI turn if it's not already scheduled
            if (this.currentPlayer === 1 && this.gamePhase === 'playing' && !this.gameOver && !this.aiTurnScheduled) {
                console.log('🚢 Scheduling AI turn');
                // Ensure loop is active for AI turns
                if (window.battleshipClient) {
                    loop(); // Keep loop active during AI turn
                    window.battleshipClient.staticRender(); // Ensure initial render
                }
                setTimeout(() => {
                    if (this.currentPlayer === 1 && this.gamePhase === 'playing' && !this.gameOver) {
                        this.aiTurn();
                    }
                }, 1500); // Longer delay for better visual transition
            } else if (this.currentPlayer === 0) {
                // Player's turn - stop the loop to save resources
                if (window.battleshipClient) {
                    window.battleshipClient.staticRender(); // Final render before stopping
                    setTimeout(() => {
                        if (this.currentPlayer === 0) {
                            noLoop(); // Stop loop when it's player's turn
                        }
                    }, 500);
                }
            }
        }
    }
    
    aiTurn() {
        if (this.gamePhase !== 'playing' || this.currentPlayer !== 1 || this.gameOver) {
            console.log(`🤖 AI turn blocked - gamePhase: ${this.gamePhase}, currentPlayer: ${this.currentPlayer}, gameOver: ${this.gameOver}`);
            return;
        }
        
        // Prevent multiple AI turns from being scheduled
        if (this.aiTurnScheduled) {
            console.log('🤖 AI turn already scheduled, skipping');
            return;
        }
        
        this.aiTurnScheduled = true;
        
        // Show AI thinking message
        this.addToHistory('🤖 AI is thinking...', 'info');
        this.showGameMessage('🤖 AI is choosing target...', 1000);
        
        let x, y;
        
        if (this.aiMode === 'hunt') {
            // Smart hunting - avoid edges and corners initially
            const candidates = [];
            for (let i = 1; i < this.gridSize - 1; i++) {
                for (let j = 1; j < this.gridSize - 1; j++) {
                    if (!this.attackGrids[1][j][i].hit && !this.attackGrids[1][j][i].miss) {
                        // Prefer positions that could hit multiple ship orientations
                        const score = this.calculateHuntScore(i, j);
                        candidates.push({ x: i, y: j, score });
                    }
                }
            }
            
            if (candidates.length > 0) {
                // Sort by score and pick randomly from top candidates
                candidates.sort((a, b) => b.score - a.score);
                const topCandidates = candidates.filter(c => c.score === candidates[0].score);
                const target = topCandidates[Math.floor(Math.random() * topCandidates.length)];
                x = target.x;
                y = target.y;
            } else {
                // Fallback to random
                do {
                    x = Math.floor(Math.random() * this.gridSize);
                    y = Math.floor(Math.random() * this.gridSize);
                } while (this.attackGrids[1][y][x].hit || this.attackGrids[1][y][x].miss);
            }
        } else {
            // Target mode - attack around last hit
            const targets = this.getAdjacentTargets(this.aiLastHit.x, this.aiLastHit.y);
            if (targets.length > 0) {
                const target = targets[Math.floor(Math.random() * targets.length)];
                x = target.x;
                y = target.y;
            } else {
                // Fall back to hunt mode
                this.aiMode = 'hunt';
                this.aiLastHit = null;
                this.aiTurn();
                return;
            }
        }
        
        // Show AI attack message
        const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
        this.addToHistory(`🤖 AI attacks ${letters[y]}${x + 1}`, 'info');
        
        const result = this.attack(1, x, y);
        
        // CRITICAL FIX: Force immediate visual update after AI attack
        if (window.battleshipClient) {
            window.battleshipClient.staticRender();
        }
        
        if (!result.valid) {
            console.error(`🤖 AI attack failed: ${result.message}`);
            this.aiTurnScheduled = false;
            this.endTurn(); // End turn if attack is invalid
            return;
        }
        
        if (result.hit) {
            this.aiMode = 'target';
            this.aiLastHit = { x, y };
            this.aiHits.push({ x, y });
            
            // CRITICAL FIX: In Battleship, you keep your turn when you hit (hit or sink)
            // Only end turn when you miss
            // Reset flag so we can schedule another turn
            this.aiTurnScheduled = false;
            
            if (!result.sunk) {
                // Hit but not sunk - give AI another turn
                if (this.currentPlayer === 1 && this.gamePhase === 'playing' && !this.gameOver) {
                    setTimeout(() => {
                        // Double-check it's still AI's turn before calling again
                        if (this.currentPlayer === 1 && this.gamePhase === 'playing' && !this.gameOver && !this.aiTurnScheduled) {
                            // Ensure visual update before next attack
                            if (window.battleshipClient) {
                                window.battleshipClient.staticRender();
                            }
                            this.aiTurn();
                        }
                    }, 2500); // Slightly longer delay for better visibility
                } else {
                    // If conditions changed, end the turn
                    this.endTurn();
                }
            } else {
                // Ship sunk, go back to hunt mode - but AI still gets another turn
                this.aiMode = 'hunt';
                this.aiLastHit = null;
                // Give AI another turn (still its turn after sinking)
                if (this.currentPlayer === 1 && this.gamePhase === 'playing' && !this.gameOver) {
                    setTimeout(() => {
                        if (this.currentPlayer === 1 && this.gamePhase === 'playing' && !this.gameOver && !this.aiTurnScheduled) {
                            // Ensure visual update before next attack
                            if (window.battleshipClient) {
                                window.battleshipClient.staticRender();
                            }
                            this.aiTurn();
                        }
                    }, 2500); // Slightly longer delay for better visibility
                } else {
                    this.endTurn();
                }
            }
        } else {
            // Miss - end turn (switch to player)
            this.aiTurnScheduled = false;
            // Ensure final visual update before ending turn
            if (window.battleshipClient) {
                window.battleshipClient.staticRender();
            }
            // Small delay before ending turn to show the miss
            setTimeout(() => {
                this.endTurn();
            }, 500);
        }
    }
    
    calculateHuntScore(x, y) {
        let score = 0;
        
        // Check horizontal potential
        for (let i = 0; i < 5; i++) {
            if (x + i < this.gridSize && !this.attackGrids[1][y][x + i].hit && !this.attackGrids[1][y][x + i].miss) {
                score++;
            }
        }
        
        // Check vertical potential
        for (let i = 0; i < 5; i++) {
            if (y + i < this.gridSize && !this.attackGrids[1][y + i][x].hit && !this.attackGrids[1][y + i][x].miss) {
                score++;
            }
        }
        
        return score;
    }
    
    getAdjacentTargets(x, y) {
        const targets = [];
        const directions = [
            { dx: 0, dy: -1 }, // up
            { dx: 1, dy: 0 },  // right
            { dx: 0, dy: 1 },  // down
            { dx: -1, dy: 0 }  // left
        ];
        
        for (const dir of directions) {
            const newX = x + dir.dx;
            const newY = y + dir.dy;
            
            if (newX >= 0 && newX < this.gridSize && 
                newY >= 0 && newY < this.gridSize &&
                !this.attackGrids[1][newY][newX].hit && 
                !this.attackGrids[1][newY][newX].miss) {
                targets.push({ x: newX, y: newY });
            }
        }
        
        return targets;
    }
    
    resetGame() {
        this.gamePhase = 'placement';
        this.currentPlayer = 0;
        this.gameOver = false;
        this.winner = null;
        
        this.playerGrids = [this.createEmptyGrid(), this.createEmptyGrid()];
        this.attackGrids = [this.createEmptyGrid(), this.createEmptyGrid()];
        this.placedShips = [[], []];
        this.gameHistory = [];
        this.currentShip = null;
        this.draggedShip = null;
        
        this.aiTargets = [];
        this.aiHits = [];
        this.aiMode = 'hunt';
        this.aiLastHit = null;
        
        // Reset ship placement status
        this.ships.forEach(ship => ship.placed = false);
        
        // Reset current game tracking (games won persist)
        this.currentGamePlayerShipsSunk = 0;
        this.currentGameAiShipsSunk = 0;
        
        // Reset images checked flag
        this.imagesChecked = false;
        
        this.initializeGame();
    }
    
    // Add cleanup method for the client
    cleanup() {
        this.cleanupEventListeners();
    }
    
    // Ship placement methods
    startShipPlacement(shipIndex) {
        console.log('🚢 startShipPlacement called with index:', shipIndex);
        console.log('Game phase:', this.gamePhase);
        
        if (this.gamePhase !== 'placement') {
            console.log('❌ Not in placement phase');
            return;
        }
        
        const ship = this.ships[shipIndex];
        console.log('Selected ship:', ship);
        
        if (ship.placed) {
            console.log('❌ Ship already placed');
            this.addToHistory(`❌ ${ship.name} is already placed!`, 'error');
            return;
        }
        
        this.currentShip = { ...ship, index: shipIndex, orientation: 'horizontal' };
        console.log('✅ Current ship set:', this.currentShip);
        console.log('✅ Current ship name:', this.currentShip.name);
        console.log('✅ Current ship orientation:', this.currentShip.orientation);
        
        // CRITICAL FIX: Hide the initial placement message immediately when ship is selected
        const existingMessage = document.getElementById('game-message');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        this.addToHistory(`📌 Click on the grid to place ${ship.name}`, 'info');
        
        // Also set currentShip on the client instance for preview
        if (window.battleshipClient) {
            window.battleshipClient.currentShip = this.currentShip;
            console.log('✅ Current ship also set on client:', window.battleshipClient.currentShip);
            // Force a redraw to show the preview
            window.battleshipClient.staticRender();
        }
    }
    
    placeShipAt(x, y, orientation = 'horizontal') {
        if (!this.currentShip || this.gamePhase !== 'placement') return false;
        
        if (this.canPlaceShip(0, x, y, this.currentShip.size, orientation)) {
            this.placeShip(0, x, y, this.currentShip, orientation);
            this.ships[this.currentShip.index].placed = true;
            this.currentShip = null; // Clear current ship after placement
            // Also clear currentShip on the client instance
            if (window.battleshipClient) {
                window.battleshipClient.currentShip = null;
            }
            this.updateUI();
            this.renderShipsList(); // Force re-render of ships list
            if (window.battleshipClient) {
                window.battleshipClient.staticRender(); // Force redraw to show placed ship
            }
            return true;
        } else {
            this.addToHistory(`❌ Cannot place ${this.currentShip.name} there!`, 'error');
            return false;
        }
    }
    
    cancelShipPlacement() {
        this.currentShip = null;
        this.addToHistory('❌ Ship placement cancelled', 'info');
        this.updateUI();
    }
    
    rotateCurrentShip() {
        if (!this.currentShip) return;
        
        // Ensure orientation is initialized if undefined
        if (!this.currentShip.orientation) {
            this.currentShip.orientation = 'horizontal';
        }
        
        this.currentShip.orientation = this.currentShip.orientation === 'horizontal' ? 'vertical' : 'horizontal';
        console.log(`🔄 Rotated ${this.currentShip.name} to ${this.currentShip.orientation}`);
        this.addToHistory(`🔄 Rotated ${this.currentShip.name} to ${this.currentShip.orientation}`, 'info');
        this.updateUI();
    }
}

// 🎮 BATTLESHIP CLIENT
class BattleshipClient {
    constructor() {
        // Always use the global battleshipGame instance
        this.game = null; // Will be set in initialize()
        this.canvas = null;
        this.gridSize = 30; // Smaller grid size for better fit
        this.gridSpacing = 1; // Smaller spacing for better fit
        this.gridStartX = 0;
        this.gridStartY = 0;
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.initialized = false;
        this.lastClickTime = 0;
        this.clickDebounceMs = 500; // Prevent multiple clicks within 500ms
        this.isResizing = false; // Prevent clicks during resize
        this.hoverX = 0;
        this.hoverY = 0;
        this.processedAttacks = new Set(); // Track processed attacks to prevent duplicates
        this.listenersSetup = false; // Prevent duplicate event listeners
        this.hoverRedrawScheduled = false;
        this.resizeTimeout = null; // Timeout for resize debouncing
        this.lastLoggedGamePhase = null; // Track last logged game phase to reduce logging
        
        this.setupEventListeners();
        this.initializeCanvas();
        this.setupResizeHandler();
    }
    
    initialize() {
        // Set the game reference to the global instance
        this.game = window.battleshipGame;
        if (!this.game) {
            console.log('⚠️ Global battleshipGame not available yet, will retry...');
            setTimeout(() => this.initialize(), 100);
            return;
        }
        console.log('✅ BattleshipClient initialized with global game instance');
        
        // Set up a periodic check to ensure we're always using the latest game instance
        setInterval(() => {
            if (window.battleshipGame && this.game !== window.battleshipGame) {
                console.log('🔄 Syncing with updated global game instance');
                this.game = window.battleshipGame;
            }
        }, 1000);
    }
    
    // Getter methods to always access the current game instance
    get gamePhase() {
        // Always check the global instance first
        if (window.battleshipGame) {
            return window.battleshipGame.gamePhase;
        }
        return this.game ? this.game.gamePhase : 'placement';
    }
    
    set gamePhase(value) {
        // Update the global game instance's game phase
        if (window.battleshipGame) {
            window.battleshipGame.gamePhase = value;
        } else if (this.game) {
            this.game.gamePhase = value;
        }
    }
    
    get currentPlayer() {
        // Always check the global instance first
        if (window.battleshipGame) {
            return window.battleshipGame.currentPlayer;
        }
        return this.game ? this.game.currentPlayer : 0;
    }
    
    set currentPlayer(value) {
        // Update the global game instance's current player
        if (window.battleshipGame) {
            window.battleshipGame.currentPlayer = value;
        } else if (this.game) {
            this.game.currentPlayer = value;
        }
    }
    
    get isPlayerTurn() {
        // Always check the global instance first
        if (window.battleshipGame) {
            return window.battleshipGame.isPlayerTurn;
        }
        return this.game ? this.game.isPlayerTurn : false;
    }
    
    set isPlayerTurn(value) {
        // Update the global game instance's isPlayerTurn
        if (window.battleshipGame) {
            window.battleshipGame.isPlayerTurn = value;
        } else if (this.game) {
            this.game.isPlayerTurn = value;
        }
    }
    
    get playerId() {
        // Always check the global instance first
        if (window.battleshipGame) {
            return window.battleshipGame.playerId;
        }
        return this.game ? this.game.playerId : null;
    }
    
    get isMultiplayer() {
        // Always check the global instance first
        if (window.battleshipGame) {
            return window.battleshipGame.isMultiplayer;
        }
        return this.game ? this.game.isMultiplayer : false;
    }
    
    get roomCode() {
        // Always check the global instance first
        if (window.battleshipGame) {
            return window.battleshipGame.roomCode;
        }
        return this.game ? this.game.roomCode : null;
    }
    
    get socket() {
        // Always check the global instance first
        if (window.battleshipGame) {
            return window.battleshipGame.socket;
        }
        return this.game ? this.game.socket : null;
    }
    
    initializeCanvas() {
        console.log('🎨 Initializing canvas...');
        
        const canvasDiv = document.getElementById('gameCanvas');
        if (!canvasDiv) {
            console.error('❌ Canvas div not found!');
            return;
        }
        
        // Don't reinitialize if already done
        if (this.initialized && this.canvas) {
            console.log('✅ Canvas already initialized, skipping...');
            return;
        }
        
        // Clear any existing canvas
        canvasDiv.innerHTML = '';
        
        try {
            // Ensure the canvas container is visible
            canvasDiv.style.display = 'block';
            canvasDiv.style.visibility = 'visible';
            
            // Create responsive canvas with better sizing
            const canvasWidth = Math.min(800, windowWidth - 100);
            const canvasHeight = Math.min(500, windowHeight - 200);
            this.canvas = createCanvas(canvasWidth, canvasHeight);
            this.canvas.parent(canvasDiv);
            
            // Set canvas background to transparent
            this.canvas.style('background', 'transparent');
            this.canvas.style('display', 'block');
            this.canvas.style('position', 'relative');
            this.canvas.style('top', '0');
            this.canvas.style('left', '0');
            this.canvas.style('z-index', '1');
            
            console.log('🎨 Canvas created with dimensions:', canvasWidth, 'x', canvasHeight);
            console.log('🎨 Canvas parent div:', canvasDiv);
            console.log('🎨 Canvas element:', this.canvas);
            console.log('🎨 Canvas parent display style:', canvasDiv.style.display);
            
            // Calculate grid positions - ensure grids fit within canvas with proper spacing
            this.gridStartX = 20;
            this.gridStartY = 300; // Restore original centered position
            this.initialized = true;
            
            // Set up event listeners after canvas is ready
            this.setupCanvasEventListeners();
            
            // Canvas is ready for drawing
            
            console.log('✅ Canvas initialized successfully');
            
            // Draw the initial grids once after canvas is fully ready
            setTimeout(() => {
                if (this.initialized && this.canvas) {
                    console.log('🎨 Initial grid draw starting...');
                    // Force initial draw to show grids
                    this.staticRender();
                    console.log('🎨 Initial grid draw completed');
                }
            }, 500);
        } catch (error) {
            console.error('❌ Canvas creation failed:', error);
            // Retry after a short delay
            setTimeout(() => this.initializeCanvas(), 200);
        }
    }
    
    setupEventListeners() {
        // Start game button
        const startBtn = document.getElementById('startGameBtn');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                console.log('🎮 Start button clicked!');
                this.game.startGame();
            });
        } else {
            console.log('❌ Start button not found!');
        }
        
        // Reset game button
        const resetBtn = document.getElementById('resetGameBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.game.resetGame());
        }
        
        // Ship selection - use event delegation
        document.addEventListener('click', (e) => {
            const shipItem = e.target.closest('.ship-item');
            if (shipItem) {
                const shipIndex = parseInt(shipItem.dataset.shipIndex);
                console.log('🚢 Ship clicked:', shipIndex, this.game.ships[shipIndex]);
                this.game.startShipPlacement(shipIndex);
            }
        });
        
        // Also add click listeners directly to ship items after they're rendered
        setTimeout(() => {
            const shipItems = document.querySelectorAll('.ship-item');
            console.log('🚢 Found ship items:', shipItems.length);
            shipItems.forEach((item, index) => {
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🚢 Direct ship click:', index, this.game.ships[index]);
                    this.game.startShipPlacement(index);
                });
                console.log('🚢 Added click listener to ship item:', index);
            });
        }, 500);
    }
    
    setupResizeHandler() {
        // CRITICAL: Only set up resize handler when on battleship page
        const currentPath = window.location.pathname;
        if (currentPath !== '/battleship') {
            console.log('Not on battleship page - skipping battleship resize handler setup');
            return;
        }
        
        window.addEventListener('resize', () => {
            // Set resizing flag to prevent phantom mouse events
            this.isResizing = true;
            console.log('🔄 Window resize detected - blocking clicks temporarily');
            
            // Clear any existing timeout
            if (this.resizeTimeout) {
                clearTimeout(this.resizeTimeout);
            }
            
            // Debounce resize events to prevent excessive redraws
            this.resizeTimeout = setTimeout(() => {
                // CRITICAL: Only resize if we're actually playing battleship
                const currentPath = window.location.pathname;
                if (currentPath !== '/battleship') {
                    console.log('Not on battleship page - skipping battleship resize');
                    return;
                }
                
                if (this.canvas) {
                    // Recalculate canvas size and grid positions
                    const newWidth = Math.min(1400, windowWidth - 30);
                    const newHeight = Math.min(1000, windowHeight - 10);
                    
                    // Resize canvas
                    resizeCanvas(newWidth, newHeight);
                    
                    // Recalculate grid positions - keep consistent positioning
                    this.gridStartX = 20;
                    this.gridStartY = 300;
                    
                    console.log('🔄 Canvas resized and grid repositioned:', this.gridStartX, this.gridStartY);
                    
                    // Redraw after resize to ensure grids are visible
                    this.staticRender();
                    
                    // Canvas resized successfully
                }
                
                // Re-enable clicks after resize is complete
                this.isResizing = false;
                console.log('🔄 Window resize complete - clicks re-enabled');
            }, 1000); // Wait 1 second after resize stops to prevent phantom events
        });
    }
    
    setupCanvasEventListeners() {
        // Only set up event listeners if canvas exists
        if (!this.canvas) {
            console.log('⚠️ Canvas not ready for event listeners');
            return;
        }
        
        // Add mouse event listeners
        this.canvas.mouseMoved(() => {
            // Update hover position for ship placement preview
            if (this.game && this.gamePhase === 'placement' && this.game.currentShip) {
                // Just update the hover position, NO redraw calls
                this.updateHoverPosition();
                // NO redraw calls - hover will be drawn by the main draw() function
            }
        });
        
        // Remove canvas-specific mousePressed - using global handler instead
        
        // Add keyboard event listeners with proper cleanup
        this.keydownHandler = (e) => {
            if (e.key === 'r' || e.key === 'R' || e.key === 'Escape') {
                // Redraw for ship rotation and cancellation during placement
                if (this.game && this.gamePhase === 'placement') {
                    redraw();
                }
            }
        };
        document.addEventListener('keydown', this.keydownHandler);
        
        // Add window resize handler to redraw when console opens/closes
        this.resizeHandler = () => {
            // CRITICAL: Only handle resize when on battleship page
            const currentPath = window.location.pathname;
            if (currentPath !== '/battleship') {
                console.log('Not on battleship page - skipping battleship resize handler');
                return;
            }
            if (this.initialized) {
                // Set flag immediately to prevent any clicks during resize
                this.isResizing = true;
                console.log(`🔄 Resize started - blocking clicks`);
                this.staticRender();
                setTimeout(() => {
                    this.isResizing = false; // Re-enable clicks after resize
                    console.log(`🔄 Resize completed - clicks enabled`);
                }, 300); // Increased delay to prevent clicks during resize
            }
        };
        
        // CRITICAL: Only set up resize listener when on battleship page
        const currentPath = window.location.pathname;
        if (currentPath === '/battleship') {
            window.addEventListener('resize', this.resizeHandler);
        } else {
            console.log('Not on battleship page - skipping battleship resize listener setup');
        }
    }
    
    cleanupEventListeners() {
        // Remove keyboard event listener to prevent memory leaks
        if (this.keydownHandler) {
            document.removeEventListener('keydown', this.keydownHandler);
            this.keydownHandler = null;
        }
        
        // Remove resize event listener
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
            this.resizeHandler = null;
        }
    }
    
    draw() {
        if (!this.initialized) {
            console.log('🔍 draw() called but not initialized');
            return;
        }
        
        // Always use the global game instance
        const gameInstance = window.battleshipGame || this.game;
        if (!gameInstance) {
            console.log('🔍 draw() called but no game instance available');
            return;
        }
        
        // Only log when there's a significant change in game state
        if (this.lastLoggedGamePhase !== this.gamePhase) {
            console.log('🔍 Game phase changed to:', this.gamePhase);
            this.lastLoggedGamePhase = this.gamePhase;
        }
        
        // Clear the canvas first to ensure clean drawing
        clear();
        
        // Draw unhit ships first (green colors)
        this.drawShips(gameInstance);
        // Draw grids with hit symbols on top
        this.drawGrids(gameInstance);
        this.drawShipPreview(gameInstance); // Add ship preview during placement
        this.drawUI(gameInstance); // Add UI elements
        this.drawTurnIndicator();
        this.drawMouseHover();
        
        // Keep loop active during AI turns for smooth visual feedback
        // Only stop the loop if:
        // 1. Not in placement phase with a current ship
        // 2. Not during AI turn in playing phase
        if (this.gamePhase !== 'placement' || !this.currentShip) {
            if (!(this.gamePhase === 'playing' && this.currentPlayer === 1)) {
                noLoop();
            }
        }
    }
    
    // Static rendering method - only call when explicitly needed
    staticRender() {
        if (this.initialized) {
            // Force a draw cycle and keep loop active longer to ensure rendering
            loop();
            // Use redraw() to immediately trigger a draw cycle
            redraw();
            // Keep the loop active longer during playing phase, especially during AI turns
            const delay = (this.gamePhase === 'playing' && this.currentPlayer === 1) ? 3000 : 200;
            setTimeout(() => {
                // Only stop loop if not in active playing phase or if player's turn
                if (this.gamePhase !== 'playing' || (this.gamePhase === 'playing' && this.currentPlayer === 0)) {
                    noLoop();
                }
            }, delay);
        }
    }
    
    // Safe initial draw method - only for initial rendering
    initialDraw() {
        if (this.initialized) {
            // Force a single draw cycle for initial rendering
            loop();
            setTimeout(() => {
                noLoop();
            }, 100);
        }
    }
    
    // REMOVED: forceSingleDraw() method to eliminate infinite loops
    // NO drawing calls - grids will be updated on next draw cycle
    
    // REMOVED: triggerDraw() method to eliminate infinite loops
    // NO drawing calls - grids will be updated on next draw cycle
    
    // REMOVED: forceDraw() method to eliminate infinite loops
    // NO drawing calls - grids will be updated on next draw cycle
    
    // REMOVED: staticRender() method to eliminate infinite loops
    // NO drawing calls - grids will be updated on next draw cycle
    
    // REMOVED: forceDraw() method to eliminate infinite loops
    // NO drawing calls - grids will be updated on next draw cycle
    
    updateHoverPosition() {
        // Update hover position for ship placement preview
        // This method just updates internal state, NO redraw calls
        if (this.game && this.gamePhase === 'placement' && this.game.currentShip) {
            // Store current mouse position for hover preview
            this.hoverX = mouseX;
            this.hoverY = mouseY;
            
            // NO redraw calls - hover will be drawn by the main draw() function
        }
    }
    
    // REMOVED: manualDraw() method to eliminate infinite loops
    // NO drawing calls - grids will be updated on next draw cycle
    
    drawTurnIndicator() {
        const fleetGridX = this.gridStartX + 80;
        const attackGridX = this.gridStartX + 500;
        const gridY = this.gridStartY + 350; // Below the grids
        
        // Draw turn indicator background with better contrast
        fill(0, 0, 0, 240); // More opaque background
        stroke(255, 255, 0);
        strokeWeight(3);
        rect(fleetGridX - 15, gridY - 5, 430, 50);
        rect(attackGridX - 15, gridY - 5, 430, 50);
        
        // Draw turn text with better styling
        fill(255, 255, 255);
        textAlign(CENTER, CENTER);
        textSize(18); // Larger text
        stroke(0, 0, 0); // Black outline for better readability
        strokeWeight(2);
        
        if (this.gamePhase === 'playing') {
            if (this.isMultiplayer) {
                if (this.isPlayerTurn) {
                    text('🎯 YOUR TURN - Click to attack!', attackGridX + 200, gridY + 20);
                    text('👥 Opponent is waiting...', fleetGridX + 200, gridY + 20);
                } else {
                    text('👥 OPPONENT TURN - Opponent is attacking...', attackGridX + 200, gridY + 20);
                    text('⏳ Your turn is next', fleetGridX + 200, gridY + 20);
                }
            } else {
                if (this.currentPlayer === 0) {
                    text('🎯 YOUR TURN - Click to attack!', attackGridX + 200, gridY + 20);
                    text('🤖 AI is waiting...', fleetGridX + 200, gridY + 20);
                } else {
                    text('🤖 AI TURN - AI is attacking...', attackGridX + 200, gridY + 20);
                    text('⏳ Your turn is next', fleetGridX + 200, gridY + 20);
                }
            }
        } else if (this.gamePhase === 'placement') {
            text('⚓ Place your ships!', attackGridX + 200, gridY + 20);
            text('📋 Your Fleet', fleetGridX + 200, gridY + 20);
        } else if (this.gamePhase === 'finished') {
            let winnerText;
            if (this.isMultiplayer) {
                winnerText = this.game.winner === 0 ? '🏆 YOU WON!' : '💥 OPPONENT WON!';
            } else {
                winnerText = this.game.winner === 0 ? '🏆 YOU WON!' : '💥 AI WON!';
            }
            text(winnerText, attackGridX + 200, gridY + 20);
            text(winnerText, fleetGridX + 200, gridY + 20);
        }
    }
    
    drawMouseHover() {
        // Draw hover effect on grids
        if (this.gamePhase === 'placement') {
            // Use the correct fleet grid position
            const fleetGridX = this.gridStartX + 80; // Same as in drawGrids
            const fleetGridY = this.gridStartY;
            
            // Calculate grid coordinates to match exactly how cells are drawn
            const cellSize = this.gridSize + this.gridSpacing;
            const gridX = Math.floor((mouseX - fleetGridX) / cellSize);
            const gridY = Math.floor((mouseY - fleetGridY) / cellSize);
            
            // Calculate correct grid bounds
            const gridWidth = 10 * cellSize;
            const gridHeight = 10 * cellSize;
            
            if (gridX >= 0 && gridX < 10 && gridY >= 0 && gridY < 10 && 
                mouseX >= fleetGridX && mouseX < fleetGridX + gridWidth && 
                mouseY >= fleetGridY && mouseY < fleetGridY + gridHeight) {
                const cellX = fleetGridX + gridX * (this.gridSize + this.gridSpacing);
                const cellY = fleetGridY + gridY * (this.gridSize + this.gridSpacing);
                
                // Draw hover highlight
                fill(255, 255, 255, 50);
                stroke(255, 255, 255);
                strokeWeight(2);
                rect(cellX, cellY, this.gridSize, this.gridSize);
            }
        } else if (this.gamePhase === 'playing' && this.currentPlayer === 0) {
            const attackGridX = this.gridStartX + 500; // Fixed to match actual attack grid position
            const attackGridY = this.gridStartY;
            
            // Calculate grid coordinates to match exactly how cells are drawn
            const cellSize = this.gridSize + this.gridSpacing;
            const gridX = Math.floor((mouseX - attackGridX) / cellSize);
            const gridY = Math.floor((mouseY - attackGridY) / cellSize);
            
            if (gridX >= 0 && gridX < 10 && gridY >= 0 && gridY < 10 && mouseX >= attackGridX) {
                const cellX = attackGridX + gridX * (this.gridSize + this.gridSpacing);
                const cellY = attackGridY + gridY * (this.gridSize + this.gridSpacing);
                
                // Draw hover highlight
                fill(255, 255, 255, 50);
                stroke(255, 255, 255);
                strokeWeight(2);
                rect(cellX, cellY, this.gridSize, this.gridSize);
            }
        }
    }
    
    drawGrids(gameInstance) {
        // Draw player grid (centered)
        const fleetGridX = this.gridStartX + 80; // Center the fleet grid at X=80
        console.log('🔍 drawGrids - fleetGridX:', fleetGridX, 'gridStartY:', this.gridStartY, 'gridStartX:', this.gridStartX);
        this.drawGrid(fleetGridX, this.gridStartY, 0, true, gameInstance);
        
        // Draw attack grid (far right side) - MUST match drawBasicGrids exactly
        const attackGridX = this.gridStartX + 500; // Position attack grid far to the right
        const attackGridY = this.gridStartY; // Same Y position
        
        // In multiplayer, show player 0's view of player 1's grid (opponent's grid)
        const attackGridPlayer = this.isMultiplayer ? 0 : 0;
        this.drawGrid(attackGridX, attackGridY, attackGridPlayer, false, gameInstance);
        
        // Draw grids without excessive logging
        
        // CRITICAL FIX: Draw grid titles with proper styling and centering
        const gridWidth = 10 * (this.gridSize + this.gridSpacing); // Total grid width
        const gridCenterOffset = gridWidth / 2; // Center of the grid
        
        // Calculate proper center positions for both grids
        const fleetGridCenter = fleetGridX + gridCenterOffset;
        const attackGridCenter = attackGridX + gridCenterOffset;
        
        // Draw background boxes for better readability
        noStroke();
        fill(0, 0, 0, 220); // Semi-transparent black background
        rect(fleetGridCenter - 70, this.gridStartY - 55, 140, 30);
        rect(attackGridCenter - 70, attackGridY - 55, 140, 30);
        
        // Draw grid titles with better styling
        fill(255, 215, 0); // Gold color for better visibility
        textAlign(CENTER, CENTER);
        textSize(20); // Good readable size
        textStyle(BOLD); // Bold for emphasis
        noStroke(); // No outline for cleaner look
        text('Your Fleet', fleetGridCenter, this.gridStartY - 40);
        text('Attack Grid', attackGridCenter, attackGridY - 40);
        
        // Reset text style
        textStyle(NORMAL);
    }
    
    drawGrid(x, y, player, showShips, gameInstance) {
        const grid = showShips ? gameInstance.playerGrids[player] : gameInstance.attackGrids[player];
        
        // Draw grid background with high contrast to make it visible
        fill(0, 0, 0, 250); // Very dark background with high opacity
        stroke(255, 255, 0); // Yellow border for maximum visibility
        strokeWeight(3);
        rect(x - 8, y - 8, (this.gridSize + this.gridSpacing) * 10 + 16, (this.gridSize + this.gridSpacing) * 10 + 16);
        
        for (let row = 0; row < 10; row++) {
            for (let col = 0; col < 10; col++) {
                const cellX = x + col * (this.gridSize + this.gridSpacing);
                const cellY = y + row * (this.gridSize + this.gridSpacing);
                
                
                this.drawCell(cellX, cellY, grid[row][col], showShips);
            }
        }
        
        // Draw grid labels
        this.drawGridLabels(x, y);
    }
    
    drawCell(x, y, cell, showShips) {
        // First, draw the base cell (water or ship)
        if (showShips && cell.ship) {
            // Draw ship on all cells it occupies
            if (cell.ship.isFirstCell) {
                const shipWidth = cell.ship.orientation === 'horizontal' ? cell.ship.size * (this.gridSize + this.gridSpacing) - this.gridSpacing : this.gridSize;
                const shipHeight = cell.ship.orientation === 'vertical' ? cell.ship.size * (this.gridSize + this.gridSpacing) - this.gridSpacing : this.gridSize;
                
                // Always use colored rectangles instead of ship images to ensure consistent green color
                // if (window.shipImages && window.shipImages[cell.ship.type]) {
                //     // Ship images disabled - use green rectangles instead
                // } else {
                    // Fallback to colored rectangle - don't show ship color for hit cells
                    if (cell.ship.sunk) {
                        fill(139, 0, 0); // Dark red for sunk ships
                    } else if (cell.hit) {
                        // Don't draw ship color for hit cells - let hit symbol handle it completely
                        return; // Skip drawing ship color for hit cells
                    } else {
                        fill(0, 255, 0); // Green for all unhit ships
                    }
                    rect(x, y, shipWidth, shipHeight);
                // }
                
                // Add border only for unhit ships
                if (!cell.hit) {
                    noFill();
                    stroke(255, 255, 255);
                    strokeWeight(1);
                    rect(x, y, shipWidth, shipHeight);
                }
            } else {
                // For non-first cells, don't draw ship color for hit cells
                if (!cell.hit) {
                    // Draw a subtle ship indicator only for unhit cells - use green
                    fill(0, 255, 0, 128); // Green with transparency
                    stroke(0, 255, 0); // Green border
                    strokeWeight(1);
                    rect(x, y, this.gridSize, this.gridSize);
                }
            }
        } else {
            // Water with high contrast for visibility
            fill(40, 40, 40, 220); // Darker gray for better visibility
            stroke(255, 255, 255); // White grid lines
            strokeWeight(2); // Thicker lines for visibility
            rect(x, y, this.gridSize, this.gridSize);
        }
        
        // Then, draw hit/miss indicators ON TOP of everything
        if (cell.hit) {
            // RED square for hits - cover the full ship area if it's a ship cell
            fill(255, 100, 100, 255); // Fully opaque to cover green
            noStroke();
            
            if (showShips && cell.ship) {
                if (cell.ship.isFirstCell) {
                    // Cover the entire ship area for first cell
                    const shipWidth = cell.ship.orientation === 'horizontal' ? cell.ship.size * (this.gridSize + this.gridSpacing) - this.gridSpacing : this.gridSize;
                    const shipHeight = cell.ship.orientation === 'vertical' ? cell.ship.size * (this.gridSize + this.gridSpacing) - this.gridSpacing : this.gridSize;
                    rect(x, y, shipWidth, shipHeight);
                    
                    // White explosion symbol in center of ship
                    fill(255, 255, 255);
                    textAlign(CENTER, CENTER);
                    textSize(16);
                    text('💥', x + shipWidth/2, y + shipHeight/2);
                } else {
                    // Cover individual cell for non-first cells of hit ships
                    rect(x, y, this.gridSize, this.gridSize);
                    
                    // White explosion symbol
                    fill(255, 255, 255);
                    textAlign(CENTER, CENTER);
                    textSize(16);
                    text('💥', x + this.gridSize/2, y + this.gridSize/2);
                }
            } else {
                // Cover individual cell for non-ship hits
                rect(x, y, this.gridSize, this.gridSize);
                
                // White explosion symbol
                fill(255, 255, 255);
                textAlign(CENTER, CENTER);
                textSize(16);
                text('💥', x + this.gridSize/2, y + this.gridSize/2);
            }
        } else if (cell.miss) {
            // BLUE square for misses (whole square) - covers ship squares
            fill(100, 150, 255, 255); // Fully opaque to cover green
            noStroke();
            rect(x, y, this.gridSize, this.gridSize);
            
            // White X symbol
            fill(255, 255, 255);
            textAlign(CENTER, CENTER);
            textSize(16);
            text('✕', x + this.gridSize/2, y + this.gridSize/2);
        } else if (showShips && cell.ship && cell.sunk) {
            // Sunk ship indicator
            fill(100, 0, 0);
            textAlign(CENTER, CENTER);
            textSize(12);
            text('⚓', x + this.gridSize/2, y + this.gridSize/2);
        }
    }
    
    drawGridLabels(x, y) {
        // Draw grid labels with better visibility
        fill(255, 255, 255); // White text
        textAlign(CENTER, CENTER);
        textSize(18); // Much larger for better visibility
        stroke(0, 0, 0); // Black outline
        strokeWeight(2); // Thicker outline
        
        // Numbers (1-10) - positioned above grid to match actual cell positions
        for (let i = 1; i <= 10; i++) {
            const cellX = x + (i-1) * (this.gridSize + this.gridSpacing) + this.gridSize/2;
            text(i, cellX, y - 15);
        }
        
        // Letters (A-J) - positioned to the left of grid to match actual cell positions
        const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
        for (let i = 0; i < 10; i++) {
            const cellY = y + i * (this.gridSize + this.gridSpacing) + this.gridSize/2;
            text(letters[i], x - 25, cellY);
        }
        
    }
    
    drawShips(gameInstance) {
        // Draw ships being placed - preview is handled in main draw()
        
        // Draw placed ships on the player grid
        this.drawPlacedShips(gameInstance);
    }
    
    drawPlacedShips(gameInstance) {
        // Draw all placed ships on the player grid
        for (let i = 0; i < gameInstance.placedShips[0].length; i++) {
            const ship = gameInstance.placedShips[0][i];
            this.drawShipOnGrid(ship, 0, gameInstance);
        }
    }
    
    drawShipOnGrid(ship, player, gameInstance) {
        // Use the correct grid position for the fleet grid
        const fleetGridX = this.gridStartX + 80; // Same as in drawGrids
        const fleetGridY = this.gridStartY;
        
        // Debug: Log ship coordinates and status
        console.log('🔍 drawShipOnGrid - ship.x:', ship.x, 'ship.y:', ship.y, 'hits:', ship.hits, 'sunk:', ship.sunk, 'fleetGridX:', fleetGridX, 'fleetGridY:', fleetGridY);
        
        const cellX = fleetGridX + ship.x * (this.gridSize + this.gridSpacing);
        const cellY = fleetGridY + ship.y * (this.gridSize + this.gridSpacing);
        
        console.log('🔍 drawShipOnGrid - cellX:', cellX, 'cellY:', cellY, 'ship.size:', ship.size);
        
        // Draw each cell of the ship individually to show hit status per cell
        for (let i = 0; i < ship.size; i++) {
            let cellXPos, cellYPos;
            
            if (ship.orientation === 'horizontal') {
                cellXPos = cellX + i * (this.gridSize + this.gridSpacing);
                cellYPos = cellY;
            } else {
                cellXPos = cellX;
                cellYPos = cellY + i * (this.gridSize + this.gridSpacing);
            }
            
            // Get the grid cell to check if this specific cell is hit
            const gridX = ship.x + (ship.orientation === 'horizontal' ? i : 0);
            const gridY = ship.y + (ship.orientation === 'vertical' ? i : 0);
            const cell = gameInstance.playerGrids[player][gridY][gridX];
            
            // Only draw unhit ships - let hit symbols handle hit cells
            let cellColor, strokeColor;
            if (ship.sunk) {
                // Ship is completely sunk - dark red
                cellColor = [139, 0, 0, 200]; // Dark red
                strokeColor = [255, 0, 0]; // Bright red border
            } else if (cell.hit) {
                // This specific cell is hit - don't draw anything, let hit symbol handle it
                continue; // Skip drawing this cell completely
            } else {
                // All unhit ships should be green (ignore ship.color)
                cellColor = [0, 255, 0, 150]; // Green
                strokeColor = [0, 255, 0]; // Green border
            }
            
            // Set colors and draw this cell
            fill(cellColor[0], cellColor[1], cellColor[2], cellColor[3]);
            stroke(strokeColor[0], strokeColor[1], strokeColor[2]);
            strokeWeight(2);
            rect(cellXPos, cellYPos, this.gridSize, this.gridSize);
        }
    }
    
    drawShipPreview(gameInstance) {
        // Only draw ship preview during placement phase and when there's a current ship
        if (!this.currentShip || this.gamePhase !== 'placement') {
            return;
        }
        
        // If no currentShip on client, try to get it from the game instance
        if (!this.currentShip && gameInstance && gameInstance.currentShip) {
            this.currentShip = gameInstance.currentShip;
        }
        
        if (!this.currentShip) {
            return;
        }
        
        const ship = this.currentShip;
        const orientation = ship.orientation || 'horizontal';
        const cellSize = this.gridSize + this.gridSpacing;
        
        // Get the actual canvas dimensions
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        
        // In p5.js, mouseX and mouseY are already in canvas coordinates
        const mouseCanvasX = mouseX;
        const mouseCanvasY = mouseY;
        
        // Debug: Draw a small red dot at mouse position to verify coordinates (disabled)
        // fill(255, 0, 0, 255);
        // noStroke();
        // ellipse(mouseCanvasX, mouseCanvasY, 8, 8);
        
        // Calculate which grid cell the mouse is over
        const fleetGridX = this.gridStartX + 80;
        const fleetGridY = this.gridStartY;
        
        // Calculate grid cell coordinates - use exact fleetGridX position
        const gridX = Math.floor((mouseCanvasX - fleetGridX) / cellSize);
        const gridY = Math.floor((mouseCanvasY - fleetGridY) / cellSize);
        
        // Only log coordinates when they're valid (not negative)
        if (gridX >= 0 && gridY >= 0 && gridX < 10 && gridY < 10) {
            // Valid coordinates - no need to log every frame
        }
        
        // Check if the ship can be placed at the current grid position
        const canPlace = gameInstance.canPlaceShip(0, gridX, gridY, ship.size, orientation);
        
        // Draw preview squares snapped to grid cells (only when over the grid)
        if (gridX >= 0 && gridX < 10 && gridY >= 0 && gridY < 10) {
            // Calculate the actual grid cell positions
            const gridStartX = fleetGridX + gridX * cellSize;
            const gridStartY = fleetGridY + gridY * cellSize;
            
            // Draw individual squares snapped to grid
            for (let i = 0; i < ship.size; i++) {
                let cellX = gridStartX + (orientation === 'horizontal' ? i * cellSize : 0);
                let cellY = gridStartY + (orientation === 'vertical' ? i * cellSize : 0);
                
                // Use red if can't place, green if can place
                if (canPlace) {
                    fill(0, 255, 0, 150); // Green - can place
                } else {
                    fill(255, 0, 0, 150); // Red - can't place
                }
                stroke(255, 255, 255); // White border
                strokeWeight(2);
                rect(cellX, cellY, this.gridSize, this.gridSize);
                
                // Add ship name on first cell only
                if (i === 0) {
                    fill(255);
                    textAlign(CENTER, CENTER);
                    textSize(8);
                    text(ship.name.substring(0, 2), cellX + this.gridSize/2, cellY + this.gridSize/2);
                }
            }
        }
        
        // Draw ship image - snap to grid when over grid, follow mouse otherwise
        const totalWidth = orientation === 'horizontal' ? ship.size * cellSize : cellSize;
        const totalHeight = orientation === 'vertical' ? ship.size * cellSize : cellSize;
        
        // Calculate ship image position
        let startX, startY;
        
        if (gridX >= 0 && gridX < 10 && gridY >= 0 && gridY < 10) {
            // Snap to grid when over the grid area
            const gridStartX = fleetGridX + gridX * cellSize;
            const gridStartY = fleetGridY + gridY * cellSize;
            startX = gridStartX;
            startY = gridStartY;
        } else {
            // Follow mouse cursor when outside grid
            startX = mouseCanvasX - totalWidth / 2;
            startY = mouseCanvasY - totalHeight / 2;
        }
        
        // Draw the ship image for preview
        const shipImage = window.shipImages ? window.shipImages[ship.type] : null;
        
        if (shipImage) {
            if (orientation === 'vertical') {
                push();
                // For vertical ships, we need to rotate around the center of the ship
                const centerX = startX + totalWidth / 2;
                const centerY = startY + totalHeight / 2;
                translate(centerX, centerY);
                rotate(PI/2); // 90 degrees clockwise
                // Draw the image with swapped dimensions to prevent stretching
                // The image should be drawn with the original horizontal dimensions
                const imageWidth = ship.size * cellSize;  // Original horizontal width
                const imageHeight = cellSize;             // Original horizontal height
                image(shipImage, -imageWidth / 2, -imageHeight / 2, imageWidth, imageHeight);
                pop();
            } else {
                image(shipImage, startX, startY, totalWidth, totalHeight);
            }
        } else {
            // Fallback to green rectangle if no image
            fill(0, 255, 0); // Green for all ship previews
            stroke(255, 255, 255);
            strokeWeight(1);
            rect(startX, startY, totalWidth, totalHeight);
        }
        
        // Draw placement instructions
        fill(255);
        textAlign(LEFT, TOP);
        textSize(14);
        text(`PLACING: ${ship.name.toUpperCase()} (${ship.size} squares)`, 10, canvasHeight - 80);
        text(`ORIENTATION: ${orientation.toUpperCase()}`, 10, canvasHeight - 60);
        text(`PRESS R TO ROTATE, ESC TO CANCEL`, 10, canvasHeight - 40);
    }
    
    drawUI(gameInstance) {
        // Draw current ship being placed
        if (gameInstance.currentShip) {
            this.drawCurrentShipInfo(gameInstance);
        }
        
        // Draw game phase indicator
        this.drawGamePhaseIndicator();
    }
    
    drawCurrentShipInfo(gameInstance) {
        const ship = gameInstance.currentShip;
        if (!ship) return;
        
        // CRITICAL FIX: Draw fully opaque background to prevent text bleeding through
        fill(0, 0, 0, 255); // Fully opaque black background
        noStroke();
        rect(10, height - 150, 300, 140);
        
        // CRITICAL FIX: Draw border with good contrast
        noFill();
        stroke(255, 215, 0); // Gold border
        strokeWeight(3); // Thicker border for better visibility
        rect(10, height - 150, 300, 140);
        
        // CRITICAL FIX: Draw text with proper styling - clear background and high contrast
        textAlign(LEFT, TOP);
        noStroke();
        
        // Title text - bright gold/yellow for high contrast
        fill(255, 215, 0); // Bright gold
        textSize(18); // Larger font
        textStyle(BOLD);
        text(`Placing: ${ship.name}`, 20, height - 145);
        
        // Body text - bright white for maximum contrast
        fill(255, 255, 255); // Pure white
        textSize(15); // Readable size
        textStyle(NORMAL);
        text(`Size: ${ship.size} squares`, 20, height - 120);
        text(`Orientation: ${ship.orientation || 'horizontal'}`, 20, height - 100);
        
        // Instruction text - slightly dimmed but still readable
        fill(200, 200, 255); // Light blue for instructions
        textSize(13);
        text(`Click on the left grid to place`, 20, height - 80);
        text(`Press R to rotate, Esc to cancel`, 20, height - 60);
        
        // Draw ship preview with better visibility
        const shipWidth = ship.orientation === 'horizontal' ? ship.size * 15 : 15;
        const shipHeight = ship.orientation === 'vertical' ? ship.size * 15 : 15;
        
        fill(0, 255, 0); // Green for all ship previews
        stroke(255);
        strokeWeight(2); // Thicker border
        rect(20, height - 40, shipWidth, shipHeight);
    }
    
    drawGamePhaseIndicator() {
        if (this.gamePhase === 'placement') {
            // Ships placed box removed as requested
        } else if (this.gamePhase === 'playing') {
            // Draw turn indicator
            fill(0, 0, 0, 200);
            stroke(this.currentPlayer === 0 ? 76 : 255, 175, 80);
            strokeWeight(2);
            rect(width - 250, 10, 240, 60);
            
            if (this.isMultiplayer) {
                fill(this.isPlayerTurn ? 76 : 255, 175, 80);
                textAlign(LEFT, TOP);
                textSize(16);
                text(`Turn: ${this.isPlayerTurn ? 'Your Turn' : 'Opponent Turn'}`, width - 240, 20);
                
                fill(255);
                textSize(14);
                text(this.isPlayerTurn ? 'Click on the right grid to attack!' : 'Waiting for opponent...', width - 240, 40);
            } else {
                fill(this.currentPlayer === 0 ? 76 : 255, 175, 80);
                textAlign(LEFT, TOP);
                textSize(16);
                text(`Turn: ${this.currentPlayer === 0 ? 'Your Turn' : 'AI Turn'}`, width - 240, 20);
                
                fill(255);
                textSize(14);
                text(this.currentPlayer === 0 ? 'Click on the right grid to attack!' : 'AI is thinking...', width - 240, 40);
            }
        }
    }
    
    mousePressed() {
        console.log(`🎯 BattleshipClient.mousePressed called - mouseX: ${mouseX}, mouseY: ${mouseY}`);
        console.log(`🎯 Game state - game: ${!!this.game}, gamePhase: ${this.game?.gamePhase}, currentShip: ${!!this.currentShip}`);
        
        // Prevent clicks during resize events
        if (this.isResizing) {
            console.log(`🎯 Click ignored - window is resizing`);
            return;
        }
        
        // Additional check for phantom events during resize
        if (this.resizeTimeout) {
            console.log(`🎯 Click ignored - resize timeout active`);
            return;
        }
        
        // Check for phantom events with invalid coordinates
        if (mouseX < 0 || mouseY < 0 || mouseX > windowWidth || mouseY > windowHeight) {
            console.log(`🎯 Click ignored - invalid coordinates: mouseX=${mouseX}, mouseY=${mouseY}`);
            return;
        }
        
        // Check for phantom events that are clearly outside the game area
        if (mouseX > 1000 || mouseY > 1000) {
            console.log(`🎯 Click ignored - coordinates way outside game area: mouseX=${mouseX}, mouseY=${mouseY}`);
            return;
        }
        
        if (this.game && this.game.gamePhase === 'placement') {
            console.log(`🎯 In placement phase - calling handleShipPlacement`);
            // In placement mode, always try to place the ship first
            // Only check for ship item clicks if placement fails
            this.handleShipPlacement();
            // Redraw for ship placement visual feedback
            redraw();
            return;
        }
        
        // Check if click was on a ship item for ship selection (only when not placing)
        const clickedElement = document.elementFromPoint(mouseX, mouseY);
        if (clickedElement && clickedElement.closest('.ship-item')) {
            console.log('🎯 Click on ship item - handling ship selection');
            // Ship selection is handled by the event listeners in setupShipPlacement
            // No need to do anything here as the click will be handled by the ship item's click listener
            return;
        } else if (this.game && this.game.gamePhase === 'playing') {
            this.handleAttack();
        }
    }
    
    handleShipPlacement() {
        // Use the correct fleet grid position
        const fleetGridX = this.gridStartX + 80; // Same as in drawGrids
        const fleetGridY = this.gridStartY;
        
        console.log('🔍 handleShipPlacement - mouseX:', mouseX, 'mouseY:', mouseY, 'fleetGridX:', fleetGridX, 'fleetGridY:', fleetGridY, 'gridStartX:', this.gridStartX, 'gridStartY:', this.gridStartY);
        
        // Calculate grid coordinates to match exactly how cells are drawn
        const cellSize = this.gridSize + this.gridSpacing;
        const gridX = Math.floor((mouseX - fleetGridX) / cellSize);
        const gridY = Math.floor((mouseY - fleetGridY) / cellSize);
        
        console.log('🔍 Calculated grid coordinates - gridX:', gridX, 'gridY:', gridY, 'cellSize:', cellSize);
        console.log('🔍 Mouse position relative to grid - relX:', mouseX - fleetGridX, 'relY:', mouseY - fleetGridY);
        console.log('🔍 Grid cell size calculation - gridSize:', this.gridSize, 'gridSpacing:', this.gridSpacing, 'cellSize:', cellSize);
        
        // Calculate correct grid bounds
        const gridWidth = 10 * cellSize;
        const gridHeight = 10 * cellSize;
        
        // Only handle clicks on the fleet grid
        const inBounds = gridX >= 0 && gridX < 10 && gridY >= 0 && gridY < 10;
        const inMouseBounds = mouseX >= fleetGridX && mouseX < fleetGridX + gridWidth && 
                             mouseY >= fleetGridY && mouseY < fleetGridY + gridHeight;
        
        console.log('🔍 Bounds checking - inBounds:', inBounds, 'inMouseBounds:', inMouseBounds);
        console.log('🔍 Grid bounds - gridWidth:', gridWidth, 'gridHeight:', gridHeight);
        console.log('🔍 Mouse bounds check - mouseX >= fleetGridX:', mouseX >= fleetGridX, 'mouseX < fleetGridX + gridWidth:', mouseX < fleetGridX + gridWidth);
        console.log('🔍 Mouse bounds check - mouseY >= fleetGridY:', mouseY >= fleetGridY, 'mouseY < fleetGridY + gridHeight:', mouseY < fleetGridY + gridHeight);
        
        if (inBounds && inMouseBounds) {
            if (this.currentShip) {
                const shipName = this.currentShip.name;
                const orientation = this.currentShip.orientation || 'horizontal';
                console.log(`🚢 Attempting to place ${shipName} at (${gridX}, ${gridY}) with orientation ${orientation}`);
                const gameInstance = window.battleshipGame || this.game;
                const success = gameInstance.placeShipAt(gridX, gridY, orientation);
                if (success) {
                    console.log(`✅ Placed ${shipName} at (${gridX}, ${gridY})`);
                    // Static render after ship placement
                    this.staticRender();
                    return true; // Placement successful
                } else {
                    console.log(`❌ Cannot place ${shipName} at (${gridX}, ${gridY}) - checking adjacent cells...`);
                    // Debug: Check what's preventing placement
                    this.debugShipPlacement(gridX, gridY, this.currentShip.size, orientation);
                    return false; // Placement failed
                }
            } else {
                console.log(`❌ No current ship selected for placement`);
                return false; // No ship selected
            }
        } else {
            console.log(`❌ Click outside fleet grid: gridX=${gridX}, gridY=${gridY}, mouseX=${mouseX}, mouseY=${mouseY}`);
            console.log(`❌ Bounds check failed - inBounds: ${inBounds}, inMouseBounds: ${inMouseBounds}`);
            console.log(`❌ Grid position - fleetGridX: ${fleetGridX}, fleetGridY: ${fleetGridY}`);
            console.log(`❌ Grid size - gridWidth: ${gridWidth}, gridHeight: ${gridHeight}`);
            return false; // Click outside grid
        }
    }
    
    debugShipPlacement(x, y, size, orientation) {
        console.log(`🔍 Debug ship placement at (${x}, ${y}) with size ${size} and orientation ${orientation}`);
        const grid = this.game.playerGrids[0];
        
        for (let i = 0; i < size; i++) {
            const checkX = orientation === 'horizontal' ? x + i : x;
            const checkY = orientation === 'vertical' ? y + i : y;
            
            console.log(`🔍 Checking cell (${checkX}, ${checkY}):`);
            
            // Check bounds
            if (checkX >= this.game.gridSize || checkY >= this.game.gridSize) {
                console.log(`❌ Out of bounds: checkX=${checkX}, checkY=${checkY}, gridSize=${this.game.gridSize}`);
                return;
            }
            if (checkX < 0 || checkY < 0) {
                console.log(`❌ Negative coordinates: checkX=${checkX}, checkY=${checkY}`);
                return;
            }
            
            // Check if cell is already occupied
            if (grid[checkY][checkX].ship !== null) {
                console.log(`❌ Cell (${checkX}, ${checkY}) already occupied by ship: ${grid[checkY][checkX].ship}`);
                return;
            }
            
            // Check adjacent cells
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    const adjX = checkX + dx;
                    const adjY = checkY + dy;
                    
                    if ((dx === 0 && dy === 0) || adjX < 0 || adjY < 0 || adjX >= this.game.gridSize || adjY >= this.game.gridSize) {
                        continue;
                    }
                    
                    if (grid[adjY][adjX].ship !== null) {
                        console.log(`❌ Adjacent cell (${adjX}, ${adjY}) has ship: ${grid[adjY][adjX].ship}`);
                        return;
                    }
                }
            }
        }
        
        console.log(`✅ All checks passed - ship should be placeable`);
    }
    
    handleAttack() {
        // Prevent attacks during resize events
        if (this.isResizing || this.resizeTimeout) {
            console.log(`🎯 Attack blocked - window is resizing`);
            return;
        }
        
        // DEBOUNCE CLICKS - prevent multiple rapid clicks
        const currentTime = Date.now();
        if (currentTime - this.lastClickTime < this.clickDebounceMs) {
            console.log(`🎯 Click debounced - too soon after last click`);
            return;
        }
        this.lastClickTime = currentTime;
        
        console.log(`🎯 handleAttack called - single click handler`);
        console.log(`🎯 Mouse coordinates: mouseX=${mouseX}, mouseY=${mouseY}`);
        console.log(`🎯 Grid start position: gridStartX=${this.gridStartX}, gridStartY=${this.gridStartY}`);
        
        // Check if this is a phantom event (coordinates that don't make sense)
        if (mouseX === 0 && mouseY === 0) {
            console.log(`🎯 Click rejected - phantom event (0,0)`);
            return;
        }
        
        // Check if coordinates are negative (invalid)
        if (mouseX < 0 || mouseY < 0) {
            console.log(`🎯 Click rejected - negative coordinates: mouseX=${mouseX}, mouseY=${mouseY}`);
            return;
        }
        
        // Use correct attack grid position (must match drawGrids)
        const attackGridX = this.gridStartX + 500; // Match drawGrids position
        const attackGridY = this.gridStartY; // Same Y as player grid
        
        // Check if coordinates are too far from the attack grid (likely phantom event)
        const distanceFromAttackGrid = Math.sqrt(Math.pow(mouseX - attackGridX, 2) + Math.pow(mouseY - attackGridY, 2));
        if (distanceFromAttackGrid > 1000) {
            console.log(`🎯 Click rejected - too far from attack grid: distance=${distanceFromAttackGrid}`);
            return;
        }
        
        // Check if coordinates are way outside the window bounds (likely phantom event)
        if (mouseX > windowWidth + 100 || mouseY > windowHeight + 100) {
            console.log(`🎯 Click rejected - way outside window bounds: mouseX=${mouseX}, mouseY=${mouseY}, windowWidth=${windowWidth}, windowHeight=${windowHeight}`);
            return;
        }
        
        console.log(`🎯 Attack grid position: attackGridX=${attackGridX}, attackGridY=${attackGridY}`);
        
        // Calculate grid coordinates to match exactly how cells are drawn
        const cellSize = this.gridSize + this.gridSpacing;
        const gridX = Math.floor((mouseX - attackGridX) / cellSize);
        const gridY = Math.floor((mouseY - attackGridY) / cellSize);
        
        console.log(`🎯 Calculated grid coordinates: gridX=${gridX}, gridY=${gridY}`);
        console.log(`🎯 Cell size: ${cellSize}, mouse relative to attack grid: (${mouseX - attackGridX}, ${mouseY - attackGridY})`);
        console.log(`🎯 Attack grid position: (${attackGridX}, ${attackGridY}), Mouse: (${mouseX}, ${mouseY})`);
        
        // CRITICAL FIX: Ensure coordinates are within valid bounds
        if (gridX < 0 || gridX >= 10 || gridY < 0 || gridY >= 10) {
            console.log(`🎯 Click rejected - coordinates out of bounds: (${gridX}, ${gridY})`);
            return;
        }
        
        
        // STRICT BOUNDS CHECKING - only allow clicks within the actual attack grid
        const maxGridX = attackGridX + (10 * cellSize);
        const maxGridY = attackGridY + (10 * cellSize);
        
        // Additional validation: reject clicks that are clearly outside reasonable bounds
        if (mouseX < 0 || mouseY < 0 || mouseX > windowWidth || mouseY > windowHeight) {
            console.log(`🎯 Click rejected - outside window bounds: mouseX=${mouseX}, mouseY=${mouseY}, windowWidth=${windowWidth}, windowHeight=${windowHeight}`);
            return;
        }
        
        // Additional validation: reject clicks that are clearly outside the attack grid area
        if (mouseX < attackGridX - 100 || mouseX > attackGridX + 500 || 
            mouseY < attackGridY - 100 || mouseY > attackGridY + 500) {
            console.log(`🎯 Click rejected - way outside attack grid area: mouseX=${mouseX}, mouseY=${mouseY}, attackGridX=${attackGridX}, attackGridY=${attackGridY}`);
            return;
        }
        
        // Only handle clicks on the attack grid and only on player's turn
        if (gridX >= 0 && gridX < 10 && gridY >= 0 && gridY < 10 && 
            mouseX >= attackGridX && mouseX < maxGridX && 
            mouseY >= attackGridY && mouseY < maxGridY && 
            this.gamePhase === 'playing') {
            
            // In multiplayer, check if it's the player's turn
            if (this.isMultiplayer && !this.isPlayerTurn) {
                const gameInstance = window.battleshipGame || this.game;
                gameInstance.addToHistory('❌ Not your turn!', 'error');
                return;
            }
            
            // CRITICAL FIX: Check if it's actually the player's turn
            const gameInstance = window.battleshipGame || this.game;
            if (gameInstance.currentPlayer !== 0) {
                gameInstance.addToHistory('❌ Not your turn! Wait for your opponent.', 'error');
                return;
            }
            
            // Check if this position has already been attacked
            const attackGrid = gameInstance.attackGrids[0]; // Always use player 0's attack grid
            if (attackGrid[gridY][gridX].hit || attackGrid[gridY][gridX].miss) {
                gameInstance.addToHistory('❌ You already attacked this position!', 'error');
                return;
            }
            
            const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
            gameInstance.addToHistory(`🎯 You attack ${letters[gridY]}${gridX + 1}`, 'info');
            
            const result = gameInstance.attack(0, gridX, gridY);
            if (result.valid) {
                console.log(`🎯 Attacked (${gridX}, ${gridY}): ${result.hit ? 'HIT' : 'MISS'}`);
                
                // CRITICAL FIX: In Battleship, you keep your turn when you hit (hit or sink)
                // Only end turn when you miss
                if (!result.hit) {
                    // Miss - end turn (switch to AI)
                    // CRITICAL FIX: Show who missed
                    gameInstance.addToHistory('💧 You missed! Bot\'s turn now.', 'info');
                    gameInstance.endTurn();
                } else {
                    // Hit (whether sunk or not) - player gets another turn
                    if (result.sunk) {
                        gameInstance.addToHistory('💥 Ship sunk! You get another turn!', 'success');
                    } else {
                        gameInstance.addToHistory('🎯 Hit! You get another turn!', 'success');
                    }
                    // Don't end turn - player can click again to attack
                    // But ensure currentPlayer stays 0
                    gameInstance.currentPlayer = 0;
                }
                
                // Static render after attack
                this.staticRender();
            } else {
                console.log(`❌ Invalid attack: ${result.message}`);
                gameInstance.addToHistory(`❌ ${result.message}`, 'error');
            }
        }
    }
    
    keyPressed() {
        if (key === 'r' || key === 'R') {
            if (this.game.currentShip) {
                this.game.rotateCurrentShip();
                // Sync client's currentShip with game's currentShip after rotation
                this.currentShip = this.game.currentShip;
                // Static render after ship rotation
                this.staticRender();
            }
        } else if (key === 'Escape') {
            if (this.game.currentShip) {
                this.game.cancelShipPlacement();
                // Clear client's currentShip after cancellation
                this.currentShip = null;
                // Static render after cancellation
                this.staticRender();
            }
        }
    }
    
    mouseMoved() {
        // Redraw when mouse moves during ship placement to update preview
        if (this.game.gamePhase === 'placement' && this.currentShip) {
            redraw();
        }
    }
}

// Global game instance
let battleshipGame;
let battleshipClient;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚢 Initializing Battleship game...');
    
    // Add a small delay to ensure multiplayer socket is ready
    setTimeout(() => {
        battleshipGame = new BattleshipGame();
        window.battleshipGame = battleshipGame; // Make it globally accessible
    }, 100);
    
    // Set up callback for when ship images are loaded
    window.checkShipImagesLoaded = function() {
        if (battleshipGame && battleshipGame.checkAndUpdateShipImages) {
            battleshipGame.checkAndUpdateShipImages();
        }
    };
    
    // Wait for p5.js to be available
    const initClient = () => {
        if (typeof createCanvas !== 'undefined') {
            if (!battleshipClient) {
                battleshipClient = new BattleshipClient();
                window.battleshipClient = battleshipClient; // Make it globally accessible
                battleshipClient.initialize(); // Initialize with global game instance
                console.log('🎮 Battleship client initialized');
            }
        } else {
            console.log('⏳ Waiting for p5.js...');
            setTimeout(initClient, 100);
        }
    };
    
    setTimeout(initClient, 200);
});

// p5.js functions - setup() is handled in setup.js

function draw() {
    // console.log('🎨 Global draw() called - battleshipClient:', battleshipClient, 'initialized:', battleshipClient?.initialized);
    
    if (battleshipClient && battleshipClient.initialized) {
        battleshipClient.draw();
    } else {
        // Don't draw grids until client is ready to prevent coordinate mismatch
        fill(255);
        textAlign(CENTER, CENTER);
        textSize(24);
        text('Loading Battleship Game...', width/2, height/2);
        
        // Try to initialize client if not done yet
        if (battleshipGame && !battleshipClient) {
            console.log('🎮 Initializing battleship client...');
            battleshipClient = new BattleshipClient();
            window.battleshipClient = battleshipClient; // Make it globally accessible
            battleshipClient.initialize(); // Initialize with global game instance
        }
    }
    
    // Check if ship images are loaded and update UI if needed (only once)
    if (battleshipGame && battleshipGame.checkAndUpdateShipImages && !battleshipGame.imagesChecked) {
        battleshipGame.checkAndUpdateShipImages();
        battleshipGame.imagesChecked = true;
    }
}

// drawBasicGrids function removed - using only BattleshipClient.drawGrids() to prevent coordinate mismatch

// drawBasicGrid function removed - using only BattleshipClient.drawGrid() to prevent coordinate mismatch

function mousePressed() {
    console.log(`🎯 Global mousePressed called`);
    if (battleshipClient) {
        battleshipClient.mousePressed();
    }
}

function mouseMoved() {
    if (battleshipClient) {
        battleshipClient.mouseMoved();
    }
}

function keyPressed() {
    if (battleshipClient) {
        battleshipClient.keyPressed();
    }
}

function windowResized() {
    console.log('🔍 DEBUG: battleship windowResized called');
    console.log('🔍 DEBUG: window.game exists:', !!window.game);
    console.log('🔍 DEBUG: window.game.players exists:', !!(window.game && window.game.players));
    console.log('🔍 DEBUG: players length:', window.game?.players?.length || 0);
    console.log('🔍 DEBUG: gameState:', typeof gameState !== 'undefined' ? gameState : 'undefined');
    console.log('🔍 DEBUG: gamePhase:', window.game?.gamePhase);
    
    // CRITICAL: Don't resize canvas during active gameplay to prevent button position issues
    // Check multiple conditions to ensure we don't resize during gameplay
    
    // Check if we're on a game page (not just menu) - this is the most important check
    const currentPath = window.location.pathname;
    if (currentPath !== '/' && currentPath !== '/main-menu' && currentPath !== '/index.html') {
        console.log('On game page - skipping canvas resize to prevent button position issues');
        return;
    }
    
    // Check if game is in playing phase
    if (window.game && window.game.gamePhase === 'playing') {
        console.log('Game phase is playing - skipping canvas resize to prevent button position issues');
        return;
    }
    
    // Check if we have active players
    if (window.game && window.game.players && window.game.players.length > 0) {
        console.log('Game active - skipping canvas resize to prevent button position issues');
        return;
    }
    
    // Additional check for gameState if window.game is not available
    if (typeof gameState !== 'undefined' && gameState === gameStateEnum.Playing) {
        console.log('Game state indicates playing - skipping canvas resize to prevent button position issues');
        return;
    }
    
    if (battleshipClient && battleshipClient.canvas) {
        console.log('Proceeding with battleship canvas resize...');
        resizeCanvas(windowWidth, windowHeight);
    }
}
