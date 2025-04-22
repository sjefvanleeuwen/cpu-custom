import { Memory } from '../js/memory.js'; // Adjust path as needed

describe('Memory', () => {
    let memory;

    beforeEach(() => {
        // Create a smaller memory for faster tests
        memory = new Memory(256); // 256 bytes
    });

    test('should initialize with zeros', () => {
        expect(memory.read(0)).toBe(0);
        expect(memory.read(100)).toBe(0);
        expect(memory.read(255)).toBe(0);
    });

    test('should write and read a byte', () => {
        memory.write(10, 0xAB);
        expect(memory.read(10)).toBe(0xAB);
    });

    test('should handle 8-bit wrap-around on write', () => {
        memory.write(20, 0x123); // Should store 0x23
        expect(memory.read(20)).toBe(0x23);
    });

    test('should reset memory to zeros', () => {
        memory.write(5, 0xFF);
        memory.reset();
        expect(memory.read(5)).toBe(0);
    });

    test('should load a program correctly', () => {
        const program = [0xA9, 0x01, 0x8D, 0x00, 0x02];
        memory.loadProgram(program, 0x10);
        expect(memory.read(0x10)).toBe(0xA9);
        expect(memory.read(0x11)).toBe(0x01);
        expect(memory.read(0x12)).toBe(0x8D);
        expect(memory.read(0x13)).toBe(0x00);
        expect(memory.read(0x14)).toBe(0x02);
        // Check surrounding memory is still 0
        expect(memory.read(0x0F)).toBe(0);
        expect(memory.read(0x15)).toBe(0);
    });

    // Add tests for out-of-bounds access if you implement strict checks
    // test('should handle read out of bounds', () => {
    //     expect(() => memory.read(256)).toThrow(); // Or expect(memory.read(256)).toBe(0);
    // });
    // test('should handle write out of bounds', () => {
    //     expect(() => memory.write(256, 0x11)).toThrow();
    // });
});
