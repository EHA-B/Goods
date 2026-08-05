import { Building2, DatabaseBackup, Info, ArrowLeft, Palette, ShieldCheck, BellRing } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, PageHeader } from "../../components/ui";
import { PATHS } from "../../routes/path";

const items = [
  {
    title: "معلومات الشركة",
    description: "بيانات المنشأة والشعار والمعلومات التي تظهر على الفواتير.",
    path: PATHS.SETTINGS_COMPANY,
    icon: Building2,
  },
  {
    title: "النسخ الاحتياطي",
    description: "إنشاء نسخة من بيانات النظام أو استعادة نسخة محفوظة.",
    path: PATHS.SETTINGS_BACKUP,
    icon: DatabaseBackup,
  },
  {
    title: "إعدادات الواجهة",
    description: "الوضع الليلي وحجم الخط وباليت ألوان الواجهة.",
    path: PATHS.SETTINGS_APPEARANCE,
    icon: Palette,
  },
  {
    title: "الأمان وتسجيل الدخول",
    description: "تغيير كلمة مرور حساب النظام وحماية الدخول إلى التطبيق.",
    path: PATHS.SETTINGS_SECURITY,
    icon: ShieldCheck,
  },
  {
    title: "الإشعارات والأصوات",
    description: "التحكم برنة التنبيهات ومستوى صوت الإشعارات.",
    path: PATHS.SETTINGS_NOTIFICATIONS,
    icon: BellRing,
  },
  {
    title: "حول البرنامج",
    description: "معلومات الإصدار وقاعدة البيانات وبيانات البرنامج.",
    path: PATHS.SETTINGS_ABOUT,
    icon: Info,
  },
];

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="الإعدادات"
        description="إدارة معلومات الشركة والأمان والواجهة والنسخ الاحتياطي ومعلومات البرنامج."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.path} to={item.path} className="group block">
              <Card className="h-full transition-[border-color,box-shadow,transform] duration-150 group-hover:-translate-y-0.5 group-hover:border-[var(--primary)] group-hover:shadow-sm">
                <div className="flex min-h-[170px] flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary-subtle)] text-[var(--primary)]">
                      <Icon size={23} strokeWidth={1.9} />
                    </div>
                    <ArrowLeft size={19} className="mt-1 text-[var(--text-muted)] transition-transform group-hover:-translate-x-1 group-hover:text-[var(--primary)]" />
                  </div>

                  <div className="mt-auto pt-6">
                    <h2 className="text-base font-bold text-[var(--text-primary)]">{item.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{item.description}</p>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </>
  );
}
