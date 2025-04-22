/**
 * JMP - Jump
 * Sets the Program Counter (PC) to a new address.
 */

/**
 * Executes JMP Absolute.
 * Opcode: 0x4C (example)
 * Fetches the next two bytes as the 16-bit address to jump to.
 * Addressing Mode: Absolute
 * @param {CPU} cpu The CPU instance.
 */
export function absolute(cpu) {
    const address = cpu.fetchWord(); // Fetch the 16-bit target address
    cpu.registers.PC = address; // Set PC to the target address
}

// Add functions for other JMP addressing modes (Indirect) here
// export function indirect(cpu) { ... }
