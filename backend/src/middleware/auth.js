import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import { asyncHandler } from '../utils/helpers.js';

export const requireAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Authentication required.' });
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'Session expired. Please sign in again.' });
  }

  // Keep database failures in the async error pipeline; they are not authentication failures.
  const user = await User.findById(payload.sub);
  if (!user) return res.status(401).json({ message: 'Account no longer exists.' });
  req.user = user;
  next();
});

export const createToken = (user) => jwt.sign(
  { sub: String(user._id) },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
);
