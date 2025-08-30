// Setup Variables
let timeBots = 2000; //time bots take to play
let timeEndRound = 3000; //time bots take to play
let timePopUpAutoClose = 5000; // time it takes to popup of rounds to close
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
let cardWidth = 85; // Replace with the actual width of your cards
let cardHeight = 123; // Replace with the actual height of your cards
let playedCards = [];
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

// Card values
let cardValues = {
    "Queen of diamonds": 1,
    "Queen of clubs": 2,
    "Queen of hearts": 3,
    "Queen of spades": 4,
    "Jack of clubs": 5,
    "Jack of diamonds": 6,
    "Jack of spades": 7,
    "Jack of hearts": 8,
    "King of clubs": 9,
    "King of diamonds": 10,
    "King of spades": 11,
    "King of hearts": 12,
    "Ace of spades": 13,
    "Ace of diamonds": 14,
    "Ace of hearts": 15,
    "Ace of clubs": 16,
    "7 of hearts": 17,
    "7 of diamonds": 18,
    "7 of spades": 19,
    "7 of clubs": 20,
    "6 of diamonds": 21,
    "6 of spades": 22,
    "6 of hearts": 23,
    "6 of clubs": 24,
    "5 of diamonds": 25,
    "5 of spades": 26,
    "5 of hearts": 27,
    "5 of clubs": 28,
    "4 of diamonds": 29,
    "4 of spades": 30,
    "4 of hearts": 31,
    "4 of clubs": 32,
    "3 of diamonds": 33,
    "3 of spades": 34,
    "3 of hearts": 35,
    "3 of clubs": 36,
    "2 of diamonds": 37,
    "2 of spades": 38,
    "2 of hearts": 39,
    "2 of clubs": 40
};

// Card images - MUST match the names in cardValues exactly
let cardImages = {};

// Global variables
let socket = null;
let gameInitialized = false;
let currentRoom = null;
let playerHand = null;
let playerPosition = null;