function truco() {

  isInTrucoPhase = true;
  if (window.game) {
    window.game.trucoState = true;
    popupMessage = `Truco called`;
    openPopup(true);

    if (!window.game.potentialGameValue) {
      window.game.potentialGameValue = 3;
      window.game.initialTrucoCallerIndex = window.game.currentPlayerIndex;
      window.game.lastActionWasRaise = false;
    }

         // Emit truco call to other players (only in multiplayer mode)
     if (socket && !isSinglePlayerMode) {
       socket.emit('truco-called', {
         roomCode: currentRoom,
         caller: window.game.currentPlayerIndex
       });
     }

    let opponentIndex = window.game.currentPlayerIndex === window.game.players.length - 1 ? 0 : window.game.currentPlayerIndex + 1;
    window.game.currentPlayerIndex = opponentIndex;

    if (window.game.players[opponentIndex].isBot) {
      window.game.players[opponentIndex].botPlay();
    } else {
      buttonAcceptTruco.show();
      buttonRejectTruco.show();
      buttonRaiseTruco.show();
    }
  }

  trucoButton.hide();
}

function mouseReleased() {
  if (gameState !== gameStateEnum.Playing) {
    return null;
  }
  if (window.game && window.game.getCurrentPlayer()) {
    let player = window.game.getCurrentPlayer();
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
                 // Emit card played to other players (only in multiplayer mode)
         if (socket && !isSinglePlayerMode) {
           socket.emit('card-played', {
             roomCode: currentRoom,
             player: selfPlayer,
             cardIndex: i
           });
         }
        window.game.playCard(player, i);
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
    if (window.game && window.game.startGame) {
      window.game.startGame();
    }
  }
}

function startTrucoGame() {
  if (socket) {
    // Online mode - check if enough players
    if (window.players && Object.keys(window.players).length < 2) {
      alert('Need at least 2 players to start the game');
      return;
    }
    socket.emit('start-game', { roomCode: currentRoom });
  } else {
    // Local mode
    gameState = gameStateEnum.Playing;
    window.game = new window.Game(window.players || []);
    if (window.game.restartGame) {
      window.game.restartGame();
    }
    window.game.startGame();
  }

  // Hide menu and show game
  menuDiv.style('display', 'none');
  gameDiv.style('display', 'block');
}

function backToMainMenu() {
  gameState = gameStateEnum.Menu;
  menuDiv.class('active');
  instructionsDiv.removeClass('active');
  valuesDiv.removeClass('active');
  gameDiv.removeClass('active');
  
  // If in online mode, leave the room
  if (socket && currentRoom) {
    socket.emit('leave-room', { roomCode: currentRoom });
    currentRoom = null;
  }
}

function showInstructions() {
  previousGameState = gameState; // Store the current game state
  gameState = gameStateEnum.Instructions;
  // Move canvas to Instructions div
  let canvas = document.querySelector('canvas');
  if (canvas) {
    document.getElementById('Instructions').appendChild(canvas);
  }
}

function closeInstructions() {
  if (previousGameState != null) {
    gameState = previousGameState; // Revert to the previous game state
    previousGameState = null; // Reset the stored previous game state
  } else {
    gameState = gameStateEnum.Menu; // Fallback to menu state
  }
  // Move canvas back to Menu div
  let canvas = document.querySelector('canvas');
  if (canvas) {
    document.getElementById('Menu').appendChild(canvas);
  }
}

function showCardValues() {
  previousGameState = gameState; // Store the current game state
  gameState = gameStateEnum.CardValues;
  // Move canvas to Values div
  let canvas = document.querySelector('canvas');
  if (canvas) {
    document.getElementById('Values').appendChild(canvas);
  }
}

function closeCardValues() {
  if (previousGameState != null) {
    gameState = previousGameState; // Revert to the previous game state
    previousGameState = null; // Reset the stored previous game state
  } else {
    gameState = gameStateEnum.Menu; // Fallback to menu state
  }
  // Move canvas back to Menu div
  let canvas = document.querySelector('canvas');
  if (canvas) {
    document.getElementById('Menu').appendChild(canvas);
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
  if (window.game) {
    window.game.respondTruco(window.game.getCurrentPlayer(), 3);
  }
}

function botDecision() {
  console.log("Bot decision started");

  // Delay the bot's decision by 3 seconds (3000 milliseconds)
  setTimeout(() => {
    if (window.game) {
      let canRaise = (window.game.games.team1 + window.game.potentialGameValue < 12 && window.game.games.team2 + window.game.potentialGameValue < 12);
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
      window.game.respondTruco(window.game.getCurrentPlayer(), decision);
    }

    // Open the popup to show the bot's decision.

  }, timeBots); // 3000 milliseconds = 3 seconds
}



function showTrucoButton() {
  if (window.game && window.game.currentPlayerIndex + 1 == selfPlayer && isInTrucoPhase == false) {
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
    window.game = new window.Game(data.players);
    if (window.game.restartGame) {
      window.game.restartGame();
    }
    window.game.startGame();
    
    // Hide menu and show game
    menuDiv.style('display', 'none');
    gameDiv.style('display', 'block');
  });

  socket.on('card-played', function(data) {
    console.log('Card played:', data);
    if (data.player !== selfPlayer && window.game) {
      let player = window.game.players[data.player - 1];
      window.game.playCard(player, data.cardIndex);
    }
  });

  socket.on('truco-called', function(data) {
    console.log('Truco called:', data);
    if (window.game && data.caller !== window.game.currentPlayerIndex) {
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

function startGame() {
  gameState = gameStateEnum.Playing;
  menuDiv.removeClass('active');
  instructionsDiv.removeClass('active');
  valuesDiv.removeClass('active');
  gameDiv.class('active');
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
    playerPositions[3].y = height - 100;
  }
}

// Add the missing drawGameState function
function drawGameState() {
    if (!window.game || !window.game.players) {
        console.error('Game or players not initialized');
        return;
    }

    console.log('Drawing game state with players:', window.game.players);
    
    // Draw player positions and hands
    window.game.players.forEach((player, index) => {
        const position = playerPositions[index];
        if (!position) return;
        
        // Draw player label
        fill(255);
        textSize(16);
        textAlign(CENTER);
        text(player.name + (player.isBot ? ' (Bot)' : ''), position.x, position.y + position.labelOffset);
        
        // Draw player's cards
        if (player.hand && player.hand.length > 0) {
            if (player.isBot || !showAllCards) {
                // Draw card backs for bots or hidden cards
                for (let i = 0; i < player.hand.length; i++) {
                    const cardX = position.x - (player.hand.length * cardWidth) / 2 + i * cardWidth;
                    const cardY = position.y;
                    if (backCardImage) {
                        image(backCardImage, cardX, cardY, cardWidth, cardHeight);
                    } else {
                        // Fallback rectangle if image not loaded
                        fill(100);
                        rect(cardX, cardY, cardWidth, cardHeight);
                    }
                }
            } else {
                // Draw actual cards for human player
                for (let i = 0; i < player.hand.length; i++) {
                    const card = player.hand[i];
                    const cardX = position.x - (player.hand.length * cardWidth) / 2 + i * cardWidth;
                    const cardY = position.y;
                    
                    if (card.image) {
                        image(card.image, cardX, cardY, cardWidth, cardHeight);
                    } else {
                        // Fallback rectangle if image not loaded
                        fill(255);
                        rect(cardX, cardY, cardWidth, cardHeight);
                        fill(0);
                        textSize(12);
                        text(card.name, cardX + cardWidth/2, cardY + cardHeight/2);
                    }
                }
            }
        }
        
        // Highlight active player
        if (player.isActive) {
            stroke(255, 255, 0);
            strokeWeight(3);
            noFill();
            ellipse(position.x, position.y - 30, 40, 40);
            strokeWeight(1);
        }
    });
    
    // Draw played cards in the center
    if (playedCards && playedCards.length > 0) {
        playedCards.forEach((playedCard, index) => {
            if (playedCard.card && playedCard.card.image) {
                const centerX = width / 2 - (playedCards.length * cardWidth) / 2 + index * cardWidth;
                const centerY = height / 2 - cardHeight / 2;
                image(playedCard.card.image, centerX, centerY, cardWidth, cardHeight);
                
                // Draw player indicator
                fill(255);
                textSize(14);
                textAlign(CENTER);
                text(playedCard.player.name, centerX + cardWidth/2, centerY + cardHeight + 20);
            }
        });
    }
    
    // Draw game scores
    fill(255);
    textSize(20);
    textAlign(LEFT);
    text(`Team 1: ${window.game.scores.team1}`, 20, 30);
    text(`Team 2: ${window.game.scores.team2}`, 20, 60);
    text(`Game Value: ${window.game.gameValue}`, 20, 90);
    
    // Draw current player info
    if (window.game.getCurrentPlayer()) {
        const currentPlayer = window.game.getCurrentPlayer();
        text(`Current Player: ${currentPlayer.name}`, 20, 120);
        text(`Team: ${currentPlayer.team}`, 20, 150);
    }
}

// Add the missing redrawGame function
function redrawGame() {
    if (gameState === gameStateEnum.Playing) {
        // Force a redraw of the game canvas
        loop();
    }
}


