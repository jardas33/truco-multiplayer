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
let team1Rounds = 0;
let team2Rounds = 0;
let team1Games = 0;
let team2Games = 0;
let team1Sets = 0;
let team2Sets = 0;
let closeButton;
let popup;
let popupOnlyClose;
let popupMessage;
let popupTimeoutId;
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
    "Jack of clubs": 2,
    "5 of clubs": 3,
    "4 of clubs": 4,
    "7 of hearts": 5,
    "Ace of spades": 6,
    "7 of diamonds": 7,
    "3 of diamonds": 8,
    "3 of spades": 8,
    "3 of hearts": 8,
    "3 of clubs": 8,
    "2 of diamonds": 9,
    "2 of spades": 9,
    "2 of hearts": 9,
    "2 of clubs": 9,
    "Ace of diamonds": 10,
    "Ace of hearts": 10,
    "Ace of clubs": 10,
    "King of diamonds": 11,
    "King of spades": 11,
    "King of hearts": 11,
    "King of clubs": 11,
    "Queen of spades": 12,
    "Queen of hearts": 12,
    "Queen of clubs": 12,
    "Jack of spades": 13,
    "Jack of hearts": 13,
    "Jack of diamonds": 13,
    "7 of spades": 14,
    "7 of clubs": 14,
    "6 of diamonds": 15,
    "6 of spades": 15,
    "6 of hearts": 15,
    "6 of clubs": 15,
    "5 of diamonds": 16,
    "5 of spades": 16,
    "5 of hearts": 16,
    "4 of diamonds": 17,
    "4 of spades": 17,
    "4 of hearts": 17,
  };
  
  // Card images
  let cardImages = {};