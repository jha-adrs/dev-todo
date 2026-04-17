import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";
import { useSpace } from "../contexts/SpaceContext";

export interface Note {
  id: number;
  spaceId: number;
  title: string;
  content: string | null;
  pinned: number;
  archived: number;
  createdAt: string;
  updatedAt: string;
}

export function useNotes() {
  const { currentSpaceId } = useSpace();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);

  const fetchNotes = useCallback(async () => {
    if (!currentSpaceId) return;
    try {
      const url = showArchived ? "/api/notes?archived=1" : "/api/notes";
      const data = await api.get<Note[]>(url);
      setNotes(data);
    } catch (err) {
      console.error("Failed to fetch notes:", err);
    } finally {
      setLoading(false);
    }
  }, [currentSpaceId, showArchived]);

  useEffect(() => {
    setLoading(true);
    fetchNotes();
  }, [fetchNotes]);

  const createNote = useCallback(async () => {
    const note = await api.post<Note>("/api/notes", {});
    setNotes((prev) => [note, ...prev]);
    return note;
  }, []);

  const updateNote = useCallback(
    async (id: number, fields: Partial<Pick<Note, "title" | "content" | "pinned" | "archived">>) => {
      // Optimistic update
      setNotes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, ...fields, updatedAt: new Date().toISOString() } : n)),
      );
      try {
        const updated = await api.patch<Note>(`/api/notes/${id}`, fields);
        // Re-fetch to get correct filtered list (archived notes leave/enter based on showArchived)
        if (fields.archived !== undefined) {
          await fetchNotes();
        } else {
          setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
        }
        return updated;
      } catch {
        await fetchNotes();
      }
    },
    [fetchNotes],
  );

  const deleteNote = useCallback(
    async (id: number) => {
      setNotes((prev) => prev.filter((n) => n.id !== id));
      try {
        await api.delete(`/api/notes/${id}`);
      } catch {
        await fetchNotes();
      }
    },
    [fetchNotes],
  );

  return { notes, loading, showArchived, setShowArchived, createNote, updateNote, deleteNote, fetchNotes };
}
