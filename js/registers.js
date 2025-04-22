/**
 * Holds the state of the CPU registers.
 */
export class Registers {
    constructor() {
        this.reset();
    }

    /** Resets all registers to their initial state (usually 0). */
    reset() {
        // 8-bit registers
        this.A = 0; // Accumulator
        this.X = 0; // Index Register X
        this.Y = 0; // Index Register Y
        this.SP = 0xFF; // Stack Pointer (often starts at the top of page 1)
        // Status Register (Flags: NV-BDIZC) - Initial state often has unused and interrupt flags set.
        // Bit 5 (U) is typically always 1. Bit 4 (B) is set by BRK/IRQ.
        this.P = 0b00100100; // Set U and I initially

        // 16-bit register
        this.PC = 0x0000; // Program Counter
    }

    // --- Status Flag Constants ---
    static CARRY_FLAG = 0b00000001; // C
    static ZERO_FLAG = 0b00000010; // Z
    static INTERRUPT_DISABLE_FLAG = 0b00000100; // I
    static DECIMAL_MODE_FLAG = 0b00001000; // D (Not typically used in NES/simple 6502)
    static BREAK_COMMAND_FLAG = 0b00010000; // B
    static UNUSED_FLAG = 0b00100000; // U (Always set)
    static OVERFLOW_FLAG = 0b01000000; // V
    static NEGATIVE_FLAG = 0b10000000; // N

    // --- Flag Getter Methods ---
    getFlag(flagMask) {
        return (this.P & flagMask) !== 0;
    }

    getCarryFlag() { return this.getFlag(Registers.CARRY_FLAG); }
    getZeroFlag() { return this.getFlag(Registers.ZERO_FLAG); }
    getInterruptDisableFlag() { return this.getFlag(Registers.INTERRUPT_DISABLE_FLAG); }
    getDecimalModeFlag() { return this.getFlag(Registers.DECIMAL_MODE_FLAG); }
    getBreakCommandFlag() { return this.getFlag(Registers.BREAK_COMMAND_FLAG); }
    getOverflowFlag() { return this.getFlag(Registers.OVERFLOW_FLAG); }
    getNegativeFlag() { return this.getFlag(Registers.NEGATIVE_FLAG); }

    // --- Flag Setter Methods ---
    setFlag(flagMask, value) {
        if (value) {
            this.P |= flagMask;
        } else {
            this.P &= ~flagMask;
        }
        // Ensure Unused flag (bit 5) remains set, and handle B flag if needed elsewhere
        this.P |= Registers.UNUSED_FLAG;
    }

    setCarryFlag(value) { this.setFlag(Registers.CARRY_FLAG, value); }
    setZeroFlag(value) { this.setFlag(Registers.ZERO_FLAG, value); }
    setInterruptDisableFlag(value) { this.setFlag(Registers.INTERRUPT_DISABLE_FLAG, value); }
    setDecimalModeFlag(value) { this.setFlag(Registers.DECIMAL_MODE_FLAG, value); }
    setBreakCommandFlag(value) { this.setFlag(Registers.BREAK_COMMAND_FLAG, value); }
    setOverflowFlag(value) { this.setFlag(Registers.OVERFLOW_FLAG, value); }
    setNegativeFlag(value) { this.setFlag(Registers.NEGATIVE_FLAG, value); }

    /** Sets Zero and Negative flags based on a value */
    setZNFlags(value) {
        this.setZeroFlag(value === 0);
        this.setNegativeFlag((value & 0x80) !== 0);
    }
}
