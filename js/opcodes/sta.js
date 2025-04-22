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

/**
 * Executes STA (Indirect), Y.
 * Opcode: 0x91 (example)
 * Fetches a zero-page address. Reads the 16-bit base address from that ZP location.
 * Adds the Y register to the base address to get the final effective address.
 * Stores the accumulator value at the effective address.
 * Addressing Mode: Indirect Indexed Y
 * @param {CPU} cpu The CPU instance.
 */
export function indirectIndexedY(cpu) {
    const zeroPageAddress = cpu.fetchByte();

    // Read the 16-bit base address from the zero page location
    // Handle 6502 page boundary bug for indirect reads (optional but accurate)
    const lowByte = cpu.memory.read(zeroPageAddress);
    const highByteAddr = (zeroPageAddress + 1) & 0xFF; // Wrap around within zero page
    const highByte = cpu.memory.read(highByteAddr);
    const baseAddress = (highByte << 8) | lowByte;

    const effectiveAddress = (baseAddress + cpu.registers.Y) & 0xFFFF; // Add Y

    // STA indirect indexed Y typically doesn't have page cross penalty for the write itself.
    // The read of the base address might, but we don't model that level of cycle accuracy here yet.

    cpu.memory.write(effectiveAddress, cpu.registers.A);
}

/**
 * Executes STA Zero Page.
 * Opcode: 0x85 (example)
 * Fetches the zero-page address and stores the accumulator there.
 * Addressing Mode: Zero Page
 * @param {CPU} cpu The CPU instance.
 */
export function zeroPage(cpu) {
    const address = cpu.fetchByte();
    cpu.memory.write(address, cpu.registers.A);
}

// Add functions for other STA addressing modes (Zero Page, Absolute X, etc.) here
// export function zeroPage(cpu) { ... }
// export function absoluteX(cpu) { ... }
