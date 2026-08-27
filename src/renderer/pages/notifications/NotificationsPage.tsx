import {
  Bell,
  CheckCheck,
  PackageX,
  TriangleAlert,
  X,
} from "lucide-react";
import {
  useEffect,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";

import TableFooter from "../../components/common/TableFooter";
import {
  Card,
  PageHeader,
} from "../../components/ui";
import { notifyError } from "../../lib/notifications";
import { RECORDS_PAGE_SIZE } from "../../lib/pagination";
import {
  notificationsService,
  type AppNotification,
} from "./notificationsService";

export default function NotificationsPage() {
  const navigate = useNavigate();

  const [items, setItems] =
    useState<AppNotification[]>([]);
  const [unreadOnly, setUnreadOnly] =
    useState(false);
  const [loading, setLoading] =
    useState(true);
  const [page, setPage] =
    useState(1);
  const [pagination, setPagination] =
    useState({
      page: 1,
      limit: RECORDS_PAGE_SIZE,
      total: 0,
      totalPages: 1,
    });

  const load = async (
    targetPage = page,
  ) => {
    try {
      setLoading(true);

      const result =
        await notificationsService.list({
          page: targetPage,
          limit: RECORDS_PAGE_SIZE,
          unreadOnly,
        });

      setItems(result.items);
      setPagination(
        result.pagination,
      );

      if (
        targetPage >
          result.pagination
            .totalPages &&
        result.pagination
          .totalPages > 0
      ) {
        setPage(
          result.pagination
            .totalPages,
        );
      }
    } catch (error) {
      notifyError(error, {
        title:
          "تعذر تحميل الإشعارات",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(page);
  }, [
    unreadOnly,
    page,
  ]);

  const icon = (
    notification: AppNotification,
  ) =>
    notification.severity ===
    "error" ? (
      <PackageX size={20} />
    ) : notification.severity ===
      "warning" ? (
      <TriangleAlert size={20} />
    ) : (
      <Bell size={20} />
    );

  return (
    <>
      <PageHeader
        title="مركز الإشعارات"
        description="التنبيهات المهمة التي تحتاج إلى مراجعة أو إجراء."
        actions={
          <button
            type="button"
            onClick={async () => {
              await notificationsService.markAllRead();
              setPage(1);
              await load(1);
            }}
            className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          >
            <CheckCheck
              size={17}
            />
            تحديد الكل كمقروء
          </button>
        }
      />

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => {
            setUnreadOnly(false);
            setPage(1);
          }}
          className={`rounded-full px-4 py-2 text-sm ${
            !unreadOnly
              ? "bg-[var(--primary)] text-white"
              : "bg-[var(--surface)]"
          }`}
        >
          الكل
        </button>

        <button
          type="button"
          onClick={() => {
            setUnreadOnly(true);
            setPage(1);
          }}
          className={`rounded-full px-4 py-2 text-sm ${
            unreadOnly
              ? "bg-[var(--primary)] text-white"
              : "bg-[var(--surface)]"
          }`}
        >
          غير المقروء
        </button>
      </div>

      <Card padding={false}>
        {loading ? (
          <p className="p-8 text-center">
            جارٍ التحميل...
          </p>
        ) : items.length === 0 ? (
          <p className="p-10 text-center text-[var(--text-muted)]">
            لا توجد إشعارات مطابقة.
          </p>
        ) : (
          <>
            <div className="divide-y divide-[var(--border)]">
              {items.map(
                (notification) => (
                  <div
                    key={
                      notification.id
                    }
                    className={`flex items-start gap-4 p-4 ${
                      notification.is_read
                        ? ""
                        : "bg-[var(--primary-subtle)]"
                    }`}
                  >
                    <div className="mt-1 text-[var(--primary)]">
                      {icon(
                        notification,
                      )}
                    </div>

                    <button
                      type="button"
                      className="min-w-0 flex-1 text-right"
                      onClick={async () => {
                        await notificationsService.markRead(
                          notification.id,
                        );

                        if (
                          notification.action_path
                        ) {
                          navigate(
                            notification.action_path,
                          );
                        } else {
                          await load(
                            page,
                          );
                        }
                      }}
                    >
                      <h3 className="font-bold text-[var(--text-primary)]">
                        {
                          notification.title
                        }
                      </h3>

                      <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                        {
                          notification.body
                        }
                      </p>

                      <time className="mt-2 block text-xs text-[var(--text-muted)]">
                        {new Date(
                          notification.created_at,
                        ).toLocaleString(
                          "ar-SY-u-nu-latn",
                        )}
                      </time>
                    </button>

                    <button
                      type="button"
                      title="إخفاء"
                      onClick={async () => {
                        await notificationsService.dismiss(
                          notification.id,
                        );

                        await load(
                          page,
                        );
                      }}
                      className="rounded-lg p-2 text-[var(--text-muted)] hover:text-red-600"
                    >
                      <X size={17} />
                    </button>
                  </div>
                ),
              )}
            </div>

            <TableFooter
              visibleCount={
                items.length
              }
              totalCount={
                pagination.total
              }
              entityName="إشعار"
              page={
                pagination.page
              }
              totalPages={Math.max(
                1,
                pagination.totalPages,
              )}
              pageSize={
                pagination.limit
              }
              onPageChange={
                setPage
              }
            />
          </>
        )}
      </Card>
    </>
  );
}
