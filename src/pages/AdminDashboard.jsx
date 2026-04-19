import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { ref, onValue, set, push, remove, update } from 'firebase/database';
import { calculatePriorityScore, getPriorityLabel, getPriorityColor, getDaysUntilDeadline } from '../engine/priorityEngine';
import { getWorkloadDistribution, detectOverloadAndRebalance, recommendAssignment, getGuidanceSuggestion } from '../engine/assignmentEngine';
import { checkAndGenerateNotifications, pushNotification } from '../engine/notificationEngine';
import { generateSeedTasks, sampleEmployees } from '../engine/seedData';
import NotificationBell from '../components/NotificationBell';
import AnalyticsDashboard from '../components/admin/AnalyticsDashboard';
import ReportGenerator from '../components/reports/ReportGenerator';
import TeamChat from '../components/TeamChat';
import {
  LayoutDashboard, ListTodo, Users, BarChart3, FileText,
  LogOut, Plus, Edit3, Trash2, X, Check, Clock, Zap,
  AlertTriangle, ChevronDown, User, Calendar, Target, Flame,
  ArrowRightLeft, RefreshCw, Database, Upload, Search, TrendingUp, MessageSquare
} from 'lucide-react';

export default function AdminDashboard() {
  const { userProfile, logout, addEmployee } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [flippedCards, setFlippedCards] = useState({});
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [error, setError] = useState('');
  const [seeding, setSeeding] = useState(false);
  const [search, setSearch] = useState('');

  const [taskForm, setTaskForm] = useState({
    title: '', description: '', goal: '', deadline: '', effort: 5, impact: 5, assignedTo: '', estimatedHours: 10
  });
  const [empForm, setEmpForm] = useState({ name: '', email: '' });
  const [empLoading, setEmpLoading] = useState(false);

  useEffect(() => {
    const tasksRef = ref(db, 'tasks');
    return onValue(tasksRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const taskList = Object.entries(data).map(([id, task]) => {
          const score = calculatePriorityScore(task);
          return { id, ...task, priorityScore: score, priorityLabel: getPriorityLabel(score) };
        });
        setTasks(taskList.sort((a, b) => b.priorityScore - a.priorityScore));
      } else { setTasks([]); }
    });
  }, []);

  useEffect(() => {
    const usersRef = ref(db, 'users');
    return onValue(usersRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setEmployees(Object.entries(data).filter(([, u]) => u.role === 'employee').map(([uid, u]) => ({ uid, ...u })));
      } else { setEmployees([]); }
    });
  }, []);

  useEffect(() => {
    if (tasks.length === 0 || employees.length === 0) return;
    const interval = setInterval(() => {
      checkAndGenerateNotifications(tasks, employees).forEach(n => {
        if (n.userId) pushNotification(n.userId, n);
      });
    }, 60000);
    return () => clearInterval(interval);
  }, [tasks, employees]);

  async function handleTaskSubmit(e) {
    e.preventDefault(); setError('');
    try {
      const emp = employees.find(e => e.uid === taskForm.assignedTo);
      const data = {
        title: taskForm.title, description: taskForm.description, goal: taskForm.goal || '',
        deadline: taskForm.deadline, deadline_days: getDaysUntilDeadline(taskForm.deadline),
        effort: parseInt(taskForm.effort), impact: parseInt(taskForm.impact),
        assignedTo: taskForm.assignedTo || '', assignedToName: emp?.name || 'Unassigned',
        estimatedHours: parseInt(taskForm.estimatedHours) || 10,
        status: editingTask?.status || 'pending',
        createdBy: userProfile.uid, createdAt: editingTask?.createdAt || Date.now(), updatedAt: Date.now()
      };
      if (editingTask) await update(ref(db, `tasks/${editingTask.id}`), data);
      else await push(ref(db, 'tasks'), data);
      setShowTaskModal(false); setEditingTask(null);
      setTaskForm({ title: '', description: '', goal: '', deadline: '', effort: 5, impact: 5, assignedTo: '', estimatedHours: 10 });
    } catch (err) { setError(err.message); }
  }

  async function handleDeleteTask(taskId) { if (confirm('Delete this task?')) await remove(ref(db, `tasks/${taskId}`)); }

  function startEditTask(task) {
    setEditingTask(task);
    setTaskForm({ title: task.title, description: task.description || '', deadline: task.deadline || '',
      effort: task.effort || 5, impact: task.impact || 5, assignedTo: task.assignedTo || '', estimatedHours: task.estimatedHours || 10 });
    setShowTaskModal(true);
  }

  async function handleAddEmployee(e) {
    e.preventDefault(); setEmpLoading(true); setError('');
    try { await addEmployee(empForm.email, empForm.name); setShowEmployeeModal(false); setEmpForm({ name: '', email: '' }); }
    catch (err) { setError(err.code === 'auth/email-already-in-use' ? 'Email already registered' : err.message); }
    finally { setEmpLoading(false); }
  }

  async function handleRemoveEmployee(uid) {
    if (!confirm('Remove this employee?')) return;
    await remove(ref(db, `users/${uid}`));
    tasks.filter(t => t.assignedTo === uid).forEach(async (task) => {
      await update(ref(db, `tasks/${task.id}`), { assignedTo: '', assignedToName: 'Unassigned' });
    });
  }

  async function handleAutoAssign(task) {
    const recs = recommendAssignment(task, employees, tasks);
    if (recs.length > 0) await update(ref(db, `tasks/${task.id}`), { assignedTo: recs[0].employee.uid, assignedToName: recs[0].employee.name });
  }

  async function handleRebalance() {
    const { suggestions } = detectOverloadAndRebalance(employees, tasks);
    for (const s of suggestions) {
      await update(ref(db, `tasks/${s.task.id}`), { assignedTo: s.to.uid, assignedToName: s.to.name });
      await pushNotification(s.to.uid, { message: `📋 "${s.task.title}" reassigned to you.`, type: 'reassignment', taskId: s.task.id });
    }
    alert(suggestions.length === 0 ? 'All workloads are balanced!' : `Rebalanced ${suggestions.length} task(s).`);
  }

  async function handleSeedData() {
    if (tasks.length > 0 && !confirm('Add 50 tasks from TS-PS13.csv?')) return;
    setSeeding(true);
    try {
      let empUids = employees.map(e => e.uid);
      if (empUids.length === 0) {
        for (const emp of sampleEmployees) {
          try { const uid = await addEmployee(emp.email, emp.name); empUids.push(uid); }
          catch (e) { console.log('exists:', emp.email); }
        }
        await new Promise(r => setTimeout(r, 2000));
      }
      const seedTasks = generateSeedTasks(empUids);
      const empMap = {};
      employees.forEach(e => { empMap[e.uid] = e.name; });
      sampleEmployees.forEach((e, i) => { if (empUids[i]) empMap[empUids[i]] = e.name; });
      for (const task of seedTasks) {
        task.assignedToName = empMap[task.assignedTo] || 'Unassigned';
        task.createdBy = userProfile.uid;
        await push(ref(db, 'tasks'), task);
      }
      alert(`Loaded ${seedTasks.length} tasks from TS-PS13.csv!`);
    } catch (err) { setError('Seed failed: ' + err.message); }
    finally { setSeeding(false); }
  }

  const workloadData = getWorkloadDistribution(employees, tasks);
  const { overloaded } = detectOverloadAndRebalance(employees, tasks);
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
  const overdueTasksList = tasks.filter(t => t.status !== 'completed' && getDaysUntilDeadline(t.deadline) <= 0);
  const overdueTasks = overdueTasksList.length;
  const highPriorityTasks = tasks.filter(t => t.priorityLabel === 'High' && t.status !== 'completed').length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const guidanceSuggestion = getGuidanceSuggestion(employees, tasks);

  const toggleFlip = (uid) => {
    setFlippedCards(prev => ({ ...prev, [uid]: !prev[uid] }));
  };

  const filteredTasks = search 
    ? tasks.filter(t => t.title?.toLowerCase().includes(search.toLowerCase()) || t.assignedToName?.toLowerCase().includes(search.toLowerCase()))
    : tasks;

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tasks', label: 'Tasks', icon: ListTodo },
    { id: 'employees', label: 'Team Members', icon: Users },
    { id: 'chat', label: 'Team Hub', icon: MessageSquare },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'reports', label: 'Reports', icon: FileText }
  ];

  const avatarColors = ['#4f46e5','#7c3aed','#2563eb','#0891b2','#059669','#d97706','#dc2626','#be185d'];

  function getAvatarColor(str) {
    let hash = 0;
    for (let i = 0; i < (str||'').length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return avatarColors[Math.abs(hash) % avatarColors.length];
  }

  function getWorkloadStatus(emp) {
    const active = emp.pending + emp.inProgress;
    if (active >= 6) return { label: 'Overloaded', cls: 'wl-overloaded' };
    if (active >= 4) return { label: 'Under Pressure', cls: 'wl-pressure' };
    if (active >= 2) return { label: 'On Track', cls: 'wl-moderate' };
    return { label: 'Balanced', cls: 'wl-balanced' };
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f0f2f5' }}>
      {/* Sidebar */}
      <aside className="admin-sidebar" style={{
        width: '250px', background: '#ffffff', borderRight: '1px solid #e5e7eb',
        padding: '24px 14px', display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100,
        overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: '#e2e8f0 transparent'
      }}>
        <div className="admin-sidebar-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 12px', marginBottom: '32px' }}>
          <img src="/logo.png" alt="Priorix" style={{ width: '38px', height: '38px', borderRadius: '10px', objectFit: 'contain' }} />
          <div>
            <h2 className="metallic-text" style={{ fontSize: '20px' }}>Priorix</h2>
            <p style={{ fontSize: '11px', color: '#94a3b8' }}>Admin Panel</p>
          </div>
        </div>

        <p style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 12px', marginBottom: '8px' }}>Menu</p>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {tabs.map(tab => (
            <div key={tab.id} className={`sidebar-item ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
              <tab.icon size={18} />
              <span>{tab.label}</span>
              {tab.id === 'tasks' && tasks.length > 0 && (
                <span style={{ marginLeft: 'auto', background: '#eef2ff', color: '#4f46e5', fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '10px' }}>{tasks.length}</span>
              )}
            </div>
          ))}
        </nav>

        {/* ── Task Health ── */}
        <div style={{ marginTop: '28px' }}>
          <p style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 12px', marginBottom: '8px' }}>Task Health</p>
          <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '14px', border: '1px solid #f1f5f9', margin: '0 4px' }}>
            {/* Stacked bar */}
            <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '6px', overflow: 'hidden', display: 'flex', marginBottom: '12px' }}>
              <div style={{ width: `${totalTasks ? (completedTasks/totalTasks)*100 : 0}%`, height: '100%', background: '#10b981', transition: 'width 0.5s' }} />
              <div style={{ width: `${totalTasks ? (inProgressTasks/totalTasks)*100 : 0}%`, height: '100%', background: '#3b82f6', transition: 'width 0.5s' }} />
              <div style={{ width: `${totalTasks ? (overdueTasks/totalTasks)*100 : 0}%`, height: '100%', background: '#ef4444', transition: 'width 0.5s' }} />
            </div>
            {[
              { label: 'Completed', count: completedTasks, color: '#10b981' },
              { label: 'In Progress', count: inProgressTasks, color: '#3b82f6' },
              { label: 'Overdue', count: overdueTasks, color: '#ef4444' },
              { label: 'High Priority', count: highPriorityTasks, color: '#f59e0b' },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: s.color }} />
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>{s.label}</span>
                </div>
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#0f172a' }}>{s.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Team Pulse ── */}
        <div style={{ marginTop: '16px' }}>
          <p style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 12px', marginBottom: '8px' }}>Team Pulse</p>
          <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '14px', border: '1px solid #f1f5f9', margin: '0 4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center', marginBottom: '10px' }}>
              <div>
                <p style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', lineHeight: 1 }}>{employees.length}</p>
                <p style={{ fontSize: '9px', fontWeight: '600', color: '#94a3b8', marginTop: '2px' }}>Members</p>
              </div>
              <div style={{ width: '1px', background: '#e2e8f0' }} />
              <div>
                <p style={{ fontSize: '18px', fontWeight: '800', color: overloaded.length > 0 ? '#ef4444' : '#10b981', lineHeight: 1 }}>{overloaded.length}</p>
                <p style={{ fontSize: '9px', fontWeight: '600', color: '#94a3b8', marginTop: '2px' }}>Overloaded</p>
              </div>
              <div style={{ width: '1px', background: '#e2e8f0' }} />
              <div>
                <p style={{ fontSize: '18px', fontWeight: '800', color: '#10b981', lineHeight: 1 }}>{employees.length - overloaded.length}</p>
                <p style={{ fontSize: '9px', fontWeight: '600', color: '#94a3b8', marginTop: '2px' }}>Balanced</p>
              </div>
            </div>
            {overloaded.length > 0 && (
              <div style={{ background: '#fef2f2', padding: '8px 10px', borderRadius: '8px', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={12} color="#dc2626" />
                <span style={{ fontSize: '10px', fontWeight: '600', color: '#dc2626' }}>{overloaded.length} member{overloaded.length > 1 ? 's' : ''} need rebalancing</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Quick Stats ── */}
        <div style={{ marginTop: '16px', marginBottom: '20px' }}>
          <p style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 12px', marginBottom: '8px' }}>Performance</p>
          <div style={{ background: completionRate >= 50 ? 'linear-gradient(135deg, #ecfdf5, #f0fdf4)' : 'linear-gradient(135deg, #fef2f2, #fff7ed)', padding: '14px', borderRadius: '14px', border: `1px solid ${completionRate >= 50 ? '#bbf7d0' : '#fecaca'}`, margin: '0 4px', textAlign: 'center' }}>
            <p style={{ fontSize: '28px', fontWeight: '900', color: completionRate >= 50 ? '#16a34a' : '#dc2626', lineHeight: 1, marginBottom: '4px' }}>{completionRate}%</p>
            <p style={{ fontSize: '10px', fontWeight: '600', color: '#64748b' }}>Completion Rate</p>
            <p style={{ fontSize: '9px', color: '#94a3b8', marginTop: '4px' }}>{completedTasks} of {totalTasks} tasks done</p>
          </div>
        </div>

        {/* User card */}
        <div className="admin-sidebar-user" style={{ padding: '16px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e5e7eb', marginTop: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div className="avatar-sm" style={{ background: getAvatarColor(userProfile?.name), width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '700', fontSize: '14px' }}>
              {userProfile?.name?.[0]?.toUpperCase() || 'A'}
            </div>
            <div>
              <p style={{ fontWeight: '600', fontSize: '13px', color: '#1e293b' }}>{userProfile?.name || 'Admin'}</p>
              <p style={{ fontSize: '11px', color: '#94a3b8' }}>{userProfile?.email}</p>
            </div>
          </div>
          <button onClick={logout} className="btn-secondary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px', fontSize: '13px' }}>
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="admin-main" style={{ flex: 1, marginLeft: '250px', padding: '24px 32px' }}>
        {/* Header */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a' }}>
              {activeTab === 'dashboard' ? `Welcome back, ${userProfile?.name?.split(' ')[0]} 👋` : tabs.find(t => t.id === activeTab)?.label}
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '2px' }}>
              {activeTab === 'dashboard' && "Here's what's happening with your team today"}
              {activeTab === 'tasks' && `${tasks.length} total tasks`}
              {activeTab === 'employees' && `${employees.length} team members`}
              {activeTab === 'analytics' && 'Performance insights & metrics'}
              {activeTab === 'reports' && 'Export and analyze data'}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {(activeTab === 'dashboard' || activeTab === 'tasks') && (
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input className="search-bar" placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            )}
            <NotificationBell userId={userProfile?.uid} />
            {activeTab === 'dashboard' && (
              <button onClick={handleSeedData} disabled={seeding} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontSize: '13px' }}>
                {seeding ? <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} /> : <Upload size={15} />}
                {seeding ? 'Seeding...' : 'Load CSV Data'}
              </button>
            )}
            {activeTab === 'tasks' && (
              <button className="btn-primary" onClick={() => { setEditingTask(null); setTaskForm({ title: '', description: '', deadline: '', effort: 5, impact: 5, assignedTo: '', estimatedHours: 10 }); setShowTaskModal(true); }} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Plus size={18} /> Create Task
              </button>
            )}
            {activeTab === 'employees' && (
              <button className="btn-primary" onClick={() => setShowEmployeeModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Plus size={18} /> Add Member
              </button>
            )}
          </div>
        </header>

        {/* ======== DASHBOARD ======== */}
        {activeTab === 'dashboard' && (
          <div className="animate-slideUp">
            {/* Stats Row */}
            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
              {[
                { label: 'Total Tasks', value: totalTasks, sub: `${inProgressTasks} in progress`, icon: ListTodo, cls: 'stat-card-blue', color: '#4f46e5' },
                { label: 'Completion Rate', value: `${completionRate}%`, sub: `${completedTasks} completed`, icon: TrendingUp, cls: 'stat-card-green', color: '#10b981' },
                { label: 'High Priority', value: highPriorityTasks, sub: 'Need attention', icon: Flame, cls: 'stat-card-red', color: '#ef4444' },
                { label: 'Overdue', value: overdueTasks, sub: 'Past deadline', icon: AlertTriangle, cls: 'stat-card-amber', color: '#f59e0b' }
              ].map((stat, i) => (
                <div key={i} className={`stat-card ${stat.cls}`}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ color: '#64748b', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>{stat.label}</p>
                      <p style={{ fontSize: '30px', fontWeight: '800', color: '#0f172a', lineHeight: 1 }}>{stat.value}</p>
                      <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>{stat.sub}</p>
                    </div>
                    <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: `${stat.color}10`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <stat.icon size={20} color={stat.color} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Task Status + Team Workload */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              {/* Task Status Distribution */}
              <div className="card-static" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', marginBottom: '20px' }}>Task Status Distribution</h3>
                <div style={{ display: 'flex', gap: '24px', marginBottom: '20px' }}>
                  {[
                    { label: 'In Progress', value: inProgressTasks, pct: totalTasks ? Math.round(inProgressTasks/totalTasks*100) : 0, color: '#3b82f6', cls: 'progress-blue' },
                    { label: 'Completed', value: completedTasks, pct: completionRate, color: '#10b981', cls: 'progress-green' },
                    { label: 'Overdue', value: overdueTasks, pct: totalTasks ? Math.round(overdueTasks/totalTasks*100) : 0, color: '#f59e0b', cls: 'progress-amber' }
                  ].map((s, i) => (
                    <div key={i} style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color }} />
                        <span style={{ fontSize: '13px', color: '#64748b' }}>{s.label}</span>
                      </div>
                      <p style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>{s.pct}%</p>
                      <div className="progress-bar">
                        <div className={`progress-bar-fill ${s.cls}`} style={{ width: `${s.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* ── Visual Donut Ring ── */}
                <div style={{ display: 'flex', gap: '24px', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
                  <div style={{ position: 'relative', width: '110px', height: '110px', flexShrink: 0 }}>
                    <svg viewBox="0 0 36 36" style={{ width: '110px', height: '110px', transform: 'rotate(-90deg)' }}>
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#10b981" strokeWidth="3"
                        strokeDasharray={`${totalTasks ? (completedTasks/totalTasks)*100 : 0} ${100 - (totalTasks ? (completedTasks/totalTasks)*100 : 0)}`}
                        strokeDashoffset="0" strokeLinecap="round" />
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#3b82f6" strokeWidth="3"
                        strokeDasharray={`${totalTasks ? (inProgressTasks/totalTasks)*100 : 0} ${100 - (totalTasks ? (inProgressTasks/totalTasks)*100 : 0)}`}
                        strokeDashoffset={`-${totalTasks ? (completedTasks/totalTasks)*100 : 0}`} strokeLinecap="round" />
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f59e0b" strokeWidth="3"
                        strokeDasharray={`${totalTasks ? (overdueTasks/totalTasks)*100 : 0} ${100 - (totalTasks ? (overdueTasks/totalTasks)*100 : 0)}`}
                        strokeDashoffset={`-${totalTasks ? ((completedTasks + inProgressTasks)/totalTasks)*100 : 0}`} strokeLinecap="round" />
                    </svg>
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                      <p style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', lineHeight: 1 }}>{totalTasks}</p>
                      <p style={{ fontSize: '9px', color: '#94a3b8', fontWeight: '600' }}>Total</p>
                    </div>
                  </div>

                  {/* Breakdown list */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[
                      { label: 'Pending', count: totalTasks - inProgressTasks - completedTasks - overdueTasks, color: '#6366f1', icon: '⏳' },
                      { label: 'In Progress', count: inProgressTasks, color: '#3b82f6', icon: '🔄' },
                      { label: 'Completed', count: completedTasks, color: '#10b981', icon: '✅' },
                      { label: 'Overdue', count: overdueTasks, color: '#f59e0b', icon: '⚠️' },
                      { label: 'High Priority', count: highPriorityTasks, color: '#ef4444', icon: '🔥' },
                    ].map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 10px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '12px' }}>{item.icon}</span>
                          <span style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>{item.label}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>{item.count}</span>
                          <span style={{ fontSize: '10px', fontWeight: '600', color: '#94a3b8', background: '#fff', padding: '1px 6px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                            {totalTasks ? Math.round((item.count / totalTasks) * 100) : 0}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Priority Heat Strip ── */}
                <div style={{ marginTop: '18px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
                  <p style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '10px' }}>Priority Distribution</p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[
                      { label: 'High', count: tasks.filter(t => t.priorityLabel === 'High').length, color: '#ef4444', bg: '#fef2f2' },
                      { label: 'Medium', count: tasks.filter(t => t.priorityLabel === 'Medium').length, color: '#f59e0b', bg: '#fffbeb' },
                      { label: 'Low', count: tasks.filter(t => t.priorityLabel === 'Low').length, color: '#10b981', bg: '#ecfdf5' },
                    ].map((p, i) => (
                      <div key={i} style={{ flex: 1, padding: '10px', borderRadius: '10px', background: p.bg, border: `1px solid ${p.color}20`, textAlign: 'center' }}>
                        <p style={{ fontSize: '18px', fontWeight: '800', color: p.color, lineHeight: 1, marginBottom: '2px' }}>{p.count}</p>
                        <p style={{ fontSize: '10px', fontWeight: '600', color: p.color }}>{p.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Team Workload Table */}
              <div className="card-static" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>Team Workload</h3>
                  <button onClick={handleRebalance} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <ArrowRightLeft size={13} /> Rebalance
                  </button>
                </div>
                {workloadData.length === 0 ? (
                  <p style={{ color: '#94a3b8', fontSize: '14px', textAlign: 'center', padding: '24px' }}>No team members yet</p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', paddingBottom: '10px', letterSpacing: '0.05em' }}>Name</th>
                        <th style={{ textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', paddingBottom: '10px' }}>Active Capacity</th>
                        <th style={{ textAlign: 'right', fontSize: '11px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', paddingBottom: '10px' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workloadData.map((emp, i) => {
                        const status = getWorkloadStatus(emp);
                        const activeCount = emp.pending + emp.inProgress;
                        const capacityPct = Math.min((activeCount / 10) * 100, 100);
                        const capacityColor = activeCount >= 8 ? '#ef4444' : activeCount >= 5 ? '#f59e0b' : '#10b981';
                        
                        return (
                          <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '10px 0', display: 'flex', alignItems: 'center', gap: '10px', width: '35%' }}>
                              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: getAvatarColor(emp.name), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '12px', fontWeight: '700' }}>
                                {emp.name?.[0]?.toUpperCase()}
                              </div>
                              <div>
                                <p style={{ fontWeight: '600', fontSize: '13px', color: '#1e293b' }}>{emp.name}</p>
                                <p style={{ fontSize: '11px', color: '#94a3b8' }}>{emp.completed} Total Done</p>
                              </div>
                            </td>
                            <td style={{ width: '45%' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ flex: 1, backgroundColor: '#f1f5f9', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                                  <div style={{
                                    width: `${capacityPct}%`,
                                    background: capacityColor,
                                    height: '100%', borderRadius: '4px', transition: 'width 0.3s ease'
                                  }} />
                                </div>
                                <span style={{ fontSize: '12px', fontWeight: '700', color: capacityColor, width: '40px', textAlign: 'right' }}>
                                  {activeCount}/10
                                </span>
                              </div>
                            </td>
                            <td style={{ textAlign: 'right', width: '20%' }}>
                              <span className={status.cls} style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' }}>
                                {status.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Recent Tasks */}
            <div className="card-static" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>Recent Tasks</h3>
                <button onClick={() => setActiveTab('tasks')} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>View All</button>
              </div>
              {tasks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px' }}>
                  <ListTodo size={40} color="#e2e8f0" style={{ margin: '0 auto 12px auto' }} />
                  <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '16px' }}>No tasks yet</p>
                  <button onClick={handleSeedData} disabled={seeding} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    {seeding ? <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} /> : <Database size={16} />}
                    {seeding ? 'Loading...' : 'Load TS-PS13.csv Data'}
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(search ? filteredTasks : tasks).slice(0, 6).map((task, i) => {
                    const daysLeft = getDaysUntilDeadline(task.deadline);
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: '10px', background: '#fafbfc', border: '1px solid #f1f5f9', transition: 'all 0.15s' }}
                        onMouseOver={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                        onMouseOut={e => { e.currentTarget.style.background = '#fafbfc'; e.currentTarget.style.borderColor = '#f1f5f9'; }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: task.priorityLabel === 'High' ? '#ef4444' : task.priorityLabel === 'Medium' ? '#f59e0b' : '#22c55e' }} />
                          <div>
                            <p style={{ fontWeight: '600', fontSize: '13px', color: '#1e293b' }}>{task.title}</p>
                            <p style={{ fontSize: '12px', color: '#94a3b8' }}>{task.assignedToName} · {daysLeft <= 0 ? 'Overdue' : `${daysLeft}d left`}</p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className={`status-${task.status}`}>{task.status?.replace('_', ' ')}</span>
                          <span className={`priority-${task.priorityLabel?.toLowerCase()}`}>{task.priorityLabel}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {overloaded.length > 0 && (
              <div style={{ marginTop: '16px', padding: '14px 18px', borderRadius: '12px', background: '#fef2f2', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertTriangle size={18} color="#dc2626" />
                <div>
                  <span style={{ fontWeight: '600', color: '#dc2626', fontSize: '13px' }}>Overload Warning: </span>
                  <span style={{ color: '#991b1b', fontSize: '13px' }}>{overloaded.map(e => e.name).join(', ')} {overloaded.length === 1 ? 'has' : 'have'} too many active tasks.</span>
                </div>
              </div>
            )}
            {overdueTasks > 0 && (
              <div className="animate-pulse" style={{ marginTop: '16px', padding: '14px 18px', borderRadius: '12px', background: '#fff1f2', border: '1px solid #fda4af', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertTriangle size={18} color="#e11d48" />
                <div>
                  <span style={{ fontWeight: '600', color: '#e11d48', fontSize: '13px' }}>Missed Deadline Notification: </span>
                  <span style={{ color: '#be123c', fontSize: '13px' }}>
                    {Array.from(new Set(overdueTasksList.filter(t => t.assignedToName && t.assignedToName !== 'Unassigned').map(t => t.assignedToName))).join(', ') || 'Certain individuals'} have overdue tasks requiring immediate intervention.
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======== TASKS ======== */}
        {activeTab === 'tasks' && (
          <div className="animate-slideUp">
            <div className="card-static" style={{ overflow: 'hidden' }}>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                  <tr>
                    <th>Task</th><th>Priority</th><th>Status</th><th>Assigned To</th><th>Deadline</th><th>Effort</th><th>Impact</th><th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map(task => {
                    const daysLeft = getDaysUntilDeadline(task.deadline);
                    return (
                      <tr key={task.id}>
                        <td>
                          <p style={{ fontWeight: '600', color: '#1e293b', fontSize: '13px' }}>{task.title}</p>
                          {task.description && <p style={{ color: '#94a3b8', fontSize: '12px', marginTop: '2px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.description}</p>}
                        </td>
                        <td><span className={`priority-${task.priorityLabel?.toLowerCase()}`}>{task.priorityLabel} ({task.priorityScore})</span></td>
                        <td><span className={`status-${task.status}`}>{task.status?.replace('_', ' ')}</span></td>
                        <td style={{ fontSize: '13px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {task.assignedTo && <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: getAvatarColor(task.assignedToName), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '10px', fontWeight: '700' }}>{task.assignedToName?.[0]}</div>}
                            <span>{task.assignedToName || 'Unassigned'}</span>
                            {!task.assignedTo && <button onClick={() => handleAutoAssign(task)} style={{ background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: '6px', padding: '2px 6px', cursor: 'pointer', fontSize: '10px', color: '#4f46e5', fontWeight: '600', fontFamily: 'Inter' }}>⚡ Assign</button>}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: daysLeft <= 3 ? '#dc2626' : daysLeft <= 7 ? '#d97706' : '#334155' }}>
                            <Calendar size={13} />
                            {daysLeft <= 0 ? 'Overdue' : `${daysLeft}d left`}
                          </div>
                        </td>
                        <td style={{ fontSize: '13px' }}>{task.effort}/10</td>
                        <td style={{ fontSize: '13px' }}>{task.impact}/10</td>
                        <td>
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                            <button onClick={() => startEditTask(task)} style={{ background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: '8px', padding: '6px', cursor: 'pointer' }}><Edit3 size={14} color="#4f46e5" /></button>
                            <button onClick={() => handleDeleteTask(task.id)} style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '6px', cursor: 'pointer' }}><Trash2 size={14} color="#dc2626" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {tasks.length === 0 && (
                <div style={{ padding: '48px', textAlign: 'center' }}>
                  <ListTodo size={48} color="#e2e8f0" style={{ margin: '0 auto 12px auto' }} />
                  <p style={{ color: '#94a3b8', fontSize: '14px' }}>No tasks yet. Click "Create Task" to add one.</p>
                </div>
              )}
              </div>
            </div>
          </div>
        )}

        {/* ======== EMPLOYEES ======== */}
        {activeTab === 'employees' && (
          <div className="animate-slideUp">
            {guidanceSuggestion && guidanceSuggestion.severity !== 'low' && (
              <div style={{ marginBottom: '24px', padding: '16px 20px', borderRadius: '12px', background: 'linear-gradient(135deg, #eef2ff, #f8fafc)', border: '1px solid #c7d2fe', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ background: '#4f46e5', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Target size={16} color="#fff" /></div>
                <div>
                  <p style={{ fontWeight: '800', color: '#312e81', fontSize: '14px', marginBottom: '2px' }}>AI Management Guidance</p>
                  <p style={{ color: '#4f46e5', fontSize: '13px' }}>We suggest focusing primarily on <strong>{guidanceSuggestion.name}</strong>. They {guidanceSuggestion.reason}</p>
                </div>
              </div>
            )}
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              {workloadData.map((emp, i) => {
                const status = getWorkloadStatus(emp);
                const isFlipped = flippedCards[emp.uid] || false;
                
                return (
                  <div key={i} className={`flip-card ${isFlipped ? 'flipped' : ''}`} style={{ minHeight: '220px', perspective: '1000px' }}>
                    <div className="flip-card-inner">
                      
                      {/* FRONT OF CARD */}
                      <div className="flip-card-front card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%', cursor: 'pointer', position: 'absolute', width: '100%', backfaceVisibility: 'hidden' }} onClick={() => toggleFlip(emp.uid)}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div className="avatar" style={{ background: getAvatarColor(emp.name) }}>{emp.name?.[0]?.toUpperCase()}</div>
                            <div>
                              <p style={{ fontWeight: '700', fontSize: '15px', color: '#0f172a' }}>{emp.name}</p>
                              <p style={{ fontSize: '12px', color: '#94a3b8' }}>{emp.email}</p>
                            </div>
                          </div>
                        </div>
                        <span className={status.cls} style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', display: 'inline-block', marginBottom: 'auto', alignSelf: 'flex-start' }}>{status.label}</span>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '16px' }}>
                          {[
                            { label: 'Pending', value: emp.pending, color: '#d97706' },
                            { label: 'In Progress', value: emp.inProgress, color: '#2563eb' },
                            { label: 'Done', value: emp.completed, color: '#16a34a' }
                          ].map((s, j) => (
                            <div key={j} style={{ textAlign: 'center', padding: '12px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                              <p style={{ fontSize: '22px', fontWeight: '800', color: s.color }}>{s.value}</p>
                              <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{s.label}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* BACK OF CARD */}
                      <div className="flip-card-back card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#0f172a', color: '#f8fafc', position: 'absolute', width: '100%', backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                          <p style={{ fontSize: '15px', fontWeight: '700', color: '#fff' }}>Detailed Stats</p>
                          <button onClick={(e) => { e.stopPropagation(); toggleFlip(emp.uid); }} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', color: '#fff', fontSize: '11px', fontWeight: '600' }}>Flip Back</button>
                        </div>
                        
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', justifyContent: 'center' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px' }}>
                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Total Effort Assigned</span>
                            <span style={{ fontSize: '14px', fontWeight: '700', color: '#38bdf8' }}>{emp.totalEffort}h</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px' }}>
                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Missed Deadlines</span>
                            <span style={{ fontSize: '14px', fontWeight: '700', color: emp.missed > 0 ? '#ef4444' : '#10b981' }}>{emp.missed} task(s)</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px' }}>
                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Total Handled</span>
                            <span style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>{emp.total} tasks</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px', marginTop: 'auto' }}>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>Admin Overrides</span>
                          <button onClick={(e) => { e.stopPropagation(); handleRemoveEmployee(emp.uid); }} style={{ background: '#7f1d1d', border: '1px solid #991b1b', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}><Trash2 size={12} /> Remove</button>
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })}
              {employees.length === 0 && (
                <div className="card-static" style={{ padding: '48px', textAlign: 'center', gridColumn: '1 / -1' }}>
                  <Users size={48} color="#e2e8f0" style={{ margin: '0 auto 12px auto' }} />
                  <p style={{ color: '#94a3b8', fontSize: '14px' }}>No team members yet.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && <div className="animate-slideUp"><AnalyticsDashboard tasks={tasks} employees={employees} /></div>}
        {activeTab === 'reports' && <div className="animate-slideUp"><ReportGenerator tasks={tasks} employees={employees} /></div>}
        {activeTab === 'chat' && <div style={{ height: 'calc(100vh - 120px)' }}><TeamChat isDashboard={true} /></div>}
      </main>

      {/* Task Modal */}
      {showTaskModal && (
        <div className="modal-overlay" onClick={() => setShowTaskModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a' }}>{editingTask ? 'Edit Task' : 'Create New Task'}</h2>
              <button onClick={() => setShowTaskModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer' }}><X size={18} color="#64748b" /></button>
            </div>
            <form onSubmit={handleTaskSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div><label style={{ fontSize: '13px', fontWeight: '500', color: '#64748b', marginBottom: '6px', display: 'block' }}>Title *</label><input className="form-input" value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} required placeholder="Task title..." /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div><label style={{ fontSize: '13px', fontWeight: '500', color: '#64748b', marginBottom: '6px', display: 'block' }}>Sprint / Goal</label><input className="form-input" value={taskForm.goal} onChange={e => setTaskForm(f => ({ ...f, goal: e.target.value }))} placeholder="e.g. Q3 Launch" /></div>
                <div><label style={{ fontSize: '13px', fontWeight: '500', color: '#64748b', marginBottom: '6px', display: 'block' }}>Deadline *</label><input className="form-input" type="date" value={taskForm.deadline} onChange={e => setTaskForm(f => ({ ...f, deadline: e.target.value }))} required /></div>
              </div>
              <div><label style={{ fontSize: '13px', fontWeight: '500', color: '#64748b', marginBottom: '6px', display: 'block' }}>Description</label><textarea className="form-textarea" value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the task..." /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                <div><label style={{ fontSize: '13px', fontWeight: '500', color: '#64748b', marginBottom: '6px', display: 'block' }}>Assign To</label><select className="form-select" value={taskForm.assignedTo} onChange={e => setTaskForm(f => ({ ...f, assignedTo: e.target.value }))}><option value="">Unassigned</option>{employees.map(e => <option key={e.uid} value={e.uid}>{e.name}</option>)}</select></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div><label style={{ fontSize: '13px', fontWeight: '500', color: '#64748b', marginBottom: '6px', display: 'block' }}>Effort (1-10): {taskForm.effort}</label><input type="range" min="1" max="10" value={taskForm.effort} onChange={e => setTaskForm(f => ({ ...f, effort: e.target.value }))} style={{ width: '100%', accentColor: '#4f46e5' }} /></div>
                <div><label style={{ fontSize: '13px', fontWeight: '500', color: '#64748b', marginBottom: '6px', display: 'block' }}>Impact (1-10): {taskForm.impact}</label><input type="range" min="1" max="10" value={taskForm.impact} onChange={e => setTaskForm(f => ({ ...f, impact: e.target.value }))} style={{ width: '100%', accentColor: '#10b981' }} /></div>
                <div><label style={{ fontSize: '13px', fontWeight: '500', color: '#64748b', marginBottom: '6px', display: 'block' }}>Est. Hours</label><input className="form-input" type="number" min="1" max="200" value={taskForm.estimatedHours} onChange={e => setTaskForm(f => ({ ...f, estimatedHours: e.target.value }))} /></div>
              </div>
              {taskForm.deadline && (
                <div style={{ padding: '10px 14px', borderRadius: '10px', background: '#eef2ff', border: '1px solid #c7d2fe' }}>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>AI Priority: </span>
                  {(() => { const s = calculatePriorityScore({ deadline: taskForm.deadline, effort: parseInt(taskForm.effort), impact: parseInt(taskForm.impact) }); const l = getPriorityLabel(s); return <span className={`priority-${l.toLowerCase()}`}>{l} ({s})</span>; })()}
                </div>
              )}
              {error && <div style={{ padding: '10px', borderRadius: '8px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '13px' }}>{error}</div>}
              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>{editingTask ? 'Update Task' : 'Create Task'}</button>
                <button type="button" className="btn-secondary" onClick={() => setShowTaskModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Employee Modal */}
      {showEmployeeModal && (
        <div className="modal-overlay" onClick={() => setShowEmployeeModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a' }}>Add Team Member</h2>
              <button onClick={() => setShowEmployeeModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer' }}><X size={18} color="#64748b" /></button>
            </div>
            <form onSubmit={handleAddEmployee} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div><label style={{ fontSize: '13px', fontWeight: '500', color: '#64748b', marginBottom: '6px', display: 'block' }}>Full Name *</label><input className="form-input" value={empForm.name} onChange={e => setEmpForm(f => ({ ...f, name: e.target.value }))} required placeholder="e.g. John Doe" /></div>
              <div><label style={{ fontSize: '13px', fontWeight: '500', color: '#64748b', marginBottom: '6px', display: 'block' }}>Email *</label><input className="form-input" type="email" value={empForm.email} onChange={e => setEmpForm(f => ({ ...f, email: e.target.value }))} required placeholder="john@company.com" /></div>
              <p style={{ fontSize: '12px', color: '#94a3b8' }}>Default password: <code style={{ color: '#4f46e5', background: '#eef2ff', padding: '2px 6px', borderRadius: '4px' }}>Priorix@123</code></p>
              {error && <div style={{ padding: '10px', borderRadius: '8px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '13px' }}>{error}</div>}
              <button type="submit" className="btn-primary" disabled={empLoading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                {empLoading ? <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} /> : <><Plus size={18} /> Add Member</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
