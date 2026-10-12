import type { UserDocument } from '../models';
import { userRepository } from '../repositories/user.repository';
import type { AuthResponse, LoginInput, SignupInput, UserResponse } from '../schemas/auth.schema';
import { ErrorCode } from '../utils/constants';
import { ConflictError, UnauthorizedError } from '../utils/exceptions';
import { hashPassword, signToken, verifyPassword } from '../utils/security';

function toUserResponse(user: UserDocument): UserResponse {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

function toAuthResponse(user: UserDocument): AuthResponse {
  return { token: signToken({ userId: user.id, role: user.role }), user: toUserResponse(user) };
}

export const authService = {
  async signup(input: SignupInput): Promise<AuthResponse> {
    if (await userRepository.findByEmail(input.email)) {
      throw new ConflictError(ErrorCode.EMAIL_TAKEN, 'An account with this email already exists');
    }
    const passwordHash = await hashPassword(input.password);
    const user = await userRepository.create({ name: input.name, email: input.email, passwordHash, role: input.role });
    return toAuthResponse(user);
  },

  async login(input: LoginInput): Promise<AuthResponse> {
    const user = await userRepository.findByEmail(input.email, { withPassword: true });
    // Same message whether the email or the password is wrong, so emails can't be probed.
    if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
      throw new UnauthorizedError('Email or password is incorrect', ErrorCode.INVALID_CREDENTIALS);
    }
    return toAuthResponse(user);
  },

  async me(userId: string): Promise<UserResponse> {
    const user = await userRepository.findById(userId);
    if (!user) throw new UnauthorizedError('This account no longer exists', ErrorCode.INVALID_TOKEN);
    return toUserResponse(user);
  },
};
