// @ts-check
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from '../src/lib/prisma.js';
import { logger } from '../src/lib/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyRls() {
  const sqlFile = path.join(__dirname, 'rls_policies.sql');
  const sql = fs.readFileSync(sqlFile, 'utf8');

  // Split by semicolon statements
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));

  logger.info('Applying PostgreSQL Row Level Security (RLS) policies...');

  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement);
  }

  logger.info('Successfully applied all RLS policies.');
}

applyRls()
  .catch((err) => {
    logger.error(err, 'Failed to apply RLS policies');
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
