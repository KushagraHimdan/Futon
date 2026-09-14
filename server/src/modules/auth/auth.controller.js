// @ts-check
import * as authService from './auth.service.js';

/**
 * Handler: POST /api/auth/signup
 */
export async function signupHandler(req, res, next) {
  try {
    const result = await authService.signup(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Handler: POST /api/auth/login
 */
export async function loginHandler(req, res, next) {
  try {
    const result = await authService.login(req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Handler: POST /api/auth/refresh
 */
export async function refreshHandler(req, res, next) {
  try {
    const result = await authService.refresh(req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Handler: POST /api/auth/logout
 */
export async function logoutHandler(req, res, next) {
  try {
    const result = await authService.logout(req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Handler: POST /api/auth/verify-email
 */
export async function verifyEmailHandler(req, res, next) {
  try {
    const result = await authService.verifyEmail(req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Handler: POST /api/auth/forgot-password
 */
export async function forgotPasswordHandler(req, res, next) {
  try {
    const result = await authService.forgotPassword(req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Handler: POST /api/auth/reset-password
 */
export async function resetPasswordHandler(req, res, next) {
  try {
    const result = await authService.resetPassword(req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Handler: GET /api/auth/me
 * Returns current authenticated user and their active workspace context.
 */
export async function meHandler(req, res) {
  res.status(200).json({
    // @ts-ignore
    user: req.user,
    // @ts-ignore
    company: req.company,
    // @ts-ignore
    membership: req.membership,
  });
}
