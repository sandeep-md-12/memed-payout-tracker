import type { Request, Response } from 'express';
import type { LoginInput, SignupInput } from '../schemas/auth.schema';
import { authService } from '../services/auth.service';
import { Messages } from '../utils/constants';
import { currentUser } from '../utils/permissions';
import { sendSuccess } from '../utils/response';

export const authController = {
  async signup(req: Request<object, unknown, SignupInput>, res: Response): Promise<void> {
    const result = await authService.signup(req.body);
    sendSuccess(res, result, Messages.SIGNUP_SUCCESS, 201);
  },

  async login(req: Request<object, unknown, LoginInput>, res: Response): Promise<void> {
    const result = await authService.login(req.body);
    sendSuccess(res, result, Messages.LOGIN_SUCCESS);
  },

  async me(req: Request, res: Response): Promise<void> {
    const user = await authService.me(currentUser(req).id);
    sendSuccess(res, user, Messages.CURRENT_USER);
  },
};
