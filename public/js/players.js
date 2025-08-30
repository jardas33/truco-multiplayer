class Player {
    constructor(name, team, isBot = false, playerIndex = null) {
      this.name = name;
      this.team = team;
      this.isBot = isBot;
      this.hand = [];
      this.isActive = false;
      this.roundResults = [];
      // Store the numeric player index for game logic
      this.playerIndex = playerIndex;
      // Generate a unique ID based on name and team
      this.id = this.name.replace(/\s+/g, '') + Math.random().toString(36).substr(2, 9);
    }
  
    botPlay() {
      if (!this.isBot) {
        throw new Error("This method can only be called on a bot.");
      }
  
      console.log(`🤖 Bot ${this.name} is making a decision.`);
      console.log(`🤖 Current game state: currentPlayerIndex=${window.game?.currentPlayerIndex}, my index=${window.game?.players.indexOf(this)}`);
      
      // Check if it's actually this bot's turn
      if (window.game && window.game.currentPlayerIndex !== window.game.players.indexOf(this)) {
        console.log(`❌ Bot ${this.name} tried to play out of turn!`);
        console.log(`❌ Expected: ${window.game.currentPlayerIndex}, Got: ${window.game.players.indexOf(this)}`);
        return;
      }
  
      // Check if Truco has not been called
      if (window.game && (window.game.trucoState === false || !window.game.trucoState)) {
        // The bot randomly decides whether to call Truco
        if (Math.random() < 0.1 && !isInTrucoPhase) { // 1% chance to call Truco
          console.log(`🤖 Bot ${this.name} is calling Truco.`);
          try {
            truco();
          } catch (error) {
            console.error(`❌ Bot ${this.name} failed to call Truco:`, error);
            // Fallback: just play a card instead
            console.log(`🤖 Bot ${this.name} falling back to playing a card.`);
            let cardIndex = Math.floor(Math.random() * this.hand.length);
            window.game.playCard(this, cardIndex);
          }
        } else {
          // The bot plays a random card from its hand
          console.log(`🤖 Bot ${this.name} is playing a random card.`);
          let cardIndex = Math.floor(Math.random() * this.hand.length);
          window.game.playCard(this, cardIndex);
        }
      } else {
        console.log(`🤖 Bot ${this.name} is making Truco decision.`);
        if (typeof botDecision === 'function') {
          botDecision();
        }
      }
    }

    botRespondTruco() {
      if (!this.isBot) {
        throw new Error("This method can only be called on a bot.");
      }

      console.log("Bot is responding to Truco call.");
      
      // Bot randomly decides whether to accept, reject, or raise
      let decision = Math.floor(Math.random() * 3) + 1; // 1 = accept, 2 = reject, 3 = raise
      
      // Make the decision after a short delay
      setTimeout(() => {
        if (window.game) {
          window.game.respondTruco(this, decision);
        }
      }, 1000);
    }
  }
  
  // Make Player class globally accessible
  window.Player = Player;
  
  // Initialize global players array (this will be overridden by the game)
  let players = [
    new Player("Player 1", "team1", !(selfPlayer == 1)), // This player is not a bot
    new Player("Player 2", "team2", !(selfPlayer == 2)), // This player is a bot
    new Player("Player 3", "team1", !(selfPlayer == 3)), // This player is a bot
    new Player("Player 4", "team2", !(selfPlayer == 4)), // This player is a bot
  ];
  
  // Make players array globally accessible
  window.players = players;