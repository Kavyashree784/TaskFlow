import { Router } from 'express';
import { Activity, Comment, Project, Task } from '../models/index.js';
import { asyncHandler, isValidId, safeUser } from '../utils/helpers.js';
import { loadTeam } from '../middleware/access.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
router.use('/:teamId', loadTeam);

const STATUSES = ['todo', 'in_progress', 'in_review', 'done'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function serializeTask(task) {
  return {
    id: String(task._id), teamId: String(task.team),
    project: task.project?._id ? { id: String(task.project._id), name: task.project.name, color: task.project.color } : { id: String(task.project) },
    title: task.title, description: task.description, status: task.status, priority: task.priority,
    assignee: task.assignee?._id ? safeUser(task.assignee) : null,
    createdBy: task.createdBy?._id ? safeUser(task.createdBy) : null,
    dueDate: task.dueDate, tags: task.tags || [], createdAt: task.createdAt, updatedAt: task.updatedAt,
  };
}

async function validateAssignee(team, assigneeId) {
  if (assigneeId === null || assigneeId === '' || assigneeId === undefined) return null;
  if (!isValidId(assigneeId)) throw Object.assign(new Error('Invalid assignee.'), { status: 400 });
  const isMember = team.members.some((m) => String(m.user?._id || m.user) === String(assigneeId));
  if (!isMember) throw Object.assign(new Error('Assignee must be a member of this workspace.'), { status: 400 });
  return assigneeId;
}

router.get('/:teamId', asyncHandler(async (req, res) => {
  const filter = { team: req.team._id };
  const { status, priority, project, assignee, search, mine, due } = req.query;
  if (STATUSES.includes(status)) filter.status = status;
  if (PRIORITIES.includes(priority)) filter.priority = priority;
  if (project && isValidId(project)) filter.project = project;
  if (assignee === 'unassigned') filter.assignee = null;
  else if (assignee && isValidId(assignee)) filter.assignee = assignee;
  if (mine === 'true') filter.assignee = req.user._id;
  if (due === 'upcoming') filter.dueDate = { $gte: new Date(), $lte: new Date(Date.now() + 14 * 86400000) };
  if (due === 'overdue') filter.dueDate = { $lt: new Date(), $ne: null };
  if (search) filter.$or = [
    { title: { $regex: escapeRegex(String(search).slice(0, 80)), $options: 'i' } },
    { description: { $regex: escapeRegex(String(search).slice(0, 80)), $options: 'i' } },
    { tags: { $regex: escapeRegex(String(search).slice(0, 40)), $options: 'i' } },
  ];
  const requestedPage = Number.parseInt(req.query.page, 10);
  const requestedLimit = Number.parseInt(req.query.limit, 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const limit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? Math.min(requestedLimit, 100) : 50;
  const total = await Task.countDocuments(filter);
  const totalPages = Math.ceil(total / limit);
  const effectivePage = totalPages > 0 ? Math.min(page, totalPages) : 1;
  const tasks = await Task.find(filter)
    .populate('assignee', 'name email avatarColor')
    .populate('createdBy', 'name email avatarColor')
    .populate('project', 'name color')
    .sort({ dueDate: 1, updatedAt: -1, _id: -1 })
    .skip((effectivePage - 1) * limit)
    .limit(limit);
  res.json({
    tasks: tasks.map(serializeTask),
    pagination: {
      page: effectivePage,
      limit,
      total,
      totalPages,
      hasNextPage: effectivePage < totalPages,
      hasPreviousPage: effectivePage > 1,
    },
  });
}));

router.post('/:teamId', asyncHandler(async (req, res) => {
  const title = String(req.body.title || '').trim();
  if (title.length < 2 || title.length > 140) return res.status(400).json({ message: 'Task title must be between 2 and 140 characters.' });
  if (!isValidId(req.body.project)) return res.status(400).json({ message: 'Select a valid project.' });
  const project = await Project.findOne({ _id: req.body.project, team: req.team._id, archived: false });
  if (!project) return res.status(400).json({ message: 'Select an active project in this workspace.' });
  const assignee = await validateAssignee(req.team, req.body.assignee);
  const dueDate = req.body.dueDate ? new Date(req.body.dueDate) : null;
  if (dueDate && Number.isNaN(dueDate.getTime())) return res.status(400).json({ message: 'Enter a valid due date.' });
  const tags = Array.isArray(req.body.tags) ? [...new Set(req.body.tags.map((x) => String(x).trim().toLowerCase()).filter(Boolean))].slice(0, 8) : [];
  const task = await Task.create({
    team: req.team._id, project: project._id, title,
    description: String(req.body.description || '').slice(0, 3000),
    status: STATUSES.includes(req.body.status) ? req.body.status : 'todo',
    priority: PRIORITIES.includes(req.body.priority) ? req.body.priority : 'medium',
    assignee, createdBy: req.user._id, dueDate, tags,
  });
  await Activity.create({ team: req.team._id, actor: req.user._id, action: 'created', entityType: 'task', entityId: task._id, message: `created “${title}”` });
  await task.populate([{ path: 'assignee', select: 'name email avatarColor' }, { path: 'createdBy', select: 'name email avatarColor' }, { path: 'project', select: 'name color' }]);
  res.status(201).json({ task: serializeTask(task) });
}));

router.get('/:teamId/:taskId', asyncHandler(async (req, res) => {
  if (!isValidId(req.params.taskId)) return res.status(400).json({ message: 'Invalid task ID.' });
  const task = await Task.findOne({ _id: req.params.taskId, team: req.team._id })
    .populate('assignee', 'name email avatarColor').populate('createdBy', 'name email avatarColor').populate('project', 'name color');
  if (!task) return res.status(404).json({ message: 'Task not found.' });
  res.json({ task: serializeTask(task) });
}));

router.patch('/:teamId/:taskId', asyncHandler(async (req, res) => {
  if (!isValidId(req.params.taskId)) return res.status(400).json({ message: 'Invalid task ID.' });
  const task = await Task.findOne({ _id: req.params.taskId, team: req.team._id });
  if (!task) return res.status(404).json({ message: 'Task not found.' });
  const changes = [];
  if (req.body.title !== undefined) {
    const title = String(req.body.title).trim();
    if (title.length < 2 || title.length > 140) return res.status(400).json({ message: 'Task title must be between 2 and 140 characters.' });
    task.title = title;
  }
  if (req.body.description !== undefined) task.description = String(req.body.description).slice(0, 3000);
  if (req.body.status !== undefined) {
    if (!STATUSES.includes(req.body.status)) return res.status(400).json({ message: 'Invalid task status.' });
    if (task.status !== req.body.status) changes.push(`moved “${task.title}” to ${req.body.status.replace('_', ' ')}`);
    task.status = req.body.status;
  }
  if (req.body.priority !== undefined) {
    if (!PRIORITIES.includes(req.body.priority)) return res.status(400).json({ message: 'Invalid task priority.' });
    task.priority = req.body.priority;
  }
  if (req.body.project !== undefined) {
    if (!isValidId(req.body.project)) return res.status(400).json({ message: 'Select a valid project.' });
    const targetProject = await Project.findOne({ _id: req.body.project, team: req.team._id });
    if (!targetProject || (targetProject.archived && String(targetProject._id) !== String(task.project))) return res.status(400).json({ message: 'Select an active project in this workspace.' });
    task.project = targetProject._id;
  }
  if (req.body.assignee !== undefined) {
    const assignee = await validateAssignee(req.team, req.body.assignee);
    task.assignee = assignee;
    changes.push(assignee ? `assigned “${task.title}”` : `unassigned “${task.title}”`);
  }
  if (req.body.dueDate !== undefined) {
    const dueDate = req.body.dueDate ? new Date(req.body.dueDate) : null;
    if (dueDate && Number.isNaN(dueDate.getTime())) return res.status(400).json({ message: 'Enter a valid due date.' });
    task.dueDate = dueDate;
  }
  if (req.body.tags !== undefined) task.tags = Array.isArray(req.body.tags) ? [...new Set(req.body.tags.map((x) => String(x).trim().toLowerCase()).filter(Boolean))].slice(0, 8) : [];
  await task.save();
  for (const message of changes) await Activity.create({ team: req.team._id, actor: req.user._id, action: 'updated', entityType: 'task', entityId: task._id, message });
  await task.populate([{ path: 'assignee', select: 'name email avatarColor' }, { path: 'createdBy', select: 'name email avatarColor' }, { path: 'project', select: 'name color' }]);
  res.json({ task: serializeTask(task) });
}));

router.delete('/:teamId/:taskId', asyncHandler(async (req, res) => {
  if (!isValidId(req.params.taskId)) return res.status(400).json({ message: 'Invalid task ID.' });
  const task = await Task.findOne({ _id: req.params.taskId, team: req.team._id });
  if (!task) return res.status(404).json({ message: 'Task not found.' });
  await Promise.all([task.deleteOne(), Comment.deleteMany({ task: task._id })]);
  await Activity.create({ team: req.team._id, actor: req.user._id, action: 'deleted', entityType: 'task', entityId: task._id, message: `deleted “${task.title}”` });
  res.json({ message: 'Task deleted.' });
}));

router.get('/:teamId/:taskId/comments', asyncHandler(async (req, res) => {
  if (!isValidId(req.params.taskId)) return res.status(400).json({ message: 'Invalid task ID.' });
  const task = await Task.exists({ _id: req.params.taskId, team: req.team._id });
  if (!task) return res.status(404).json({ message: 'Task not found.' });
  const comments = await Comment.find({ task: req.params.taskId }).populate('author', 'name email avatarColor').sort({ createdAt: 1 });
  res.json({ comments: comments.map((c) => ({ id: String(c._id), body: c.body, author: safeUser(c.author), createdAt: c.createdAt })) });
}));

router.post('/:teamId/:taskId/comments', asyncHandler(async (req, res) => {
  if (!isValidId(req.params.taskId)) return res.status(400).json({ message: 'Invalid task ID.' });
  const task = await Task.findOne({ _id: req.params.taskId, team: req.team._id });
  if (!task) return res.status(404).json({ message: 'Task not found.' });
  const body = String(req.body.body || '').trim();
  if (!body || body.length > 2000) return res.status(400).json({ message: 'Comment must contain between 1 and 2,000 characters.' });
  const comment = await Comment.create({ task: task._id, team: req.team._id, author: req.user._id, body });
  await comment.populate('author', 'name email avatarColor');
  await Activity.create({ team: req.team._id, actor: req.user._id, action: 'commented', entityType: 'task', entityId: task._id, message: `commented on “${task.title}”` });
  res.status(201).json({ comment: { id: String(comment._id), body: comment.body, author: safeUser(comment.author), createdAt: comment.createdAt } });
}));

export default router;
