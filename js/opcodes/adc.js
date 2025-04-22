import { Registers } from '../registers.js'; // Import Registers for flag constants

/**
 * ADC - Add with Carry
 * Adds the value from memory and the Carry flag to the Accumulator.
 * Sets Carry, Zero, Negative, and Overflow flags.
 */

/**
 * Executes ADC Immediate.
 * Opcode: 0x69 (example)
 * Fetches the next byte as the value to add.
 * Addressing Mode: Immediate
 * @param {CPU} cpu The CPU instance.
 */
export function immediate(cpu) {
    const value = cpu.fetchByte();
    const accumulator = cpu.registers.A;
    const carry = cpu.registers.getCarryFlag() ? 1 : 0;

    const temp = accumulator + value + carry;
    const result = temp & 0xFF;

    cpu.registers.A = result;

    // Set Flags
    cpu.registers.setCarryFlag(temp > 0xFF);
    cpu.registers.setZeroFlag(result === 0);
    cpu.registers.setNegativeFlag((result & 0x80) !== 0);

    // Overflow Flag Logic:
    // Overflow occurs if the sign of both inputs is the same,
    // and the sign of the result is different.
    // (A ^ value) & 0x80 -> checks if signs are different (if so, no overflow possible)
    // (A ^ result) & 0x80 -> checks if sign of A and result are different
    const overflow = (~(accumulator ^ value) & (accumulator ^ result)) & 0x80;
    cpu.registers.setOverflowFlag(overflow !== 0);
}

// Add functions for other ADC addressing modes here
// export function zeroPage(cpu) { ... }
// export function absolute(cpu) { ... }
