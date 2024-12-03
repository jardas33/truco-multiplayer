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
    text2Div.style("width", "80%");
    text2Div.style("max-width", "1000px");
    text2Div.style("background-color", "rgba(0, 0, 0, 0.8)");
    text2Div.style("padding", "30px");
    text2Div.style("border-radius", "15px");
    text2Div.style("border", "2px solid gold");
    text2Div.html(`
        <h2 style="color: gold; font-size: 32px; margin-bottom: 20px; text-align: center; text-shadow: 2px 2px 4px rgba(0,0,0,0.5);">Instructions of the game</h2>
        <div style="color: white; font-size: 18px; line-height: 1.6; text-align: justify;">
            <p style="margin-bottom: 15px;">Truco is a fun game designed to be played by an even number of players, played in teams of 2v2 or 3v3. Each Truco match is composed of multiple sets, where each set equals twelve games, and each game consists of three rounds.</p>
            <p style="margin-bottom: 15px;">In each round, every player plays one card. The team that wins two out of three rounds wins the game. The team that wins twelve games first wins the set.</p>
            <p style="margin-bottom: 15px;">The order of turns is clockwise, with the first player in each round being the one who played the highest card in the previous round, or in case of a tie, the one who played first in the previous round.</p>
            <p style="margin-bottom: 15px;">The game features the 'truco' mechanic. During their turn, a player can choose to call 'truco', which increases the value of the current game if accepted. The next player can then choose to accept, reject, or raise the value further. If truco is rejected, the game ends immediately, and the team that called 'truco' wins the game at its current value. If accepted, the game goes on but it is now worth 3 games instead of 1. The next player can also raise to 6, then the decision goes back to the player that initially called truco and he has the same options: accept, reject and raise. A game can only be risen to 12 games. It is not possible to raise after that.</p>
            <p style="margin-bottom: 15px;">Once a team has won eleven games within a set, the 'Game of Eleven' rule comes into effect. The team can view their cards and their partner's cards before deciding whether to play the next game. If they decide to play, the game's value is increased to three. If they reject, the opposing team wins one game instantly.</p>
            <p style="margin-bottom: 15px;">Truco is played with a 40 card deck, with a specific order of card values that you can see in the card values instructions.</p>
        </div>
    `);
    text2Div.parent(instructionsDiv);

    // Create instructions close button
    instructionsCloseButton = createButton("Close");
    instructionsCloseButton.mousePressed(closeInstructions);
    instructionsCloseButton.parent(instructionsDiv);
    instructionsCloseButton.style("position", "absolute");
    instructionsCloseButton.style("bottom", "10px");
    instructionsCloseButton.style("left", "50%");
    instructionsCloseButton.style("transform", "translateX(-50%)");
    instructionsCloseButton.style("background-color", "darkgreen");
    instructionsCloseButton.style("color", "white");
    instructionsCloseButton.style("border", "2px solid gold");
    instructionsCloseButton.style("padding", "10px 20px");
    instructionsCloseButton.style("border-radius", "5px");
    instructionsCloseButton.style("cursor", "pointer");
    instructionsCloseButton.style("font-size", "16px");

    // Remove the background image from instructionsDiv
    instructionsDiv.style("background-image", "none");
    instructionsDiv.style("background-color", "rgb(0, 100, 0)"); // Keep the green background

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
    textDiv.style("width", "80%");
    textDiv.style("max-width", "800px");
    textDiv.style("background-color", "rgba(0, 0, 0, 0.9)");
    textDiv.style("padding", "30px");
    textDiv.style("border-radius", "15px");
    textDiv.style("border", "2px solid gold");
    textDiv.html(`
        <h2 style="color: gold; font-size: 32px; margin-bottom: 30px; text-align: center; text-shadow: 2px 2px 4px rgba(0,0,0,0.5);">Card power from most powerful (1) to least powerful (17)</h2>
        <div style="display: flex; justify-content: space-between; color: white; font-size: 18px; line-height: 1.6;">
            <div style="flex-basis: 48%; background-color: rgba(0, 100, 0, 0.5); padding: 20px; border-radius: 10px;">
                <p style="margin: 10px 0;"><span style="color: gold; font-weight: bold;">1.</span> Queen of diamonds</p>
                <p style="margin: 10px 0;"><span style="color: gold; font-weight: bold;">2.</span> Jack of clubs</p>
                <p style="margin: 10px 0;"><span style="color: gold; font-weight: bold;">3.</span> 5 of clubs</p>
                <p style="margin: 10px 0;"><span style="color: gold; font-weight: bold;">4.</span> 4 of clubs</p>
                <p style="margin: 10px 0;"><span style="color: gold; font-weight: bold;">5.</span> 7 of hearts</p>
                <p style="margin: 10px 0;"><span style="color: gold; font-weight: bold;">6.</span> Ace of spades</p>
                <p style="margin: 10px 0;"><span style="color: gold; font-weight: bold;">7.</span> 7 of diamonds</p>
                <p style="margin: 10px 0;"><span style="color: gold; font-weight: bold;">8.</span> All 3's</p>
                <p style="margin: 10px 0;"><span style="color: gold; font-weight: bold;">9.</span> All 2's</p>
            </div>
            <div style="flex-basis: 48%; background-color: rgba(0, 100, 0, 0.5); padding: 20px; border-radius: 10px;">
                <p style="margin: 10px 0;"><span style="color: gold; font-weight: bold;">10.</span> Remaining Aces</p>
                <p style="margin: 10px 0;"><span style="color: gold; font-weight: bold;">11.</span> All Kings</p>
                <p style="margin: 10px 0;"><span style="color: gold; font-weight: bold;">12.</span> Remaining Queens</p>
                <p style="margin: 10px 0;"><span style="color: gold; font-weight: bold;">13.</span> Remaining Jacks</p>
                <p style="margin: 10px 0;"><span style="color: gold; font-weight: bold;">14.</span> Remaining 7's</p>
                <p style="margin: 10px 0;"><span style="color: gold; font-weight: bold;">15.</span> All 6's</p>
                <p style="margin: 10px 0;"><span style="color: gold; font-weight: bold;">16.</span> Remaining 5's</p>
                <p style="margin: 10px 0;"><span style="color: gold; font-weight: bold;">17.</span> Remaining 4's</p>
            </div>
        </div>
    `);
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

    // Create room creation and joining elements
    let roomDiv = createDiv();
    roomDiv.style("position", "fixed");
    roomDiv.style("top", "50%");
    roomDiv.style("left", "50%");
    roomDiv.style("transform", "translate(-50%, -50%)");
    roomDiv.style("background-color", "rgba(0, 0, 0, 0.9)");
    roomDiv.style("padding", "30px");
    roomDiv.style("border-radius", "15px");
    roomDiv.style("border", "2px solid gold");
    roomDiv.style("text-align", "center");
    roomDiv.parent(menuDiv);

    let createRoomButton = createButton("Create Room");
    createRoomButton.style("width", "200px");
    createRoomButton.style("height", "50px");
    createRoomButton.style("margin", "10px");
    createRoomButton.style("font-size", "18px");
    createRoomButton.style("background-color", "darkgreen");
    createRoomButton.style("color", "white");
    createRoomButton.style("border", "2px solid gold");
    createRoomButton.style("border-radius", "8px");
    createRoomButton.style("cursor", "pointer");
    createRoomButton.mousePressed(() => {
        socket.emit('createRoom');
    });
    createRoomButton.parent(roomDiv);

    let joinRoomInput = createInput();
    joinRoomInput.attribute('placeholder', 'Enter Room Code');
    joinRoomInput.style("width", "180px");
    joinRoomInput.style("height", "40px");
    joinRoomInput.style("margin", "10px");
    joinRoomInput.style("font-size", "16px");
    joinRoomInput.style("padding", "0 10px");
    joinRoomInput.style("border-radius", "8px");
    joinRoomInput.style("border", "2px solid gold");
    joinRoomInput.parent(roomDiv);

    let joinRoomButton = createButton("Join Room");
    joinRoomButton.style("width", "200px");
    joinRoomButton.style("height", "50px");
    joinRoomButton.style("margin", "10px");
    joinRoomButton.style("font-size", "18px");
    joinRoomButton.style("background-color", "darkgreen");
    joinRoomButton.style("color", "white");
    joinRoomButton.style("border", "2px solid gold");
    joinRoomButton.style("border-radius", "8px");
    joinRoomButton.style("cursor", "pointer");
    joinRoomButton.mousePressed(() => {
        const roomCode = joinRoomInput.value();
        if (roomCode) {
            socket.emit('joinRoom', roomCode);
        }
    });
    joinRoomButton.parent(roomDiv);
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
  