// 🚢 BATTLESHIP GAME LOGIC

class BattleshipGame {
    constructor() {
        this.gridSize = 10;
        this.ships = [
            { name: 'Carrier', size: 5, color: '#FF6B6B', placed: false },
            { name: 'Battleship', size: 4, color: '#4ECDC4', placed: false },
            { name: 'Cruiser', size: 3, color: '#45B7D1', placed: false },
            { name: 'Submarine', size: 3, color: '#96CEB4', placed: false },
            { name: 'Destroyer', size: 2, color: '#FFEAA7', placed: false }
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
        this.addToHistory('🎮 Game initialized. Place your ships to begin!', 'info');
        this.updateUI();
        this.renderShipsList();
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
        if (!shipsList) return;
        
        shipsList.innerHTML = this.ships.map((ship, index) => {
            const isPlaced = this.placedShips[0].some(placedShip => placedShip.name === ship.name);
            return `
                <div class="ship-item ${isPlaced ? 'placed' : ''}" data-ship-index="${index}">
                    <div class="ship-visual ${ship.orientation || 'horizontal'}" style="background: ${ship.color}"></div>
                    <div>
                        <div style="font-weight: bold;">${ship.name}</div>
                        <div style="font-size: 0.8em; opacity: 0.8;">Size: ${ship.size} squares</div>
                        ${isPlaced ? '<div style="color: #4CAF50; font-size: 0.8em;">✓ Placed</div>' : ''}
                    </div>
                </div>
            `;
        }).join('');
    }
    
    startGame() {
        if (this.placedShips[0].length !== 5) {
            this.addToHistory('❌ Please place all ships before starting!', 'error');
            return;
        }
        
        this.gamePhase = 'playing';
        this.currentPlayer = 0;
        this.addToHistory('🚀 Battle started! Your turn to attack!', 'success');
        this.updateUI();
        this.setupAIShips();
    }
    
    setupAIShips() {
        // AI places ships randomly
        const aiShips = [...this.ships];
        let attempts = 0;
        
        while (this.placedShips[1].length < 5 && attempts < 1000) {
            const ship = aiShips[this.placedShips[1].length];
            const orientation = Math.random() < 0.5 ? 'horizontal' : 'vertical';
            const x = Math.floor(Math.random() * (this.gridSize - (orientation === 'horizontal' ? ship.size - 1 : 0)));
            const y = Math.floor(Math.random() * (this.gridSize - (orientation === 'vertical' ? ship.size - 1 : 0)));
            
            if (this.canPlaceShip(1, x, y, ship.size, orientation)) {
                this.placeShip(1, x, y, ship, orientation);
            }
            attempts++;
        }
        
        this.addToHistory('🤖 AI has placed all ships. Battle begins!', 'info');
    }
    
    canPlaceShip(player, x, y, size, orientation) {
        const grid = this.playerGrids[player];
        
        for (let i = 0; i < size; i++) {
            const checkX = orientation === 'horizontal' ? x + i : x;
            const checkY = orientation === 'vertical' ? y + i : y;
            
            if (checkX >= this.gridSize || checkY >= this.gridSize) return false;
            if (grid[checkY][checkX].ship !== null) return false;
            
            // Check adjacent cells for no touching ships
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    const adjX = checkX + dx;
                    const adjY = checkY + dy;
                    if (adjX >= 0 && adjX < this.gridSize && adjY >= 0 && adjY < this.gridSize) {
                        if (grid[adjY][adjX].ship !== null) return false;
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
            size: ship.size,
            color: ship.color,
            x: x,
            y: y,
            orientation: orientation,
            hits: 0
        };
        
        for (let i = 0; i < ship.size; i++) {
            const placeX = orientation === 'horizontal' ? x + i : x;
            const placeY = orientation === 'vertical' ? y + i : y;
            
            grid[placeY][placeX].ship = shipData;
            grid[placeY][placeX].shipId = this.placedShips[player].length;
        }
        
        this.placedShips[player].push(shipData);
        
        if (player === 0) {
            this.addToHistory(`✅ Placed ${ship.name} at (${x + 1}, ${y + 1})`, 'success');
            this.renderShipsList();
        }
    }
    
    attack(player, x, y) {
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
        for (let i = 0; i < ship.size; i++) {
            const x = ship.orientation === 'horizontal' ? ship.x + i : ship.x;
            const y = ship.orientation === 'vertical' ? ship.y + i : ship.y;
            grid[y][x].sunk = true;
        }
    }
    
    checkGameOver(player) {
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
        if (this.gamePhase !== 'playing' || this.currentPlayer !== 1) return;
        
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
        
        const result = this.attack(1, x, y);
        
        if (result.hit) {
            this.aiMode = 'target';
            this.aiLastHit = { x, y };
            this.aiHits.push({ x, y });
            
            if (!result.sunk) {
                // Continue targeting if not sunk
                setTimeout(() => this.aiTurn(), 1500);
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
        
        this.ships.forEach(ship => ship.placed = false);
        
        this.initializeGame();
    }
    
    // Ship placement methods
    startShipPlacement(shipIndex) {
        if (this.gamePhase !== 'placement') return;
        
        const ship = this.ships[shipIndex];
        if (ship.placed) return;
        
        this.currentShip = { ...ship, index: shipIndex };
        this.addToHistory(`📌 Click on the grid to place ${ship.name}`, 'info');
    }
    
    placeShipAt(x, y, orientation = 'horizontal') {
        if (!this.currentShip) return false;
        
        if (this.canPlaceShip(0, x, y, this.currentShip.size, orientation)) {
            this.placeShip(0, x, y, this.currentShip, orientation);
            this.ships[this.currentShip.index].placed = true;
            this.currentShip = null;
            this.updateUI();
            return true;
        } else {
            this.addToHistory(`❌ Cannot place ${this.currentShip.name} there!`, 'error');
            return false;
        }
    }
    
    cancelShipPlacement() {
        this.currentShip = null;
        this.addToHistory('❌ Ship placement cancelled', 'info');
    }
    
    rotateCurrentShip() {
        if (!this.currentShip) return;
        
        this.currentShip.orientation = this.currentShip.orientation === 'horizontal' ? 'vertical' : 'horizontal';
        this.addToHistory(`🔄 Rotated ${this.currentShip.name} to ${this.currentShip.orientation}`, 'info');
    }
}

// 🎮 BATTLESHIP CLIENT
class BattleshipClient {
    constructor() {
        this.game = new BattleshipGame();
        this.canvas = null;
        this.gridSize = 40;
        this.gridSpacing = 2;
        this.gridStartX = 0;
        this.gridStartY = 0;
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.initialized = false;
        
        this.setupEventListeners();
        this.initializeCanvas();
    }
    
    initializeCanvas() {
        console.log('🎨 Initializing canvas...');
        
        const canvasDiv = document.getElementById('gameCanvas');
        if (!canvasDiv) {
            console.error('❌ Canvas div not found!');
            return;
        }
        
        // Clear any existing canvas
        canvasDiv.innerHTML = '';
        
        try {
            // Create new canvas
            this.canvas = createCanvas(1000, 700);
            this.canvas.parent(canvasDiv);
            
            // Calculate grid positions
            this.gridStartX = 50;
            this.gridStartY = 150;
            this.initialized = true;
            
            console.log('✅ Canvas initialized successfully:', this.canvas);
            console.log('📐 Grid start position:', this.gridStartX, this.gridStartY);
            console.log('📏 Canvas size:', this.canvas.width, 'x', this.canvas.height);
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
            startBtn.addEventListener('click', () => this.game.startGame());
        }
        
        // Reset game button
        const resetBtn = document.getElementById('resetGameBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.game.resetGame());
        }
        
        // Ship selection
        document.addEventListener('click', (e) => {
            if (e.target.closest('.ship-item')) {
                const shipIndex = parseInt(e.target.closest('.ship-item').dataset.shipIndex);
                this.game.startShipPlacement(shipIndex);
            }
        });
    }
    
    draw() {
        if (!this.initialized) return;
        
        background(15, 25, 45);
        this.drawGrids();
        this.drawShips();
        this.drawUI();
        this.drawMouseHover();
    }
    
    drawMouseHover() {
        // Draw hover effect on grids
        if (this.game.gamePhase === 'placement') {
            const gridX = Math.floor((mouseX - this.gridStartX) / (this.gridSize + this.gridSpacing));
            const gridY = Math.floor((mouseY - this.gridStartY) / (this.gridSize + this.gridSpacing));
            
            if (gridX >= 0 && gridX < 10 && gridY >= 0 && gridY < 10 && mouseX < this.gridStartX + 500) {
                const cellX = this.gridStartX + gridX * (this.gridSize + this.gridSpacing);
                const cellY = this.gridStartY + gridY * (this.gridSize + this.gridSpacing);
                
                // Draw hover highlight
                fill(255, 255, 255, 50);
                stroke(255, 255, 255);
                strokeWeight(2);
                rect(cellX, cellY, this.gridSize, this.gridSize);
            }
        } else if (this.game.gamePhase === 'playing' && this.game.currentPlayer === 0) {
            const attackGridX = this.gridStartX + 500;
            const gridX = Math.floor((mouseX - attackGridX) / (this.gridSize + this.gridSpacing));
            const gridY = Math.floor((mouseY - this.gridStartY) / (this.gridSize + this.gridSpacing));
            
            if (gridX >= 0 && gridX < 10 && gridY >= 0 && gridY < 10 && mouseX >= attackGridX) {
                const cellX = attackGridX + gridX * (this.gridSize + this.gridSpacing);
                const cellY = this.gridStartY + gridY * (this.gridSize + this.gridSpacing);
                
                // Draw hover highlight
                fill(255, 255, 255, 50);
                stroke(255, 255, 255);
                strokeWeight(2);
                rect(cellX, cellY, this.gridSize, this.gridSize);
            }
        }
    }
    
    drawGrids() {
        // Draw player grid (left side)
        this.drawGrid(this.gridStartX, this.gridStartY, 0, true);
        
        // Draw attack grid (right side)
        const attackGridX = this.gridStartX + 500;
        this.drawGrid(attackGridX, this.gridStartY, 1, false);
        
        // Draw labels
        fill(255);
        textAlign(CENTER, CENTER);
        textSize(16);
        text('Your Fleet', this.gridStartX + 200, this.gridStartY - 30);
        text('Attack Grid', attackGridX + 200, this.gridStartY - 30);
        
        // Debug info
        fill(255, 0, 0);
        textSize(12);
        text(`Grid 1: ${this.gridStartX}, ${this.gridStartY}`, 10, 20);
        text(`Grid 2: ${attackGridX}, ${this.gridStartY}`, 10, 40);
        text(`Canvas: ${width}x${height}`, 10, 60);
    }
    
    drawGrid(x, y, player, showShips) {
        const grid = showShips ? this.game.playerGrids[player] : this.game.attackGrids[player];
        
        // Draw grid background
        fill(20, 40, 80);
        stroke(100, 150, 200);
        strokeWeight(2);
        rect(x - 5, y - 5, (this.gridSize + this.gridSpacing) * 10 + 10, (this.gridSize + this.gridSpacing) * 10 + 10);
        
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
            // Ship with gradient
            fill(cell.ship.color);
            stroke(255, 255, 255);
            strokeWeight(1);
        } else {
            // Water with wave effect
            fill(30, 60, 120);
            stroke(50, 100, 200);
            strokeWeight(1);
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
        fill(255);
        textAlign(CENTER, CENTER);
        textSize(12);
        
        // Numbers (1-10)
        for (let i = 1; i <= 10; i++) {
            text(i, x + (i-1) * (this.gridSize + this.gridSpacing) + this.gridSize/2, y - 10);
        }
        
        // Letters (A-J)
        const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
        for (let i = 0; i < 10; i++) {
            text(letters[i], x - 20, y + i * (this.gridSize + this.gridSpacing) + this.gridSize/2);
        }
    }
    
    drawShips() {
        // Draw ships being placed
        if (this.game.currentShip) {
            this.drawShipPreview();
        }
    }
    
    drawShipPreview() {
        if (!this.game.currentShip) return;
        
        const gridX = Math.floor((mouseX - this.gridStartX) / (this.gridSize + this.gridSpacing));
        const gridY = Math.floor((mouseY - this.gridStartY) / (this.gridSize + this.gridSpacing));
        
        if (gridX >= 0 && gridX < 10 && gridY >= 0 && gridY < 10) {
            const ship = this.game.currentShip;
            const orientation = ship.orientation || 'horizontal';
            const canPlace = this.game.canPlaceShip(0, gridX, gridY, ship.size, orientation);
            
            // Draw preview cells with better visibility
            for (let i = 0; i < ship.size; i++) {
                const previewX = gridX + (orientation === 'horizontal' ? i : 0);
                const previewY = gridY + (orientation === 'vertical' ? i : 0);
                
                if (previewX < 10 && previewY < 10) {
                    const cellX = this.gridStartX + previewX * (this.gridSize + this.gridSpacing);
                    const cellY = this.gridStartY + previewY * (this.gridSize + this.gridSpacing);
                    
                    // Semi-transparent preview with border
                    fill(red(ship.color), green(ship.color), blue(ship.color), 180);
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
            // Draw placement progress
            const placedCount = this.game.placedShips[0].length;
            const totalShips = 5;
            
            fill(0, 0, 0, 200);
            stroke(76, 175, 80);
            strokeWeight(2);
            rect(width - 250, 10, 240, 80);
            
            fill(76, 175, 80);
            textAlign(LEFT, TOP);
            textSize(16);
            text(`Ships Placed: ${placedCount}/${totalShips}`, width - 240, 20);
            
            // Draw progress bar
            const progressWidth = 200;
            const progressHeight = 20;
            const progress = placedCount / totalShips;
            
            fill(50, 50, 50);
            rect(width - 240, 40, progressWidth, progressHeight);
            
            fill(76, 175, 80);
            rect(width - 240, 40, progressWidth * progress, progressHeight);
            
            fill(255);
            textAlign(CENTER, CENTER);
            textSize(12);
            text(`${Math.round(progress * 100)}%`, width - 140, 50);
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
        const gridX = Math.floor((mouseX - this.gridStartX) / (this.gridSize + this.gridSpacing));
        const gridY = Math.floor((mouseY - this.gridStartY) / (this.gridSize + this.gridSpacing));
        
        // Only handle clicks on the left grid (player grid)
        if (gridX >= 0 && gridX < 10 && gridY >= 0 && gridY < 10 && mouseX < this.gridStartX + 500) {
            if (this.game.currentShip) {
                const success = this.game.placeShipAt(gridX, gridY, this.game.currentShip.orientation || 'horizontal');
                if (success) {
                    console.log(`✅ Placed ${this.game.currentShip.name} at (${gridX}, ${gridY})`);
                } else {
                    console.log(`❌ Cannot place ${this.game.currentShip.name} at (${gridX}, ${gridY})`);
                }
            }
        }
    }
    
    handleAttack() {
        const attackGridX = this.gridStartX + 500;
        const gridX = Math.floor((mouseX - attackGridX) / (this.gridSize + this.gridSpacing));
        const gridY = Math.floor((mouseY - this.gridStartY) / (this.gridSize + this.gridSpacing));
        
        // Only handle clicks on the right grid (attack grid) and only on player's turn
        if (gridX >= 0 && gridX < 10 && gridY >= 0 && gridY < 10 && mouseX >= attackGridX && this.game.currentPlayer === 0) {
            const result = this.game.attack(0, gridX, gridY);
            if (result.valid) {
                console.log(`🎯 Attacked (${gridX}, ${gridY}): ${result.hit ? 'HIT' : 'MISS'}`);
                this.game.endTurn();
            } else {
                console.log(`❌ Invalid attack: ${result.message}`);
            }
        }
    }
    
    keyPressed() {
        if (key === 'r' || key === 'R') {
            if (this.game.currentShip) {
                this.game.rotateCurrentShip();
            }
        } else if (key === 'Escape') {
            if (this.game.currentShip) {
                this.game.cancelShipPlacement();
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
    
    // Wait for p5.js to be available
    const initClient = () => {
        if (typeof createCanvas !== 'undefined') {
            battleshipClient = new BattleshipClient();
            console.log('🎮 Battleship client initialized');
        } else {
            console.log('⏳ Waiting for p5.js...');
            setTimeout(initClient, 100);
        }
    };
    
    setTimeout(initClient, 200);
});

// p5.js functions
function setup() {
    console.log('🎨 p5.js setup called');
    
    // Create a fallback canvas if BattleshipClient hasn't created one
    if (!battleshipClient || !battleshipClient.canvas) {
        console.log('🔄 Creating fallback canvas...');
        const canvasDiv = document.getElementById('gameCanvas');
        if (canvasDiv) {
            canvasDiv.innerHTML = '';
            const fallbackCanvas = createCanvas(1000, 700);
            fallbackCanvas.parent(canvasDiv);
            console.log('✅ Fallback canvas created');
        }
    }
}

function draw() {
    if (battleshipClient && battleshipClient.initialized) {
        battleshipClient.draw();
    } else {
        // Show loading message and basic grid
        background(15, 25, 45);
        
        // Draw basic grids even without full client
        drawBasicGrids();
        
        fill(255);
        textAlign(CENTER, CENTER);
        textSize(24);
        text('Loading Battleship Game...', width/2, height/2);
        
        // Try to initialize client if not done yet
        if (battleshipGame && !battleshipClient) {
            battleshipClient = new BattleshipClient();
        }
    }
}

function drawBasicGrids() {
    const gridSize = 40;
    const gridSpacing = 2;
    const gridStartX = 50;
    const gridStartY = 150;
    
    // Draw player grid (left side)
    drawBasicGrid(gridStartX, gridStartY, gridSize, gridSpacing, 'Your Fleet');
    
    // Draw attack grid (right side)
    const attackGridX = gridStartX + 500;
    drawBasicGrid(attackGridX, gridStartY, gridSize, gridSpacing, 'Attack Grid');
}

function drawBasicGrid(x, y, gridSize, gridSpacing, title) {
    // Draw grid background
    fill(20, 40, 80);
    stroke(100, 150, 200);
    strokeWeight(2);
    rect(x - 5, y - 5, (gridSize + gridSpacing) * 10 + 10, (gridSize + gridSpacing) * 10 + 10);
    
    // Draw grid cells
    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 10; col++) {
            const cellX = x + col * (gridSize + gridSpacing);
            const cellY = y + row * (gridSize + gridSpacing);
            
            fill(30, 60, 120);
            stroke(50, 100, 200);
            strokeWeight(1);
            rect(cellX, cellY, gridSize, gridSize);
        }
    }
    
    // Draw grid labels
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(12);
    
    // Numbers (1-10)
    for (let i = 1; i <= 10; i++) {
        text(i, x + (i-1) * (gridSize + gridSpacing) + gridSize/2, y - 10);
    }
    
    // Letters (A-J)
    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    for (let i = 0; i < 10; i++) {
        text(letters[i], x - 20, y + i * (gridSize + gridSpacing) + gridSize/2);
    }
    
    // Draw title
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(16);
    text(title, x + 200, y - 30);
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
