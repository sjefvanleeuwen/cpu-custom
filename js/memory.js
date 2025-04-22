import { FONT_ROM_START_ADDRESS, FONT_ROM_END_ADDRESS } from './constants.js'; // Import ROM address constants

/**
 * Simulates 8-bit addressable memory.
 * For simplicity, using a standard JavaScript array.
 * A real 8-bit system would have 65536 bytes (0x0000 to 0xFFFF).
 */
export class Memory {
    constructor(size = 65536) {
        this.memory = new Uint8Array(size); // Use Uint8Array for 8-bit values
        this.size = size;
        this.reset();
    }

    /** Resets all memory locations to 0. */
    reset() {
        this.memory.fill(0);
    }

    /** Reads a byte from the specified address. */
    read(address) {
        if (address < 0 || address >= this.size) {
            console.error(`Memory read out of bounds: 0x${address.toString(16)}`);
            // Handle error appropriately, maybe return 0 or throw an error
            return 0; // Or throw new Error('Memory read out of bounds');
        }
        return this.memory[address];
    }

    /** Writes a byte to the specified address. */
    write(address, value) {
        if (address < 0 || address >= this.size) {
            console.error(`Memory write out of bounds: 0x${address.toString(16)}`);
            // Handle error appropriately
            return; // Or throw new Error('Memory write out of bounds');
        }
        // Prevent writing to the Font ROM area after initialization
        if (address >= FONT_ROM_START_ADDRESS && address <= FONT_ROM_END_ADDRESS) {
             // Allow initial loading but prevent runtime writes.
             // A more robust way might involve a flag set after ROM loading.
             // For now, we'll rely on the CPU loading it once during reset.
             // If we want strict read-only, we need a way to know if it's the initial load.
             // console.warn(`Attempted write to read-only ROM address: 0x${address.toString(16)}`);
             // return;
             // For now, allow writing for initial load, but be aware this isn't strictly enforced read-only yet.
        }
        // Ensure value is an 8-bit value
        this.memory[address] = value & 0xFF;
    }

    /** Loads a program (array of bytes) starting at a specific address. */
    loadProgram(program, startAddress = 0) {
        if (!program || program.length === 0) {
            console.warn("Attempted to load an empty program.");
            return;
        }
        if (startAddress + program.length > this.size) {
            console.error("Program too large to fit in memory at the specified address.");
            return; // Or throw an Error
        }
        program.forEach((byte, index) => {
            this.write(startAddress + index, byte);
        });
        console.log(`Program loaded at 0x${startAddress.toString(16)}. Size: ${program.length} bytes.`);
    }

    /** Returns a slice of memory for display purposes. */
    getMemorySlice(startAddress, length) {
        return this.memory.slice(startAddress, startAddress + length);
    }
}
