function drawPlayer(player, x, y) {
    textSize(24);
    fill(255);
    text(player.name, x, y);
    text("Score: " + player.score, x, y + 30);
  }
  
  function draw() {
  
    if (gameState === gameStateEnum.Menu) {
  
      background(backgroundImage);
  
      textSize(24); // Set the text size
      fill(255); // Set the text color
      textAlign(CENTER, CENTER); // Align the text to the center
  
      menuDiv.show();
      gameDiv.hide();
      instructionsDiv.hide();
      valuesDiv.hide();
  
      buttonAcceptTruco.hide();
      buttonRejectTruco.hide();
      buttonRaiseTruco.hide();
  
      if (instructionsPopup) {
        instructionsPopup.show();
      }
  
      if (cardValuesPopup) {
        cardValuesPopup.show();
      }
    }
    if (gameState === gameStateEnum.Instructions) {
  
      background(instructionsImage);
  
      textSize(24); // Set the text size
      fill(255); // Set the text color
      textAlign(CENTER, CENTER); // Align the text to the center
  
      menuDiv.hide();
      gameDiv.hide();
      instructionsDiv.show();
      valuesDiv.hide();
    }
    if (gameState === gameStateEnum.CardValues) {
  
      background(instructionsImage);
  
      textSize(24); // Set the text size
      fill(255); // Set the text color
      textAlign(CENTER, CENTER); // Align the text to the center
  
      menuDiv.hide();
      gameDiv.hide();
      instructionsDiv.hide();
      valuesDiv.show();
  
    } else if (gameState === gameStateEnum.Playing) {
  
      background(backgroundImage);
  
      textSize(24); // Set the text size
      fill(255); // Set the text color
      textAlign(CENTER, CENTER); // Align the text to the center
  
  
      menuDiv.hide();
      gameDiv.show();
      instructionsDiv.hide();
      valuesDiv.hide();
      backToMainMenuButton.show();
  
  
      /*function that control trucoButton*/
      showTrucoButton();
  
  
      // Draw played cards and keep them at the center
      for (let playedCard of playedCards) {
        image(
          playedCard.card.image,
          playedCard.position.x,
          playedCard.position.y
        );
      }
  
      for (let i = 0; i < players.length; i++) {
        let pos = playerPositions[i];
        let player = players[i];
  
        // Draw player name and team
        text(pos.label, pos.x, pos.y + pos.labelOffset);
  
        // Draw player hand
        let xBase = pos.x - ((cardWidth + 10) * player.hand.length - 10) / 2;
        for (let j = 0; j < player.hand.length; j++) {
          let card = player.hand[j];
          let x = xBase + j * (cardWidth + 10);
          if (player.id != selfPlayer && showAllCards == false) {
            image(backCardImage, x, pos.y, cardWidth, cardHeight);
          } else {
            image(card.image, x, pos.y, cardWidth, cardHeight);
          }
        }
      }
  
      if (game.getCurrentPlayer().id == selfPlayer && game.trucoState && !players[game.currentPlayerIndex].isBot) {
        buttonAcceptTruco.show();
        buttonRejectTruco.show();
  
        // Hide the raise button if potentialGameValue plus either team's games is 12 or more
        if (game.potentialGameValue === 12 ||
          (game.games.team1 + game.potentialGameValue) >= 12 ||
          (game.games.team2 + game.potentialGameValue) >= 12) {
          buttonRaiseTruco.hide();
        } else {
          buttonRaiseTruco.show();
        }
  
      } else {
        buttonAcceptTruco.hide();
        buttonRejectTruco.hide();
        buttonRaiseTruco.hide();
      }
  
  
  
  
      // Draw the round scores
      text("Rounds", width - 100, 50);
      text("Team 1: " + game.getTeam1Rounds(), width - 100, 80);
      text("Team 2: " + game.getTeam2Rounds(), width - 100, 110);
  
      // Draw the game scores
      text("Games", width - 100, 200); // increased the vertical space
      text("Team 1: " + game.getTeam1Games(), width - 100, 230); // increased the vertical space
      text("Team 2: " + game.getTeam2Games(), width - 100, 260); // increased the vertical space
  
      // Draw the set scores
      text("Sets", 100, height - 100);
      text("Team 1: " + game.getTeam1Sets(), 100, height - 70);
      text("Team 2: " + game.getTeam2Sets(), 100, height - 40);
    }
  }
  
  function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
  }