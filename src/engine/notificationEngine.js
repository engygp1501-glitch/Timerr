/**
 * Notification Engine
 * Generates alerts for deadlines, overdue tasks, and overload situations.
 */
import { ref, push, set, onValue, query, orderByChild, equalTo } from 'firebase/database';
import { db } from '../firebase';
import { getDaysUntilDeadline } from './priorityEngine';

/**
 * Check all tasks and generate notifications as needed.
 */
export function checkAndGenerateNotifications(tasks, employees) {
  const notifications = [];

  tasks.forEach(task => {
    if (task.status === 'completed') return;

    const daysLeft = task.deadline_days || getDaysUntilDeadline(task.deadline);

    // Overdue
    if (daysLeft <= 0) {
      notifications.push({
        userId: task.assignedTo,
        message: `⚠️ OVERDUE: "${task.title}" was due ${Math.abs(daysLeft)} day(s) ago!`,
        type: 'overdue',
        taskId: task.id,
        severity: 'critical',
        createdAt: Date.now()
      });
    }
    // Approaching deadline (< 24 hours)
    else if (daysLeft <= 1) {
      notifications.push({
        userId: task.assignedTo,
        message: `🔴 URGENT: "${task.title}" is due TODAY!`,
        type: 'deadline',
        taskId: task.id,
        severity: 'high',
        createdAt: Date.now()
      });
    }
    // Approaching deadline (< 3 days)
    else if (daysLeft <= 3) {
      notifications.push({
        userId: task.assignedTo,
        message: `🟡 "${task.title}" is due in ${daysLeft} days. Start soon!`,
        type: 'deadline',
        taskId: task.id,
        severity: 'medium',
        createdAt: Date.now()
      });
    }
  });

  // Check overload per employee
  if (employees && employees.length > 0) {
    employees.forEach(emp => {
      const empTasks = tasks.filter(
        t => t.assignedTo === emp.uid && t.status !== 'completed'
      );
      if (empTasks.length >= 6) {
        notifications.push({
          userId: emp.uid,
          message: `🔥 You have ${empTasks.length} active tasks. Consider delegating some.`,
          type: 'overload',
          severity: 'high',
          createdAt: Date.now()
        });
      }
    });
  }

  return notifications;
}

/**
 * Write a notification to Firebase.
 */
export async function pushNotification(userId, notification) {
  const notifRef = ref(db, `notifications/${userId}`);
  const newRef = push(notifRef);
  await set(newRef, {
    ...notification,
    read: false,
    createdAt: Date.now()
  });
}

/**
 * Mark notification as read.
 */
export async function markNotificationRead(userId, notifId) {
  const notifRef = ref(db, `notifications/${userId}/${notifId}/read`);
  await set(notifRef, true);
}

/**
 * Clear all notifications for a user.
 */
export async function clearNotifications(userId) {
  const notifRef = ref(db, `notifications/${userId}`);
  await set(notifRef, null);
}
