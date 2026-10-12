import { UserModel, type User, type UserDocument } from '../models';

export const userRepository = {
  findByEmail(email: string, { withPassword = false } = {}): Promise<UserDocument | null> {
    const query = UserModel.findOne({ email: email.toLowerCase() });
    return (withPassword ? query.select('+passwordHash') : query).exec();
  },

  findById(id: string): Promise<UserDocument | null> {
    return UserModel.findById(id).exec();
  },

  create(data: Pick<User, 'name' | 'email' | 'passwordHash' | 'role'>): Promise<UserDocument> {
    return UserModel.create(data);
  },
};
