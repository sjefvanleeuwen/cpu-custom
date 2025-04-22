/**
 * RTS - Return from Subroutine
 * Pulls the return address (low byte, then high byte) from the stack,
 * increments it by one, and sets the PC to the result.
 * Addressing Mode: Implied
 */

/**
 * Executes the RTS instruction.
 * Opcode: 0x60 (example)
 * @param {CPU} cpu The CPU instance.
 */
export function execute(cpu) {
    // Pull the return address from the stack (low byte first, then high byte)
    const lowByte = cpu.popStack();
    const highByte = cpu.popStack();
    const returnAddress = (highByte << 8) | lowByte;

    // Set PC to the return address + 1 (to point to the instruction *after* JSR)
    cpu.registers.PC = (returnAddress + 1) & 0xFFFF;
}
