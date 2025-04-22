/**
 * INY - Increment Y Register
 * Adds 1 to the Y register.
 * Sets the Zero (Z) and Negative (N) flags based on the result.
 * Addressing Mode: Implied
 */

/**
 * Executes the INY instruction.
 * Opcode: 0xC8 (example)
 * @param {CPU} cpu The CPU instance.
 */
export function execute(cpu) {
    cpu.registers.Y = (cpu.registers.Y + 1) & 0xFF; // Increment and wrap around at 255
    cpu.registers.setZNFlags(cpu.registers.Y);
}
