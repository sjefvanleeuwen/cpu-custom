/**
 * STX - Store X Register
 * Stores the value of the X register into memory.
 */

/**
 * Executes STX Zero Page.
 * Opcode: 0x86 (example)
 * Fetches the zero-page address and stores X there.
 * Addressing Mode: Zero Page
 * @param {CPU} cpu The CPU instance.
 */
export function zeroPage(cpu) {
    const address = cpu.fetchByte();
    cpu.memory.write(address, cpu.registers.X);
}

// Add functions for other STX addressing modes (Absolute, Zero Page, Y) here
// export function absolute(cpu) { ... }
// export function zeroPageY(cpu) { ... }
