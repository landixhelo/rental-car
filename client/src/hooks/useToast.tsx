import { useEffect, useState } from "react";

export function useToast() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 3000);
    return () => clearTimeout(t);
  }, [message]);

  return {
    message,
    show: (msg: string) => setMessage(msg),
    Toast: message ? <div className="toast show">{message}</div> : null,
  };
}
