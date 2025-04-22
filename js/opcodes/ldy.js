/**
 * LDY - Load Y Register
 * Loads a byte from memory into the Y register.
 * Sets the Zero (Z) and Negative (N) flags based on the value loaded.
 */

/**
 * Executes LDY Immediate.
 * Opcode: 0xA0 (example)
 * Fetches the next byte directly as the value to load.
 * Addressing Mode: Immediate
 * @param {CPU} cpu The CPU instance.
 */
export function immediate(cpu) {
    const value = cpu.fetchByte(); // Fetch the immediate value
    cpu.registers.Y = value;
    cpu.registers.setZNFlags(value);
}

// Add functions for other LDY addressing modes (Zero Page, Absolute, etc.) here
// export function zeroPage(cpu) { ... }
// export function absolute(cpu) { ... }
