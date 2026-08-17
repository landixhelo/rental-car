import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Crumb } from "../components/Breadcrumbs";

type BreadcrumbCtx = {
  extra: Crumb[] | null;
  setExtra: (items: Crumb[] | null) => void;
};

const BreadcrumbContext = createContext<BreadcrumbCtx>({
  extra: null,
  setExtra: () => {},
});

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [extra, setExtra] = useState<Crumb[] | null>(null);
  const value = useMemo(() => ({ extra, setExtra }), [extra]);
  return (
    <BreadcrumbContext.Provider value={value}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

export function useBreadcrumbExtra() {
  return useContext(BreadcrumbContext).extra;
}

/** Override the trail after Home for this page (clears on unmount). */
export function usePageBreadcrumbs(items: Crumb[] | null) {
  const { setExtra } = useContext(BreadcrumbContext);
  const key = JSON.stringify(items);
  useEffect(() => {
    setExtra(items);
    return () => setExtra(null);
  }, [key, setExtra]);
}
