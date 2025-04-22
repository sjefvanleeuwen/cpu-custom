/**
 * JSR - Jump to Subroutine
 * Pushes the address of the instruction *after* JSR onto the stack (PC+2),
 * then sets the PC to the target subroutine address.
 * Addressing Mode: Absolute
 */

/**
 * Executes the JSR instruction.
 * Opcode: 0x20 (example)
 * @param {CPU} cpu The CPU instance.
 */
export function execute(cpu) {
    const targetAddress = cpu.fetchWord(); // Fetch the absolute address of the subroutine

    // Calculate the return address (address after the JSR instruction)
    // PC is already pointing after the fetched word, so PC-1 is the high byte of the return address
    const returnAddress = (cpu.registers.PC - 1) & 0xFFFF;

    // Push the return address onto the stack (high byte first, then low byte)
    cpu.pushStack((returnAddress >> 8) & 0xFF); // Push high byte
    cpu.pushStack(returnAddress & 0xFF);      // Push low byte

    // Set PC to the target subroutine address
    cpu.registers.PC = targetAddress;
}
