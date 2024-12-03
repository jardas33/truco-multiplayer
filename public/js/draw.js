function draw() {
    // Clear the canvas at the start of each frame
    clear();
    
    // Draw background for all states
    push();
    imageMode(CORNER);
    image(backgroundImage, 0, 0, width, height);
    pop();
    
    if (gameState === gameStateEnum.Menu) {
        menuDiv.show();
        gameDiv.hide();
        instructionsDiv.hide();
        valuesDiv.hide();
        if (instructionsCloseButton) {
            instructionsCloseButton.remove();
        }
        // Remove any existing instructions box
        const existingBox = document.querySelector('.instructions-box');
        if (existingBox) {
            existingBox.remove();
        }
    }
    else if (gameState === gameStateEnum.Instructions) {
        menuDiv.hide();
        gameDiv.hide();
        valuesDiv.hide();
        
        // Remove any existing instructions box first
        const existingBox = document.querySelector('.instructions-box');
        if (existingBox) {
            existingBox.remove();
        }
        
        // Create new instructions box
        const instructionsBox = createElement('div');
        instructionsBox.class('instructions-box');
        
        const title = createElement('h1', 'Instructions of the game');
        title.class('instructions-title');
        title.parent(instructionsBox);
        
        const instructions = [
            "Truco is a fun game designed to be played by an even number of players, played in teams of 2v2 or 3v3. Each Truco match is composed of multiple sets, where each set equals twelve games, and each game consists of three rounds.",
            "In each round, every player plays one card. The team that wins two out of three rounds wins the game. The team that wins twelve games first wins the set.",
            "The order of turns is clockwise, with the first player in each round being the one who played the highest card in the previous round, or in case of a tie, the one who played first in the previous round.",
            "The game features the 'truco' mechanic. During their turn, a player can choose to call 'truco', which increases the value of the current game if accepted. The next player can then choose to accept, reject, or raise the value further. If truco is rejected, the game ends immediately, and the team that called 'truco' wins the game at its current value. If accepted, the game goes on but it is now worth 3 games instead of 1. The next player can also raise to 6, then the decision goes back to the player that initially called truco and he has the same options: accept, reject and raise. A game can only be risen to 12 games. It is not possible to raise after that.",
            "Once a team has won eleven games within a set, the 'Game of Eleven' rule comes into effect. The team can view their cards and their partner's cards before deciding whether to play the next game. If they decide to play, the game's value is increased to three. If they reject, the opposing team wins one game instantly.",
            "Truco is played with a 40 card deck, with a specific order of card values that you can see in the card values instructions."
        ];
        
        instructions.forEach(text => {
            const p = createElement('p', text);
            p.class('instructions-text');
            p.parent(instructionsBox);
        });
        
        // Create and position close button
        if (instructionsCloseButton) {
            instructionsCloseButton.remove();
        }
        instructionsCloseButton = createButton('Close');
        instructionsCloseButton.class('close-button');
        instructionsCloseButton.mousePressed(() => {
            gameState = gameStateEnum.Menu;
            instructionsBox.remove();
            instructionsCloseButton.remove();
            menuDiv.show(); // Show menu when closing instructions
            loop(); // Ensure draw loop continues
        });
        
        instructionsCloseButton.parent(instructionsBox);
        instructionsBox.parent(instructionsDiv);
        instructionsDiv.show();
    }
    else if (gameState === gameStateEnum.CardValues) {
        menuDiv.hide();
        gameDiv.hide();
        instructionsDiv.hide();
        
        // Remove any existing values box first
        const existingBox = document.querySelector('.values-box');
        if (existingBox) {
            existingBox.remove();
        }
        
        // Create new values box
        const valuesBox = createElement('div');
        valuesBox.class('values-box');
        
        const title = createElement('h1', 'Card Values');
        title.class('values-title');
        title.parent(valuesBox);
        
        const valuesContainer = createElement('div');
        valuesContainer.class('values-text');
        valuesContainer.parent(valuesBox);
        
        // Sort cards by their value (ascending)
        const sortedCards = Object.entries(cardValues)
            .sort((a, b) => a[1] - b[1])
            .map(([card, value]) => ({ card, value }));
        
        // Create card value items
        sortedCards.forEach(({ card, value }) => {
            const valueItem = createElement('div');
            valueItem.class('value-item');
            
            const rankSpan = createElement('span', `Rank ${value}:`);
            rankSpan.class('value-rank');
            rankSpan.parent(valueItem);
            
            const cardName = createElement('span', ` ${card}`);
            cardName.parent(valueItem);
            
            valueItem.parent(valuesContainer);
        });
        
        // Create and position close button
        if (instructionsCloseButton) {
            instructionsCloseButton.remove();
        }
        instructionsCloseButton = createButton('Close');
        instructionsCloseButton.class('close-button');
        instructionsCloseButton.mousePressed(() => {
            gameState = gameStateEnum.Menu;
            valuesBox.remove();
            instructionsCloseButton.remove();
            menuDiv.show();
            loop();
        });
        
        instructionsCloseButton.parent(valuesBox);
        valuesBox.parent(valuesDiv);
        valuesDiv.show();
    }
    else if (gameState === gameStateEnum.Playing) {
        menuDiv.hide();
        gameDiv.show();
        instructionsDiv.hide();
        valuesDiv.hide();
        backToMainMenuButton.show();
        
        if (window.game) {
            drawGameState();
        }
    }
}