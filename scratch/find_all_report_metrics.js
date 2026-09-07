// scratch/find_all_report_metrics.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uiPath = path.join(__dirname, '../js/modules/process-mapping/process-mapping-ui.js');
const content = fs.readFileSync(uiPath, 'utf-8');

const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (
    line.includes('ruleReport') ||
    line.includes('edgeReport') ||
    line.includes('Rules Linked') ||
    line.includes('Flow Edges') ||
    line.includes('Aturan Bisnis') ||
    line.includes('16 ') ||
    line.includes('Task 10')
  ) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
