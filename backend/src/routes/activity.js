import { Router } from 'express';
import { Activity } from '../models/index.js';
import { asyncHandler } from '../utils/helpers.js';
import { loadTeam } from '../middleware/access.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
router.use('/:teamId', loadTeam);
router.get('/:teamId', asyncHandler(async (req, res) => {
  const requestedPage = Number.parseInt(req.query.page, 10);
  const requestedLimit = Number.parseInt(req.query.limit, 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const limit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? Math.min(requestedLimit, 100) : 20;
  const filter = { team: req.team._id };
  const total = await Activity.countDocuments(filter);
  const totalPages = Math.ceil(total / limit);
  const effectivePage = totalPages > 0 ? Math.min(page, totalPages) : 1;
  const activities = await Activity.find(filter)
    .populate('actor', 'name email avatarColor')
    .sort({ createdAt: -1, _id: -1 })
    .skip((effectivePage - 1) * limit)
    .limit(limit);
  res.json({
    activities: activities.map((activity) => ({
      id: String(activity._id),
      actor: activity.actor ? { id: String(activity.actor._id), name: activity.actor.name, avatarColor: activity.actor.avatarColor } : null,
      message: activity.message,
      createdAt: activity.createdAt,
      entityType: activity.entityType,
      action: activity.action,
    })),
    pagination: { page: effectivePage, limit, total, totalPages, hasNextPage: effectivePage < totalPages, hasPreviousPage: effectivePage > 1 },
  });
}));
export default router;
