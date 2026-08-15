import { UserDocument } from '../models/User';

export function serializeUser(user: UserDocument) {
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
    profile: user.profile,
  };
}
