let roomId;
let playerId;
let isMultiplayerMode = false;
window.players = [];
  
function createDeck() {
    console.log('🃏 Creating deck...');
    
    // Check if card images are loaded
    let imagesLoaded = 0;
    let totalImages = Object.keys(cardValues).length;
    
    for (let cardName in cardValues) {
        if (cardImages[cardName]) {
            imagesLoaded++;
        }
    }
    
    console.log(`🖼️ Card images loaded: ${imagesLoaded}/${totalImages}`);
    
    deck = [];
    let cardsCreated = 0;
    
    for (let cardName in cardValues) {
        const cardImage = cardImages[cardName];
        if (cardImage) {
            deck.push({
                name: cardName,
                value: cardValues[cardName],
                image: cardImage,
                isClickable: false,
            });
            cardsCreated++;
        } else {
            console.warn(`⚠️ Card image missing for: ${cardName} - using fallback`);
            // Create card with fallback
            deck.push({
                name: cardName,
                value: cardValues[cardName],
                image: null, // Will use fallback rendering
                isClickable: false,
            });
            cardsCreated++;
        }
    }
    
    console.log(`🎯 Deck created with ${cardsCreated} cards`);
    console.log('Sample cards:', deck.slice(0, 3));
    
    // If no images loaded, log a warning
    if (imagesLoaded === 0) {
        console.warn('⚠️ NO CARD IMAGES LOADED! Using fallback rendering.');
        console.warn('💡 Check browser console for image loading errors.');
    } else if (imagesLoaded < totalImages) {
        console.warn(`⚠️ Only ${imagesLoaded}/${totalImages} card images loaded. Some cards will use fallback rendering.`);
    } else {
        console.log('🎉 All card images loaded successfully!');
    }
}
  
  function shuffleDeck(deck) {
    if (deck.length > 0) {
      for (let i = deck.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
    }
  }
  
  function distributeCards(players, deck) {
    console.log('🎴 Distributing cards to players...');
    console.log('Players to receive cards:', players.map(p => p.name));
    console.log('Deck size before distribution:', deck.length);
    
    for (let player of players) {
        const playerCards = deck.splice(0, 3);
        player.hand = playerCards;
        console.log(`🎯 ${player.name} received ${playerCards.length} cards:`, playerCards.map(c => c.name));
    }
    
    console.log('Deck size after distribution:', deck.length);
    console.log('Player hands after distribution:', players.map(p => ({ name: p.name, handSize: p.hand?.length || 0 })));
}
  
  window.Game = class Game {
    constructor(players) {
      this.players = players;
      this.currentPlayerIndex = 0;
      this.startRoundPlayer = 0;
      this.round = 0;
      this.scores = { team1: 0, team2: 0 };
      this.games = { team1: 0, team2: 0 };
      this.sets = { team1: 0, team2: 0 };
      this.gameValue = 1;
      this.potentialGameValue = 0;
      this.trucoState = false;
      this.initialTrucoCallerIndex = null;
      this.roundResults = [];
      this.IsDraw = false;
      this.roundWinner = null;
      this.winningstruc = null;
      console.log("Game initialized with players:", players);
    }
  
         startGame() {
       console.log("Starting game...");
       createDeck();
       shuffleDeck(deck);
       distributeCards(this.players, deck);
       
       // Ensure all players have correct playerIndex
       this.players.forEach((player, index) => {
         if (player.playerIndex === null || player.playerIndex === undefined) {
           player.playerIndex = index;
           console.log(`🔧 Fixed playerIndex for ${player.name}: ${index}`);
         }
       });
       
       // Reset Truco state
       this.trucoState = false;
       this.initialTrucoCallerIndex = null;
       this.lastActionWasRaise = false;
       this.potentialGameValue = 0;
       this.trucoCallerTeam = null;
       isInTrucoPhase = false;
       
       this.currentPlayerIndex = 0;
       this.players[this.currentPlayerIndex].isActive = true;
       playedCards = [];
       
       // Make cards clickable for first player
       this.players[this.currentPlayerIndex].hand.forEach(card => card.isClickable = true);
       
       // Show game UI elements
       backToMainMenuButton.show();
       trucoButton.show();
       
       // If first player is a bot, it plays automatically
       if (this.players[this.currentPlayerIndex].isBot) {
         setTimeout(() => this.players[this.currentPlayerIndex].botPlay(), timeBots);
       }
       
       console.log("Game started successfully");
       console.log("Player indices:", this.players.map(p => `${p.name}: ${p.playerIndex}`));
     }
  
    nextPlayer() {
      if (this.trucoState === true) {
        console.log(`⏸️ Game paused during truco decision`);
        return; // Game is paused during truco decision
      }
  
      console.log(`🔄 nextPlayer called - Current player: ${this.currentPlayerIndex}`);
      
      // Deactivate current player
      this.players[this.currentPlayerIndex].hand.forEach(card => card.isClickable = false);
      this.players[this.currentPlayerIndex].isActive = false;
      
      // Move to next player
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
      
      // Activate next player
      this.players[this.currentPlayerIndex].isActive = true;
      this.players[this.currentPlayerIndex].hand.forEach(card => card.isClickable = true);
      
      console.log(`🔄 Turn moved to: ${this.players[this.currentPlayerIndex].name} (Player ${this.currentPlayerIndex + 1})`);
      console.log(`🔄 Active player: ${this.players[this.currentPlayerIndex].name}, isBot: ${this.players[this.currentPlayerIndex].isBot}`);
  
      // If it's a bot's turn, make them play
      if (this.players[this.currentPlayerIndex].isBot) {
        console.log(`🤖 Bot ${this.currentPlayerIndex + 1} is thinking...`);
        setTimeout(() => this.players[this.currentPlayerIndex].botPlay(), timeBots);
      } else {
        console.log(`👤 Human player ${this.currentPlayerIndex + 1} can now play`);
      }
    }
  
    playCard(player, cardIndex) {
      console.log(`🎯 playCard called by: ${player.name} (Player ${player.id})`);
      console.log(`🎯 Current turn: ${this.players[this.currentPlayerIndex].name} (Player ${this.currentPlayerIndex + 1})`);
      console.log(`🎯 Game state: ${gameState}, Truco state: ${this.trucoState}`);
      
      if (gameState !== gameStateEnum.Playing || 
          player !== this.players[this.currentPlayerIndex] || 
          this.trucoState === true) {
        console.log(`❌ playCard rejected: Invalid game state or turn`);
        return null;
      }
  
      console.log(`✅ Card played successfully by ${player.name}`);
      player.isActive = false;
  
      // Calculate card position in the center
      let playerPos = playerPositions[this.currentPlayerIndex];
      if (!playerPos) {
        console.error(`❌ No player position found for index ${this.currentPlayerIndex}`);
        playerPos = { x: width/2, y: height/2 }; // Fallback to center
      }
      let cardPosX = lerp(playerPos.x, width/2, 0.5);
      let cardPosY = lerp(playerPos.y, height/2, 0.5);
  
      let card = player.hand.splice(cardIndex, 1)[0];
      playedCards.push({
        card: card,
        player: player,
        position: { x: cardPosX, y: cardPosY }
      });
      
      console.log(`📊 Cards played this round: ${playedCards.length}/${this.players.length}`);
  
      if (playedCards.length === this.players.length) {
        console.log(`🏁 Round complete, ending round...`);
        this.endRound();
      } else {
        console.log(`⏭️ Moving to next player...`);
        this.nextPlayer();
      }
  
      if (isMultiplayerMode) {
        socket.emit('playCard', {
          roomId: roomId,
          cardIndex: cardIndex,
          card: card
        });
      }
  
      return card;
    }
  
    endRound() {
      console.log(`🏁 endRound called with ${playedCards.length} played cards`);
      
      // Find the winning card
      let winningCard = playedCards[0];
      for (let i = 1; i < playedCards.length; i++) {
        if (playedCards[i].card.value < winningCard.card.value) {
          winningCard = playedCards[i];
        }
      }
      
             console.log(`🏆 Winning card: ${winningCard.card.name} by ${winningCard.player.name} (playerIndex: ${winningCard.player.playerIndex})`);

       // Show round result popup
       popupMessage = `🏆 ROUND COMPLETE! 🏆\n\nWinning card: ${winningCard.card.name}\n\nWinner: ${winningCard.player.name}\n\nTeam: ${winningCard.player.team === "team1" ? "Team Alfa" : "Team Beta"}`;
       try {
         openPopup(true);
       } catch (error) {
         console.warn('⚠️ Could not show round result popup, continuing with game');
       }

       // Determine winning team
       let winningTeam = winningCard.player.team;
      if (winningTeam === 1) {
        this.scores.team1++;
      } else {
        this.scores.team2++;
      }
  
      // Store round result
      this.roundResults.push({
        winner: winningTeam,
        cards: playedCards.map(pc => pc.card)
      });
  
      // Check if a team has won the game
      if (this.scores.team1 >= 2) {
        this.games.team1 += this.gameValue;
        this.endGame("Team 1");
      } else if (this.scores.team2 >= 2) {
        this.games.team2 += this.gameValue;
        this.endGame("Team 2");
      } else {
        // Prepare for next round
        setTimeout(() => {
          playedCards = [];
          // FIXED: Use playerIndex instead of string ID
          this.currentPlayerIndex = winningCard.player.playerIndex;
          this.startRoundPlayer = this.currentPlayerIndex;
          
          // Safety check to ensure valid player index
          if (this.currentPlayerIndex >= 0 && this.currentPlayerIndex < this.players.length) {
            this.players[this.currentPlayerIndex].isActive = true;
            this.players[this.currentPlayerIndex].hand.forEach(card => card.isClickable = true);
            
            if (this.players[this.currentPlayerIndex].isBot) {
              setTimeout(() => this.players[this.currentPlayerIndex].botPlay(), timeBots);
            }
          } else {
            console.error(`❌ Invalid player index: ${this.currentPlayerIndex}`);
            // Fallback to first player
            this.currentPlayerIndex = 0;
            this.players[0].isActive = true;
            this.players[0].hand.forEach(card => card.isClickable = true);
          }
        }, timeEndRound);
      }
    }
  
         endGame(winner) {
       console.log(`🏁 Game ended! Winner: ${winner}`);
       
       // Show game end popup
       popupMessage = `🏁 GAME ENDED! 🏁\n\nWinner: ${winner}\n\nFinal Score:\nTeam Alfa: ${this.games.team1} games\nTeam Beta: ${this.games.team2} games`;
       try {
         openPopup(true);
       } catch (error) {
         console.warn('⚠️ Could not show game end popup, continuing with game');
       }
       
       // Check if a team has won the set
       if (this.games.team1 >= 12) {
         this.sets.team1++;
         this.games.team1 = 0;
         this.games.team2 = 0;
         console.log(`🏆 Team Alfa won the set! Total sets: ${this.sets.team1}`);
         
         // Show set win popup
         popupMessage = `🏆 SET COMPLETE! 🏆\n\nTeam Alfa has won the set!\n\nTotal Sets:\nTeam Alfa: ${this.sets.team1}\nTeam Beta: ${this.sets.team2}`;
         try {
           openPopup(true);
         } catch (error) {
           console.warn('⚠️ Could not show set win popup, continuing with game');
         }
       } else if (this.games.team2 >= 12) {
         this.sets.team2++;
         this.games.team1 = 0;
         this.games.team2 = 0;
         console.log(`🏆 Team Beta won the set! Total sets: ${this.sets.team2}`);
         
         // Show set win popup
         popupMessage = `🏆 SET COMPLETE! 🏆\n\nTeam Beta has won the set!\n\nTotal Sets:\nTeam Alfa: ${this.sets.team1}\nTeam Beta: ${this.sets.team2}`;
         try {
           openPopup(true);
         } catch (error) {
           console.warn('⚠️ Could not show set win popup, continuing with game');
         }
       }
   
       // Reset for next game
       setTimeout(() => {
         console.log(`🔄 Starting new game...`);
         
         // Reset game state
         this.scores = { team1: 0, team2: 0 };
         this.gameValue = 1;
         this.trucoState = false;
         this.initialTrucoCallerIndex = null;
         this.lastActionWasRaise = false;
         this.potentialGameValue = 0;
         this.trucoCallerTeam = null;
         this.roundResults = [];
         playedCards = [];
         
         // Reset Truco phase
         isInTrucoPhase = false;
         
         // Create and distribute new cards
         createDeck();
         shuffleDeck(deck);
         distributeCards(this.players, deck);
         
         // Start with next player
         this.currentPlayerIndex = (this.startRoundPlayer + 1) % this.players.length;
         this.startRoundPlayer = this.currentPlayerIndex;
         
         // Safety check to ensure valid player index
         if (this.currentPlayerIndex >= 0 && this.currentPlayerIndex < this.players.length) {
           this.players[this.currentPlayerIndex].isActive = true;
           this.players[this.currentPlayerIndex].hand.forEach(card => card.isClickable = true);
           
           if (this.players[this.currentPlayerIndex].isBot) {
             setTimeout(() => this.players[this.currentPlayerIndex].botPlay(), timeBots);
           }
         } else {
           console.error(`❌ Invalid player index in endGame: ${this.currentPlayerIndex}`);
           // Fallback to first player
           this.currentPlayerIndex = 0;
           this.players[0].isActive = true;
           this.players[0].hand.forEach(card => card.isClickable = true);
         }
       }, timeEndRound);
     }
  
    requestTruco(player) {
      if (this.trucoState !== null || player !== this.players[this.currentPlayerIndex]) {
        return false;
      }
  
      this.trucoState = true;
      this.initialTrucoCallerIndex = this.currentPlayerIndex;
      this.potentialGameValue = 3;
      
      // Show truco response buttons for next player
      let nextPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
      if (this.players[nextPlayerIndex].isBot) {
        setTimeout(() => this.players[nextPlayerIndex].botRespondTruco(), timeBots);
      } else {
        buttonAcceptTruco.show();
        buttonRejectTruco.show();
        buttonRaiseTruco.show();
      }
  
      if (isMultiplayerMode) {
        socket.emit('requestTruco', {
          roomId: roomId,
          playerId: playerId
        });
      }
  
      return true;
    }
  
         respondTruco(player, response) {
       console.log(`🎯 Truco response from ${player.name}: ${response === 1 ? 'Accept' : response === 2 ? 'Reject' : 'Raise'}`);
       
       if (response === 1) {  // Accept
         console.log(`✅ Truco accepted! Game now worth ${this.potentialGameValue} games`);
         
         // Set the final game value
         this.gameValue = this.potentialGameValue;
         this.trucoState = false; // Resume normal gameplay
         isInTrucoPhase = false;
         
         // Return control to the player who called Truco
         this.currentPlayerIndex = this.initialTrucoCallerIndex;
         
         // Reset Truco state
         this.initialTrucoCallerIndex = null;
         this.lastActionWasRaise = false;
         this.potentialGameValue = 0;
   
                   // Show acceptance message
          popupMessage = `✅ TRUCO ACCEPTED! ✅\n\n${this.players[this.currentPlayerIndex].name} has accepted the Truco challenge!\n\nGame continues and is now worth ${this.gameValue} games.\n\n${this.players[this.currentPlayerIndex].name} can now play their card.`;
          try {
            openPopup(true);
          } catch (error) {
            console.warn('⚠️ Could not show popup, continuing with game');
          }
   
         // Make the Truco caller active and continue game
         if (this.currentPlayerIndex >= 0 && this.currentPlayerIndex < this.players.length) {
           this.players[this.currentPlayerIndex].isActive = true;
           this.players[this.currentPlayerIndex].hand.forEach(card => card.isClickable = true);
           
           if (this.players[this.currentPlayerIndex].isBot) {
             setTimeout(() => this.players[this.currentPlayerIndex].botPlay(), timeBots);
           }
         }
         
               } else if (response === 2) {  // Reject
          console.log(`❌ Truco rejected! Game ends immediately`);
          
          // Determine winning team (the team that called Truco)
          let winningTeam = this.trucoCallerTeam;
          let winningTeamName = winningTeam === "team1" ? "Team Alfa" : "Team Beta";
          
          // Award games to the winning team - ONLY 1 GAME when rejected!
          if (winningTeam === "team1") {
            this.games.team1 += 1; // Only 1 game when rejected
          } else {
            this.games.team2 += 1; // Only 1 game when rejected
          }
          
                    // Show rejection message
           popupMessage = `❌ TRUCO REJECTED! ❌\n\n${winningTeamName} has rejected the Truco challenge!\n\nGame ends immediately and ${winningTeamName} wins 1 game.\n\nA new game will start shortly.`;
          try {
            openPopup(true);
          } catch (error) {
            console.warn('⚠️ Could not show popup, continuing with game');
          }
         
         // Reset Truco state
         this.trucoState = false;
         isInTrucoPhase = false;
         this.initialTrucoCallerIndex = null;
         this.lastActionWasRaise = false;
         this.potentialGameValue = 0;
         
         // End the current game and start a new one
         setTimeout(() => {
           this.endGame(winningTeamName);
         }, 2000);
         
       } else if (response === 3) {  // Raise
         console.log(`📈 Truco raised!`);
         
         // Increase game value
         if (this.potentialGameValue === 3) {
           this.potentialGameValue = 6;
         } else if (this.potentialGameValue === 6) {
           this.potentialGameValue = 9;
         } else if (this.potentialGameValue === 9) {
           this.potentialGameValue = 12;
         } else if (this.potentialGameValue < 12) {
           this.potentialGameValue += 3;
         }
         
         // Cap at 12 games maximum
         if (this.potentialGameValue > 12) {
           this.potentialGameValue = 12;
         }
         
         console.log(`📈 Game value raised to ${this.potentialGameValue} games`);
         
         // Mark that this was a raise action
         this.lastActionWasRaise = true;
         
         // Move to the next player in the opposing team for their response
         let nextPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
         
         // Keep moving until we find a player from the opposing team
         while (this.players[nextPlayerIndex].team === this.trucoCallerTeam && 
                nextPlayerIndex !== this.initialTrucoCallerIndex) {
           nextPlayerIndex = (nextPlayerIndex + 1) % this.players.length;
         }
         
         this.currentPlayerIndex = nextPlayerIndex;
         
                   // Show raise message
          popupMessage = `📈 TRUCO RAISED! 📈\n\n${this.players[this.currentPlayerIndex].name} has raised the Truco to ${this.potentialGameValue} games!\n\n${this.players[nextPlayerIndex].name} must now respond: Accept, Reject, or Raise further.\n\nCurrent game value: ${this.potentialGameValue} games`;
          try {
            openPopup(true);
          } catch (error) {
            console.warn('⚠️ Could not show popup, continuing with game');
          }
   
         // If next player is a bot, make them respond
         if (this.players[nextPlayerIndex].isBot) {
           setTimeout(() => this.players[nextPlayerIndex].botRespondTruco(), 1000);
         } else {
           // Human player - show response buttons
           if (buttonAcceptTruco && buttonRejectTruco && buttonRaiseTruco) {
             buttonAcceptTruco.show();
             buttonRejectTruco.show();
             // Only show raise button if game value can still be increased
             if (this.potentialGameValue < 12) {
               buttonRaiseTruco.show();
             }
           }
         }
       }
   
       // Hide response buttons for current player
       if (buttonAcceptTruco && buttonRejectTruco && buttonRaiseTruco) {
         buttonAcceptTruco.hide();
         buttonRejectTruco.hide();
         buttonRaiseTruco.hide();
       }
   
       // Emit to multiplayer if needed
       if (isMultiplayerMode && socket) {
         socket.emit('respondTruco', {
           roomId: roomId,
           playerId: playerId,
           response: response
         });
       }
     }
  
    getTeam1Rounds() {
      return this.scores.team1;
    }
  
    getTeam2Rounds() {
      return this.scores.team2;
    }
  
    getCurrentPlayer() {
      return this.players[this.currentPlayerIndex];
    }
  
    updatePlayers(players) {
      this.players = players;
    }

    restartGame() {
      // Reset game state for a new game
      this.scores = { team1: 0, team2: 0 };
      this.gameValue = 1;
      this.trucoState = false;
      this.initialTrucoCallerIndex = null;
      this.roundResults = [];
      this.IsDraw = false;
      this.roundWinner = null;
      this.winningstruc = null;
      this.currentPlayerIndex = 0;
      this.startRoundPlayer = 0;
      this.round = 0;
      playedCards = [];
      
      // Reset player states
      this.players.forEach(player => {
        player.isActive = false;
        player.hand = [];
      });
      
      // Make first player active
      this.players[0].isActive = true;
    }

    handleCardPlay(card, playerId) {
      // Handle a card played by another player in multiplayer mode
      if (this.trucoState === true) {
        return; // Game is paused during truco decision
      }

      // Find the player who played the card
      const player = this.players.find(p => p.id === playerId);
      if (!player) return;

      // Remove the card from the player's hand
      const cardIndex = player.hand.findIndex(c => c.name === card.name);
      if (cardIndex !== -1) {
        const playedCard = player.hand.splice(cardIndex, 1)[0];
        
        // Calculate card position in the center
        let playerPos = playerPositions[this.currentPlayerIndex];
        if (!playerPos) {
          console.error(`❌ No player position found for index ${this.currentPlayerIndex}`);
          playerPos = { x: width/2, y: height/2 }; // Fallback to center
        }
        let cardPosX = lerp(playerPos.x, width/2, 0.5);
        let cardPosY = lerp(playerPos.y, height/2, 0.5);

        playedCards.push({
          card: playedCard,
          player: player,
          position: { x: cardPosX, y: cardPosY }
        });

        if (playedCards.length === this.players.length) {
          this.endRound();
        } else {
          this.nextPlayer();
        }
      }
    }
  }
  
  function startTrucoGame() {
    console.log("Starting Truco game...");
    if (window.roomId) {
        // Multiplayer mode
        isMultiplayerMode = true;
        gameState = gameStateEnum.Playing;
        
        // Initialize game
        window.game = new window.Game(window.players || []);
        createDeck();
        shuffleDeck(deck);
        
        // Listen for game started event which includes player hands
        socket.on('gameStarted', (data) => {
            console.log('Received game data:', data);
            playerHand = data.hand;
            playerPosition = data.position;
            window.game.updatePlayers(data.players);
            window.game.currentPlayerIndex = 0;
            
            // Show game UI elements
            backToMainMenuButton.show();
            trucoButton.show();
            
            // Force redraw
            redrawGame();
        });

        // Listen for card played events
        socket.on('cardPlayed', (data) => {
            console.log('Card played:', data);
            if (data.playerId !== socket.id) {
                window.game.handleCardPlay(data.card, data.playerId);
                redrawGame();
            }
        });
    }
}

// Add window resize handler
function windowResized() {
    if (gameState === gameStateEnum.Playing) {
        resizeCanvas(windowWidth, windowHeight);
        redrawGame();
    }
}
  
  function startSinglePlayerGame() {
    console.log("Starting single player game...");
    isMultiplayerMode = false;
    gameState = gameStateEnum.Playing;
    window.players = [];
    
    // Create human player (Player 1 - Team Alfa)
    window.players.push(new Player("Player 1", "team1", false, 0));
    
    // Create bot players with correct team assignments
    window.players.push(new Player("Bot 1", "team2", true, 1));  // Team Beta
    window.players.push(new Player("Bot 2", "team1", true, 2));  // Team Alfa  
    window.players.push(new Player("Bot 3", "team2", true, 3));  // Team Beta

    createDeck();
    shuffleDeck(deck);
    distributeCards(window.players, deck);
    window.game = new window.Game(window.players);
    window.game.startGame();
  }
  
  function drawPlayerHand() {
    if (!playerHand || !playerHand.length) return;

    const startX = width/2 - (playerHand.length * cardWidth)/2;
    const startY = height - cardHeight - 20;

    playerHand.forEach((cardItem, index) => {
        const x = startX + index * cardWidth;
        if (cardItem && cardItem.image) {
            image(cardItem.image, x, startY, cardWidth, cardHeight);
        }
    });
  }
  
  function drawOtherPlayersCards() {
    const cardWidth = 60;
    const cardHeight = 90;
    
    // Draw left player's cards
    if (players.length > 1) {
        for (let i = 0; i < 3; i++) {
            image(backCardImage, 20, 200 + i * 30, cardWidth, cardHeight);
        }
    }
    
    // Draw top player's cards
    if (players.length > 2) {
        for (let i = 0; i < 3; i++) {
            image(backCardImage, width/2 - 90 + i * 30, 20, cardWidth, cardHeight);
        }
    }
    
    // Draw right player's cards
    if (players.length > 3) {
        for (let i = 0; i < 3; i++) {
            image(backCardImage, width - 80, 200 + i * 30, cardWidth, cardHeight);
        }
    }
  }
  