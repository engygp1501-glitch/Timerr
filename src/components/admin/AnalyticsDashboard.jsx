import { useMemo } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler } from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import { getDaysUntilDeadline } from '../../engine/priorityEngine';
import { getWorkloadDistribution } from '../../engine/assignmentEngine';
import { TrendingUp, PieChart, BarChart3, Activity, Target } from 'lucide-react';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler);

const chartOpts = {
  responsive: true, maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: 'var(--text-muted)', font: { family: 'Inter', size: 12 }, padding: 16, usePointStyle: true, pointStyle: 'circle' } },
    tooltip: { backgroundColor: '#fff', titleColor: '#0f172a', bodyColor: '#475569', borderColor: '#e5e7eb', borderWidth: 1, padding: 12, cornerRadius: 8, titleFont: { family: 'Inter', weight: '600' }, bodyFont: { family: 'Inter' }, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }
  }
};

export default function AnalyticsDashboard({ tasks, employees }) {
  const statusData = useMemo(() => ({
    labels: ['Pending', 'In Progress', 'Completed'],
    datasets: [{ data: [tasks.filter(t => t.status === 'pending').length, tasks.filter(t => t.status === 'in_progress').length, tasks.filter(t => t.status === 'completed').length], backgroundColor: ['#fbbf24', '#3b82f6', '#22c55e'], borderColor: ['#fff','#fff','#fff'], borderWidth: 3, hoverOffset: 6 }]
  }), [tasks]);

  const priorityData = useMemo(() => ({
    labels: ['High', 'Medium', 'Low'],
    datasets: [{ data: [tasks.filter(t => t.priorityLabel === 'High').length, tasks.filter(t => t.priorityLabel === 'Medium').length, tasks.filter(t => t.priorityLabel === 'Low').length], backgroundColor: ['#ef4444', '#f59e0b', '#22c55e'], borderColor: ['#fff','#fff','#fff'], borderWidth: 3, hoverOffset: 6 }]
  }), [tasks]);

  const workloadChart = useMemo(() => {
    const wl = getWorkloadDistribution(employees, tasks);
    return {
      labels: wl.map(e => e.name || 'Unknown'),
      datasets: [
        { label: 'Pending', data: wl.map(e => e.pending), backgroundColor: '#fbbf24', borderRadius: 6, borderSkipped: false },
        { label: 'In Progress', data: wl.map(e => e.inProgress), backgroundColor: '#3b82f6', borderRadius: 6, borderSkipped: false },
        { label: 'Completed', data: wl.map(e => e.completed), backgroundColor: '#22c55e', borderRadius: 6, borderSkipped: false }
      ]
    };
  }, [tasks, employees]);

  const deadlineData = useMemo(() => {
    const b = { 'Overdue': 0, '1d': 0, '2-3d': 0, '4-7d': 0, '1-2w': 0, '2w+': 0 };
    tasks.filter(t => t.status !== 'completed').forEach(t => {
      const d = getDaysUntilDeadline(t.deadline);
      if (d <= 0) b['Overdue']++; else if (d <= 1) b['1d']++; else if (d <= 3) b['2-3d']++; else if (d <= 7) b['4-7d']++; else if (d <= 14) b['1-2w']++; else b['2w+']++;
    });
    return { labels: Object.keys(b), datasets: [{ label: 'Tasks', data: Object.values(b), borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.08)', fill: true, tension: 0.4, pointBackgroundColor: '#6366f1', pointBorderColor: '#fff', pointRadius: 5, pointHoverRadius: 7, pointBorderWidth: 2 }] };
  }, [tasks]);

  const prodData = useMemo(() => {
    const days = [], counts = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate()-i);
      days.push(d.toLocaleDateString('en-US',{weekday:'short'}));
      const start = new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime();
      counts.push(tasks.filter(t=>t.status==='completed'&&t.completedAt>=start&&t.completedAt<start+864e5).length);
    }
    return { labels: days, datasets: [{ label: 'Completed', data: counts, borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.08)', fill: true, tension: 0.4, pointBackgroundColor: '#10b981', pointBorderColor: '#fff', pointRadius: 5, pointHoverRadius: 7, pointBorderWidth: 2 }] };
  }, [tasks]);

  const goalData = useMemo(() => {
    const goalsList = [...new Set(tasks.map(t => t.goal).filter(Boolean))];
    if (goalsList.length === 0) return null;
    return {
      labels: goalsList,
      datasets: [
        { label: 'Pending', data: goalsList.map(g => tasks.filter(t => t.goal === g && t.status === 'pending').length), backgroundColor: '#fbbf24', borderRadius: 4 },
        { label: 'In Progress', data: goalsList.map(g => tasks.filter(t => t.goal === g && t.status === 'in_progress').length), backgroundColor: '#3b82f6', borderRadius: 4 },
        { label: 'Completed', data: goalsList.map(g => tasks.filter(t => t.goal === g && t.status === 'completed').length), backgroundColor: '#22c55e', borderRadius: 4 }
      ]
    };
  }, [tasks]);

  const axisOpts = (stacked=false) => ({
    ...chartOpts,
    scales: {
      x: { stacked, grid: { color: '#f1f5f9' }, ticks: { color: 'var(--text-muted)', font: { family:'Inter', size: 12 } } },
      y: { stacked, grid: { color: '#f1f5f9' }, ticks: { color: 'var(--text-muted)', font: { family:'Inter', size: 12 }, stepSize: 1 } }
    }
  });

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        {[
          { title: 'Status Distribution', icon: PieChart, chart: <Doughnut data={statusData} options={{...chartOpts, cutout: '68%'}} /> },
          { title: 'Priority Distribution', icon: PieChart, chart: <Doughnut data={priorityData} options={{...chartOpts, cutout: '68%'}} /> }
        ].map((c,i) => (
          <div key={i} className="card-static" style={{ padding: '24px' }}>
            <div style={{ display:'flex',alignItems:'center',gap:'8px',marginBottom:'16px' }}><c.icon size={18} color="#4f46e5" /><h3 style={{fontSize:'15px',fontWeight:'700',color: 'var(--text-main)'}}>{c.title}</h3></div>
            <div style={{ height: '260px', display:'flex',alignItems:'center',justifyContent:'center' }}>{tasks.length > 0 ? c.chart : <p style={{color: 'var(--text-muted)'}}>No data</p>}</div>
          </div>
        ))}
      </div>
      <div className="card-static" style={{ padding: '24px', marginBottom: '16px' }}>
        <div style={{ display:'flex',alignItems:'center',gap:'8px',marginBottom:'16px' }}><BarChart3 size={18} color="#4f46e5" /><h3 style={{fontSize:'15px',fontWeight:'700',color: 'var(--text-main)'}}>Workload per Employee</h3></div>
        <div style={{ height: '300px' }}>{employees.length > 0 ? <Bar data={workloadChart} options={axisOpts(true)} /> : <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%'}}><p style={{color: 'var(--text-muted)'}}>Add employees first</p></div>}</div>
      </div>
      {goalData && (
        <div className="card-static" style={{ padding: '24px', marginBottom: '16px' }}>
          <div style={{ display:'flex',alignItems:'center',gap:'8px',marginBottom:'16px' }}><Target size={18} color="#4f46e5" /><h3 style={{fontSize:'15px',fontWeight:'700',color: 'var(--text-main)'}}>Sprint / Goal Progress</h3></div>
          <div style={{ height: '300px' }}><Bar data={goalData} options={{...axisOpts(true), indexAxis: 'y'}} /></div>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {[
          { title: 'Deadline Proximity', icon: Activity, chart: <Line data={deadlineData} options={axisOpts()} /> },
          { title: 'Productivity (7 Days)', icon: TrendingUp, chart: <Line data={prodData} options={axisOpts()} /> }
        ].map((c,i) => (
          <div key={i} className="card-static" style={{ padding: '24px' }}>
            <div style={{ display:'flex',alignItems:'center',gap:'8px',marginBottom:'16px' }}><c.icon size={18} color="#4f46e5" /><h3 style={{fontSize:'15px',fontWeight:'700',color: 'var(--text-main)'}}>{c.title}</h3></div>
            <div style={{ height: '260px' }}>{c.chart}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
