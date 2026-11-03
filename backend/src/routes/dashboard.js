import { Router } from 'express';
import mongoose from 'mongoose';
import { Activity, Project, Task } from '../models/index.js';
import { asyncHandler } from '../utils/helpers.js';
import { loadTeam } from '../middleware/access.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
router.use('/:teamId', loadTeam);

router.get('/:teamId', asyncHandler(async (req, res) => {
  const teamId = new mongoose.Types.ObjectId(String(req.team._id));
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [summaryRows, workloadRows, upcomingTasks, recentTasks, projects, activities] = await Promise.all([
    Task.aggregate([
      { $match: { team: teamId } },
      { $group: {
        _id: null,
        total: { $sum: 1 },
        todo: { $sum: { $cond: [{ $eq: ['$status', 'todo'] }, 1, 0] } },
        in_progress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
        in_review: { $sum: { $cond: [{ $eq: ['$status', 'in_review'] }, 1, 0] } },
        done: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } },
        overdue: { $sum: { $cond: [{ $and: [{ $ne: ['$dueDate', null] }, { $lt: ['$dueDate', now] }, { $ne: ['$status', 'done'] }] }, 1, 0] } },
        dueSoon: { $sum: { $cond: [{ $and: [{ $ne: ['$dueDate', null] }, { $gte: ['$dueDate', now] }, { $lte: ['$dueDate', nextWeek] }, { $ne: ['$status', 'done'] }] }, 1, 0] } },
      } },
    ]),
    Task.aggregate([
      { $match: { team: teamId } },
      { $group: {
        _id: '$assignee',
        total: { $sum: 1 },
        done: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } },
      } },
      { $sort: { total: -1 } },
    ]),
    Task.find({ team: teamId, dueDate: { $gte: now }, status: { $ne: 'done' } })
      .populate('assignee', 'name email avatarColor')
      .populate('project', 'name color')
      .sort({ dueDate: 1 })
      .limit(5),
    Task.find({ team: teamId })
      .populate('assignee', 'name email avatarColor')
      .populate('project', 'name color')
      .sort({ updatedAt: -1, _id: -1 })
      .limit(5),
    Project.find({ team: teamId, archived: false }).sort({ updatedAt: -1 }),
    Activity.find({ team: teamId })
      .populate('actor', 'name email avatarColor')
      .sort({ createdAt: -1, _id: -1 })
      .limit(8),
  ]);

  const summary = summaryRows[0] || { total: 0, todo: 0, in_progress: 0, in_review: 0, done: 0, overdue: 0, dueSoon: 0 };
  const counts = {
    total: summary.total,
    todo: summary.todo,
    in_progress: summary.in_progress,
    in_review: summary.in_review,
    done: summary.done,
    overdue: summary.overdue,
    dueSoon: summary.dueSoon,
  };

  const memberById = new Map(req.team.members.map((member) => {
    const person = member.user;
    const id = String(person?._id || person);
    return [id, person?._id ? { id, name: person.name, email: person.email, avatarColor: person.avatarColor } : null];
  }));
  const workload = new Map();
  for (const [id, user] of memberById.entries()) workload.set(id, { user, total: 0, done: 0 });
  for (const row of workloadRows) {
    const key = row._id ? String(row._id) : 'unassigned';
    const user = row._id ? (memberById.get(key) || null) : null;
    workload.set(key, { user, total: row.total, done: row.done });
  }

  const taskSummary = (task) => ({
    id: String(task._id),
    title: task.title,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate,
    updatedAt: task.updatedAt,
    assignee: task.assignee ? { name: task.assignee.name, avatarColor: task.assignee.avatarColor } : null,
    project: task.project ? { name: task.project.name, color: task.project.color } : null,
  });

  res.json({
    stats: counts,
    statusBreakdown: [
      { key: 'todo', label: 'To do', value: counts.todo },
      { key: 'in_progress', label: 'In progress', value: counts.in_progress },
      { key: 'in_review', label: 'In review', value: counts.in_review },
      { key: 'done', label: 'Completed', value: counts.done },
    ],
    projects: projects.map((project) => ({ id: String(project._id), name: project.name, description: project.description, color: project.color })),
    workload: [...workload.values()].sort((a, b) => b.total - a.total),
    upcoming: upcomingTasks.map(taskSummary),
    recentTasks: recentTasks.map(taskSummary),
    activity: activities.map((activity) => ({
      id: String(activity._id),
      actor: activity.actor ? { name: activity.actor.name, avatarColor: activity.actor.avatarColor } : null,
      message: activity.message,
      createdAt: activity.createdAt,
      entityType: activity.entityType,
    })),
  });
}));

export default router;
