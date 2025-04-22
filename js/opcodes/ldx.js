/**
 * LDX - Load X Register
 * Loads a byte from memory into the X register.
 * Sets the Zero (Z) and Negative (N) flags based on the value loaded.
 */

/**
 * Executes LDX Immediate.
 * Opcode: 0xA2 (example)
 * Fetches the next byte directly as the value to load.
 * Addressing Mode: Immediate
 * @param {CPU} cpu The CPU instance.
 */
export function immediate(cpu) {
    const value = cpu.fetchByte(); // Fetch the immediate value
    cpu.registers.X = value;
    cpu.registers.setZNFlags(value);
}

// Add functions for other LDX addressing modes (Zero Page, Absolute, etc.) here
// export function zeroPage(cpu) { ... }
// export function absolute(cpu) { ... }
