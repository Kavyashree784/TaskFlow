import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const userSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 70 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  passwordHash: { type: String, required: true, select: false },
  avatarColor: { type: String, default: '#7765E3' },
}, { timestamps: true });

const teamSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  slug: { type: String, required: true, unique: true, index: true },
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['owner', 'admin', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

const invitationSchema = new Schema({
  team: { type: Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  role: { type: String, enum: ['admin', 'member'], default: 'member' },
  token: { type: String, required: true, unique: true, index: true },
  inviter: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  expiresAt: { type: Date, required: true, index: true },
  acceptedAt: { type: Date, default: null },
}, { timestamps: true });

const projectSchema = new Schema({
  team: { type: Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 90 },
  description: { type: String, trim: true, maxlength: 500, default: '' },
  color: { type: String, enum: ['violet', 'blue', 'teal', 'orange', 'rose'], default: 'violet' },
  archived: { type: Boolean, default: false },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

const taskSchema = new Schema({
  team: { type: Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
  project: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 140 },
  description: { type: String, trim: true, maxlength: 3000, default: '' },
  status: { type: String, enum: ['todo', 'in_progress', 'in_review', 'done'], default: 'todo', index: true },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium', index: true },
  assignee: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  dueDate: { type: Date, default: null, index: true },
  tags: [{ type: String, trim: true, maxlength: 24 }],
  order: { type: Number, default: 0 },
}, { timestamps: true });
taskSchema.index({ team: 1, status: 1, dueDate: 1 });
taskSchema.index({ team: 1, assignee: 1, updatedAt: -1 });
taskSchema.index({ team: 1, updatedAt: -1 });

const commentSchema = new Schema({
  task: { type: Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
  team: { type: Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  body: { type: String, required: true, trim: true, maxlength: 2000 },
}, { timestamps: true });

const activitySchema = new Schema({
  team: { type: Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
  actor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  entityType: { type: String, enum: ['task', 'project', 'team', 'member'], required: true },
  entityId: { type: Schema.Types.ObjectId, default: null },
  message: { type: String, required: true, maxlength: 240 },
}, { timestamps: true });
activitySchema.index({ team: 1, createdAt: -1 });

export const User = model('User', userSchema);
export const Team = model('Team', teamSchema);
export const Invitation = model('Invitation', invitationSchema);
export const Project = model('Project', projectSchema);
export const Task = model('Task', taskSchema);
export const Comment = model('Comment', commentSchema);
export const Activity = model('Activity', activitySchema);
