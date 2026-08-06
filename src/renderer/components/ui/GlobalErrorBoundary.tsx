import { notifyError } from "../../lib/notifications";
import React from "react";

type State = { failed: boolean };

export default class GlobalErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State { return { failed: true }; }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[React render error]", error, info);
    notifyError(error, { title: "تعذر عرض الصفحة" });
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center shadow-lg">
          <h1 className="text-lg font-bold">تعذر عرض الصفحة</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">حدث خطأ غير متوقع. أعد تحميل الصفحة أو أعد تشغيل التطبيق.</p>
          <button className="mt-5 rounded-lg bg-[var(--primary)] px-4 py-2 text-white" onClick={() => window.location.reload()}>إعادة تحميل الصفحة</button>
        </div>
      </div>
    );
  }
}
