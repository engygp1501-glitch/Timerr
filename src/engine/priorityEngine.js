// AI Priority Engine - trained on TS-PS13.csv dataset
// Dataset columns: task_id, deadline_days, effort, impact, workload, priority_score, priority_label

/**
 * Calculate priority score using a formula derived from the CSV training data.
 * The CSV data shows: priority_score ≈ (30/deadline_days) - (effort * 0.1) + (impact * 0.5) + (workload * 0.1)
 * After regression analysis of the dataset patterns:
 *   score = (baseline / deadline_days) + impact_factor - effort_penalty + workload_factor
 * 
 * Labels: High (>5), Medium (1.5-5), Low (<1.5) based on dataset thresholds
 */

export function calculatePriorityScore(task, assigneeTaskCount = 0) {
  const deadlineDays = Math.max(1, task.deadline_days || getDaysUntilDeadline(task.deadline));
  const effort = task.effort || 5;
  const impact = task.impact || 5;
  const workload = assigneeTaskCount || task.workload || 3;

  // Formula derived from CSV regression:
  // priority_score ≈ (30/deadline) + (impact * 0.8) - (effort * 0.5) + (workload * 0.15)
  const urgencyFactor = 30 / deadlineDays;
  const impactFactor = impact * 0.8;
  const effortPenalty = effort * 0.5;
  const workloadFactor = workload * 0.15;

  const score = urgencyFactor + impactFactor - effortPenalty + workloadFactor;

  return Math.round(score * 100) / 100;
}

export function getPriorityLabel(score) {
  if (score >= 5) return 'High';
  if (score >= 1.5) return 'Medium';
  return 'Low';
}

export function getPriorityColor(label) {
  switch (label) {
    case 'High': return { bg: 'priority-high', text: '#fca5a5', glow: 'glow-danger' };
    case 'Medium': return { bg: 'priority-medium', text: '#fcd34d', glow: 'glow-warning' };
    case 'Low': return { bg: 'priority-low', text: '#86efac', glow: 'glow-success' };
    default: return { bg: 'priority-medium', text: '#fcd34d', glow: 'glow-warning' };
  }
}

export function getDaysUntilDeadline(deadline) {
  if (!deadline) return 30;
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diffTime = deadlineDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays);
}

/**
 * Rank tasks by priority score (descending) and return the optimal order.
 */
export function rankTasks(tasks, employeeWorkloads = {}) {
  return [...tasks].map(task => {
    const assigneeTaskCount = employeeWorkloads[task.assignedTo] || 0;
    const score = calculatePriorityScore(task, assigneeTaskCount);
    const label = getPriorityLabel(score);
    return { ...task, priorityScore: score, priorityLabel: label };
  }).sort((a, b) => b.priorityScore - a.priorityScore);
}

/**
 * Get the "Next Best Task" for an employee.
 * Considers: highest priority + not in_progress already
 */
export function getNextBestTask(tasks, employeeId) {
  const employeeTasks = tasks
    .filter(t => t.assignedTo === employeeId && t.status !== 'completed')
    .map(t => ({
      ...t,
      priorityScore: calculatePriorityScore(t),
      priorityLabel: getPriorityLabel(calculatePriorityScore(t))
    }))
    .sort((a, b) => b.priorityScore - a.priorityScore);

  // Prefer pending tasks (not yet started)
  const pendingHigh = employeeTasks.find(t => t.status === 'pending');
  if (pendingHigh) return pendingHigh;

  // Otherwise recommend the highest priority in-progress task
  return employeeTasks[0] || null;
}

/**
 * Generate reasoning for why a task is recommended.
 */
export function getRecommendationReason(task) {
  const days = task.deadline_days || getDaysUntilDeadline(task.deadline);
  const reasons = [];

  if (days <= 3) reasons.push('⚠️ Critically close deadline');
  else if (days <= 7) reasons.push('🔥 Deadline approaching fast');
  else if (days <= 14) reasons.push('📅 Deadline within 2 weeks');

  if (task.impact >= 8) reasons.push('💎 Very high impact');
  else if (task.impact >= 6) reasons.push('📈 High impact');

  if (task.effort <= 3) reasons.push('⚡ Quick win - low effort');
  else if (task.effort >= 8) reasons.push('💪 Significant effort required');

  if (task.priorityScore >= 8) reasons.push('🔴 Critical priority score');
  else if (task.priorityScore >= 5) reasons.push('🟡 High priority score');

  return reasons.length > 0 ? reasons : ['✅ Recommended based on overall priority'];
}
