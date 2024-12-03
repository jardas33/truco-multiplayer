let roomId;
let playerId;
let isMultiplayerMode = false;
window.players = [];
  
function createDeck() {
    deck = [];
    for (let card in cardValues) {
      deck.push({
        name: card,
        value: cardValues[card],
        image: cardImages[card],
        isClickable: false,
      });
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
    for (let player of players) {
      player.hand = deck.splice(0, 3);
    }
  }
  
  window.Game = class Game {
    constructor(players) {
      this.players = players;
      this.currentPlayerIndex = 0;
      this.initialTrucoCallerIndex = null;
      this.lastActionWasRaise = false;
      this.round = 0;
      this.trucoState = null;
      this.gameValue = 1;
      this.winningstruc = null;
      this.scores = {
        team1: 0,
        team2: 0
      };
      this.games = {
        team1: 0,
        team2: 0
      };
      this.sets = {
        team1: 0,
        team2: 0
      };
      this.roundResults = [];
      this.startRoundPlayer = 0;
  
      // Initialize socket for multiplayer
      if (isMultiplayerMode) {
        this.initializeSocket();
      }
    }
  
    initializeSocket() {
      socket = io();
  
      socket.on('playerJoined', (data) => {
        this.updatePlayers(data.players);
        playerId = data.playerId;
      });
  
      socket.on('gameStart', (players) => {
        this.startGame();
      });
  
      socket.on('cardPlayed', (data) => {
        if (data.playerId !== playerId) {
          this.handleRemoteCardPlay(data);
        }
      });
  
      socket.on('trucoRequested', (data) => {
        if (data.playerId !== playerId) {
          this.handleRemoteTrucoRequest(data);
        }
      });
  
      socket.on('trucoResponseReceived', (data) => {
        if (data.playerId !== playerId) {
          this.handleRemoteTrucoResponse(data);
        }
      });
    }
  
    startGame() {
      console.log("Starting game with players:", this.players);
      this.currentPlayerIndex = 0;
      this.players[this.currentPlayerIndex].isActive = true;
      playedCards = [];
      this.players[this.currentPlayerIndex].hand.forEach(card => card.isClickable = true);
      
      if (this.players[this.currentPlayerIndex].isBot) {
        setTimeout(() => this.players[this.currentPlayerIndex].botPlay(this), timeBots);
      }
      
      this.startRoundPlayer = this.currentPlayerIndex;
    }
  
    nextPlayer() {
      if (this.trucoState === true) {
        return; // Game is paused during truco decision
      }
  
      this.players[this.currentPlayerIndex].hand.forEach(card => card.isClickable = false);
      this.players[this.currentPlayerIndex].isActive = false;
      
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
      
      this.players[this.currentPlayerIndex].isActive = true;
      this.players[this.currentPlayerIndex].hand.forEach(card => card.isClickable = true);
  
      if (this.players[this.currentPlayerIndex].isBot) {
        setTimeout(() => this.players[this.currentPlayerIndex].botPlay(this), timeBots);
      }
    }
  
    playCard(player, cardIndex) {
      if (gameState !== gameStateEnum.Playing || 
          player !== this.players[this.currentPlayerIndex] || 
          this.trucoState === true) {
        return null;
      }
  
      player.isActive = false;
  
      // Calculate card position in the center
      let playerPos = playerPositions[this.currentPlayerIndex];
      let cardPosX = lerp(playerPos.x, width/2, 0.5);
      let cardPosY = lerp(playerPos.y, height/2, 0.5);
  
      let card = player.hand.splice(cardIndex, 1)[0];
      playedCards.push({
        card: card,
        player: player,
        position: { x: cardPosX, y: cardPosY }
      });
  
      if (playedCards.length === this.players.length) {
        this.endRound();
      } else {
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
      // Find the winning card
      let winningCard = playedCards[0];
      for (let i = 1; i < playedCards.length; i++) {
        if (playedCards[i].card.value < winningCard.card.value) {
          winningCard = playedCards[i];
        }
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
          this.currentPlayerIndex = winningCard.player.id - 1;
          this.startRoundPlayer = this.currentPlayerIndex;
          this.players[this.currentPlayerIndex].isActive = true;
          this.players[this.currentPlayerIndex].hand.forEach(card => card.isClickable = true);
          
          if (this.players[this.currentPlayerIndex].isBot) {
            setTimeout(() => this.players[this.currentPlayerIndex].botPlay(this), timeBots);
          }
        }, timeEndRound);
      }
    }
  
    endGame(winner) {
      // Check if a team has won the set
      if (this.games.team1 >= 12) {
        this.sets.team1++;
        this.games.team1 = 0;
        this.games.team2 = 0;
      } else if (this.games.team2 >= 12) {
        this.sets.team2++;
        this.games.team1 = 0;
        this.games.team2 = 0;
      }
  
      // Reset for next game
      setTimeout(() => {
        this.scores = { team1: 0, team2: 0 };
        this.gameValue = 1;
        this.trucoState = null;
        this.roundResults = [];
        playedCards = [];
        
        // Create and distribute new cards
        createDeck();
        shuffleDeck(deck);
        distributeCards(this.players, deck);
        
        // Start with next player
        this.currentPlayerIndex = (this.startRoundPlayer + 1) % this.players.length;
        this.startRoundPlayer = this.currentPlayerIndex;
        this.players[this.currentPlayerIndex].isActive = true;
        this.players[this.currentPlayerIndex].hand.forEach(card => card.isClickable = true);
        
        if (this.players[this.currentPlayerIndex].isBot) {
          setTimeout(() => this.players[this.currentPlayerIndex].botPlay(this), timeBots);
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
        setTimeout(() => this.players[nextPlayerIndex].botRespondTruco(this), timeBots);
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
      if (response === 1) {  // Accept
        this.gameValue = this.potentialGameValue;
        this.trucoState = null;
        
        if (this.lastActionWasRaise) {
          this.currentPlayerIndex = this.initialTrucoCallerIndex;
          this.lastActionWasRaise = false;
          this.initialTrucoCallerIndex = null;
        } else {
          this.currentPlayerIndex = this.initialTrucoCallerIndex;
        }
  
        popupMessage = (this.gameValue === 3) ? 'Truco accepted' : 'Raise accepted';
        openPopup(true);
  
        if (this.players[this.currentPlayerIndex].isBot) {
          setTimeout(() => this.players[this.currentPlayerIndex].botPlay(this), timeBots);
        }
      } else if (response === 2) {  // Reject
        if (this.initialTrucoCallerIndex !== null) {
          let winningTeam = this.players[this.initialTrucoCallerIndex].team;
          if (winningTeam === 1) {
            this.games.team1 += this.gameValue;
          } else {
            this.games.team2 += this.gameValue;
          }
        }
        this.endGame(this.players[this.initialTrucoCallerIndex].team === 1 ? "Team 1" : "Team 2");
      } else if (response === 3) {  // Raise
        this.lastActionWasRaise = true;
        
        if (this.potentialGameValue === 3) {
          this.potentialGameValue = 6;
        } else if (this.potentialGameValue + 3 <= 12) {
          this.potentialGameValue += 3;
        }
  
        if (this.potentialGameValue === 12) {
          buttonRaiseTruco.hide();
        }
  
        let nextPlayerIndex = (this.initialTrucoCallerIndex) % this.players.length;
        if (this.players[nextPlayerIndex].isBot) {
          setTimeout(() => this.players[nextPlayerIndex].botRespondTruco(this), timeBots);
        }
      }
  
      if (isMultiplayerMode) {
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
  }
  
  function startTrucoGame() {
    console.log("Starting Truco game...");
    if (window.roomId) {
        // Multiplayer mode
        isMultiplayerMode = true;
        gameState = gameStateEnum.Playing;
        
        // Hide menu and show game canvas
        document.getElementById('Menu').classList.remove('active');
        document.getElementById('Game').classList.add('active');
        
        // Show game UI elements
        backToMainMenuButton.show();
        trucoButton.show();
        
        window.game = new window.Game([]);
        
        // Listen for game started event which includes player hands
        socket.on('gameStarted', (data) => {
            console.log('Received game data:', data);
            playerHand = data.hand;
            playerPosition = data.position;
            window.game.updatePlayers(data.players);
            window.game.currentPlayerIndex = 0;
            
            // Initialize game state
            createDeck();
            shuffleDeck(deck);
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
    
    // Create human player
    window.players.push(new Player(1, "Player 1", "team1", false));
    
    // Create bot players
    window.players.push(new Player(2, "Bot 1", "team2", true));
    window.players.push(new Player(3, "Bot 2", "team1", true));
    window.players.push(new Player(4, "Bot 3", "team2", true));

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

    playerHand.forEach((card, index) => {
        const x = startX + index * cardWidth;
        if (card.image) {
            image(card.image, x, startY, cardWidth, cardHeight);
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
  