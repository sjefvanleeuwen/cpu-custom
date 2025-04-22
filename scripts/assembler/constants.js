// Basic Opcode Lookup (Mnemonic + Mode -> Opcode Byte)
// TODO: Expand this significantly to cover all modes and instructions
export const OPCODES = {
    // Implied
    NOP: 0xEA,
    CLC: 0x18,
    SEC: 0x38,
    INX: 0xE8,
    INY: 0xC8,
    DEX: 0xCA,
    RTS: 0x60,

    // Immediate
    LDX_IMM: 0xA2,
    LDY_IMM: 0xA0,
    LDA_IMM: 0xA9,
    ADC_IMM: 0x69,
    CMP_IMM: 0xC9,
    CPY_IMM: 0xC0,

    // Zero Page
    LDA_ZP: 0xA5,
    STA_ZP: 0x85,
    STX_ZP: 0x86,
    // Add other ZP opcodes (LDX, LDY, STY, ADC, CMP, CPY, etc.)

    // Absolute
    LDA_ABS: 0xAD,
    STA_ABS: 0x8D,
    JMP_ABS: 0x4C,
    JSR_ABS: 0x20,
    // Add other ABS opcodes

    // Absolute, X
    LDA_ABS_X: 0xBD,
    STA_ABS_X: 0x9D,
    // Add other ABS,X opcodes

    // Absolute, Y
    LDA_ABS_Y: 0xB9,
    STA_ABS_Y: 0x99,
    // Add other ABS,Y opcodes

    // Indirect Indexed Y (ZP), Y
    LDA_IND_Y: 0xB1,
    STA_IND_Y: 0x91,

    // Relative
    BEQ_REL: 0xF0,
    BNE_REL: 0xD0,
    BPL_REL: 0x10,
    // Add other relative branches (BMI, BCS, BCC, BVS, BVC)
};

// Helper to get opcode based on mnemonic and potential mode hints
// This is a placeholder - a more robust system would parse operands to determine mode
export function getOpcode(mnemonic, operand1, operand2) {
    const mnemonicUpper = mnemonic.toUpperCase();
    const operand1Raw = operand1 || '';
    const operand2Raw = operand2 || '';

    if (['NOP', 'CLC', 'SEC', 'INX', 'INY', 'DEX', 'RTS'].includes(mnemonicUpper)) return OPCODES[mnemonicUpper];
    if (operand1Raw.startsWith('#')) return OPCODES[`${mnemonicUpper}_IMM`];
    if (operand2Raw.toUpperCase() === 'X' && !operand1Raw.includes('(')) return OPCODES[`${mnemonicUpper}_ABS_X`];
    if (operand2Raw.toUpperCase() === 'Y' && !operand1Raw.includes('(')) return OPCODES[`${mnemonicUpper}_ABS_Y`];
    if (operand1Raw.includes('(') && operand2Raw.toUpperCase() === 'Y') return OPCODES[`${mnemonicUpper}_IND_Y`];
    if (['BEQ', 'BNE', 'BPL'].includes(mnemonicUpper)) return OPCODES[`${mnemonicUpper}_REL`];
    if (['JMP', 'JSR'].includes(mnemonicUpper)) return OPCODES[`${mnemonicUpper}_ABS`]; // Assuming Absolute for now

    // Basic guess for ZP/Absolute based on operand value (requires parsed value)
    // This part needs the parsed operand value, so it's better handled in Pass 2
    // For now, return undefined or a default guess if needed in Pass 1 size estimation
    // if (['LDA', 'STA', 'STX', ...].includes(mnemonicUpper)) {
    //    // Need operand value here
    // }

    return undefined; // Fallback
}
