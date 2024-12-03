function truco() {

  isInTrucoPhase = true;
  game.trucoState = true;
  popupMessage = `Truco called`;
  openPopup(true);

  if (!game.potentialGameValue) {
    game.potentialGameValue = 3; // Initialize potentialGameValue to 3.
    game.initialTrucoCallerIndex = game.currentPlayerIndex // Keep track of the player who called truco
    game.lastActionWasRaise = false; // Initialize lastActionWasRaise to false.
  }
  console.log('Initial potentialGameValue:', game.potentialGameValue);

  // Assuming current player is the one who called truco
  let opponentIndex = game.currentPlayerIndex === players.length - 1 ? 0 : game.currentPlayerIndex + 1;
  game.currentPlayerIndex = opponentIndex;

  if (players[opponentIndex].isBot) {
    //botDecision();
    players[opponentIndex].botPlay();

  } else {

    buttonAcceptTruco.show();
    buttonRejectTruco.show();
    buttonRaiseTruco.show();
  }

  trucoButton.hide();
  // You might want to update the game state or UI here, e.g. show a message to the opponent
  console.log(game.currentPlayerIndex + 1 + ", Truco has been called! Do you accept, raise or forfeit the round?");

}


function mouseReleased() {
  if (gameState !== gameStateEnum.Playing) {
    return null;
  }
  if (game.getCurrentPlayer().id === selfPlayer) {
    let player = game.getCurrentPlayer();
    let xBase =
      playerPositions[selfPlayer - 1].x -
      ((cardWidth + 10) * player.hand.length - 10) / 2;
    for (let i = 0; i < player.hand.length; i++) {
      let card = player.hand[i];
      let x = xBase + i * (cardWidth + 10);
      let y = playerPositions[0].y;
      if (
        dist(mouseX, mouseY, x + cardWidth / 2, y + cardHeight / 2) <
        cardWidth / 2
      ) {
        game.playCard(player, i);
        break;
      }
    }
  }
  return false; // Prevents the browser from doing the default action for the
}

function endGameAndHandleSet(winningTeam) {
  if (winningTeam === "team1") {
    team1Games += 1;
  } else if (winningTeam === "team2") {
    team2Games += 1;
  }

  // Check if any team has won 12 games
  if (team1Games >= 12 || team2Games >= 12) {
    team1Games = 0;
    team2Games = 0;
  }
}

// Call this function whenever a game ends
function handleEndOfGame(winningTeam) {
  if (winningTeam == 1) {
    team1Games++;
  } else if (winningTeam == 2) {
    team2Games++;
  }

  // Check if a team has won 12 games, meaning they've won a set
  if (team1Games >= 12) {
    team1Sets++;
    // Reset game scores
    team1Games = 0;
    team2Games = 0;
  } else if (team2Games >= 12) {
    team2Sets++;
    // Reset game scores
    team1Games = 0;
    team2Games = 0;
  }
}

// Update the openPopup() function to accept the winner's information 
function openPopup(onlyClose) {
  popupOnlyClose = onlyClose;

  /*if (popup.style("display") === "block") {
    return;
  }*/
  if (popupMessage == "") {
    popupMessage = "No values to display";
  }
  popup.show();
  messageParagrph.elt.textContent = popupMessage;
  popupTimeoutId = setTimeout(function () { closePopup(); }, timePopUpAutoClose);
}

function closePopup() {
  if (popupTimeoutId) {
    clearTimeout(popupTimeoutId);
    popupTimeoutId = null;
  }

  if (popupOnlyClose) {
    popup.hide();
  } else {
    popup.hide();
    game.startGame();
  }
}

function startTrucoGame() {
  gameState = gameStateEnum.Playing;
  game = new Game(players);
  game.restartGame();
  game.startGame();
}

function backToMainMenu() {
  console.log("Back to menu clicked");
  gameState = gameStateEnum.Menu;
  if (window.game) {
    delete window.game;
  }
}

function showInstructions() {
  console.log("Instructions clicked");
  previousGameState = gameState;
  gameState = gameStateEnum.Instructions;
}

function showCardValues() {
  console.log("Card values clicked");
  previousGameState = gameState;
  gameState = gameStateEnum.CardValues;
}

function closeInstructions() {
  if (previousGameState != null) {
    gameState = previousGameState;
    previousGameState = null;
  } else {
    gameState = gameStateEnum.Menu;
  }
}

function closeCardValues() {
  if (previousGameState != null) {
    gameState = previousGameState;
    previousGameState = null;
  } else {
    gameState = gameStateEnum.Menu;
  }
}

function imageClick(image) {
  console.log(image);
}


// Define what happens when each button is pressed
function acceptTruco() {
  // Call the appropriate function
  game.respondTruco(game.getCurrentPlayer(), 1);
}

function rejectTruco() {
  // Call the appropriate function
  game.respondTruco(game.getCurrentPlayer(), 2);
}

function raiseTruco() {
  // Call the appropriate function
  game.respondTruco(game.getCurrentPlayer(), 3);
}

function botDecision() {
  console.log("Bot decision started");

  // Delay the bot's decision by 3 seconds (3000 milliseconds)
  setTimeout(() => {
    let canRaise = (game.games.team1 + game.potentialGameValue < 12 && game.games.team2 + game.potentialGameValue < 12);
    let decision = "";
    let randomDecision = Math.floor(Math.random() * 100);
    let tableOptions = [
      { choice: "reject", rate: 100, ind: 2 },
      { choice: "accept", rate: 99, ind: 1 }
    ];

    // If raising is an option, prepend it to tableOptions
    if (canRaise) {
      tableOptions.unshift({ choice: "raise", rate: 75, ind: 3 });
    }
    tableOptions.sort(function (a, b) {
      return a.rate - b.rate;
    })

    for (const option of tableOptions) {
      if (randomDecision <= option.rate) {
        decision = option.ind;
        break;
      }
    }

    console.log("Bot decision:", decision);

    // Now the bot should take an action based on the decision.
    game.respondTruco(game.getCurrentPlayer(), decision);


    // Open the popup to show the bot's decision.

  }, timeBots); // 3000 milliseconds = 3 seconds
}



function showTrucoButton() {
  if (game.currentPlayerIndex + 1 == selfPlayer && isInTrucoPhase == false) {
    trucoButton.show()
  } else {
    trucoButton.hide()
  }
}


