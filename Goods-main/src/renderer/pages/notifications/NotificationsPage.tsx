import { Bell, CheckCheck, PackageX, TriangleAlert, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, PageHeader } from "../../components/ui";
import { notifyError } from "../../lib/notifications";
import { notificationsService, type AppNotification } from "./notificationsService";

export default function NotificationsPage(){ const navigate=useNavigate(); const [items,setItems]=useState<AppNotification[]>([]); const [unreadOnly,setUnreadOnly]=useState(false); const [loading,setLoading]=useState(true);
 const load=async()=>{try{setLoading(true);const r=await notificationsService.list({page:1,limit:100,unreadOnly});setItems(r.items);}catch(e){notifyError(e,{title:"تعذر تحميل الإشعارات"})}finally{setLoading(false)}};
 useEffect(()=>{void load()},[unreadOnly]);
 const icon=(n:AppNotification)=>n.severity==='error'?<PackageX size={20}/>:n.severity==='warning'?<TriangleAlert size={20}/>:<Bell size={20}/>;
 return <><PageHeader title="مركز الإشعارات" description="التنبيهات المهمة التي تحتاج إلى مراجعة أو إجراء." actions={<button onClick={async()=>{await notificationsService.markAllRead();await load()}} className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm"><CheckCheck size={17}/>تحديد الكل كمقروء</button>}/>
 <div className="mb-4 flex gap-2"><button onClick={()=>setUnreadOnly(false)} className={`rounded-full px-4 py-2 text-sm ${!unreadOnly?'bg-[var(--primary)] text-white':'bg-[var(--surface)]'}`}>الكل</button><button onClick={()=>setUnreadOnly(true)} className={`rounded-full px-4 py-2 text-sm ${unreadOnly?'bg-[var(--primary)] text-white':'bg-[var(--surface)]'}`}>غير المقروء</button></div>
 <Card>{loading?<p className="p-8 text-center">جارٍ التحميل...</p>:items.length===0?<p className="p-10 text-center text-[var(--text-muted)]">لا توجد إشعارات مطابقة.</p>:<div className="divide-y divide-[var(--border)]">{items.map(n=><div key={n.id} className={`flex items-start gap-4 p-4 ${n.is_read?'':'bg-[var(--primary-subtle)]'}`}><div className="mt-1 text-[var(--primary)]">{icon(n)}</div><button className="min-w-0 flex-1 text-right" onClick={async()=>{await notificationsService.markRead(n.id); if(n.action_path)navigate(n.action_path); else await load();}}><h3 className="font-bold text-[var(--text-primary)]">{n.title}</h3><p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">{n.body}</p><time className="mt-2 block text-xs text-[var(--text-muted)]">{new Date(n.created_at).toLocaleString('ar-SY')}</time></button><button title="إخفاء" onClick={async()=>{await notificationsService.dismiss(n.id);await load()}} className="rounded-lg p-2 text-[var(--text-muted)] hover:text-red-600"><X size={17}/></button></div>)}</div>}</Card></>;
}
