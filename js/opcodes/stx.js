/**
 * STX - Store X Register
 * Stores the value of the X register into memory.
 * Does not affect any flags.
 */

/**
 * Executes STX Zero Page.
 * Opcode: 0x86 (example)
 * Fetches the next byte as the zero-page address (0x00xx).
 * Addressing Mode: Zero Page
 * @param {CPU} cpu The CPU instance.
 */
export function zeroPage(cpu) {
    const address = cpu.fetchByte(); // Fetch the 8-bit zero-page address
    cpu.memory.write(address, cpu.registers.X);
}

// Add functions for other STX addressing modes (Zero Page Y, Absolute) here
// export function zeroPageY(cpu) { ... }
// export function absolute(cpu) { ... }
