import { useState, useEffect, useRef } from 'react';
import { Search, Command, ArrowRight, ListTodo, Users, MessageSquare, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { ref, onValue } from 'firebase/database';

export default function CommandPalette() {
  const { userProfile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [tasks, setTasks] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      if (userProfile) {
        onValue(ref(db, 'tasks'), snapshot => {
          if (snapshot.exists()) {
            const data = Object.entries(snapshot.val())
              .map(([id, t]) => ({ id, ...t }))
              .filter(t => userProfile.role === 'admin' || t.assignedTo === userProfile.uid);
            setTasks(data);
          }
        }, { onlyOnce: true });
      }
    }
  }, [isOpen, userProfile]);

  if (!isOpen || !userProfile) return null;

  const filteredTasks = search 
    ? tasks.filter(t => t.title.toLowerCase().includes(search.toLowerCase()) || (t.goal && t.goal.toLowerCase().includes(search.toLowerCase())))
    : tasks.slice(0, 5);

  const navigationOptions = [
    { label: 'Go to Tasks', icon: ListTodo, action: () => { window.dispatchEvent(new CustomEvent('cmd-nav', { detail: 'tasks' })); setIsOpen(false); } },
    { label: 'Go to Team Hub', icon: MessageSquare, action: () => { window.dispatchEvent(new CustomEvent('cmd-nav', { detail: 'hub' })); setIsOpen(false); } },
    ...(userProfile.role === 'admin' ? [{ label: 'Go to Analytics', icon: LayoutDashboard, action: () => { window.dispatchEvent(new CustomEvent('cmd-nav', { detail: 'analytics' })); setIsOpen(false); } }] : [])
  ].filter(opt => opt.label.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', justifyContent: 'center', paddingTop: '10vh' }} onClick={() => setIsOpen(false)}>
      <div className="animate-scaleIn" style={{ background: 'var(--bg-card)', width: '600px', maxWidth: '90%', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '70vh' }} onClick={e => e.stopPropagation()}>
        
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
          <Search size={20} color="#64748b" style={{ marginRight: '12px' }} />
          <input 
            ref={inputRef}
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: '16px', color: 'var(--text-main)' }}
            placeholder="Search tasks, navigate, or run commands..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-card-alt)', padding: '4px 8px', borderRadius: '6px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 'bold' }}>
            <Command size={12} /> K
          </div>
        </div>

        <div style={{ overflowY: 'auto', padding: '12px 0' }}>
          
          {navigationOptions.length > 0 && (
            <div style={{ padding: '0 12px', marginBottom: '16px' }}>
              <h4 style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', padding: '0 8px', marginBottom: '8px', letterSpacing: '0.05em' }}>Navigation</h4>
              {navigationOptions.map((nav, i) => (
                <div key={i} onClick={nav.action} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.1s' }} onMouseOver={e=>e.currentTarget.style.background='#f8fafc'} onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                  <nav.icon size={16} color="#64748b" />
                  <span style={{ fontSize: '14px', color: 'var(--text-main)', fontWeight: '500' }}>{nav.label}</span>
                  <ArrowRight size={14} color="#cbd5e1" style={{ marginLeft: 'auto' }} />
                </div>
              ))}
            </div>
          )}

          <div style={{ padding: '0 12px' }}>
            <h4 style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', padding: '0 8px', marginBottom: '8px', letterSpacing: '0.05em' }}>{search ? 'Task Results' : 'Recent Tasks'}</h4>
            {filteredTasks.length === 0 ? (
              <p style={{ padding: '12px 8px', color: 'var(--text-muted)', fontSize: '14px' }}>No tasks found for "{search}"</p>
            ) : filteredTasks.map(task => (
              <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', borderBottom: '1px solid #f8fafc' }} onMouseOver={e=>e.currentTarget.style.background='#f8fafc'} onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: task.status === 'completed' ? '#10b981' : task.status === 'in_progress' ? '#3b82f6' : '#f59e0b' }} />
                <div>
                  <div style={{ fontSize: '14px', color: 'var(--text-main)', fontWeight: '500', marginBottom: '2px' }}>{task.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '8px' }}>
                    {task.goal && <span style={{ color: '#4f46e5', fontWeight: '600' }}>{task.goal}</span>}
                    <span>Effort: {task.effort}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
        <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-card-hover)', fontSize: '11px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
          <span>Use <strong style={{ color: 'var(--text-main)' }}>↑↓</strong> to navigate</span>
          <span><strong style={{ color: 'var(--text-main)' }}>Esc</strong> to close</span>
        </div>
      </div>
    </div>
  );
}
