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
    getTeam1Rounds() {
      return this.scores.team1;
    }
  
    getTeam2Rounds() {
      return this.scores.team2;
    }
  
    // Add game and set counters for each team
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
        team2: 0,
      };
      this.games = {
        team1: 0,
        team2: 0,
      };
      this.sets = {
        team1: 0,
        team2: 0,
      };
      this.roundResults = [];
  
      // Add socket initialization
      this.initializeSocket();
    }
  
    // Add new method for socket initialization
    initializeSocket() {
      socket = io();
  
      socket.on('playerJoined', (data) => {
        // Update local players array with new player data
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
  
    addPlayer(player) {
      this.players.push(player);
    }
  
    startGame() {
      console.log("Starting game with players:", this.players);
      this.currentPlayerIndex = 0;
      this.players[this.currentPlayerIndex].isActive = true;
      playedCards = [];
      this.players[this.currentPlayerIndex].hand.forEach(
        (card) => (card.isClickable = true)
      );
      if (this.players[this.currentPlayerIndex].isBot) {
        setTimeout(
          () => this.players[this.currentPlayerIndex].botPlay(this),
          timeBots
        );
      }
      this.startRoundPlayer = this.currentPlayerIndex;
    }
  
    // method to move to the next player
    nextPlayer() {
  
      if (this.trucoState === true) {
        return; // Game is paused, do not change current player
      }
  
      this.players[this.currentPlayerIndex].hand.forEach(
        (card) => (card.isClickable = false)
      );
      this.currentPlayerIndex++;
      if (this.currentPlayerIndex >= this.players.length) {
        this.currentPlayerIndex = 0;
      }
      //console.log("next player " + (this.currentPlayerIndex + 1));
      this.players[this.currentPlayerIndex].isActive = true;
      this.players[this.currentPlayerIndex].hand.forEach(
        (card) => (card.isClickable = true)
      );
  
      // If the next player is a bot, it plays automatically after 1 second
      if (this.players[this.currentPlayerIndex].isBot) {
        setTimeout(
          () => this.players[this.currentPlayerIndex].botPlay(this),
          timeBots
        );
      }
    }
  
    playCard(player, cardIndex) {
  
  
      if (gameState !== gameStateEnum.Playing) {
        return null;
      }
      if (player !== this.players[this.currentPlayerIndex]) {
        throw new Error("It's not your turn");
      }
      if (this.trucoState === true) {
        return null;
      }
  
      if (cardIndex < 0 || cardIndex >= player.hand.length) {
        throw new Error("Invalid card index.");
      }
  
      player.isActive = false;
  
      // Place it in the center instead of player's position
      let playerPos = playerPositions[this.currentPlayerIndex];
      let cardPosX = lerp(playerPos.x, width / 2, 0.5); // Interpolate between player's X position and screen center
      let cardPosY = lerp(playerPos.y, height / 2, 0.5); // Interpolate between player's Y position and screen center
  
      let card = player.hand.splice(cardIndex, 1)[0];
      //console.log(`Card played by player ${player.id}:`, card); // Add debug line here
      // Also store the player who played this card
      playedCards.push({
        card: card,
        player: player,
        position: { x: cardPosX, y: cardPosY },
      });
  
      // Debugging output:
      //console.log(`${player.id} from ${player.team} played ${card.name}`);
  
      if (playedCards.length === this.players.length) {
        this.endRound();
      } else {
        this.nextPlayer();
      }
  
      // Emit the card play event
      socket.emit('playCard', {
        roomId: roomId,
        cardIndex: cardIndex,
        card: card
      });
  
      return card;
    }
  
    toggleCurrentPlayer() {
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % players.length; // Wrap around for 4 players
    }
  
  
    respondTruco(player, response) {
  
      if (response === 1) {
        // Accepting the raise
        this.gameValue = this.potentialGameValue;
        this.trucoState = null;
  
  
        // If the last action was a raise, switch back to the initial truco caller
        if (this.lastActionWasRaise) {
          this.currentPlayerIndex = this.initialTrucoCallerIndex;
          this.lastActionWasRaise = false; // Reset the flag
          this.initialTrucoCallerIndex = null; // Reset the initial truco caller index
        } else {
          // This case is for accepting the initial truco call
          // The current player index should be the one who called truco
          this.currentPlayerIndex = this.initialTrucoCallerIndex;
        }
  
        popupMessage = (this.gameValue === 3) ? 'Truco accepted' : 'Raise accepted';
        openPopup(true);
  
        if (players[this.currentPlayerIndex].isBot) {
          players[this.currentPlayerIndex].botPlay();
        }
  
      } else if (response === 3) {
        // Raising the game value
        this.lastActionWasRaise = true; // Set the flag to indicate that the last action was a raise
  
        if (this.potentialGameValue === 3) {
          this.potentialGameValue = 6; // First raise after truco, set potential game value to 6.
        } else if (this.potentialGameValue + 3 <= 12) {
          this.potentialGameValue += 3; // Add 3 to the potential game value
        }
  
        // Check if the potentialGameValue is 12 and hide the raise truco button if it is
        if (this.potentialGameValue === 12) {
          buttonRaiseTruco.hide();
        }
  
        // Toggle the player index back and forth
        this.currentPlayerIndex = (this.currentPlayerIndex === this.initialTrucoCallerIndex)
          ? (this.initialTrucoCallerIndex + 1) % players.length
          : this.initialTrucoCallerIndex;
  
        console.log('Raise called, potentialGameValue:', this.potentialGameValue);
        popupMessage = 'Raised';
        openPopup(true);
        this.trucoState = true;
  
        // Check if the new current player is a bot
        if (players[this.currentPlayerIndex].isBot) {
          players[this.currentPlayerIndex].botPlay();
        }
  
  
      } else if (response === 2) {
        // Rejecting the raise
        popupMessage = 'Rejected';
        openPopup(true);
        this.trucoState = null;
        this.currentPlayerIndex = this.initialTrucoCallerIndex;
        let prevPotentialGameValue = this.potentialGameValue;
  
        if (this.potentialGameValue === 3) {
          this.gameValue = 1;
        } else {
          this.gameValue = this.potentialGameValue - 3;
        }
  
        console.log('Rejected, gameValue:', this.gameValue, 'prevPotentialGameValue:', prevPotentialGameValue, 'currentPotentialGameValue:', this.potentialGameValue);
        setTimeout(() => {
          if (player.team === 'team1') {
            console.log('Adding score to team2:', this.gameValue);
            this.endGame('team2');
          } else {
            console.log('Adding score to team1:', this.gameValue);
            this.endGame('team1');
          }
        }, timeEndRound);
  
      }
  
      console.log('Final potentialGameValue:', this.potentialGameValue);
      console.log('Current player index:', this.currentPlayerIndex);
    }
  
    endGame(winningTeam) {
  
  
      if (winningTeam) {
        this.games[winningTeam] += this.gameValue;
  
      }
  
      this.scores = {
        team1: 0,
        team2: 0,
      };
  
      if (this.games[winningTeam] >= 12) {
        this.games.team1 = 0;
        this.games.team2 = 0;
        this.sets[winningTeam] += 1;
      }
  
      if (winningTeam) {
        if (this.winningstruc) {
          let winnerName = this.winningstruc.player.id;
          popupMessage = `Game and Round Winner: ${winningTeam} - Player ${winnerName}`;
        } else {
          popupMessage = winningTeam + " wins";
        }
      } else {
        popupMessage = `Draw`;
      }
      openPopup(false);
      //trucoButton.show();
  
  
      setTimeout(() => {
        this.restartGame();
      }, timeEndRound);
  
  
    }
  
    restartGame() {
      createDeck();
      shuffleDeck(deck);
      distributeCards(players, deck);
      playedCards = [];
      isInTrucoPhase = false;
      this.round = 0;
      this.IsDraw = false;
      this.roundWinner = null;
      this.trucoState = false;
      this.gameValue = 1;
      trucoButton.show();
      if (this.winningstruc) {
        this.currentPlayerIndex = this.players.findIndex(
          (player) => player.id === this.winningstruc.player.id
        );
      } else {
        this.currentPlayerIndex = 0;
      }
      this.potentialGameValue = 0;
      this.initialTrucoCallerIndex = null;
    }
  
    // Add getters for games and sets
    getTeam1Games() {
      return this.games.team1;
    }
  
    getTeam2Games() {
      return this.games.team2;
    }
  
    getTeam1Sets() {
      return this.sets.team1;
    }
  
    getTeam2Sets() {
      return this.sets.team2;
    }
  
    // Function to get the current player
    getCurrentPlayer() {
      return this.players[this.currentPlayerIndex];
    }
  
    // Function to end a round
    endRound() {
      if (gameState !== gameStateEnum.Playing) {
        return null;
      }
  
  
  
      this.round += 1;
      let winningTeam;
  
      setTimeout(() => {
        this.winningstruc = this.decideRound(playedCards);
  
        if (this.winningstruc) {
          winningTeam = this.winningstruc.team;
          this.scores[winningTeam] += 1;
          this.roundResults.push(winningTeam);
  
          if (!this.roundWinner) {
            this.roundWinner = winningTeam;
          }
  
          this.currentPlayerIndex = this.players.findIndex(
            (player) => player === this.winningstruc.player
          );
  
          if (
            this.scores[winningTeam] === 2 ||
            (this.scores[winningTeam] === 1 && this.IsDraw)
          ) {
            this.endGame(winningTeam);
            return;
          }
        } else {
          this.IsDraw = true;
          this.currentPlayerIndex = this.startRoundPlayer;
        }
  
        if (this.round == 3) {
          this.endGame(null);
          return;
        }
  
        if (this.winningstruc) {
          popupMessage = "Round Winner - " + winningTeam +" player - " +
            this.winningstruc.player.id;
        } else {
          popupMessage = "Draw";
        }
  
        openPopup(false);
      }, timeEndRound);
    }
  
    // Function to decide the winner of a round
    decideRound(cardsPlayed) {
      let returnWin = {
        player: null,
        team: null,
      };
  
      let lowestCardTeam1 = null;
      let lowestPlayerTeam1 = null;
      let lowestCardTeam2 = null;
      let lowestPlayerTeam2 = null;
  
      for (let i = 0; i < cardsPlayed.length; i++) {
        let card = cardsPlayed[i].card;
        let player = cardsPlayed[i].player;
  
        if (player.team === "team1") {
          if (!lowestCardTeam1 || card.value < lowestCardTeam1.value) {
            lowestCardTeam1 = card;
            lowestPlayerTeam1 = player;
          }
        } else {
          // player.team === "team2"
          if (!lowestCardTeam2 || card.value < lowestCardTeam2.value) {
            lowestCardTeam2 = card;
            lowestPlayerTeam2 = player;
          }
        }
      }
  
      if (lowestCardTeam1.value < lowestCardTeam2.value) {
        returnWin.player = lowestPlayerTeam1;
        returnWin.team = "team1";
      } else if (lowestCardTeam1.value > lowestCardTeam2.value) {
        returnWin.player = lowestPlayerTeam2;
        returnWin.team = "team2";
      } else {
        // Tie case
        if (this.roundWinner === "team1") {
          returnWin.player = lowestPlayerTeam1;
          returnWin.team = "team1";
        } else if (this.roundWinner === "team2") {
          returnWin.player = lowestPlayerTeam2;
          returnWin.team = "team2";
        } else {
          returnWin = null;
        }
      }
      return returnWin;
    }
  
    /*// Function to handle the 'Game of Eleven' rule
    handleGameOfEleven(winningTeam) {
      // If a team has won eleven games, they can choose to play or not play the next game
      if (this.scores[winningTeam] === 11) {
        let play = confirm(
          "Your team has won eleven games. Do you want to play the next game?"
        );
        if (play) {
          // Increase the game value to three
          this.gameValue = 3;
        } else {
          // The opposing team wins one game
          this.scores[winningTeam === "team1" ? "team2" : "team1"] += 1;
          // End the game
          this.endGame(winningTeam === "team1" ? "team2" : "team1");
        }
      }
    }*/
  }
  
  function startTrucoGame() {
    console.log("Starting Truco game...");
    if (window.roomId) {
        // Multiplayer mode
        isMultiplayerMode = true;
        gameState = gameStateEnum.Playing;
        createDeck();
        shuffleDeck(deck);
        // Players will be initialized by server events
        window.game = new window.Game(window.players || []);
        window.game.startGame();
    } else {
        // Single player mode with bots
        startSinglePlayerGame();
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
  