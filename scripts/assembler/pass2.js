import { OPCODES, getOpcode } from './constants.js';
// Make sure parseWordDirective is imported or defined
import { parseOperand, parseByteDirective, parseAsciizDirective, parseWordDirective } from './parser.js';

/**
 * Processes an instruction operand in Pass 2.
 * Handles all addressing modes including indirect addressing and offsets.
 * @param {string} operand The operand string.
 * @param {object} labels Map of labels.
 * @param {object} constants Map of constants.
 * @param {number} lineNumber For error reporting.
 * @returns {number} The resolved operand value.
 */
function processOperand(operand, labels, constants, lineNumber) {
    if (!operand) throw new Error(`Missing operand`);
    
    // For immediate mode, remove the # prefix and parse the rest
    if (operand.startsWith('#')) {
        const value = operand.substring(1);
        return parseOperand(value, labels, constants, lineNumber);
    }
    
    // For indirect indexed addressing (ZP),Y, extract the inner part
    if (operand.includes('(') && !operand.endsWith(')')) {
        // This handles cases like (ZP_ADDR),Y by extracting ZP_ADDR
        const innerMatch = operand.match(/\(([^)]+)\)/);
        if (innerMatch) {
            return parseOperand(innerMatch[1], labels, constants, lineNumber);
        }
    }
    
    // For other cases, use the standard parseOperand
    return parseOperand(operand, labels, constants, lineNumber);
}

/**
 * Runs the second pass of the assembler.
 * Generates machine code using the symbols and constants from pass 1.
 * @param {object[]} pass1Lines Lines processed from pass 1.
 * @param {object} labels Map of labels and their addresses.
 * @param {object} constants Map of constants and their values.
 * @returns {{machineCode: Uint8Array, errors: string[]}}
 */
export function runPass2(pass1Lines, labels, constants) {
    console.log("--- Starting Pass 2 ---");
    const errors = [];
    const machineCode = new Uint8Array(65536); // 64K address space
    let highestAddressWritten = 0;

    // Process each line from pass 1
    pass1Lines.forEach(line => {
        const currentAddress = line.address;
        const { mnemonic, operands, lineNumber, text } = line;

        try {
            // Handle different directives and instructions
            if (mnemonic === '.BYTE') {
                // Parse byte values and write to machine code
                const bytes = parseByteDirective(text, labels, constants, lineNumber);
                if (bytes) {
                    bytes.forEach((byte, index) => {
                        machineCode[currentAddress + index] = byte;
                        highestAddressWritten = Math.max(highestAddressWritten, currentAddress + index);
                    });
                }
            } else if (mnemonic === '.ASCIIZ') {
                // Parse ASCIIZ string and write characters + null terminator
                const str = parseAsciizDirective(text, lineNumber);
                for (let i = 0; i < str.length; i++) {
                    machineCode[currentAddress + i] = str.charCodeAt(i);
                }
                // Add null terminator
                machineCode[currentAddress + str.length] = 0;
                highestAddressWritten = Math.max(highestAddressWritten, currentAddress + str.length);
            } else if (mnemonic === '.WORD') { // <<< Handle .WORD
                const words = parseWordDirective(text, labels, constants, lineNumber);
                if (words) {
                    words.forEach((word, index) => {
                        const addr = currentAddress + (index * 2);
                        machineCode[addr] = word & 0xFF;         // Low byte
                        machineCode[addr + 1] = (word >> 8) & 0xFF; // High byte
                        highestAddressWritten = Math.max(highestAddressWritten, addr + 1);
                    });
                }
            } else {
                // Handle CPU instructions
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
                else if (mnemonic === 'CPX' && operand1Raw?.startsWith('#')) opcode = OPCODES.CPX_IMM; // CPX IMM
                else if (mnemonic === 'STX' && operands.length === 1) opcode = OPCODES.STX_ZP; // Assume ZP for now
                else if (mnemonic === 'STA' && operands.length === 1) opcode = OPCODES.STA_ZP; // Assume ZP for now
                else if (mnemonic === 'LDA' && operands.length === 1) opcode = OPCODES.LDA_ZP; // Assume ZP for now
                else if (mnemonic === 'CPX' && operands.length === 1) opcode = OPCODES.CPX_ZP; // Assume CPX ZP for now
                else if (mnemonic === 'INC' && operands.length === 1) opcode = OPCODES.INC_ZP; // Assume INC ZP for now
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
                else if (mnemonic === 'PLA') opcode = OPCODES.PLA; // PLA
                else if (mnemonic === 'PHA') opcode = OPCODES.PHA; // PHA
                else if (mnemonic === 'TAX') opcode = OPCODES.TAX; // TAX
                else if (mnemonic === 'BEQ') opcode = OPCODES.BEQ_REL;
                else if (mnemonic === 'BNE') opcode = OPCODES.BNE_REL;
                else if (mnemonic === 'BPL') opcode = OPCODES.BPL_REL;
                else if (mnemonic === 'JMP') opcode = OPCODES.JMP_ABS;
                else if (mnemonic === 'JSR') opcode = OPCODES.JSR_ABS;
                // Add more specific opcode lookups here

                if (opcode === undefined) {
                    throw new Error(`Pass 2: Cannot determine opcode for: ${text}`);
                }
                const bytes = [];
                bytes.push(opcode);

                // Add operand bytes based on addressing mode implied by opcode/operands
                // Immediate
                if ([OPCODES.LDX_IMM, OPCODES.LDY_IMM, OPCODES.LDA_IMM, OPCODES.ADC_IMM, OPCODES.CMP_IMM, OPCODES.CPY_IMM, OPCODES.CPX_IMM].includes(opcode)) { // Added CPX_IMM
                    bytes.push(processOperand(operand1Raw, labels, constants, lineNumber) & 0xFF);
                }
                // Zero Page
                else if ([OPCODES.STX_ZP, OPCODES.STA_ZP, OPCODES.LDA_ZP, OPCODES.CPX_ZP, OPCODES.INC_ZP].includes(opcode)) { // Added CPX_ZP, INC_ZP
                    bytes.push(processOperand(operand1Raw, labels, constants, lineNumber) & 0xFF);
                }
                // Absolute
                else if ([OPCODES.JMP_ABS, OPCODES.JSR_ABS, OPCODES.CPX_ABS].includes(opcode)) { // Added CPX_ABS
                    const addr = processOperand(operand1Raw, labels, constants, lineNumber);
                    bytes.push(addr & 0xFF); // Low byte
                    bytes.push((addr >> 8) & 0xFF); // High byte
                }
                // Absolute, X/Y
                else if ([OPCODES.LDA_ABS_X, OPCODES.STA_ABS_X, OPCODES.LDA_ABS_Y, OPCODES.STA_ABS_Y].includes(opcode)) {
                     const addr = processOperand(operand1Raw, labels, constants, lineNumber);
                     bytes.push(addr & 0xFF); // Low byte
                     bytes.push((addr >> 8) & 0xFF); // High byte
                }
                 // Indirect Indexed Y
                else if ([OPCODES.LDA_IND_Y, OPCODES.STA_IND_Y].includes(opcode)) {
                    // Operand is the zero page address containing the pointer base
                    const zpAddr = processOperand(operand1Raw.replace(/[()]/g, ''), labels, constants, lineNumber); // Remove parens
                    bytes.push(zpAddr & 0xFF);
                }
                // Relative
                else if ([OPCODES.BEQ_REL, OPCODES.BNE_REL, OPCODES.BPL_REL].includes(opcode)) {
                    const targetAddress = processOperand(operand1Raw, labels, constants, lineNumber);
                    const pcAfterFetch = currentAddress + 2;
                    const offset = targetAddress - pcAfterFetch;
                    if (offset < -128 || offset > 127) {
                        throw new Error(`Branch target out of range: ${offset}`);
                    }
                    bytes.push(offset & 0xFF);
                }
                // Implied opcodes already handled (only opcode byte pushed)

                // Store generated bytes
                bytes.forEach((byte, index) => {
                    machineCode[currentAddress + index] = byte;
                    highestAddressWritten = Math.max(highestAddressWritten, currentAddress + index);
                });
            }
        } catch (error) {
            errors.push(`[Line ${lineNumber}] ${error.message}`);
        }
    });

    return { machineCode: machineCode.slice(0, highestAddressWritten + 1), errors };
}
