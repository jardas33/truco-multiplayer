let cardImages = {};
let backgroundImage;
let backCardImage;

function preload() {
    console.log("Starting preload...");
    
    // Load background image
    backgroundImage = loadImage("Images/background.jpg", 
        () => console.log("Background loaded successfully"),
        () => console.log("Failed to load background")
    );
    
    backCardImage = loadImage("Images/cardBack.jpg",
        () => console.log("Card back loaded successfully"),
        () => console.log("Failed to load card back")
    );
    
    // Load all available card images based on the files we have
    const cards = [
        "ace_of_spades", "ace_of_hearts", "ace_of_diamonds", "ace_of_clubs",
        "6_of_diamonds", "6_of_hearts", "6_of_spades", 
        "7_of_clubs", "7_of_hearts", "7_of_diamonds", "7_of_spades"
    ];
    
    cards.forEach(cardName => {
        console.log(`Loading ${cardName}...`);
        const displayName = cardName.replace(/_/g, ' ');
        cardImages[displayName] = loadImage(`Images/${cardName}.png`,
            () => console.log(`Successfully loaded ${cardName}`),
            () => console.error(`Failed to load ${cardName}`)
        );
    });
}
  