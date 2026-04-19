import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { ref, onValue, update } from 'firebase/database';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { calculatePriorityScore, getPriorityLabel, getDaysUntilDeadline, getNextBestTask, getRecommendationReason } from '../engine/priorityEngine';
import { predictCompletionTime } from '../engine/assignmentEngine';
import NotificationBell from '../components/NotificationBell';
import TeamChat from '../components/TeamChat';
import { Zap, LogOut, Clock, Target, TrendingUp, CheckCircle2, Circle, Play, Calendar, Flame, Award, BarChart3, Timer, Sparkles, GripVertical, Search, ListTodo, MessageSquare, AlertTriangle, LayoutDashboard } from 'lucide-react';
import { push } from 'firebase/database';

export default function EmployeeDashboard() {
  const { userProfile, logout } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [history, setHistory] = useState([]);
  const [filter, setFilter] = useState('all');
  const [taskStartTimes, setTaskStartTimes] = useState({});
  const [search, setSearch] = useState('');
  const [activeView, setActiveView] = useState('tasks');
  const [focusMode, setFocusMode] = useState(false);

  useEffect(() => {
    const handleCmdNav = (e) => {
      if (e.detail === 'tasks' || e.detail === 'hub') setActiveView(e.detail);
    };
    window.addEventListener('cmd-nav', handleCmdNav);
    return () => window.removeEventListener('cmd-nav', handleCmdNav);
  }, []);

  useEffect(() => {
    const tasksRef = ref(db, 'tasks');
    return onValue(tasksRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const myTasks = Object.entries(data).filter(([,t]) => t.assignedTo === userProfile?.uid)
          .map(([id, task]) => { const s = calculatePriorityScore(task); return { id, ...task, priorityScore: s, priorityLabel: getPriorityLabel(s) }; })
          .sort((a, b) => b.priorityScore - a.priorityScore);
        setTasks(myTasks);
      } else setTasks([]);
    });
  }, [userProfile]);

  useEffect(() => {
    const histRef = ref(db, 'history');
    return onValue(histRef, (snapshot) => {
      if (snapshot.exists()) setHistory(Object.values(snapshot.val()).filter(h => h.userId === userProfile?.uid));
    });
  }, [userProfile]);

  async function updateStatus(task, newStatus) {
    const updates = { status: newStatus, updatedAt: Date.now() };
    if (newStatus === 'in_progress') setTaskStartTimes(p => ({ ...p, [task.id]: Date.now() }));
    if (newStatus === 'completed') {
      updates.completedAt = Date.now();
      const startTime = taskStartTimes[task.id] || task.updatedAt || task.createdAt;
      await update(ref(db, `history/${task.id}`), {
        taskId: task.id, userId: userProfile.uid, effort: task.effort,
        estimatedHours: task.estimatedHours || task.effort * 2,
        actualHours: Math.max(0.1, Math.round(((Date.now() - startTime) / 36e5) * 10) / 10),
        completedAt: Date.now()
      });
      // Push system message
      await push(ref(db, 'messages'), {
        text: `completed the task "${task.title}".`,
        senderId: userProfile.uid,
        senderName: userProfile.name,
        role: userProfile.role,
        timestamp: Date.now(),
        type: 'system'
      });
    }
    await update(ref(db, `tasks/${task.id}`), updates);
  }

  async function handleDragEnd(result) {
    if (!result.destination) return;
    const reordered = Array.from(filteredTasks);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    for (let i = 0; i < reordered.length; i++) await update(ref(db, `tasks/${reordered[i].id}`), { order: i });
  }

  const nextBest = useMemo(() => getNextBestTask(tasks, userProfile?.uid), [tasks, userProfile]);
  const nextBestReasons = useMemo(() => nextBest ? getRecommendationReason(nextBest) : [], [nextBest]);

  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const activeCount = tasks.filter(t => t.status !== 'completed').length;
  const pendingCount = tasks.filter(t => t.status === 'pending').length;
  const inProgCount = tasks.filter(t => t.status === 'in_progress').length;
  const dueSoonCount = tasks.filter(t => t.status !== 'completed' && getDaysUntilDeadline(t.deadline) <= 3 && getDaysUntilDeadline(t.deadline) > 0).length;
  const overdueCount = tasks.filter(t => t.status !== 'completed' && getDaysUntilDeadline(t.deadline) <= 0).length;
  const highPriorityCount = tasks.filter(t => t.priorityLabel === 'High' && t.status !== 'completed').length;

  const filteredTasks = useMemo(() => {
    let f = tasks;
    if (filter === 'all') f = tasks.filter(t => t.status !== 'completed');
    else if (filter === 'due_soon') f = tasks.filter(t => t.status !== 'completed' && getDaysUntilDeadline(t.deadline) <= 3 && getDaysUntilDeadline(t.deadline) > 0);
    else if (filter === 'overdue') f = tasks.filter(t => t.status !== 'completed' && getDaysUntilDeadline(t.deadline) <= 0);
    else f = tasks.filter(t => t.status === filter);
    
    if (search) f = f.filter(t => t.title?.toLowerCase().includes(search.toLowerCase()));
    return f;
  }, [tasks, filter, search]);
  const onTimeRate = history.length > 0 ? Math.round((history.filter(h => h.actualHours <= (h.estimatedHours || 10) * 1.2).length / history.length) * 100) : 100;

  const statusIcon = (s) => s === 'pending' ? <Circle size={16} color="#d97706" /> : s === 'in_progress' ? <Play size={16} color="#2563eb" fill="#2563eb" /> : <CheckCircle2 size={16} color="#16a34a" />;
  const nextStatusLabel = (s) => s === 'pending' ? 'Start' : s === 'in_progress' ? 'Complete' : null;
  const nextStatus = (s) => s === 'pending' ? 'in_progress' : s === 'in_progress' ? 'completed' : null;

  const avatarColors = ['#4f46e5','#7c3aed','#2563eb','#0891b2','#059669'];
  const getAvatarColor = (str) => { let h=0; for(let i=0;i<(str||'').length;i++) h=str.charCodeAt(i)+((h<<5)-h); return avatarColors[Math.abs(h)%avatarColors.length]; };

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      {/* Top bar */}
      <header style={{ padding: '14px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', background: '#fff', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/logo.png" alt="Priorix" style={{ width: '34px', height: '34px', borderRadius: '8px', objectFit: 'contain' }} />
          <h1 className="metallic-text" style={{ fontSize: '20px' }}>Priorix</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color:'#94a3b8' }} />
            <input className="search-bar" placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: '200px' }} />
          </div>
          <NotificationBell userId={userProfile?.uid} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: getAvatarColor(userProfile?.name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: '#fff' }}>{userProfile?.name?.[0]?.toUpperCase()}</div>
            <span style={{ fontWeight: '600', fontSize: '14px', color: '#1e293b' }}>{userProfile?.name}</span>
          </div>
          <button onClick={logout} className="btn-secondary" style={{ padding: '8px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px' }}><LogOut size={14} /> Sign Out</button>
        </div>
      </header>

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 64px)' }}>
        <aside className="employee-sidebar">
          <h3 style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', paddingLeft: '8px' }}>My Pipeline</h3>
          
          <div className={`emp-sidebar-link ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><LayoutDashboard size={16} /> All Active</div>
            <span className="emp-badge" style={{ background: filter === 'all' ? '#e0e7ff' : '#f1f5f9', color: filter === 'all' ? '#4f46e5' : '#64748b' }}>{activeCount}</span>
          </div>
          
          <div className={`emp-sidebar-link ${filter === 'pending' ? 'active' : ''}`} onClick={() => setFilter('pending')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Circle size={16} /> Pending Triage</div>
            <span className="emp-badge" style={{ background: filter === 'pending' ? '#e0e7ff' : '#f1f5f9', color: filter === 'pending' ? '#4f46e5' : '#64748b' }}>{pendingCount}</span>
          </div>

          <div className={`emp-sidebar-link ${filter === 'in_progress' ? 'active' : ''}`} onClick={() => setFilter('in_progress')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Play size={16} /> In Progress</div>
            <span className="emp-badge" style={{ background: filter === 'in_progress' ? '#e0e7ff' : '#f1f5f9', color: filter === 'in_progress' ? '#4f46e5' : '#64748b' }}>{inProgCount}</span>
          </div>

          <div className={`emp-sidebar-link ${filter === 'completed' ? 'active' : ''}`} onClick={() => setFilter('completed')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle2 size={16} /> Completed</div>
            <span className="emp-badge" style={{ background: filter === 'completed' ? '#e0e7ff' : '#f1f5f9', color: filter === 'completed' ? '#4f46e5' : '#64748b' }}>{completedCount}</span>
          </div>

          <h3 style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '32px', marginBottom: '8px', paddingLeft: '8px' }}>Urgent Views</h3>

          <div className={`emp-sidebar-link ${filter === 'due_soon' ? 'active-amber' : ''}`} onClick={() => setFilter('due_soon')} style={{ color: filter === 'due_soon' ? '#d97706' : '#475569' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Clock size={16} /> Near Deadline</div>
            <span className="emp-badge" style={{ background: filter === 'due_soon' ? '#fef3c7' : '#f1f5f9', color: filter === 'due_soon' ? '#b45309' : '#64748b' }}>{dueSoonCount}</span>
          </div>

          <div className={`emp-sidebar-link ${filter === 'overdue' ? 'active-red' : ''}`} onClick={() => setFilter('overdue')} style={{ color: filter === 'overdue' ? '#e11d48' : '#475569' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><AlertTriangle size={16} /> Missed Action</div>
            <span className="emp-badge" style={{ background: filter === 'overdue' ? '#ffe4e6' : '#f1f5f9', color: filter === 'overdue' ? '#be123c' : '#64748b' }}>{overdueCount}</span>
          </div>

          {/* ── Today's Focus ── */}
          <div style={{ marginTop: '28px' }}>
            <h3 style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px', paddingLeft: '8px' }}>Today's Focus</h3>
            <div style={{ background: 'linear-gradient(135deg, #eef2ff, #faf5ff)', padding: '14px', borderRadius: '14px', border: '1px solid #e0e7ff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <Sparkles size={14} color="#4f46e5" />
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#4f46e5' }}>
                  {activeCount === 0 ? 'All clear!' : nextBest ? nextBest.title?.substring(0, 28) + (nextBest.title?.length > 28 ? '…' : '') : 'No tasks yet'}
                </span>
              </div>
              {nextBest && (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '10px', padding: '2px 8px', background: '#fff', borderRadius: '8px', color: '#6366f1', fontWeight: '600', border: '1px solid #e0e7ff' }}>
                    Score {nextBest.priorityScore}
                  </span>
                  <span style={{ fontSize: '10px', padding: '2px 8px', background: '#fff', borderRadius: '8px', color: getDaysUntilDeadline(nextBest.deadline) <= 3 ? '#dc2626' : '#64748b', fontWeight: '600', border: '1px solid #e0e7ff' }}>
                    {getDaysUntilDeadline(nextBest.deadline) <= 0 ? 'Overdue' : `${getDaysUntilDeadline(nextBest.deadline)}d left`}
                  </span>
                </div>
              )}
              {activeCount === 0 && (
                <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>You're all caught up 🎉</p>
              )}
            </div>
          </div>

          {/* ── Weekly Streak ── */}
          <div style={{ marginTop: '20px' }}>
            <h3 style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px', paddingLeft: '8px' }}>Weekly Activity</h3>
            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '14px', border: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                {['M','T','W','T','F','S','S'].map((day, i) => {
                  const dayStart = new Date();
                  dayStart.setDate(dayStart.getDate() - dayStart.getDay() + i + 1);
                  dayStart.setHours(0,0,0,0);
                  const dayEnd = new Date(dayStart); dayEnd.setHours(23,59,59,999);
                  const count = history.filter(h => h.completedAt >= dayStart.getTime() && h.completedAt <= dayEnd.getTime()).length;
                  const isToday = new Date().getDay() === (i + 1) % 7;
                  return (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                      <div style={{
                        width: '24px', height: '24px', borderRadius: '6px',
                        background: count > 0 ? `rgba(79,70,229,${Math.min(0.3 + count * 0.25, 1)})` : '#e2e8f0',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '10px', fontWeight: '700', color: count > 0 ? '#fff' : '#cbd5e1',
                        border: isToday ? '2px solid #4f46e5' : 'none',
                        boxShadow: isToday ? '0 0 0 2px rgba(79,70,229,0.15)' : 'none'
                      }}>
                        {count > 0 ? count : ''}
                      </div>
                      <span style={{ fontSize: '9px', fontWeight: '600', color: isToday ? '#4f46e5' : '#94a3b8' }}>{day}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', color: '#94a3b8' }}>This week</span>
                <span style={{ fontSize: '12px', fontWeight: '800', color: '#4f46e5' }}>
                  {history.filter(h => Date.now() - h.completedAt < 7 * 864e5).length} done
                </span>
              </div>
            </div>
          </div>

          {/* ── Global Distribution ── */}
          <div style={{ marginTop: '20px' }}>
            <h3 style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px', paddingLeft: '8px' }}>Task Distribution</h3>
            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '14px', border: '1px solid #f1f5f9' }}>

              {/* Stacked combo bar */}
              <div style={{ width: '100%', height: '10px', background: '#e2e8f0', borderRadius: '6px', overflow: 'hidden', display: 'flex', marginBottom: '14px' }}>
                <div style={{ width: `${(pendingCount/(tasks.length || 1))*100}%`, height: '100%', background: '#6366f1', transition: 'width 0.5s' }} />
                <div style={{ width: `${(inProgCount/(tasks.length || 1))*100}%`, height: '100%', background: '#3b82f6', transition: 'width 0.5s' }} />
                <div style={{ width: `${(completedCount/(tasks.length || 1))*100}%`, height: '100%', background: '#10b981', transition: 'width 0.5s' }} />
              </div>

              {[
                { label: 'Pending', count: pendingCount, color: '#6366f1', bg: '#eef2ff' },
                { label: 'In Progress', count: inProgCount, color: '#3b82f6', bg: '#eff6ff' },
                { label: 'Completed', count: completedCount, color: '#10b981', bg: '#ecfdf5' },
              ].map((s, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: i < 2 ? '1px solid #f1f5f9' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color }} />
                    <span style={{ fontSize: '11px', fontWeight: '600', color: '#475569' }}>{s.label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a' }}>{s.count}</span>
                    <span style={{ fontSize: '10px', fontWeight: '600', color: '#94a3b8', background: s.bg, padding: '1px 6px', borderRadius: '6px' }}>
                      {Math.round((s.count/(tasks.length || 1))*100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Performance Score ── */}
          <div style={{ marginTop: '20px', marginBottom: '8px' }}>
            <h3 style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px', paddingLeft: '8px' }}>Performance</h3>
            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '14px', border: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
              <div>
                <p style={{ fontSize: '20px', fontWeight: '800', color: onTimeRate >= 80 ? '#10b981' : onTimeRate >= 50 ? '#f59e0b' : '#ef4444', lineHeight: 1, marginBottom: '4px' }}>{onTimeRate}%</p>
                <p style={{ fontSize: '10px', fontWeight: '600', color: '#94a3b8' }}>On-Time</p>
              </div>
              <div style={{ width: '1px', background: '#e2e8f0' }} />
              <div>
                <p style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', lineHeight: 1, marginBottom: '4px' }}>{history.length > 0 ? (Math.round(history.reduce((s,h) => s + h.actualHours, 0) / history.length * 10) / 10) : 0}h</p>
                <p style={{ fontSize: '10px', fontWeight: '600', color: '#94a3b8' }}>Avg Time</p>
              </div>
              <div style={{ width: '1px', background: '#e2e8f0' }} />
              <div>
                <p style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', lineHeight: 1, marginBottom: '4px' }}>{tasks.length}</p>
                <p style={{ fontSize: '10px', fontWeight: '600', color: '#94a3b8' }}>Total</p>
              </div>
            </div>
          </div>
        </aside>

        <main style={{ flex: 1, padding: '24px 32px', maxWidth: '1100px', margin: '0 auto', overflowY: 'auto' }}>
          <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a' }}>
              Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {userProfile?.name?.split(' ')[0]} 👋
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '2px' }}>{activeCount > 0 ? `You have ${activeCount} active task${activeCount > 1 ? 's' : ''}.` : 'All caught up!'}</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', background: '#e2e8f0', padding: '4px', borderRadius: '12px' }}>
            <button onClick={() => setActiveView('tasks')} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: '600', transition: 'all 0.2s', background: activeView === 'tasks' ? '#fff' : 'transparent', color: activeView === 'tasks' ? '#0f172a' : '#64748b', boxShadow: activeView === 'tasks' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', border: 'none', cursor: 'pointer' }}>
              <ListTodo size={16} /> My Tasks
            </button>
            <button onClick={() => setActiveView('hub')} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: '600', transition: 'all 0.2s', background: activeView === 'hub' ? '#fff' : 'transparent', color: activeView === 'hub' ? '#4f46e5' : '#64748b', boxShadow: activeView === 'hub' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', border: 'none', cursor: 'pointer' }}>
              <MessageSquare size={16} /> Team Hub
            </button>
          </div>
        </div>

        {activeView === 'hub' ? (
          <TeamChat isDashboard={true} />
        ) : (
          <div className="animate-slideUp">
            {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
          {[
            { label: 'Active Tasks', value: activeCount, icon: Target, cls: 'stat-card-blue', color: '#4f46e5' },
            { label: 'Completed', value: completedCount, icon: CheckCircle2, cls: 'stat-card-green', color: '#10b981' },
            { label: 'High Priority', value: highPriorityCount, icon: Flame, cls: 'stat-card-red', color: '#ef4444' },
            { label: 'On-Time Rate', value: `${onTimeRate}%`, icon: Award, cls: 'stat-card-amber', color: '#f59e0b' }
          ].map((s, i) => (
            <div key={i} className={`stat-card ${s.cls}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ color: '#64748b', fontSize: '12px', fontWeight: '500', marginBottom: '6px' }}>{s.label}</p>
                  <p style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', lineHeight: 1 }}>{s.value}</p>
                </div>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${s.color}10`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <s.icon size={18} color={s.color} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* AI Recommendation */}
        {nextBest && (
          <div className="card-static animate-slideUp" style={{ padding: focusMode ? '48px' : '22px', marginBottom: '20px', border: focusMode ? '1px solid #818cf8' : '1px solid #c7d2fe', background: 'linear-gradient(135deg, #eef2ff, #faf5ff)', transform: focusMode ? 'scale(1.02)' : 'none', transition: 'all 0.3s' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={focusMode ? 24 : 16} color="#4f46e5" className="animate-pulse-glow" style={{ borderRadius: '50%' }} />
                <span style={{ fontSize: focusMode ? '14px' : '12px', fontWeight: '800', color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Recommendation — Next Best Action</span>
              </div>
              
              <button 
                onClick={() => setFocusMode(!focusMode)} 
                style={{ background: focusMode ? '#4f46e5' : '#fff', color: focusMode ? '#fff' : '#64748b', border: '1px solid #e2e8f0', padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Target size={14} /> {focusMode ? 'Exit Focus Mode' : 'Enter Focus Mode'}
              </button>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: focusMode ? 'center' : 'flex-start', flexDirection: focusMode ? 'column' : 'row', gap: focusMode ? '32px' : '0' }}>
              <div style={{ flex: 1, textAlign: focusMode ? 'center' : 'left' }}>
                <h3 style={{ fontSize: focusMode ? '32px' : '18px', fontWeight: '800', color: '#0f172a', marginBottom: '12px', lineHeight: 1.2 }}>{nextBest.title}</h3>
                {nextBest.description && <p style={{ color: '#64748b', fontSize: focusMode ? '16px' : '13px', marginBottom: '16px', maxWidth: focusMode ? '100%' : '500px' }}>{nextBest.description}</p>}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: focusMode ? 'center' : 'flex-start' }}>
                  {nextBestReasons.map((r, i) => (
                     <span key={i} style={{ padding: '4px 10px', borderRadius: '16px', fontSize: focusMode ? '13px' : '11px', background: '#fff', border: '1px solid #e2e8f0', color: '#475569' }}>{r}</span>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: focusMode ? 'row' : 'column', alignItems: 'center', gap: '16px' }}>
                <span className={`priority-${nextBest.priorityLabel?.toLowerCase()}`} style={{ fontSize: focusMode ? '16px' : '12px', padding: focusMode ? '6px 16px' : '4px 12px' }}>Score: {nextBest.priorityScore}</span>
                {nextStatus(nextBest.status) && (
                  <button onClick={() => updateStatus(nextBest, nextStatus(nextBest.status))}
                    className={nextBest.status === 'pending' ? 'btn-primary' : 'btn-success'}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: focusMode ? '16px 32px' : '10px 18px', fontSize: focusMode ? '16px' : '14px', borderRadius: focusMode ? '12px' : '8px' }}>
                    {nextBest.status === 'pending' ? <Play size={focusMode ? 20 : 15} /> : <CheckCircle2 size={focusMode ? 20 : 15} />}
                    {nextStatusLabel(nextBest.status)}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Task List */}
        {!focusMode && (
          <>
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="tasks">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {filteredTasks.map((task, index) => {
                  const daysLeft = getDaysUntilDeadline(task.deadline);
                  const predicted = predictCompletionTime(task, history);
                  return (
                    <Draggable key={task.id} draggableId={task.id} index={index}>
                      {(provided, snapshot) => (
                        <div ref={provided.innerRef} {...provided.draggableProps}
                          className={`card ${snapshot.isDragging ? 'dragging' : ''}`}
                          style={{ padding: '18px 20px', ...provided.draggableProps.style }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                            <div {...provided.dragHandleProps} style={{ cursor: 'grab', padding: '2px', color: '#cbd5e1', marginTop: '2px' }}><GripVertical size={16} /></div>
                            <div style={{ marginTop: '2px' }}>{statusIcon(task.status)}</div>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                  <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a', marginBottom: '4px' }}>{task.title}</h4>
                                  {task.description && <p style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '8px', maxWidth: '450px' }}>{task.description}</p>}
                                </div>
                                <span className={`priority-${task.priorityLabel?.toLowerCase()}`}>{task.priorityLabel} • {task.priorityScore}</span>
                              </div>
                              <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: daysLeft <= 3 ? '#dc2626' : '#94a3b8' }}>
                                  <Calendar size={12} />{daysLeft <= 0 ? 'Overdue!' : `${daysLeft}d left`}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#94a3b8' }}><Target size={12} />Impact: {task.impact}/10</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#94a3b8' }}><BarChart3 size={12} />Effort: {task.effort}/10</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#94a3b8' }}><Timer size={12} />~{predicted}h</div>
                              </div>
                            </div>
                            {task.status !== 'completed' && nextStatus(task.status) && (
                              <button onClick={() => updateStatus(task, nextStatus(task.status))}
                                className={task.status === 'pending' ? 'btn-primary' : 'btn-success'}
                                style={{ padding: '8px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                                {task.status === 'pending' ? <Play size={13} /> : <CheckCircle2 size={13} />}
                                {nextStatusLabel(task.status)}
                              </button>
                            )}
                            {task.status === 'completed' && <span className="status-completed">✓ Done</span>}
                          </div>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {filteredTasks.length === 0 && (
          <div className="card-static" style={{ padding: '48px', textAlign: 'center', marginTop: '8px' }}>
            <CheckCircle2 size={40} color="#e2e8f0" style={{ margin: '0 auto 12px auto' }} />
            <p style={{ color: '#94a3b8', fontSize: '14px' }}>{filter === 'completed' ? 'No completed tasks yet.' : 'All clear! Nothing here.'}</p>
          </div>
        )}

        {history.length >= 3 && (
          <div className="card-static" style={{ padding: '20px', marginTop: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <TrendingUp size={16} color="#4f46e5" />
              <span style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>Productivity Insights</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              {[
                { label: 'Avg Completion', value: `${Math.round(history.reduce((s,h)=>s+h.actualHours,0)/history.length*10)/10}h` },
                { label: 'This Week', value: history.filter(h=>Date.now()-h.completedAt<7*864e5).length },
                { label: 'On-Time Rate', value: `${onTimeRate}%`, color: onTimeRate >= 80 ? '#16a34a' : '#d97706' }
              ].map((s,i) => (
                <div key={i} style={{ textAlign: 'center', padding: '14px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                  <p style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>{s.label}</p>
                  <p style={{ fontSize: '20px', fontWeight: '800', color: s.color || '#0f172a' }}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
          </>
        )}
        </div>
        )}
      </main>
      </div>
    </div>
  );
}
