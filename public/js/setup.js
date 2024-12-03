function setup() {
    createCanvas(windowWidth, windowHeight);

    // Initialize game state if not already set
    if (typeof gameState === 'undefined') {
        gameState = gameStateEnum.Menu;
    }

    // Create menu elements
    menuDiv = select("#Menu");
    gameDiv = select("#Game");
    instructionsDiv = select("#Instructions");
    valuesDiv = select("#Values");

    // Create menu buttons
    startButton = createButton("Start Truco Game");
    startButton.style("position", "fixed");
    startButton.style("top", "50%");
    startButton.style("left", "50%");
    startButton.style("transform", "translate(-50%, -50%)");
    startButton.style("width", "200px");
    startButton.style("height", "60px");
    startButton.style("font-weight", "bold");
    startButton.mousePressed(startTrucoGame);
    startButton.parent(menuDiv);

    // Create instruction buttons and popup
    instructionsButton = createButton("Instructions");
    instructionsButton.position(20, 20);
    instructionsButton.mousePressed(showInstructions);
    instructionsButton.parent(menuDiv);
    
    instructionsButton = createButton("Instructions");
    instructionsButton.position(20, 80);
    instructionsButton.mousePressed(showInstructions);
    instructionsButton.parent(gameDiv);

    // Create instructions popup
    instructionsPopup = createDiv("");
    instructionsPopup.parent(instructionsDiv);
    instructionsPopup.style("width", "100%");
    instructionsPopup.style("height", "100%");
    instructionsPopup.style("background-image", 'url("Images/instructions.png")');
    instructionsPopup.style("background-repeat", "no-repeat");
    instructionsPopup.style("background-position", "center");
    instructionsPopup.style("background-size", "cover");
    instructionsPopup.hide();

    // Create instructions text
    let text2Div = createDiv();
    text2Div.style("position", "absolute");
    text2Div.style("top", "50%");
    text2Div.style("left", "50%");
    text2Div.style("transform", "translate(-50%, -50%)");
    text2Div.html(`
        <h2>Instructions of the game</h2>
        <div style="justify-content: space-between;">
            <p>Truco is a fun game designed to be played by an even number of players, played in teams of 2v2 or 3v3. Each Truco match is composed of multiple sets, where each set equals twelve games, and each game consists of three rounds.</p>
            <p>In each round, every player plays one card. The team that wins two out of three rounds wins the game. The team that wins twelve games first wins the set.</p>
            <p>The order of turns is clockwise, with the first player in each round being the one who played the highest card in the previous round, or in case of a tie, the one who played first in the previous round.</p>
            <p>The game features the 'truco' mechanic. During their turn, a player can choose to call 'truco', which increases the value of the current game if accepted. The next player can then choose to accept, reject, or raise the value further. If truco is rejected, the game ends immediately, and the team that called 'truco' wins the game at its current value. If accepted, the game goes on but it is now worth 3 games instead of 1. The next player can also raise to 6, then the decision goes back to the player that initially called truco and he has the same options: accept, reject and raise. A game can only be risen to 12 games. It is not possible to raise after that.</p>
            <p>Once a team has won eleven games within a set, the 'Game of Eleven' rule comes into effect. The team can view their cards and their partner's cards before deciding whether to play the next game. If they decide to play, the game's value is increased to three. If they reject, the opposing team wins one game instantly.</p>
            <p>Truco is played with a 40 card deck, with a specific order of card values that you can see in the card values instructions.</p>
        </div>
    `);
    text2Div.style("color", "white");
    text2Div.style("text-align", "center");
    text2Div.parent(instructionsDiv);

    // Create instructions close button
    instructionsCloseButton = createButton("Close");
    instructionsCloseButton.mousePressed(closeInstructions);
    instructionsCloseButton.parent(instructionsDiv);
    instructionsCloseButton.style("position", "absolute");
    instructionsCloseButton.style("bottom", "10px");
    instructionsCloseButton.style("left", "50%");
    instructionsCloseButton.style("transform", "translateX(-50%)");

    // Create card values buttons and popup
    cardValuesButton = createButton("Card Values");
    cardValuesButton.position(20, 60);
    cardValuesButton.mousePressed(showCardValues);
    cardValuesButton.parent(menuDiv);
    
    cardValuesButton = createButton("Card Values");
    cardValuesButton.position(20, 120);
    cardValuesButton.mousePressed(showCardValues);
    cardValuesButton.parent(gameDiv);

    // Create card values popup
    cardValuesPopup = createDiv("");
    cardValuesPopup.parent(valuesDiv);
    cardValuesPopup.style("width", "100%");
    cardValuesPopup.style("height", "100%");
    cardValuesPopup.style("background-image", 'url("Images/instructions.png")');
    cardValuesPopup.style("background-repeat", "no-repeat");
    cardValuesPopup.style("background-position", "center");
    cardValuesPopup.style("background-size", "cover");
    cardValuesPopup.hide();

    // Create card values text
    let textDiv = createDiv();
    textDiv.style("position", "absolute");
    textDiv.style("top", "50%");
    textDiv.style("left", "50%");
    textDiv.style("transform", "translate(-50%, -50%)");
    textDiv.html(`
        <h2>Card power from most powerful - 1 to less powerfull - 17</h2>
        <div style="display: flex; justify-content: space-between;">
            <div style="flex-basis: 48%;">
                <p>Queen of diamonds - 1</p>
                <p>Jack of clubs - 2</p>
                <p>5 of clubs - 3</p>
                <p>4 of clubs - 4</p>
                <p>7 of hearts - 5</p>
                <p>Ace of spades - 6</p>
                <p>7 of diamonds - 7</p>
                <p>All 3's - 8</p>
                <p>All 2's - 9</p>
            </div>
            <div style="flex-basis: 48%;">
                <p>Remaining Aces - 10</p>
                <p>All Kings - 11</p>
                <p>Remaining Queens - 12</p>
                <p>Remaining Jacks - 13</p>
                <p>Remaining 7's - 14</p>
                <p>All 6's - 15</p>
                <p>Remaining 5's - 16</p>
                <p>Remaining 4's - 17</p>
            </div>
        </div>
    `);
    textDiv.style("color", "white");
    textDiv.style("text-align", "center");
    textDiv.parent(valuesDiv);

    // Create card values close button
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
    buttonAcceptTruco.mousePressed(() => game.respondTruco(game.getCurrentPlayer(), 1));
    buttonRejectTruco.position(10, 210);
    buttonRejectTruco.mousePressed(() => game.respondTruco(game.getCurrentPlayer(), 2));
    buttonRaiseTruco.position(10, 240);
    buttonRaiseTruco.mousePressed(() => game.respondTruco(game.getCurrentPlayer(), 3));

    buttonAcceptTruco.parent(gameDiv);
    buttonRejectTruco.parent(gameDiv);
    buttonRaiseTruco.parent(gameDiv);

    buttonAcceptTruco.hide();
    buttonRejectTruco.hide();
    buttonRaiseTruco.hide();

    // Create popup
    popup = createDiv("");
    popup.hide();
    popup.position(windowWidth / 2 - 150, windowHeight / 2 - 100);
    popup.style("width", "300px");
    popup.style("height", `200px`);
    popup.style("background-image", 'url("Images/popup_frame.png")');
    popup.style("padding", "20px");
    popup.style("text-align", "center");
    popup.style("color", "white");
    popup.style("font-weight", "bold");
    popup.style("background-repeat", "no-repeat");
    popup.style("background-position", "center");
    popup.style("background-size", "cover");

    closeButton = createButton("Close");
    closeButton.mousePressed(closePopup);
    closeButton.parent(popup);
    closeButton.style("position", "absolute");
    closeButton.style("bottom", "10px");
    closeButton.style("left", "50%");
    closeButton.style("transform", "translateX(-50%)");

    messageParagrph = createP("");
    messageParagrph.style("margin", "0");
    messageParagrph.style("position", "absolute");
    messageParagrph.style("top", "50%");
    messageParagrph.style("left", "50%");
    messageParagrph.style("transform", "translate(-50%, -50%)");
    messageParagrph.parent(popup);

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
            y: height - cardHeight - 100,
            label: "Player 4 - Team 2",
            labelOffset: cardHeight + 20,
        },
    ];

    // Initialize socket.io connection
    socket = io();
    
    // Hide game elements initially
    gameDiv.style('display', 'none');
    instructionsDiv.style('display', 'none');
    valuesDiv.style('display', 'none');

    // Show menu elements
    menuDiv.style('display', 'block');
    
    // Setup socket event handlers
    setupSocketHandlers();
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    
    // Update player positions
    if (playerPositions) {
        playerPositions[0].x = width / 6;
        playerPositions[0].y = height / 2;
        playerPositions[1].x = width / 2;
        playerPositions[1].y = 100;
        playerPositions[2].x = (5 * width) / 6;
        playerPositions[2].y = height / 2;
        playerPositions[3].x = width / 2;
        playerPositions[3].y = height - cardHeight - 100;
    }
}
  