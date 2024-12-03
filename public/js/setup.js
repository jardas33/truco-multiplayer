// Create p5 instance in the game canvas div
window.p5Instance = new p5(function(p) {
    p.preload = function() {
        // Load background image
        window.backgroundImage = p.loadImage("Images/background.jpg");
        window.backCardImage = p.loadImage("Images/cardBack.jpg");
        window.popupframeImage = p.loadImage("Images/popup_frame.png");
        window.instructionsImage = p.loadImage("Images/instructions.png");
        
        // Load card images
        let cardNames = {
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
            "4 of hearts": "Images/4_of_hearts.png",
        };
        
        // Initialize cardImages if not already initialized
        window.cardImages = window.cardImages || {};
        
        for (let name in cardNames) {
            window.cardImages[name] = p.loadImage(cardNames[name]);
        }
    };

    p.setup = function() {
        let canvas = p.createCanvas(p.windowWidth, p.windowHeight);
        canvas.parent('Game');
        
        // Store p5 instance globally for other files to use
        window.p = p;

        // Initialize game state if not already set
        if (typeof gameState === 'undefined') {
            gameState = gameStateEnum.Menu;
        }

        // Create menu elements
        menuDiv = p.select("#Menu");
        gameDiv = p.select("#Game");
        instructionsDiv = p.select("#Instructions");
        valuesDiv = p.select("#Values");

        // Create menu buttons
        startButton = p.createButton("Start Truco Game");
        startButton.style("position", "fixed");
        startButton.style("top", "50%");
        startButton.style("left", "50%");
        startButton.style("transform", "translate(-50%, -50%)");
        startButton.style("width", "200px");
        startButton.style("height", "60px");
        startButton.style("font-weight", "bold");
        startButton.mousePressed(startTrucoGame);
        startButton.parent(menuDiv);

        // Create other UI elements
        createUIElements(p);
    };

    p.draw = function() {
        if (gameState === gameStateEnum.Menu) {
            p.background(backgroundImage);
        } else {
            drawGame(p);
        }
    };
}, 'Game');

function drawMenu(p) {
    // Menu state drawing code
}

function drawInstructions(p) {
    // Draw instructions background
    p.background(0, 100, 0);
    
    // Draw instructions image if available
    if (instructionsImage) {
        const imgWidth = Math.min(p.width * 0.8, 800);
        const imgHeight = imgWidth * (instructionsImage.height / instructionsImage.width);
        p.image(instructionsImage, p.width/2 - imgWidth/2, 150, imgWidth, imgHeight);
    }
}

function drawCardValues(p) {
    // Draw card values background
    p.background(0, 100, 0);
    p.fill(255);
    p.textSize(32);
    p.textAlign(p.CENTER, p.CENTER);
    p.text("Card Values", p.width/2, 50);
    
    // Draw card values
    p.textSize(16);
    p.textAlign(p.LEFT, p.TOP);
    let x = 50;
    let y = 100;
    let lineHeight = 25;
    
    // Sort cards by value
    const sortedCards = Object.entries(cardValues)
        .sort((a, b) => a[1] - b[1]);
    
    for (const [card, value] of sortedCards) {
        p.text(`${card}: ${value}`, x, y);
        y += lineHeight;
        
        // Create new column if reaching bottom of screen
        if (y > p.height - 50) {
            y = 100;
            x += p.width/3;
        }
    }
}
  