/**
 * Helper script to sync data/texts/stava_cintamani.json into data/texts/stava_cintamani.js
 * Usage: node scripts/sync_data.js
 */
const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '../data/texts/stava_cintamani.json');
const jsPath = path.join(__dirname, '../data/texts/stava_cintamani.js');

try {
  const jsonContent = fs.readFileSync(jsonPath, 'utf8');
  const dataset = JSON.parse(jsonContent);

  const jsContent = 
    "/* Stavacintamani Dataset from Sanskrit Wikisource */\n" +
    "window.TRIKA_TEXTS = window.TRIKA_TEXTS || {};\n\n" +
    "window.TRIKA_TEXTS['stava_cintamani'] = " + 
    JSON.stringify(dataset, null, 2) + 
    ";\n";

  fs.writeFileSync(jsPath, jsContent, 'utf8');
  console.log(`✓ Successfully synced ${jsonPath} -> ${jsPath}`);
} catch (err) {
  console.error('Error syncing dataset:', err);
  process.exit(1);
}
