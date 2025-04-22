import fs from 'fs';
import path from 'path';
import { runPass1 } from './assembler/pass1.js';
import { runPass2 } from './assembler/pass2.js';

// --- Assembler Logic ---
const inputFile = process.argv[2];
const outputFile = process.argv[3];

if (!inputFile || !outputFile) {
    console.error('Usage: node assembler.js <input.asm> <output.bin>');
    process.exit(1);
}

try {
    // --- Read Input ---
    console.log(`Reading input file: ${inputFile}`);
    const asmContent = fs.readFileSync(inputFile, 'utf8');
    const rawLines = asmContent.split(/\r?\n/);

    // --- Pass 1 ---
    console.log("--- Starting Pass 1 ---");
    const { labels, constants, pass1Lines, errors: pass1Errors } = runPass1(rawLines);

    if (pass1Errors.length > 0) {
        console.error("Errors found during Pass 1:");
        pass1Errors.forEach(err => console.error(`  ${err}`));
        process.exit(1);
    }

    console.log("--- Labels Found ---");
    console.log(labels);
    console.log("--- Constants Found ---");
    console.log(constants);
    console.log("--- Pass 1 Complete ---");


    // --- Pass 2 ---
    console.log("--- Starting Pass 2 ---");
    const { machineCode, errors: pass2Errors } = runPass2(pass1Lines, labels, constants);

     if (pass2Errors.length > 0) {
        console.error("Errors found during Pass 2:");
        pass2Errors.forEach(err => console.error(`  ${err}`));
        process.exit(1);
    }
    console.log("--- Pass 2 Complete ---");


    // --- Write Output File ---
    console.log(`Writing output file: ${outputFile}`);
    try {
        // Check if machineCode exists and has content
        if (machineCode && machineCode.length > 0) {
            const outputSize = machineCode.length; // Use .length
            fs.writeFileSync(outputFile, machineCode); // Write the Uint8Array
            console.log(`Writing output file: ${outputFile}`);
            console.log(`Output size: ${outputSize} bytes`);
        } else if (machineCode) { // machineCode exists but is empty
             console.log("Assembly successful, but no machine code generated (output is empty).");
             // Optionally write an empty file if desired
             // fs.writeFileSync(outputFile, machineCode);
        } else {
            // This case means runPass2 returned undefined/null for machineCode
            console.error("Assembly finished, but no machine code data was available to write.");
            process.exit(1);
        }
    } catch (error) {
        console.error(`Error writing output file: ${error.message}`);
        console.error(error);
        process.exit(1);
    }

} catch (error) {
    console.error(`Assembler failed: ${error.message}`);
    console.error(error.stack); // Print stack trace for debugging
    process.exit(1);
}

// --- Pass 1: Symbol Table and Address Calculation ---
function pass1(lines) {
    console.log("--- Starting Pass 1 ---"); // Keep existing log
    const symbolTable = {};
    const constants = {};
    const errors = [];
    let currentAddress = 0;
    let memorySize = 65536; // Default memory size

    lines.forEach((line, index) => {
        const lineNumber = index + 1;
        const originalLine = line; // Keep original for context if needed
        line = line.replace(/;.*$/, '').trim(); // Remove comments and trim whitespace

        if (!line) return; // Skip empty lines

        // Attempt to match constants first (must be on their own line)
        const constantMatch = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)/i);
        if (constantMatch) {
            const name = constantMatch[1].toUpperCase();
            const valueStr = constantMatch[2].trim();
            try {
                const value = evaluateExpression(valueStr, constants, symbolTable, 0); // Pass 0 for current address if needed, though usually not for constants
                constants[name] = value;
                console.log(`  [Line ${lineNumber}] Defined Constant: ${name} = 0x${value.toString(16)}`);
            } catch (e) {
                errors.push(`[Line ${lineNumber}] Pass 1: Error evaluating constant ${name}: ${e.message}`);
            }
            return; // Processed constant line, move to next line
        }

        // Match labels at the beginning of the line
        const labelMatch = line.match(/^([A-Z_][A-Z0-9_]*):/i);
        let codePart = line;
        if (labelMatch) {
            const label = labelMatch[1].toUpperCase();
            if (symbolTable[label] !== undefined || constants[label] !== undefined) {
                errors.push(`[Line ${lineNumber}] Pass 1: Duplicate label/symbol definition: ${label}`);
            } else {
                symbolTable[label] = currentAddress;
                console.log(`  [Line ${lineNumber}] Found Label: ${label} at 0x${currentAddress.toString(16)}`);
            }
            codePart = line.substring(labelMatch[0].length).trim(); // Get the rest of the line after the label
        }

        if (!codePart) return; // Skip lines with only a label

        // Now process directives or instructions in the codePart
        const directiveMatch = codePart.match(/^\.(ORG|BYTE|WORD|ASCIIZ)\s+(.*)/i); // Updated regex
        const instructionMatch = codePart.match(/^([A-Z]{3})\s*(.*)/i);

        // --- Debugging ---
        if (lineNumber === 24) { // Specific line causing the error
             console.log(`  [DEBUG Line ${lineNumber}] codePart: "${codePart}"`);
             console.log(`  [DEBUG Line ${lineNumber}] directiveMatch result:`, directiveMatch);
             console.log(`  [DEBUG Line ${lineNumber}] instructionMatch result:`, instructionMatch);
        }
        // --- End Debugging ---


        if (directiveMatch) {
            const directive = directiveMatch[1].toUpperCase();
            const valueStr = directiveMatch[2].trim();
            // console.log(`  [DEBUG Line ${lineNumber}] Directive found: ${directive}`); // Optional general debug
            if (directive === 'ORG') {
                try {
                    currentAddress = evaluateExpression(valueStr, constants, symbolTable, currentAddress);
                    console.log(`  [Line ${lineNumber}] .ORG set to 0x${currentAddress.toString(16)}`);
                    if (currentAddress > memorySize) {
                         errors.push(`[Line ${lineNumber}] Pass 1: ORG address ${currentAddress} exceeds memory size ${memorySize}`);
                    }
                } catch (e) {
                    errors.push(`[Line ${lineNumber}] Pass 1: Error evaluating ORG expression: ${e.message}`);
                }
            } else if (directive === 'BYTE') {
                try {
                    const values = valueStr.split(',').map(v => evaluateExpression(v.trim(), constants, symbolTable, currentAddress));
                    currentAddress += values.length;
                } catch (e) {
                    errors.push(`[Line ${lineNumber}] Pass 1: Error evaluating BYTE expression: ${e.message}`);
                }
            } else if (directive === 'WORD') {
                 try {
                    const values = valueStr.split(',').map(v => evaluateExpression(v.trim(), constants, symbolTable, currentAddress));
                    currentAddress += values.length * 2;
                } catch (e) {
                    errors.push(`[Line ${lineNumber}] Pass 1: Error evaluating WORD expression: ${e.message}`);
                }
            } else if (directive === 'ASCIIZ') { // <<< Check for ASCIIZ
                const stringMatch = valueStr.match(/^"([^"]*)"$/);
                if (stringMatch) {
                    const str = stringMatch[1];
                    currentAddress += str.length + 1; // String length + null terminator
                    // console.log(`  [DEBUG Line ${lineNumber}] ASCIIZ string: "${str}", size: ${str.length + 1}`); // Optional debug
                } else {
                    errors.push(`[Line ${lineNumber}] Pass 1: Invalid string format for .ASCIIZ: ${valueStr}`);
                }
            }
             // NOTE: Removed the redundant error push from the end of the if/else if block
        } else if (instructionMatch) {
            const mnemonic = instructionMatch[1].toUpperCase();
            const operandStr = instructionMatch[2].trim();
            try {
                const { size } = getInstructionSizeAndMode(mnemonic, operandStr); // Pass 1 only needs size
                currentAddress += size;
            } catch (e) {
                // Add context to the error from getInstructionSizeAndMode
                 errors.push(`[Line ${lineNumber}] Pass 1: Error processing instruction "${mnemonic} ${operandStr}": ${e.message}`);
            }
        } else {
            // Only report error if it wasn't a label-only or constant line
             errors.push(`[Line ${lineNumber}] Pass 1: Unknown instruction/directive for size estimation: ${codePart}`);
        }

        if (currentAddress > memorySize) {
             errors.push(`[Line ${lineNumber}] Pass 1: Address ${currentAddress} exceeds memory size ${memorySize} after processing line.`);
             // Optionally stop processing or clamp address
        }
    });

    // ... rest of pass1 function ...
    if (errors.length > 0) {
        console.error("Errors found during Pass 1:");
        errors.forEach(err => console.error(`  ${err}`));
        // process.exit(1); // Exit if errors found in Pass 1 is often desired
    }

    return { symbolTable, constants, errors }; // Return errors along with symbols/constants
}

// --- Pass 2: Code Generation ---
function pass2(lines, symbolTable, constants) { // Pass constants to pass2
    console.log("--- Starting Pass 2 ---");
    const machineCode = new Uint8Array(65536).fill(0); // Use Uint8Array
    const errors = [];
    let currentAddress = 0;
    let highestAddress = -1; // Track highest address written
    const memorySize = 65536;

    lines.forEach((line, index) => {
        const lineNumber = index + 1;
        line = line.replace(/;.*$/, '').trim(); // Remove comments

        if (!line) return; // Skip empty lines

        // Skip constant definitions in Pass 2
        if (line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)/i)) {
            return;
        }

        const labelMatch = line.match(/^([A-Z_][A-Z0-9_]*):/i);
        const codePart = labelMatch ? line.substring(labelMatch[0].length).trim() : line;

        if (!codePart) return; // Skip lines with only a label

        const directiveMatch = codePart.match(/^\.(ORG|BYTE|WORD|ASCIIZ)\s+(.*)/i); // Updated regex
        const instructionMatch = codePart.match(/^([A-Z]{3})\s*(.*)/i);

        try { // Wrap processing in try-catch for Pass 2 errors
            if (directiveMatch) {
                const directive = directiveMatch[1].toUpperCase();
                const valueStr = directiveMatch[2].trim();
                if (directive === 'ORG') {
                    currentAddress = evaluateExpression(valueStr, constants, symbolTable, currentAddress);
                     if (currentAddress > memorySize) {
                         throw new Error(`ORG address ${currentAddress} exceeds memory size ${memorySize}`);
                     }
                } else if (directive === 'BYTE') {
                    const values = valueStr.split(',').map(v => evaluateExpression(v.trim(), constants, symbolTable, currentAddress));
                    values.forEach(value => {
                        if (currentAddress >= memorySize) throw new Error(`Memory overflow writing BYTE`);
                        if (value < 0 || value > 255) throw new Error(`BYTE value ${value} out of range (0-255)`);
                        machineCode[currentAddress++] = value;
                    });
                } else if (directive === 'WORD') {
                    const values = valueStr.split(',').map(v => evaluateExpression(v.trim(), constants, symbolTable, currentAddress));
                     values.forEach(value => {
                        if (currentAddress + 1 >= memorySize) throw new Error(`Memory overflow writing WORD`);
                        if (value < 0 || value > 65535) throw new Error(`WORD value ${value} out of range (0-65535)`);
                        machineCode[currentAddress++] = value & 0xFF; // Low byte
                        machineCode[currentAddress++] = (value >> 8) & 0xFF; // High byte
                    });
                } else if (directive === 'ASCIIZ') { // <<< Handle ASCIIZ
                    const stringMatch = valueStr.match(/^"([^"]*)"$/);
                    if (stringMatch) {
                        const str = stringMatch[1];
                        for (let i = 0; i < str.length; i++) {
                            if (currentAddress >= memorySize) throw new Error(`Memory overflow writing ASCIIZ string`);
                            machineCode[currentAddress++] = str.charCodeAt(i);
                        }
                        if (currentAddress >= memorySize) throw new Error(`Memory overflow writing ASCIIZ null terminator`);
                        machineCode[currentAddress++] = 0x00; // Null terminator
                    } else {
                        // Should have been caught in Pass 1, but good to have a check
                        throw new Error(`Invalid string format for .ASCIIZ: ${valueStr}`);
                    }
                }
            } else if (instructionMatch) {
                const mnemonic = instructionMatch[1].toUpperCase();
                const operandStr = instructionMatch[2].trim();
                const { opcode, mode, operand, size } = resolveInstruction(mnemonic, operandStr, symbolTable, constants, currentAddress);

                if (currentAddress + size > memorySize) {
                     throw new Error(`Memory overflow writing instruction ${mnemonic}`);
                }

                machineCode[currentAddress++] = opcode;
                if (size > 1) {
                    machineCode[currentAddress++] = operand & 0xFF; // Low byte or zero page address
                }
                if (size > 2) {
                    machineCode[currentAddress++] = (operand >> 8) & 0xFF; // High byte
                }
            } else {
                 // This case should ideally not be reached if Pass 1 was thorough
                 throw new Error(`Unknown instruction/directive: ${codePart}`);
            }
            highestAddress = Math.max(highestAddress, currentAddress - 1); // Track highest byte written
        } catch (e) {
             errors.push(`[Line ${lineNumber}] Pass 2: ${e.message}`);
             // Decide whether to continue or stop on Pass 2 errors
        }
    });

    // ... rest of pass2 function ...
     if (errors.length > 0) {
        console.error("Errors found during Pass 2:");
        errors.forEach(err => console.error(`  ${err}`));
        // process.exit(1); // Exit if errors found in Pass 2
    }


    // Return only the portion of machine code that was actually used
    return { machineCode: machineCode.slice(0, highestAddress + 1), errors };
}

// Example placeholder for evaluateExpression if not already robust
function evaluateExpression(expression, constants, symbols, currentAddress) {
    // Very basic example: handle hex, decimal, symbols, constants
    expression = expression.trim();
    if (expression.startsWith('$')) {
        return parseInt(expression.substring(1), 16);
    }
    if (/^[0-9]+$/.test(expression)) {
        return parseInt(expression, 10);
    }
    if (constants[expression.toUpperCase()] !== undefined) {
        return constants[expression.toUpperCase()];
    }
     if (symbols[expression.toUpperCase()] !== undefined) {
        return symbols[expression.toUpperCase()];
    }
    // Add more complex expression handling (e.g., LABEL+1) here if needed
    throw new Error(`Cannot evaluate expression: ${expression}`);
}

// Example placeholder for instruction resolution functions
function getInstructionSizeAndMode(mnemonic, operandStr) {
    // Needs actual implementation based on CPU architecture
    // Returns { size: number, mode: string }
    // Example:
    if (mnemonic === 'LDA') {
        if (operandStr.startsWith('#')) return { size: 2, mode: 'Immediate' };
        if (operandStr.includes(',')) return { size: 3, mode: 'Absolute,X' }; // Simplified
        // ... other modes
        return { size: 3, mode: 'Absolute' }; // Default guess
    }
     if (mnemonic === 'LDX') return { size: 2, mode: 'Immediate' };
     if (mnemonic === 'CMP') return { size: 2, mode: 'Immediate' };
     if (mnemonic === 'BEQ') return { size: 2, mode: 'Relative' };
     if (mnemonic === 'STA') return { size: 3, mode: 'Absolute,X' }; // Simplified
     if (mnemonic === 'INX') return { size: 1, mode: 'Implied' };
     if (mnemonic === 'JMP') return { size: 3, mode: 'Absolute' };

    throw new Error(`Unknown mnemonic ${mnemonic}`);
}

function resolveInstruction(mnemonic, operandStr, symbolTable, constants, currentAddress) {
     // Needs actual implementation based on CPU architecture
     // Returns { opcode: number, mode: string, operand: number, size: number }
     // Example:
     const { size, mode } = getInstructionSizeAndMode(mnemonic, operandStr); // Reuse size logic
     let opcode = 0xA9; // Default guess (LDA Immediate)
     let operand = 0;
     if (operandStr) {
         try {
            // Remove addressing mode characters like #, (, ), X, Y for evaluation
            const cleanOperandStr = operandStr.replace(/[#(),XY\s]/gi, '');
            operand = evaluateExpression(cleanOperandStr, constants, symbolTable, currentAddress);

            // Calculate relative offset for branches
            if (['BEQ', 'BNE', 'BCS', 'BCC', 'BMI', 'BPL', 'BVS', 'BVC'].includes(mnemonic)) {
                 const targetAddress = operand;
                 const offset = targetAddress - (currentAddress + 2); // Relative offset calculation
                 if (offset < -128 || offset > 127) {
                     throw new Error(`Branch target out of range: ${offset}`);
                 }
                 operand = offset & 0xFF; // Store as 8-bit signed offset
            }

         } catch (e) {
             throw new Error(`Error evaluating operand "${operandStr}": ${e.message}`);
         }
     }

     // Determine actual opcode based on mnemonic and mode (lookup table needed)
     // This is highly simplified
     if (mnemonic === 'LDA' && mode === 'Immediate') opcode = 0xA9;
     else if (mnemonic === 'LDA' && mode === 'Absolute,X') opcode = 0xBD;
     else if (mnemonic === 'LDX' && mode === 'Immediate') opcode = 0xA2;
     else if (mnemonic === 'CMP' && mode === 'Immediate') opcode = 0xC9;
     else if (mnemonic === 'BEQ' && mode === 'Relative') opcode = 0xF0;
     else if (mnemonic === 'STA' && mode === 'Absolute,X') opcode = 0x9D;
     else if (mnemonic === 'INX' && mode === 'Implied') opcode = 0xE8;
     else if (mnemonic === 'JMP' && mode === 'Absolute') opcode = 0x4C;
     // ... many more opcodes ...
     else {
        // Use default or throw error if combination not found
        // opcode = 0xEA; // Default to NOP?
        // throw new Error(`Opcode not found for ${mnemonic} ${mode}`);
     }


     return { opcode, mode, operand, size };
}
