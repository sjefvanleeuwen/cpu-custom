import { Registers } from '../registers.js'; // Import for flag constants

/**
 * CPY - Compare Y Register
 * Compares the value in the Y register with a value from memory.
 * Sets Zero (Z), Negative (N), and Carry (C) flags.
 * Z is set if Y == value.
 * N is set if bit 7 of (Y - value) is 1.
 * C is set if Y >= value (unsigned comparison).
 */

/**
 * Executes CPY Immediate.
 * Opcode: 0xC0 (example)
 * Fetches the next byte as the value to compare with Y.
 * Addressing Mode: Immediate
 * @param {CPU} cpu The CPU instance.
 */
export function immediate(cpu) {
    const value = cpu.fetchByte();
    const registerY = cpu.registers.Y;
    const result = (registerY - value) & 0xFF; // Perform subtraction (result not stored)

    cpu.registers.setZeroFlag(registerY === value); // Z = 1 if Y == value
    cpu.registers.setNegativeFlag((result & 0x80) !== 0); // N = 1 if bit 7 of result is 1
    cpu.registers.setCarryFlag(registerY >= value); // C = 1 if Y >= value (no borrow)
}

// Add functions for other CPY addressing modes (Zero Page, Absolute) here
// export function zeroPage(cpu) { ... }
// export function absolute(cpu) { ... }
