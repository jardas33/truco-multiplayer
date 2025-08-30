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
  
  // Update player positions - ensure PERFECT 4-corner layout - FIXED positioning
  if (playerPositions) {
    const scoringPanelHeight = 150; // Height of the scoring panel at top
    const topMargin = scoringPanelHeight + 100; // Increased margin below scoring panel for better spacing
    const leftMargin = 100; // Left margin from screen edge
    const rightMargin = width - 100; // Right margin from screen edge
    const bottomMargin = height - 150; // Bottom margin from screen edge
    
    playerPositions[0].x = leftMargin;          // Bot 1 (TOP-LEFT) - Top position
    playerPositions[0].y = topMargin + 50;      // Below scoring panel, top-left corner - MOVED DOWN MORE
    playerPositions[1].x = rightMargin;         // Bot 2 (BOTTOM-RIGHT) - Bottom position
    playerPositions[1].y = bottomMargin;        // Bottom-right corner
    playerPositions[2].x = leftMargin;          // Bot 3 (BOTTOM-LEFT) - Bottom position
    playerPositions[2].y = bottomMargin;        // Bottom-left corner
    playerPositions[3].x = rightMargin;         // Player 1 (TOP-RIGHT) - Top position
    playerPositions[3].y = topMargin + 50;      // Below scoring panel, top-right corner - MOVED DOWN MORE
    
    // Update label offsets to maintain proper spacing
    playerPositions[0].labelOffset = -150;      // Bot 1 - much higher above cards (top player) - FIXED
    playerPositions[1].labelOffset = 150;       // Bot 2 - much lower below cards (bottom player) - FIXED
    playerPositions[2].labelOffset = 150;       // Bot 3 - much lower below cards (bottom player) - FIXED
    playerPositions[3].labelOffset = -150;      // Player 1 - much higher above cards (top player) - FIXED
  }
}

// Add the missing drawGameState function
function drawGameState() {
    if (!window.game || !window.game.players) {
        return;
    }
    
    // Draw scoring information at the top
    drawScoringInfo();
    
    // Set text properties for all text rendering
    textAlign(CENTER, CENTER);
    textSize(16);
    
    // Draw player positions and hands with PROPER CARD IMAGES and fallbacks
    window.game.players.forEach((player, index) => {
        const position = playerPositions[index];
        if (!position) {
            return;
        }
        
        // Draw player label - SIMPLE TEXT with better visibility
        fill(255, 255, 255); // White text
        noStroke();
        textSize(18);
        textAlign(CENTER, CENTER);
        
        // Ensure text is always visible by using a contrasting color for bottom players
        if (position.labelOffset > 0) {
            // Bottom players - use bright green for better visibility
            fill(0, 255, 0);
        } else {
            // Top players - use white
            fill(255, 255, 255);
        }
        
        text(player.name + (player.isBot ? ' (Bot)' : ''), position.x, position.y + position.labelOffset);
        
        // Draw player's cards - PROPER CARD IMAGES with fallbacks
        if (player.hand && player.hand.length > 0) {
            // Calculate card spacing to ensure all cards fit within screen bounds
            const totalCardWidth = player.hand.length * cardWidth;
            const spacing = Math.min(cardWidth, (width - 100) / player.hand.length); // Ensure cards don't overlap too much
            
            // Calculate starting position to center cards around player position
            let startX = position.x - (totalCardWidth) / 2;
            
            // Ensure cards don't go off the left edge
            if (startX < 50) {
                startX = 50;
            }
            
            // Ensure cards don't go off the right edge
            if (startX + totalCardWidth > width - 50) {
                startX = width - 50 - totalCardWidth;
            }
            
            // Draw cards as proper card images with fallbacks
            for (let i = 0; i < player.hand.length; i++) {
                const cardX = startX + i * spacing;
                const cardY = position.y;
                
                const currentCard = player.hand[i];
                
                if (player.isBot || !showAllCards) {
                    // Bot cards - dark blue with card back
                    fill(0, 0, 150);
                    stroke(255, 255, 255);
                    strokeWeight(2);
                    rect(cardX, cardY, cardWidth, cardHeight, 5); // Rounded corners
                    
                    // Draw card back image if available
                    if (backCardImage) {
                        image(backCardImage, cardX, cardY, cardWidth, cardHeight);
                    } else {
                        // Fallback text
                        fill(255, 255, 255); // White text on dark cards
                        textSize(12);
                        text('BOT', cardX + cardWidth/2, cardY + cardHeight/2);
                    }
                } else {
                    // Human player cards - show actual card images if available
                    if (currentCard && currentCard.image) {
                        // Draw the actual card image
                        image(currentCard.image, cardX, cardY, cardWidth, cardHeight);
                    } else {
                        // Fallback to colored rectangle with card name
                        fill(255, 255, 255); // White background
                        stroke(0, 0, 0);
                        strokeWeight(2);
                        rect(cardX, cardY, cardWidth, cardHeight, 5);
                        
                        // Draw card name
                        fill(0, 0, 0); // Black text on white cards
                        textSize(10);
                        if (currentCard && currentCard.name) {
                            // Split long card names
                            const words = currentCard.name.split(' ');
                            if (words.length >= 2) {
                                text(words[0], cardX + cardWidth/2, cardY + cardHeight/2 - 8);
                                text(words[2] || words[1], cardX + cardWidth/2, cardY + cardHeight/2 + 8);
                            } else {
                                text(currentCard.name, cardX + cardWidth/2, cardY + cardHeight/2);
                            }
                        }
                    }
                }
                
                // Make human player cards clickable for gameplay
                if (!player.isBot && showAllCards) {
                    // Store card position for click detection
                    if (!window.clickableCards) window.clickableCards = [];
                    if (currentCard) { // Only add if card exists
                        window.clickableCards.push({
                            x: cardX,
                            y: cardY,
                            width: cardWidth,
                            height: cardHeight,
                            card: currentCard, // Use the properly scoped variable
                            player: player,
                            cardIndex: i
                        });
                    }
                }
            }
        }
        
        // Highlight active player with a bright circle - BIGGER to fit player name, centered on text
        if (player.isActive) {
            stroke(255, 255, 0); // Yellow circle
            strokeWeight(4);
            noFill();
            // Position circle exactly centered on the player text
            ellipse(position.x, position.y + position.labelOffset, 100, 100);
            strokeWeight(1);
        }
    });
    
    // Draw played cards in the center - PROPER CARD IMAGES with fallbacks
    if (playedCards && playedCards.length > 0) {
        playedCards.forEach((playedCard, index) => {
            // CRITICAL FIX: Add null check to prevent ReferenceError
            if (!playedCard || !playedCard.card) {
                return; // Skip this iteration
            }
            
            const centerX = width / 2 - (playedCards.length * cardWidth) / 2 + index * cardWidth;
            const centerY = height / 2 - cardHeight / 2;
            
            // Draw played card as proper card image if available, otherwise fallback
            if (playedCard.card.image) {
                image(playedCard.card.image, centerX, centerY, cardWidth, cardHeight);
            } else {
                // Fallback to colored rectangle
                fill(200, 200, 200); // Light gray
                stroke(0, 0, 0);
                strokeWeight(2);
                rect(centerX, centerY, cardWidth, cardHeight, 5);
                
                // Draw card name
                fill(0, 0, 0);
                textSize(14);
                textAlign(CENTER, CENTER);
                if (playedCard.card.name) {
                    text(playedCard.card.name, centerX + cardWidth/2, centerY + cardHeight/2);
                }
            }
            
            // Draw player indicator
            fill(0, 0, 0);
            textSize(14);
            textAlign(CENTER, CENTER);
            if (playedCard.player && playedCard.player.name) {
                text(playedCard.player.name, centerX + cardWidth/2, centerY + cardHeight + 25);
            }
        });
    }
    
    // Draw current player info - SIMPLE TEXT (removed redundant info)
    // Current player info is now shown in the scoring panel
    
    // Draw game state info - SIMPLE TEXT (removed redundant turn info)
    // Turn info is not needed as it's shown in the scoring panel
    
    // Draw a simple game board border
    stroke(255, 255, 255);
    strokeWeight(3);
    noFill();
    rect(10, 10, width - 20, height - 20);
    
    // Ensure Truco button is visible and properly positioned
    if (trucoButton && typeof trucoButton.show === 'function') {
        try {
            trucoButton.show();
            // Force repositioning to ensure it's visible - CENTERED
            trucoButton.position(width/2 - 75, height - 100);
            trucoButton.style('z-index', '200');
            trucoButton.style('position', 'absolute');
        } catch (error) {
            console.warn('Could not show Truco button:', error);
        }
    }
}

// Add the missing redrawGame function
function redrawGame() {
    if (typeof redraw === 'function') {
        redraw();
        console.log('🎨 Game redrawn');
    } else {
        console.error('❌ redraw function not available');
    }
}

// Function to draw scoring information
function drawScoringInfo() {
    if (!window.game) return;
    
    // Get current game status
    const currentRound = window.game.round || 1;
    const teamAlfaRounds = window.game.getTeam1Rounds ? window.game.getTeam1Rounds() : 0;
    const teamBetaRounds = window.game.getTeam2Rounds ? window.game.getTeam2Rounds() : 0;
    const teamAlfaGames = window.game.games ? window.game.games.team1 : 0;
    const teamBetaGames = window.game.games ? window.game.games.team2 : 0;
    const teamAlfaSets = window.game.sets ? window.game.sets.team1 : 0;
    const teamBetaSets = window.game.sets ? window.game.sets.team2 : 0;
    
    // Draw scoring panel at the top with better contrast and more height
    push();
    fill(0, 0, 0, 0.95); // Almost solid black background for maximum readability
    rect(10, 10, width - 20, 150);
    
    // Draw team information with much larger, clearer text
    textAlign(LEFT, TOP);
    
    // Team Alfa (Gold) - Left side
    fill(255, 215, 0);
    textSize(22); // Much larger text
    text("TEAM ALFA", 25, 25);
    textSize(20);
    text(`Rounds: ${teamAlfaRounds}/2`, 25, 55);
    text(`Games: ${teamAlfaGames}/12`, 25, 85);
    text(`Sets: ${teamAlfaSets}`, 25, 115);
    
    // Team Beta (Sky Blue) - Right side
    fill(135, 206, 250);
    textSize(22);
    text("TEAM BETA", width - 180, 25);
    textSize(20);
    text(`Rounds: ${teamBetaRounds}/2`, width - 180, 55);
    text(`Games: ${teamBetaGames}/12`, width - 180, 85);
    text(`Sets: ${teamBetaSets}`, width - 180, 115);
    
    // Current round indicator - Center, very prominent
    fill(255, 255, 255);
    textSize(28); // Much larger
    textAlign(CENTER, TOP);
    text(`ROUND ${currentRound} OF 3`, width/2, 25);
    
    // Game progress indicator - Center, below round
    textSize(20);
    text(`Game ${teamAlfaGames + teamBetaGames + 1} of Set`, width/2, 65);
    
    // Team assignments - Center, at bottom of scoring panel
    textSize(18);
    text("Player 1 + Bot 2 = Team Alfa", width/2, 105);
    text("Bot 1 + Bot 3 = Team Beta", width/2, 135);
    
    pop();
}


