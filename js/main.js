// Get canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
// Matter.js Modules
const Engine = Matter.Engine,
      // Render = Matter.Render, // Using custom rendering
      Runner = Matter.Runner,
      Bodies = Matter.Bodies,
      Composite = Matter.Composite,
      World = Matter.World; // Alias for Composite.add etc.

// Physics variables
let engine;
let world;
let runner;
let ground;
const balls = []; // Array to hold all ball bodies
let spawnIntervalId = null; // To store the interval timer ID
const BALL_SPAWN_RATE = 1000; // Spawn a ball every 1000ms (1 second)
const BALL_RADIUS = 15; // Radius for spawned balls
// Target variables
const TARGET_RADIUS = 25;
const TARGET_COLOR = 'yellow';
const TARGET_SCORE_POINTS = 10; // Points for hitting a target
const TARGET_HIT_NOTE = 880.00; // A5 note
const targets = []; // Array to hold target bodies
// Removed duplicate target variable declarations
// Starfield variables
const stars = [];
let numStars = 200; // Initial star count
// Input/Drawing variables
let isDrawing = false;
let startPos = { x: 0, y: 0 };
let currentPos = { x: 0, y: 0 };
const platforms = []; // Array to keep track of platform bodies if needed later

// Platform Type definitions
const platformTypes = {
    '1': { color: 'lightblue', noteFrequency: 523.25, restitution: 0.5 }, // C5, Low bounce
    '2': { color: 'lightgreen', noteFrequency: 659.25, restitution: 0.7 }, // E5, Medium bounce
    '3': { color: 'lightcoral', noteFrequency: 783.99, restitution: 0.9 },  // G5, High bounce
    '4': { color: 'orange', noteFrequency: 1046.50, restitution: 0.7, isAccelerator: true, boostFactor: 1.5 }, // C6, Accelerator
    '5': { color: 'rgba(200, 200, 200, 0.7)', noteFrequency: 698.46, restitution: 0.6, isTemporary: true, maxHits: 3 } // F5, Temporary
};
let selectedPlatformType = '1'; // Default to type 1

// Audio variables
let audioContext;
// const soundBuffers = {}; // No longer needed for synthesized notes
let isAudioInitialized = false;

// Game State variables
let score = 0;
const PLATFORM_DELETE_PENALTY = 5; // Points deducted for deleting a platform

// Function to set canvas size
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    // Adjust star density based on canvas size (optional)
    numStars = Math.floor((canvas.width * canvas.height) / 10000); // Example density calculation
}

// Function to create/recreate stars
function setupStars() {
    stars.length = 0; // Clear existing stars
    for (let i = 0; i < numStars; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: Math.random() * 1.5, // Varying sizes
            alpha: Math.random() * 0.5 + 0.5, // Initial transparency (0.5 to 1.0)
            deltaAlpha: (Math.random() - 0.5) * 0.02 // How fast it shimmers (+/-)
        });
    }
}

// Function to draw stars
function drawStars() {
    stars.forEach(star => {
        // Update shimmer
        star.alpha += star.deltaAlpha;
        // Reverse direction if alpha goes out of bounds (e.g., 0.1 to 1.0)
        if (star.alpha <= 0.1 || star.alpha >= 1.0) {
            star.deltaAlpha *= -1; // Reverse shimmer direction
        }
        // Clamp alpha to prevent it going too far out of bounds between checks
        star.alpha = Math.max(0.1, Math.min(1.0, star.alpha));

        // Draw the star
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`; // White star with varying alpha
        ctx.fill();
    });
}

// Function to draw physics bodies
function drawPhysicsBodies() {
    if (!world) return; // Don't draw if physics not initialized

    const bodies = Composite.allBodies(world);

    // Removed redundant path creation and global fill

    // Example: Draw individual bodies with their specified color
    // Draw individual bodies with their specified color
    bodies.forEach(body => {
         ctx.beginPath(); // <<< MOVED INSIDE LOOP: Start a new path for EACH body

         const vertices = body.vertices;
         const bodyColor = body.render?.fillStyle || 'lightgrey'; // Use custom render prop or default

         ctx.moveTo(vertices[0].x, vertices[0].y);
         for (let j = 1; j < vertices.length; j += 1) {
             ctx.lineTo(vertices[j].x, vertices[j].y);
         }
         ctx.lineTo(vertices[0].x, vertices[0].y); // Close the path for the current body

         ctx.fillStyle = bodyColor; // Set the fill color for this body
         ctx.fill(); // Fill the path for this body

         // Add outline
         ctx.lineWidth = 1;
         ctx.strokeStyle = '#555'; // Dark grey outline
         ctx.stroke(); // Draw the outline
     }); // End of loop for drawing individual bodies


}

// Function to draw the preview line while drawing
function drawPreviewLine() {
    if (!isDrawing) return;

    ctx.beginPath();
    ctx.moveTo(startPos.x, startPos.y);
    ctx.lineTo(currentPos.x, currentPos.y);
    ctx.strokeStyle = platformTypes[selectedPlatformType].color; // Use selected platform color
    ctx.lineWidth = 5; // Thickness of the preview line
    ctx.stroke();
    ctx.lineWidth = 1; // Reset line width
}

// Function to remove balls that are off-screen
function cleanupBalls() {
    for (let i = balls.length - 1; i >= 0; i--) {
        const ballBody = balls[i];
        // Check if ball is well below the bottom edge
        if (ballBody.position.y > canvas.height + BALL_RADIUS * 4) {
            World.remove(world, ballBody); // Remove from physics world
            balls.splice(i, 1); // Remove from our tracking array
            // console.log("Removed off-screen ball");
        }
    }
}

// --- Main Game Loop ---
function gameLoop(timestamp) { // timestamp provided by requestAnimationFrame
    // 1. Clear canvas (draw black background)
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Draw Background Elements (Stars)
    drawStars();

    // --- Physics engine is updated by the Runner ---

    // --- Update Game State ---
    cleanupBalls(); // Remove balls that fell off

    // --- Draw Game Elements ---
    drawPhysicsBodies(); // Draw balls, platforms, etc.
    drawPreviewLine();   // Draw the line preview if user is drawing
    drawScore(); // Draw the current score
    drawSelectedType(); // Draw the selected platform type indicator

    // 6. Request next frame
    requestAnimationFrame(gameLoop);
}

// Function to create/recreate the ground
function createGround() {
    // Remove existing ground if it exists (for resizing)
    if (ground) {
        World.remove(world, ground);
    }
    // Create new ground
    ground = Bodies.rectangle(
        canvas.width / 2,  // x position (center)
        canvas.height - 25, // y position (near bottom)
        canvas.width,      // width (full canvas width)
        50,                // height
        {
            isStatic: true, // Make it static
            label: 'ground', // Add a label
            render: { fillStyle: '#333' } // Custom property for our renderer
        }
    );
    World.add(world, ground);
}

// Function to create a platform body based on start/end points
function createPlatform(startX, startY, endX, endY) {
    const dx = endX - startX;
    const dy = endY - startY;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    const centerX = startX + dx / 2;
    const centerY = startY + dy / 2;
    const thickness = 10; // Platform thickness

    // Prevent creating zero-length platforms
    if (length < 5) {
        console.log("Platform too short, not created.");
        return;
    }

    const platformData = platformTypes[selectedPlatformType];
    const platform = Bodies.rectangle(
        centerX,
        centerY,
        length,
        thickness,
        {
            isStatic: true,
            angle: angle,
            label: 'platform', // Label for collision detection later
            friction: 0.3, // Add some friction
            restitution: platformData.restitution, // Use type-specific bounciness
            // Store the note frequency and color on the body itself
            noteFrequency: platformData.noteFrequency,
            render: { fillStyle: platformData.color },
            // Custom properties for different platform types
            isAccelerator: platformData.isAccelerator || false,
            boostFactor: platformData.boostFactor || 0,
            isTemporary: platformData.isTemporary || false,
            maxHits: platformData.maxHits || 0,
            currentHits: 0 // Renamed from hits, current hits for temporary platforms
        }
    );

    platforms.push(platform); // Add to our array
    World.add(world, platform); // Add to the physics world
    console.log(`Platform created: ID=${platform.id}, Pos=(${centerX.toFixed(1)}, ${centerY.toFixed(1)}), L=${length.toFixed(1)}, A=${angle.toFixed(2)}, Type=${selectedPlatformType}`);
    if (platform.isAccelerator) {
        console.log(`  Accelerator props: boostFactor=${platform.boostFactor}`);
    }
    if (platform.isTemporary) {
        console.log(`  Temporary props: maxHits=${platform.maxHits}, currentHits=${platform.currentHits}`);
    }
}

// Function to spawn a new ball
function spawnBall() {
    if (!world) return; // Don't spawn if physics not ready

    // Spawn near the horizontal center with a slight random offset
    const x = canvas.width / 2 + (Math.random() - 0.5) * 50; // Center +/- 25px
    const y = -BALL_RADIUS * 2; // Start just above the screen

    const newBall = Bodies.circle(x, y, BALL_RADIUS, {
        restitution: 0.7,
        friction: 0.1,
        frictionAir: 0.01,
        label: 'ball',
        render: { fillStyle: 'white' } // Change ball color to white
    });

    balls.push(newBall);
    World.add(world, newBall);
    // console.log("Spawned ball");
}

// Function to spawn a target
function spawnTarget() {
    if (!world) return;

    // Find a suitable position (simple random placement for now)
    // Avoid spawning too close to the edges or the ground
    const margin = TARGET_RADIUS * 2;
    const x = Math.random() * (canvas.width - margin * 2) + margin;
    // Spawn in the lower vertical section, well above the ground
    const lowerBound = canvas.height * 0.6; // Start 60% down
    const upperBound = canvas.height - 100; // End 100px above bottom (adjust as needed)
    const y = Math.random() * (upperBound - lowerBound) + lowerBound;

    const newTarget = Bodies.circle(x, y, TARGET_RADIUS, {
        isStatic: true,
        isSensor: true, // Important: detects collision but no physical reaction
        label: 'target',
        targetScore: TARGET_SCORE_POINTS, // Custom property
        hitNote: TARGET_HIT_NOTE,       // Custom property
        render: { fillStyle: TARGET_COLOR }
    });

    targets.push(newTarget);
    World.add(world, newTarget);
    console.log("Spawned target at", x.toFixed(1), y.toFixed(1));
}


// Function to draw the score
function drawScore() {
    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`Score: ${score}`, 20, 20); // Position score at top-left
}

// Function to draw the selected platform type indicator
function drawSelectedType() {
    ctx.fillStyle = 'yellow'; // Indicator color
    ctx.font = '20px Arial';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    const typeText = `Type: ${selectedPlatformType}`;
    const textMetrics = ctx.measureText(typeText);
    const textWidth = textMetrics.width;
    const textHeight = textMetrics.actualBoundingBoxAscent + textMetrics.actualBoundingBoxDescent; // Approx height

    const iconWidth = 24;
    const iconHeight = 6;
    const padding = 10;
    const iconX = canvas.width - 20 - textWidth - padding - iconWidth;
    // Align icon top with text top for simplicity, adjust if needed for vertical centering
    const iconY = 20 + (textHeight / 2) - (iconHeight / 2); // Attempt to vertically center with text

    drawPlatformIcon(selectedPlatformType, iconX, iconY, iconWidth, iconHeight);
    ctx.fillText(typeText, canvas.width - 20, 20); // Position at top-right
}

// Function to draw a specific platform type icon
function drawPlatformIcon(type, x, y, iconWidth, iconHeight) {
    const platformData = platformTypes[type];
    if (!platformData) {
        console.warn(`No platform data found for type: ${type}`);
        return;
    }

    const originalFillStyle = ctx.fillStyle; // Save current fill style

    ctx.fillStyle = platformData.color;

    switch (type) {
        case '4': // Accelerator
            ctx.fillRect(x, y, iconWidth, iconHeight); // Base orange rectangle
            ctx.fillStyle = 'white'; // Chevrons color
            // Draw three small chevrons (filled rectangles for simplicity)
            // Chevron 1: ctx.fillRect(x + 4, y + 1, 3, iconHeight - 2);
            // Chevron 2: ctx.fillRect(x + 10, y + 1, 3, iconHeight - 2);
            // Chevron 3: ctx.fillRect(x + 16, y + 1, 3, iconHeight - 2);
            // Adjusted for 24x6 iconHeight - 2 = 4
            const chevronWidth = 3;
            const chevronHeight = iconHeight - 2; // e.g., 4px if iconHeight is 6
            const chevronY = y + 1;
            ctx.fillRect(x + 4, chevronY, chevronWidth, chevronHeight);
            ctx.fillRect(x + iconWidth/2 - chevronWidth/2, chevronY, chevronWidth, chevronHeight); // Centered chevron
            ctx.fillRect(x + iconWidth - 4 - chevronWidth, chevronY, chevronWidth, chevronHeight);
            break;
        case '5': // Temporary
            // platformData.color is already rgba(200, 200, 200, 0.7)
            // Draw three separate rectangular segments
            const segmentWidth = 6; // Fixed segment width
            const gap = (iconWidth - (3 * segmentWidth)) / 2; // Calculate gap based on fixed segment width
            
            ctx.fillRect(x, y, segmentWidth, iconHeight);
            ctx.fillRect(x + segmentWidth + gap, y, segmentWidth, iconHeight);
            ctx.fillRect(x + 2 * (segmentWidth + gap), y, segmentWidth, iconHeight);
            break;
        default: // Cases '1', '2', '3' and any other
            ctx.fillRect(x, y, iconWidth, iconHeight); // Solid rectangle
            break;
    }

    ctx.fillStyle = originalFillStyle; // Restore original fill style
}

// --- Audio Functions ---
// Initialize Audio Context (must be called after user interaction)
function initAudio() {
    if (isAudioInitialized) return;
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        console.log("AudioContext created.");

        // Resume context if it's suspended (common browser policy)
        if (audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                console.log("AudioContext resumed successfully.");
                isAudioInitialized = true;
                // loadSounds(); // No longer needed
            });
        } else {
             isAudioInitialized = true;
             // loadSounds(); // No longer needed
        }

    } catch (e) {
        console.error("Web Audio API is not supported in this browser", e);
        // Handle lack of audio support gracefully (e.g., disable sound features)
    }
}

// Remove loadSound and loadSounds functions as they are no longer needed

// Play a synthesized note
function playNote(frequency = 440, duration = 0.1, volume = 0.5) { // Default to A4 for 0.1 seconds at half volume
    if (!audioContext || audioContext.state !== 'running') {
        // console.log(`Cannot play note. Context State: ${audioContext?.state}`);
        return;
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Set frequency
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator.type = 'sine'; // Or 'square', 'sawtooth', 'triangle'

    // Apply a simple envelope to make it sound like a pluck/hit
    // Clamp volume to a safe range (e.g., 0.05 to 1.0)
    const clampedVolume = Math.max(0.05, Math.min(1.0, volume));
    gainNode.gain.setValueAtTime(clampedVolume, audioContext.currentTime); // Start at calculated volume
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration); // Fade out quickly

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration); // Stop after duration
}

// --- Collision Handling ---
function handleCollisions(event) {
    if (!isAudioInitialized) return; // Don't process if audio isn't ready

    event.pairs.forEach(pair => {
        const bodyA = pair.bodyA;
        const bodyB = pair.bodyB;

        // Check for ball hitting a platform or the ground
        let platformBody = null;
        let ballBody = null;

        if (bodyA.label === 'ball' && bodyB.label === 'platform') {
            ballBody = bodyA;
            platformBody = bodyB;
        } else if (bodyB.label === 'ball' && bodyA.label === 'platform') {
            ballBody = bodyB;
            platformBody = bodyA;
        } else if (bodyA.label === 'ball' && bodyB.label === 'ground') {
            // Handled below
        } else if (bodyB.label === 'ball' && bodyA.label === 'ground') {
            // Handled below
        }

        // Check for ball hitting a target
        let targetBody = null;
        if (bodyA.label === 'ball' && bodyB.label === 'target') {
            ballBody = bodyA; // Re-assign ballBody if needed
            targetBody = bodyB;
        } else if (bodyB.label === 'ball' && bodyA.label === 'target') {
            ballBody = bodyB; // Re-assign ballBody if needed
            targetBody = bodyA;
        }


        if (platformBody) { // Ball hit platform
            // Retrieve the note frequency stored on the platform body
            const frequency = platformBody.noteFrequency || 440; // Default to A4 if not found
            // Calculate volume based on impact velocity (absolute vertical velocity)
            // Normalize and scale velocity to a reasonable volume range (e.g., 0.2 to 0.8)
            const impactVelocity = Math.abs(ballBody.velocity.y);
            const maxVelocity = 20; // Adjust this based on typical impact speeds
            const minVolume = 0.2;
            const maxVolume = 0.8;
            let volume = minVolume + (impactVelocity / maxVelocity) * (maxVolume - minVolume);
            volume = Math.min(maxVolume, Math.max(minVolume, volume)); // Clamp volume

            playNote(frequency, 0.1, volume); // Pass frequency and calculated volume
            score++;
            // console.log(`Score: ${score}, Note: ${frequency}`);

            // Accelerator Platform Logic
            if (platformBody.isAccelerator) {
                const boostFactor = platformBody.boostFactor || 1.5; // Default if not set
                const impulseMagnitude = boostFactor * 0.005; // Adjust 0.005 as needed for desired effect
                
                // Log current velocity
                console.log(`Accelerator Hit! Platform ID: ${platformBody.id}, Ball Vel Before: X=${ballBody.velocity.x.toFixed(3)}, Y=${ballBody.velocity.y.toFixed(3)}, Angle: ${platformBody.angle.toFixed(3)}, BoostFactor: ${boostFactor}`);

                const impulseX = Math.cos(platformBody.angle) * impulseMagnitude;
                const impulseY = Math.sin(platformBody.angle) * impulseMagnitude;

                Matter.Body.applyForce(ballBody, ballBody.position, { x: impulseX, y: impulseY });

                // Log after applying force - velocity might not update immediately in the same tick for logging,
                // but the force has been applied. For more accurate post-velocity, log in the next 'afterUpdate' event or simply observe.
                console.log(`Applied Boost: ImpulseX=${impulseX.toFixed(4)}, ImpulseY=${impulseY.toFixed(4)}`);
            }

            // Temporary Platform Logic
            if (platformBody.isTemporary) {
                platformBody.currentHits++;
                const baseOpacity = 0.7; // Initial opacity
                const opacityDropPerHit = 0.5 / platformBody.maxHits; // Total drop of 0.5 spread over maxHits
                let newOpacity = baseOpacity - (platformBody.currentHits * opacityDropPerHit);
                newOpacity = Math.max(0.1, newOpacity); // Clamp opacity (minimum 0.1)

                // Assuming the temporary platform's base color is grey (200,200,200)
                platformBody.render.fillStyle = `rgba(200, 200, 200, ${newOpacity})`;
                console.log(`Temporary platform ${platformBody.id} hit: ${platformBody.currentHits}/${platformBody.maxHits}, New Opacity: ${newOpacity.toFixed(2)}`);

                if (platformBody.currentHits >= platformBody.maxHits) {
                    console.log(`Temporary platform ${platformBody.id} reached max hits and will be removed.`);
                    World.remove(world, platformBody);
                    const index = platforms.indexOf(platformBody);
                    if (index > -1) {
                        platforms.splice(index, 1);
                    }
                    // Optional: Play a distinct "shatter" or "disappear" sound here
                }
            }

        } else if (targetBody) { // Ball hit target
             const points = targetBody.targetScore || 0;
             const note = targetBody.hitNote || 660; // Default note if needed
             score += points;
             playNote(note, 0.15, 0.6); // Play target hit note (slightly longer/louder?)

             // Remove target and spawn a new one
             World.remove(world, targetBody);
             const index = targets.indexOf(targetBody);
             if (index > -1) {
                 targets.splice(index, 1);
             }
             console.log(`Target hit! Score: ${score}`);
             // Spawn new target after a short delay? Or immediately?
             setTimeout(spawnTarget, 500); // Spawn new one after 500ms

        } else if ((bodyA.label === 'ball' && bodyB.label === 'ground') || (bodyB.label === 'ball' && bodyA.label === 'ground')) { // Ball hit ground
            // Play note for ground hit (e.g., G4)
            // Ground hit - use a fixed volume or also base it on velocity? Let's use fixed for now.
            playNote(392.00, 0.1, 0.3); // Play ground hit note at a lower fixed volume
        }
    });
}


// --- Input Handling Functions ---
function handleMouseDown(event) {
    // Try to initialize audio on first interaction
    if (!isAudioInitialized) {
        initAudio();
    }

    isDrawing = true;
    startPos = { x: event.clientX, y: event.clientY };
    currentPos = { x: event.clientX, y: event.clientY }; // Initialize currentPos
    // console.log("Mouse Down:", startPos);
}

function handleMouseMove(event) {
    if (!isDrawing) return;
    currentPos = { x: event.clientX, y: event.clientY };
    // console.log("Mouse Move:", currentPos); // Optional: Log move events
}

function handleMouseUp(event) {
    if (!isDrawing) return;
    isDrawing = false;
    console.log("Mouse Up:", currentPos);
    createPlatform(startPos.x, startPos.y, currentPos.x, currentPos.y);
    // Reset positions (optional, but good practice)
    startPos = { x: 0, y: 0 };
    currentPos = { x: 0, y: 0 };
}

function handleContextMenu(event) {
    event.preventDefault(); // Prevent browser context menu

    const clickPos = { x: event.clientX, y: event.clientY };
    console.log("Right Click:", clickPos);

    // Query the physics world for bodies at the click position
    const bodiesAtPoint = Matter.Query.point(Composite.allBodies(world), clickPos);

    // Find the first platform body among the clicked bodies
    const platformToDelete = bodiesAtPoint.find(body => body.label === 'platform');

    if (platformToDelete) {
        console.log("Found platform to delete:", platformToDelete.id);

        // Remove from physics world
        World.remove(world, platformToDelete);

        // Remove from our tracking array
        const index = platforms.indexOf(platformToDelete);
        if (index > -1) {
            platforms.splice(index, 1);
        }

        // Apply score penalty (don't go below zero)
        score = Math.max(0, score - PLATFORM_DELETE_PENALTY);
        console.log(`Platform deleted. Score: ${score}`);

        // Optional: Play a deletion sound (e.g., low pitch)
        playNote(110.00, 0.1, 0.4); // Play A2 note
    } else {
        console.log("No platform found at right-click position.");
    }
}


// --- Keyboard Input Handling ---
function handleKeyDown(event) {
    if (platformTypes[event.key]) { // Check if key '1', '2', or '3' is pressed
        selectedPlatformType = event.key;
        console.log(`Platform type selected: ${selectedPlatformType}`);
        // Optional: Add visual feedback for selected type
    }
}

// --- Initialization ---
function initGame() {
    resizeCanvas(); // Set initial canvas size
    setupStars();   // Create the stars

    // --- Initialize Physics ---
    engine = Engine.create();
    world = engine.world;
    // Adjust gravity to slow down the fall (default is 1)
    engine.world.gravity.y = 0.35; // Slow down gravity further (0.5 * 0.7)

    // Create ground
    createGround();

    // Remove the single test ball creation
    // ball = Bodies.circle(...)
    // World.add(world, ball);

    // Start spawning balls periodically
    if (spawnIntervalId) clearInterval(spawnIntervalId); // Clear previous interval if any
    spawnIntervalId = setInterval(spawnBall, BALL_SPAWN_RATE);
// Create and run the engine runner
runner = Runner.create();
Runner.run(runner, engine);

// --- Add Collision Event Listener ---
Matter.Events.on(engine, 'collisionStart', handleCollisions);
// --- End Physics Initialization ---

    // Spawn initial target(s)
    spawnTarget();

    console.log("Game initialized with physics. Starting loop...");
    gameLoop();     // Start the loop

    // --- Add Input Event Listeners ---
    canvas.addEventListener('mousedown', handleMouseDown); // Left click draw start
    canvas.addEventListener('mousemove', handleMouseMove); // Drag
    canvas.addEventListener('mouseup', handleMouseUp);     // Left click draw end
    canvas.addEventListener('contextmenu', handleContextMenu); // Right click delete
    window.addEventListener('keydown', handleKeyDown);     // Keyboard platform select

    // Optional: Add touch events for mobile (also trigger initAudio)
    // canvas.addEventListener('touchstart', (e) => {
    //     if (!isAudioInitialized) initAudio();
    //     handleMouseDown(e.touches[0]); // Use first touch point
    // });
    // canvas.addEventListener('touchmove', (e) => handleMouseMove(e.touches[0]));
    // canvas.addEventListener('touchend', (e) => handleMouseUp(e.changedTouches[0]));
}

// --- Event Listeners ---
// Initialize game when the window loads
window.onload = initGame;

// Handle window resizing
window.onresize = () => {
    console.log("Window resized. Adjusting canvas, stars, and physics ground...");
    resizeCanvas();
    setupStars(); // Recreate stars for new size

    // --- Update Physics Elements on Resize ---
    if (engine) {
         // Update ground position and size
         createGround();

         // Optional: Adjust world bounds or other elements if needed

         // Remove single ball repositioning logic
         // if (ball && ball.position.y > canvas.height + 50) { ... }
    }
    // --- End Physics Update ---
};