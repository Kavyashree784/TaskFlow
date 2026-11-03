import { useEffect, useState } from 'react';
import { Activity as ActivityIcon, CheckCircle2, Clock3, FolderKanban, MessageCircle, UserPlus } from 'lucide-react';
import { api, formatDate } from '../lib/api';
import { useWorkspace } from '../context/WorkspaceContext';
import Avatar from '../components/Avatar';

const iconFor = (type, action) => {
  if (action === 'commented') return MessageCircle;
  if (type === 'project') return FolderKanban;
  if (type === 'member') return UserPlus;
  if (action === 'completed') return CheckCircle2;
  return ActivityIcon;
};

export default function ActivityPage() {
  const { teamId } = useWorkspace();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let active = true;
    setItems([]);
    setPage(1);
    setLoading(true);
    setError('');
    api(`/activity/${teamId}?page=1&limit=20`)
      .then((data) => {
        if (!active) return;
        setItems(data.activities || []);
        setHasNextPage(Boolean(data.pagination?.hasNextPage));
        setTotal(data.pagination?.total || 0);
      })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [teamId]);

  const loadMore = async () => {
    if (!teamId || loadingMore || !hasNextPage) return;
    setLoadingMore(true);
    setError('');
    try {
      const nextPage = page + 1;
      const data = await api(`/activity/${teamId}?page=${nextPage}&limit=20`);
      setItems((current) => [...current, ...(data.activities || [])]);
      setPage(nextPage);
      setHasNextPage(Boolean(data.pagination?.hasNextPage));
      setTotal(data.pagination?.total || total);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingMore(false);
    }
  };

  const groups = items.reduce((result, item) => {
    const date = new Date(item.createdAt);
    const label = date.toDateString() === new Date().toDateString()
      ? 'Today'
      : date.toDateString() === new Date(Date.now() - 86400000).toDateString()
        ? 'Yesterday'
        : new Intl.DateTimeFormat('en', { month: 'long', day: 'numeric', year: 'numeric' }).format(date);
    (result[label] ||= []).push(item);
    return result;
  }, {});

  return <div className="page-content">
    <div className="page-heading">
      <div><span className="eyebrow">WORKSPACE PULSE</span><h1>Activity</h1><p>A shared timeline of the work happening across your team.</p></div>
      <div className="activity-total"><span><ActivityIcon size={16}/></span><strong>{total}</strong><small>workspace events</small></div>
    </div>
    <section className="surface-card activity-page-card">
      {error && <div className="notice notice-error">{error}</div>}
      {loading ? <div className="table-message">Loading activity…</div> : !items.length ? <div className="table-empty"><ActivityIcon size={28}/><strong>No activity yet</strong><p>Updates from your team will show up here.</p></div> : <>
        <div className="timeline">{Object.entries(groups).map(([label, entries]) => <div className="timeline-group" key={label}><h3>{label}</h3><div className="timeline-items">{entries.map((item) => { const Icon = iconFor(item.entityType, item.action); return <article className="timeline-item" key={item.id}><div className="timeline-avatar"><Avatar user={item.actor} size="md"/><span><Icon size={11}/></span></div><div className="timeline-copy"><p><strong>{item.actor?.name || 'A teammate'}</strong> {item.message}</p><time><Clock3 size={12}/>{formatDate(item.createdAt, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</time></div></article>; })}</div></div>)}</div>
        {hasNextPage && <div className="activity-load-more"><button className="btn btn-secondary" onClick={loadMore} disabled={loadingMore}>{loadingMore ? 'Loading…' : 'Load older activity'}</button></div>}
      </>}
    </section>
  </div>;
}
