
import { useEffect, useState } from 'react';
import { MessageCircle, Send, Trash2 } from 'lucide-react';
import { api, formatDate, post } from '../lib/api';
import { useWorkspace } from '../context/WorkspaceContext';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';
import Modal from './Modal';

const emptyTask = {
  title: '',
  description: '',
  project: '',
  assignee: '',
  status: 'todo',
  priority: 'medium',
  dueDate: '',
  tags: '',
};

export default function TaskModal({
  task,
  onClose,
  onSaved,
  onDeleted,
}) {
  const { teamId, projects, team } = useWorkspace();
  const { user } = useAuth();

  const [form, setForm] = useState(emptyTask);
  const [comments, setComments] = useState([]);
  const [comment, setComment] = useState('');

  const [saving, setSaving] = useState(false);
  const [commenting, setCommenting] = useState(false);
  const [taskLoading, setTaskLoading] = useState(Boolean(task?.id));
  const [error, setError] = useState('');

  // Load task details and discussion.
  useEffect(() => {
    let active = true;

    if (task?.id) {
      setTaskLoading(true);
      setError('');
      setComments([]);

      Promise.all([
        api(`/tasks/${teamId}/${task.id}`),
        api(`/tasks/${teamId}/${task.id}/comments`),
      ])
        .then(([taskData, commentData]) => {
          if (!active) return;

          const full = taskData.task;

          setForm({
            title: full.title || '',
            description: full.description || '',
            project: full.project?.id || '',
            assignee: full.assignee?.id || '',
            status: full.status || 'todo',
            priority: full.priority || 'medium',
            dueDate: full.dueDate
              ? new Date(full.dueDate).toISOString().slice(0, 10)
              : '',
            tags: (full.tags || []).join(', '),
          });

          setComments(commentData.comments || []);
        })
        .catch((err) => {
          if (active) {
            setError(err.message || 'Failed to load task details.');
          }
        })
        .finally(() => {
          if (active) setTaskLoading(false);
        });
    } else {
      setTaskLoading(false);

      setForm({
        ...emptyTask,
        project: projects.find((p) => !p.archived)?.id || '',
        assignee: user?.id || '',
      });

      setComments([]);
      setComment('');
      setError('');
    }

    return () => {
      active = false;
    };
  }, [task?.id, teamId, projects, user?.id]);

  // Update task form fields.
  const set = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  // Save or create a task.
  const submit = async (event) => {
    event.preventDefault();

    if (saving || taskLoading) return;

    setSaving(true);
    setError('');

    const payload = {
      ...form,
      assignee: form.assignee || null,
      dueDate: form.dueDate || null,
      tags: form.tags
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    };

    try {
      if (task) {
        await api(`/tasks/${teamId}/${task.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await post(`/tasks/${teamId}`, payload);
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save task.');
    } finally {
      setSaving(false);
    }
  };

  // Submit a discussion comment.
  const addComment = async () => {
    const trimmedComment = comment.trim();

    if (
      !trimmedComment ||
      !task?.id ||
      commenting ||
      taskLoading
    ) {
      return;
    }

    setCommenting(true);
    setError('');

    try {
      const data = await post(
        `/tasks/${teamId}/${task.id}/comments`,
        { body: trimmedComment }
      );

      if (!data?.comment) {
        throw new Error('Comment was submitted but no comment data was returned.');
      }

      setComments((items) => [
        ...items,
        data.comment,
      ]);

      setComment('');
    } catch (err) {
      setError(err.message || 'Failed to submit comment.');
    } finally {
      setCommenting(false);
    }
  };

  // Delete a task.
  const deleteTask = async () => {
    if (!task?.id) return;

    if (!window.confirm('Delete this task permanently?')) {
      return;
    }

    try {
      await api(`/tasks/${teamId}/${task.id}`, {
        method: 'DELETE',
      });

      onDeleted?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to delete task.');
    }
  };

  return (
    <Modal
      title={task ? 'Task details' : 'Create a task'}
      subtitle={
        task
          ? 'Update the work item and keep everyone in sync.'
          : `Add a work item to ${team?.name || 'your workspace'}.`
      }
      onClose={onClose}
      wide
    >
      <form onSubmit={submit} className="task-form">
        <div className="form-main">
          <label className="field">
            <span>Task name</span>
            <input
              required
              minLength="2"
              maxLength="140"
              autoFocus
              placeholder="e.g. Finalize onboarding flow"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
            />
          </label>

          <label className="field">
            <span>Description</span>
            <textarea
              rows="4"
              maxLength="3000"
              placeholder="Add context, acceptance criteria or useful links…"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </label>

          <div className="form-grid">
            <label className="field">
              <span>Project</span>
              <select
                required
                value={form.project}
                onChange={(e) => set('project', e.target.value)}
              >
                <option value="">Choose project</option>

                {projects
                  .filter(
                    (p) => !p.archived || p.id === form.project
                  )
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.archived ? ' (archived)' : ''}
                    </option>
                  ))}
              </select>
            </label>

            <label className="field">
              <span>Assignee</span>
              <select
                value={form.assignee}
                onChange={(e) => set('assignee', e.target.value)}
              >
                <option value="">Unassigned</option>

                {team?.members?.map((m) => (
                  <option key={m.user.id} value={m.user.id}>
                    {m.user.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Status</span>
              <select
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
              >
                <option value="todo">To do</option>
                <option value="in_progress">In progress</option>
                <option value="in_review">In review</option>
                <option value="done">Done</option>
              </select>
            </label>

            <label className="field">
              <span>Priority</span>
              <select
                value={form.priority}
                onChange={(e) => set('priority', e.target.value)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </label>

            <label className="field">
              <span>Due date</span>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => set('dueDate', e.target.value)}
              />
            </label>

            <label className="field">
              <span>
                Tags <small>Comma separated</small>
              </span>
              <input
                placeholder="frontend, launch"
                value={form.tags}
                onChange={(e) => set('tags', e.target.value)}
              />
            </label>
          </div>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={
                saving ||
                taskLoading ||
                !projects.some((p) => p.id === form.project)
              }
            >
              {taskLoading
                ? 'Loading…'
                : saving
                  ? 'Saving…'
                  : task
                    ? 'Save changes'
                    : 'Create task'}
            </button>
          </div>
        </div>

        {task && (
          <aside className="comment-panel">
            <div className="comment-title">
              <MessageCircle size={16} />
              <strong>Discussion</strong>
              <span>{comments.length}</span>
            </div>

            <div className="comments-list">
              {taskLoading ? (
                <div className="empty-comments">
                  Loading discussion…
                </div>
              ) : comments.length ? (
                comments.map((item) => (
                  <article
                    className="comment-item"
                    key={item.id}
                  >
                    <Avatar user={item.author} size="sm" />

                    <div>
                      <div className="comment-meta">
                        <strong>
                          {item.author?.name || 'Unknown user'}
                        </strong>

                        <time>
                          {formatDate(item.createdAt, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </time>
                      </div>

                      <p>{item.body}</p>
                    </div>
                  </article>
                ))
              ) : (
                <div className="empty-comments">
                  No comments yet. Start the conversation.
                </div>
              )}
            </div>

            <div className="comment-compose">
              <textarea
                rows="2"
                placeholder="Write a comment…"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength="2000"
                disabled={commenting || taskLoading}
                onKeyDown={(e) => {
                  if (
                    e.key === 'Enter' &&
                    !e.shiftKey
                  ) {
                    e.preventDefault();
                    addComment();
                  }
                }}
              />

              <button
                type="button"
                className="btn btn-primary btn-icon"
                onClick={addComment}
                disabled={
                  !comment.trim() ||
                  commenting ||
                  taskLoading
                }
                aria-label="Send comment"
                title="Send comment"
              >
                <Send size={15} />
              </button>
            </div>

            <button
              type="button"
              className="delete-task"
              onClick={deleteTask}
            >
              <Trash2 size={14} />
              Delete task
            </button>
          </aside>
        )}
      </form>
    </Modal>
  );
}
