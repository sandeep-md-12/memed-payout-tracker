import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { loginSchema, signupSchema } from '../schemas/auth.schema';
import { requireAuth } from '../utils/permissions';
import { validateBody } from '../utils/validate';

export const authRouter = Router();

authRouter.post('/signup', validateBody(signupSchema), authController.signup);
authRouter.post('/login', validateBody(loginSchema), authController.login);
authRouter.get('/me', requireAuth, authController.me);
