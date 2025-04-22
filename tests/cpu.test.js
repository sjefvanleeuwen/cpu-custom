import { CPU } from '../js/cpu.js'; // Adjust path as needed
import { Registers } from '../js/registers.js'; // Import for flag constants
// Import ROM data only from ascii.js
import { asciiFontRomData } from '../js/roms/ascii.js';
// Import constants including CHAR_HEIGHT from constants.js
import { FONT_ROM_START_ADDRESS, CHAR_HEIGHT } from '../js/constants.js';

describe('CPU', () => {
    let cpu;

    beforeEach(() => {
        cpu = new CPU(); // Reset is called in constructor, loading the ROM
    });

    // ... existing tests for init, reset, fetchByte, fetchWord, NOP, LDA, STA, JMP ...

    test('should load font ROM into memory on reset', () => {
        // Check the first byte of the ROM (should match the first byte of asciiFontRomData)
        expect(cpu.memory.read(FONT_ROM_START_ADDRESS)).toBe(asciiFontRomData[0]);

        // Check the start of a known character's bitmap (e.g., 'A' = 0x41)
        const charCodeA = 0x41;
        const addressA_start = FONT_ROM_START_ADDRESS + (charCodeA * CHAR_HEIGHT); // Uses CHAR_HEIGHT from constants
        const romIndexA_start = charCodeA * CHAR_HEIGHT; // Uses CHAR_HEIGHT from constants
        expect(cpu.memory.read(addressA_start)).toBe(asciiFontRomData[romIndexA_start]);

        // Check the last byte of that character's bitmap
        const addressA_end = addressA_start + CHAR_HEIGHT - 1; // Uses CHAR_HEIGHT from constants
        const romIndexA_end = romIndexA_start + CHAR_HEIGHT - 1; // Uses CHAR_HEIGHT from constants
        expect(cpu.memory.read(addressA_end)).toBe(asciiFontRomData[romIndexA_end]);

        // Check the last byte of the entire loaded ROM data
        const lastRomAddress = FONT_ROM_START_ADDRESS + asciiFontRomData.length - 1;
        const lastRomIndex = asciiFontRomData.length - 1;
        expect(cpu.memory.read(lastRomAddress)).toBe(asciiFontRomData[lastRomIndex]);

        // Optional: Check a byte just after the ROM area (should be 0 after reset)
        const addressAfterRom = FONT_ROM_START_ADDRESS + asciiFontRomData.length;
        if (addressAfterRom < cpu.memory.size) {
             expect(cpu.memory.read(addressAfterRom)).toBe(0);
        }
    });

    test('step() should execute LDX Immediate', () => {
        // 0xA2 0x55 is LDX #$55
        cpu.memory.write(0x0000, 0xA2); // LDX_IMM Opcode
        cpu.memory.write(0x0001, 0x55); // Immediate value
        cpu.registers.PC = 0x0000;
        cpu.registers.X = 0; // Ensure X starts at 0
        cpu.registers.P = 0; // Clear flags

        cpu.step();

        expect(cpu.registers.X).toBe(0x55);
        expect(cpu.registers.PC).toBe(0x0002);
        // Check flags (Z=0, N=0 for 0x55)
        expect(cpu.registers.getZeroFlag()).toBe(false);
        expect(cpu.registers.getNegativeFlag()).toBe(false);
    });

    test('step() should execute STX Zero Page', () => {
        // 0x86 0x30 is STX $30
        cpu.memory.write(0x0000, 0x86); // STX_ZP Opcode
        cpu.memory.write(0x0001, 0x30); // Zero Page address
        cpu.registers.PC = 0x0000;
        cpu.registers.X = 0xCC; // Value to store
        cpu.memory.write(0x0030, 0); // Ensure target memory is initially 0

        cpu.step();

        expect(cpu.memory.read(0x0030)).toBe(0xCC);
        expect(cpu.registers.PC).toBe(0x0002);
    });

    test('step() should execute ADC Immediate (no carry in, no carry out, no overflow)', () => {
        // 0x69 0x10 is ADC #$10
        cpu.memory.write(0x0000, 0x69); // ADC_IMM Opcode
        cpu.memory.write(0x0001, 0x10); // Immediate value
        cpu.registers.PC = 0x0000;
        cpu.registers.A = 0x20;
        cpu.registers.setCarryFlag(false); // Clear carry initially
        cpu.registers.setOverflowFlag(false); // Clear overflow initially

        cpu.step(); // A = 0x20 + 0x10 + 0 = 0x30

        expect(cpu.registers.A).toBe(0x30);
        expect(cpu.registers.PC).toBe(0x0002);
        expect(cpu.registers.getCarryFlag()).toBe(false);
        expect(cpu.registers.getZeroFlag()).toBe(false);
        expect(cpu.registers.getNegativeFlag()).toBe(false);
        expect(cpu.registers.getOverflowFlag()).toBe(false);
    });

    test('step() should execute ADC Immediate (carry in, no carry out, no overflow)', () => {
        // 0x69 0x10 is ADC #$10
        cpu.memory.write(0x0000, 0x69);
        cpu.memory.write(0x0001, 0x10);
        cpu.registers.PC = 0x0000;
        cpu.registers.A = 0x20;
        cpu.registers.setCarryFlag(true); // Set carry initially

        cpu.step(); // A = 0x20 + 0x10 + 1 = 0x31

        expect(cpu.registers.A).toBe(0x31);
        expect(cpu.registers.PC).toBe(0x0002);
        expect(cpu.registers.getCarryFlag()).toBe(false);
        expect(cpu.registers.getZeroFlag()).toBe(false);
        expect(cpu.registers.getNegativeFlag()).toBe(false);
        expect(cpu.registers.getOverflowFlag()).toBe(false);
    });

    test('step() should execute ADC Immediate (no carry in, carry out, negative)', () => {
        // 0x69 0x80 is ADC #$80
        cpu.memory.write(0x0000, 0x69);
        cpu.memory.write(0x0001, 0x80); // 128
        cpu.registers.PC = 0x0000;
        cpu.registers.A = 0x80; // 128
        cpu.registers.setCarryFlag(false);

        cpu.step(); // A = 0x80 + 0x80 + 0 = 0x100 -> result 0x00, carry=1

        expect(cpu.registers.A).toBe(0x00);
        expect(cpu.registers.PC).toBe(0x0002);
        expect(cpu.registers.getCarryFlag()).toBe(true);
        expect(cpu.registers.getZeroFlag()).toBe(true);
        expect(cpu.registers.getNegativeFlag()).toBe(false); // Result 0 is not negative
        expect(cpu.registers.getOverflowFlag()).toBe(true); // 128 + 128 = 256 (signed: -128 + -128 = -256), result 0 is positive -> overflow
    });

     test('step() should execute ADC Immediate (overflow positive -> negative)', () => {
        // 0x69 0x7F is ADC #$7F
        cpu.memory.write(0x0000, 0x69);
        cpu.memory.write(0x0001, 0x7F); // 127
        cpu.registers.PC = 0x0000;
        cpu.registers.A = 0x01; // 1
        cpu.registers.setCarryFlag(false);

        cpu.step(); // A = 0x01 + 0x7F + 0 = 0x80 -> result 0x80 (-128), carry=0

        expect(cpu.registers.A).toBe(0x80); // -128
        expect(cpu.registers.PC).toBe(0x0002);
        expect(cpu.registers.getCarryFlag()).toBe(false);
        expect(cpu.registers.getZeroFlag()).toBe(false);
        expect(cpu.registers.getNegativeFlag()).toBe(true); // Result is negative
        expect(cpu.registers.getOverflowFlag()).toBe(true); // Positive (1) + Positive (127) resulted in Negative (-128) -> overflow
    });

    test('step() should execute ADC Immediate (zero flag set)', () => {
        // 0x69 0xFF is ADC #$FF (-1)
        cpu.memory.write(0x0000, 0x69);
        cpu.memory.write(0x0001, 0xFF); // -1
        cpu.registers.PC = 0x0000;
        cpu.registers.A = 0x01; // 1
        cpu.registers.setCarryFlag(false);

        cpu.step(); // A = 0x01 + 0xFF + 0 = 0x100 -> result 0x00, carry=1

        expect(cpu.registers.A).toBe(0x00);
        expect(cpu.registers.PC).toBe(0x0002);
        expect(cpu.registers.getCarryFlag()).toBe(true);
        expect(cpu.registers.getZeroFlag()).toBe(true); // Result is zero
        expect(cpu.registers.getNegativeFlag()).toBe(false);
        expect(cpu.registers.getOverflowFlag()).toBe(false); // Positive (1) + Negative (-1) = 0 -> no overflow
    });

    test('step() should execute LDY Immediate', () => {
        // 0xA0 0x88 is LDY #$88
        cpu.memory.write(0x0000, 0xA0); // LDY_IMM Opcode
        cpu.memory.write(0x0001, 0x88); // Immediate value
        cpu.registers.PC = 0x0000;
        cpu.registers.Y = 0;
        cpu.registers.P = 0;

        cpu.step();

        expect(cpu.registers.Y).toBe(0x88);
        expect(cpu.registers.PC).toBe(0x0002);
        expect(cpu.registers.getZeroFlag()).toBe(false);
        expect(cpu.registers.getNegativeFlag()).toBe(true); // Bit 7 is set
    });

    test('step() should execute LDA Absolute, Y', () => {
        // 0xB9 0x00 0x02, with Y=0x05 -> LDA $0200 + $05 = $0205
        cpu.memory.write(0x0000, 0xB9); // LDA_ABSY Opcode
        cpu.memory.write(0x0001, 0x00); // Low byte of base address
        cpu.memory.write(0x0002, 0x02); // High byte of base address
        cpu.registers.PC = 0x0000;
        cpu.registers.Y = 0x05;
        cpu.registers.A = 0;
        cpu.memory.write(0x0205, 0xAA); // Value at target address

        cpu.step();

        expect(cpu.registers.A).toBe(0xAA);
        expect(cpu.registers.PC).toBe(0x0003); // PC moved past opcode and address
        expect(cpu.registers.getNegativeFlag()).toBe(true);
    });

    test('step() should execute STA Absolute, Y', () => {
        // 0x99 0x10 0x03, with Y=0x02 -> STA $0310 + $02 = $0312
        cpu.memory.write(0x0000, 0x99); // STA_ABSY Opcode
        cpu.memory.write(0x0001, 0x10); // Low byte of base address
        cpu.memory.write(0x0002, 0x03); // High byte of base address
        cpu.registers.PC = 0x0000;
        cpu.registers.Y = 0x02;
        cpu.registers.A = 0xBB; // Value to store
        cpu.memory.write(0x0312, 0); // Ensure target is initially 0

        cpu.step();

        expect(cpu.memory.read(0x0312)).toBe(0xBB);
        expect(cpu.registers.PC).toBe(0x0003);
    });

    test('step() should execute INY', () => {
        cpu.memory.write(0x0000, 0xC8); // INY Opcode
        cpu.registers.PC = 0x0000;
        cpu.registers.Y = 0x05;
        cpu.registers.P = 0;

        cpu.step();

        expect(cpu.registers.Y).toBe(0x06);
        expect(cpu.registers.PC).toBe(0x0001);
        expect(cpu.registers.getZeroFlag()).toBe(false);
        expect(cpu.registers.getNegativeFlag()).toBe(false);
    });

     test('step() should execute INY with wrap around', () => {
        cpu.memory.write(0x0000, 0xC8); // INY Opcode
        cpu.registers.PC = 0x0000;
        cpu.registers.Y = 0xFF;
        cpu.registers.P = 0;

        cpu.step();

        expect(cpu.registers.Y).toBe(0x00);
        expect(cpu.registers.PC).toBe(0x0001);
        expect(cpu.registers.getZeroFlag()).toBe(true); // Result is zero
        expect(cpu.registers.getNegativeFlag()).toBe(false);
    });

    test('step() should execute CPY Immediate (Y == value)', () => {
        // 0xC0 0x10 is CPY #$10
        cpu.memory.write(0x0000, 0xC0); // CPY_IMM Opcode
        cpu.memory.write(0x0001, 0x10); // Immediate value
        cpu.registers.PC = 0x0000;
        cpu.registers.Y = 0x10;
        cpu.registers.P = 0; // Clear flags

        cpu.step();

        expect(cpu.registers.PC).toBe(0x0002);
        expect(cpu.registers.getZeroFlag()).toBe(true); // Y == value
        expect(cpu.registers.getNegativeFlag()).toBe(false); // Result 0 is not negative
        expect(cpu.registers.getCarryFlag()).toBe(true); // Y >= value
    });

    test('step() should execute CPY Immediate (Y > value)', () => {
        cpu.memory.write(0x0000, 0xC0);
        cpu.memory.write(0x0001, 0x10);
        cpu.registers.PC = 0x0000;
        cpu.registers.Y = 0x20;
        cpu.registers.P = 0;

        cpu.step();

        expect(cpu.registers.PC).toBe(0x0002);
        expect(cpu.registers.getZeroFlag()).toBe(false); // Y != value
        expect(cpu.registers.getNegativeFlag()).toBe(false); // Result 0x10 is positive
        expect(cpu.registers.getCarryFlag()).toBe(true); // Y >= value
    });

    test('step() should execute CPY Immediate (Y < value)', () => {
        cpu.memory.write(0x0000, 0xC0);
        cpu.memory.write(0x0001, 0x80); // Value = 128
        cpu.registers.PC = 0x0000;
        cpu.registers.Y = 0x10; // Y = 16
        cpu.registers.P = 0;

        cpu.step(); // 16 - 128 = -112 (0x90)

        expect(cpu.registers.PC).toBe(0x0002);
        expect(cpu.registers.getZeroFlag()).toBe(false); // Y != value
        expect(cpu.registers.getNegativeFlag()).toBe(true); // Result 0x90 is negative
        expect(cpu.registers.getCarryFlag()).toBe(false); // Y < value (borrow occurred)
    });

    test('step() should execute BNE (branch taken)', () => {
        // 0xD0 0x05 is BNE +5
        cpu.memory.write(0x0100, 0xD0); // BNE Opcode
        cpu.memory.write(0x0101, 0x05); // Relative offset +5
        cpu.registers.PC = 0x0100;
        cpu.registers.setZeroFlag(false); // Ensure Z=0 for branch

        const expectedPC = (0x0100 + 2 + 5) & 0xFFFF; // PC after fetch + offset
        cpu.step();

        expect(cpu.registers.PC).toBe(expectedPC); // Should be 0x0107
    });

    test('step() should execute BNE (branch not taken)', () => {
        // 0xD0 0x05 is BNE +5
        cpu.memory.write(0x0100, 0xD0); // BNE Opcode
        cpu.memory.write(0x0101, 0x05); // Relative offset +5
        cpu.registers.PC = 0x0100;
        cpu.registers.setZeroFlag(true); // Ensure Z=1, no branch

        const expectedPC = (0x0100 + 2) & 0xFFFF; // PC after fetch only
        cpu.step();

        expect(cpu.registers.PC).toBe(expectedPC); // Should be 0x0102
    });

     test('step() should execute BNE (branch taken, negative offset)', () => {
        // 0xD0 0xFB is BNE -5 (FB = -5 signed)
        cpu.memory.write(0x0105, 0xD0); // BNE Opcode
        cpu.memory.write(0x0106, 0xFB); // Relative offset -5
        cpu.registers.PC = 0x0105;
        cpu.registers.setZeroFlag(false); // Ensure Z=0 for branch

        const expectedPC = (0x0105 + 2 - 5) & 0xFFFF; // PC after fetch + offset
        cpu.step();

        expect(cpu.registers.PC).toBe(expectedPC); // Should be 0x0102
    });

});
