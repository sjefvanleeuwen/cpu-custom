import * as NOP from './nop.js';
import * as LDA from './lda.js';
import * as STA from './sta.js';
import * as JMP from './jmp.js';
import * as LDX from './ldx.js'; // Import LDX
import * as STX from './stx.js'; // Import STX
import * as ADC from './adc.js'; // Import ADC
import * as LDY from './ldy.js'; // Import LDY
import * as INY from './iny.js'; // Import INY
import * as CPY from './cpy.js'; // Import CPY
import * as BNE from './bne.js'; // Import BNE
import * as INX from './inx.js'; // Import INX
import * as CMP from './cmp.js'; // Import CMP
import * as BEQ from './beq.js'; // Import BEQ
import * as JSR from './jsr.js'; // Import JSR
import * as RTS from './rts.js'; // Import RTS
import * as DEX from './dex.js'; // Import DEX
import * as BPL from './bpl.js'; // Import BPL
// Import other opcodes here as they are created

// Map of opcode byte value to instruction object
// This needs to be defined based on your chosen instruction set encoding
export const opcodes = {
    // Example Opcodes (using common 6502 values for illustration)
    0xEA: { name: 'NOP', execute: NOP.execute, cycles: 2, addressingMode: 'implied' }, // NOP Implied
    0xA9: { name: 'LDA_IMM', execute: LDA.immediate, cycles: 2, addressingMode: 'immediate' }, // LDA Immediate
    0x8D: { name: 'STA_ABS', execute: STA.absolute, cycles: 4, addressingMode: 'absolute' }, // STA Absolute
    0x4C: { name: 'JMP_ABS', execute: JMP.absolute, cycles: 3, addressingMode: 'absolute' },

    // New Opcodes
    0xA2: { name: 'LDX_IMM', execute: LDX.immediate, cycles: 2, addressingMode: 'immediate' }, // LDX Immediate
    0x86: { name: 'STX_ZP', execute: STX.zeroPage, cycles: 3, addressingMode: 'zeroPage' },   // STX Zero Page
    0x69: { name: 'ADC_IMM', execute: ADC.immediate, cycles: 2, addressingMode: 'immediate' }, // ADC Immediate
    0xA0: { name: 'LDY_IMM', execute: LDY.immediate, cycles: 2, addressingMode: 'immediate' }, // LDY Immediate
    0xB9: { name: 'LDA_ABSY', execute: LDA.absoluteY, cycles: 4, addressingMode: 'absoluteY' }, // LDA Absolute, Y (+1 cycle if page crossed)
    0x99: { name: 'STA_ABSY', execute: STA.absoluteY, cycles: 5, addressingMode: 'absoluteY' }, // STA Absolute, Y
    0xC8: { name: 'INY', execute: INY.execute, cycles: 2, addressingMode: 'implied' },       // INY Implied
    0xC0: { name: 'CPY_IMM', execute: CPY.immediate, cycles: 2, addressingMode: 'immediate' }, // CPY Immediate
    0xD0: { name: 'BNE', execute: BNE.execute, cycles: 2, addressingMode: 'relative' },      // BNE Relative (+1 cycle if branch taken, +1 if page crossed)
    0xBD: { name: 'LDA_ABSX', execute: LDA.absoluteX, cycles: 4, addressingMode: 'absoluteX' }, // LDA Absolute, X (+1 cycle if page crossed)
    0x9D: { name: 'STA_ABSX', execute: STA.absoluteX, cycles: 5, addressingMode: 'absoluteX' }, // STA Absolute, X
    0xE8: { name: 'INX', execute: INX.execute, cycles: 2, addressingMode: 'implied' },       // INX Implied
    0xC9: { name: 'CMP_IMM', execute: CMP.immediate, cycles: 2, addressingMode: 'immediate' }, // CMP Immediate
    0xF0: { name: 'BEQ', execute: BEQ.execute, cycles: 2, addressingMode: 'relative' },      // BEQ Relative (+1 cycle if branch taken, +1 if page crossed)
    0x20: { name: 'JSR', execute: JSR.execute, cycles: 6, addressingMode: 'absolute' }, // JSR Absolute
    0x60: { name: 'RTS', execute: RTS.execute, cycles: 6, addressingMode: 'implied' },  // RTS Implied
    0xCA: { name: 'DEX', execute: DEX.execute, cycles: 2, addressingMode: 'implied' },       // DEX Implied
    0x91: { name: 'STA_IND_Y', execute: STA.indirectIndexedY, cycles: 6, addressingMode: 'indirectIndexedY' }, // STA (Indirect), Y
    0x10: { name: 'BPL', execute: BPL.execute, cycles: 2, addressingMode: 'relative' },      // BPL Relative (+1 cycle if branch taken, +1 if page crossed)
    0xA5: { name: 'LDA_ZP', execute: LDA.zeroPage, cycles: 3, addressingMode: 'zeroPage' },       // LDA Zero Page
    0x85: { name: 'STA_ZP', execute: STA.zeroPage, cycles: 3, addressingMode: 'zeroPage' },       // STA Zero Page
    0xB1: { name: 'LDA_IND_Y', execute: LDA.indirectIndexedY, cycles: 5, addressingMode: 'indirectIndexedY' }, // LDA (Indirect), Y (+1 cycle if page crossed)

    // Add other opcodes and addressing modes here
    // e.g., LDA Zero Page, STA Absolute Y, JMP Indirect etc.
};

// You might want separate functions for different addressing modes within LDA.js, STA.js etc.
// Or, the execute function itself can determine the mode based on the opcode byte.
// The current structure assumes one execute function per specific opcode byte.
