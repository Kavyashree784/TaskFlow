import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Plus, SlidersHorizontal } from 'lucide-react';
import { api, relativeDate } from '../lib/api';
import { useWorkspace } from '../context/WorkspaceContext';
import Avatar from '../components/Avatar';
import TaskModal from '../components/TaskModal';

const columns = [
  { key: 'todo', title: 'To do', tone: 'column-todo' },
  { key: 'in_progress', title: 'In progress', tone: 'column-progress' },
  { key: 'in_review', title: 'In review', tone: 'column-review' },
  { key: 'done', title: 'Completed', tone: 'column-done' },
];
export default function BoardPage() {
  const { teamId, projects } = useWorkspace();
  const [tasks, setTasks] = useState([]);
  const [totalTasks, setTotalTasks] = useState(0);
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState('');
  const [task, setTask] = useState(null);
  const [create, setCreate] = useState(false);
  const [dragging, setDragging] = useState(null);
  const [error, setError] = useState('');
  const refresh = async () => { if (!teamId) return; setLoading(true); try { const query = new URLSearchParams({ limit: '100' }); if (project) query.set('project', project); const data = await api(`/tasks/${teamId}?${query.toString()}`); setTasks(data.tasks || []); setTotalTasks(data.pagination?.total || (data.tasks || []).length); setError(''); } catch (e) { setError(e.message); } finally { setLoading(false); } };
  useEffect(() => { refresh(); }, [teamId, project]);
  const moveTask = async (taskId, status) => { try { await api(`/tasks/${teamId}/${taskId}`, { method: 'PATCH', body: JSON.stringify({ status }) }); await refresh(); } catch (e) { setError(e.message); } };
  return <div className="page-content board-page">
    <div className="page-heading"><div><span className="eyebrow">VISUAL WORKFLOW</span><h1>Project board</h1><p>See the work in motion. Move cards as priorities evolve.</p></div><div className="heading-actions"><label className="board-project-filter"><SlidersHorizontal size={15}/><select value={project} onChange={(e) => setProject(e.target.value)}><option value="">All projects</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><button className="btn btn-primary" onClick={() => setCreate(true)}><Plus size={17}/> Add task</button></div></div>
    {error && <div className="notice notice-error">{error}</div>}
    {totalTasks > tasks.length && <div className="notice notice-info">Showing the first {tasks.length} of {totalTasks} tasks on the board. <Link to="/tasks">Open All tasks</Link> to browse the full paginated list.</div>}
    <div className="kanban-board">{columns.map((column) => { const items = tasks.filter((item) => item.status === column.key); return <section key={column.key} className={`kanban-column ${dragging ? 'board-drag-active' : ''}`} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData('text/taskflow-id'); if (id) moveTask(id, column.key); setDragging(null); }}><div className="kanban-column-head"><div className={`column-indicator ${column.tone}`}/><h3>{column.title}</h3><span>{items.length}</span>{column.key === 'todo' && <button className="icon-btn tiny" onClick={() => setCreate(true)} aria-label="Add task"><Plus size={15}/></button>}</div><div className="kanban-cards">{items.map((item) => <article key={item.id} className="kanban-card" draggable onDragStart={(e) => { e.dataTransfer.setData('text/taskflow-id', item.id); setDragging(item.id); }} onDragEnd={() => setDragging(null)} onClick={() => setTask(item)}><div className="kanban-card-top"><span className={`priority-pill priority-${item.priority}`}>{item.priority}</span><span className="card-more">···</span></div><h4>{item.title}</h4>{item.description && <p>{item.description}</p>}<div className="kanban-card-project"><i className={`project-dot ${item.project?.color || 'violet'}`}/>{item.project?.name || 'No project'}</div><div className="kanban-card-footer"><div>{item.assignee ? <Avatar user={item.assignee} size="xs"/> : <span className="avatar avatar-xs unassigned-avatar">—</span>}<span className={`card-due ${item.dueDate && new Date(item.dueDate) < new Date() && item.status !== 'done' ? 'overdue' : ''}`}><CalendarDays size={12}/>{item.dueDate ? relativeDate(item.dueDate) : 'No date'}</span></div><div className="card-status-actions"><select title="Move task" value={item.status} onClick={(e) => e.stopPropagation()} onChange={(e) => moveTask(item.id, e.target.value)}>{columns.map((c) => <option key={c.key} value={c.key}>{c.title}</option>)}</select></div></div></article>)}{!items.length && <div className="kanban-empty">Drop a task here</div>}</div></section>; })}</div>
    {loading && <div className="board-loading">Loading your board…</div>}
    {create && <TaskModal onClose={() => setCreate(false)} onSaved={refresh}/>}{task && <TaskModal task={task} onClose={() => setTask(null)} onSaved={refresh} onDeleted={refresh}/>}
  </div>;
}
