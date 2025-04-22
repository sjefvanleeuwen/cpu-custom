/**
 * Shared constants for the CPU simulation.
 */

// --- Memory Map ---
export const MEMORY_SIZE = 65536; // 64KB

// Font ROM Area (Example: 1KB starting at 0xF000)
export const FONT_ROM_START_ADDRESS = 0xF000;
export const CHAR_HEIGHT = 8; // Bytes per character (for 8x8 font)
export const NUM_CHARS = 128; // Number of characters in the font ROM (0-127) - Added here
export const FONT_ROM_SIZE = NUM_CHARS * CHAR_HEIGHT; // 1024 bytes (128 chars * 8 bytes/char)
export const FONT_ROM_END_ADDRESS = FONT_ROM_START_ADDRESS + FONT_ROM_SIZE - 1; // 0xF3FF

// Video RAM Area (Example: 1KB starting at 0x0400)
export const VRAM_START_ADDRESS = 0x0400;
// Size for 40x25 characters = 1000 bytes
export const VRAM_SIZE = 1000;
export const VRAM_END_ADDRESS = VRAM_START_ADDRESS + VRAM_SIZE - 1; // 0x07E7

// Add other memory-mapped regions as needed (e.g., I/O ports)
