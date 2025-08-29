function preload() {
    console.log('🖼️ Starting image preload...');
    
    // Get the base URL for production environments
    const baseUrl = window.location.origin;
    console.log('🌐 Base URL:', baseUrl);
    
    // Load background image
    try {
        backgroundImage = loadImage(`${baseUrl}/Images/background.jpg`, 
            () => console.log('✅ Background image loaded'),
            () => console.error('❌ Failed to load background image')
        );
    } catch (error) {
        console.error('❌ Error loading background image:', error);
    }
    
    // Load card back image
    try {
        backCardImage = loadImage(`${baseUrl}/Images/cardBack.jpg`,
            () => console.log('✅ Card back image loaded'),
            () => console.error('❌ Failed to load card back image')
        );
    } catch (error) {
        console.error('❌ Error loading card back image:', error);
    }
    
    // Load popup frame image
    try {
        popupframeImage = loadImage(`${baseUrl}/Images/popup_frame.png`,
            () => console.log('✅ Popup frame image loaded'),
            () => console.error('❌ Failed to load popup frame image')
        );
    } catch (error) {
        console.error('❌ Error loading popup frame image:', error);
    }
    
    // Load card images with error handling
    let cardNames = {
        "Queen of diamonds": `${baseUrl}/Images/queen_of_diamonds.png`,
        "Queen of clubs": `${baseUrl}/Images/queen_of_clubs.png`,
        "Queen of hearts": `${baseUrl}/Images/queen_of_hearts.png`,
        "Queen of spades": `${baseUrl}/Images/queen_of_spades.png`,
        "Jack of clubs": `${baseUrl}/Images/jack_of_clubs.png`,
        "Jack of diamonds": `${baseUrl}/Images/jack_of_diamonds.png`,
        "Jack of spades": `${baseUrl}/Images/jack_of_spades.png`,
        "Jack of hearts": `${baseUrl}/Images/jack_of_hearts.png`,
        "King of clubs": `${baseUrl}/Images/king_of_clubs.png`,
        "King of diamonds": `${baseUrl}/Images/king_of_diamonds.png`,
        "King of spades": `${baseUrl}/Images/king_of_spades.png`,
        "King of hearts": `${baseUrl}/Images/king_of_hearts.png`,
        "Ace of spades": `${baseUrl}/Images/ace_of_spades.png`,
        "Ace of diamonds": `${baseUrl}/Images/ace_of_diamonds.png`,
        "Ace of hearts": `${baseUrl}/Images/ace_of_hearts.png`,
        "Ace of clubs": `${baseUrl}/Images/ace_of_clubs.png`,
        "7 of hearts": `${baseUrl}/Images/7_of_hearts.png`,
        "7 of diamonds": `${baseUrl}/Images/7_of_diamonds.png`,
        "7 of spades": `${baseUrl}/Images/7_of_spades.png`,
        "7 of clubs": `${baseUrl}/Images/7_of_clubs.png`,
        "6 of diamonds": `${baseUrl}/Images/6_of_diamonds.png`,
        "6 of spades": `${baseUrl}/Images/6_of_spades.png`,
        "6 of hearts": `${baseUrl}/Images/6_of_hearts.png`,
        "6 of clubs": `${baseUrl}/Images/6_of_clubs.png`,
        "5 of diamonds": `${baseUrl}/Images/5_of_diamonds.png`,
        "5 of spades": `${baseUrl}/Images/5_of_spades.png`,
        "5 of hearts": `${baseUrl}/Images/5_of_hearts.png`,
        "5 of clubs": `${baseUrl}/Images/5_of_clubs.png`,
        "4 of diamonds": `${baseUrl}/Images/4_of_diamonds.png`,
        "4 of spades": `${baseUrl}/Images/4_of_spades.png`,
        "4 of hearts": `${baseUrl}/Images/4_of_hearts.png`,
        "4 of clubs": `${baseUrl}/Images/4_of_clubs.png`,
        "3 of diamonds": `${baseUrl}/Images/3_of_diamonds.png`,
        "3 of spades": `${baseUrl}/Images/3_of_spades.png`,
        "3 of hearts": `${baseUrl}/Images/3_of_hearts.png`,
        "3 of clubs": `${baseUrl}/Images/3_of_clubs.png`,
        "2 of diamonds": `${baseUrl}/Images/2_of_diamonds.png`,
        "2 of spades": `${baseUrl}/Images/2_of_spades.png`,
        "2 of hearts": `${baseUrl}/Images/2_of_hearts.png`,
        "2 of clubs": `${baseUrl}/Images/2_of_clubs.png`
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
  