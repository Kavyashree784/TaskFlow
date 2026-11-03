import { Router } from 'express';
import { Activity, Invitation, Task, Team, User } from '../models/index.js';
import { asyncHandler, makeInviteToken, safeUser, slugify, isValidId } from '../utils/helpers.js';
import { loadTeam, requireManager } from '../middleware/access.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

function serializeTeam(team) {
  return {
    id: String(team._id), name: team.name, slug: team.slug, owner: String(team.owner),
    members: team.members.map((m) => ({
      user: m.user?._id ? safeUser(m.user) : { id: String(m.user) },
      role: m.role, joinedAt: m.joinedAt,
    })),
    createdAt: team.createdAt,
  };
}

router.get('/', asyncHandler(async (req, res) => {
  const teams = await Team.find({ 'members.user': req.user._id }).populate('members.user', 'name email avatarColor').sort({ createdAt: 1 });
  res.json({ teams: teams.map(serializeTeam) });
}));

router.post('/', asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (name.length < 2 || name.length > 80) return res.status(400).json({ message: 'Workspace name must be between 2 and 80 characters.' });
  const team = await Team.create({ name, slug: slugify(name), owner: req.user._id, members: [{ user: req.user._id, role: 'owner' }] });
  await Activity.create({ team: team._id, actor: req.user._id, action: 'created', entityType: 'team', entityId: team._id, message: `created the ${name} workspace` });
  await team.populate('members.user', 'name email avatarColor');
  res.status(201).json({ team: serializeTeam(team) });
}));

router.get('/:id', loadTeam, asyncHandler(async (req, res) => {
  res.json({ team: serializeTeam(req.team) });
}));

router.patch('/:id', loadTeam, requireManager, asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (name.length < 2 || name.length > 80) return res.status(400).json({ message: 'Workspace name must be between 2 and 80 characters.' });
  req.team.name = name;
  await req.team.save();
  await req.team.populate('members.user', 'name email avatarColor');
  res.json({ team: serializeTeam(req.team) });
}));

router.post('/:id/invitations', loadTeam, requireManager, asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const role = ['admin', 'member'].includes(req.body.role) ? req.body.role : 'member';
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: 'Enter a valid email address.' });
  const existingUser = await User.findOne({ email });
  if (existingUser && req.team.members.some((m) => String(m.user?._id || m.user) === String(existingUser._id))) {
    return res.status(409).json({ message: 'This person is already a member of the workspace.' });
  }
  await Invitation.updateMany({ team: req.team._id, email, acceptedAt: null }, { $set: { expiresAt: new Date() } });
  const token = makeInviteToken();
  const invitation = await Invitation.create({ team: req.team._id, email, role, token, inviter: req.user._id, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });
  res.status(201).json({ invitation: { id: String(invitation._id), email, role, token, expiresAt: invitation.expiresAt } });
}));

router.get('/invitation/:token', asyncHandler(async (req, res) => {
  const invite = await Invitation.findOne({ token: req.params.token, acceptedAt: null, expiresAt: { $gt: new Date() } }).populate('team', 'name').populate('inviter', 'name');
  if (!invite) return res.status(404).json({ message: 'This invitation is invalid or has expired.' });
  res.json({ invitation: { email: invite.email, role: invite.role, teamName: invite.team.name, inviterName: invite.inviter.name, expiresAt: invite.expiresAt } });
}));

router.post('/invitation/:token/accept', asyncHandler(async (req, res) => {
  const invite = await Invitation.findOne({ token: req.params.token, acceptedAt: null, expiresAt: { $gt: new Date() } });
  if (!invite) return res.status(404).json({ message: 'This invitation is invalid or has expired.' });
  if (invite.email !== req.user.email) return res.status(403).json({ message: `Sign in with ${invite.email} to accept this invitation.` });
  const team = await Team.findById(invite.team);
  if (!team) return res.status(404).json({ message: 'Workspace no longer exists.' });
  if (!team.members.some((m) => String(m.user) === String(req.user._id))) {
    team.members.push({ user: req.user._id, role: invite.role });
    await team.save();
    await Activity.create({ team: team._id, actor: req.user._id, action: 'joined', entityType: 'member', entityId: req.user._id, message: `joined ${team.name}` });
  }
  invite.acceptedAt = new Date();
  await invite.save();
  res.json({ message: 'Invitation accepted.', teamId: String(team._id) });
}));

router.delete('/:id/members/:userId', loadTeam, requireManager, asyncHandler(async (req, res) => {
  if (!isValidId(req.params.userId)) return res.status(400).json({ message: 'Invalid user ID.' });
  if (String(req.team.owner) === req.params.userId) return res.status(400).json({ message: 'The workspace owner cannot be removed.' });
  if (String(req.user._id) === req.params.userId) return res.status(400).json({ message: 'Use the leave workspace action to remove yourself.' });
  const target = req.team.members.find((m) => String(m.user?._id || m.user) === req.params.userId);
  if (!target) return res.status(404).json({ message: 'Member not found.' });
  if (req.membership.role !== 'owner' && target.role === 'admin') return res.status(403).json({ message: 'Only the owner can remove an admin.' });
  req.team.members = req.team.members.filter((m) => String(m.user?._id || m.user) !== req.params.userId);
  await Promise.all([req.team.save(), Task.updateMany({ team: req.team._id, assignee: req.params.userId }, { $set: { assignee: null } })]);
  await Activity.create({ team: req.team._id, actor: req.user._id, action: 'removed', entityType: 'member', entityId: req.params.userId, message: `removed a member from ${req.team.name}` });
  res.json({ message: 'Member removed.' });
}));

router.post('/:id/leave', loadTeam, asyncHandler(async (req, res) => {
  if (String(req.team.owner) === String(req.user._id)) return res.status(400).json({ message: 'Workspace owners cannot leave. Transfer ownership first.' });
  req.team.members = req.team.members.filter((m) => String(m.user?._id || m.user) !== String(req.user._id));
  await Promise.all([req.team.save(), Task.updateMany({ team: req.team._id, assignee: req.user._id }, { $set: { assignee: null } })]);
  res.json({ message: 'You left the workspace.' });
}));

export default router;
