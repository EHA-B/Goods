import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { BackButton, Card, PageHeader } from "../../components/ui";
import ActivityLogChangesViewer from "../../components/activity-logs/ActivityLogChangesViewer";
import { ActionBadge, SeverityBadge } from "../../components/activity-logs/ActivityLogBadges";
import type { ActivityLog } from "./activityLogsTypes";
import { activityLogsService } from "./activityLogsService";
import { formatActivityDate } from "./activityLogsUtils";
import { PATHS } from "../../routes/path";

export default function ActivityLogDetailsPage() {
  const { activityLogId } = useParams();
  const id = Number(activityLogId);
  const [item, setItem] = useState<ActivityLog>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    activityLogsService
      .get(id)
      .then(setItem)
      .finally(() => setLoading(false));
  }, [id]);

  if (!Number.isFinite(id)) {
    return <Navigate to={PATHS.ACTIVITY_LOGS} replace />;
  }

  if (loading) {
    return (
      <div className="p-10 text-center text-sm text-[var(--text-muted)]">
        جاري تحميل التفاصيل...
      </div>
    );
  }

  if (!item) {
    return <Navigate to={PATHS.ACTIVITY_LOGS} replace />;
  }

  return (
    <>
      <PageHeader
        title="تفاصيل سجل النشاط"
        description={`سجل رقم ${item.id}`}
        actions={
          <BackButton
            to={PATHS.ACTIVITY_LOGS}
            label="العودة إلى سجل النشاط"
          />
        }
      />

      <Card header="بيانات العملية">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Info label="المستخدم" value={item.userName} />
          <Info label="التاريخ والوقت" value={formatActivityDate(item.createdAt)} />
          <Info label="الوحدة" value={item.module} />
          <Info
            label="الكيان"
            value={`${item.entityType}${item.entityId ? ` #${item.entityId}` : ""}`}
          />
          <div>
            <p className="mb-2 text-xs font-bold text-[var(--text-muted)]">
              العملية
            </p>
            <ActionBadge value={item.action} />
          </div>
          <div>
            <p className="mb-2 text-xs font-bold text-[var(--text-muted)]">
              المستوى
            </p>
            <SeverityBadge value={item.severity} />
          </div>
        </div>

        <div className="mt-5 border-t border-[var(--border)] pt-4">
          <p className="text-xs font-bold text-[var(--text-muted)]">الوصف</p>
          <p className="mt-2 text-sm leading-7 text-[var(--text-primary)]">
            {item.description}
          </p>
        </div>
      </Card>

      <div className="mt-5">
        <ActivityLogChangesViewer
          oldData={item.oldData}
          newData={item.newData}
        />
      </div>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold text-[var(--text-muted)]">{label}</p>
      <p
        dir="auto"
        className="mt-1 break-words text-sm font-medium text-[var(--text-primary)]"
      >
        {value}
      </p>
    </div>
  );
}
