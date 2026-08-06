import { Bell, CheckCheck, ExternalLink, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import soundUrl from "../../assets/sounds/notification.wav";
import {
  notificationsService,
  type AppNotification,
} from "../../pages/notifications/notificationsService";
import { notifyError } from "../../lib/notifications";
import { PATHS } from "../../routes/path";

const SETTINGS_KEY = "stocklite.notificationSound";
const LAST_PLAYED_TOKEN_KEY = "stocklite.notificationSound.lastPlayedToken";
const REFRESH_EVENT = "stocklite:notifications-refresh";
const POPOVER_WIDTH = 360;
const SCREEN_MARGIN = 12;

const readSoundSettings = () => {
  try {
    const rawVolume = Number(
      localStorage.getItem(`${SETTINGS_KEY}.volume`) ?? 0.25,
    );
    return {
      enabled: localStorage.getItem(`${SETTINGS_KEY}.enabled`) !== "false",
      volume: Number.isFinite(rawVolume)
        ? Math.max(0, Math.min(1, rawVolume))
        : 0.25,
    };
  } catch {
    return { enabled: true, volume: 0.25 };
  }
};

const readLastPlayedToken = () => {
  try {
    return localStorage.getItem(LAST_PLAYED_TOKEN_KEY);
  } catch {
    return null;
  }
};

const rememberPlayedToken = (token: string) => {
  try {
    localStorage.setItem(LAST_PLAYED_TOKEN_KEY, token);
  } catch {
    // The sound still works when storage is unavailable; it just cannot persist across remounts.
  }
};

let sharedAudio: HTMLAudioElement | null = null;
let audioUnlocked = false;
let lastSoundAt = 0;

function getSharedAudio() {
  if (!sharedAudio) {
    sharedAudio = new Audio(soundUrl);
    sharedAudio.preload = "auto";
  }
  return sharedAudio;
}

async function unlockAudio() {
  if (audioUnlocked) return true;
  const audio = getSharedAudio();
  const previousVolume = audio.volume;
  try {
    audio.volume = 0;
    audio.currentTime = 0;
    await audio.play();
    audio.pause();
    audio.currentTime = 0;
    audio.volume = previousVolume;
    audioUnlocked = true;
    return true;
  } catch (error) {
    console.warn("[Notifications] Audio unlock failed", error);
    audio.volume = previousVolume;
    return false;
  }
}

async function playNotificationSound() {
  const settings = readSoundSettings();
  const now = Date.now();
  if (!settings.enabled || now - lastSoundAt < 1800) return false;
  if (!audioUnlocked) return false;

  const audio = getSharedAudio();
  try {
    lastSoundAt = now;
    audio.pause();
    audio.currentTime = 0;
    audio.volume = settings.volume;
    await audio.play();
    return true;
  } catch (error) {
    console.warn("[Notifications] Audio playback failed", error);
    return false;
  }
}

type PopoverPosition = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

export default function NotificationBell() {
  const navigate = useNavigate();
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const latestTokenRef = useRef<string | null | undefined>(undefined);
  const pendingSoundTokenRef = useRef<string | null>(null);
  const requestInFlightRef = useRef(false);
  const mountedRef = useRef(true);

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [count, setCount] = useState(0);
  const [position, setPosition] = useState<PopoverPosition>({
    top: 0,
    left: SCREEN_MARGIN,
    width: POPOVER_WIDTH,
    maxHeight: 500,
  });

  const tryPendingSound = useCallback(async () => {
    const token = pendingSoundTokenRef.current;
    if (!token || token === readLastPlayedToken()) {
      pendingSoundTokenRef.current = null;
      return;
    }
    const played = await playNotificationSound();
    if (played) {
      rememberPlayedToken(token);
      pendingSoundTokenRef.current = null;
    }
  }, []);

  const load = useCallback(async () => {
    if (requestInFlightRef.current) return;
    requestInFlightRef.current = true;
    try {
      const result = await notificationsService.list({
        page: 1,
        limit: 8,
        unreadOnly: false,
      });
      if (!mountedRef.current) return;

      setItems(result.items);
      setCount(result.unreadCount);

      const nextToken = result.newestUnreadToken ?? null;
      const previousToken = latestTokenRef.current;
      const alreadyPlayedToken = readLastPlayedToken();
      const isUnplayedEvent = Boolean(nextToken) && nextToken !== alreadyPlayedToken;
      const isNewRefreshEvent =
        Boolean(nextToken) &&
        previousToken !== undefined &&
        nextToken !== previousToken;

      // One sound only for the newest notification batch. The persisted token prevents
      // the same unread notification from ringing again after remounting the dashboard.
      if (nextToken && isUnplayedEvent && (previousToken === undefined || isNewRefreshEvent)) {
        pendingSoundTokenRef.current = nextToken;
        await tryPendingSound();
      }

      latestTokenRef.current = nextToken;
    } catch (error) {
      console.error("[Notifications] Failed to refresh", error);
    } finally {
      requestInFlightRef.current = false;
    }
  }, [tryPendingSound]);

  const updatePosition = useCallback(() => {
    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const width = Math.min(POPOVER_WIDTH, viewportWidth - SCREEN_MARGIN * 2);
    const preferredLeft = rect.right - width;
    const left = Math.min(
      Math.max(SCREEN_MARGIN, preferredLeft),
      viewportWidth - width - SCREEN_MARGIN,
    );

    const availableBelow = viewportHeight - rect.bottom - SCREEN_MARGIN;
    const availableAbove = rect.top - SCREEN_MARGIN;
    const openAbove = availableBelow < 320 && availableAbove > availableBelow;
    const maxHeight = Math.max(240, Math.min(540, openAbove ? availableAbove - 8 : availableBelow - 8));
    const top = openAbove
      ? Math.max(SCREEN_MARGIN, rect.top - Math.min(500, maxHeight) - 8)
      : rect.bottom + 8;

    setPosition({ top, left, width, maxHeight });
  }, []);

  useLayoutEffect(() => {
    if (open) updatePosition();
  }, [open, updatePosition, items.length]);

  useEffect(() => {
    mountedRef.current = true;
    void load();

    const timer = window.setInterval(() => void load(), 30_000);
    const refresh = () => void load();
    const visibility = () => {
      if (document.visibilityState === "visible") void load();
    };
    const unlock = () => {
      void unlockAudio().then(() => tryPendingSound());
    };

    window.addEventListener("focus", refresh);
    window.addEventListener(REFRESH_EVENT, refresh);
    document.addEventListener("visibilitychange", visibility);
    document.addEventListener("pointerdown", unlock, { once: true, capture: true });
    document.addEventListener("keydown", unlock, { once: true, capture: true });

    return () => {
      mountedRef.current = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener(REFRESH_EVENT, refresh);
      document.removeEventListener("visibilitychange", visibility);
      document.removeEventListener("pointerdown", unlock, true);
      document.removeEventListener("keydown", unlock, true);
    };
  }, [load, tryPendingSound]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !buttonRef.current?.contains(target) &&
        !popoverRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const reposition = () => updatePosition();

    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open, updatePosition]);

  const openItem = async (item: AppNotification) => {
    try {
      if (!item.is_read) await notificationsService.markRead(item.id);
      setOpen(false);
      await load();
      navigate(item.action_path || PATHS.NOTIFICATIONS);
    } catch (error) {
      notifyError(error, { title: "تعذر فتح الإشعار" });
    }
  };

  const markAllRead = async () => {
    try {
      await notificationsService.markAllRead();
      await load();
    } catch (error) {
      notifyError(error, { title: "تعذر تحديث الإشعارات" });
    }
  };

  const dismiss = async (id: number) => {
    try {
      await notificationsService.dismiss(id);
      await load();
    } catch (error) {
      notifyError(error, { title: "تعذر إخفاء الإشعار" });
    }
  };

  const popover = open
    ? createPortal(
        <div
          ref={popoverRef}
          dir="rtl"
          className="fixed z-[10000] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl"
          style={{
            top: position.top,
            left: position.left,
            width: position.width,
            maxHeight: position.maxHeight,
          }}
        >
          <div className="flex items-center justify-between border-b border-[var(--border)] p-4">
            <div>
              <h3 className="font-bold text-[var(--text-primary)]">الإشعارات</h3>
              <p className="text-xs text-[var(--text-muted)]">
                {count} غير مقروء
              </p>
            </div>
            <button
              type="button"
              title="تحديد الكل كمقروء"
              onClick={() => void markAllRead()}
              className="rounded-lg p-2 hover:bg-[var(--surface-muted)]"
            >
              <CheckCheck size={18} />
            </button>
          </div>

          <div
            className="overflow-y-auto"
            style={{ maxHeight: Math.max(170, position.maxHeight - 106) }}
          >
            {items.length === 0 ? (
              <p className="p-8 text-center text-sm text-[var(--text-muted)]">
                لا توجد إشعارات جديدة.
              </p>
            ) : (
              items.map((item) => (
                <div
                  key={`${item.id}:${item.generation ?? 1}`}
                  className={`flex gap-3 border-b border-[var(--border)] p-4 ${
                    item.is_read ? "" : "bg-[var(--primary-subtle)]"
                  }`}
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-right"
                    onClick={() => void openItem(item)}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${
                          item.severity === "error"
                            ? "bg-red-500"
                            : item.severity === "warning"
                              ? "bg-amber-500"
                              : "bg-blue-500"
                        }`}
                      />
                      <strong className="text-sm text-[var(--text-primary)]">
                        {item.title}
                      </strong>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--text-muted)]">
                      {item.body}
                    </p>
                  </button>
                  <button
                    type="button"
                    title="إخفاء حتى تتغير الحالة"
                    onClick={() => void dismiss(item.id)}
                    className="self-start rounded p-1 text-[var(--text-muted)] hover:text-red-600"
                  >
                    <X size={15} />
                  </button>
                </div>
              ))
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate(PATHS.NOTIFICATIONS);
            }}
            className="flex w-full items-center justify-center gap-2 border-t border-[var(--border)] p-3 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--surface-muted)]"
          >
            عرض كل الإشعارات <ExternalLink size={15} />
          </button>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={count ? `الإشعارات، ${count} غير مقروء` : "الإشعارات"}
        onClick={() => setOpen((value) => !value)}
        className="relative inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--surface-subtle)] hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30"
      >
        <Bell size={18} />
        {count > 0 && (
          <span
            aria-hidden="true"
            className="absolute right-0.5 top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--surface)] bg-red-600"
          />
        )}
      </button>
      {popover}
    </>
  );
}
