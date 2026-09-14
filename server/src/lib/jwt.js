// @ts-check
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

/**
 * Generate Access and Refresh JWT token pair.
 * @param {{ userId: string; email: string }} payload
 * @returns {{ accessToken: string; refreshToken: string; expiresIn: string }}
 */
export function generateTokens({ userId, email }) {
  const accessToken = jwt.sign(
    { userId, email },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpiresIn }
  );

  const refreshToken = jwt.sign(
    { userId },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn }
  );

  return {
    accessToken,
    refreshToken,
    expiresIn: config.jwt.accessExpiresIn,
  };
}

/**
 * Verify and decode an Access Token.
 * @param {string} token
 * @returns {jwt.JwtPayload & { userId: string; email: string }}
 */
export function verifyAccessToken(token) {
  return /** @type {jwt.JwtPayload & { userId: string; email: string }} */ (
    jwt.verify(token, config.jwt.accessSecret)
  );
}

/**
 * Verify and decode a Refresh Token.
 * @param {string} token
 * @returns {jwt.JwtPayload & { userId: string }}
 */
export function verifyRefreshToken(token) {
  return /** @type {jwt.JwtPayload & { userId: string }} */ (
    jwt.verify(token, config.jwt.refreshSecret)
  );
}
