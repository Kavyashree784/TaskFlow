import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectDatabase } from './config/db.js';
import { Activity, Comment, Invitation, Project, Task, Team, User } from './models/index.js';
import { slugify } from './utils/helpers.js';

async function seed() {
  await connectDatabase();
  await Promise.all([User.deleteMany({}), Team.deleteMany({}), Invitation.deleteMany({}), Project.deleteMany({}), Task.deleteMany({}), Comment.deleteMany({}), Activity.deleteMany({})]);
  const passwordHash = await bcrypt.hash('TaskFlowDemo#2026', 12);
  const [kavya, arjun, priya, rohan] = await User.create([
    { name: 'Kavya Krish', email: 'kavya@taskflow.demo', passwordHash, avatarColor: '#7667E8' },
    { name: 'Arjun Mehta', email: 'arjun@taskflow.demo', passwordHash, avatarColor: '#E59A55' },
    { name: 'Priya Nair', email: 'priya@taskflow.demo', passwordHash, avatarColor: '#3D9D8D' },
    { name: 'Rohan Das', email: 'rohan@taskflow.demo', passwordHash, avatarColor: '#D16D87' },
  ]);
  const team = await Team.create({ name: 'Studio North', slug: slugify('studio-north'), owner: kavya._id, members: [
    { user: kavya._id, role: 'owner' }, { user: arjun._id, role: 'admin' }, { user: priya._id, role: 'member' }, { user: rohan._id, role: 'member' },
  ] });
  const [website, mobile, brand] = await Project.create([
    { team: team._id, name: 'Website redesign', description: 'A considered refresh of the core marketing experience.', color: 'violet', createdBy: kavya._id },
    { team: team._id, name: 'Mobile experience', description: 'Improve the responsive product experience.', color: 'teal', createdBy: kavya._id },
    { team: team._id, name: 'Brand system', description: 'Reusable foundations, components and documentation.', color: 'orange', createdBy: kavya._id },
  ]);
  const due = (days) => new Date(Date.now() + days * 86400000);
  const taskDocs = [
    { project: website._id, title: 'Audit the current navigation flow', description: 'Review key journeys and document friction points before the redesign.', status: 'done', priority: 'medium', assignee: priya._id, dueDate: due(-2), tags: ['research', 'ux'] },
    { project: website._id, title: 'Build the new landing page hero', description: 'Implement the responsive hero section and validate it against the design system.', status: 'in_progress', priority: 'high', assignee: arjun._id, dueDate: due(2), tags: ['frontend', 'design'] },
    { project: website._id, title: 'Prepare accessibility review', description: 'Check contrast, keyboard navigation, focus states and semantic headings.', status: 'todo', priority: 'medium', assignee: priya._id, dueDate: due(5), tags: ['accessibility'] },
    { project: mobile._id, title: 'Create mobile task filters', description: 'Make filters usable on smaller screens without hiding the task list.', status: 'in_review', priority: 'urgent', assignee: kavya._id, dueDate: due(1), tags: ['mobile', 'frontend'] },
    { project: mobile._id, title: 'Optimize dashboard loading state', description: 'Add skeleton states and reduce layout shifts while data is loading.', status: 'todo', priority: 'low', assignee: rohan._id, dueDate: due(8), tags: ['performance'] },
    { project: brand._id, title: 'Document color and type tokens', description: 'Publish the first pass of the shared design tokens.', status: 'done', priority: 'medium', assignee: kavya._id, dueDate: due(-1), tags: ['documentation'] },
    { project: brand._id, title: 'Create component usage guidelines', description: 'Add guidance for buttons, forms, cards and data visualization components.', status: 'in_progress', priority: 'high', assignee: rohan._id, dueDate: due(4), tags: ['design-system'] },
    { project: website._id, title: 'Connect newsletter subscription API', description: 'Wire the form to the subscription endpoint and handle validation responses.', status: 'todo', priority: 'high', assignee: arjun._id, dueDate: due(7), tags: ['integration', 'api'] },
  ];
  const tasks = await Task.create(taskDocs.map((t, i) => ({ ...t, team: team._id, createdBy: kavya._id, order: i })));
  await Comment.create([
    { task: tasks[1]._id, team: team._id, author: priya._id, body: 'The responsive layout is looking good. Please check the tablet breakpoint before moving this to review.' },
    { task: tasks[3]._id, team: team._id, author: arjun._id, body: 'I left notes on the filter interactions in the design file.' },
  ]);
  await Activity.create([
    { team: team._id, actor: kavya._id, action: 'created', entityType: 'team', entityId: team._id, message: 'created the Studio North workspace' },
    { team: team._id, actor: arjun._id, action: 'updated', entityType: 'task', entityId: tasks[1]._id, message: 'moved “Build the new landing page hero” to in progress' },
    { team: team._id, actor: priya._id, action: 'commented', entityType: 'task', entityId: tasks[1]._id, message: 'commented on “Build the new landing page hero”' },
    { team: team._id, actor: kavya._id, action: 'created', entityType: 'project', entityId: website._id, message: 'created the Website redesign project' },
  ]);
  console.log('Seed complete. Demo login: kavya@taskflow.demo / TaskFlowDemo#2026');
  process.exit(0);
}

seed().catch((error) => { console.error(error); process.exit(1); });
