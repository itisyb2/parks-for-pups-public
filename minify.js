import { minify } from 'bun';
import fs from 'fs';
import path from 'path';

async function minifyFile(filePath) {
    const code = await Bun.file(filePath).text();
    const minified = await minify(code);
    await Bun.write(filePath, minified);
}

async function processDirectory(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            await processDirectory(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
            await minifyFile(fullPath);
        }
    }
}

// Start processing from the root directory
processDirectory('.').catch(console.error);