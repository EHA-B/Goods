export type AppNotification = {
  id: number;
  type: string;
  severity: "info" | "success" | "warning" | "error";
  title: string;
  body?: string | null;
  action_path?: string | null;
  is_read: number | boolean;
  created_at: string;
  generation?: number;
  last_triggered_at?: string | null;
};
export type NotificationList = { items: AppNotification[]; unreadCount: number; newestUnreadToken?: string | null; pagination: {page:number;limit:number;total:number;totalPages:number} };
export const notificationsService = {
  list: (input?: unknown) => window.stockliteApi.notifications.list(input) as Promise<NotificationList>,
  count: () => window.stockliteApi.notifications.count() as Promise<{count:number}>,
  markRead: (id:number) => window.stockliteApi.notifications.markRead(id),
  markAllRead: () => window.stockliteApi.notifications.markAllRead(),
  dismiss: (id:number) => window.stockliteApi.notifications.dismiss(id),
};
