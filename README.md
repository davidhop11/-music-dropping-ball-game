# Musical Dropping Ball Game

A simple web-based game where balls drop from the top, and the player creates platforms to bounce them into targets, triggering musical notes on impact.

## How to Play

*   **Objective:** Bounce the falling balls off user-drawn platforms to hit the yellow targets that appear on the screen.
*   **Controls:**
    *   **Draw Platform:** Click and drag the left mouse button on the screen to draw a platform.
    *   **Select Platform Type:** Press keys '1' through '5' on your keyboard *before* drawing to select different platform types:
        *   **1:** Light Blue (Low Bounce, C5 Note)
        *   **2:** Light Green (Medium Bounce, E5 Note)
        *   **3:** Light Coral (High Bounce, G5 Note)
        *   **4 (Accelerator Platform):** Orange - Boosts the ball's speed along the platform's angle upon impact (C6 Note).
        *   **5 (Temporary Platform):** Translucent Grey - Becomes more transparent with each hit and disappears after 3 hits (F5 Note).
    *   **Delete Platform:** Right-click on an existing platform to remove it. This deducts 5 points from your score.
*   **Scoring:**
    *   Hitting a platform: +1 point
    *   Hitting a target: +10 points
    *   Deleting a platform: -5 points

## Features

*   Physics simulation using Matter.js.
*   Balls spawn periodically from the center top.
*   User-drawn platforms with selectable types affecting color, bounciness, and sound.
*   Targets appear randomly; hitting them increases score and spawns a new target.
*   Synthesized musical notes using the Web Audio API for collisions.
    *   Platform notes vary based on type.
    *   Platform hit volume varies based on impact velocity.
    *   Distinct notes for target hits and ground hits.
*   Right-click platform deletion with score penalty.
*   Dynamic starfield background.
*   Score and selected platform type displayed on screen.
*   Visual icon indicator for the currently selected platform type.

## Running the Game

1.  Ensure you have a modern web browser.
2.  Open the `index.html` file in your browser.
3.  **Important:** Click anywhere on the game screen once to enable the audio context (required by browsers).