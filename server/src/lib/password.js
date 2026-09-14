// @ts-check
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/**
 * Hash a plain text password using bcrypt.
 * @param {string} password - The plain text password
 * @returns {Promise<string>} - Hashed password
 */
export async function hashPassword(password) {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare a plain text password against a bcrypt hash.
 * @param {string} password - The plain text password
 * @param {string} hash - The stored bcrypt hash
 * @returns {Promise<boolean>} - True if matching, false otherwise
 */
export async function comparePassword(password, hash) {
  return await bcrypt.compare(password, hash);
}
