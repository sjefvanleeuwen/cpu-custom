/**
 * LDA - Load Accumulator
 * Loads a byte from memory into the Accumulator (A register).
 * Sets the Zero (Z) and Negative (N) flags based on the value loaded.
 */

/**
 * Executes LDA Immediate.
 * Opcode: 0xA9 (example)
 * Fetches the next byte directly as the value to load.
 * Addressing Mode: Immediate
 * @param {CPU} cpu The CPU instance.
 */
export function immediate(cpu) {
    const value = cpu.fetchByte(); // Fetch the immediate value
    cpu.registers.A = value;

    // Set Flags
    // Zero Flag (Z): Set if A is 0
    cpu.registers.P = (value === 0)
        ? (cpu.registers.P | 0b00000010) // Set Z flag
        : (cpu.registers.P & 0b11111101); // Clear Z flag

    // Negative Flag (N): Set if bit 7 of A is 1
    cpu.registers.P = (value & 0b10000000)
        ? (cpu.registers.P | 0b10000000) // Set N flag
        : (cpu.registers.P & 0b01111111); // Clear N flag
}

/**
 * Executes LDA Absolute, Y.
 * Opcode: 0xB9 (example)
 * Fetches a 16-bit base address, adds the Y register to it,
 * and loads the byte from the resulting address.
 * Addressing Mode: Absolute, Y
 * @param {CPU} cpu The CPU instance.
 */
export function absoluteY(cpu) {
    const baseAddress = cpu.fetchWord();
    const effectiveAddress = (baseAddress + cpu.registers.Y) & 0xFFFF; // Add Y and handle wrap-around

    // Cycle penalty if page boundary is crossed (optional but common in 6502)
    // if ((baseAddress & 0xFF00) !== (effectiveAddress & 0xFF00)) {
    //     cpu.cycles++;
    //     cpu.totalCycles++;
    // }

    const value = cpu.memory.read(effectiveAddress);
    cpu.registers.A = value;
    cpu.registers.setZNFlags(value);
}

/**
 * Executes LDA Absolute, X.
 * Opcode: 0xBD (example)
 * Fetches a 16-bit base address, adds the X register to it,
 * and loads the byte from the resulting address.
 * Addressing Mode: Absolute, X
 * @param {CPU} cpu The CPU instance.
 */
export function absoluteX(cpu) {
    const baseAddress = cpu.fetchWord();
    const effectiveAddress = (baseAddress + cpu.registers.X) & 0xFFFF; // Add X

    // Cycle penalty if page boundary is crossed
    if ((baseAddress & 0xFF00) !== (effectiveAddress & 0xFF00)) {
        cpu.cycles++;
        cpu.totalCycles++;
    }

    const value = cpu.memory.read(effectiveAddress);
    cpu.registers.A = value;
    cpu.registers.setZNFlags(value);
}

// Add functions for other LDA addressing modes (Zero Page, Absolute, etc.) here
// export function zeroPage(cpu) { ... }
// export function absolute(cpu) { ... }
