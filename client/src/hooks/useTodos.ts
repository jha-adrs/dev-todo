import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";
import { useSpace } from "../contexts/SpaceContext";

export type Priority = "highest" | "high" | "medium" | "low" | "lowest";

export interface TagInfo {
  id: number;
  name: string;
  color: string;
}

export interface Todo {
  id: number;
  title: string;
  description: string | null;
  status: "pending" | "in_progress" | "completed";
  priority: Priority;
  pinned: number;
  sortOrder: number;
  snoozedUntil: string | null;
  createdAt: string;
  completedAt: string | null;
  dueDate: string;
  overdueDays?: number;
  tags: TagInfo[];
}

interface TodosResponse {
  today: Todo[];
  backlog: Todo[];
  snoozedCount: number;
}

export function useTodos(date?: string) {
  const { currentSpaceId } = useSpace();
  const [today, setToday] = useState<Todo[]>([]);
  const [backlog, setBacklog] = useState<Todo[]>([]);
  const [snoozedCount, setSnoozedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchTodos = useCallback(async () => {
    if (!currentSpaceId) return;
    try {
      const url = date ? `/api/todos?date=${date}` : "/api/todos";
      const data = await api.get<TodosResponse>(url);
      setToday(data.today);
      setBacklog(data.backlog);
      setSnoozedCount(data.snoozedCount || 0);
    } catch (err) {
      console.error("Failed to fetch todos:", err);
    } finally {
      setLoading(false);
    }
  }, [date, currentSpaceId]);

  useEffect(() => {
    setLoading(true);
    fetchTodos();
  }, [fetchTodos]);

  const createTodo = useCallback(
    async (title: string) => {
      // Optimistic: add to front
      const tempId = -Date.now();
      const optimistic: Todo = {
        id: tempId,
        title,
        description: null,
        status: "pending",
        priority: "medium",
        pinned: 0,
        sortOrder: 0,
        snoozedUntil: null,
        createdAt: new Date().toISOString(),
        completedAt: null,
        dueDate: new Date().toISOString().split("T")[0],
        tags: [],
      };
      setToday((prev) => [optimistic, ...prev]);

      try {
        const created = await api.post<Todo>("/api/todos", { title });
        setToday((prev) =>
          prev.map((t) => (t.id === tempId ? created : t)),
        );
        return created;
      } catch (err) {
        setToday((prev) => prev.filter((t) => t.id !== tempId));
        throw err;
      }
    },
    [],
  );

  const updateTodo = useCallback(
    async (id: number, fields: Partial<Pick<Todo, "title" | "description" | "status" | "priority" | "dueDate" | "pinned" | "snoozedUntil">>) => {
      // Optimistic update
      const updateList = (list: Todo[]) =>
        list.map((t) => {
          if (t.id !== id) return t;
          const updated = { ...t, ...fields };
          if (fields.status === "completed" && t.status !== "completed") {
            updated.completedAt = new Date().toISOString();
          } else if (fields.status && fields.status !== "completed" && t.status === "completed") {
            updated.completedAt = null;
          }
          return updated;
        });

      setToday(updateList);
      setBacklog(updateList);

      try {
        const updated = await api.patch<Todo>(`/api/todos/${id}`, fields);
        setToday((prev) => prev.map((t) => (t.id === id ? updated : t)));
        setBacklog((prev) => prev.map((t) => (t.id === id ? updated : t)));
        return updated;
      } catch {
        // Revert on failure
        await fetchTodos();
      }
    },
    [fetchTodos],
  );

  const deleteTodo = useCallback(
    async (id: number) => {
      // Optimistic remove
      setToday((prev) => prev.filter((t) => t.id !== id));
      setBacklog((prev) => prev.filter((t) => t.id !== id));

      try {
        await api.delete(`/api/todos/${id}`);
      } catch {
        await fetchTodos();
      }
    },
    [fetchTodos],
  );

  const stats = {
    total: today.length,
    completed: today.filter((t) => t.status === "completed").length,
    backlogCount: backlog.length,
    snoozedCount,
  };

  return { today, backlog, snoozedCount, loading, stats, createTodo, updateTodo, deleteTodo, fetchTodos };
}
