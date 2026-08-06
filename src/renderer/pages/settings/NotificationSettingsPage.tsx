import { useState } from "react";
import { BellRing, Volume2 } from "lucide-react";
import soundUrl from "../../assets/sounds/notification.wav";
import { BackButton, Card, PageHeader } from "../../components/ui";
import { notifyError, notifySuccess } from "../../lib/notifications";
import { PATHS } from "../../routes/path";

const SETTINGS_KEY = "stocklite.notificationSound";

export default function NotificationSettingsPage() {
  const [enabled, setEnabled] = useState(
    () => localStorage.getItem(`${SETTINGS_KEY}.enabled`) !== "false",
  );
  const [volume, setVolume] = useState(() => {
    const value = Number(
      localStorage.getItem(`${SETTINGS_KEY}.volume`) ?? 0.25,
    );
    return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.25;
  });

  const save = () => {
    localStorage.setItem(`${SETTINGS_KEY}.enabled`, String(enabled));
    localStorage.setItem(`${SETTINGS_KEY}.volume`, String(volume));
    notifySuccess("تم حفظ إعدادات صوت الإشعارات.");
  };

  const test = async () => {
    try {
      const audio = new Audio(soundUrl);
      audio.volume = volume;
      await audio.play();
    } catch (error) {
      notifyError(error, {
        title: "تعذر تشغيل صوت التجربة",
        fallback: "اضغطي داخل التطبيق أولًا، ثم أعيدي تجربة الصوت.",
      });
    }
  };

  return (
    <>
      <PageHeader
        title="إعدادات الإشعارات"
        description="التحكم بصوت التنبيهات ومستوى الصوت."
        actions={<BackButton to={PATHS.SETTINGS} />}
      />

      <Card className="max-w-2xl">
        <div className="space-y-6">
          <label className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <BellRing className="text-[var(--primary)]" />
              <div>
                <strong>تشغيل صوت الإشعارات</strong>
                <p className="text-sm text-[var(--text-muted)]">
                  يعمل عند ظهور تنبيه جديد أو عودة حالة سبق حلها.
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
              className="h-5 w-5"
            />
          </label>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-2 font-semibold">
                <Volume2 size={18} />
                مستوى الصوت
              </span>
              <span>{Math.round(volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(event) => setVolume(Number(event.target.value))}
              className="w-full"
              disabled={!enabled}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void test()}
              disabled={!enabled}
              className="rounded-lg border border-[var(--border)] px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              تجربة الصوت
            </button>
            <button
              type="button"
              onClick={save}
              className="rounded-lg bg-[var(--primary)] px-5 py-2 text-[var(--text-inverse)]"
            >
              حفظ الإعدادات
            </button>
          </div>
        </div>
      </Card>
    </>
  );
}
