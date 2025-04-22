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
const programSelect = document.getElementById('program-select'); // New element

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
let availablePrograms = []; // To store the list from programs.json
let selectedProgramPath = null; // Store the path of the selected program

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
 * Fetches and loads the program list from programs.json.
 */
async function loadProgramList() {
    try {
        const response = await fetch('dist/programs.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        availablePrograms = await response.json();
        console.log("Available programs loaded:", availablePrograms);
    } catch (error) {
        console.error('Error loading program list:', error);
        programSelect.innerHTML = '<option value="">Error loading list</option>';
        availablePrograms = []; // Ensure it's an empty array on error
    }
}

/**
 * Populates the program selector dropdown.
 */
function populateProgramSelector() {
    programSelect.innerHTML = ''; // Clear existing options
    if (availablePrograms.length === 0) {
        programSelect.innerHTML = '<option value="">No programs found</option>';
        return;
    }

    availablePrograms.forEach((program, index) => {
        const option = document.createElement('option');
        option.value = program.path;
        option.textContent = program.name;
        programSelect.appendChild(option);
        // Select the first program by default
        if (index === 0) {
            option.selected = true;
            selectedProgramPath = program.path;
        }
    });
}

/**
 * Fetches and loads the program data from the specified .sys file path.
 * @param {string} filePath The path to the .sys file to load.
 * @returns {Promise<Uint8Array>} A promise that resolves with the program data.
 */
async function loadProgramSys(filePath) {
    if (!filePath) {
        console.error("No program file path specified.");
        statusInfo.textContent = "Status: Error - No program selected!";
        loadedProgramData = null; // Ensure no stale data
        return null; // Indicate failure
    }
    statusInfo.textContent = `Status: Loading ${filePath}...`;
    try {
        const response = await fetch(filePath); // Load the selected file
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        loadedProgramData = new Uint8Array(arrayBuffer);
        console.log(`Program loaded from ${filePath} (${loadedProgramData.length} bytes).`);
        statusInfo.textContent = `Status: Loaded ${filePath}`;
        return loadedProgramData;
    } catch (error) {
        console.error(`Error loading program file (${filePath}):`, error);
        // Display error on canvas
        ctx.fillStyle = 'red';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = '16px sans-serif';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText('Error loading program!', canvas.width / 2, canvas.height / 2);
        statusInfo.textContent = `Status: Error loading ${filePath}!`;
        loadedProgramData = null; // Ensure no stale data
        throw error; // Re-throw for initialize function to catch
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
async function resetEmulator() { // Make reset async to handle loading
    stopEmulator();
    cpu.reset(); // Resets CPU registers, memory, and loads Font ROM

    // Get the currently selected program path
    selectedProgramPath = programSelect.value;

    try {
        // Load the selected program
        await loadProgramSys(selectedProgramPath);

        if (!loadedProgramData) {
            console.error("Program data not loaded after attempt. Cannot reset.");
            statusInfo.textContent = "Status: Error - Program failed to load!";
            return;
        }

        // Load the assembled program into memory
        cpu.memory.loadProgram(loadedProgramData, 0x0000);
        cpu.registers.PC = 0x0000; // Set PC to program entry point

        renderVRAM(); // Render initial VRAM
        statusInfo.textContent = `Status: Reset - ${selectedProgramPath} loaded`;
        console.log(`Emulator Reset with loaded program: ${selectedProgramPath}`);

    } catch (error) {
        // Error already logged by loadProgramSys
        // Status already set by loadProgramSys
        console.error("Reset failed due to program loading error.");
    }
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
programSelect.addEventListener('change', (event) => {
    selectedProgramPath = event.target.value;
    console.log(`Program selection changed to: ${selectedProgramPath}`);
    resetEmulator(); // Reset and load the new program when selection changes
});
resetButton.addEventListener('click', resetEmulator);
stepButton.addEventListener('click', stepEmulator);
runButton.addEventListener('click', runEmulator);
stopButton.addEventListener('click', stopEmulator);
window.addEventListener('resize', resizeCanvas);

// --- Initialization ---
async function initialize() {
    statusInfo.textContent = "Status: Loading Resources...";
    try {
        // Load font and program list first
        await Promise.all([
            loadFontRom(),
            loadProgramList() // Load the list of programs
        ]);

        // Populate the selector dropdown
        populateProgramSelector();

        // Now load the initially selected program and reset
        if (selectedProgramPath) {
             await resetEmulator(); // Reset loads the selected program
             resizeCanvas(); // Initial resize
             // Status is set by resetEmulator
        } else if (availablePrograms.length > 0) {
             console.warn("No program selected by default, but programs are available.");
             statusInfo.textContent = "Status: Select a program and press Reset.";
        } else {
             throw new Error("Font loaded, but no programs found or list failed to load.");
        }

    } catch (error) {
        console.error("Initialization failed:", error);
        statusInfo.textContent = "Status: Error during initialization!";
        // Error message might already be on canvas from loading functions
    }
}

initialize(); // Start the initialization process
