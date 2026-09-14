// @ts-check
import { verifyAccessToken } from '../lib/jwt.js';
import { prisma } from '../lib/prisma.js';

/**
 * Middleware: Verify JWT access token and populate `req.user`.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication token required' });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (_err) {
      return res.status(401).json({ error: 'Invalid or expired access token' });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'User account not found' });
    }

    // @ts-ignore
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware: Validate user's membership in the target company and populate `req.company` and `req.membership`.
 * Checks `x-company-id` header or falls back to the user's primary workspace.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function attachCompanyContext(req, res, next) {
  try {
    // @ts-ignore
    const user = req.user;
    if (!user) {
      return res
        .status(401)
        .json({ error: 'Authentication required before attaching company context' });
    }

    const requestedCompanyId = req.headers['x-company-id'] || req.query.companyId;

    let membership;
    if (requestedCompanyId) {
      membership = await prisma.membership.findUnique({
        where: {
          userId_companyId: {
            userId: user.id,
            companyId: String(requestedCompanyId),
          },
        },
        include: { company: true },
      });
    } else {
      // Default to the first active company membership
      membership = await prisma.membership.findFirst({
        where: {
          userId: user.id,
          status: 'ACTIVE',
          company: { deletedAt: null },
        },
        include: { company: true },
        orderBy: { createdAt: 'asc' },
      });
    }

    if (!membership || membership.status !== 'ACTIVE' || membership.company.deletedAt) {
      return res.status(403).json({
        error: 'Forbidden: You do not have active access to this workspace',
      });
    }

    // @ts-ignore
    req.company = membership.company;
    // @ts-ignore
    req.membership = membership;

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware Factory: Enforce role-based access control within the active workspace.
 * Must be preceded by `attachCompanyContext`.
 *
 * @param {('OWNER' | 'ADMIN' | 'MEMBER')[]} roles
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    // @ts-ignore
    const membership = req.membership;
    if (!membership) {
      return res.status(500).json({ error: 'Workspace context missing' });
    }

    if (!roles.includes(membership.role)) {
      return res.status(403).json({
        error: 'Forbidden: You do not have sufficient permissions for this action',
      });
    }

    next();
  };
}
