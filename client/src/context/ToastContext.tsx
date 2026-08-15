import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ToastContextValue = {
  show: (msg: string, durationMs?: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const [durationMs, setDurationMs] = useState(4500);
  const [tick, setTick] = useState(0);

  const show = useCallback((msg: string, ms = 4500) => {
    setDurationMs(ms);
    setMessage(msg);
    // Force timer restart even if the same message is shown again.
    setTick((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(() => setMessage(null), durationMs);
    return () => window.clearTimeout(t);
  }, [message, durationMs, tick]);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {message ? (
        <div className="toast show" role="status" aria-live="polite">
          {message}
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return {
    show: ctx.show,
    /** Toast UI is mounted by ToastProvider — keep for call-site compatibility. */
    Toast: null as ReactNode,
  };
}
