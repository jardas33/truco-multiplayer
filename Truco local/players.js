class Player {
    constructor(id, team, isBot = false) {
      this.id = id;
      this.team = team;
      this.hand = [];
      this.isActive = false; // Add this line
      this.isBot = isBot; // Add this line
      this.roundResults = [];
    }
  
    botPlay() {
      if (!this.isBot) {
        throw new Error("This method can only be called on a bot.");
      }
  
      // The bot waits 4 seconds before deciding what to do
  
      console.log("Bot is making a decision.");
  
      // Check if Truco has not been called
      if (game.trucoState === false || !game.trucoState) {
        // The bot randomly decides whether to call Truco
        if (Math.random() < 0.1 && !isInTrucoPhase) { // 1% chance to call Truco
          //setTimeout(() => {
          console.log("Bot is calling Truco.");
          //closePopup();
          truco();
          //popupMessage = 'Truco';
  
          // Close any existing popup
          console.log("Bot is closing existing popup.");
  
  
          // Open the popup to show that the bot called Truco
          console.log("Bot is showing new popup.");
          //openPopup(true);
          //}, timeBots);
        } else {
          // The bot plays a random card from its hand
          console.log("Bot is playing a random card.");
          let cardIndex = Math.floor(Math.random() * this.hand.length);
          game.playCard(this, cardIndex);
        }
      } else {
        console.log("Bot is making Truco decision.");
        botDecision();
      }
  
  
    }
  
  }
  
  
  let players = [
    new Player(1, "team1", !(selfPlayer == 1)), // This player is not a bot
    new Player(2, "team2", !(selfPlayer == 2)), // This player is a bot
    new Player(3, "team1", !(selfPlayer == 3)), // This player is a bot
    new Player(4, "team2", !(selfPlayer == 4)), // This player is a bot
  ];