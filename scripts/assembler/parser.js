/**
 * Parses an operand string, resolving constants and labels.
 * @param {string} operand The operand string (e.g., "$FF", "#$10", "LABEL", "CONSTANT").
 * @param {object} labels Map of known labels and their addresses.
 * @param {object} constants Map of known constants and their values.
 * @param {number} lineNumber For error reporting.
 * @returns {number} The numeric value of the operand.
 */
export function parseOperand(operand, labels, constants, lineNumber) {
    if (!operand) throw new Error(`[Line ${lineNumber}] Missing operand`);
    const operandUpper = operand.toUpperCase();

    if (constants[operandUpper] !== undefined) return constants[operandUpper];
    if (labels[operandUpper] !== undefined) return labels[operandUpper];

    if (operand.startsWith('#')) { // Immediate value
        const immValue = operand.substring(1);
        if (immValue.startsWith('$')) return parseInt(immValue.substring(1), 16);
        if (/^\d+$/.test(immValue)) return parseInt(immValue, 10);
        // Check for immediate constant/label
        const immOperandUpper = immValue.toUpperCase();
        if (constants[immOperandUpper] !== undefined) return constants[immOperandUpper];
        if (labels[immOperandUpper] !== undefined) return labels[immOperandUpper];
        // Check for low/high byte operators
        if (immValue.startsWith('<')) {
            const baseOperand = immValue.substring(1);
            const value = parseOperand(baseOperand, labels, constants, lineNumber);
            return value & 0xFF;
        }
        if (immValue.startsWith('>')) {
            const baseOperand = immValue.substring(1);
            const value = parseOperand(baseOperand, labels, constants, lineNumber);
            return (value >> 8) & 0xFF;
        }
        throw new Error(`[Line ${lineNumber}] Invalid immediate value: ${operand}`);
    }

    if (operand.startsWith('$')) return parseInt(operand.substring(1), 16);
    if (/^\d+$/.test(operand)) return parseInt(operand, 10); // Decimal number

    // Handle low/high byte operators for addresses
    if (operand.startsWith('<')) {
        const baseOperand = operand.substring(1);
        const value = parseOperand(baseOperand, labels, constants, lineNumber);
        return value & 0xFF;
    }
    if (operand.startsWith('>')) {
        const baseOperand = operand.substring(1);
        const value = parseOperand(baseOperand, labels, constants, lineNumber);
        return (value >> 8) & 0xFF;
    }

    throw new Error(`[Line ${lineNumber}] Unknown operand format or undefined label/constant: ${operand}`);
}

/**
 * Parses a constant definition line (e.g., "NAME = $VALUE" or "NAME = CONST + $OFFSET").
 * @param {string} line The assembly line.
 * @param {object} constants The current map of constants.
 * @returns {{name: string, value: number}|null} The parsed constant or null if not a constant definition.
 */
export function parseConstantDefinition(line, constants) {
    const constMatch = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)/i);
    if (!constMatch) return null;

    const name = constMatch[1].toUpperCase();
    const expression = constMatch[2].trim();
    let value;

    // Simple case: direct number
    const directNumMatch = expression.match(/^\$?([0-9A-Fa-f]+)$/i);
    if (directNumMatch) {
        value = parseInt(directNumMatch[1], 16);
    } else {
        // Simple expression: CONSTANT + $HEX
        const exprMatch = expression.match(/^([A-Z_][A-Z0-9_]*)\s*\+\s*\$?([0-9A-Fa-f]+)$/i);
        if (exprMatch) {
            const baseConstName = exprMatch[1].toUpperCase();
            const offset = parseInt(exprMatch[2], 16);
            if (constants[baseConstName] === undefined) {
                throw new Error(`Undefined constant '${baseConstName}' used in expression`);
            }
            value = constants[baseConstName] + offset;
        } else {
            // Add more expression types here if needed
            throw new Error(`Unsupported constant expression format: ${expression}`);
        }
    }
    return { name, value };
}

/**
 * Parses an .ORG directive line.
 * @param {string} line The assembly line.
 * @param {object} constants The current map of constants.
 * @returns {number|null} The address value or null if not an ORG directive.
 */
export function parseOrgDirective(line, constants) {
    const orgMatch = line.match(/^\.ORG\s+(.*)/i);
    if (!orgMatch) return null;

    const operand = orgMatch[1].trim();
    // Use parseOperand to handle constants or direct values
    // Pass dummy labels map as ORG shouldn't use labels
    return parseOperand(operand, {}, constants, 0); // Line number not critical here, error will be caught later
}

/**
 * Parses a .BYTE directive line, handling numbers and string literals.
 * @param {string} line The assembly line.
 * @param {object} labels Map of known labels and their addresses.
 * @param {object} constants Map of known constants and their values.
 * @param {number} lineNumber For error reporting.
 * @returns {number[]|null} Array of byte values or null if not a BYTE directive.
 */
export function parseByteDirective(line, labels, constants, lineNumber) {
    if (!line.toUpperCase().startsWith('.BYTE')) return null;

    const argsString = line.substring(5).trim();
    const bytes = [];
    let currentPos = 0;

    while (currentPos < argsString.length) {
        const char = argsString[currentPos];

        if (char === '"') { // Start of string literal
            let endQuotePos = argsString.indexOf('"', currentPos + 1);
            if (endQuotePos === -1) {
                throw new Error(`[Line ${lineNumber}] Unterminated string literal in .BYTE directive`);
            }
            const str = argsString.substring(currentPos + 1, endQuotePos);
            for (let i = 0; i < str.length; i++) {
                bytes.push(str.charCodeAt(i)); // Convert char to ASCII byte
            }
            currentPos = endQuotePos + 1;
        } else if (char === '$' || (char >= '0' && char <= '9') || (char >= 'A' && char <= 'Z') || (char >= 'a' && char <= 'z') || char === '<' || char === '>') { // Start of number/constant/label/operator
            let endArgPos = argsString.indexOf(',', currentPos);
            if (endArgPos === -1) {
                endArgPos = argsString.length;
            }
            const arg = argsString.substring(currentPos, endArgPos).trim();
            if (arg) { // Ensure arg is not empty (e.g. trailing comma)
                 bytes.push(parseOperand(arg, labels, constants, lineNumber));
            }
            currentPos = endArgPos;
        } else if (char === ',') { // Comma separator
            currentPos++;
        } else if (/\s/.test(char)) { // Whitespace
            currentPos++;
        } else {
            throw new Error(`[Line ${lineNumber}] Unexpected character in .BYTE directive: '${char}'`);
        }
    }

    return bytes;
}

/**
 * Parses a line for label, mnemonic, and operands. Handles comments.
 * @param {string} rawLine The raw line from the file.
 * @returns {{label: string|null, mnemonic: string|null, operands: string[], processedLine: string}}
 */
export function parseLine(rawLine) {
    const processedLine = rawLine.replace(/;.*$/, '').trim();
    if (!processedLine) {
        return { label: null, mnemonic: null, operands: [], processedLine: '' };
    }

    let label = null;
    let lineWithoutLabel = processedLine;

    const labelMatch = processedLine.match(/^([A-Z_][A-Z0-9_]*):/i);
    if (labelMatch) {
        label = labelMatch[1].toUpperCase();
        lineWithoutLabel = processedLine.substring(labelMatch[0].length).trim();
    }

    if (!lineWithoutLabel) {
        // Line was only a label
        return { label, mnemonic: null, operands: [], processedLine: '' };
    }

    // Split mnemonic and operands carefully, handling different separators
    const parts = lineWithoutLabel.match(/^([.A-Z_][A-Z0-9_]*)\s*(.*)?$/i);
    const mnemonic = parts ? parts[1].toUpperCase() : null;
    const operandString = parts && parts[2] ? parts[2].trim() : '';

    // Split operands, trying to respect addressing modes like (ZP),Y
    let operands = [];
    if (operandString) {
        // Basic split by comma, then trim. More complex parsing might be needed for intricate modes.
        operands = operandString.split(',').map(op => op.trim());
    }

    return { label, mnemonic, operands, processedLine: lineWithoutLabel };
}

/**
 * Parses an ASCIIZ directive and returns the string content.
 * @param {string} line The line containing the .ASCIIZ directive.
 * @param {number} lineNumber For error reporting.
 * @returns {string} The parsed string without quotes.
 */
export function parseAsciizDirective(line, lineNumber) {
    const match = line.match(/^\s*\.ASCIIZ\s+"([^"]*)".*$/i);
    if (match) {
        return match[1];
    }
    throw new Error(`[Line ${lineNumber}] Invalid .ASCIIZ directive format: ${line}`);
}
