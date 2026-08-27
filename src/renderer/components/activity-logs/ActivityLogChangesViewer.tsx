import { Card } from "../ui";
import {
  activityFieldLabel,
  stringifyValue,
} from "../../pages/activity-logs/activityLogsUtils";

function PrimitiveValue({ value }: { value: unknown }) {
  return (
    <span dir="auto" className="break-words text-sm font-medium text-[var(--text-primary)]">
      {stringifyValue(value)}
    </span>
  );
}

function StructuredValue({ value, level = 0 }: { value: unknown; level?: number }) {
  if (Array.isArray(value)) {
    if (!value.length) return <span className="text-sm text-[var(--text-muted)]">لا توجد عناصر.</span>;
    return (
      <div className="space-y-2">
        {value.map((item, index) => (
          <div key={index} className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-subtle)] p-3">
            <p className="mb-2 text-xs font-bold text-[var(--text-muted)]">العنصر {index + 1}</p>
            <StructuredValue value={item} level={level + 1} />
          </div>
        ))}
      </div>
    );
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (!entries.length) return <span className="text-sm text-[var(--text-muted)]">لا توجد بيانات.</span>;
    return (
      <div className={level ? "space-y-2" : "divide-y divide-[var(--border)]"}>
        {entries.map(([key, nested]) => {
          const complex = nested !== null && typeof nested === "object";
          return (
            <div key={key} className={level ? "py-1" : "py-3 first:pt-0 last:pb-0"}>
              {complex ? (
                <div>
                  <p className="mb-2 text-xs font-bold text-[var(--text-muted)]">{activityFieldLabel(key)}</p>
                  <div className="border-r-2 border-[var(--border)] pr-3">
                    <StructuredValue value={nested} level={level + 1} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-[minmax(110px,0.75fr)_minmax(0,1.25fr)] items-start gap-4">
                  <span className="text-xs font-bold text-[var(--text-muted)]">{activityFieldLabel(key)}</span>
                  <PrimitiveValue value={nested} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return <PrimitiveValue value={value} />;
}

function Values({ title, values }:{title:string; values?:Record<string,unknown>|null}) {
  return (
    <Card header={title}>
      {values && Object.keys(values).length ? (
        <StructuredValue value={values} />
      ) : (
        <p className="text-sm text-[var(--text-muted)]">لا توجد بيانات.</p>
      )}
    </Card>
  );
}

export default function ActivityLogChangesViewer({oldData,newData}:{oldData?:Record<string,unknown>|null;newData?:Record<string,unknown>|null}) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Values title="القيم قبل العملية" values={oldData}/>
      <Values title="القيم بعد العملية" values={newData}/>
    </div>
  );
}
