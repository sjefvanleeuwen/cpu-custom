/**
 * BEQ - Branch if Equal (Zero flag is set)
 * If the Zero flag (Z) is 1, adds a relative offset to the Program Counter (PC).
 * Addressing Mode: Relative
 */

/**
 * Executes the BEQ instruction.
 * Opcode: 0xF0 (example)
 * @param {CPU} cpu The CPU instance.
 */
export function execute(cpu) {
    const offset = cpu.fetchByte(); // Fetch the relative offset (-128 to +127)
    let signedOffset = offset;
    if (signedOffset > 127) {
        signedOffset = signedOffset - 256; // Convert to signed value
    }

    if (cpu.registers.getZeroFlag()) { // Branch if Z flag is set
        const oldPC = cpu.registers.PC;
        const targetAddress = (oldPC + signedOffset) & 0xFFFF; // Calculate target address

        // Add cycles for taking the branch
        cpu.cycles++;
        cpu.totalCycles++;

        // Add extra cycle if page boundary is crossed during branch
        if ((oldPC & 0xFF00) !== (targetAddress & 0xFF00)) {
            cpu.cycles++;
            cpu.totalCycles++;
        }

        cpu.registers.PC = targetAddress; // Set PC to the target address
    }
    // If branch is not taken, PC has already been incremented by fetchByte.
}
