// @ts-check
import { PrismaClient } from '@prisma/client';
import { logger } from './logger.js';

const prismaClientSingleton = () => {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? [
            { emit: 'event', level: 'query' },
            { emit: 'stdout', level: 'error' },
            { emit: 'stdout', level: 'info' },
            { emit: 'stdout', level: 'warn' },
          ]
        : ['error'],
  });
};

/** @type {PrismaClient} */
export const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}

// Attach query logging in development
if (process.env.NODE_ENV === 'development') {
  // @ts-ignore
  prisma.$on('query', (e) => {
    logger.debug({ query: e.query, params: e.params, duration: `${e.duration}ms` }, 'Prisma Query');
  });
}

/**
 * Execute database queries scoped to a specific company/tenant.
 * Sets the PostgreSQL local session variable `app.current_company_id` for RLS enforcement
 * within an interactive transaction.
 *
 * @template T
 * @param {string} companyId - The active tenant's UUID
 * @param {(tx: import('@prisma/client').Prisma.TransactionClient) => Promise<T>} callback - Work callback
 * @returns {Promise<T>}
 */
export async function scopedQuery(companyId, callback) {
  if (!companyId) {
    throw new Error('Tenant scoping violation: companyId is required for scoped queries');
  }

  return await prisma.$transaction(async (tx) => {
    // Set PostgreSQL session variable for Row Level Security
    await tx.$executeRawUnsafe(
      `SET LOCAL app.current_company_id = '${companyId.replace(/'/g, "''")}'`
    );
    return await callback(tx);
  });
}
