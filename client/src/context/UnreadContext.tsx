import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "../lib/api";
import { badgeLabel, syncAppBadge } from "../lib/appBadge";
import { useAuth } from "./AuthContext";

type UnreadCtx = {
  count: number;
  label: string;
  refresh: () => Promise<void>;
  markSeen: () => Promise<void>;
};

const UnreadContext = createContext<UnreadCtx>({
  count: 0,
  label: "",
  refresh: async () => {},
  markSeen: async () => {},
});

export function useUnreadNotifications() {
  return useContext(UnreadContext);
}

export function UnreadProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const enabled = Boolean(user);

  const apply = useCallback((n: number) => {
    setCount(n);
    syncAppBadge(n);
  }, []);

  const refresh = useCallback(async () => {
    if (!enabled) {
      apply(0);
      return;
    }
    try {
      const res = await api.unreadReservationCount();
      apply(res.count || 0);
    } catch {
      // ignore
    }
  }, [enabled, apply]);

  const markSeen = useCallback(async () => {
    apply(0);
    try {
      await api.markReservationNotificationsRead();
    } catch {
      // ignore
    }
  }, [apply]);

  useEffect(() => {
    refresh();
    if (!enabled) return;
    const onFocus = () => {
      refresh();
    };
    const onSeen = () => apply(0);
    const interval = window.setInterval(refresh, 20000);
    window.addEventListener("focus", onFocus);
    window.addEventListener("autorent:reservations-seen", onSeen);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("autorent:reservations-seen", onSeen);
    };
  }, [enabled, refresh, apply]);

  const value = useMemo(
    () => ({
      count,
      label: badgeLabel(count),
      refresh,
      markSeen,
    }),
    [count, refresh, markSeen]
  );

  return (
    <UnreadContext.Provider value={value}>{children}</UnreadContext.Provider>
  );
}
