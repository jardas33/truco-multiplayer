function truco() {
  console.log(`🎯 Truco/Raise called by ${window.game?.players[window.game?.currentPlayerIndex]?.name}`);
  
  if (!window.game) {
    console.error('❌ No game instance found');
    return;
  }

  // Check if Truco is already active
  if (window.game.trucoState && window.game.trucoState.isActive) {
    console.log(`❌ Truco is already active`);
    return;
  }

  // Determine if this is a Truco call or a Raise
  const isRaise = window.game.trucoState && window.game.trucoState.callerTeam !== null && window.game.trucoState.currentValue > 1;
  
  if (isRaise) {
    console.log(`📈 Raise Truco request sent to server`);
  } else {
    console.log(`🎯 Truco request sent to server`);
  }

  // Send Truco/Raise request to server
  if (typeof socket !== 'undefined' && socket) {
    socket.emit('requestTruco', {});
  } else {
    console.error('❌ Socket not available for Truco request');
  }
}

// REMOVED: Broken mouseReleased function - using mousePressed in draw.js instead

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

  // Safety check: ensure popup elements exist
  if (!popup || !messageParagrph) {
    console.warn('⚠️ Popup elements not initialized, skipping popup display');
    return;
  }

  /*if (popup.style("display") === "block") {
    return;
  }*/
  if (popupMessage == "") {
    popupMessage = "No values to display";
  }
  
  try {
    popup.show();
    if (messageParagrph.elt) {
      messageParagrph.elt.textContent = popupMessage;
    }
    
    // Reset and animate progress bar
    if (popupProgressFill) {
      popupProgressFill.style('width', '100%');
      // Animate progress bar from 100% to 0% over the auto-close time
      setTimeout(() => {
        if (popupProgressFill) {
          popupProgressFill.style('width', '0%');
        }
      }, 100);
    }
    
    popupTimeoutId = setTimeout(function () { closePopup(); }, timePopUpAutoClose);
  } catch (error) {
    console.error('❌ Error showing popup:', error);
  }
}

function closePopup() {
  if (popupTimeoutId) {
    clearTimeout(popupTimeoutId);
    popupTimeoutId = null;
  }

  // Safety check: ensure popup exists
  if (!popup) {
    console.warn('⚠️ Popup not initialized, cannot close');
    return;
  }

  try {
    if (popupOnlyClose) {
      popup.hide();
    } else {
      popup.hide();
      if (window.game && window.game.startGame) {
        window.game.startGame();
      }
    }
  } catch (error) {
    console.error('❌ Error closing popup:', error);
  }
}

function startTrucoGame() {
  if (socket && window.roomId) {
    // Online mode - check if enough players
    if (window.players && window.players.length < 2) {
      alert('Need at least 2 players to start the game');
      return;
    }
    console.log('Starting multiplayer game in room:', window.roomId);
    socket.emit('startGame', window.roomId); // ✅ Fixed event name and room ID
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
  if (menuDiv) menuDiv.style('display', 'none');
  if (gameDiv) gameDiv.style('display', 'block');
}

function backToMainMenu() {
  gameState = gameStateEnum.Menu;
  if (menuDiv) menuDiv.class('active');
  if (instructionsDiv) instructionsDiv.removeClass('active');
  if (valuesDiv) valuesDiv.removeClass('active');
  if (gameDiv) gameDiv.removeClass('active');
  
  // ✅ CRITICAL FIX: Hide round history button when returning to menu
  if (typeof hideRoundHistoryButton === 'function') {
    hideRoundHistoryButton();
    console.log('📋 Round history button hidden');
  }
  
  // If in online mode, leave the room
  if (socket && window.roomId) {
    console.log('Leaving room:', window.roomId);
    socket.emit('disconnect'); // ✅ Use disconnect event to leave room
    window.roomId = null;
    window.players = null;
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


// ✅ OLD TRUCO RESPONSE FUNCTIONS REMOVED - Now handled by server-side system

// ✅ OLD BOT DECISION FUNCTION REMOVED - Now handled by botRespondTruco() in players.js



function showTrucoButton() {
  if (!window.game) {
    trucoButton.hide();
    return;
  }
  
  const currentPlayer = window.game.players[window.game.currentPlayerIndex];
  if (!currentPlayer) {
    trucoButton.hide();
    return;
  }
  
  // Check if it's the human player's turn
  if (window.game.currentPlayerIndex + 1 == selfPlayer && isInTrucoPhase == false) {
    const currentPlayerTeam = currentPlayer.team;
    
    // ✅ CRITICAL FIX: Proper Truco button logic
    if (window.game.trucoState && window.game.trucoState.isActive) {
      // Truco is currently active (waiting for response) - hide button
      trucoButton.hide();
    } else if (window.game.trucoState && window.game.trucoState.callerTeam !== null) {
      // Truco was called before - check if this player can raise
      if (window.game.trucoState.currentValue > 1) {
        // Truco was accepted - only opposite team can raise
        if (currentPlayerTeam !== window.game.trucoState.callerTeam) {
          // Opposite team can raise
          trucoButton.html("RAISE");
          trucoButton.show();
        } else {
          // Same team cannot raise
          trucoButton.hide();
        }
      } else {
        // Truco was rejected - anyone can call Truco again
        trucoButton.html("TRUCO");
        trucoButton.show();
      }
    } else {
      // No Truco called yet - show normal Truco button
      trucoButton.html("TRUCO");
      trucoButton.show();
    }
  } else {
    trucoButton.hide();
  }
}

function setupSocketHandlers() {
  if (!socket) return;

  // ✅ Fixed event names to match server
  socket.on('playerJoined', function(data) {
    console.log('Player joined:', data);
    // Update player list
    updatePlayerList(data.players);
  });

  // ❌ REMOVED: Duplicate gameStart handler that conflicts with lobby.js
  // This was causing the room ID to be undefined and multiplayer to fail
  
  // ❌ REMOVED: All duplicate event handlers that conflict with lobby.js
  // These were causing conflicts and preventing proper multiplayer functionality
  
  // The correct event handlers are now only in lobby.js
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
    
    playerPositions[0].x = leftMargin;          // Player 1 (TOP-LEFT) - Top position - ACTUAL PLAYER ORDER
    playerPositions[0].y = topMargin + 50;      // Below scoring panel, top-left corner - MOVED DOWN MORE
    playerPositions[1].x = rightMargin;         // Bot 1 (TOP-RIGHT) - Top position - ACTUAL PLAYER ORDER
    playerPositions[1].y = topMargin + 50;      // Below scoring panel, top-right corner - MOVED DOWN MORE
    playerPositions[2].x = leftMargin;          // Bot 2 (BOTTOM-LEFT) - Bottom position - ACTUAL PLAYER ORDER
    playerPositions[2].y = bottomMargin;        // Bottom-left corner
    playerPositions[3].x = rightMargin;         // Bot 3 (BOTTOM-RIGHT) - Bottom position - ACTUAL PLAYER ORDER
    playerPositions[3].y = bottomMargin;        // Bottom-right corner
    
    // Update label offsets to maintain proper spacing
    playerPositions[0].labelOffset = -80;       // Bot 1 - above cards (top player) - REASONABLE distance
    playerPositions[1].labelOffset = -80;       // Bot 2 - above cards (bottom player) - CONSISTENT with top
    playerPositions[2].labelOffset = -80;       // Bot 3 - above cards (bottom player) - CONSISTENT with top
    playerPositions[3].labelOffset = -80;       // Player 1 - above cards (top player) - REASONABLE distance
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
    
    // Clear clickable cards array at the start of each draw cycle
    window.clickableCards = [];
    
    // Draw player positions and hands with PROPER CARD IMAGES and fallbacks
    window.game.players.forEach((player, index) => {
        const position = playerPositions[index];
        if (!position) {
            console.warn(`No position found for player ${index}: ${player.name}`);
            return;
        }
        
        // Draw player name - STABLE TEXT RENDERING with better visibility
        noStroke();
        textSize(18);
        textAlign(CENTER, CENTER);
        
        // ✅ CRITICAL FIX: Show player identification (turn indicated by yellow circle only)
        let playerLabel = player.name + (player.isBot ? ' (Bot)' : '');
        
        // Set text color based on team assignment
        if (player.team === 'team1') {
            fill(100, 150, 255); // Blue for Team Alfa
        } else if (player.team === 'team2') {
            fill(255, 100, 100); // Red for Team Beta
        } else {
            fill(255, 255, 255); // White for unassigned players
        }
        
        // Ensure stable text positioning
        const textX = position.x;
        const textY = position.y + position.labelOffset;
        
        // Draw player name on first line
        text(playerLabel, textX, textY);
        
        // Draw [YOU] on second line for local player with team color
        if (player.isLocalPlayer) {
            // Use the same team color for [YOU] text
            if (player.team === 'team1') {
                fill(100, 150, 255); // Blue for Team Alfa
            } else if (player.team === 'team2') {
                fill(255, 100, 100); // Red for Team Beta
            } else {
                fill(255, 255, 255); // White for unassigned players
            }
            text('[YOU]', textX, textY + 25); // 25 pixels below the player name
        }
        
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
                
                // ✅ CRITICAL FIX: Store card position for click detection
                if (!currentCard.position) {
                    currentCard.position = { x: cardX, y: cardY };
                } else {
                    currentCard.position.x = cardX;
                    currentCard.position.y = cardY;
                }
                
                // ✅ CRITICAL FIX: Ensure cards are clickable for local player only when it's their turn
                if (window.game && window.game.currentPlayerIndex === index && player.isLocalPlayer && !player.isBot) {
                    currentCard.isClickable = true;
                } else {
                    currentCard.isClickable = false;
                }
                
                // ✅ CRITICAL FIX: Multiplayer card visibility - players only see their own cards
                const isLocalPlayer = window.isMultiplayerMode && player.isLocalPlayer;
                
                if (player.isBot || !isLocalPlayer) {
                    // Bot cards OR other players' cards - show card backs
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
                        if (player.isBot) {
                            text('BOT', cardX + cardWidth/2, cardY + cardHeight/2);
                        } else {
                            text('CARD', cardX + cardWidth/2, cardY + cardHeight/2);
                        }
                    }
                } else {
                    // Local player's own cards - show actual card images
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
            // ✅ REDUCED LOGGING: Only log once per player state change, not every frame
            stroke(255, 255, 0); // Yellow circle
            strokeWeight(4);
            noFill();
            // Position circle exactly centered on the player text
            ellipse(position.x, position.y + position.labelOffset, 100, 100);
            strokeWeight(1);
        }
    });
    
    // Draw played cards in the center - PROPER CARD IMAGES with fallbacks
    if (window.playedCards && window.playedCards.length > 0) {
        // ✅ REDUCED LOGGING: Only log once per render cycle for performance
        if (!window.lastPlayedCardsLog || window.lastPlayedCardsLog !== window.playedCards.length) {
            console.log('🎨 Rendering played cards:', window.playedCards.length, 'cards');
            window.lastPlayedCardsLog = window.playedCards.length;
        }
        
        window.playedCards.forEach((playedCard, index) => {
            // CRITICAL FIX: Add null check to prevent ReferenceError
            if (!playedCard || !playedCard.card) {
                console.warn('⚠️ Invalid playedCard at index', index, ':', playedCard);
                return; // Skip this iteration
            }
            
            const centerX = width / 2 - (window.playedCards.length * cardWidth) / 2 + index * cardWidth;
            const centerY = height / 2 - cardHeight / 2;
            
            // Draw played card as proper card image if available, otherwise fallback
            if (playedCard.card.image) {
                image(playedCard.card.image, centerX, centerY, cardWidth, cardHeight);
            } else if (playedCard.card.name && window.getCardImageWithFallback) {
                // Try to get card image using the helper function
                const cardImage = window.getCardImageWithFallback(playedCard.card.name);
                if (cardImage) {
                    image(cardImage, centerX, centerY, cardWidth, cardHeight);
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
            
            // Draw player indicator with team color
            // Set color based on team assignment
            if (playedCard.player && playedCard.player.team === 'team1') {
                fill(100, 150, 255); // Blue for Team Alfa
            } else if (playedCard.player && playedCard.player.team === 'team2') {
                fill(255, 100, 100); // Red for Team Beta
            } else {
                fill(255, 255, 255); // White for unassigned players
            }
            textSize(16); // Larger font size
            textAlign(CENTER, CENTER);
            stroke(0, 0, 0); // Black outline for contrast
            strokeWeight(2); // Thick outline
            if (playedCard.player && playedCard.player.name) {
                text(playedCard.player.name, centerX + cardWidth/2, centerY + cardHeight + 25);
            }
            noStroke(); // Reset stroke for other elements
        });
    } else {
        console.log('🎨 No played cards to render');
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
            // Force repositioning to ensure it's visible - MOVED MORE TO THE RIGHT, aligned with empty space between bottom buttons
            trucoButton.position(width/2 + 20, height/2 + 160);
            trucoButton.style('z-index', '200');
            trucoButton.style('position', 'absolute');
            // Force red background and double size
            trucoButton.style('background', '#dc3545 !important');
            trucoButton.style('background-color', '#dc3545 !important');
            trucoButton.style('font-size', '80px'); // Double the font size
            trucoButton.style('padding', '80px 160px'); // Double the padding
            trucoButton.style('border', '10px solid #fff !important'); // Double the border thickness
            trucoButton.style('border-radius', '50px'); // More rounded corners for larger button
            trucoButton.style('box-shadow', '0 30px 60px rgba(0,0,0,0.7)'); // Enhanced shadow
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
    
    // ✅ CRITICAL FIX: Use server scores for multiplayer mode
    let teamAlfaRounds = 0;
    let teamBetaRounds = 0;
    let teamAlfaGames = 0;
    let teamBetaGames = 0;
    let teamAlfaSets = 0;
    let teamBetaSets = 0;
    
    // ✅ Scoring data processing (no debug logging to keep console clean)
    
    if (window.isMultiplayerMode && window.game.scores) {
        // Use server scores from multiplayer game
        teamAlfaRounds = window.game.scores.team1 || 0;
        teamBetaRounds = window.game.scores.team2 || 0;
        teamAlfaGames = window.game.games ? window.game.games.team1 : 0; // Use games score
        teamBetaGames = window.game.games ? window.game.games.team2 : 0; // Use games score
        teamAlfaSets = 0;  // Sets not implemented yet
        teamBetaSets = 0;  // Sets not implemented yet
        
        // ✅ Multiplayer scoring data processed (no debug logging)
    } else {
        // Fallback to old single-player scoring (if it exists)
        teamAlfaRounds = window.game.getTeam1Rounds ? window.game.getTeam1Rounds() : 0;
        teamBetaRounds = window.game.getTeam2Rounds ? window.game.getTeam2Rounds() : 0;
        teamAlfaGames = window.game.games ? window.game.games.team1 : 0;
        teamBetaGames = window.game.games ? window.game.games.team2 : 0;
        teamAlfaSets = window.game.sets ? window.game.sets.team1 : 0;
        teamBetaSets = window.game.sets ? window.game.sets.team2 : 0;
    }
    
    // Get current round number
    const currentRound = Math.max(teamAlfaRounds, teamBetaRounds) + 1;
    
    // Draw scoring panel at the top with better contrast and more height
    push();
    
    // Draw background panel
    fill(0, 0, 0, 0.95); // Almost solid black background for maximum readability
    rect(10, 10, width - 20, 150);
    
    // Reset all text properties for consistent rendering
    noStroke();
    textAlign(LEFT, TOP);
    
    // Team Alfa (Left side) - BLUE COLOR for Team Alfa
    fill(100, 150, 255); // Blue color for Team Alfa
    textSize(24);
    text("TEAM ALFA", 25, 25);
    
    textSize(22);
    text(`Rounds: ${teamAlfaRounds}/2`, 25, 55);
    text(`Games: ${teamAlfaGames}/12`, 25, 85);
    text(`Sets: ${teamAlfaSets}`, 25, 115);
    
    // Team Beta (Right side) - RED COLOR for Team Beta
    fill(255, 100, 100); // Red color for Team Beta
    textSize(24);
    text("TEAM BETA", width - 180, 25);
    
    textSize(22);
    text(`Rounds: ${teamBetaRounds}/2`, width - 180, 55);
    text(`Games: ${teamBetaGames}/12`, width - 180, 85);
    text(`Sets: ${teamBetaSets}`, width - 180, 115);
    
    // Center section - STABLE TEXT RENDERING
    textAlign(CENTER, TOP);
    
    // Current round indicator - Center, very prominent
    fill(255, 255, 0); // Bright yellow for maximum visibility
    textSize(30);
    text(`ROUND ${currentRound} OF 3`, width/2, 25);
    
    // Game progress indicator - Center, below round
    fill(255, 255, 255); // Bright white
    textSize(22);
    text(`Game ${teamAlfaGames + teamBetaGames + 1} of Set`, width/2, 65);
    
    // Team assignments - Colored circles instead of text
    // Team Alfa circle (Blue)
    fill(100, 150, 255); // Blue color for Team Alfa
    noStroke();
    ellipse(width/2 - 80, 120, 20, 20); // Left circle
    
    // Team Beta circle (Red)
    fill(255, 100, 100); // Red color for Team Beta
    ellipse(width/2 + 80, 120, 20, 20); // Right circle
    
    // Team labels below circles
    fill(255, 255, 255); // White text for labels
    textSize(18);
    text("Team Alfa", width/2 - 80, 140); // Moved up 5px to avoid touching white line
    text("Team Beta", width/2 + 80, 140); // Moved up 5px to avoid touching white line
    
    pop();
}


