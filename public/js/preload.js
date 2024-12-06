let cardImages = {};

function preload() {
    // Load background image
    backgroundImage = loadImage("Images/background.jpg");
    backCardImage = loadImage("Images/cardBack.jpg");
    
    // Load card images with consistent naming
    const cards = [
        "ace_of_spades", "ace_of_hearts", "ace_of_diamonds", "ace_of_clubs",
        "6_of_diamonds", "6_of_hearts", "6_of_spades", "7_of_clubs"
        // Add other card filenames here
    ];
    
    cards.forEach(cardName => {
        const displayName = cardName.replace(/_/g, ' ');
        cardImages[displayName] = loadImage(`Images/${cardName}.png`);
    });
}
  