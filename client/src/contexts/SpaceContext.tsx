import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { api, setCurrentSpaceId } from "../lib/api";

export interface Space {
  id: number;
  name: string;
  color: string;
  icon: string | null;
  sortOrder: number;
  createdAt: string;
  todoCount: number;
}

interface SpaceContextValue {
  spaces: Space[];
  currentSpaceId: number | null;
  currentSpace: Space | null;
  loading: boolean;
  switchSpace: (id: number) => void;
  refreshSpaces: () => Promise<void>;
}

const SpaceContext = createContext<SpaceContextValue | null>(null);

const STORAGE_KEY = "devtodo-space";

export function SpaceProvider({ children }: { children: ReactNode }) {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [currentSpaceId, setCurrentSpaceIdState] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSpaces = useCallback(async () => {
    try {
      const list = await api.get<Space[]>("/api/spaces");
      setSpaces(list);

      // Pick current space
      const stored = localStorage.getItem(STORAGE_KEY);
      const storedId = stored ? parseInt(stored, 10) : null;
      const valid = list.find((s) => s.id === storedId);
      const next = valid ? valid.id : list[0]?.id ?? null;

      if (next !== currentSpaceId) {
        setCurrentSpaceIdState(next);
        setCurrentSpaceId(next);
        if (next) localStorage.setItem(STORAGE_KEY, String(next));
      }
    } catch (err) {
      console.error("Failed to load spaces:", err);
    } finally {
      setLoading(false);
    }
  }, [currentSpaceId]);

  useEffect(() => {
    refreshSpaces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchSpace = useCallback((id: number) => {
    setCurrentSpaceIdState(id);
    setCurrentSpaceId(id);
    localStorage.setItem(STORAGE_KEY, String(id));
  }, []);

  const currentSpace = spaces.find((s) => s.id === currentSpaceId) || null;

  return (
    <SpaceContext.Provider
      value={{
        spaces,
        currentSpaceId,
        currentSpace,
        loading,
        switchSpace,
        refreshSpaces,
      }}
    >
      {children}
    </SpaceContext.Provider>
  );
}

export function useSpace() {
  const ctx = useContext(SpaceContext);
  if (!ctx) throw new Error("useSpace must be used within SpaceProvider");
  return ctx;
}
