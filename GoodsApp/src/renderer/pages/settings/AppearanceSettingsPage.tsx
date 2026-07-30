import { Moon, Palette, Type } from "lucide-react";
import { Card, PageHeader } from "../../components/ui";
import { useAppearance } from "../../settings/AppearanceContext";

const palettes = [
  { value: "teal", label: "أخضر احترافي", colors: ["#0f766e", "#2f8f86", "#dff3ef"] },
  { value: "amber", label: "عنبر دافئ", colors: ["#b45309", "#d97706", "#fff0d5"] },
  { value: "blue", label: "أزرق واضح", colors: ["#1d4ed8", "#3b82f6", "#e3edff"] },
  { value: "violet", label: "بنفسجي متباين", colors: ["#6d28d9", "#8b5cf6", "#eee7ff"] },
] as const;

export default function AppearanceSettingsPage() {
  const { theme, fontSize, accent, setTheme, setFontSize, setAccent } = useAppearance();

  return (
    <div className="appearance-settings-page">
      <PageHeader title="إعدادات الواجهة" description="خصص مظهر StockLite؛ كل لون يطبق باليت متكاملة على الواجهة." />

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="appearance-settings-card">
          <div className="flex items-start gap-4">
            <div className="appearance-settings-icon"><Moon size={21} /></div>
            <div className="flex-1">
              <h2 className="font-bold">نمط العرض</h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">الوضع الليلي أصبح أخف وبتباين مريح للاستخدام الطويل.</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {([['light','فاتح'],['dark','ليلي هادئ']] as const).map(([value,label]) => (
                  <button key={value} onClick={() => setTheme(value)} className={`appearance-choice ${theme === value ? 'is-active' : ''}`}>{label}</button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card className="appearance-settings-card">
          <div className="flex items-start gap-4">
            <div className="appearance-settings-icon"><Type size={21} /></div>
            <div className="flex-1">
              <h2 className="font-bold">حجم الخط</h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">يُطبق على كامل الواجهة مباشرة.</p>
              <div className="mt-5 grid grid-cols-3 gap-3">
                {([['small','صغير'],['medium','متوسط'],['large','كبير']] as const).map(([value,label]) => (
                  <button key={value} onClick={() => setFontSize(value)} className={`appearance-choice ${fontSize === value ? 'is-active' : ''}`}>{label}</button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card className="appearance-settings-card xl:col-span-2">
          <div className="flex items-start gap-4">
            <div className="appearance-settings-icon"><Palette size={21} /></div>
            <div className="flex-1">
              <h2 className="font-bold">باليت الواجهة</h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">الاختيار يغيّر الخلفيات والأسطح والحدود وحالات التحديد، وليس اللون الرئيسي فقط.</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {palettes.map((item) => (
                  <button key={item.value} onClick={() => setAccent(item.value)} className={`appearance-palette ${accent === item.value ? 'is-active' : ''}`}>
                    <span className="appearance-palette-colors" aria-hidden="true">
                      {item.colors.map((color) => <span key={color} style={{ backgroundColor: color }} />)}
                    </span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
