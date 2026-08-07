import { FormEvent, useState } from "react";
import { Eye, EyeOff, Save, ShieldCheck } from "lucide-react";

import { notifyError, notifySuccess } from "../../lib/notifications";
import { useAuth } from "../../auth/AuthContext";
import {
  BackButton,
  Button,
  Card,
  FormField,
  Input,
  PageHeader,
} from "../../components/ui";
import { PATHS } from "../../routes/path";

type PasswordField = "current" | "next" | "confirm";

type PasswordChangeError = Error & {
  code?: string;
};

export default function SecuritySettingsPage() {
  const { changePassword, user } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [visible, setVisible] = useState<Record<PasswordField, boolean>>({
    current: false,
    next: false,
    confirm: false,
  });

  const [errors, setErrors] = useState<Record<PasswordField, string>>({
    current: "",
    next: "",
    confirm: "",
  });

  const [isSaving, setIsSaving] = useState(false);

  function toggle(field: PasswordField) {
    setVisible((current) => ({
      ...current,
      [field]: !current[field],
    }));
  }

  function clearError(field: PasswordField) {
    if (errors[field]) {
      setErrors((current) => ({
        ...current,
        [field]: "",
      }));
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: Record<PasswordField, string> = {
      current: currentPassword ? "" : "أدخل كلمة المرور الحالية.",
      next:
        newPassword.length >= 8
          ? ""
          : "يجب أن تتكون كلمة المرور الجديدة من 8 محارف على الأقل.",
      confirm:
        confirmPassword && confirmPassword === newPassword
          ? ""
          : "تأكيد كلمة المرور غير مطابق.",
    };

    if (
      currentPassword &&
      newPassword &&
      currentPassword === newPassword
    ) {
      nextErrors.next = "اختر كلمة مرور مختلفة عن الحالية.";
    }

    setErrors(nextErrors);

    if (Object.values(nextErrors).some(Boolean)) {
      return;
    }

    setIsSaving(true);

    try {
      await changePassword({
        currentPassword,
        newPassword,
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setErrors({
        current: "",
        next: "",
        confirm: "",
      });

      notifySuccess("تم تغيير كلمة المرور بنجاح.");
    } catch (error) {
      const appError = error as PasswordChangeError;

      const code = appError?.code;
      const message = appError?.message ?? "";

      if (
        code === "INVALID_CURRENT_PASSWORD" ||
        message.includes("INVALID_CURRENT_PASSWORD") ||
        message.includes("Current password is incorrect")
      ) {
        setErrors((current) => ({
          ...current,
          current: "كلمة المرور الحالية غير صحيحة.",
        }));

        return;
      }

      if (
        code === "PASSWORD_UNCHANGED" ||
        message.includes("PASSWORD_UNCHANGED")
      ) {
        setErrors((current) => ({
          ...current,
          next: "اختر كلمة مرور مختلفة عن الحالية.",
        }));

        return;
      }

      /*
       * مهم:
       * نمرر الخطأ نفسه إلى notifyError حتى يستطيع
       * errorNormalizer قراءة code واستخدام ERROR_MESSAGES_AR.
       */
      notifyError(error);
    } finally {
      setIsSaving(false);
    }
  }

  const passwordEnd = (field: PasswordField) => (
    <button
      type="button"
      onClick={() => toggle(field)}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--primary-subtle)] hover:text-[var(--primary)]"
      aria-label={
        visible[field]
          ? "إخفاء كلمة المرور"
          : "إظهار كلمة المرور"
      }
    >
      {visible[field] ? (
        <EyeOff size={17} />
      ) : (
        <Eye size={17} />
      )}
    </button>
  );

  return (
    <form onSubmit={submit} className="space-y-6">
      <PageHeader
        title="الأمان وتسجيل الدخول"
        description="تغيير كلمة مرور حساب النظام الوحيد المستخدم لتسجيل الدخول إلى StockLite."
        actions={<BackButton to={PATHS.SETTINGS} />}
      />

      <Card
        header="بيانات الحساب"
        description="الحساب الحالي محفوظ في قاعدة البيانات ولا تُعرض كلمة المرور أو تُخزّن داخل الواجهة."
      >
        <div className="flex items-center gap-3 rounded-[var(--radius-md)] bg-[var(--surface-subtle)] p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary-subtle)] text-[var(--primary)]">
            <ShieldCheck size={20} />
          </div>

          <div>
            <p className="font-bold text-[var(--text-primary)]">
              {user?.full_name ?? "مستخدم النظام"}
            </p>

            <p
              dir="ltr"
              className="mt-0.5 text-left text-xs text-[var(--text-muted)]"
            >
              {user?.username}
            </p>
          </div>
        </div>
      </Card>

      <Card
        header="تغيير كلمة المرور"
        description="استخدم كلمة مرور قوية لا تقل عن 8 محارف."
      >
        <div className="grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <FormField
              label="كلمة المرور الحالية"
              required
              error={errors.current}
            >
              <Input
                type={visible.current ? "text" : "password"}
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => {
                  setCurrentPassword(event.target.value);
                  clearError("current");
                }}
                error={Boolean(errors.current)}
                endContent={passwordEnd("current")}
              />
            </FormField>
          </div>

          <FormField
            label="كلمة المرور الجديدة"
            required
            error={errors.next}
          >
            <Input
              type={visible.next ? "text" : "password"}
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => {
                setNewPassword(event.target.value);
                clearError("next");
              }}
              error={Boolean(errors.next)}
              endContent={passwordEnd("next")}
            />
          </FormField>

          <FormField
            label="تأكيد كلمة المرور الجديدة"
            required
            error={errors.confirm}
          >
            <Input
              type={visible.confirm ? "text" : "password"}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                clearError("confirm");
              }}
              error={Boolean(errors.confirm)}
              endContent={passwordEnd("confirm")}
            />
          </FormField>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button
          type="submit"
          isLoading={isSaving}
          loadingText="جاري الحفظ..."
          startIcon={<Save size={17} />}
        >
          حفظ كلمة المرور
        </Button>
      </div>
    </form>
  );
}
