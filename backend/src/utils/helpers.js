import crypto from 'node:crypto';

export const isValidId = (id) => typeof id === 'string' && /^[a-f\d]{24}$/i.test(id);
export const slugify = (value) => `${String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-')}-${crypto.randomBytes(3).toString('hex')}`;
export const makeInviteToken = () => crypto.randomBytes(32).toString('hex');
export const safeUser = (user) => ({
  id: String(user._id),
  name: user.name,
  email: user.email,
  avatarColor: user.avatarColor || '#7765E3',
});
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
