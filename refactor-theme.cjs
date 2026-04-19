const fs = require('fs');
const path = require('path');

const filesToRefactor = [
  'g:/Timerr/src/pages/LandingPage.jsx',
  'g:/Timerr/src/pages/AdminDashboard.jsx',
  'g:/Timerr/src/pages/EmployeeDashboard.jsx',
  'g:/Timerr/src/components/admin/AnalyticsDashboard.jsx',
  'g:/Timerr/src/components/admin/ReportGenerator.jsx',
  'g:/Timerr/src/components/TeamChat.jsx',
  'g:/Timerr/src/components/CommandPalette.jsx'
];

filesToRefactor.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping ${filePath}, not found.`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');

  // Perform surgical replacements of hardcoded light theme colors with our new CSS variables
  content = content.replace(/background:\s*['"]#ffffff['"]/ig, "background: 'var(--bg-card)'");
  content = content.replace(/background:\s*['"]#fff['"]/ig, "background: 'var(--bg-card)'");
  content = content.replace(/background:\s*['"]#f8fafc['"]/ig, "background: 'var(--bg-card-hover)'");
  content = content.replace(/background:\s*['"]#f1f5f9['"]/ig, "background: 'var(--bg-card-alt)'");
  content = content.replace(/background:\s*['"]#f0f2f5['"]/ig, "background: 'var(--bg-app)'");
  
  // Specific Footer / Sidebar dark backgrounds -> replace with bg-card-alt for dark mode support
  content = content.replace(/background:\s*['"]#0f172a['"]/ig, "background: 'var(--bg-card-alt)'");

  // Colors
  content = content.replace(/color:\s*['"]#1e293b['"]/ig, "color: 'var(--text-main)'");
  content = content.replace(/color:\s*['"]#0f172a['"]/ig, "color: 'var(--text-main)'");
  content = content.replace(/color:\s*['"]#64748b['"]/ig, "color: 'var(--text-muted)'");
  content = content.replace(/color:\s*['"]#94a3b8['"]/ig, "color: 'var(--text-muted)'");
  content = content.replace(/color:\s*['"]#475569['"]/ig, "color: 'var(--text-muted-darker)'");
  content = content.replace(/color:\s*['"]#f8fafc['"]/ig, "color: 'var(--text-main)'");

  // Borders
  content = content.replace(/border:\s*['"]1px solid #e5e7eb['"]/ig, "border: '1px solid var(--border-color)'");
  content = content.replace(/border:\s*['"]1px solid #e2e8f0['"]/ig, "border: '1px solid var(--border-color)'");
  content = content.replace(/borderBottom:\s*['"]1px solid #f1f5f9['"]/ig, "borderBottom: '1px solid var(--border-color)'");
  content = content.replace(/borderTop:\s*['"]1px solid #f1f5f9['"]/ig, "borderTop: '1px solid var(--border-color)'");
  content = content.replace(/borderRight:\s*['"]1px solid #e5e7eb['"]/ig, "borderRight: '1px solid var(--border-color)'");
  content = content.replace(/borderColor:\s*['"]#e2e8f0['"]/ig, "borderColor: 'var(--border-color)'");

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Refactored ${filePath}`);
});

console.log("Dark Mode mass-refactoring completed successfully.");
