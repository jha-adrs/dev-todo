export function requestPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) return Promise.resolve("denied");
  if (Notification.permission === "granted") return Promise.resolve("granted");
  if (Notification.permission === "denied") return Promise.resolve("denied");
  return Notification.requestPermission();
}

export function showDailySummary(stats: {
  total: number;
  completed: number;
  backlogCount: number;
}) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const pending = stats.total - stats.completed;
  const parts: string[] = [];

  if (pending > 0) parts.push(`${pending} task${pending !== 1 ? "s" : ""} pending`);
  if (stats.backlogCount > 0) parts.push(`${stats.backlogCount} backlog`);
  if (stats.completed > 0) parts.push(`${stats.completed} done`);

  if (parts.length === 0) {
    new Notification("DevTodo — New day, clean slate", {
      body: "No tasks yet. Press N to start planning.",
      icon: "/favicon.ico",
    });
    return;
  }

  const body = parts.join(" · ");
  const title =
    pending === 0 && stats.backlogCount === 0
      ? "DevTodo — Zero inbox!"
      : "DevTodo — Daily Summary";

  new Notification(title, { body, icon: "/favicon.ico" });
}

const SHOWN_KEY = "devtodo-notif-date";

export function showDailySummaryOnce(stats: {
  total: number;
  completed: number;
  backlogCount: number;
}) {
  const today = new Date().toISOString().split("T")[0];
  const lastShown = localStorage.getItem(SHOWN_KEY);
  if (lastShown === today) return;

  localStorage.setItem(SHOWN_KEY, today);
  showDailySummary(stats);
}
