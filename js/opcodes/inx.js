/**
 * INX - Increment X Register
 * Adds 1 to the X register.
 * Sets the Zero (Z) and Negative (N) flags based on the result.
 * Addressing Mode: Implied
 */

/**
 * Executes the INX instruction.
 * Opcode: 0xE8 (example)
 * @param {CPU} cpu The CPU instance.
 */
export function execute(cpu) {
    cpu.registers.X = (cpu.registers.X + 1) & 0xFF; // Increment and wrap around at 255
    cpu.registers.setZNFlags(cpu.registers.X);
}
