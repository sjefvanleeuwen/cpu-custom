import { parseLine, parseConstantDefinition, parseOrgDirective, parseByteDirective } from './parser.js';

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

    if (mnemonic === '.BYTE') {
        // Size is determined by the number of operands
        return operands.length > 0 ? operands.length : 0; // Handle empty .BYTE?
    }
    
    // Handle .ASCIIZ directive - size is string length + null terminator
    if (mnemonic === '.ASCIIZ') {
        try {
            const str = parseAsciizDirective(lineWithoutLabel, lineNumber);
            return str.length + 1; // String length + null terminator
        } catch (error) {
            throw error;
        }
    }

    // Implied Instructions (1 byte)
    if (['INX', 'INY', 'DEX', 'CLC', 'SEC', 'RTS', 'NOP'].includes(mnemonic)) {
        return 1;
    }

    // Immediate Instructions (2 bytes)
    if (['LDX', 'LDY', 'LDA', 'ADC', 'CMP', 'CPY'].includes(mnemonic) && operands[0]?.startsWith('#')) {
        return 2;
    }

    // Zero Page Instructions (2 bytes)
    // Basic check: if operand is a known constant/label < 256 or a direct ZP address
    if (['LDA', 'STA', 'LDX', 'STX'].includes(mnemonic) && operands.length === 1 && !lineWithoutLabel.includes(',') && !lineWithoutLabel.includes('(')) {
        try {
            // Attempt to parse the operand to check its value
            const value = parseOperand(operands[0], labels, constants, lineNumber);
            if (value < 0x100) {
                return 2; // Assume Zero Page
            } else {
                return 3; // Assume Absolute
            }
        } catch (e) {
            // If parsing fails (e.g., forward label reference), assume Absolute for safety
            return 3;
        }
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

    // Absolute Jump/Subroutine Instructions (3 bytes)
    if (['JMP', 'JSR'].includes(mnemonic) && operands.length === 1) {
        return 3;
    }

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
                 // Special handling for .BYTE size estimation
                 if (mnemonic === '.BYTE') {
                     const byteValues = parseByteDirective(processedLine, labels, constants, lineNumber);
                     estimatedSize = byteValues ? byteValues.length : 0;
                 } else if (mnemonic === '.ASCIIZ') {
                     try {
                         const str = parseAsciizDirective(processedLine, lineNumber);
                         estimatedSize = str.length + 1; // String length + null terminator
                     } catch (error) {
                         throw error;
                     }
                 } else {
                     estimatedSize = estimateSize(mnemonic, operands, processedLine, constants, labels, lineNumber);
                 }
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
