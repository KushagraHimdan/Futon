// @ts-check
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../lib/prisma.js';
import { hashPassword, comparePassword } from '../../lib/password.js';
import { generateTokens, verifyRefreshToken } from '../../lib/jwt.js';

/**
 * Generate a clean URL slug from a company name.
 * @param {string} name
 * @returns {string}
 */
export function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Ensures a company slug is unique in the database.
 * @param {string} baseSlug
 * @returns {Promise<string>}
 */
async function getUniqueCompanySlug(baseSlug) {
  let candidate = baseSlug || 'workspace';
  let counter = 1;

  while (true) {
    const existing = await prisma.company.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }

    candidate = `${baseSlug}-${counter}`;
    counter++;
  }
}

/**
 * Register a new user, create their default company workspace, assign OWNER role, and issue tokens.
 *
 * @param {{ email: string; password: string; name: string; companyName: string }} input
 */
export async function signup({ email, password, name, companyName }) {
  const normalizedEmail = email.toLowerCase().trim();

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    const err = new Error('A user with this email address already exists');
    // @ts-ignore
    err.status = 409;
    throw err;
  }

  const passwordHash = await hashPassword(password);
  const baseSlug = slugify(companyName);
  const uniqueSlug = await getUniqueCompanySlug(baseSlug);

  // Perform signup in an atomic transaction
  let result;
  try {
    result = await prisma.$transaction(async (tx) => {
      // 1. Create the user
      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          name: name.trim(),
          emailVerified: false,
        },
        select: {
          id: true,
          email: true,
          name: true,
          emailVerified: true,
          createdAt: true,
        },
      });

      // 2. Create the company workspace
      const company = await tx.company.create({
        data: {
          name: companyName.trim(),
          slug: uniqueSlug,
          plan: 'free',
          subscriptionStatus: 'free',
        },
      });

      // 3. Create the OWNER membership
      const membership = await tx.membership.create({
        data: {
          userId: user.id,
          companyId: company.id,
          role: 'OWNER',
          status: 'ACTIVE',
        },
      });

      // 4. Log the audit event
      await tx.auditLog.create({
        data: {
          companyId: company.id,
          actorUserId: user.id,
          action: 'company.created',
          target: company.id,
          metadata: {
            companyName: company.name,
            slug: company.slug,
          },
        },
      });

      return { user, company, membership };
    });
  } catch (error) {
    if (error?.code === 'P2002') {
      const err = new Error('A user with this email address already exists');
      // @ts-ignore
      err.status = 409;
      throw err;
    }
    throw error;
  }

  const tokens = generateTokens({
    userId: result.user.id,
    email: result.user.email,
  });

  return {
    user: result.user,
    company: {
      id: result.company.id,
      name: result.company.name,
      slug: result.company.slug,
      role: result.membership.role,
    },
    tokens,
  };
}

/**
 * Authenticate an existing user by email and password.
 *
 * @param {{ email: string; password: string }} input
 */
export async function login({ email, password }) {
  const normalizedEmail = email.toLowerCase().trim();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: {
      memberships: {
        where: {
          status: 'ACTIVE',
          company: { deletedAt: null },
        },
        include: {
          company: true,
        },
      },
    },
  });

  if (!user) {
    const err = new Error('Invalid email or password');
    // @ts-ignore
    err.status = 401;
    throw err;
  }

  const isPasswordValid = await comparePassword(password, user.passwordHash);
  if (!isPasswordValid) {
    const err = new Error('Invalid email or password');
    // @ts-ignore
    err.status = 401;
    throw err;
  }

  const tokens = generateTokens({
    userId: user.id,
    email: user.email,
  });

  const companies = user.memberships.map((m) => ({
    id: m.company.id,
    name: m.company.name,
    slug: m.company.slug,
    role: m.role,
  }));

  const activeCompany = companies.length > 0 ? companies[0] : null;

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerified,
    },
    companies,
    activeCompany,
    tokens,
  };
}

/**
 * Refresh access token using a valid refresh token.
 *
 * @param {{ refreshToken: string }} input
 */
export async function refresh({ refreshToken }) {
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (_err) {
    const err = new Error('Invalid or expired refresh token');
    // @ts-ignore
    err.status = 401;
    throw err;
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: { id: true, email: true },
  });

  if (!user) {
    const err = new Error('User not found');
    // @ts-ignore
    err.status = 401;
    throw err;
  }

  const tokens = generateTokens({
    userId: user.id,
    email: user.email,
  });

  return { tokens };
}

/**
 * Logout user (acknowledges token invalidation).
 *
 * @param {{ refreshToken?: string }} _input
 */
export async function logout(_input) {
  return { message: 'Logged out successfully' };
}

/**
 * Verify user's email with token.
 *
 * @param {{ token: string }} input
 */
export async function verifyEmail({ token }) {
  const user = await prisma.user.findFirst({
    where: { verificationToken: token },
  });

  if (!user) {
    const err = new Error('Invalid or expired verification token');
    // @ts-ignore
    err.status = 400;
    throw err;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      verificationToken: null,
    },
  });

  return { message: 'Email verified successfully' };
}

/**
 * Initiate password reset flow.
 *
 * @param {{ email: string }} input
 */
export async function forgotPassword({ email }) {
  const normalizedEmail = email.toLowerCase().trim();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (user) {
    const resetToken = uuidv4();
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpires: resetExpires,
      },
    });

    // Note: Email sending will be wired into BullMQ in section 1.4 / 2.4
  }

  return {
    message: 'If an account exists with this email, instructions have been sent.',
  };
}

/**
 * Reset password using a valid reset token.
 *
 * @param {{ token: string; newPassword: string }} input
 */
export async function resetPassword({ token, newPassword }) {
  const user = await prisma.user.findFirst({
    where: {
      resetPasswordToken: token,
      resetPasswordExpires: {
        gt: new Date(),
      },
    },
  });

  if (!user) {
    const err = new Error('Invalid or expired password reset token');
    // @ts-ignore
    err.status = 400;
    throw err;
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    },
  });

  return { message: 'Password has been reset successfully. You can now log in.' };
}
