import { ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";

import {
  Button,
  Card,
  EmptyState,
} from "../ui";

import { PATHS } from "../../routes/path";

export default function RecentSalesCard() {
  return (
    <Card
      header="آخر المبيعات"
      description="أحدث عمليات البيع المسجلة"
      actions={
        <Link to={PATHS.SALES}>
          <Button variant="ghost">
            عرض الكل
          </Button>
        </Link>
      }
    >
      <EmptyState
        icon={<ShoppingCart size={36} />}
        title="لا توجد مبيعات بعد"
        description="ستظهر هنا أحدث عمليات البيع بعد تسجيل أول فاتورة."
        action={
          <Link to={PATHS.SALES}>
            <Button>
              تسجيل عملية بيع
            </Button>
          </Link>
        }
      />
    </Card>
  );
}