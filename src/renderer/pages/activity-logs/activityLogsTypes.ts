export type ActivityLogSeverity = "info" | "warning" | "critical";
export type ActivityLog = {
  id: number; userId: number | null; userName: string; action: string; module: string; entityType: string; entityId: number | null; description: string; severity: ActivityLogSeverity; createdAt: string; oldData?: Record<string, unknown> | null; newData?: Record<string, unknown> | null; metadata?: Record<string, unknown> | null;
};
export type ActivityLogFilters = { query: string; user: string; module: string; action: string; severity: string; dateFrom: string; dateTo: string };
