// Track loading state
let loadingState = {
    totalImages: 0,
    loadedImages: 0,
    failedImages: 0,
    errors: []
};

function preload() {
    console.log('Starting preload...');
    
    // Initialize global cardImages object
    window.cardImages = {};
    
    try {
        // Count total images to load
        const cardNames = {
            "Queen of diamonds": "Images/queen_of_diamonds.png",
            "Jack of clubs": "Images/jack_of_clubs.png",
            "5 of clubs": "Images/5_of_clubs.png",
            "4 of clubs": "Images/4_of_clubs.png",
            "7 of hearts": "Images/7_of_hearts.png",
            "Ace of spades": "Images/ace_of_spades.png",
            "7 of diamonds": "Images/7_of_diamonds.png",
            "3 of clubs": "Images/3_of_clubs.png",
            "3 of diamonds": "Images/3_of_diamonds.png",
            "3 of spades": "Images/3_of_spades.png",
            "3 of hearts": "Images/3_of_hearts.png",
            "2 of clubs": "Images/2_of_clubs.png",
            "2 of diamonds": "Images/2_of_diamonds.png",
            "2 of spades": "Images/2_of_spades.png",
            "2 of hearts": "Images/2_of_hearts.png",
            "Ace of diamonds": "Images/ace_of_diamonds.png",
            "Ace of clubs": "Images/ace_of_clubs.png",
            "Ace of hearts": "Images/ace_of_hearts.png",
            "King of clubs": "Images/king_of_clubs.png",
            "King of diamonds": "Images/king_of_diamonds.png",
            "King of spades": "Images/king_of_spades.png",
            "King of hearts": "Images/king_of_hearts.png",
            "Queen of spades": "Images/queen_of_spades.png",
            "Queen of clubs": "Images/queen_of_clubs.png",
            "Queen of hearts": "Images/queen_of_hearts.png",
            "Jack of diamonds": "Images/jack_of_diamonds.png",
            "Jack of spades": "Images/jack_of_spades.png",
            "Jack of hearts": "Images/jack_of_hearts.png",
            "7 of spades": "Images/7_of_spades.png",
            "7 of clubs": "Images/7_of_clubs.png",
            "6 of clubs": "Images/6_of_clubs.png",
            "6 of diamonds": "Images/6_of_diamonds.png",
            "6 of spades": "Images/6_of_spades.png",
            "6 of hearts": "Images/6_of_hearts.png",
            "5 of diamonds": "Images/5_of_diamonds.png",
            "5 of spades": "Images/5_of_spades.png",
            "5 of hearts": "Images/5_of_hearts.png",
            "4 of diamonds": "Images/4_of_diamonds.png",
            "4 of spades": "Images/4_of_spades.png",
            "4 of hearts": "Images/4_of_hearts.png"
        };
        
        loadingState.totalImages = Object.keys(cardNames).length + 3; // +3 for background, back card, and popup frame
        
        // Load critical images first
        loadCriticalImages();
        
        // Load card images
        for (let cardName in cardNames) {
            loadCardImage(cardName, cardNames[cardName]);
        }
        
        // Start loading status check
        checkLoadingStatus();
        
    } catch (error) {
        console.error('Error in preload:', error);
        loadingState.errors.push('Preload initialization failed: ' + error.message);
        showLoadingError();
    }
}

function loadCriticalImages() {
    // Load background image
    backgroundImage = loadImage("Images/background.jpg", 
        () => {
            console.log("Background loaded successfully");
            loadingState.loadedImages++;
        },
        () => {
            console.error("Failed to load background");
            loadingState.failedImages++;
            loadingState.errors.push("Failed to load background image");
        }
    );
    
    // Load back card image
    backCardImage = loadImage("Images/cardBack.jpg",
        () => {
            console.log("Card back loaded successfully");
            loadingState.loadedImages++;
        },
        () => {
            console.error("Failed to load card back");
            loadingState.failedImages++;
            loadingState.errors.push("Failed to load card back image");
        }
    );
    
    // Load popup frame
    popupframeImage = loadImage("Images/popup_frame.png",
        () => {
            console.log("Popup frame loaded successfully");
            loadingState.loadedImages++;
        },
        () => {
            console.error("Failed to load popup frame");
            loadingState.failedImages++;
            loadingState.errors.push("Failed to load popup frame image");
        }
    );
}

function loadCardImage(cardName, path) {
    window.cardImages[cardName] = loadImage(path,
        () => {
            console.log(`Loaded ${cardName} successfully`);
            loadingState.loadedImages++;
        },
        () => {
            console.error(`Failed to load ${cardName}`);
            loadingState.failedImages++;
            loadingState.errors.push(`Failed to load ${cardName}`);
        }
    );
}

function checkLoadingStatus() {
    const totalProcessed = loadingState.loadedImages + loadingState.failedImages;
    const loadingProgress = (totalProcessed / loadingState.totalImages) * 100;
    
    updateLoadingUI(loadingProgress);
    
    if (totalProcessed < loadingState.totalImages) {
        // Continue checking until all images are processed
        setTimeout(checkLoadingStatus, 100);
    } else {
        // All images processed, check if we can proceed
        if (loadingState.failedImages > 0) {
            console.error(`Loading completed with ${loadingState.failedImages} failures`);
            showLoadingError();
        } else {
            console.log('All images loaded successfully');
            hideLoadingUI();
            initializeGame();
        }
    }
}

function updateLoadingUI(progress) {
    let loadingDiv = document.getElementById('loading-status');
    if (!loadingDiv) {
        loadingDiv = document.createElement('div');
        loadingDiv.id = 'loading-status';
        loadingDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            z-index: 1000;
        `;
        document.body.appendChild(loadingDiv);
    }
    
    loadingDiv.innerHTML = `
        <h3>Loading Game Assets</h3>
        <p>${Math.round(progress)}% Complete</p>
        <div style="width: 200px; height: 20px; background: #333; border-radius: 10px; overflow: hidden;">
            <div style="width: ${progress}%; height: 100%; background: #4CAF50;"></div>
        </div>
    `;
}

function hideLoadingUI() {
    const loadingDiv = document.getElementById('loading-status');
    if (loadingDiv) {
        loadingDiv.remove();
    }
}

function showLoadingError() {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: rgba(255, 0, 0, 0.9);
        color: white;
        padding: 20px;
        border-radius: 10px;
        text-align: center;
        z-index: 1000;
        max-width: 80%;
        max-height: 80vh;
        overflow-y: auto;
    `;
    
    errorDiv.innerHTML = `
        <h3>Error Loading Game Assets</h3>
        <p>Failed to load ${loadingState.failedImages} images.</p>
        <div style="text-align: left; margin-top: 10px;">
            <strong>Error Details:</strong><br>
            ${loadingState.errors.join('<br>')}
        </div>
        <button onclick="location.reload()" style="margin-top: 15px; padding: 10px 20px;">
            Retry
        </button>
    `;
    
    document.body.appendChild(errorDiv);
}

// Verify all images are loaded
function verifyImagesLoaded() {
    // Check critical images
    if (!backgroundImage || !backCardImage || !popupframeImage) {
        console.error("Critical images failed to load");
        return false;
    }
    
    // Check card images
    for (let cardName in window.cardImages) {
        if (!window.cardImages[cardName]) {
            console.error(`Card image for ${cardName} failed to load`);
            return false;
        }
    }
    
    // Verify image data is actually loaded
    const criticalImages = [backgroundImage, backCardImage, popupframeImage];
    for (let img of criticalImages) {
        if (!img.width || !img.height) {
            console.error("Critical image data not fully loaded");
            return false;
        }
    }
    
    for (let cardName in window.cardImages) {
        const img = window.cardImages[cardName];
        if (!img.width || !img.height) {
            console.error(`Card image data for ${cardName} not fully loaded`);
            return false;
        }
    }
    
    return loadingState.failedImages === 0;
}

function initializeGame() {
    if (!verifyImagesLoaded()) {
        console.error("Cannot initialize game - images not properly loaded");
        showLoadingError();
        return;
    }
    
    // Proceed with game initialization
    if (typeof setup === 'function') {
        setup();
    } else {
        console.error("Setup function not found");
        showLoadingError();
    }
}
  