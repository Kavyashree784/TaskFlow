const API_BASE = import.meta.env.VITE_API_URL || '/api';

export async function api(path, options = {}) {
  const token = localStorage.getItem('taskflow_token');
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : null;
  if (!response.ok) {
    if (response.status === 401 && token) window.dispatchEvent(new CustomEvent('taskflow:unauthorized'));
    throw new Error(payload?.message || `Request failed (${response.status})`);
  }
  return payload;
}

export const post = (path, body) => api(path, { method: 'POST', body: JSON.stringify(body) });
export const patch = (path, body) => api(path, { method: 'PATCH', body: JSON.stringify(body) });
export const remove = (path) => api(path, { method: 'DELETE' });
export const initials = (name = '') => name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'U';
export const formatDate = (date, options = { month: 'short', day: 'numeric' }) => date ? new Intl.DateTimeFormat('en', options).format(new Date(date)) : 'No date';
export const relativeDate = (date) => {
  if (!date) return 'No due date';
  const diff = Math.ceil((new Date(date).setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / 86400000);
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return 'Due today';
  if (diff === 1) return 'Due tomorrow';
  return `In ${diff} days`;
};
