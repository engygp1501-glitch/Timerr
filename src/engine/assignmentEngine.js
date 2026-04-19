/**
 * Smart Assignment Engine
 * - Recommends best employee for each task
 * - Detects overload and suggests rebalancing
 * - Predicts completion time from history
 */
import { getDaysUntilDeadline } from './priorityEngine';

const MAX_TASKS_PER_EMPLOYEE = 6;
const MAX_HOURS_PER_EMPLOYEE = 40;

/**
 * Calculate employee availability score (0-1)
 * Lower active tasks = higher availability
 */
export function getEmployeeAvailability(employeeId, tasks) {
  const activeTasks = tasks.filter(
    t => t.assignedTo === employeeId && t.status !== 'completed'
  );
  const taskCount = activeTasks.length;
  const totalEffort = activeTasks.reduce((sum, t) => sum + (t.effort || 5), 0);

  return {
    taskCount,
    totalEffort,
    availabilityScore: Math.max(0, 1 - (taskCount / MAX_TASKS_PER_EMPLOYEE)),
    isOverloaded: taskCount >= MAX_TASKS_PER_EMPLOYEE || totalEffort >= MAX_HOURS_PER_EMPLOYEE
  };
}

/**
 * Find the best employee to assign a task to.
 */
export function recommendAssignment(task, employees, allTasks, history = []) {
  const scores = employees.map(emp => {
    const availability = getEmployeeAvailability(emp.uid, allTasks);
    const pastPerformance = getEmployeePerformance(emp.uid, history);

    const score =
      availability.availabilityScore * 0.5 +
      pastPerformance * 0.3 +
      (availability.isOverloaded ? -0.5 : 0.2);

    return {
      employee: emp,
      score,
      availability,
      reason: availability.isOverloaded
        ? '⚠️ Currently overloaded'
        : score > 0.6
          ? '✅ Best available'
          : '📊 Available but busy'
    };
  });

  return scores.sort((a, b) => b.score - a.score);
}

/**
 * Get employee performance score from history (0-1).
 */
function getEmployeePerformance(employeeId, history) {
  const empHistory = history.filter(h => h.userId === employeeId);
  if (empHistory.length === 0) return 0.5; // neutral default

  const onTimeCount = empHistory.filter(h => {
    return h.actualHours <= h.estimatedHours * 1.2; // 20% buffer
  }).length;

  return onTimeCount / empHistory.length;
}

/**
 * Detect overloaded employees and suggest rebalancing.
 */
export function detectOverloadAndRebalance(employees, tasks) {
  const overloaded = [];
  const underloaded = [];
  const suggestions = [];

  employees.forEach(emp => {
    const avail = getEmployeeAvailability(emp.uid, tasks);
    if (avail.isOverloaded) {
      overloaded.push({ ...emp, ...avail });
    } else if (avail.taskCount <= 2) {
      underloaded.push({ ...emp, ...avail });
    }
  });

  // For each overloaded emp, suggest moving lowest-priority tasks to underloaded
  overloaded.forEach(overEmp => {
    const empTasks = tasks
      .filter(t => t.assignedTo === overEmp.uid && t.status === 'pending')
      .sort((a, b) => (a.priorityScore || 0) - (b.priorityScore || 0));

    const tasksToMove = empTasks.slice(0, Math.min(2, empTasks.length));

    tasksToMove.forEach((task, idx) => {
      const target = underloaded[idx % underloaded.length];
      if (target) {
        suggestions.push({
          task,
          from: overEmp,
          to: target,
          reason: `${overEmp.name} is overloaded (${overEmp.taskCount} tasks). Move "${task.title}" to ${target.name} (${target.taskCount} tasks).`
        });
      }
    });
  });

  return { overloaded, underloaded, suggestions };
}

/**
 * Predict completion time based on effort and history.
 */
export function predictCompletionTime(task, history = []) {
  const effort = task.effort || 5;

  // Look for historical data with similar effort
  const similar = history.filter(h =>
    Math.abs(h.effort - effort) <= 2
  );

  if (similar.length >= 3) {
    // Use moving average of actual completion times
    const avgHours = similar.reduce((sum, h) => sum + h.actualHours, 0) / similar.length;
    return Math.round(avgHours * 10) / 10;
  }

  // Fallback: effort * 2 hours
  return effort * 2;
}

/**
 * Get workload distribution across all employees.
 */
export function getWorkloadDistribution(employees, tasks) {
  return employees.map(emp => {
    const empTasks = tasks.filter(t => t.assignedTo === emp.uid);
    const pending = empTasks.filter(t => t.status === 'pending').length;
    const inProgress = empTasks.filter(t => t.status === 'in_progress').length;
    const completed = empTasks.filter(t => t.status === 'completed').length;
    const missed = empTasks.filter(t => t.status !== 'completed' && getDaysUntilDeadline(t.deadline) < 0).length;
    const totalEffort = empTasks
      .filter(t => t.status !== 'completed')
      .reduce((sum, t) => sum + (t.effort || 5), 0);

    return {
      ...emp,
      pending,
      inProgress,
      completed,
      missed,
      total: empTasks.length,
      totalEffort,
      isOverloaded: (pending + inProgress) >= MAX_TASKS_PER_EMPLOYEE
    };
  });
}

/**
 * Get AI guidance suggestion on which employee needs the most help in the team.
 */
export function getGuidanceSuggestion(employees, tasks) {
  const workload = getWorkloadDistribution(employees, tasks);
  if (workload.length === 0) return null;

  // Let's sort employees by missed deadlines first, then overloaded status, then total effort
  workload.sort((a, b) => {
    if (b.missed !== a.missed) return b.missed - a.missed;
    if (b.isOverloaded !== a.isOverloaded) return b.isOverloaded ? 1 : -1;
    return b.totalEffort - a.totalEffort;
  });

  const struggling = workload[0];
  if (struggling.missed > 0) {
    return {
      userId: struggling.uid,
      name: struggling.name,
      reason: `has ${struggling.missed} missed deadline(s) and needs immediate guidance.`,
      severity: 'high'
    };
  } else if (struggling.isOverloaded) {
    return {
      userId: struggling.uid,
      name: struggling.name,
      reason: 'is heavily overloaded and may need tasks re-assigned.',
      severity: 'medium'
    };
  }
  return {
    reason: 'The team looks balanced right now. No critical intervention needed.',
    severity: 'low'
  };
}
