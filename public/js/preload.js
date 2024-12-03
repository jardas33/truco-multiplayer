// Create p5 instance in the game canvas div
window.p5Instance = new p5(function(p) {
    p.preload = function() {
        // Load background image
        backgroundImage = p.loadImage("Images/background.jpg");
        backCardImage = p.loadImage("Images/cardBack.jpg");
        popupframeImage = p.loadImage("Images/popup_frame.png");
        instructionsImage = p.loadImage("Images/instructions.png");
        
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
});
  