import { Router } from 'express';
import { Project, Task, Activity } from '../models/index.js';
import { asyncHandler, isValidId } from '../utils/helpers.js';
import { loadTeam } from '../middleware/access.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
router.use('/:teamId', loadTeam);

router.get('/:teamId', asyncHandler(async (req, res) => {
  const projects = await Project.find({ team: req.team._id }).sort({ archived: 1, updatedAt: -1 });
  const counts = await Task.aggregate([
    { $match: { team: req.team._id } },
    { $group: { _id: '$project', total: { $sum: 1 }, done: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } } } },
  ]);
  const map = new Map(counts.map((item) => [String(item._id), item]));
  res.json({ projects: projects.map((p) => {
    const count = map.get(String(p._id)) || { total: 0, done: 0 };
    return { id: String(p._id), name: p.name, description: p.description, color: p.color, archived: p.archived, taskCount: count.total, completedCount: count.done, progress: count.total ? Math.round(count.done / count.total * 100) : 0, createdAt: p.createdAt };
  }) });
}));

router.post('/:teamId', asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (name.length < 2 || name.length > 90) return res.status(400).json({ message: 'Project name must be between 2 and 90 characters.' });
  const color = ['violet', 'blue', 'teal', 'orange', 'rose'].includes(req.body.color) ? req.body.color : 'violet';
  const project = await Project.create({ team: req.team._id, name, description: String(req.body.description || '').slice(0, 500), color, createdBy: req.user._id });
  await Activity.create({ team: req.team._id, actor: req.user._id, action: 'created', entityType: 'project', entityId: project._id, message: `created the ${name} project` });
  res.status(201).json({ project: { id: String(project._id), name: project.name, description: project.description, color: project.color, taskCount: 0, completedCount: 0, progress: 0 } });
}));

router.patch('/:teamId/:projectId', asyncHandler(async (req, res) => {
  if (!isValidId(req.params.projectId)) return res.status(400).json({ message: 'Invalid project ID.' });
  const project = await Project.findOne({ _id: req.params.projectId, team: req.team._id });
  if (!project) return res.status(404).json({ message: 'Project not found.' });
  const name = String(req.body.name ?? project.name).trim();
  if (name.length < 2 || name.length > 90) return res.status(400).json({ message: 'Project name must be between 2 and 90 characters.' });
  project.name = name;
  if (req.body.description !== undefined) project.description = String(req.body.description).slice(0, 500);
  if (['violet', 'blue', 'teal', 'orange', 'rose'].includes(req.body.color)) project.color = req.body.color;
  if (typeof req.body.archived === 'boolean') project.archived = req.body.archived;
  await project.save();
  res.json({ project: { id: String(project._id), name: project.name, description: project.description, color: project.color, archived: project.archived } });
}));

router.delete('/:teamId/:projectId', asyncHandler(async (req, res) => {
  if (!isValidId(req.params.projectId)) return res.status(400).json({ message: 'Invalid project ID.' });
  const project = await Project.findOne({ _id: req.params.projectId, team: req.team._id });
  if (!project) return res.status(404).json({ message: 'Project not found.' });
  const taskCount = await Task.countDocuments({ project: project._id });
  if (taskCount) return res.status(409).json({ message: 'Move or delete this project’s tasks before deleting the project.' });
  await project.deleteOne();
  res.json({ message: 'Project deleted.' });
}));

export default router;
