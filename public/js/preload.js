// Clean version of preload.js without emoji characters - loads all 52 standard deck cards
function loadGameImages() {
    try {
        console.log('🚢 Starting image preload...');
        
        // Get the base URL for production environments
        const baseUrl = window.location.origin;
        console.log('Base URL:', baseUrl);
    
    // Initialize cardImages object if it doesn't exist
    if (typeof cardImages === 'undefined') {
        window.cardImages = {};
        console.log('Initialized cardImages object');
    }
    
    // Load background image
    try {
        backgroundImage = loadImage(`${baseUrl}/Images/background.jpg`, 
            () => console.log('SUCCESS: Background image loaded'),
            () => console.error('ERROR: Failed to load background image')
        );
    } catch (error) {
        console.error('ERROR: Error loading background image:', error);
    }
    
    // Load card back image
    try {
        window.cardBackImage = loadImage(`${baseUrl}/Images/cardBack.jpg`,
            () => console.log('SUCCESS: Card back image loaded'),
            () => console.error('ERROR: Failed to load card back image')
        );
    } catch (error) {
        console.error('ERROR: Error loading card back image:', error);
    }
    
    // Load popup frame image
    try {
        popupframeImage = loadImage(`${baseUrl}/Images/popup_frame.png`,
            () => console.log('SUCCESS: Popup frame image loaded'),
            () => console.error('ERROR: Failed to load popup frame image')
        );
    } catch (error) {
        console.error('ERROR: Error loading popup frame image:', error);
    }
    
    // Load pond image for Go Fish game
    try {
        window.pondImage = loadImage(`${baseUrl}/Images/pond.png`,
            () => console.log('SUCCESS: Pond image loaded'),
            () => console.error('ERROR: Failed to load pond image')
        );
    } catch (error) {
        console.error('ERROR: Error loading pond image:', error);
    }
    
    // Load ship images for Battleship game
    console.log('🚢 Starting to load ship images...');
    try {
        window.shipImages = {};
        console.log('🚢 Created shipImages object');
        
        // Load ship images using regular Image objects
        const shipTypes = ['carrier', 'battleship', 'cruiser', 'submarine', 'destroyer'];
        let loadedCount = 0;
        
        shipTypes.forEach(shipType => {
            const img = new Image();
            const imageUrl = `${baseUrl}/Images/${shipType}.png`;
            console.log(`🚢 Attempting to load: ${imageUrl}`);
            
            img.onload = () => {
                console.log(`SUCCESS: ${shipType} image loaded`);
                loadedCount++;
                if (loadedCount === shipTypes.length) {
                    console.log('🚢 All ship images loaded!');
                    window.checkShipImagesLoaded && window.checkShipImagesLoaded();
                }
            };
            img.onerror = (error) => {
                console.error(`ERROR: Failed to load ${shipType} image from ${imageUrl}:`, error);
                loadedCount++;
                if (loadedCount === shipTypes.length) {
                    console.log('🚢 All ship images processed!');
                    window.checkShipImagesLoaded && window.checkShipImagesLoaded();
                }
            };
            img.src = imageUrl;
            window.shipImages[shipType] = img;
        });
        
    } catch (error) {
        console.error('ERROR: Error loading ship images:', error);
    }
    
    // Load all card images
    loadAllCardImages(baseUrl);
    
    } catch (error) {
        console.error('ERROR: Error in preload function:', error);
    }
}

function loadAllCardImages(baseUrl) {
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    // Load all standard deck cards: 2-10, J, Q, K, A (52 cards total)
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
    
    let loadedImages = 0;
    const totalImages = suits.length * ranks.length; // 52 cards
    
    console.log('Image preload initiated for', totalImages, 'card images');
    
    // Load each card image
    suits.forEach(suit => {
        ranks.forEach(rank => {
            const name = `${rank}_of_${suit}`;
            const imagePath = `${baseUrl}/Images/${name}.png`;
            
            try {
                const img = loadImage(imagePath,
                    () => {
                        loadedImages++;
                        console.log(`SUCCESS: Card image loaded: ${name} (${loadedImages}/${totalImages})`);
                        if (loadedImages === totalImages) {
                            console.log('All card images loaded successfully!');
                            // Ensure cardImages is globally accessible
                            window.cardImages = cardImages;
                        }
                    },
                    () => {
                        console.error(`ERROR: Failed to load card image: ${name}`);
                        // Create a fallback colored rectangle
                        cardImages[name] = null;
                    }
                );
                cardImages[name] = img;
            } catch (error) {
                console.error(`ERROR: Error loading card image ${name}:`, error);
                cardImages[name] = null;
            }
        });
    });
    
    // Final status check
    setTimeout(() => {
        let finalLoaded = 0;
        for (const key in cardImages) {
            if (cardImages[key] !== null) {
                finalLoaded++;
            }
        }
        console.log(`Final image loading status: ${finalLoaded}/${totalImages} images loaded`);
        
        if (finalLoaded === 0) {
            console.error('CRITICAL: No card images loaded! Check image paths and network.');
        } else if (finalLoaded < totalImages) {
            console.warn(`Only ${finalLoaded}/${totalImages} card images loaded. Some cards will use fallback rendering.`);
        }
    }, 2000);
}

function getCardImage(cardName) {
    if (!cardName) return null;
    
    // Try exact match first
    if (cardImages[cardName]) {
        return cardImages[cardName];
    }
    
    // Try normalized name (lowercase, underscores)
    const normalizedName = cardName.toLowerCase().replace(/\s+/g, '_');
    if (cardImages[normalizedName]) {
        return cardImages[normalizedName];
    }
    
    // Try common variations
    const variations = [
        cardName.toLowerCase(),
        cardName.toLowerCase().replace(/\s+/g, ''),
        cardName.toLowerCase().replace(/\s+/g, '_'),
        cardName.toLowerCase().replace(/\s+/g, '-')
    ];
    
    for (const variation of variations) {
        if (cardImages[variation]) {
            return cardImages[variation];
        }
    }
    
    console.warn(`No image found for card: ${cardName} (tried: ${normalizedName})`);
    return null;
}