/**
 * Seed data derived from TS-PS13.csv
 * Contains 50 representative tasks with realistic titles and descriptions,
 * mapped from CSV columns: task_id, deadline_days, effort, impact, workload, priority_score, priority_label
 */

const taskTitles = [
  { title: "Fix Critical Login Bug", description: "Users unable to login via SSO. Causing 30% drop in daily active users." },
  { title: "Design Landing Page Redesign", description: "Create modern landing page with improved conversion funnel and A/B test variants." },
  { title: "Optimize Database Queries", description: "Slow query on dashboard is taking 8s+. Needs indexing and query restructuring." },
  { title: "Implement Payment Gateway", description: "Integrate Stripe payment processing for subscription plans." },
  { title: "Setup CI/CD Pipeline", description: "Configure GitHub Actions for automated testing and deployment." },
  { title: "Write API Documentation", description: "Document all REST API endpoints with request/response examples using Swagger." },
  { title: "Mobile Responsive Fix", description: "Navigation menu breaking on tablets and small screens." },
  { title: "Implement User Analytics", description: "Add Mixpanel tracking for key user events and create analytics dashboard." },
  { title: "Security Audit Fixes", description: "Address vulnerabilities found in penetration testing report." },
  { title: "Refactor Authentication Module", description: "Move from JWT to session-based auth with refresh tokens." },
  { title: "Build Notification Service", description: "Real-time notifications via WebSocket for task updates and mentions." },
  { title: "Create Onboarding Flow", description: "Interactive walkthrough for new users with progress tracking." },
  { title: "Database Migration Script", description: "Migrate legacy MySQL data to PostgreSQL with zero downtime." },
  { title: "Implement Search Feature", description: "Full-text search with filters, facets, and autocomplete using Elasticsearch." },
  { title: "Performance Load Testing", description: "Run JMeter tests simulating 10,000 concurrent users." },
  { title: "Fix Email Template Rendering", description: "HTML emails breaking in Outlook and older Gmail versions." },
  { title: "Setup Monitoring Alerts", description: "Configure Datadog alerts for server errors, latency spikes, and memory leaks." },
  { title: "Implement Role Permissions", description: "Granular role-based access control with permission matrices." },
  { title: "Build Export Feature", description: "Allow users to export reports as PDF and CSV with custom date ranges." },
  { title: "Design System Components", description: "Create reusable Button, Modal, Toast, and Form components library." },
  { title: "API Rate Limiting", description: "Implement rate limiting middleware to prevent API abuse." },
  { title: "Fix Memory Leak in Worker", description: "Background job worker consuming 4GB+ RAM after 24 hours." },
  { title: "Implement Data Caching", description: "Add Redis caching layer for frequently accessed API endpoints." },
  { title: "Create Admin Reports Page", description: "Weekly/monthly reports with charts for KPIs, revenue, and user growth." },
  { title: "Upgrade Node.js Version", description: "Migrate from Node 16 to Node 20 LTS. Update deprecated packages." },
  { title: "Build File Upload Service", description: "Drag-and-drop file uploads with progress bar, S3 storage, and virus scanning." },
  { title: "Implement Two-Factor Auth", description: "Add TOTP-based 2FA with QR code setup and backup codes." },
  { title: "Fix Timezone Bug", description: "Calendar events showing wrong times for users in non-UTC timezones." },
  { title: "Implement Webhooks", description: "Allow customers to register webhooks for real-time event notifications." },
  { title: "Accessibility Audit (WCAG)", description: "Fix ARIA labels, keyboard navigation, and screen reader compatibility." },
  { title: "Build Chat Feature", description: "Real-time team chat with channels, DMs, file sharing, and emoji reactions." },
  { title: "Optimize Image Pipeline", description: "Implement lazy loading, WebP conversion, and CDN caching for all images." },
  { title: "Create User Feedback Widget", description: "In-app feedback form with screenshot capture and sentiment analysis." },
  { title: "Fix Data Sync Issues", description: "Offline-to-online sync causing duplicate records in collaboration mode." },
  { title: "Implement SSO Integration", description: "Add SAML 2.0 SSO for enterprise customers using Okta and Azure AD." },
  { title: "Build Kanban Board View", description: "Drag-and-drop Kanban board with customizable columns and WIP limits." },
  { title: "Setup Log Aggregation", description: "Centralize logs from all services using ELK stack with retention policies." },
  { title: "Implement Audit Trail", description: "Track all data changes with who, what, when for compliance requirements." },
  { title: "Fix CSV Import Errors", description: "Large CSV files (>50MB) timing out. Need chunked processing." },
  { title: "Build Team Dashboard", description: "Real-time team velocity, sprint burndown, and individual contributor stats." },
  { title: "Implement Dark Mode", description: "Full dark mode support with system preference detection and manual toggle." },
  { title: "Database Backup Automation", description: "Automated daily backups to S3 with point-in-time recovery capability." },
  { title: "Fix Cross-Browser Issues", description: "Safari and Firefox rendering bugs in the data visualization charts." },
  { title: "Build Workflow Automation", description: "Create if-then automation rules for task assignments and status changes." },
  { title: "Implement GraphQL API", description: "Add GraphQL endpoint alongside REST for flexible client-side data fetching." },
  { title: "Create Integration Tests", description: "End-to-end tests for critical user flows using Cypress." },
  { title: "Optimize Bundle Size", description: "Reduce JS bundle from 2.4MB to under 500KB with code splitting and tree shaking." },
  { title: "Build Client Portal", description: "Customer-facing dashboard for project status, invoices, and communication." },
  { title: "Implement Data Encryption", description: "Encrypt PII data at rest using AES-256 and in transit using TLS 1.3." },
  { title: "Fix Pagination Performance", description: "Cursor-based pagination for tables with 1M+ rows instead of offset-based." }
];

// 50 tasks sampled from TS-PS13.csv representing diverse priority distributions
const csvData = [
  { task_id: 2, deadline_days: 17, effort: 1, impact: 9, workload: 6, priority_score: 6.06, priority_label: "High" },
  { task_id: 5, deadline_days: 6, effort: 8, impact: 5, workload: 6, priority_score: 5.9, priority_label: "High" },
  { task_id: 6, deadline_days: 9, effort: 2, impact: 7, workload: 2, priority_score: 6.43, priority_label: "High" },
  { task_id: 8, deadline_days: 7, effort: 6, impact: 9, workload: 4, priority_score: 7.59, priority_label: "High" },
  { task_id: 3, deadline_days: 21, effort: 4, impact: 8, workload: 6, priority_score: 4.63, priority_label: "Medium" },
  { task_id: 9, deadline_days: 21, effort: 6, impact: 6, workload: 3, priority_score: 3.23, priority_label: "Medium" },
  { task_id: 7, deadline_days: 20, effort: 7, impact: 4, workload: 1, priority_score: 2.1, priority_label: "Medium" },
  { task_id: 14, deadline_days: 12, effort: 7, impact: 9, workload: 9, priority_score: 5.6, priority_label: "High" },
  { task_id: 17, deadline_days: 3, effort: 2, impact: 3, workload: 2, priority_score: 11.1, priority_label: "High" },
  { task_id: 19, deadline_days: 5, effort: 10, impact: 5, workload: 2, priority_score: 6.5, priority_label: "High" },
  { task_id: 4, deadline_days: 28, effort: 9, impact: 2, workload: 4, priority_score: 0.27, priority_label: "Low" },
  { task_id: 20, deadline_days: 28, effort: 19, impact: 3, workload: 2, priority_score: -1.23, priority_label: "Low" },
  { task_id: 31, deadline_days: 15, effort: 10, impact: 1, workload: 3, priority_score: 0.5, priority_label: "Low" },
  { task_id: 62, deadline_days: 10, effort: 3, impact: 6, workload: 2, priority_score: 5.4, priority_label: "High" },
  { task_id: 63, deadline_days: 5, effort: 4, impact: 4, workload: 1, priority_score: 7.2, priority_label: "High" },
  { task_id: 80, deadline_days: 9, effort: 3, impact: 9, workload: 2, priority_score: 7.23, priority_label: "High" },
  { task_id: 88, deadline_days: 3, effort: 9, impact: 7, workload: 8, priority_score: 11.7, priority_label: "High" },
  { task_id: 91, deadline_days: 6, effort: 4, impact: 8, workload: 6, priority_score: 8.2, priority_label: "High" },
  { task_id: 95, deadline_days: 3, effort: 7, impact: 9, workload: 1, priority_score: 13.1, priority_label: "High" },
  { task_id: 102, deadline_days: 3, effort: 7, impact: 4, workload: 6, priority_score: 10.6, priority_label: "High" },
  { task_id: 10, deadline_days: 18, effort: 2, impact: 3, workload: 4, priority_score: 2.77, priority_label: "Medium" },
  { task_id: 11, deadline_days: 12, effort: 3, impact: 2, workload: 4, priority_score: 2.9, priority_label: "Medium" },
  { task_id: 12, deadline_days: 11, effort: 7, impact: 7, workload: 7, priority_score: 4.83, priority_label: "Medium" },
  { task_id: 16, deadline_days: 14, effort: 7, impact: 6, workload: 7, priority_score: 3.74, priority_label: "Medium" },
  { task_id: 18, deadline_days: 19, effort: 9, impact: 9, workload: 5, priority_score: 4.28, priority_label: "Medium" },
  { task_id: 40, deadline_days: 15, effort: 4, impact: 4, workload: 1, priority_score: 3.2, priority_label: "Medium" },
  { task_id: 41, deadline_days: 12, effort: 5, impact: 5, workload: 7, priority_score: 4.0, priority_label: "Medium" },
  { task_id: 47, deadline_days: 18, effort: 10, impact: 9, workload: 2, priority_score: 4.17, priority_label: "Medium" },
  { task_id: 48, deadline_days: 20, effort: 7, impact: 8, workload: 2, priority_score: 4.1, priority_label: "Medium" },
  { task_id: 59, deadline_days: 17, effort: 7, impact: 5, workload: 4, priority_score: 2.86, priority_label: "Medium" },
  { task_id: 49, deadline_days: 27, effort: 1, impact: 2, workload: 5, priority_score: 1.91, priority_label: "Low" },
  { task_id: 50, deadline_days: 22, effort: 7, impact: 1, workload: 7, priority_score: 0.46, priority_label: "Low" },
  { task_id: 51, deadline_days: 24, effort: 5, impact: 3, workload: 6, priority_score: 1.75, priority_label: "Low" },
  { task_id: 55, deadline_days: 29, effort: 4, impact: 3, workload: 7, priority_score: 1.73, priority_label: "Low" },
  { task_id: 58, deadline_days: 22, effort: 8, impact: 4, workload: 2, priority_score: 1.76, priority_label: "Low" },
  { task_id: 60, deadline_days: 19, effort: 15, impact: 1, workload: 2, priority_score: -0.92, priority_label: "Low" },
  { task_id: 61, deadline_days: 28, effort: 19, impact: 5, workload: 9, priority_score: -0.23, priority_label: "Low" },
  { task_id: 66, deadline_days: 29, effort: 13, impact: 3, workload: 7, priority_score: -0.07, priority_label: "Low" },
  { task_id: 67, deadline_days: 18, effort: 18, impact: 3, workload: 4, priority_score: -0.43, priority_label: "Low" },
  { task_id: 72, deadline_days: 28, effort: 9, impact: 4, workload: 3, priority_score: 1.27, priority_label: "Low" },
  { task_id: 197, deadline_days: 2, effort: 9, impact: 7, workload: 5, priority_score: 16.7, priority_label: "High" },
  { task_id: 200, deadline_days: 4, effort: 12, impact: 7, workload: 1, priority_score: 8.6, priority_label: "High" },
  { task_id: 302, deadline_days: 2, effort: 2, impact: 8, workload: 5, priority_score: 18.6, priority_label: "High" },
  { task_id: 311, deadline_days: 3, effort: 12, impact: 9, workload: 2, priority_score: 12.1, priority_label: "High" },
  { task_id: 356, deadline_days: 20, effort: 4, impact: 9, workload: 6, priority_score: 5.2, priority_label: "High" },
  { task_id: 360, deadline_days: 4, effort: 6, impact: 9, workload: 7, priority_score: 10.8, priority_label: "High" },
  { task_id: 436, deadline_days: 10, effort: 7, impact: 9, workload: 9, priority_score: 6.1, priority_label: "High" },
  { task_id: 487, deadline_days: 9, effort: 9, impact: 9, workload: 8, priority_score: 6.03, priority_label: "High" },
  { task_id: 518, deadline_days: 3, effort: 4, impact: 8, workload: 6, priority_score: 13.2, priority_label: "High" },
  { task_id: 752, deadline_days: 3, effort: 7, impact: 8, workload: 3, priority_score: 12.6, priority_label: "High" }
];

// Sample employee names for seeding
const sampleEmployees = [
  { name: "Arjun Sharma", email: "arjun@priorix.com" },
  { name: "Priya Patel", email: "priya@priorix.com" },
  { name: "Rahul Verma", email: "rahul@priorix.com" },
  { name: "Sneha Gupta", email: "sneha@priorix.com" },
  { name: "Vikram Singh", email: "vikram@priorix.com" }
];

/**
 * Generate seed tasks from CSV data merged with realistic titles
 */
export function generateSeedTasks(employeeUids = []) {
  const statuses = ['pending', 'in_progress', 'completed'];
  const now = Date.now();

  return csvData.map((row, index) => {
    const titleData = taskTitles[index % taskTitles.length];
    const deadlineDate = new Date(now + row.deadline_days * 24 * 60 * 60 * 1000);
    const assignedIndex = index % Math.max(1, employeeUids.length);
    
    // Distribute statuses: more pending/in_progress for high priority, more completed for low
    let status;
    if (row.priority_label === 'High') {
      status = Math.random() > 0.3 ? 'pending' : 'in_progress';
    } else if (row.priority_label === 'Medium') {
      const r = Math.random();
      status = r > 0.6 ? 'pending' : r > 0.3 ? 'in_progress' : 'completed';
    } else {
      status = Math.random() > 0.5 ? 'completed' : 'pending';
    }

    return {
      title: titleData.title,
      description: titleData.description,
      deadline: deadlineDate.toISOString().split('T')[0],
      deadline_days: row.deadline_days,
      effort: row.effort,
      impact: row.impact,
      workload: row.workload,
      priorityScore: row.priority_score,
      priorityLabel: row.priority_label,
      status: status,
      assignedTo: employeeUids.length > 0 ? employeeUids[assignedIndex] : '',
      assignedToName: employeeUids.length > 0 ? '' : 'Unassigned', // will be filled during seed
      estimatedHours: row.effort * 2,
      createdBy: 'system',
      createdAt: now - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000), // random past week
      updatedAt: now,
      completedAt: status === 'completed' ? now - Math.floor(Math.random() * 3 * 24 * 60 * 60 * 1000) : null
    };
  });
}

export { sampleEmployees, csvData };
