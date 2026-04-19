import { useState, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import Papa from 'papaparse';
import { getDaysUntilDeadline } from '../../engine/priorityEngine';
import { FileText, FileSpreadsheet, File, PieChart } from 'lucide-react';

export default function ReportGenerator({ tasks, employees }) {
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [reportType, setReportType] = useState('all');

  const filteredTasks = useMemo(() => {
    let f = [...tasks];
    if (dateRange.start) f = f.filter(t => t.deadline >= dateRange.start);
    if (dateRange.end) f = f.filter(t => t.deadline <= dateRange.end);
    if (reportType === 'completed') f = f.filter(t => t.status === 'completed');
    else if (reportType === 'active') f = f.filter(t => t.status !== 'completed');
    else if (reportType === 'overdue') f = f.filter(t => t.status !== 'completed' && getDaysUntilDeadline(t.deadline) <= 0);
    return f;
  }, [tasks, dateRange, reportType]);

  const stats = useMemo(() => {
    const total = filteredTasks.length;
    const completed = filteredTasks.filter(t => t.status === 'completed').length;
    const pending = filteredTasks.filter(t => t.status === 'pending').length;
    const inProgress = filteredTasks.filter(t => t.status === 'in_progress').length;
    const overdue = filteredTasks.filter(t => t.status !== 'completed' && getDaysUntilDeadline(t.deadline) <= 0).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, pending, inProgress, overdue, completionRate };
  }, [filteredTasks]);

  function exportCSV() {
    const data = filteredTasks.map(t => ({
      Title: t.title, Description: t.description || '', Status: t.status, Priority: t.priorityLabel,
      Score: t.priorityScore, Effort: t.effort, Impact: t.impact, Deadline: t.deadline,
      'Days Left': getDaysUntilDeadline(t.deadline), 'Assigned To': t.assignedToName || 'Unassigned'
    }));
    const blob = new Blob([Papa.unparse(data)], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `priorix-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }

  function exportPDF() {
    const doc = new jsPDF();
    doc.setFontSize(20); doc.setTextColor(79, 70, 229);
    doc.text('Priorix Task Report', 14, 20);
    doc.setFontSize(10); doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleDateString()} | ${filteredTasks.length} tasks`, 14, 28);
    doc.setFontSize(12); doc.setTextColor(40); doc.text('Summary', 14, 40);
    doc.setFontSize(10); doc.setTextColor(80);
    [`Total: ${stats.total}`, `Completed: ${stats.completed} (${stats.completionRate}%)`, `Overdue: ${stats.overdue}`].forEach((l, i) => doc.text(l, 14, 48 + i * 6));
    doc.autoTable({
      head: [['Title', 'Priority', 'Score', 'Status', 'Assigned', 'Deadline', 'Effort', 'Impact']],
      body: filteredTasks.map(t => [t.title?.substring(0, 30), t.priorityLabel, String(t.priorityScore), t.status?.replace('_', ' '), t.assignedToName || '-', t.deadline || '-', String(t.effort || 0), String(t.impact || 0)]),
      startY: 68,
      styles: { fontSize: 8, cellPadding: 3, textColor: [30, 30, 30], lineColor: [230, 230, 230], lineWidth: 0.1 },
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] }
    });
    doc.save(`priorix-report-${new Date().toISOString().split('T')[0]}.pdf`);
  }

  return (
    <div>
      {/* Controls */}
      <div className="card-static" style={{ padding: '24px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <FileText size={18} color="#4f46e5" />
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>Report Settings</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto auto', gap: '12px', alignItems: 'flex-end' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '500', color: '#64748b', marginBottom: '6px', display: 'block' }}>Start Date</label>
            <input className="form-input" type="date" value={dateRange.start} onChange={e => setDateRange(r => ({ ...r, start: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '500', color: '#64748b', marginBottom: '6px', display: 'block' }}>End Date</label>
            <input className="form-input" type="date" value={dateRange.end} onChange={e => setDateRange(r => ({ ...r, end: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '500', color: '#64748b', marginBottom: '6px', display: 'block' }}>Filter</label>
            <select className="form-select" value={reportType} onChange={e => setReportType(e.target.value)}>
              <option value="all">All Tasks</option>
              <option value="active">Active Only</option>
              <option value="completed">Completed Only</option>
              <option value="overdue">Overdue Only</option>
            </select>
          </div>
          <button onClick={exportCSV} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
            <FileSpreadsheet size={16} /> Export CSV
          </button>
          <button onClick={exportPDF} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
            <File size={16} /> Export PDF
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '16px' }}>
        {[
          { label: 'Total', value: stats.total, color: '#4f46e5' },
          { label: 'Completion Rate', value: `${stats.completionRate}%`, color: '#10b981' },
          { label: 'Overdue', value: stats.overdue, color: '#ef4444' },
          { label: 'In Progress', value: stats.inProgress, color: '#3b82f6' }
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: '20px', textAlign: 'center' }}>
            <p style={{ fontSize: '28px', fontWeight: '800', color: s.color }}>{s.value}</p>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Preview Table */}
      <div className="card-static" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>Report Preview ({filteredTasks.length} tasks)</h3>
        </div>
        <table className="data-table">
          <thead>
            <tr><th>Title</th><th>Priority</th><th>Status</th><th>Assigned</th><th>Deadline</th><th>Effort</th><th>Impact</th></tr>
          </thead>
          <tbody>
            {filteredTasks.slice(0, 20).map((t, i) => (
              <tr key={i}>
                <td style={{ fontWeight: '500', color: '#1e293b', fontSize: '13px' }}>{t.title}</td>
                <td><span className={`priority-${t.priorityLabel?.toLowerCase()}`}>{t.priorityLabel}</span></td>
                <td><span className={`status-${t.status}`}>{t.status?.replace('_', ' ')}</span></td>
                <td style={{ fontSize: '13px', color: '#64748b' }}>{t.assignedToName || 'Unassigned'}</td>
                <td style={{ fontSize: '13px', color: '#64748b' }}>{t.deadline || 'N/A'}</td>
                <td style={{ fontSize: '13px' }}>{t.effort}</td>
                <td style={{ fontSize: '13px' }}>{t.impact}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredTasks.length === 0 && (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <p style={{ color: '#94a3b8', fontSize: '14px' }}>No tasks match your filter.</p>
          </div>
        )}
        {filteredTasks.length > 20 && (
          <div style={{ padding: '12px', textAlign: 'center', borderTop: '1px solid #f1f5f9' }}>
            <p style={{ fontSize: '12px', color: '#94a3b8' }}>Showing 20 of {filteredTasks.length}. Export for full data.</p>
          </div>
        )}
      </div>
    </div>
  );
}
