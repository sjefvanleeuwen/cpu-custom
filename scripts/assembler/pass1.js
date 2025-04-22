import { parseLine, parseConstantDefinition, parseOrgDirective, parseByteDirective, parseOperand } from './parser.js'; // Added parseOperand

/**
 * Parses an ASCIIZ string directive and returns the string content.
 * @param {string} line The line containing the .ASCIIZ directive.
 * @param {number} lineNumber For error reporting.
 * @returns {string} The parsed string.
 */
function parseAsciizDirective(line, lineNumber) {
    // Match a string enclosed in double quotes
    const match = line.match(/^\s*\.ASCIIZ\s+"([^"]*)".*$/i);
    if (match) {
        return match[1]; // Return the string without quotes
    }
    throw new Error(`[Line ${lineNumber}] Pass 1: Invalid .ASCIIZ directive format: ${line}`);
}

/**
 * Parses a .WORD directive and returns the number of words.
 * @param {string} line The line containing the .WORD directive.
 * @param {number} lineNumber For error reporting.
 * @returns {number} The number of words defined.
 */
function parseWordDirectiveCount(line, lineNumber) {
    const match = line.match(/^\s*\.WORD\s+(.*)/i);
    if (match) {
        const values = match[1].split(',');
        return values.length;
    }
    throw new Error(`[Line ${lineNumber}] Pass 1: Invalid .WORD directive format: ${line}`);
}

/**
 * Estimates the size of an instruction based on mnemonic and operands.
 * @param {string} mnemonic The instruction mnemonic.
 * @param {string[]} operands Array of operand strings.
 * @param {string} lineWithoutLabel The processed line without the label.
 * @param {object} constants Map of known constants.
 * @param {object} labels Map of known labels.
 * @param {number} lineNumber For error reporting.
 * @returns {number} The estimated size in bytes.
 */
function estimateSize(mnemonic, operands, lineWithoutLabel, constants, labels, lineNumber) {
    if (!mnemonic) return 0; // Only a label or empty line

    // Directives
    if (mnemonic === '.BYTE') {
        // Size is determined by the number of operands
        return operands.length > 0 ? operands.length : 0; // Handle empty .BYTE?
    }
    if (mnemonic === '.ASCIIZ') {
        try {
            const str = parseAsciizDirective(lineWithoutLabel, lineNumber);
            return str.length + 1; // String length + null terminator
        } catch (error) {
            throw error;
        }
    }
    if (mnemonic === '.WORD') {
        try {
            const wordCount = parseWordDirectiveCount(lineWithoutLabel, lineNumber);
            return wordCount * 2; // 2 bytes per word
        } catch (error) {
            throw error;
        }
    }

    // Implied Instructions (1 byte)
    if (['INX', 'INY', 'DEX', 'CLC', 'SEC', 'RTS', 'NOP', 'PLA', 'PHA', 'TAX'].includes(mnemonic)) { // Added PLA, PHA, TAX
        return 1;
    }

    // Immediate Instructions (2 bytes)
    if (['LDX', 'LDY', 'LDA', 'ADC', 'CMP', 'CPY', 'CPX'].includes(mnemonic) && operands[0]?.startsWith('#')) { // Added CPX
        return 2;
    }

    // Zero Page Instructions (2 bytes)
    // Basic check: if operand is a known constant/label < 256 or a direct ZP address
    if (['LDA', 'STA', 'LDX', 'STX', 'CPX', 'INC'].includes(mnemonic) && operands.length === 1 && !lineWithoutLabel.includes(',') && !lineWithoutLabel.includes('(')) { // Added CPX, INC
        try {
            // Attempt to parse the operand to check its value
            const value = parseOperand(operands[0], labels, constants, lineNumber);
            if (value < 0x100) {
                return 2; // Assume Zero Page
            } else {
                // If it's INC, it doesn't have an Absolute mode like LDA/STA etc.
                if (mnemonic === 'INC') {
                     throw new Error(`[Line ${lineNumber}] Pass 1: INC does not support Absolute addressing mode like this.`);
                }
                return 3; // Assume Absolute for others
            }
        } catch (e) {
            // If parsing fails (e.g., forward label reference), assume Absolute for safety
            // Except for INC which doesn't have a 3-byte absolute form
             if (mnemonic === 'INC') {
                 // Assume ZP if parsing fails for INC, as it's the most likely intent
                 return 2;
             }
            return 3;
        }
    }

    // Absolute Instructions (3 bytes) - Add CPX if needed
    if (['LDA', 'STA', 'LDX', 'LDY', 'JMP', 'JSR', 'CPX'].includes(mnemonic) && operands.length === 1 && !lineWithoutLabel.includes(',') && !lineWithoutLabel.includes('(')) { // Added CPX
        // This overlaps with the ZP check, but the ZP check runs first.
        // If it wasn't ZP, it's likely Absolute.
        return 3;
    }


    // Absolute, X/Y Instructions (3 bytes)
    if (['LDA', 'STA'].includes(mnemonic) && operands.length === 2 && (operands[1].toUpperCase() === 'X' || operands[1].toUpperCase() === 'Y') && !lineWithoutLabel.includes('(')) {
        return 3; // Assume Absolute,X/Y
    }

    // Indirect Indexed Y (ZP),Y Instructions (2 bytes)
    if (['LDA', 'STA'].includes(mnemonic) && operands.length === 2 && lineWithoutLabel.includes('(') && operands[1].toUpperCase() === 'Y') {
        return 2;
    }

    // Relative Branch Instructions (2 bytes)
    if (['BEQ', 'BNE', 'BPL'].includes(mnemonic)) {
        return 2;
    }

    // Absolute Jump/Subroutine Instructions (3 bytes) - Already covered by Absolute check above

    throw new Error(`[Line ${lineNumber}] Pass 1: Unknown instruction/directive for size estimation: ${lineWithoutLabel}`);
}


/**
 * Runs the first pass of the assembler.
 * Collects labels, constants, and estimates instruction sizes.
 * @param {string[]} rawLines Array of lines from the input file.
 * @returns {{labels: object, constants: object, pass1Lines: object[], errors: string[]}}
 */
export function runPass1(rawLines) {
    const labels = {};
    const constants = {};
    const pass1Lines = [];
    const errors = [];
    let currentAddress = 0;

    rawLines.forEach((rawLine, index) => {
        const lineNumber = index + 1;
        try {
            const { label, mnemonic, operands, processedLine } = parseLine(rawLine);

            if (!processedLine && !label) return; // Skip empty/comment lines

            // Handle .ORG directive
            const orgValue = parseOrgDirective(processedLine, constants);
            if (orgValue !== null) {
                currentAddress = orgValue;
                console.log(`  [Line ${lineNumber}] .ORG set to 0x${currentAddress.toString(16)}`);
                return; // Handled .ORG
            }

            // Handle Constant Definition
            const constantDef = parseConstantDefinition(processedLine, constants);
            if (constantDef) {
                if (constants[constantDef.name] !== undefined) {
                    throw new Error(`Constant '${constantDef.name}' redefined.`);
                }
                constants[constantDef.name] = constantDef.value;
                console.log(`  [Line ${lineNumber}] Defined Constant: ${constantDef.name} = 0x${constantDef.value.toString(16)}`);
                return; // Handled constant
            }

            // --- Line contains code/data or label ---
            const lineAddress = currentAddress;

            // Process Label
            if (label) {
                if (labels[label] !== undefined) {
                    throw new Error(`Label '${label}' redefined.`);
                }
                labels[label] = lineAddress;
                console.log(`  [Line ${lineNumber}] Found Label: ${label} at 0x${lineAddress.toString(16)}`);
            }

            // Estimate size if there's a mnemonic
            let estimatedSize = 0;
            if (mnemonic) {
                 // Use the updated estimateSize function
                 estimatedSize = estimateSize(mnemonic, operands, processedLine, constants, labels, lineNumber);
            }


            // Store line info for Pass 2 only if it contains code/data
            if (mnemonic) {
                pass1Lines.push({ text: processedLine, address: lineAddress, lineNumber, mnemonic, operands });
            }

            // Increment currentAddress for the next line
            currentAddress += estimatedSize;

        } catch (error) {
            errors.push(`[Line ${lineNumber}] ${error.message}`);
        }
    });

    return { labels, constants, pass1Lines, errors };
}
