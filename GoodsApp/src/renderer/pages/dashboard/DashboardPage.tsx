function DashboardPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text)]">
          لوحة التحكم
        </h1>

        <p className="mt-1 text-base text-[var(--text-secondary)]">
          نظرة سريعة على معلومات StockLite.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardCard title="رصيد الصندوق" value="0" />
        <DashboardCard title="عدد المنتجات" value="0" />
        <DashboardCard title="عدد العملاء" value="0" />
        <DashboardCard title="عدد الموردين" value="0" />
      </div>
    </div>
  );
}

type DashboardCardProps = {
  title: string;
  value: string;
};

function DashboardCard({ title, value }: DashboardCardProps) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm">
      <p className="text-base text-[var(--text-secondary)]">{title}</p>

      <p className="mt-3 text-3xl font-bold text-[var(--text)]">{value}</p>
    </div>
  );
}

export default DashboardPage;