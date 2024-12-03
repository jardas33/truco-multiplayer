function truco() {

  isInTrucoPhase = true;
  game.trucoState = true;
  popupMessage = `Truco called`;
  openPopup(true);

  if (!game.potentialGameValue) {
    game.potentialGameValue = 3;
    game.initialTrucoCallerIndex = game.currentPlayerIndex;
    game.lastActionWasRaise = false;
  }

  // Emit truco call to other players
  if (socket) {
    socket.emit('truco-called', {
      roomCode: currentRoom,
      caller: game.currentPlayerIndex
    });
  }

  let opponentIndex = game.currentPlayerIndex === players.length - 1 ? 0 : game.currentPlayerIndex + 1;
  game.currentPlayerIndex = opponentIndex;

  if (players[opponentIndex].isBot) {
    players[opponentIndex].botPlay();
  } else {
    buttonAcceptTruco.show();
    buttonRejectTruco.show();
    buttonRaiseTruco.show();
  }

  trucoButton.hide();
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
      let y = playerPositions[selfPlayer - 1].y;
      if (
        dist(mouseX, mouseY, x + cardWidth / 2, y + cardHeight / 2) <
        cardWidth / 2
      ) {
        // Emit card played to other players
        if (socket) {
          socket.emit('card-played', {
            roomCode: currentRoom,
            player: selfPlayer,
            cardIndex: i
          });
        }
        game.playCard(player, i);
        break;
      }
    }
  }
  return false;
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
  if (socket) {
    // Online mode - check if enough players
    if (Object.keys(players).length < 2) {
      alert('Need at least 2 players to start the game');
      return;
    }
    socket.emit('start-game', { roomCode: currentRoom });
  } else {
    // Local mode
    gameState = gameStateEnum.Playing;
    game = new Game(players);
    game.restartGame();
    game.startGame();
  }

  // Hide menu and show game
  menuDiv.style('display', 'none');
  gameDiv.style('display', 'block');
}

function backToMainMenu() {
  gameState = gameStateEnum.Menu;
  gameDiv.style('display', 'none');
  menuDiv.style('display', 'block');
  
  // If in online mode, leave the room
  if (socket && currentRoom) {
    socket.emit('leave-room', { roomCode: currentRoom });
    currentRoom = null;
  }
}

function showInstructions() {
  previousGameState = gameState;
  gameState = gameStateEnum.Instructions;
  menuDiv.style('display', 'none');
  gameDiv.style('display', 'none');
  instructionsDiv.style('display', 'block');
}

function showCardValues() {
  previousGameState = gameState;
  gameState = gameStateEnum.CardValues;
  menuDiv.style('display', 'none');
  gameDiv.style('display', 'none');
  valuesDiv.style('display', 'block');
}

function closeInstructions() {
  instructionsDiv.style('display', 'none');
  if (previousGameState != null) {
    gameState = previousGameState;
    if (gameState === gameStateEnum.Menu) {
      menuDiv.style('display', 'block');
    } else if (gameState === gameStateEnum.Playing) {
      gameDiv.style('display', 'block');
    }
    previousGameState = null;
  } else {
    gameState = gameStateEnum.Menu;
    menuDiv.style('display', 'block');
  }
}

function closeCardValues() {
  valuesDiv.style('display', 'none');
  if (previousGameState != null) {
    gameState = previousGameState;
    if (gameState === gameStateEnum.Menu) {
      menuDiv.style('display', 'block');
    } else if (gameState === gameStateEnum.Playing) {
      gameDiv.style('display', 'block');
    }
    previousGameState = null;
  } else {
    gameState = gameStateEnum.Menu;
    menuDiv.style('display', 'block');
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

function setupSocketHandlers() {
  if (!socket) return;

  socket.on('player-joined', function(data) {
    console.log('Player joined:', data);
    // Update player list
    updatePlayerList(data.players);
  });

  socket.on('game-started', function(data) {
    console.log('Game started:', data);
    gameState = gameStateEnum.Playing;
    game = new Game(data.players);
    game.restartGame();
    game.startGame();
    
    // Hide menu and show game
    menuDiv.style('display', 'none');
    gameDiv.style('display', 'block');
  });

  socket.on('card-played', function(data) {
    console.log('Card played:', data);
    if (data.player !== selfPlayer) {
      let player = game.players[data.player - 1];
      game.playCard(player, data.cardIndex);
    }
  });

  socket.on('truco-called', function(data) {
    console.log('Truco called:', data);
    if (data.caller !== game.currentPlayerIndex) {
      truco();
    }
  });

  socket.on('player-left', function(data) {
    console.log('Player left:', data);
    // Update player list
    updatePlayerList(data.players);
  });
}

function updatePlayerList(playerData) {
  // Update the player list in the menu
  const playerList = document.getElementById('playerList');
  if (!playerList) return;

  playerList.innerHTML = '<h3>Players in Room</h3>';
  Object.keys(playerData).forEach(playerId => {
    const playerDiv = document.createElement('div');
    playerDiv.textContent = `Player ${playerId}`;
    playerList.appendChild(playerDiv);
  });
}


