import { useEffect, useState } from 'react';
import { CalendarDays, ChevronDown, Plus, Search, SlidersHorizontal, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { api, formatDate, relativeDate } from '../lib/api';
import { useWorkspace } from '../context/WorkspaceContext';
import Avatar from '../components/Avatar';
import TaskModal from '../components/TaskModal';

const statusLabels = { todo: 'To do', in_progress: 'In progress', in_review: 'In review', done: 'Completed' };
export default function TasksPage() {
  const { teamId, team, projects } = useWorkspace();
  const [params, setParams] = useSearchParams();
  const [tasks, setTasks] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState(params.get('search') || '');
  const [status, setStatus] = useState(params.get('status') || '');
  const [project, setProject] = useState(params.get('project') || '');
  const [priority, setPriority] = useState('');
  const [activeTask, setActiveTask] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const refresh = async () => {
    if (!teamId) return;
    setLoading(true); setError('');
    const query = new URLSearchParams();
    if (search.trim()) query.set('search', search.trim());
    if (status) query.set('status', status);
    if (project) query.set('project', project);
    if (priority) query.set('priority', priority);
    query.set('page', String(page));
    query.set('limit', '20');
    try { const data = await api(`/tasks/${teamId}?${query.toString()}`); setTasks(data.tasks || []); setPagination(data.pagination || { page, limit: 20, total: (data.tasks || []).length, totalPages: 1, hasNextPage: false, hasPreviousPage: false }); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { setSearch(params.get('search') || ''); setProject(params.get('project') || ''); }, [params]);
  useEffect(() => { setPage(1); }, [search, status, project, priority, teamId]);
  useEffect(() => { const timer = setTimeout(refresh, 180); return () => clearTimeout(timer); }, [teamId, search, status, project, priority, page]);
  const clearFilters = () => { setSearch(''); setStatus(''); setProject(''); setPriority(''); setParams({}); };
  const activeCount = [status, project, priority].filter(Boolean).length;
  return <div className="page-content">
    <div className="page-heading"><div><span className="eyebrow">YOUR WORKSPACE</span><h1>All tasks</h1><p>Keep the details moving and the big picture in view.</p></div><button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus size={17}/> New task</button></div>
    <section className="surface-card task-page-card">
      <div className="task-toolbar"><div className="task-search"><Search size={16}/><input placeholder="Search tasks, descriptions or tags…" value={search} onChange={(e) => setSearch(e.target.value)}/>{search && <button onClick={() => setSearch('')} aria-label="Clear search"><X size={14}/></button>}</div><button className={`btn btn-secondary filter-button ${showFilters ? 'selected' : ''}`} onClick={() => setShowFilters((v) => !v)}><SlidersHorizontal size={15}/> Filters {activeCount > 0 && <span className="filter-count">{activeCount}</span>}<ChevronDown size={14}/></button><span className="results-count">{pagination.total} {pagination.total === 1 ? 'task' : 'tasks'}</span></div>
      {showFilters && <div className="filter-drawer"><label>STATUS<select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option><option value="todo">To do</option><option value="in_progress">In progress</option><option value="in_review">In review</option><option value="done">Completed</option></select></label><label>PROJECT<select value={project} onChange={(e) => setProject(e.target.value)}><option value="">All projects</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>PRIORITY<select value={priority} onChange={(e) => setPriority(e.target.value)}><option value="">All priorities</option><option value="urgent">Urgent</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label>{activeCount > 0 && <button className="text-link clear-filter" onClick={clearFilters}>Clear filters</button>}</div>}
      {error && <div className="notice notice-error">{error}</div>}
      <div className="task-table-wrap"><table className="task-table"><thead><tr><th>Task</th><th>Project</th><th>Assignee</th><th>Status</th><th>Priority</th><th>Due date</th></tr></thead><tbody>{tasks.map((task) => <tr key={task.id} onClick={() => setActiveTask(task)}><td><div className="task-title-cell"><span className={`task-check ${task.status === 'done' ? 'checked' : ''}`}>{task.status === 'done' ? '✓' : ''}</span><div><strong>{task.title}</strong>{task.tags?.length > 0 && <small>{task.tags.slice(0, 2).join(' · ')}</small>}</div></div></td><td><span className="table-project"><i className={`project-dot ${task.project?.color || 'violet'}`}/>{task.project?.name || '—'}</span></td><td>{task.assignee ? <div className="assignee-cell"><Avatar user={task.assignee} size="xs"/><span>{task.assignee.name.split(' ')[0]}</span></div> : <span className="unassigned">Unassigned</span>}</td><td><span className={`status-pill ${`status-${task.status}`}`}>{statusLabels[task.status]}</span></td><td><span className={`priority-pill priority-${task.priority}`}>{task.priority}</span></td><td><span className={`date-cell ${task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done' ? 'overdue' : ''}`}><CalendarDays size={13}/>{task.dueDate ? formatDate(task.dueDate) : '—'}</span></td></tr>)}</tbody></table>{loading && <div className="table-message">Loading tasks…</div>}{!loading && !tasks.length && <div className="table-empty"><div className="empty-illustration">⌕</div><strong>No tasks found</strong><p>{search || activeCount ? 'Try adjusting your search or filters.' : 'Create your first task to get this workspace moving.'}</p><button className="btn btn-secondary btn-small" onClick={search || activeCount ? clearFilters : () => setShowCreate(true)}>{search || activeCount ? 'Clear filters' : 'Create a task'}</button></div>}</div>
    {pagination.totalPages > 1 && <div className="pagination-bar"><span>Page {pagination.page} of {pagination.totalPages}</span><div><button className="btn btn-secondary btn-small" disabled={!pagination.hasPreviousPage || loading} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button><button className="btn btn-secondary btn-small" disabled={!pagination.hasNextPage || loading} onClick={() => setPage((current) => current + 1)}>Next</button></div></div>}
    </section>
    {showCreate && <TaskModal onClose={() => setShowCreate(false)} onSaved={refresh}/>}{activeTask && <TaskModal task={activeTask} onClose={() => setActiveTask(null)} onSaved={refresh} onDeleted={refresh}/>}
  </div>;
}
