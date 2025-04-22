import { CPU } from './cpu.js';
import {
    CHAR_HEIGHT,
    VRAM_START_ADDRESS,
    VRAM_SIZE,
    // Add constants if needed for program loading logic
} from './constants.js';

// --- DOM Elements ---
const canvas = document.getElementById('emulator-canvas');
const ctx = canvas.getContext('2d');
const resetButton = document.getElementById('reset-button');
const stepButton = document.getElementById('step-button');
const runButton = document.getElementById('run-button');
const stopButton = document.getElementById('stop-button');
const statusInfo = document.getElementById('status-info');

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
let loadedFontRomData = null;

// --- Program Data ---
let loadedProgramData = null; // Will hold the loaded .sys file

// --- CPU Instance ---
let cpu = new CPU();
let runInterval = null;

// --- Remove Hardcoded Program ---
// const HELLO_WORLD_PROGRAM_START = 0x0000;
// const HELLO_WORLD_STRING_DATA_START = 0x0100;
// const HELLO_WORLD_VRAM_TARGET_START = VRAM_START_ADDRESS + SCREEN_CHAR_WIDTH;
// const helloWorldProgram = [ ... ];
// const helloWorldStringData = [ ... ];

/**
 * Fetches and loads the font ROM data from the .rom file.
 */
async function loadFontRom() {
    // ... (Same function as in charset-renderer.js) ...
    try {
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
        ctx.fillStyle = 'red';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = '16px sans-serif';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText('Error loading font ROM!', canvas.width / 2, canvas.height / 2);
        throw error;
    }
}

/**
 * Fetches and loads the program data from the .sys file.
 * @returns {Promise<Uint8Array>} A promise that resolves with the program data.
 */
async function loadProgramSys() {
    try {
        const response = await fetch('dist/hello.sys'); // Load the assembled file
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        loadedProgramData = new Uint8Array(arrayBuffer);
        console.log(`Program loaded from dist/hello.sys (${loadedProgramData.length} bytes).`);
        return loadedProgramData;
    } catch (error) {
        console.error('Error loading program file:', error);
        // Display error on canvas
        ctx.fillStyle = 'red';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = '16px sans-serif';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText('Error loading program!', canvas.width / 2, canvas.height / 2);
        throw error;
    }
}

/**
 * Draws a single character based on its code using the loaded Font ROM.
 */
function drawChar(charCode, gridX, gridY) {
    // ... (Same function as in charset-renderer.js, using loadedFontRomData) ...
    if (!loadedFontRomData) return;
    if (charCode < 0 || charCode >= 128) charCode = 0x3F; // '?'

    const romBaseAddress = charCode * CHAR_HEIGHT;
    const pixelX = gridX * CHAR_WIDTH;
    const pixelY = gridY * CHAR_HEIGHT;

    if (romBaseAddress + CHAR_HEIGHT > loadedFontRomData.length) {
         console.error(`Char data out of bounds in ROM for charCode ${charCode}`);
         return;
    }

    for (let y = 0; y < CHAR_HEIGHT; y++) {
        const rowByte = loadedFontRomData[romBaseAddress + y];
        for (let x = 0; x < CHAR_WIDTH; x++) {
            const bitMask = 1 << (CHAR_WIDTH - 1 - x);
            const isPixelSet = (rowByte & bitMask) !== 0;
            ctx.fillStyle = isPixelSet ? FOREGROUND_COLOR : BACKGROUND_COLOR;
            ctx.fillRect(pixelX + x, pixelY + y, 1, 1);
        }
    }
}

/**
 * Reads the VRAM area from CPU memory and renders it to the canvas.
 */
function renderVRAM() {
    if (!loadedFontRomData) return; // Need font ROM to render

    ctx.fillStyle = BACKGROUND_COLOR;
    ctx.fillRect(0, 0, SCREEN_PIXEL_WIDTH, SCREEN_PIXEL_HEIGHT);

    for (let i = 0; i < VRAM_SIZE; i++) {
        const charCode = cpu.memory.read(VRAM_START_ADDRESS + i);
        const gridX = i % SCREEN_CHAR_WIDTH;
        const gridY = Math.floor(i / SCREEN_CHAR_WIDTH);
        drawChar(charCode, gridX, gridY);
    }
}

/**
 * Resizes the canvas element's style to fit the window.
 */
function resizeCanvas() {
    // ... (Same function as in charset-renderer.js) ...
    const windowWidth = window.innerWidth;
    // Adjust height calculation based on controls height if needed
    const controlsHeight = document.getElementById('controls').offsetHeight;
    const availableHeight = window.innerHeight - controlsHeight - 30; // Subtract controls and some margin
    const aspectRatio = SCREEN_PIXEL_WIDTH / SCREEN_PIXEL_HEIGHT;

    let newWidth = windowWidth * 0.95; // Use 95% of width
    let newHeight = newWidth / aspectRatio;

    if (newHeight > availableHeight) {
        newHeight = availableHeight;
        newWidth = availableHeight * aspectRatio;
    }

    canvas.style.width = `${newWidth}px`;
    canvas.style.height = `${newHeight}px`;

    console.log(`Resized canvas style to: ${newWidth.toFixed(0)}px x ${newHeight.toFixed(0)}px`);
}

// --- CPU Control Functions ---
function resetEmulator() {
    stopEmulator();
    cpu.reset(); // Resets CPU registers, memory, and loads Font ROM

    if (!loadedProgramData) {
        console.error("Program data not loaded. Cannot reset.");
        statusInfo.textContent = "Status: Error - Program not loaded!";
        return;
    }

    // Load the entire assembled program/data blob into memory starting at 0x0000
    // The .ORG directives in the assembly determined the correct addresses within the blob.
    cpu.memory.loadProgram(loadedProgramData, 0x0000);

    // Set PC to the program's entry point (defined by .ORG $0000 in the asm)
    cpu.registers.PC = 0x0000;

    renderVRAM(); // Render initial VRAM
    statusInfo.textContent = "Status: Reset";
    console.log("Emulator Reset with loaded hello.sys program.");
}

function stepEmulator() {
    if (runInterval) stopEmulator(); // Stop running if stepping
    if (!cpu.isRunning) cpu.isRunning = true; // Allow step if halted by unknown opcode etc.
    cpu.step();
    renderVRAM(); // Update screen after step
    statusInfo.textContent = `Status: Stepped | PC: 0x${cpu.registers.PC.toString(16).padStart(4,'0')}`;
}

function runEmulator() {
    if (runInterval) return; // Already running
    cpu.isRunning = true;
    statusInfo.textContent = "Status: Running...";
    // Adjust interval for desired speed (e.g., 16ms ~ 60fps, 1ms faster)
    runInterval = setInterval(() => {
        if (!cpu.isRunning) {
            stopEmulator();
            return;
        }
        // Execute multiple steps per interval for speed
        const stepsPerFrame = 100; // Adjust as needed
        for (let i = 0; i < stepsPerFrame && cpu.isRunning; i++) {
            cpu.step();
        }
        renderVRAM(); // Render after a batch of steps
    }, 1); // Run step batches frequently
}

function stopEmulator() {
    cpu.isRunning = false;
    if (runInterval) {
        clearInterval(runInterval);
        runInterval = null;
        statusInfo.textContent = "Status: Stopped";
        console.log("Emulator Stopped.");
    }
}

// --- Event Listeners ---
resetButton.addEventListener('click', resetEmulator);
stepButton.addEventListener('click', stepEmulator);
runButton.addEventListener('click', runEmulator);
stopButton.addEventListener('click', stopEmulator);
window.addEventListener('resize', resizeCanvas);

// --- Initialization ---
async function initialize() {
    statusInfo.textContent = "Status: Loading Resources...";
    try {
        // Load font and program in parallel
        await Promise.all([
            loadFontRom(),
            loadProgramSys()
        ]);

        if (loadedFontRomData && loadedProgramData) {
            resetEmulator(); // Reset and load program after resources are ready
            resizeCanvas(); // Initial resize
            statusInfo.textContent = "Status: Ready";
        } else {
            throw new Error("One or more resources failed to load.");
        }
    } catch (error) {
        console.error("Initialization failed:", error);
        statusInfo.textContent = "Status: Error loading resources!";
        // Error message might already be on canvas from loading functions
    }
}

initialize(); // Start the initialization process
