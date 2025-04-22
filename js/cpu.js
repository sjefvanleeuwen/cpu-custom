import { Memory } from './memory.js';
import { Registers } from './registers.js';
import { opcodes } from './opcodes/index.js'; // Import the opcode map
import { asciiFontRomData } from './roms/ascii.js'; // Import the generated font ROM data
import { FONT_ROM_START_ADDRESS } from './constants.js'; // Import ROM address constant

/**
 * Simulates the main CPU logic.
 */
export class CPU {
    constructor() {
        this.memory = new Memory();
        this.registers = new Registers();
        this.opcodes = opcodes; // Map of opcode byte -> instruction function
        this.cycles = 0; // Clock cycle counter for the current instruction
        this.totalCycles = 0; // Total clock cycles executed
        this.isRunning = false;
        this.reset();
    }

    /** Resets the CPU state. */
    reset() {
        this.registers.reset();
        this.memory.reset(); // Reset RAM first

        // Load the Font ROM into its fixed memory location
        this.loadFontRom();

        // Typically, PC is set to the address pointed to by the reset vector
        // For simplicity, let's assume the reset vector is at 0xFFFC/0xFFFD
        // and points to 0x8000 or a user-defined start address.
        // We'll just set it to 0 for now, assuming program starts there.
        // A more realistic approach:
        // this.memory.write(0xFFFC, 0x00); // Low byte of reset vector
        // this.memory.write(0xFFFD, 0x80); // High byte of reset vector
        // this.registers.PC = this.fetchWord(0xFFFC);
        this.registers.PC = 0x0000; // Simple start
        this.cycles = 0;
        this.totalCycles = 0;
        this.isRunning = false;
        console.log("CPU Reset.");
    }

    /** Loads the font ROM data into memory. */
    loadFontRom() {
        if (asciiFontRomData) {
            this.memory.loadProgram(asciiFontRomData, FONT_ROM_START_ADDRESS);
            console.log(`Font ROM loaded at 0x${FONT_ROM_START_ADDRESS.toString(16)} (${asciiFontRomData.length} bytes).`);
        } else {
            console.error("Font ROM data not available to load.");
        }
    }

    /** Fetches the next byte from memory using the Program Counter. */
    fetchByte() {
        const byte = this.memory.read(this.registers.PC);
        this.registers.PC = (this.registers.PC + 1) & 0xFFFF; // Increment PC, handle wrap-around
        this.cycles++; // Increment cycle count for fetch
        this.totalCycles++;
        return byte;
    }

    /** Fetches the next word (16-bit) from memory using the Program Counter. */
    fetchWord() {
        const lowByte = this.fetchByte();
        const highByte = this.fetchByte();
        return (highByte << 8) | lowByte;
    }

    /** Pushes a byte onto the stack. */
    pushStack(value) {
        // Stack grows downwards from 0x01FF
        const stackAddress = 0x0100 | this.registers.SP;
        this.memory.write(stackAddress, value & 0xFF);
        this.registers.SP = (this.registers.SP - 1) & 0xFF; // Decrement stack pointer, wrap around
    }

    /** Pops a byte from the stack. */
    popStack() {
        // Stack grows downwards, so increment SP first
        this.registers.SP = (this.registers.SP + 1) & 0xFF; // Increment stack pointer, wrap around
        const stackAddress = 0x0100 | this.registers.SP;
        return this.memory.read(stackAddress);
    }

    /** Executes a single instruction cycle (fetch-decode-execute). */
    step() {
        if (!this.isRunning && this.cycles > 0) {
            // If paused mid-instruction, just decrement cycles
            this.cycles--;
            return;
        }

        const startCycles = this.totalCycles;
        const startPC = this.registers.PC;

        const opcodeByte = this.fetchByte();
        const instruction = this.opcodes[opcodeByte];

        if (instruction) {
            console.log(`PC: 0x${startPC.toString(16).padStart(4, '0')} - Executing Opcode 0x${opcodeByte.toString(16).padStart(2, '0')} (${instruction.name})`);
            instruction.execute(this); // Pass CPU instance to the instruction
            // Instruction execution might add more cycles
            this.cycles += instruction.cycles - 1; // Subtract the initial fetch cycle already counted
            this.totalCycles += instruction.cycles -1;
        } else {
            console.error(`PC: 0x${startPC.toString(16).padStart(4, '0')} - Unknown Opcode: 0x${opcodeByte.toString(16).padStart(2, '0')}`);
            // Handle illegal opcode - maybe halt, trigger interrupt, or just NOP
            this.isRunning = false; // Halt on unknown opcode for now
        }

        // Log state change or instruction details if needed
        // console.log(`  Cycles for instruction: ${this.totalCycles - startCycles}`);
    }

    /** Runs the CPU continuously (or until halted/breakpoint). */
    run() {
        this.isRunning = true;
        // Basic run loop - in a real browser env, use requestAnimationFrame or setTimeout
        // to avoid blocking the UI and simulate clock speed.
        console.log("CPU Run started.");
        // This is a placeholder. A real run loop needs timing control.
        // For now, just execute one step when run is called.
        // A better approach:
        // this.runInterval = setInterval(() => {
        //     if (this.isRunning) {
        //         this.step();
        //     } else {
        //         clearInterval(this.runInterval);
        //         console.log("CPU Run stopped.");
        //     }
        // }, 1); // Adjust interval for desired speed
        if (this.isRunning) {
             this.step(); // Execute one step for now
             // To run multiple steps quickly:
             // for(let i=0; i<100 && this.isRunning; i++) { this.step(); }
        }
    }

    /** Stops the CPU run loop. */
    stop() {
        this.isRunning = false;
        // if (this.runInterval) {
        //     clearInterval(this.runInterval);
        //     this.runInterval = null;
        // }
        console.log("CPU Run stopped.");
    }

    /** Loads a program into memory (use for user programs, not ROM). */
    loadProgram(program, startAddress = 0) {
        // Optional: Add check to prevent loading over ROM area?
        if (startAddress >= FONT_ROM_START_ADDRESS && startAddress < (FONT_ROM_START_ADDRESS + asciiFontRomData.length)) {
            console.warn(`Attempting to load program over Font ROM area (0x${FONT_ROM_START_ADDRESS.toString(16)}). Aborting load.`);
            return;
        }
        if ((startAddress + program.length) > FONT_ROM_START_ADDRESS && startAddress < FONT_ROM_START_ADDRESS) {
             console.warn(`Attempting to load program that overlaps Font ROM area (0x${FONT_ROM_START_ADDRESS.toString(16)}). Aborting load.`);
             return;
        }

        this.memory.loadProgram(program, startAddress);
        // Optionally set PC to start address after loading
        // this.registers.PC = startAddress;
    }
}
