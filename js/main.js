import { CPU } from './cpu.js';
import { FONT_ROM_START_ADDRESS } from './constants.js'; // Import for UI display if needed

// --- DOM Elements ---
const registersDisplay = document.getElementById('registers-display');
const memoryDisplay = document.getElementById('memory-display');
const stepButton = document.getElementById('step-button');
const runButton = document.getElementById('run-button');
const resetButton = document.getElementById('reset-button');

// --- CPU Instance ---
let cpu = new CPU(); // CPU reset now loads the ROM automatically

// --- UI Update Functions ---
function updateRegistersDisplay() {
    const r = cpu.registers;
    registersDisplay.textContent = `PC: 0x${r.PC.toString(16).padStart(4, '0')}  A: 0x${r.A.toString(16).padStart(2, '0')}  X: 0x${r.X.toString(16).padStart(2, '0')}  Y: 0x${r.Y.toString(16).padStart(2, '0')}
SP: 0x${r.SP.toString(16).padStart(2, '0')}  P: 0b${r.P.toString(2).padStart(8, '0')} (NV-BDIZC)`;
}

function updateMemoryDisplay(startAddress = 0x0000, lines = 8) {
    let memContent = `Memory View (from 0x${startAddress.toString(16).padStart(4, '0')}):\n`;
    const bytesPerLine = 16;
    for (let l = 0; l < lines; l++) {
        const currentLineAddr = startAddress + (l * bytesPerLine);
        if (currentLineAddr >= cpu.memory.size) break;

        memContent += `0x${currentLineAddr.toString(16).padStart(4, '0')}: `;
        for (let i = 0; i < bytesPerLine; i++) {
            const addr = currentLineAddr + i;
            if (addr >= cpu.memory.size) break;
            const byte = cpu.memory.read(addr);
            memContent += `${byte.toString(16).padStart(2, '0')} `;
        }
        memContent += '\n';
    }
    memoryDisplay.textContent = memContent;
}

function updateUI() {
    updateRegistersDisplay();
    // Update memory view around the PC or a fixed area
    const viewStartAddress = Math.max(0, cpu.registers.PC - 16) & 0xFFF0; // Show area around PC, aligned
    updateMemoryDisplay(viewStartAddress, 8);
    // Or uncomment to view the start of the Font ROM
    // updateMemoryDisplay(FONT_ROM_START_ADDRESS, 16);
}

// --- Event Listeners ---
stepButton.addEventListener('click', () => {
    cpu.stop(); // Ensure not in run mode
    cpu.step();
    updateUI();
});

runButton.addEventListener('click', () => {
    // Basic run - executes one step. Needs improvement for continuous run.
    // A real implementation would use requestAnimationFrame or setTimeout
    if (!cpu.isRunning) {
        cpu.run(); // Start running (currently just sets flag)
        // Simulate continuous running (replace with better timing later)
        const runInterval = setInterval(() => {
            if (cpu.isRunning) {
                cpu.step();
                updateUI();
            } else {
                clearInterval(runInterval);
                console.log("Run stopped by CPU state.");
                updateUI(); // Final update
            }
            // Add a condition to stop (e.g., specific instruction, PC loop)
            if (cpu.registers.PC > 0x0010) { // Example stop condition
                 cpu.stop();
            }
        }, 50); // Interval for simulation speed
    } else {
        cpu.stop();
    }
    updateUI(); // Update UI after button click
});


resetButton.addEventListener('click', () => {
    cpu.reset(); // Resets CPU and loads ROM
    // Load a simple test program *after* reset (if needed)
    loadTestProgram(); // Make sure this doesn't overwrite ROM
    updateUI();
    console.log("CPU Reset and test program loaded.");
});

// --- Initialization ---
function loadTestProgram() {
    // Simple program: LDA #$41 ('A'), STA $0200, JMP $0000
    // Ensure this program starts at an address below the ROM area (e.g., 0x0000)
    const program = [
        0xA9, 0x41,       // LDA #$41
        0x8D, 0x00, 0x02, // STA $0200
        0x4C, 0x00, 0x00, // JMP $0000
    ];
    // Load program at address 0x0000, well below FONT_ROM_START_ADDRESS
    cpu.loadProgram(program, 0x0000);
    cpu.registers.PC = 0x0000; // Set PC to start of program
}

// Initial setup
cpu.reset(); // CPU reset loads the ROM
loadTestProgram(); // Load user program
updateUI();
console.log("CPU Initialized.");

