import { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { ref, onValue } from 'firebase/database';
import { markNotificationRead, clearNotifications } from '../engine/notificationEngine';
import { Bell, AlertTriangle, Clock, UserPlus, Trash2 } from 'lucide-react';

export default function NotificationBell({ userId }) {
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!userId) return;
    return onValue(ref(db, `notifications/${userId}`), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setNotifications(Object.entries(data).map(([id, n]) => ({ id, ...n })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
      } else setNotifications([]);
    });
  }, [userId]);

  useEffect(() => {
    const handler = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unread = notifications.filter(n => !n.read).length;

  const icon = (type) => {
    switch (type) {
      case 'overdue': return <AlertTriangle size={14} color="#dc2626" />;
      case 'deadline': return <Clock size={14} color="#d97706" />;
      case 'overload': return <AlertTriangle size={14} color="#ea580c" />;
      case 'reassignment': return <UserPlus size={14} color="#2563eb" />;
      default: return <Bell size={14} color="#94a3b8" />;
    }
  };

  const timeAgo = (ts) => {
    const m = Math.floor((Date.now() - ts) / 60000);
    if (m < 1) return 'Just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button onClick={() => setShowDropdown(!showDropdown)} style={{
        position: 'relative', background: '#f8fafc', border: '1px solid #e2e8f0',
        borderRadius: '10px', padding: '8px', cursor: 'pointer', display: 'flex',
        alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
      }}>
        <Bell size={18} color="#64748b" />
        {unread > 0 && <div className="notification-badge">{unread > 9 ? '9+' : unread}</div>}
      </button>

      {showDropdown && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: '8px', width: '360px',
          maxHeight: '400px', overflowY: 'auto', borderRadius: '16px', background: '#ffffff',
          border: '1px solid #e5e7eb', boxShadow: '0 16px 48px rgba(0,0,0,0.12)', zIndex: 200,
          animation: 'scaleIn 0.15s ease'
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: '700', fontSize: '15px', color: '#0f172a' }}>Notifications {unread > 0 && `(${unread})`}</span>
            {notifications.length > 0 && (
              <button onClick={() => { clearNotifications(userId); setNotifications([]); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#94a3b8' }}>
                <Trash2 size={12} /> Clear all
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center' }}>
              <Bell size={28} color="#e2e8f0" style={{ margin: '0 auto 10px auto' }} />
              <p style={{ color: '#94a3b8', fontSize: '13px' }}>No notifications</p>
            </div>
          ) : (
            notifications.slice(0, 20).map(n => (
              <div key={n.id} onClick={() => markNotificationRead(userId, n.id)} style={{
                padding: '14px 20px', borderBottom: '1px solid #f8fafc', cursor: 'pointer',
                transition: 'background 0.15s', background: n.read ? '#fff' : '#fafbff',
                display: 'flex', gap: '10px', alignItems: 'flex-start'
              }}
                onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                onMouseOut={e => e.currentTarget.style.background = n.read ? '#fff' : '#fafbff'}>
                <div style={{ marginTop: '2px' }}>{icon(n.type)}</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '13px', color: '#334155', lineHeight: '1.4' }}>{n.message}</p>
                  <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>{timeAgo(n.createdAt)}</p>
                </div>
                {!n.read && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4f46e5', flexShrink: 0, marginTop: '4px' }} />}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
