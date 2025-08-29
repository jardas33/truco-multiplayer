function setup() {
    let canvas = createCanvas(windowWidth, windowHeight);
    canvas.parent('Menu');
    
    // Ensure canvas is visible and properly positioned
    canvas.style('display', 'block');
    canvas.style('position', 'absolute');
    canvas.style('top', '0');
    canvas.style('left', '0');
    canvas.style('z-index', '1');
    
    console.log('Canvas created and positioned');
    
    // Initialize text properties
    textAlign(CENTER, CENTER);
    textSize(24);
    fill(255);
    stroke(0);
    strokeWeight(2);
    
    // Get all the div containers
    menuDiv = select("#Menu");
    gameDiv = select("#Game");
    instructionsDiv = select("#Instructions");
    valuesDiv = select("#Values");
    
    console.log('Div containers initialized:', { menuDiv, gameDiv, instructionsDiv, valuesDiv });
    
    // Initially show only menu
    menuDiv.class('active');
    menuDiv.style('display', 'block'); // Force menu to be visible
    gameDiv.removeClass('active');
    gameDiv.style('display', 'none');
    instructionsDiv.removeClass('active');
    instructionsDiv.style('display', 'none');
    valuesDiv.removeClass('active');
    valuesDiv.style('display', 'none');
    
    console.log('Menu div made visible, others hidden');
    
    // Create instruction buttons with proper z-index
    instructionsButton = createButton("Instructions");
    instructionsButton.position(20, 20);
    instructionsButton.mousePressed(showInstructions);
    instructionsButton.parent('Menu');
    instructionsButton.style('z-index', '10'); // Ensure button is above canvas
    instructionsButton.style('position', 'relative');
    instructionsButton.show(); // Ensure button is visible
    
    // Create card values button with proper z-index
    cardValuesButton = createButton("Card Values");
    cardValuesButton.position(20, 60);
    cardValuesButton.mousePressed(showCardValues);
    cardValuesButton.parent('Menu');
    cardValuesButton.style('z-index', '10'); // Ensure button is above canvas
    cardValuesButton.style('position', 'relative');
    cardValuesButton.show(); // Ensure button is visible
    
    console.log('Buttons created with proper z-index and made visible');
    
    // Create text div for instructions
    let instructionsTextDiv = createDiv('');
    instructionsTextDiv.parent(instructionsDiv);
    instructionsTextDiv.style('color', 'white');
    instructionsTextDiv.style('position', 'absolute');
    instructionsTextDiv.style('top', '50%');
    instructionsTextDiv.style('left', '50%');
    instructionsTextDiv.style('transform', 'translate(-50%, -50%)');
    instructionsTextDiv.style('width', '80%');
    instructionsTextDiv.style('text-align', 'left');
    instructionsTextDiv.style('font-size', '16px');
    instructionsTextDiv.style('line-height', '1.5');
    instructionsTextDiv.html(`
        <div style="margin-bottom: 20px;">
            Truco is a fun game designed to be played by an even number of players, played in teams of 2v2 or 3v3. Each Truco match is composed of multiple sets, where each set equals twelve games, and each game consists of three rounds.<br><br>
            
            In each round, every player plays one card. The team that wins two out of three rounds wins the game. The team that wins twelve games first wins the set.<br><br>
            
            The order of turns is clockwise, with the first player in each round being the one who played the highest card in the previous round, or in case of a tie, the one who played first in the previous round.<br><br>
            
            The game features the 'truco' mechanic. During their turn, a player can choose to call 'truco', which increases the value of the current game if accepted. The next player can then choose to accept, reject, or raise the value further. If truco is rejected, the game ends immediately, and the team that called 'truco' wins the game at its current value. If accepted, the game goes on but it is now worth 3 games instead of 1. The next player can also raise to 6, then the decision goes back to the player that initially called truco and he has the same options: accept, reject and raise. A game can only be risen to 12 games. It is not possible to raise after that.<br><br>
            
            Once a team has won eleven games within a set, the 'Game of Eleven' rule comes into effect. The team can view their cards and their partner's cards before deciding whether to play the next game. If they decide to play, the game's value is increased to three. If they reject, the opposing team wins one game instantly.<br><br>
            
            Truco is played with a 40 card deck, with a specific order of card values that you can see in the card values instructions.
        </div>
    `);
    
    // Create close buttons
    instructionsCloseButton = createButton("Close");
    instructionsCloseButton.mousePressed(closeInstructions);
    instructionsCloseButton.parent(instructionsDiv);
    instructionsCloseButton.style("position", "absolute");
    instructionsCloseButton.style("bottom", "10px");
    instructionsCloseButton.style("left", "50%");
    instructionsCloseButton.style("transform", "translateX(-50%)");
    
    cardValuesCloseButton = createButton("Close");
    cardValuesCloseButton.mousePressed(closeCardValues);
    cardValuesCloseButton.parent(valuesDiv);
    cardValuesCloseButton.style("position", "absolute");
    cardValuesCloseButton.style("bottom", "10px");
    cardValuesCloseButton.style("left", "50%");
    cardValuesCloseButton.style("transform", "translateX(-50%)");
    
    // Create back to menu button
    backToMainMenuButton = createButton("Back to Main Menu");
    backToMainMenuButton.position(20, 20);
    backToMainMenuButton.mousePressed(backToMainMenu);
    backToMainMenuButton.parent(gameDiv);
    backToMainMenuButton.hide();
    
    // Create game buttons
    trucoButton = createButton("Truco");
    trucoButton.position(50, 180);
    trucoButton.mousePressed(truco);
    trucoButton.parent(gameDiv);
    trucoButton.hide();
    
    // Create truco response buttons
    buttonAcceptTruco = createButton("Accept Truco");
    buttonRejectTruco = createButton("Reject Truco");
    buttonRaiseTruco = createButton("Raise Truco");
    
    buttonAcceptTruco.position(10, 180);
    buttonAcceptTruco.mousePressed(() => {
      if (window.game) {
        window.game.respondTruco(window.game.getCurrentPlayer(), 1);
      }
    });
    buttonRejectTruco.position(10, 210);
    buttonRejectTruco.mousePressed(() => {
      if (window.game) {
        window.game.respondTruco(window.game.getCurrentPlayer(), 2);
      }
    });
    buttonRaiseTruco.position(10, 240);
    buttonRaiseTruco.mousePressed(() => {
      if (window.game) {
        window.game.respondTruco(window.game.getCurrentPlayer(), 3);
      }
    });
    
    buttonAcceptTruco.parent(gameDiv);
    buttonRejectTruco.parent(gameDiv);
    buttonRaiseTruco.parent(gameDiv);
    
    buttonAcceptTruco.hide();
    buttonRejectTruco.hide();
    buttonRaiseTruco.hide();
    
    // Setup player positions
    playerPositions = [
        {
            x: width / 6,
            y: height / 2,
            label: "Player 1 - Team 1",
            labelOffset: -50,
        },
        { 
            x: width / 2, 
            y: 100, 
            label: "Player 2 - Team 2", 
            labelOffset: -50 
        },
        {
            x: (5 * width) / 6,
            y: height / 2,
            label: "Player 3 - Team 1",
            labelOffset: -50,
        },
        {
            x: width / 2,
            y: height - 100,
            label: "Player 4 - Team 2",
            labelOffset: 50,
        },
    ];
    
    console.log('Setup complete - canvas and UI elements initialized');
}
  