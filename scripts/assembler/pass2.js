import { OPCODES, getOpcode } from './constants.js';
import { parseOperand, parseByteDirective, parseAsciizDirective } from './parser.js';

/**
 * Runs the second pass of the assembler.
 * Generates the final byte code.
 * @param {object[]} pass1Lines Array of processed lines from Pass 1.
 * @param {object} labels Map of labels from Pass 1.
 * @param {object} constants Map of constants from Pass 1.
 * @returns {{outputBytes: Map<number, number>, errors: string[]}}
 */
export function runPass2(pass1Lines, labels, constants) {
    const outputBytes = new Map();
    const errors = [];

    pass1Lines.forEach(lineInfo => {
        const { text, address, lineNumber, mnemonic, operands } = lineInfo;

        try {
            let bytes = [];

            if (mnemonic === '.BYTE') {
                bytes = parseByteDirective(text, labels, constants, lineNumber);
            } else if (mnemonic === '.ASCIIZ') {
                try {
                    const str = parseAsciizDirective(text, lineNumber);
                    // Write each character's ASCII value followed by null terminator
                    for (let i = 0; i < str.length; i++) {
                        outputBytes.set(address + i, str.charCodeAt(i));
                    }
                    outputBytes.set(address + str.length, 0); // Null terminator
                } catch (error) {
                    errors.push(`[Line ${lineNumber}] ${error.message}`);
                }
            } else {
                // --- Handle Instructions ---
                const operand1Raw = operands.length > 0 ? operands[0] : null;
                const operand2Raw = operands.length > 1 ? operands[1] : null;
                let opcode;

                // Determine Opcode based on mnemonic and operands
                // This needs refinement based on parsed operand values for ZP/ABS ambiguity
                if (mnemonic === 'LDX' && operand1Raw?.startsWith('#')) opcode = OPCODES.LDX_IMM;
                else if (mnemonic === 'LDY' && operand1Raw?.startsWith('#')) opcode = OPCODES.LDY_IMM;
                else if (mnemonic === 'LDA' && operand1Raw?.startsWith('#')) opcode = OPCODES.LDA_IMM;
                else if (mnemonic === 'ADC' && operand1Raw?.startsWith('#')) opcode = OPCODES.ADC_IMM;
                else if (mnemonic === 'CMP' && operand1Raw?.startsWith('#')) opcode = OPCODES.CMP_IMM;
                else if (mnemonic === 'CPY' && operand1Raw?.startsWith('#')) opcode = OPCODES.CPY_IMM;
                else if (mnemonic === 'STX' && operands.length === 1) opcode = OPCODES.STX_ZP; // Assume ZP for now
                else if (mnemonic === 'STA' && operands.length === 1) opcode = OPCODES.STA_ZP; // Assume ZP for now
                else if (mnemonic === 'LDA' && operands.length === 1) opcode = OPCODES.LDA_ZP; // Assume ZP for now
                else if (mnemonic === 'LDA' && operand2Raw?.toUpperCase() === 'Y' && text.includes('(')) opcode = OPCODES.LDA_IND_Y;
                else if (mnemonic === 'STA' && operand2Raw?.toUpperCase() === 'Y' && text.includes('(')) opcode = OPCODES.STA_IND_Y;
                else if (mnemonic === 'LDA' && operand2Raw?.toUpperCase() === 'Y') opcode = OPCODES.LDA_ABS_Y;
                else if (mnemonic === 'STA' && operand2Raw?.toUpperCase() === 'Y') opcode = OPCODES.STA_ABS_Y;
                else if (mnemonic === 'LDA' && operand2Raw?.toUpperCase() === 'X') opcode = OPCODES.LDA_ABS_X; // Added from original
                else if (mnemonic === 'STA' && operand2Raw?.toUpperCase() === 'X') opcode = OPCODES.STA_ABS_X; // Added from original
                else if (mnemonic === 'INX') opcode = OPCODES.INX;
                else if (mnemonic === 'INY') opcode = OPCODES.INY;
                else if (mnemonic === 'DEX') opcode = OPCODES.DEX;
                else if (mnemonic === 'CLC') opcode = OPCODES.CLC;
                else if (mnemonic === 'SEC') opcode = OPCODES.SEC;
                else if (mnemonic === 'RTS') opcode = OPCODES.RTS;
                else if (mnemonic === 'NOP') opcode = OPCODES.NOP;
                else if (mnemonic === 'BEQ') opcode = OPCODES.BEQ_REL;
                else if (mnemonic === 'BNE') opcode = OPCODES.BNE_REL;
                else if (mnemonic === 'BPL') opcode = OPCODES.BPL_REL;
                else if (mnemonic === 'JMP') opcode = OPCODES.JMP_ABS;
                else if (mnemonic === 'JSR') opcode = OPCODES.JSR_ABS;
                // Add more specific opcode lookups here

                if (opcode === undefined) {
                    throw new Error(`Pass 2: Cannot determine opcode for: ${text}`);
                }
                bytes.push(opcode);

                // Add operand bytes based on addressing mode implied by opcode/operands
                // Immediate
                if ([OPCODES.LDX_IMM, OPCODES.LDY_IMM, OPCODES.LDA_IMM, OPCODES.ADC_IMM, OPCODES.CMP_IMM, OPCODES.CPY_IMM].includes(opcode)) {
                    bytes.push(parseOperand(operand1Raw, labels, constants, lineNumber) & 0xFF);
                }
                // Zero Page
                else if ([OPCODES.STX_ZP, OPCODES.STA_ZP, OPCODES.LDA_ZP].includes(opcode)) {
                    bytes.push(parseOperand(operand1Raw, labels, constants, lineNumber) & 0xFF);
                }
                // Absolute
                else if ([OPCODES.JMP_ABS, OPCODES.JSR_ABS].includes(opcode)) {
                    const addr = parseOperand(operand1Raw, labels, constants, lineNumber);
                    bytes.push(addr & 0xFF); // Low byte
                    bytes.push((addr >> 8) & 0xFF); // High byte
                }
                // Absolute, X/Y
                else if ([OPCODES.LDA_ABS_X, OPCODES.STA_ABS_X, OPCODES.LDA_ABS_Y, OPCODES.STA_ABS_Y].includes(opcode)) {
                     const addr = parseOperand(operand1Raw, labels, constants, lineNumber);
                     bytes.push(addr & 0xFF); // Low byte
                     bytes.push((addr >> 8) & 0xFF); // High byte
                }
                 // Indirect Indexed Y
                else if ([OPCODES.LDA_IND_Y, OPCODES.STA_IND_Y].includes(opcode)) {
                    // Operand is the zero page address containing the pointer base
                    const zpAddr = parseOperand(operand1Raw.replace(/[()]/g, ''), labels, constants, lineNumber); // Remove parens
                    bytes.push(zpAddr & 0xFF);
                }
                // Relative
                else if ([OPCODES.BEQ_REL, OPCODES.BNE_REL, OPCODES.BPL_REL].includes(opcode)) {
                    const targetAddress = parseOperand(operand1Raw, labels, constants, lineNumber);
                    const pcAfterFetch = address + 2;
                    const offset = targetAddress - pcAfterFetch;
                    if (offset < -128 || offset > 127) {
                        throw new Error(`Branch target out of range: ${offset}`);
                    }
                    bytes.push(offset & 0xFF);
                }
                // Implied opcodes already handled (only opcode byte pushed)
            }

            // Store generated bytes
            for (let i = 0; i < bytes.length; i++) {
                if (outputBytes.has(address + i)) {
                    console.warn(`[Line ${lineNumber}] Warning: Overwriting byte at address 0x${(address + i).toString(16)}`);
                }
                outputBytes.set(address + i, bytes[i]);
            }

        } catch (error) {
            errors.push(`[Line ${lineNumber}] ${error.message}`);
        }
    });

    return { outputBytes, errors };
}
