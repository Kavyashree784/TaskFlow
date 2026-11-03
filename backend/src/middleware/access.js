import { Team } from '../models/index.js';
import { asyncHandler, isValidId } from '../utils/helpers.js';

export const loadTeam = asyncHandler(async (req, res, next) => {
  const id = req.params.teamId || req.params.id;
  if (!isValidId(id)) return res.status(400).json({ message: 'Invalid team ID.' });
  const team = await Team.findById(id).populate('members.user', 'name email avatarColor');
  if (!team) return res.status(404).json({ message: 'Team not found.' });
  const membership = team.members.find((item) => String(item.user?._id || item.user) === String(req.user._id));
  if (!membership) return res.status(403).json({ message: 'You are not a member of this team.' });
  req.team = team;
  req.membership = membership;
  next();
});

export const requireManager = (req, res, next) => {
  if (!req.membership || !['owner', 'admin'].includes(req.membership.role)) {
    return res.status(403).json({ message: 'Only team owners and admins can perform this action.' });
  }
  next();
};
