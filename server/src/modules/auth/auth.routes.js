// @ts-check
import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { authenticateToken, attachCompanyContext } from '../../middleware/auth.js';
import {
  signupSchema,
  loginSchema,
  refreshTokenSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.schemas.js';
import {
  signupHandler,
  loginHandler,
  refreshHandler,
  logoutHandler,
  verifyEmailHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
  meHandler,
} from './auth.controller.js';

export const authRouter = Router();

authRouter.post('/signup', validate(signupSchema), signupHandler);
authRouter.post('/login', validate(loginSchema), loginHandler);
authRouter.post('/refresh', validate(refreshTokenSchema), refreshHandler);
authRouter.post('/logout', logoutHandler);
authRouter.post('/verify-email', validate(verifyEmailSchema), verifyEmailHandler);
authRouter.post('/forgot-password', validate(forgotPasswordSchema), forgotPasswordHandler);
authRouter.post('/reset-password', validate(resetPasswordSchema), resetPasswordHandler);

// Authenticated session context
authRouter.get('/me', authenticateToken, attachCompanyContext, meHandler);
