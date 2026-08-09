import type { ActivityLog, ActivityLogFilters } from "./activityLogsTypes";

export type ActivityLogListResult = {
  items: ActivityLog[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export const activityLogsService = {
  list(filters: Partial<ActivityLogFilters>, page = 1, limit = 20) {
    return window.stockliteApi.activityLogs.list(filters, { page, limit }) as Promise<ActivityLogListResult>;
  },
  get(id: number) {
    return window.stockliteApi.activityLogs.get(id) as Promise<ActivityLog>;
  },
  options() {
    return window.stockliteApi.activityLogs.options() as Promise<{ users: string[]; modules: string[]; actions: string[] }>;
  },
};
