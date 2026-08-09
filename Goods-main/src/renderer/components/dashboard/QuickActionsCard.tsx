import { ArrowLeftRight, Banknote, Package, ShoppingCart, Truck } from "lucide-react";
import { Card } from "../ui";
import { PATHS } from "../../routes/path";
import ActionCard from "./ActionCard";
const actions = [
  { title: "بيع جديد", description: "إنشاء فاتورة بيع", icon: ShoppingCart, to: PATHS.SALE_NEW },
  { title: "شراء جديد", description: "إنشاء فاتورة شراء", icon: Truck, to: PATHS.PURCHASE_NEW },
  { title: "معاملة مالية", description: "تسجيل إيراد أو مصروف", icon: Banknote, to: PATHS.TRANSACTION_NEW },
  { title: "تحويل صندوق", description: "نقل رصيد بين صندوقين", icon: ArrowLeftRight, to: PATHS.CASHBOX_TRANSFER_NEW },
  { title: "إضافة منتج", description: "تسجيل منتج جديد", icon: Package, to: PATHS.PRODUCT_NEW },
];
export default function QuickActionsCard() { return <Card header="إجراءات سريعة" description="الوصول المباشر للعمليات اليومية"><div className="space-y-3">{actions.map(a=><ActionCard key={a.title} {...a}/>)}</div></Card>; }
