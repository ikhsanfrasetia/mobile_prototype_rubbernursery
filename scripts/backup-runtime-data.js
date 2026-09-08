/**
 * scripts/backup-runtime-data.js — Runtime Data Backup Utility
 * Creates timestamped snapshots of runtime data before deployment or maintenance.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

function createBackup() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:T]/g, '').slice(0, 14); // YYYYMMDDHHmmss

  const files = [
    { src: 'process-mapping-data.json', prefix: 'pm_data' },
    { src: 'process-mapping-audit-log.json', prefix: 'pm_audit' },
    { src: 'notes.json', prefix: 'notes' }
  ];

  let backedUpCount = 0;

  for (const item of files) {
    const srcPath = path.join(DATA_DIR, item.src);
    if (fs.existsSync(srcPath)) {
      const destFilename = `${item.prefix}_backup_${timestamp}.json`;
      const destPath = path.join(BACKUP_DIR, destFilename);
      fs.copyFileSync(srcPath, destPath);
      console.log(`✅ Backed up: ${item.src} -> data/backups/${destFilename}`);
      backedUpCount++;
    } else {
      console.log(`ℹ️ Skipped (file not present): ${item.src}`);
    }
  }

  console.log(`\n🎉 Backup complete. Total files backed up: ${backedUpCount}`);
  return { success: true, timestamp, backedUpCount };
}

createBackup();
