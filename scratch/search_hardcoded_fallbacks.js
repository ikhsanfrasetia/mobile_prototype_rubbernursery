// scratch/search_hardcoded_fallbacks.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uiPath = path.join(__dirname, '../js/modules/process-mapping/process-mapping-ui.js');
const content = fs.readFileSync(uiPath, 'utf-8');

const regex = /(\?\?|\|\|)\s*(172|170|175|156|18|16|5|11|21|2)\b/g;
let match;
let count = 0;
while ((match = regex.exec(content)) !== null) {
  count++;
  const lineNo = content.substring(0, match.index).split('\n').length;
  console.log(`Line ${lineNo}: found '${match[0]}'`);
}

console.log(`Total occurrences found: ${count}`);
