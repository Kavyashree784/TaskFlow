import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { User, Team } from '../models/index.js';
import { asyncHandler, safeUser, slugify } from '../utils/helpers.js';
import { createToken, requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/register', asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (name.length < 2 || name.length > 70) return res.status(400).json({ message: 'Name must be between 2 and 70 characters.' });
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: 'Enter a valid email address.' });
  if (password.length < 8) return res.status(400).json({ message: 'Password must contain at least 8 characters.' });
  if (await User.exists({ email })) return res.status(409).json({ message: 'An account with this email already exists.' });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email, passwordHash });
  const team = await Team.create({
    name: `${name.split(' ')[0]}'s workspace`,
    slug: slugify(`${name}-workspace`),
    owner: user._id,
    members: [{ user: user._id, role: 'owner' }],
  });
  res.status(201).json({ token: createToken(user), user: safeUser(user), teamId: String(team._id) });
}));

router.post('/login', asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ message: 'Email or password is incorrect.' });
  }
  res.json({ token: createToken(user), user: safeUser(user) });
}));

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  res.json({ user: safeUser(req.user) });
}));

export default router;
