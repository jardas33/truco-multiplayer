function preload() {
    console.log('🖼️ Starting image preload...');
    
    // Load background image
    try {
        backgroundImage = loadImage("Images/background.jpg", 
            () => console.log('✅ Background image loaded'),
            () => console.error('❌ Failed to load background image')
        );
    } catch (error) {
        console.error('❌ Error loading background image:', error);
    }
    
    // Load card back image
    try {
        backCardImage = loadImage("Images/cardBack.jpg",
            () => console.log('✅ Card back image loaded'),
            () => console.error('❌ Failed to load card back image')
        );
    } catch (error) {
        console.error('❌ Error loading card back image:', error);
    }
    
    // Load popup frame image
    try {
        popupframeImage = loadImage("Images/popup_frame.png",
            () => console.log('✅ Popup frame image loaded'),
            () => console.error('❌ Failed to load popup frame image')
        );
    } catch (error) {
        console.error('❌ Error loading popup frame image:', error);
    }
    
    // Load card images with error handling
    let cardNames = {
        "Queen of diamonds": "Images/queen_of_diamonds.png",
        "Queen of clubs": "Images/queen_of_clubs.png",
        "Queen of hearts": "Images/queen_of_hearts.png",
        "Queen of spades": "Images/queen_of_spades.png",
        "Jack of clubs": "Images/jack_of_clubs.png",
        "Jack of diamonds": "Images/jack_of_diamonds.png",
        "Jack of spades": "Images/jack_of_spades.png",
        "Jack of hearts": "Images/jack_of_hearts.png",
        "King of clubs": "Images/king_of_clubs.png",
        "King of diamonds": "Images/king_of_diamonds.png",
        "King of spades": "Images/king_of_spades.png",
        "King of hearts": "Images/king_of_hearts.png",
        "Ace of spades": "Images/ace_of_spades.png",
        "Ace of diamonds": "Images/ace_of_diamonds.png",
        "Ace of hearts": "Images/ace_of_hearts.png",
        "Ace of clubs": "Images/ace_of_clubs.png",
        "7 of hearts": "Images/7_of_hearts.png",
        "7 of diamonds": "Images/7_of_diamonds.png",
        "7 of spades": "Images/7_of_spades.png",
        "7 of clubs": "Images/7_of_clubs.png",
        "6 of diamonds": "Images/6_of_diamonds.png",
        "6 of spades": "Images/6_of_spades.png",
        "6 of hearts": "Images/6_of_hearts.png",
        "6 of clubs": "Images/6_of_clubs.png",
        "5 of diamonds": "Images/5_of_diamonds.png",
        "5 of spades": "Images/5_of_spades.png",
        "5 of hearts": "Images/5_of_hearts.png",
        "5 of clubs": "Images/5_of_clubs.png",
        "4 of diamonds": "Images/4_of_diamonds.png",
        "4 of spades": "Images/4_of_spades.png",
        "4 of hearts": "Images/4_of_hearts.png",
        "4 of clubs": "Images/4_of_clubs.png",
        "3 of diamonds": "Images/3_of_diamonds.png",
        "3 of spades": "Images/3_of_spades.png",
        "3 of hearts": "Images/3_of_hearts.png",
        "3 of clubs": "Images/3_of_clubs.png",
        "2 of diamonds": "Images/2_of_diamonds.png",
        "2 of spades": "Images/2_of_spades.png",
        "2 of hearts": "Images/2_of_hearts.png",
        "2 of clubs": "Images/2_of_clubs.png"
    };
    
    let loadedImages = 0;
    let totalImages = Object.keys(cardNames).length;
    
    for (let name in cardNames) {
        try {
            cardImages[name] = loadImage(cardNames[name],
                () => {
                    loadedImages++;
                    console.log(`✅ Card image loaded: ${name} (${loadedImages}/${totalImages})`);
                    if (loadedImages === totalImages) {
                        console.log('🎉 All card images loaded successfully!');
                    }
                },
                () => {
                    console.error(`❌ Failed to load card image: ${name}`);
                    // Create a fallback colored rectangle
                    cardImages[name] = null;
                }
            );
        } catch (error) {
            console.error(`❌ Error loading card image ${name}:`, error);
            cardImages[name] = null;
        }
    }
    
    console.log('🖼️ Image preload initiated for', totalImages, 'card images');
}
  