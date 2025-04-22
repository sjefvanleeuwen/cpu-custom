import fs from 'fs';
import path from 'path';

// --- Basic Opcode Lookup (Mnemonic + Mode -> Opcode Byte) ---
const OPCODES = {
    LDX_IMM: 0xA2,
    LDA_ABS_X: 0xBD,
    CMP_IMM: 0xC9,
    BEQ_REL: 0xF0,
    STA_ABS_X: 0x9D,
    INX_IMP: 0xE8,
    JMP_ABS: 0x4C,
};

// --- Assembler Logic ---
const inputFile = process.argv[2];
const outputFile = process.argv[3];

if (!inputFile || !outputFile) {
    console.error('Usage: node assembler.js <input.asm> <output.bin>');
    process.exit(1);
}

const inputText = fs.readFileSync(inputFile, 'utf-8');
const lines = inputText.split('\n').map((line, index) => ({
    text: line.trim(),
    lineNumber: index + 1,
}));

let currentAddress = 0;
const labels = {};
const constants = {};
const outputBytes = new Map();

// --- Pass 1: Collect Labels, Constants, and Parse Lines ---
try {
    const asmContent = fs.readFileSync(inputFile, 'utf8');
    const rawLines = asmContent.split(/\r?\n/);
    const pass1Lines = []; // Temporary storage for lines needing Pass 2 processing

    let orgAddress = 0;
    currentAddress = orgAddress;

    rawLines.forEach((line, index) => {
        const lineNumber = index + 1;
        let processedLine = line.replace(/;.*$/, '').trim();

        if (!processedLine) return; // Skip empty/comment lines

        // Handle .ORG directive first - Allow numeric or constant
        const orgMatch = processedLine.match(/^\.ORG\s+(?:\$?([0-9A-Fa-f]+)|([A-Z_][A-Z0-9_]*))/i);
        if (orgMatch) {
            let orgValue;
            if (orgMatch[1]) { // Matched numeric value
                orgValue = parseInt(orgMatch[1], 16);
            } else if (orgMatch[2]) { // Matched constant name
                const constName = orgMatch[2].toUpperCase();
                if (constants[constName] === undefined) {
                    throw new Error(`[Line ${lineNumber}] Undefined constant used in .ORG: ${constName}`);
                }
                orgValue = constants[constName];
            } else {
                 throw new Error(`[Line ${lineNumber}] Invalid .ORG directive format: ${processedLine}`);
            }

            orgAddress = orgValue;
            currentAddress = orgAddress;
            console.log(`  [Line ${lineNumber}] .ORG set to 0x${currentAddress.toString(16)}`);
            return; // Handled .ORG, skip rest for this line
        }

        // Handle Constants next
        const constMatch = processedLine.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*\$?([0-9A-Fa-f]+)/i);
        if (constMatch) {
            const name = constMatch[1].toUpperCase();
            const value = parseInt(constMatch[2], 16);
            if (constants[name] !== undefined) {
                throw new Error(`[Line ${lineNumber}] Constant '${name}' redefined.`);
            }
            constants[name] = value;
            console.log(`  [Line ${lineNumber}] Defined Constant: ${name} = 0x${value.toString(16)}`);
            return; // Handled constant, skip rest for this line
        }

        // --- Line contains code/data or label ---
        let lineAddress = currentAddress; // Address for this potential instruction/data
        let hasLabel = false;

        // Process potential label
        const labelMatch = processedLine.match(/^([A-Z_][A-Z0-9_]*):/i);
        if (labelMatch) {
            hasLabel = true;
            const label = labelMatch[1].toUpperCase();
            if (labels[label] !== undefined) {
                throw new Error(`[Line ${lineNumber}] Label '${label}' redefined.`);
            }
            labels[label] = lineAddress;
            console.log(`  [Line ${lineNumber}] Found Label: ${label} at 0x${lineAddress.toString(16)}`);
            processedLine = processedLine.substring(labelMatch[0].length).trim();
            // If line was *only* a label, we still need to process potential empty line
            if (!processedLine) return;
        }

        // --- Estimate size (only if it's not ORG/Constant) ---
        let estimatedSize = 0;
        const parts = processedLine.split(/[\s,]+/);
        const mnemonic = parts[0].toUpperCase();

        if (mnemonic === '.BYTE') {
            const byteValues = processedLine.substring(5).split(',').map(s => s.trim());
            estimatedSize = byteValues.length;
        } else if (mnemonic === 'INX') {
            estimatedSize = 1;
        } else if (['LDX', 'LDA', 'CMP', 'CPY'].includes(mnemonic) && parts[1]?.startsWith('#')) {
            estimatedSize = 2;
        } else if (['LDA', 'STA'].includes(mnemonic) && parts[2]?.toUpperCase() === 'X') {
            estimatedSize = 3;
        } else if (['LDA', 'STA'].includes(mnemonic) && parts[2]?.toUpperCase() === 'Y') {
            estimatedSize = 3;
        } else if (['BEQ', 'BNE'].includes(mnemonic)) {
            estimatedSize = 2;
        } else if (mnemonic === 'JMP') {
            estimatedSize = 3;
        } else {
             throw new Error(`[Line ${lineNumber}] Pass 1: Unknown instruction/directive for size estimation: ${mnemonic}`);
        }

        // Store line info for Pass 2
        pass1Lines.push({ text: processedLine, address: lineAddress, lineNumber });

        // Increment currentAddress for the next line
        currentAddress += estimatedSize;
    });

    // Now assign pass1Lines to lines for Pass 2
    lines.length = 0; // Clear the original lines array
    lines.push(...pass1Lines); // Add the processed lines

} catch (error) {
    console.error(`Error during Pass 1: ${error.message}`);
    process.exit(1);
}

console.log("--- Labels Found ---");
console.log(labels);
console.log("--- Constants Found ---");
console.log(constants);
console.log("--- Starting Pass 2 ---");

// --- Pass 2: Generate Bytes ---
try {
    // No need to track currentAddress here, use lineInfo.address
    // currentAddress = 0;

    lines.forEach(lineInfo => {
        const { text, address, lineNumber } = lineInfo; // Get address from lineInfo

        // currentAddress = address; // Set context for relative branches

        const parts = text.split(/[\s,]+/);
        const mnemonic = parts[0].toUpperCase();
        const operand1Raw = parts[1];
        const operand2Raw = parts[2];

        let bytes = [];
        // let instructionSize = 0; // Not needed here

        // Helper to parse operand
        const parseOperand = (operand) => {
            if (!operand) throw new Error(`[Line ${lineNumber}] Missing operand for ${mnemonic}`);
            const operandUpper = operand.toUpperCase();
            if (constants[operandUpper] !== undefined) return constants[operandUpper];
            if (labels[operandUpper] !== undefined) return labels[operandUpper];
            if (operand.startsWith('$')) return parseInt(operand.substring(1), 16);
            if (operand.startsWith('#')) { // Immediate value
                 const immValue = operand.substring(1);
                 if (immValue.startsWith('$')) return parseInt(immValue.substring(1), 16);
                 if (/^\d+$/.test(immValue)) return parseInt(immValue, 10);
                 throw new Error(`[Line ${lineNumber}] Invalid immediate value: ${operand}`);
            }
            if (/^\d+$/.test(operand)) return parseInt(operand, 10); // Decimal number
            throw new Error(`[Line ${lineNumber}] Unknown operand format or undefined label/constant: ${operand}`);
        };

        // --- Instruction Handling ---
        if (mnemonic === '.BYTE') {
            const byteStrings = text.substring(5).split(',');
            bytes = byteStrings.map(s => parseOperand(s.trim()));
        } else if (mnemonic === 'LDX' && operand1Raw?.startsWith('#')) {
            bytes.push(OPCODES.LDX_IMM);
            bytes.push(parseOperand(operand1Raw) & 0xFF);
        } else if (mnemonic === 'LDA' && operand2Raw?.toUpperCase() === 'X') {
            bytes.push(OPCODES.LDA_ABS_X);
            const addr = parseOperand(operand1Raw);
            bytes.push(addr & 0xFF); // Low byte
            bytes.push((addr >> 8) & 0xFF); // High byte
        } else if (mnemonic === 'CMP' && operand1Raw?.startsWith('#')) {
            bytes.push(OPCODES.CMP_IMM);
            bytes.push(parseOperand(operand1Raw) & 0xFF);
        } else if (mnemonic === 'BEQ') {
            bytes.push(OPCODES.BEQ_REL);
            const targetAddress = parseOperand(operand1Raw);
            // Use the line's address for relative calculation
            const pcAfterFetch = address + 2;
            const offset = targetAddress - pcAfterFetch;
            if (offset < -128 || offset > 127) {
                throw new Error(`[Line ${lineNumber}] Branch target out of range for BEQ: ${offset}`);
            }
            bytes.push(offset & 0xFF);
        } else if (mnemonic === 'STA' && operand2Raw?.toUpperCase() === 'X') {
            bytes.push(OPCODES.STA_ABS_X);
            const addr = parseOperand(operand1Raw);
            bytes.push(addr & 0xFF); // Low byte
            bytes.push((addr >> 8) & 0xFF); // High byte
        } else if (mnemonic === 'INX') {
            bytes.push(OPCODES.INX_IMP);
        } else if (mnemonic === 'JMP') {
            bytes.push(OPCODES.JMP_ABS);
            const addr = parseOperand(operand1Raw);
            bytes.push(addr & 0xFF); // Low byte
            bytes.push((addr >> 8) & 0xFF); // High byte
        } else {
            // This error should ideally be caught in Pass 1 now
            throw new Error(`[Line ${lineNumber}] Pass 2: Unknown mnemonic or addressing mode: ${text}`);
        }

        // Store generated bytes at the correct address
        for (let i = 0; i < bytes.length; i++) {
            if (outputBytes.has(address + i)) { // Use line's address
                 console.warn(`[Line ${lineNumber}] Warning: Overwriting byte at address 0x${(address + i).toString(16)}`);
            }
            outputBytes.set(address + i, bytes[i]); // Use line's address
        }
    });

    // --- Write Output File ---
    let maxAddress = 0;
    for (const address of outputBytes.keys()) {
        if (address > maxAddress) {
            maxAddress = address;
        }
    }
    const fileSize = maxAddress + 1; // Size up to the last byte written
    const outputBuffer = new Uint8Array(fileSize).fill(0); // Initialize with 0s

    for (const [address, byteValue] of outputBytes.entries()) {
        outputBuffer[address] = byteValue;
    }

    fs.writeFileSync(outputFile, outputBuffer);
    console.log(`Assembly successful. Output written to ${outputFile} (${outputBuffer.length} bytes).`);

} catch (error) {
    console.error(`Error during Pass 2 or writing file: ${error.message}`);
    process.exit(1);
}