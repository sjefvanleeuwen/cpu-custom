/**
 * DEX - Decrement X Register
 * Subtracts 1 from the X register.
 * Sets the Zero (Z) and Negative (N) flags based on the result.
 * Addressing Mode: Implied
 */

/**
 * Executes the DEX instruction.
 * Opcode: 0xCA (example)
 * @param {CPU} cpu The CPU instance.
 */
export function execute(cpu) {
    cpu.registers.X = (cpu.registers.X - 1) & 0xFF; // Decrement and wrap around (0 -> 255)
    cpu.registers.setZNFlags(cpu.registers.X);
}
