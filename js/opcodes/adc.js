import { Registers } from '../registers.js'; // Import Registers for flag constants

/**
 * ADC - Add with Carry
 * Adds a value from memory and the Carry flag to the Accumulator.
 * Sets Carry (C), Zero (Z), Overflow (V), and Negative (N) flags.
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

    // Perform 8-bit addition
    const temp = accumulator + value + carry;
    const result = temp & 0xFF; // Result truncated to 8 bits

    // Set Carry Flag (C): Set if result > 255 (unsigned)
    cpu.registers.setCarryFlag(temp > 0xFF);

    // Set Zero Flag (Z): Set if result is 0
    // Set Negative Flag (N): Set if bit 7 of result is 1
    cpu.registers.setZNFlags(result);

    // Set Overflow Flag (V): Set if the sign of the result is wrong.
    // This happens if two positive numbers add to a negative,
    // or two negative numbers add to a positive.
    // Check if signs of operands are the same but different from the result's sign.
    // (~(A ^ M) & (A ^ R)) & 0x80
    const overflow = (~(accumulator ^ value) & (accumulator ^ result)) & 0x80;
    cpu.registers.setOverflowFlag(overflow !== 0);

    // Store the result in the accumulator
    cpu.registers.A = result;
}

// Add functions for other ADC addressing modes (Zero Page, Absolute, etc.) here
// export function zeroPage(cpu) { ... }
// export function absolute(cpu) { ... }
