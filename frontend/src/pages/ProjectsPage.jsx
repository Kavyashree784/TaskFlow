import { useState } from 'react';
import { ArrowUpRight, Archive, FolderKanban, MoreHorizontal, Plus, Trash2 } from 'lucide-react';
import { api, post, patch, remove } from '../lib/api';
import { useWorkspace } from '../context/WorkspaceContext';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';

const colors = ['violet', 'blue', 'teal', 'orange', 'rose'];
export default function ProjectsPage() {
  const { teamId, projects, refreshTeam } = useWorkspace();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const active = projects.filter((p) => !p.archived);
  const archived = projects.filter((p) => p.archived);
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    const data = new FormData(event.currentTarget);
    const payload = { name: data.get('name'), description: data.get('description'), color: data.get('color') };
    try { if (editing) await patch(`/projects/${teamId}/${editing.id}`, payload); else await post(`/projects/${teamId}`, payload); await refreshTeam(); setShowCreate(false); setEditing(null); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const archiveProject = async (project) => { try { await patch(`/projects/${teamId}/${project.id}`, { archived: !project.archived }); await refreshTeam(); } catch (e) { setError(e.message); } };
  const deleteProject = async (project) => { if (!window.confirm(`Delete “${project.name}”?`)) return; try { await remove(`/projects/${teamId}/${project.id}`); await refreshTeam(); } catch (e) { setError(e.message); } };
  return <div className="page-content">
    <div className="page-heading"><div><span className="eyebrow">PLAN WITH PURPOSE</span><h1>Projects</h1><p>Bring related work together and keep momentum visible.</p></div><button className="btn btn-primary" onClick={() => { setEditing(null); setShowCreate(true); }}><Plus size={17}/> New project</button></div>
    {error && <div className="notice notice-error">{error}</div>}
    <div className="projects-summary"><div><strong>{active.length}</strong><span>Active projects</span></div><div><strong>{active.reduce((sum, p) => sum + (p.taskCount || 0), 0)}</strong><span>Total tasks</span></div><div><strong>{active.length ? Math.round(active.reduce((sum, p) => sum + (p.progress || 0), 0) / active.length) : 0}%</strong><span>Average progress</span></div></div>
    <div className="project-cards-grid">{active.map((project) => <article className="project-card" key={project.id}><div className="project-card-top"><span className={`project-symbol large ${project.color}`}><FolderKanban size={19}/></span><div className="project-menu-wrap"><button className="icon-btn" onClick={() => setEditing(project)} title="Edit project"><MoreHorizontal size={18}/></button><button className="icon-btn" onClick={() => archiveProject(project)} title="Archive project"><Archive size={16}/></button></div></div><button className="project-card-main" onClick={() => navigate(`/tasks?project=${project.id}`)}><h3>{project.name}</h3><p>{project.description || 'No description added yet.'}</p><span className="project-card-link">Open project <ArrowUpRight size={14}/></span></button><div className="project-card-progress"><div className="progress-label"><span>{project.completedCount || 0} of {project.taskCount || 0} tasks complete</span><strong>{project.progress || 0}%</strong></div><div className="progress-track"><span className={`progress-${project.color}`} style={{ width: `${project.progress || 0}%` }}/></div></div><div className="project-card-bottom"><span>{project.taskCount || 0} tasks</span><button className="project-delete" onClick={() => deleteProject(project)} title="Delete empty project"><Trash2 size={14}/></button></div></article>)}<button className="new-project-card" onClick={() => { setEditing(null); setShowCreate(true); }}><span><Plus size={20}/></span><strong>Create a new project</strong><small>Give your next big idea a space.</small></button></div>
    {archived.length > 0 && <section className="archived-section"><button className="archived-toggle" onClick={() => setIncludeArchived((v) => !v)}><Archive size={15}/> Archived projects <span>{archived.length}</span><span className="archived-chevron">{includeArchived ? '−' : '+'}</span></button>{includeArchived && <div className="archived-list">{archived.map((p) => <div key={p.id}><span className={`project-dot ${p.color}`}/><strong>{p.name}</strong><button className="text-link" onClick={() => archiveProject(p)}>Restore</button></div>)}</div>}</section>}
    {(showCreate || editing) && <Modal title={editing ? 'Edit project' : 'Create a project'} subtitle="Give the work a clear home." onClose={() => { setShowCreate(false); setEditing(null); }}><form className="stack-form" onSubmit={submit}><label className="field"><span>Project name</span><input name="name" required minLength="2" maxLength="90" defaultValue={editing?.name || ''} placeholder="e.g. Website refresh" autoFocus/></label><label className="field"><span>Description</span><textarea name="description" rows="3" maxLength="500" defaultValue={editing?.description || ''} placeholder="What are you working towards?"/></label><label className="field"><span>Project color</span><div className="color-options">{colors.map((color) => <label key={color} className={`color-choice ${color}`}><input type="radio" name="color" value={color} defaultChecked={(editing?.color || 'violet') === color}/><i/></label>)}</div></label>{error && <p className="form-error">{error}</p>}<div className="modal-actions"><button type="button" className="btn btn-ghost" onClick={() => { setShowCreate(false); setEditing(null); }}>Cancel</button><button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save project' : 'Create project'}</button></div></form></Modal>}
  </div>;
}
