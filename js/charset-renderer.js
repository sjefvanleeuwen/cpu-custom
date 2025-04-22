// Remove the direct import of asciiFontRomData
// import { asciiFontRomData } from './roms/ascii.js';
import { CHAR_HEIGHT } from './constants.js';

const canvas = document.getElementById('charset-canvas');
const ctx = canvas.getContext('2d');

// --- Screen Configuration ---
const SCREEN_CHAR_WIDTH = 40;
const SCREEN_CHAR_HEIGHT = 25;
const CHAR_WIDTH = 8; // Font is 8x8

const SCREEN_PIXEL_WIDTH = SCREEN_CHAR_WIDTH * CHAR_WIDTH;
const SCREEN_PIXEL_HEIGHT = SCREEN_CHAR_HEIGHT * CHAR_HEIGHT;

// Set the canvas internal resolution
canvas.width = SCREEN_PIXEL_WIDTH;
canvas.height = SCREEN_PIXEL_HEIGHT;

// --- Drawing Colors ---
const FOREGROUND_COLOR = '#FFFFFF'; // White
const BACKGROUND_COLOR = '#000000'; // Black

// --- Font ROM Data ---
let loadedFontRomData = null; // Will hold the Uint8Array after loading

/**
 * Fetches and loads the font ROM data from the .rom file.
 * @returns {Promise<Uint8Array>} A promise that resolves with the font data.
 */
async function loadFontRom() {
    try {
        // Adjust the path if your HTML file is not in the root or if using a server
        const response = await fetch('dist/characters.rom');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        loadedFontRomData = new Uint8Array(arrayBuffer);
        console.log(`Font ROM loaded from dist/characters.rom (${loadedFontRomData.length} bytes).`);
        return loadedFontRomData;
    } catch (error) {
        console.error('Error loading font ROM:', error);
        // Optionally display an error message on the canvas
        ctx.fillStyle = 'red';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = '16px sans-serif';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText('Error loading font ROM!', canvas.width / 2, canvas.height / 2);
        throw error; // Re-throw to prevent further execution if needed
    }
}

/**
 * Draws a single character from the loaded ROM data to the canvas.
 * @param {number} charCode - The ASCII code of the character to draw.
 * @param {number} gridX - The horizontal character position.
 * @param {number} gridY - The vertical character position.
 */
function drawChar(charCode, gridX, gridY) {
    if (!loadedFontRomData) {
        console.error("Font ROM not loaded yet.");
        return; // Don't draw if ROM isn't available
    }
    if (charCode < 0 || charCode >= 128) {
        console.warn(`Invalid charCode: ${charCode}`);
        charCode = 0x3F; // Draw '?' for invalid codes
    }

    const romBaseAddress = charCode * CHAR_HEIGHT;
    const pixelX = gridX * CHAR_WIDTH;
    const pixelY = gridY * CHAR_HEIGHT;

    // Check if ROM data for this character exists
    if (romBaseAddress + CHAR_HEIGHT > loadedFontRomData.length) {
         console.error(`Character data out of bounds in ROM for charCode ${charCode}`);
         charCode = 0x3F; // Draw '?' if data is missing/corrupt
         // Re-calculate base address for '?'
         // romBaseAddress = charCode * CHAR_HEIGHT;
         // Or simply return / draw blank
         return;
    }


    // Iterate through the 8 rows of the character bitmap
    for (let y = 0; y < CHAR_HEIGHT; y++) {
        const rowByte = loadedFontRomData[romBaseAddress + y]; // Use loaded data

        // Iterate through the 8 pixels (bits) in the row
        for (let x = 0; x < CHAR_WIDTH; x++) {
            // Check if the bit (pixel) is set (1) or not (0)
            const bitMask = 1 << (CHAR_WIDTH - 1 - x);
            const isPixelSet = (rowByte & bitMask) !== 0;

            ctx.fillStyle = isPixelSet ? FOREGROUND_COLOR : BACKGROUND_COLOR;
            ctx.fillRect(pixelX + x, pixelY + y, 1, 1); // Draw a 1x1 pixel
        }
    }
}

/**
 * Draws the entire character set onto the screen grid.
 */
function drawScreen() {
    if (!loadedFontRomData) {
        console.error("Cannot draw screen, Font ROM not loaded.");
        return;
    }
    // Clear the canvas (optional, fillRect covers it)
    ctx.fillStyle = BACKGROUND_COLOR;
    ctx.fillRect(0, 0, SCREEN_PIXEL_WIDTH, SCREEN_PIXEL_HEIGHT);

    let charCode = 0;
    for (let y = 0; y < SCREEN_CHAR_HEIGHT; y++) {
        for (let x = 0; x < SCREEN_CHAR_WIDTH; x++) {
            if (charCode < 128) { // Only draw valid ASCII chars 0-127
                drawChar(charCode, x, y);
                charCode++;
            } else {
                // Optional: Fill remaining space with spaces or stop
                drawChar(0x20, x, y); // Fill with space
            }
        }
    }
}

/**
 * Resizes the canvas element's style to fit the window while maintaining aspect ratio.
 */
function resizeCanvas() {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const aspectRatio = SCREEN_PIXEL_WIDTH / SCREEN_PIXEL_HEIGHT;

    let newWidth = windowWidth;
    let newHeight = windowWidth / aspectRatio;

    if (newHeight > windowHeight) {
        newHeight = windowHeight;
        newWidth = windowHeight * aspectRatio;
    }

    canvas.style.width = `${newWidth}px`;
    canvas.style.height = `${newHeight}px`;

    console.log(`Resized canvas style to: ${newWidth.toFixed(0)}px x ${newHeight.toFixed(0)}px`);
}

// --- Initialization ---
async function initialize() {
    await loadFontRom(); // Wait for the ROM to load
    if (loadedFontRomData) { // Only proceed if loading was successful
        drawScreen();
        resizeCanvas(); // Call initially after drawing
        window.addEventListener('resize', resizeCanvas); // Add resize listener
        console.log("Charset renderer initialized.");
    } else {
        console.error("Initialization failed: Font ROM could not be loaded.");
    }
}

initialize(); // Start the initialization process

// Remove synchronous calls from here
// drawScreen();
// resizeCanvas();
// window.addEventListener('resize', resizeCanvas);
// console.log("Charset renderer initialized.");
