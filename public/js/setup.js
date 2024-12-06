let gameState;
let menuDiv, gameDiv, instructionsDiv, valuesDiv;
let startGameButton;
let playerPositions;

function setup() {
    console.log("Setup starting...");
    let canvas = createCanvas(windowWidth, windowHeight);
    canvas.parent('Menu');
    
    // Initialize game state
    gameState = gameStateEnum.Menu;
    console.log("Game state initialized to:", gameState);
    
    // Get all the div containers
    menuDiv = select("#Menu");
    gameDiv = select("#Game");
    instructionsDiv = select("#Instructions");
    valuesDiv = select("#Values");
    
    if (!menuDiv || !gameDiv || !instructionsDiv || !valuesDiv) {
        console.error("Failed to select one or more divs");
        return;
    }
    
    // Initially show only menu
    menuDiv.show();
    gameDiv.hide();
    instructionsDiv.hide();
    valuesDiv.hide();
    
    // Create Start Game button
    startGameButton = createButton("Start Game");
    startGameButton.mousePressed(() => {
        console.log("Start Game button pressed");
        startGame();
    });
    startGameButton.parent('Menu');
    startGameButton.position(width/2 - 50, height/2);
    
    // Setup player positions
    playerPositions = [
        {
            x: width / 6,
            y: height / 2,
            label: "Player 1 - Team 1",
            labelOffset: -50,
        },
        { 
            x: width / 2, 
            y: 100, 
            label: "Player 2 - Team 2", 
            labelOffset: -50 
        },
        {
            x: (5 * width) / 6,
            y: height / 2,
            label: "Player 3 - Team 1",
            labelOffset: -50,
        },
        {
            x: width / 2,
            y: height - 100,
            label: "Player 4 - Team 2",
            labelOffset: 50,
        },
    ];
    
    console.log("Setup completed");
}

function startGame() {
    console.log("Starting game...");
    if (!gameStateEnum) {
        console.error("gameStateEnum not defined!");
        return;
    }
    gameState = gameStateEnum.Playing;
    console.log("Game state changed to:", gameState);
    initializeGame();
    loop();
}

function initializeGame() {
    console.log("Initializing game...");
    window.game = {
        players: [
            {
                id: 1,
                cards: [],
                isBot: false,
                team: 1
            },
            {
                id: 2,
                cards: [],
                isBot: true,
                team: 2
            },
            {
                id: 3,
                cards: [],
                isBot: true,
                team: 1
            },
            {
                id: 4,
                cards: [],
                isBot: true,
                team: 2
            }
        ],
        playedCards: [],
        currentPlayerIndex: 0,
        startRoundPlayer: 0,
        round: 1,
        scores: [0, 0],  // Team 1 and Team 2 scores
        getCurrentPlayer: function() {
            return this.players[this.currentPlayerIndex];
        }
    };

    console.log("Creating deck...");
    const deck = createDeck();
    console.log("Dealing cards...");
    dealCards(deck);
    console.log("Game initialized:", window.game);
}

function createDeck() {
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    const values = ['ace', '2', '3', '4', '5', '6', '7', 'queen', 'jack', 'king'];
    let deck = [];

    for (let suit of suits) {
        for (let value of values) {
            const name = `${value} of ${suit}`;
            deck.push({
                suit: suit,
                value: value,
                name: name
            });
        }
    }

    // Shuffle the deck
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    return deck;
}

function dealCards(deck) {
    // Deal 3 cards to each player
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < window.game.players.length; j++) {
            window.game.players[j].cards.push(deck.pop());
        }
    }
}
  