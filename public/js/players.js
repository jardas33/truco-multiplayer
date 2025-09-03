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
      console.log(`🔍 CRITICAL DEBUG: Bot ${this.name} botPlay() called at: ${new Date().toISOString()}`);
      console.log(`🔍 CRITICAL DEBUG: Bot ${this.name} - window.game.currentPlayerIndex: ${window.game?.currentPlayerIndex}`);
      console.log(`🔍 CRITICAL DEBUG: Bot ${this.name} - my index: ${window.game?.players.indexOf(this)}`);
      console.log(`🔍 CRITICAL DEBUG: Bot ${this.name} - is it my turn? ${window.game?.currentPlayerIndex === window.game?.players.indexOf(this)}`);
      
      // Check if it's actually this bot's turn
      if (window.game && window.game.currentPlayerIndex !== window.game.players.indexOf(this)) {
        console.log(`❌ Bot ${this.name} tried to play out of turn!`);
        console.log(`🔍 CRITICAL DEBUG: Bot ${this.name} - OUT OF TURN! currentPlayerIndex=${window.game.currentPlayerIndex}, my index=${window.game.players.indexOf(this)}`);
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
        // ✅ OLD botDecision call removed - now handled by botRespondTruco()
      }
    }

    botRespondTruco() {
      if (!this.isBot) {
        throw new Error("This method can only be called on a bot.");
      }

      console.log(`🤖 Bot ${this.name} is responding to Truco call.`);
      
      if (!window.game || !window.game.trucoState) {
        console.error('❌ No game instance or Truco state found for bot Truco response');
        return;
      }

      // Bot makes decision based on current potential value
      let decision;
      const potentialValue = window.game.trucoState.potentialValue || 3;
      
      if (potentialValue >= 12) {
        // Can't raise anymore, must accept or reject
        decision = Math.random() < 0.7 ? 1 : 2; // 70% accept, 30% reject
      } else {
        // Can still raise
        const random = Math.random();
        if (random < 0.4) {
          decision = 1; // 40% accept
        } else if (random < 0.8) {
          decision = 2; // 40% reject
        } else {
          decision = 3; // 20% raise
        }
      }
      
      console.log(`🤖 Bot ${this.name} decided: ${decision === 1 ? 'Accept' : decision === 2 ? 'Reject' : 'Raise'}`);
      
      // Send response to server
      setTimeout(() => {
        if (typeof socket !== 'undefined' && socket) {
          // ✅ CRITICAL FIX: Include bot player index for server identification
          const botPlayerIndex = window.game.players.indexOf(this);
          socket.emit('respondTruco', { 
            response: decision,
            botPlayerIndex: botPlayerIndex  // Include bot's player index for server validation
          });
          console.log(`🤖 Bot ${this.name} sent Truco response: ${decision} (bot index: ${botPlayerIndex})`);
        } else {
          console.error('❌ Socket not available for bot Truco response');
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