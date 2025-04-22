import fs from 'fs';
import path from 'path';
// Adjust the path based on your project structure if needed
import { asciiFontRomData } from '../js/roms/ascii.js';

const outputDir = 'dist'; // Directory to save the ROM file
const outputFilename = 'characters.rom';
const outputPath = path.join(outputDir, outputFilename);

try {
    // Ensure the output directory exists
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
        console.log(`Created output directory: ${outputDir}`);
    }

    // Write the Uint8Array data directly to the file
    // This creates a binary file with the byte values from the array
    fs.writeFileSync(outputPath, asciiFontRomData);

    console.log(`Successfully created ROM file: ${outputPath} (${asciiFontRomData.length} bytes)`);
} catch (err) {
    console.error(`Error creating ROM file at ${outputPath}:`, err);
    process.exit(1); // Exit with an error code
}
