/**
 * STA - Store Accumulator
 * Stores the value of the Accumulator (A register) into memory.
 * Does not affect any flags.
 */

/**
 * Executes STA Absolute.
 * Opcode: 0x8D (example)
 * Fetches the next two bytes as the 16-bit address to store the accumulator value.
 * Addressing Mode: Absolute
 * @param {CPU} cpu The CPU instance.
 */
export function absolute(cpu) {
    const address = cpu.fetchWord(); // Fetch the 16-bit address
    cpu.memory.write(address, cpu.registers.A);
}

/**
 * Executes STA Absolute, Y.
 * Opcode: 0x99 (example)
 * Fetches a 16-bit base address, adds the Y register to it,
 * and stores the accumulator value at the resulting address.
 * Addressing Mode: Absolute, Y
 * @param {CPU} cpu The CPU instance.
 */
export function absoluteY(cpu) {
    const baseAddress = cpu.fetchWord();
    const effectiveAddress = (baseAddress + cpu.registers.Y) & 0xFFFF; // Add Y and handle wrap-around

    // Note: STA Absolute, Y typically doesn't have a page boundary cycle penalty.

    cpu.memory.write(effectiveAddress, cpu.registers.A);
}

/**
 * Executes STA Absolute, X.
 * Opcode: 0x9D (example)
 * Fetches a 16-bit base address, adds the X register to it,
 * and stores the accumulator value at the resulting address.
 * Addressing Mode: Absolute, X
 * @param {CPU} cpu The CPU instance.
 */
export function absoluteX(cpu) {
    const baseAddress = cpu.fetchWord();
    const effectiveAddress = (baseAddress + cpu.registers.X) & 0xFFFF; // Add X

    // STA Absolute, X typically doesn't have a page boundary cycle penalty.

    cpu.memory.write(effectiveAddress, cpu.registers.A);
}

// Add functions for other STA addressing modes (Zero Page, Absolute X, etc.) here
// export function zeroPage(cpu) { ... }
// export function absoluteX(cpu) { ... }
