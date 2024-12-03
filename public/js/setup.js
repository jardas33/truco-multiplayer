// Create p5 instance in the game canvas div
let gameSketch = function(p) {
    p.setup = function() {
        let canvas = p.createCanvas(p.windowWidth, p.windowHeight);
        canvas.parent('gameCanvas');
        
        menuDiv = p.select("#Menu");
        gameDiv = p.select("#Game");
        instructionsDiv = p.select("#Instructions");
        valuesDiv = p.select("#Values");

        // Rest of your setup code, but replace all p5 function calls with p.functionName
        // For example: createButton becomes p.createButton
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

        // ... rest of your setup code ...
    };

    p.draw = function() {
        // Your draw function code here
    };

    p.windowResized = function() {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
    };
};

// Initialize p5 instance
new p5(gameSketch);
  