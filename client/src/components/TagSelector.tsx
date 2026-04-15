import { useState, useEffect, useRef } from "react";
import { Plus, X } from "lucide-react";
import { api } from "../lib/api";
import type { TagInfo } from "../hooks/useTodos";
import TagChip from "./TagChip";

interface AllTag extends TagInfo {
  usageCount: number;
  createdAt: string;
}

interface TagSelectorProps {
  todoId: number;
  currentTags: TagInfo[];
  onTagsChange: (tags: TagInfo[]) => void;
}

export default function TagSelector({ todoId, currentTags, onTagsChange }: TagSelectorProps) {
  const [allTags, setAllTags] = useState<AllTag[]>([]);
  const [open, setOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get<AllTag[]>("/api/tags").then(setAllTags).catch(console.error);
  }, []);

  const currentIds = new Set(currentTags.map((t) => t.id));
  const availableTags = allTags.filter((t) => !currentIds.has(t.id));
  const filtered = newTagName
    ? availableTags.filter((t) => t.name.toLowerCase().includes(newTagName.toLowerCase()))
    : availableTags;

  async function addTag(tagId: number) {
    const newIds = [...currentTags.map((t) => t.id), tagId];
    const result = await api.post<TagInfo[]>(`/api/tags/todo/${todoId}`, { tagIds: newIds });
    onTagsChange(result);
    setNewTagName("");
  }

  async function removeTag(tagId: number) {
    const newIds = currentTags.filter((t) => t.id !== tagId).map((t) => t.id);
    const result = await api.post<TagInfo[]>(`/api/tags/todo/${todoId}`, { tagIds: newIds });
    onTagsChange(result);
  }

  async function createAndAddTag() {
    if (!newTagName.trim()) return;
    try {
      const newTag = await api.post<AllTag>("/api/tags", { name: newTagName.trim() });
      setAllTags((prev) => [...prev, newTag]);
      await addTag(newTag.id);
    } catch {
      // Tag might already exist
    }
    setNewTagName("");
  }

  return (
    <div>
      {/* Current tags */}
      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "8px" }}>
        {currentTags.map((tag) => (
          <TagChip key={tag.id} tag={tag} size="md" onRemove={() => removeTag(tag.id)} />
        ))}
        <button
          onClick={() => {
            setOpen(!open);
            setTimeout(() => inputRef.current?.focus(), 50);
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "3px",
            padding: "2px 8px",
            fontSize: "11px",
            color: "var(--text-muted)",
            backgroundColor: "transparent",
            border: "1px dashed var(--border)",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          <Plus size={12} />
          Add tag
        </button>
      </div>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "8px",
            marginBottom: "8px",
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (filtered.length > 0) {
                  addTag(filtered[0].id);
                } else if (newTagName.trim()) {
                  createAndAddTag();
                }
              }
              if (e.key === "Escape") setOpen(false);
            }}
            placeholder="Search or create tag..."
            style={{
              width: "100%",
              padding: "6px 8px",
              backgroundColor: "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: "5px",
              color: "var(--text-primary)",
              fontSize: "12px",
              outline: "none",
              boxSizing: "border-box",
              marginBottom: "6px",
            }}
          />
          <div style={{ maxHeight: "120px", overflowY: "auto" }}>
            {filtered.map((tag) => (
              <div
                key={tag.id}
                onClick={() => addTag(tag.id)}
                style={{
                  padding: "5px 8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
              >
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: tag.color,
                    flexShrink: 0,
                  }}
                />
                <span style={{ color: "var(--text-primary)" }}>{tag.name}</span>
                <span style={{ color: "var(--text-dim)", fontSize: "10px", marginLeft: "auto", fontFamily: "var(--font-mono)" }}>
                  {tag.usageCount}
                </span>
              </div>
            ))}
            {newTagName.trim() && filtered.length === 0 && (
              <div
                onClick={createAndAddTag}
                style={{
                  padding: "5px 8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "12px",
                  color: "var(--color-primary-light)",
                }}
              >
                <Plus size={12} />
                Create "{newTagName.trim()}"
              </div>
            )}
            {!newTagName && availableTags.length === 0 && (
              <div style={{ padding: "8px", fontSize: "11px", color: "var(--text-muted)", textAlign: "center" }}>
                No more tags. Type to create one.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
