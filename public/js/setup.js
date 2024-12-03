function setup() {
    // Only create canvas if we're not in multiplayer mode
    if (!isMultiplayerMode) {
        let canvas = createCanvas(windowWidth, windowHeight);
        canvas.parent('Game');
    }
    
    // Set text properties
    textAlign(CENTER, CENTER);
    textSize(24);
    fill(255);
    stroke(0);
    strokeWeight(2);
    
    // Initialize menu state
    gameState = gameStateEnum.Menu;
    document.getElementById('Menu').classList.add('active');
}
  