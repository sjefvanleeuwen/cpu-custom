/**
 * NOP - No Operation
 * Opcode: 0xEA (example)
 * Does nothing except consume cycles and advance the PC.
 * Addressing Mode: Implied
 */

/**
 * Executes the NOP instruction.
 * @param {CPU} cpu The CPU instance.
 */
export function execute(cpu) {
    // No operation performed on registers or memory.
    // PC is already advanced by the fetch cycle in cpu.step()
    // Cycles are handled by the mapping in opcodes/index.js
}
