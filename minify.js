import { minify } from 'terser';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

async function minifyFile(filePath) {
  const code = readFileSync(filePath, 'utf8');
  const result = await minify(code, {
    mangle: true,
    compress: {
      dead_code: true,
      drop_debugger: true,
      conditionals: true,
      evaluate: true,
      booleans: true,
      loops: true,
      unused: true,
      hoist_funs: true,
      keep_fargs: false,
      hoist_vars: true,
      if_return: true,
      join_vars: true,
      cascade: true,
      side_effects: true,
      warnings: false
    }
  });
  return result.code;
}

async function processDirectory(directory) {
  const files = readdirSync(directory);

  for (const file of files) {
    const filePath = join(directory, file);
    const stat = statSync(filePath);

    if (stat.isDirectory()) {
      await processDirectory(filePath);
    } else if (extname(file) === '.js') {
      console.log(`Minifying ${filePath}`);
      try {
        const minifiedCode = await minifyFile(filePath);
        writeFileSync(filePath, minifiedCode);
        console.log(`Minified ${filePath}`);
      } catch (error) {
        console.error(`Error minifying ${filePath}:`, error);
      }
    }
  }
}

// Minify all JS files in the google_map_parks directory
await processDirectory('./google_map_parks');

console.log('Minification complete');