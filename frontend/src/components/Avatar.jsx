import { initials } from '../lib/api';
export default function Avatar({ user, size = 'md', className = '' }) {
  if (!user) return <span className={`avatar avatar-${size} ${className}`}>?</span>;
  return <span className={`avatar avatar-${size} ${className}`} style={{ background: user.avatarColor || '#7765E3' }} title={user.name}>{initials(user.name)}</span>;
}
