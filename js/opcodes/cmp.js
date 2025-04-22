import { Registers } from '../registers.js'; // Import for flag constants

/**
 * CMP - Compare Accumulator
 * Compares the value in the Accumulator (A) with a value from memory.
 * Sets Zero (Z), Negative (N), and Carry (C) flags.
 * Z is set if A == value.
 * N is set if bit 7 of (A - value) is 1.
 * C is set if A >= value (unsigned comparison).
 */

/**
 * Executes CMP Immediate.
 * Opcode: 0xC9 (example)
 * Fetches the next byte as the value to compare with A.
 * Addressing Mode: Immediate
 * @param {CPU} cpu The CPU instance.
 */
export function immediate(cpu) {
    const value = cpu.fetchByte();
    const accumulator = cpu.registers.A;
    const result = (accumulator - value) & 0xFF; // Perform subtraction (result not stored)

    cpu.registers.setZeroFlag(accumulator === value); // Z = 1 if A == value
    cpu.registers.setNegativeFlag((result & 0x80) !== 0); // N = 1 if bit 7 of result is 1
    cpu.registers.setCarryFlag(accumulator >= value); // C = 1 if A >= value (no borrow)
}

// Add functions for other CMP addressing modes (Zero Page, Absolute, etc.) here
// export function zeroPage(cpu) { ... }
// export function absolute(cpu) { ... }
