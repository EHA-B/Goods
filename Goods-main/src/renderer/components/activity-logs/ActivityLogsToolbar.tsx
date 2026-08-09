import { Button, Input, Select } from "../ui";
import type { ActivityLogFilters } from "../../pages/activity-logs/activityLogsTypes";
import { moduleLabels } from "../../pages/activity-logs/activityLogsUtils";
export default function ActivityLogsToolbar({filters,onChange,onClear,users,modules}:{filters:ActivityLogFilters;onChange:(key:keyof ActivityLogFilters,value:string)=>void;onClear:()=>void;users:string[];modules:string[]}){ return <div className="grid gap-3 border-b border-[var(--border)] p-4 lg:grid-cols-4 xl:grid-cols-7">
<Input value={filters.query} onChange={(e)=>onChange("query",e.target.value)} placeholder="بحث في الوصف أو العملية" />
<Select value={filters.user} onChange={(e)=>onChange("user",e.target.value)} options={[{value:"all",label:"كل المستخدمين"},...users.map(v=>({value:v,label:v}))]} />
<Select value={filters.module} onChange={(e)=>onChange("module",e.target.value)} options={[{value:"all",label:"كل الوحدات"},...modules.map(v=>({value:v,label:moduleLabels[v] ?? v}))]} />
<Select value={filters.severity} onChange={(e)=>onChange("severity",e.target.value)} options={[{value:"all",label:"كل المستويات"},{value:"info",label:"معلومات"},{value:"warning",label:"تحذير"},{value:"critical",label:"حساس"}]} />
<Input type="date" value={filters.dateFrom} onChange={(e)=>onChange("dateFrom",e.target.value)} />
<Input type="date" value={filters.dateTo} onChange={(e)=>onChange("dateTo",e.target.value)} />
<Button variant="secondary" onClick={onClear}>مسح الفلاتر</Button>
</div>; }
