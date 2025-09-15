// Setup Variables
let timeBots = 2000; //time bots take to play
let timeEndRound = 3000; //time bots take to play
let timePopUpAutoClose = 4000; // ✅ UI FIX: 4 seconds for popup auto-close (3-5 second range)
let selfPlayer = 1;
let showAllCards = true;

//-----------------------------------------------------------------------------
let backgroundImage;
let backCardImage;
let popupframeImage;
let game;

// Truco variables
let trucoButton;
let buttonAcceptTruco; // Declare the variable at the top of your script
let buttonRejectTruco;
let buttonRaiseTruco;
let isInTrucoPhase = false;


let deck = [];
let playerPositions = [];
let cardWidth = 80; // Replace with the actual width of your cards
let cardHeight = 123; // Replace with the actual height of your cards
// ✅ REMOVED: Local playedCards variable that was shadowing window.playedCards
let teamAlfaRounds = 0;
let teamBetaRounds = 0;
let teamAlfaGames = 0;
let teamBetaGames = 0;
let teamAlfaSets = 0;
let teamBetaSets = 0;
let closeButton;
let popup;
let popupOnlyClose;
let popupMessage;
let popupTimeoutId;
let messageParagrph;
let popupProgressBar;
let popupProgressFill;
let playerWinner = "1";
let startButton;
let instructionsButton;
let cardValuesButton;
let instructionsPopup;
let cardValuesPopup;
let instructionsCloseButton;
let cardValuesCloseButton;
let backToMainMenuButton;
let instructionsPopupOpen = false;
let cardValuesPopupOpen = false;
let menuDiv;
let gameDiv;
let instructionsDiv;
let valuesDiv;
let previousGameState = null; // Add this line to store the previous game state
let gameStateEnum = {
  Playing: "playing",
  Menu: "menu",
  Instructions: "instructions",
  CardValues: "cardValues",
};
let gameState = gameStateEnum.Menu;

// ✅ Add missing global variables for multiplayer
let width = window.innerWidth || 800;  // Default width
let height = window.innerHeight || 600; // Default height

// ✅ Add window resize handler to update dimensions
function updateDimensions() {
    // Don't update dimensions during active gameplay to prevent button position issues
    if (window.game && window.game.players && window.game.players.length > 0) {
        console.log('Game active - skipping dimension update to prevent button position issues');
        return;
    }
    
    // Additional check for gameState if window.game is not available
    if (typeof gameState !== 'undefined' && gameState === gameStateEnum.Playing) {
        console.log('Game state indicates playing - skipping dimension update to prevent button position issues');
        return;
    }
    
    width = window.innerWidth || 800;
    height = window.innerHeight || 600;
    console.log('Dimensions updated - width:', width, 'height:', height);
}

// Add event listener for window resize
if (typeof window !== 'undefined') {
    window.addEventListener('resize', updateDimensions);
    // Initialize dimensions
    updateDimensions();
}

// Card values - Correct Brazilian Truco hierarchy
let cardValues = {
    // Top 7 most powerful cards (special Truco cards)
    "Queen of diamonds": 1,    // First most powerful
    "Jack of clubs": 2,        // Second most powerful
    "5 of clubs": 3,           // Third most powerful
    "4 of clubs": 4,           // Fourth most powerful
    "7 of hearts": 5,          // Fifth most powerful
    "Ace of spades": 6,        // Sixth most powerful
    "7 of diamonds": 7,        // Seventh most powerful
    
    // All three's - Eighth most powerful
    "3 of clubs": 8,
    "3 of diamonds": 8,
    "3 of hearts": 8,
    "3 of spades": 8,
    
    // All two's - Ninth most powerful
    "2 of clubs": 9,
    "2 of diamonds": 9,
    "2 of hearts": 9,
    "2 of spades": 9,
    
    // Standard card power (remaining cards)
    "Ace of clubs": 10,
    "Ace of diamonds": 10,
    "Ace of hearts": 10,
    "King of clubs": 11,
    "King of diamonds": 11,
    "King of spades": 11,
    "King of hearts": 11,
    "Queen of clubs": 12,
    "Queen of hearts": 12,
    "Queen of spades": 12,
    "Jack of diamonds": 13,
    "Jack of spades": 13,
    "Jack of hearts": 13,
    "7 of clubs": 14,
    "7 of spades": 14,
    "6 of clubs": 15,
    "6 of diamonds": 15,
    "6 of spades": 15,
    "6 of hearts": 15,
    "5 of diamonds": 16,
    "5 of spades": 16,
    "5 of hearts": 16,
    "4 of diamonds": 17,
    "4 of spades": 17,
    "4 of hearts": 17
};

// Card images - MUST match the names in cardValues exactly
let cardImages = {};

// Global variables
let socket = null;
let gameInitialized = false;
let currentRoom = null;
let playerHand = null;
let playerPosition = null;