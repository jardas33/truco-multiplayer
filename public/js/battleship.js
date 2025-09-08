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
        this.currentPlayer = 0; // 0 = human, 1 = AI
        this.gameOver = false;
        this.winner = null;
        
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
            
            // Clear localStorage after reading
            localStorage.removeItem('battleshipRoomCode');
            localStorage.removeItem('battleshipPlayerCount');
            localStorage.removeItem('battleshipGameMode');
        }
        
        this.addToHistory('🎮 Game initialized. Place your ships to begin!', 'info');
        this.updateUI();
        console.log('🎨 About to render ships list...');
        this.renderShipsList();
        console.log('✅ Ships list rendered');
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
    
    showGameMessage(message, duration = 2000) {
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
        const gamePhase = document.getElementById('gamePhase');
        const gameStatus = document.getElementById('gameStatus');
        const currentTurn = document.getElementById('currentTurn');
        const startBtn = document.getElementById('startGameBtn');
        const instructions = document.getElementById('instructions');
        
        if (gamePhase) {
            switch (this.gamePhase) {
                case 'placement':
                    gamePhase.textContent = '⚓ Ship Placement Phase';
                    break;
                case 'playing':
                    gamePhase.textContent = this.currentPlayer === 0 ? '🎯 Your Turn' : '🤖 AI Turn';
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
                    gameStatus.textContent = this.currentPlayer === 0 ? 'Choose your target' : 'AI is thinking...';
                    break;
                case 'finished':
                    gameStatus.textContent = this.winner === 0 ? 'You won!' : 'AI won!';
                    break;
            }
        }
        
        if (currentTurn) {
            currentTurn.textContent = this.currentPlayer === 0 ? 'You' : 'AI';
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
                    instructions.textContent = this.currentPlayer === 0 ? 'Click on the attack grid to fire!' : 'AI is making its move...';
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
        
        this.gamePhase = 'playing';
        this.currentPlayer = 0;
        this.addToHistory('🚀 Battle started! Your turn to attack!', 'success');
        this.updateUI();
        this.setupAIShips();
        console.log('✅ Game started successfully!');
    }
    
    setupAIShips() {
        // AI places ships randomly using the same rules as human player
        const aiShips = [...this.ships];
        let attempts = 0;
        const maxAttempts = 2000; // Increased for better success rate with adjacent checking
        
        while (this.placedShips[1].length < 5 && attempts < maxAttempts) {
            const ship = aiShips[this.placedShips[1].length];
            const orientation = Math.random() < 0.5 ? 'horizontal' : 'vertical';
            const x = Math.floor(Math.random() * (this.gridSize - (orientation === 'horizontal' ? ship.size - 1 : 0)));
            const y = Math.floor(Math.random() * (this.gridSize - (orientation === 'vertical' ? ship.size - 1 : 0)));
            
            if (this.canPlaceShip(1, x, y, ship.size, orientation)) {
                this.placeShip(1, x, y, ship, orientation);
            }
            attempts++;
        }
        
        if (this.placedShips[1].length < 5) {
            this.addToHistory('⚠️ AI had difficulty placing all ships. Game may be unbalanced.', 'warning');
        } else {
            this.addToHistory('🤖 AI has placed all ships. Battle begins!', 'info');
        }
    }
    
    canPlaceShip(player, x, y, size, orientation) {
        const grid = this.playerGrids[player];
        
        for (let i = 0; i < size; i++) {
            const checkX = orientation === 'horizontal' ? x + i : x;
            const checkY = orientation === 'vertical' ? y + i : y;
            
            // Check bounds
            if (checkX >= this.gridSize || checkY >= this.gridSize) return false;
            if (checkX < 0 || checkY < 0) return false;
            
            // Check if cell is already occupied
            if (grid[checkY][checkX].ship !== null) return false;
            
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
                    if (grid[adjY][adjX].ship !== null) return false;
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
        
        const targetPlayer = 1 - player;
        const grid = this.playerGrids[targetPlayer];
        const attackGrid = this.attackGrids[player];
        
        if (attackGrid[y][x].hit || attackGrid[y][x].miss) {
            return { valid: false, message: 'Already attacked this position!' };
        }
        
        const cell = grid[y][x];
        const isHit = cell.ship !== null;
        
        if (isHit) {
            attackGrid[y][x].hit = true;
            cell.hit = true;
            
            const ship = cell.ship;
            ship.hits++;
            
            if (ship.hits >= ship.size) {
                this.sinkShip(targetPlayer, ship);
                this.addToHistory(`💥 ${player === 0 ? 'You' : 'AI'} sunk the ${ship.name}!`, 'sunk');
                this.showGameMessage(`💥 ${ship.name} SUNK!`, 3000);
                
                if (this.checkGameOver(targetPlayer)) {
                    this.endGame(player);
                    return { valid: true, hit: true, sunk: true, ship: ship.name, gameOver: true };
                }
                
                return { valid: true, hit: true, sunk: true, ship: ship.name };
            } else {
                this.addToHistory(`🎯 ${player === 0 ? 'You' : 'AI'} hit the ${ship.name}!`, 'hit');
                this.showGameMessage(`🎯 HIT! ${ship.name} damaged!`, 2000);
                return { valid: true, hit: true, sunk: false, ship: ship.name };
            }
        } else {
            attackGrid[y][x].miss = true;
            cell.miss = true;
            this.addToHistory(`💧 ${player === 0 ? 'You' : 'AI'} missed!`, 'miss');
            this.showGameMessage(`💧 Miss!`, 1500);
            return { valid: true, hit: false };
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
        
        if (winner === 0) {
            this.addToHistory('🏆 Congratulations! You won the battle!', 'success');
            this.showGameMessage('🏆 VICTORY! You sunk all enemy ships!', 5000);
            this.triggerVictoryEffect();
        } else {
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
        this.currentPlayer = 1 - this.currentPlayer;
        this.updateUI();
        
        if (this.currentPlayer === 1 && this.gamePhase === 'playing') {
            setTimeout(() => this.aiTurn(), 1000);
        }
    }
    
    aiTurn() {
        if (this.gamePhase !== 'playing' || this.currentPlayer !== 1 || this.gameOver) return;
        
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
        
        if (result.hit) {
            this.aiMode = 'target';
            this.aiLastHit = { x, y };
            this.aiHits.push({ x, y });
            
            if (!result.sunk) {
                // Continue targeting if not sunk - but only if it's still AI's turn
                if (this.currentPlayer === 1 && this.gamePhase === 'playing') {
                    setTimeout(() => this.aiTurn(), 2000);
                }
            } else {
                // Ship sunk, go back to hunt mode
                this.aiMode = 'hunt';
                this.aiLastHit = null;
                this.endTurn();
            }
        } else {
            this.endTurn();
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
        
        this.currentShip = { ...ship, index: shipIndex };
        console.log('✅ Current ship set:', this.currentShip);
        this.addToHistory(`📌 Click on the grid to place ${ship.name}`, 'info');
    }
    
    placeShipAt(x, y, orientation = 'horizontal') {
        if (!this.currentShip || this.gamePhase !== 'placement') return false;
        
        if (this.canPlaceShip(0, x, y, this.currentShip.size, orientation)) {
            this.placeShip(0, x, y, this.currentShip, orientation);
            this.ships[this.currentShip.index].placed = true;
            this.currentShip = null;
            this.updateUI();
            this.renderShipsList(); // Force re-render of ships list
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
        
        this.currentShip.orientation = this.currentShip.orientation === 'horizontal' ? 'vertical' : 'horizontal';
        this.addToHistory(`🔄 Rotated ${this.currentShip.name} to ${this.currentShip.orientation}`, 'info');
        this.updateUI();
    }
}

// 🎮 BATTLESHIP CLIENT
class BattleshipClient {
    constructor() {
        this.game = new BattleshipGame();
        this.canvas = null;
        this.gridSize = 30; // Smaller grid size for better fit
        this.gridSpacing = 1; // Smaller spacing for better fit
        this.gridStartX = 0;
        this.gridStartY = 0;
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.initialized = false;
        
        this.setupEventListeners();
        this.initializeCanvas();
        this.setupResizeHandler();
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
            this.gridStartY = 300;
            this.initialized = true;
            
            // Set up event listeners after canvas is ready
            this.setupCanvasEventListeners();
            
            // Canvas is ready for drawing
            
            console.log('✅ Canvas initialized successfully:', this.canvas);
            console.log('📐 Grid start position:', this.gridStartX, this.gridStartY);
            console.log('📏 Canvas size:', this.canvas.width, 'x', this.canvas.height);
            console.log('🎯 Initialized flag set to:', this.initialized);
            
            // Draw the initial grids
            redraw();
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
        let resizeTimeout;
        window.addEventListener('resize', () => {
            // Debounce resize events to prevent excessive redraws
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
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
                    
                    // Canvas resized successfully
                }
            }, 100); // 100ms debounce
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
            // Just redraw for hover effects - no need to restart loop
            redraw();
        });
        
        this.canvas.mousePressed(() => {
            // Just redraw for mouse clicks - no need to restart loop
            redraw();
        });
        
        // Add keyboard event listeners with proper cleanup
        this.keydownHandler = (e) => {
            if (e.key === 'r' || e.key === 'R' || e.key === 'Escape') {
                // Just redraw for keyboard events
                redraw();
            }
        };
        document.addEventListener('keydown', this.keydownHandler);
    }
    
    cleanupEventListeners() {
        // Remove keyboard event listener to prevent memory leaks
        if (this.keydownHandler) {
            document.removeEventListener('keydown', this.keydownHandler);
            this.keydownHandler = null;
        }
    }
    
    draw() {
        if (!this.initialized) return;
        
        // Clear the canvas first to ensure clean drawing
        clear();
        
        // Draw grids with high visibility
        this.drawGrids();
        this.drawShips();
        this.drawTurnIndicator();
        this.drawMouseHover();
        
        // Stop the loop after drawing - we'll restart it when needed
        noLoop();
    }
    
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
        
        if (this.game.gamePhase === 'playing') {
            if (this.game.currentPlayer === 0) {
                text('🎯 YOUR TURN - Click to attack!', attackGridX + 200, gridY + 20);
                text('🤖 AI is waiting...', fleetGridX + 200, gridY + 20);
            } else {
                text('🤖 AI TURN - AI is attacking...', attackGridX + 200, gridY + 20);
                text('⏳ Your turn is next', fleetGridX + 200, gridY + 20);
            }
        } else if (this.game.gamePhase === 'placement') {
            text('⚓ Place your ships!', attackGridX + 200, gridY + 20);
            text('📋 Your Fleet', fleetGridX + 200, gridY + 20);
        } else if (this.game.gamePhase === 'finished') {
            const winnerText = this.game.winner === 0 ? '🏆 YOU WON!' : '💥 AI WON!';
            text(winnerText, attackGridX + 200, gridY + 20);
            text(winnerText, fleetGridX + 200, gridY + 20);
        }
    }
    
    drawMouseHover() {
        // Draw hover effect on grids
        if (this.game.gamePhase === 'placement') {
            // Use the correct fleet grid position
            const fleetGridX = this.gridStartX + 80; // Same as in drawGrids
            const fleetGridY = this.gridStartY;
            
            // Calculate grid coordinates to match exactly how cells are drawn
            const cellSize = this.gridSize + this.gridSpacing;
            const gridX = Math.floor((mouseX - fleetGridX) / cellSize);
            const gridY = Math.floor((mouseY - fleetGridY) / cellSize);
            
            if (gridX >= 0 && gridX < 10 && gridY >= 0 && gridY < 10 && 
                mouseX >= fleetGridX && mouseX < fleetGridX + 420 && 
                mouseY >= fleetGridY && mouseY < fleetGridY + 420) {
                const cellX = fleetGridX + gridX * (this.gridSize + this.gridSpacing);
                const cellY = fleetGridY + gridY * (this.gridSize + this.gridSpacing);
                
                // Draw hover highlight
                fill(255, 255, 255, 50);
                stroke(255, 255, 255);
                strokeWeight(2);
                rect(cellX, cellY, this.gridSize, this.gridSize);
            }
        } else if (this.game.gamePhase === 'playing' && this.game.currentPlayer === 0) {
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
    
    drawGrids() {
        // Draw player grid (centered)
        const fleetGridX = this.gridStartX + 80; // Center the fleet grid at X=80
        this.drawGrid(fleetGridX, this.gridStartY, 0, true);
        
        // Draw attack grid (far right side) - MUST match drawBasicGrids exactly
        const attackGridX = this.gridStartX + 500; // Position attack grid far to the right
        const attackGridY = this.gridStartY; // Same Y position
        this.drawGrid(attackGridX, attackGridY, 1, false);
        
        // Debug grid positions
        console.log(`🎨 Drawing grids - fleetGridX: ${fleetGridX}, attackGridX: ${attackGridX}, gridStartY: ${this.gridStartY}`);
        console.log(`🎨 Grid dimensions - gridSize: ${this.gridSize}, gridSpacing: ${this.gridSpacing}`);
        
        // Draw grid titles with better visibility
        noStroke();
        fill(255, 255, 0); // Yellow titles
        textAlign(CENTER, CENTER);
        textSize(22); // Much larger titles
        text('Your Fleet', fleetGridX + 150, this.gridStartY - 40);
        text('Attack Grid', attackGridX + 200, attackGridY - 40);
    }
    
    drawGrid(x, y, player, showShips) {
        const grid = showShips ? this.game.playerGrids[player] : this.game.attackGrids[player];
        
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
        // Cell background with gradient effect
        if (cell.hit) {
            // Explosion effect
            fill(255, 100, 100);
            stroke(255, 0, 0);
            strokeWeight(2);
        } else if (cell.miss) {
            // Miss effect
            fill(150, 150, 150);
            stroke(200, 200, 200);
            strokeWeight(1);
        } else if (showShips && cell.ship) {
            // Draw ship on all cells it occupies
            if (cell.ship.isFirstCell) {
                const shipWidth = cell.ship.orientation === 'horizontal' ? cell.ship.size * (this.gridSize + this.gridSpacing) - this.gridSpacing : this.gridSize;
                const shipHeight = cell.ship.orientation === 'vertical' ? cell.ship.size * (this.gridSize + this.gridSpacing) - this.gridSpacing : this.gridSize;
                
                if (window.shipImages && window.shipImages[cell.ship.type]) {
                    // Draw ship image
                    image(window.shipImages[cell.ship.type], x, y, shipWidth, shipHeight);
                } else {
                    // Fallback to colored rectangle
                    fill(cell.ship.color);
                    rect(x, y, shipWidth, shipHeight);
                }
                
                // Add border
                noFill();
                stroke(255, 255, 255);
                strokeWeight(1);
                rect(x, y, shipWidth, shipHeight);
            } else {
                // For non-first cells, draw a subtle ship indicator
                fill(cell.ship.color + '80'); // Add transparency
                stroke(cell.ship.color);
                strokeWeight(1);
                rect(x, y, this.gridSize, this.gridSize);
            }
        } else {
            // Water with high contrast for visibility
            fill(40, 40, 40, 220); // Darker gray for better visibility
            stroke(255, 255, 255); // White grid lines
            strokeWeight(2); // Thicker lines for visibility
        }
        
        rect(x, y, this.gridSize, this.gridSize);
        
        // Draw hit/miss indicators with better visuals
        if (cell.hit) {
            // Explosion animation
            fill(255, 255, 0);
            textAlign(CENTER, CENTER);
            textSize(18);
            text('💥', x + this.gridSize/2, y + this.gridSize/2);
            
            // Add explosion ring
            noFill();
            stroke(255, 100, 0);
            strokeWeight(2);
            ellipse(x + this.gridSize/2, y + this.gridSize/2, this.gridSize * 0.8);
        } else if (cell.miss) {
            // Miss ripple effect
            fill(200, 200, 200);
            textAlign(CENTER, CENTER);
            textSize(14);
            text('○', x + this.gridSize/2, y + this.gridSize/2);
            
            // Add ripple ring
            noFill();
            stroke(150, 150, 150);
            strokeWeight(1);
            ellipse(x + this.gridSize/2, y + this.gridSize/2, this.gridSize * 0.6);
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
        
        // Numbers (1-10) - positioned above grid
        for (let i = 1; i <= 10; i++) {
            text(i, x + (i-1) * (this.gridSize + this.gridSpacing) + this.gridSize/2, y - 15);
        }
        
        // Letters (A-J) - positioned to the left of grid
        const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
        for (let i = 0; i < 10; i++) {
            text(letters[i], x - 25, y + i * (this.gridSize + this.gridSpacing) + this.gridSize/2);
        }
    }
    
    drawShips() {
        // Draw ships being placed
        if (this.game.currentShip) {
            this.drawShipPreview();
        }
        
        // Draw placed ships on the player grid
        this.drawPlacedShips();
    }
    
    drawPlacedShips() {
        // Draw all placed ships on the player grid
        for (let i = 0; i < this.game.placedShips[0].length; i++) {
            const ship = this.game.placedShips[0][i];
            this.drawShipOnGrid(ship, 0);
        }
    }
    
    drawShipOnGrid(ship, player) {
        // Use the correct grid position for the fleet grid
        const fleetGridX = this.gridStartX + 80; // Same as in drawGrids
        const fleetGridY = this.gridStartY;
        
        // Draw ship on the grid
        fill(0, 255, 0, 150); // Green with transparency
        stroke(0, 255, 0);
        strokeWeight(2);
        
        const cellX = fleetGridX + ship.x * (this.gridSize + this.gridSpacing);
        const cellY = fleetGridY + ship.y * (this.gridSize + this.gridSpacing);
        
        if (ship.orientation === 'horizontal') {
            rect(cellX, cellY, ship.size * (this.gridSize + this.gridSpacing) - this.gridSpacing, this.gridSize);
        } else {
            rect(cellX, cellY, this.gridSize, ship.size * (this.gridSize + this.gridSpacing) - this.gridSpacing);
        }
    }
    
    drawShipPreview() {
        if (!this.game.currentShip) return;
        
        // Use the correct fleet grid position
        const fleetGridX = this.gridStartX + 80; // Same as in drawGrids
        const fleetGridY = this.gridStartY;
        
        // Don't draw preview if mouse is at origin (0,0) - likely not moved yet
        if (mouseX === 0 && mouseY === 0) return;
        
        // Don't draw preview if mouse is outside the fleet grid area
        if (mouseX < fleetGridX || mouseX > fleetGridX + 420 || 
            mouseY < fleetGridY || mouseY > fleetGridY + 420) return;
        
        // Calculate grid coordinates to match exactly how cells are drawn
        const cellSize = this.gridSize + this.gridSpacing;
        const gridX = Math.floor((mouseX - fleetGridX) / cellSize);
        const gridY = Math.floor((mouseY - fleetGridY) / cellSize);
        
        // console.log('🎯 Ship preview - mouseX:', mouseX, 'mouseY:', mouseY, 'gridX:', gridX, 'gridY:', gridY);
        
        if (gridX >= 0 && gridX < 10 && gridY >= 0 && gridY < 10) {
            const ship = this.game.currentShip;
            const orientation = ship.orientation || 'horizontal';
            
            // Check if ship would fit within bounds
            const wouldFit = orientation === 'horizontal' ? 
                (gridX + ship.size <= 10) : 
                (gridY + ship.size <= 10);
            
            if (!wouldFit) return; // Don't draw preview if ship would go out of bounds
            
            const canPlace = this.game.canPlaceShip(0, gridX, gridY, ship.size, orientation);
            
            // Draw preview cells with better visibility
            const startX = fleetGridX + gridX * (this.gridSize + this.gridSpacing);
            const startY = fleetGridY + gridY * (this.gridSize + this.gridSpacing);
            
            if (window.shipImages && window.shipImages[ship.type]) {
                // Draw ship as one continuous image
                const shipWidth = orientation === 'horizontal' ? ship.size * (this.gridSize + this.gridSpacing) - this.gridSpacing : this.gridSize;
                const shipHeight = orientation === 'vertical' ? ship.size * (this.gridSize + this.gridSpacing) - this.gridSpacing : this.gridSize;
                
                // Draw semi-transparent ship image
                tint(255, 180); // Make image semi-transparent
                image(window.shipImages[ship.type], startX, startY, shipWidth, shipHeight);
                noTint(); // Reset tint
                
                // Add border around the entire ship
                noFill();
                stroke(canPlace ? 0 : 255, canPlace ? 255 : 0, 0);
                strokeWeight(3);
                rect(startX, startY, shipWidth, shipHeight);
            } else {
                // Fallback to colored rectangles for each cell
                for (let i = 0; i < ship.size; i++) {
                    const previewX = gridX + (orientation === 'horizontal' ? i : 0);
                    const previewY = gridY + (orientation === 'vertical' ? i : 0);
                    
                    if (previewX < 10 && previewY < 10) {
                        const cellX = fleetGridX + previewX * (this.gridSize + this.gridSpacing);
                        const cellY = fleetGridY + previewY * (this.gridSize + this.gridSpacing);
                        
                        fill(ship.color + 'B4'); // Add alpha to hex color
                        stroke(canPlace ? 0 : 255, canPlace ? 255 : 0, 0);
                        strokeWeight(3);
                        rect(cellX, cellY, this.gridSize, this.gridSize);
                        
                        // Add ship name in preview
                        fill(255);
                        textAlign(CENTER, CENTER);
                        textSize(8);
                        text(ship.name.substring(0, 3), cellX + this.gridSize/2, cellY + this.gridSize/2);
                    }
                }
            }
            
            // Draw placement instructions
            fill(255);
            textAlign(LEFT, TOP);
            textSize(14);
            text(`Placing: ${ship.name} (${ship.size} squares)`, 10, height - 100);
            text(`Orientation: ${orientation}`, 10, height - 80);
            text(`Press R to rotate, Esc to cancel`, 10, height - 60);
        }
    }
    
    drawUI() {
        // Draw current ship being placed
        if (this.game.currentShip) {
            this.drawCurrentShipInfo();
        }
        
        // Draw game phase indicator
        this.drawGamePhaseIndicator();
    }
    
    drawCurrentShipInfo() {
        const ship = this.game.currentShip;
        if (!ship) return;
        
        // Draw ship info box
        fill(0, 0, 0, 200);
        stroke(255, 215, 0);
        strokeWeight(2);
        rect(10, height - 150, 300, 140);
        
        // Draw ship info text
        fill(255, 215, 0);
        textAlign(LEFT, TOP);
        textSize(16);
        text(`Placing: ${ship.name}`, 20, height - 140);
        
        fill(255);
        textSize(14);
        text(`Size: ${ship.size} squares`, 20, height - 120);
        text(`Orientation: ${ship.orientation || 'horizontal'}`, 20, height - 100);
        text(`Click on the left grid to place`, 20, height - 80);
        text(`Press R to rotate, Esc to cancel`, 20, height - 60);
        
        // Draw ship preview
        const shipWidth = ship.orientation === 'horizontal' ? ship.size * 15 : 15;
        const shipHeight = ship.orientation === 'vertical' ? ship.size * 15 : 15;
        
        fill(red(ship.color), green(ship.color), blue(ship.color));
        stroke(255);
        strokeWeight(1);
        rect(20, height - 40, shipWidth, shipHeight);
    }
    
    drawGamePhaseIndicator() {
        if (this.game.gamePhase === 'placement') {
            // Ships placed box removed as requested
        } else if (this.game.gamePhase === 'playing') {
            // Draw turn indicator
            fill(0, 0, 0, 200);
            stroke(this.game.currentPlayer === 0 ? 76 : 255, 175, 80);
            strokeWeight(2);
            rect(width - 250, 10, 240, 60);
            
            fill(this.game.currentPlayer === 0 ? 76 : 255, 175, 80);
            textAlign(LEFT, TOP);
            textSize(16);
            text(`Turn: ${this.game.currentPlayer === 0 ? 'Your Turn' : 'AI Turn'}`, width - 240, 20);
            
            fill(255);
            textSize(14);
            text(this.game.currentPlayer === 0 ? 'Click on the right grid to attack!' : 'AI is thinking...', width - 240, 40);
        }
    }
    
    mousePressed() {
        if (this.game.gamePhase === 'placement') {
            this.handleShipPlacement();
        } else if (this.game.gamePhase === 'playing') {
            this.handleAttack();
        }
    }
    
    handleShipPlacement() {
        // Use the correct fleet grid position
        const fleetGridX = this.gridStartX + 80; // Same as in drawGrids
        const fleetGridY = this.gridStartY;
        
        // Calculate grid coordinates to match exactly how cells are drawn
        const cellSize = this.gridSize + this.gridSpacing;
        const gridX = Math.floor((mouseX - fleetGridX) / cellSize);
        const gridY = Math.floor((mouseY - fleetGridY) / cellSize);
        
        // Only handle clicks on the fleet grid
        if (gridX >= 0 && gridX < 10 && gridY >= 0 && gridY < 10 && 
            mouseX >= fleetGridX && mouseX < fleetGridX + 420 && 
            mouseY >= fleetGridY && mouseY < fleetGridY + 420) {
            if (this.game.currentShip) {
                const shipName = this.game.currentShip.name;
                const success = this.game.placeShipAt(gridX, gridY, this.game.currentShip.orientation || 'horizontal');
                if (success) {
                    console.log(`✅ Placed ${shipName} at (${gridX}, ${gridY})`);
                    // Ship placement successful - just redraw
                    redraw();
                } else {
                    console.log(`❌ Cannot place ${shipName} at (${gridX}, ${gridY})`);
                }
            }
        }
    }
    
    handleAttack() {
        // Use correct attack grid position (must match drawGrids)
        const attackGridX = this.gridStartX + 500; // Match drawGrids position
        const attackGridY = this.gridStartY; // Same Y as player grid
        
        // Calculate grid coordinates to match exactly how cells are drawn
        const cellSize = this.gridSize + this.gridSpacing;
        const gridX = Math.floor((mouseX - attackGridX) / cellSize);
        const gridY = Math.floor((mouseY - attackGridY) / cellSize);
        
        // Debug coordinate calculation
        console.log(`🎯 Click Debug - mouseX: ${mouseX}, mouseY: ${mouseY}`);
        console.log(`🎯 Grid Position - attackGridX: ${attackGridX}, attackGridY: ${attackGridY}`);
        console.log(`🎯 Calculated - gridX: ${gridX}, gridY: ${gridY}`);
        console.log(`🎯 Cell Size: ${cellSize}`);
        
        // Calculate what the actual cell position should be
        const expectedCellX = attackGridX + gridX * cellSize;
        const expectedCellY = attackGridY + gridY * cellSize;
        console.log(`🎯 Expected cell position - X: ${expectedCellX}, Y: ${expectedCellY}`);
        console.log(`🎯 Mouse offset from cell - X: ${mouseX - expectedCellX}, Y: ${mouseY - expectedCellY}`);
        
        // Only handle clicks on the attack grid and only on player's turn
        if (gridX >= 0 && gridX < 10 && gridY >= 0 && gridY < 10 && 
            mouseX >= attackGridX && mouseX < attackGridX + 420 && 
            mouseY >= attackGridY && mouseY < attackGridY + 420 && 
            this.game.currentPlayer === 0 && this.game.gamePhase === 'playing') {
            
            // Check if this position has already been attacked
            if (this.game.attackGrids[0][gridY][gridX].hit || this.game.attackGrids[0][gridY][gridX].miss) {
                this.game.addToHistory('❌ You already attacked this position!', 'error');
                return;
            }
            
            const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
            this.game.addToHistory(`🎯 You attack ${letters[gridY]}${gridX + 1}`, 'info');
            
            const result = this.game.attack(0, gridX, gridY);
            if (result.valid) {
                console.log(`🎯 Attacked (${gridX}, ${gridY}): ${result.hit ? 'HIT' : 'MISS'}`);
                this.game.endTurn();
                // Attack completed - just redraw
                redraw();
            } else {
                console.log(`❌ Invalid attack: ${result.message}`);
            }
        }
    }
    
    keyPressed() {
        if (key === 'r' || key === 'R') {
            if (this.game.currentShip) {
                this.game.rotateCurrentShip();
                // Ship rotated - just redraw
                redraw();
            }
        } else if (key === 'Escape') {
            if (this.game.currentShip) {
                this.game.cancelShipPlacement();
                // Ship placement cancelled - just redraw
                redraw();
            }
        }
    }
}

// Global game instance
let battleshipGame;
let battleshipClient;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚢 Initializing Battleship game...');
    battleshipGame = new BattleshipGame();
    
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
        // Draw basic grids even without full client
        if (typeof drawBasicGrids === 'function') {
            drawBasicGrids();
        } else {
            console.log('❌ drawBasicGrids function not found!');
        }
        
        fill(255);
        textAlign(CENTER, CENTER);
        textSize(24);
        text('Loading Battleship Game...', width/2, height/2);
        
        // Try to initialize client if not done yet
        if (battleshipGame && !battleshipClient) {
            console.log('🎮 Initializing battleship client...');
            battleshipClient = new BattleshipClient();
        }
    }
    
    // Check if ship images are loaded and update UI if needed (only once)
    if (battleshipGame && battleshipGame.checkAndUpdateShipImages && !battleshipGame.imagesChecked) {
        battleshipGame.checkAndUpdateShipImages();
        battleshipGame.imagesChecked = true;
    }
}

function drawBasicGrids() {
    const gridSize = 30; // Smaller grid size for better fit
    const gridSpacing = 1; // Smaller spacing for better fit
    const gridStartX = 20; // Fixed positioning
    const gridStartY = 300; // Fixed positioning
    
    // Draw player grid (centered)
    const fleetGridX = gridStartX + 80; // Center the fleet grid at X=80
    drawBasicGrid(fleetGridX, gridStartY, gridSize, gridSpacing, 'Your Fleet');
    
    // Draw attack grid (far right side) - MUST match BattleshipClient exactly
    const attackGridX = gridStartX + 500; // Position attack grid far to the right
    const attackGridY = gridStartY; // Same Y position
    drawBasicGrid(attackGridX, attackGridY, gridSize, gridSpacing, 'Attack Grid');
    
    // Debug to ensure coordinates match
    console.log(`🎨 drawBasicGrids - attackGridX: ${attackGridX}, attackGridY: ${attackGridY}, gridSize: ${gridSize}, gridSpacing: ${gridSpacing}`);
    
}

function drawBasicGrid(x, y, gridSize, gridSpacing, title) {
    
    // Draw grid background with high contrast to make it visible
    fill(0, 0, 0, 220); // Dark background with high opacity
    stroke(255, 255, 255); // White border
    strokeWeight(2);
    rect(x - 5, y - 5, (gridSize + gridSpacing) * 10 + 10, (gridSize + gridSpacing) * 10 + 10);
    
    console.log('🎨 Drawing grid at:', x, y, 'size:', gridSize, 'spacing:', gridSpacing);
    
    // Draw grid cells
    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 10; col++) {
            const cellX = x + col * (gridSize + gridSpacing);
            const cellY = y + row * (gridSize + gridSpacing);
            
            fill(60, 60, 60, 200); // Dark gray for visibility
            stroke(255, 255, 255); // White grid lines
            strokeWeight(1);
            rect(cellX, cellY, gridSize, gridSize);
        }
    }
    
    // Draw grid labels with better visibility
    fill(255, 255, 255); // White text
    textAlign(CENTER, CENTER);
    textSize(18); // Much larger for better visibility
    stroke(0, 0, 0); // Black outline
    strokeWeight(2); // Thicker outline
    
    // Numbers (1-10) - positioned above grid
    for (let i = 1; i <= 10; i++) {
        text(i, x + (i-1) * (gridSize + gridSpacing) + gridSize/2, y - 15);
    }
    
    // Letters (A-J) - positioned to the left of grid
    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    for (let i = 0; i < 10; i++) {
        text(letters[i], x - 25, y + i * (gridSize + gridSpacing) + gridSize/2);
    }
    
    // Draw title with better positioning
    noStroke(); // Remove stroke for title
    fill(255, 255, 0); // Yellow title
    textAlign(CENTER, CENTER);
    textSize(22); // Much larger title
    text(title, x + 200, y - 40); // Moved up more
}

function mousePressed() {
    if (battleshipClient) {
        battleshipClient.mousePressed();
    }
}

function keyPressed() {
    if (battleshipClient) {
        battleshipClient.keyPressed();
    }
}

function windowResized() {
    if (battleshipClient && battleshipClient.canvas) {
        resizeCanvas(windowWidth, windowHeight);
    }
}
