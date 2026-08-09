import { Badge } from "../ui";
import type { ActivityLogSeverity } from "../../pages/activity-logs/activityLogsTypes";
import { actionLabels, severityLabel } from "../../pages/activity-logs/activityLogsUtils";
export function SeverityBadge({ value }:{value:ActivityLogSeverity}){ return <Badge variant={value === "critical" ? "danger" : value === "warning" ? "warning" : "primary"}>{severityLabel(value)}</Badge>; }
export function ActionBadge({ value }:{value:string}){ return <Badge variant="gray">{actionLabels[value] ?? value}</Badge>; }
