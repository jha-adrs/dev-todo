import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { useEffect, useRef, useCallback } from "react";
import { Paperclip } from "lucide-react";
import { api } from "../lib/api";

const lowlight = createLowlight(common);

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface RichTextEditorProps {
  content: string | null;
  onChange: (html: string) => void;
  editable?: boolean;
  todoId?: number; // Used to detect todo switches
}

export default function RichTextEditor({
  content,
  onChange,
  editable = true,
  todoId,
}: RichTextEditorProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const isSettingContent = useRef(false);

  const uploadFile = useCallback(async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const result = await api.upload<{
      url: string;
      isImage: boolean;
      originalName: string;
      size: number;
    }>("/api/upload", formData);
    return result;
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      CodeBlockLowlight.configure({ lowlight }),
      Link.configure({ openOnClick: false }),
      Image,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: "Add a description..." }),
    ],
    content: content || "",
    editable,
    editorProps: {
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of items) {
          if (item.type.startsWith("image/")) {
            event.preventDefault();
            const file = item.getAsFile();
            if (file) {
              uploadFile(file).then((result) => {
                view.dispatch(
                  view.state.tr.replaceSelectionWith(
                    view.state.schema.nodes.image.create({ src: result.url }),
                  ),
                );
              });
            }
            return true;
          }
        }
        return false;
      },
      handleDrop: (view, event) => {
        const files = event.dataTransfer?.files;
        if (!files?.length) return false;
        for (const file of files) {
          event.preventDefault();
          uploadFile(file).then((result) => {
            const pos = view.posAtCoords({ left: event.clientX, top: event.clientY });
            const insertPos = pos ? pos.pos : view.state.selection.from;
            if (result.isImage) {
              view.dispatch(
                view.state.tr.insert(
                  insertPos,
                  view.state.schema.nodes.image.create({ src: result.url }),
                ),
              );
            } else {
              // Insert file as a link
              const linkText = `📎 ${result.originalName} (${formatFileSize(result.size)})`;
              const node = view.state.schema.text(linkText).mark([
                view.state.schema.marks.link.create({ href: result.url }),
              ]);
              view.dispatch(view.state.tr.insert(insertPos, node));
            }
          });
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      if (isSettingContent.current) return;
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onChange(editor.getHTML());
      }, 500);
    },
  });

  // Fix caching bug: update editor content when todoId changes
  useEffect(() => {
    if (editor && todoId !== undefined) {
      isSettingContent.current = true;
      editor.commands.setContent(content || "");
      isSettingContent.current = false;
    }
  }, [todoId, editor]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

  if (!editor) return null;

  return (
    <div>
      {/* Toolbar */}
      {editable && (
        <div
          style={{
            display: "flex",
            gap: "2px",
            padding: "8px 10px",
            borderBottom: "1px solid var(--border)",
            backgroundColor: "var(--bg)",
            borderRadius: "8px 8px 0 0",
            flexWrap: "wrap",
          }}
        >
          <ToolbarBtn
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Bold"
          >
            B
          </ToolbarBtn>
          <ToolbarBtn
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Italic"
          >
            <em>I</em>
          </ToolbarBtn>
          <ToolbarBtn
            active={editor.isActive("strike")}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            title="Strikethrough"
          >
            <s>S</s>
          </ToolbarBtn>
          <div style={{ width: "1px", backgroundColor: "var(--border)", margin: "2px 4px" }} />
          <ToolbarBtn
            active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Bullet list"
          >
            •
          </ToolbarBtn>
          <ToolbarBtn
            active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="Numbered list"
          >
            1.
          </ToolbarBtn>
          <ToolbarBtn
            active={editor.isActive("taskList")}
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            title="Checklist"
          >
            ☑
          </ToolbarBtn>
          <div style={{ width: "1px", backgroundColor: "var(--border)", margin: "2px 4px" }} />
          <ToolbarBtn
            active={editor.isActive("codeBlock")}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            title="Code block"
          >
            {"</>"}
          </ToolbarBtn>
          <ToolbarBtn
            active={editor.isActive("code")}
            onClick={() => editor.chain().focus().toggleCode().run()}
            title="Inline code"
          >
            `c`
          </ToolbarBtn>
          <ToolbarBtn
            active={editor.isActive("blockquote")}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            title="Quote"
          >
            "
          </ToolbarBtn>
          <div style={{ width: "1px", backgroundColor: "var(--border)", margin: "2px 4px" }} />
          <ToolbarBtn
            active={false}
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = "*/*";
              input.onchange = async () => {
                const file = input.files?.[0];
                if (!file) return;
                const result = await uploadFile(file);
                if (result.isImage) {
                  editor.chain().focus().setImage({ src: result.url }).run();
                } else {
                  const linkText = `📎 ${result.originalName} (${formatFileSize(result.size)})`;
                  editor
                    .chain()
                    .focus()
                    .insertContent({
                      type: "text",
                      text: linkText,
                      marks: [{ type: "link", attrs: { href: result.url } }],
                    })
                    .run();
                }
              };
              input.click();
            }}
            title="Attach file"
          >
            <Paperclip size={13} />
          </ToolbarBtn>
        </div>
      )}

      {/* Editor */}
      <EditorContent
        editor={editor}
        style={{
          padding: "12px 14px",
          minHeight: "200px",
          backgroundColor: "var(--bg-card)",
          borderRadius: editable ? "0 0 8px 8px" : "8px",
          border: "1px solid var(--border)",
          borderTop: editable ? "none" : undefined,
        }}
      />

      {/* Image controls - shown when image is selected */}
      {editable && editor && editor.isActive("image") && (
        <div
          style={{
            display: "flex",
            gap: "4px",
            padding: "6px 10px",
            backgroundColor: "var(--bg)",
            border: "1px solid var(--border)",
            borderTop: "none",
            borderRadius: "0 0 8px 8px",
            justifyContent: "center",
          }}
        >
          <span style={{ fontSize: "11px", color: "var(--text-muted)", marginRight: "6px", alignSelf: "center" }}>Image:</span>
          {[
            { label: "Small", width: "50%" },
            { label: "Medium", width: "75%" },
            { label: "Full", width: "100%" },
          ].map((size) => (
            <button
              key={size.label}
              onClick={() => {
                editor.chain().focus().updateAttributes("image", {
                  style: `max-width: ${size.width}`,
                }).run();
              }}
              style={{
                padding: "3px 8px",
                fontSize: "10px",
                fontWeight: 600,
                fontFamily: "var(--font-mono)",
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "4px",
                color: "var(--text-secondary)",
                cursor: "pointer",
              }}
            >
              {size.label}
            </button>
          ))}
          <button
            onClick={() => editor.chain().focus().deleteSelection().run()}
            style={{
              padding: "3px 8px",
              fontSize: "10px",
              fontWeight: 600,
              backgroundColor: "var(--color-danger-dim)",
              border: "1px solid var(--color-danger)",
              borderRadius: "4px",
              color: "var(--color-danger)",
              cursor: "pointer",
              marginLeft: "4px",
            }}
          >
            Remove
          </button>
        </div>
      )}

      <style>{`
        .tiptap {
          outline: none;
          font-size: 14px;
          line-height: 1.7;
          color: var(--text-primary);
        }
        .tiptap p { margin: 0 0 8px; }
        .tiptap p:last-child { margin: 0; }
        .tiptap h1, .tiptap h2, .tiptap h3 {
          font-weight: 700;
          margin: 16px 0 8px;
          color: var(--text-primary);
        }
        .tiptap h1 { font-size: 20px; }
        .tiptap h2 { font-size: 17px; }
        .tiptap h3 { font-size: 15px; }

        /* Fix: bullet and number list markers */
        .tiptap ul {
          list-style-type: disc;
          padding-left: 24px;
          margin: 6px 0;
        }
        .tiptap ol {
          list-style-type: decimal;
          padding-left: 24px;
          margin: 6px 0;
        }
        .tiptap ul ul { list-style-type: circle; }
        .tiptap ul ul ul { list-style-type: square; }
        .tiptap li {
          margin: 3px 0;
          color: var(--text-primary);
        }
        .tiptap li::marker {
          color: var(--text-secondary);
        }
        .tiptap li p {
          margin: 0;
        }

        /* Inline code */
        .tiptap code {
          background: var(--bg);
          padding: 2px 6px;
          border-radius: 4px;
          font-family: var(--font-mono);
          font-size: 13px;
          color: var(--color-primary-light);
          border: 1px solid var(--border);
        }

        /* Code blocks */
        .tiptap pre {
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 14px;
          margin: 10px 0;
          overflow-x: auto;
        }
        .tiptap pre code {
          background: transparent;
          padding: 0;
          border: none;
          font-size: 13px;
          color: var(--text-primary);
          line-height: 1.5;
        }

        /* Blockquote */
        .tiptap blockquote {
          border-left: 3px solid var(--color-primary);
          padding-left: 14px;
          margin: 10px 0;
          color: var(--text-secondary);
          font-style: italic;
        }

        /* Images - with hover controls */
        .tiptap img {
          max-width: 100%;
          border-radius: 8px;
          margin: 10px 0;
          cursor: pointer;
          transition: opacity 0.15s;
        }
        .tiptap img:hover {
          opacity: 0.9;
        }
        .tiptap img.ProseMirror-selectednode {
          outline: 2px solid var(--color-primary);
          outline-offset: 2px;
        }

        /* Task list (checkboxes) */
        .tiptap ul[data-type="taskList"] {
          list-style: none;
          padding-left: 0;
        }
        .tiptap ul[data-type="taskList"] li {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          margin: 4px 0;
        }
        .tiptap ul[data-type="taskList"] li label {
          margin-top: 3px;
        }
        .tiptap ul[data-type="taskList"] li label input[type="checkbox"] {
          width: 16px;
          height: 16px;
          accent-color: var(--color-primary);
          cursor: pointer;
        }
        .tiptap ul[data-type="taskList"] li[data-checked="true"] > div > p {
          text-decoration: line-through;
          color: var(--text-muted);
        }

        /* Links */
        .tiptap a {
          color: var(--color-primary-light);
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        /* Placeholder */
        .tiptap p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: var(--text-muted);
          pointer-events: none;
          height: 0;
        }

        /* Strong text should be clearly visible */
        .tiptap strong {
          font-weight: 700;
          color: var(--text-primary);
        }
        .tiptap em {
          font-style: italic;
        }

        /* Horizontal rule */
        .tiptap hr {
          border: none;
          border-top: 1px solid var(--border);
          margin: 16px 0;
        }

        /* Syntax highlighting */
        .tiptap .hljs-keyword { color: #c678dd; }
        .tiptap .hljs-string { color: #98c379; }
        .tiptap .hljs-comment { color: #7f848e; font-style: italic; }
        .tiptap .hljs-number { color: #d19a66; }
        .tiptap .hljs-function { color: #61afef; }
        .tiptap .hljs-title { color: #e5c07b; }
        .tiptap .hljs-built_in { color: #56b6c2; }
        .tiptap .hljs-attr { color: #d19a66; }
        .tiptap .hljs-variable { color: #e06c75; }
      `}</style>
    </div>
  );
}

function ToolbarBtn({
  children,
  active,
  onClick,
  title,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        padding: "5px 9px",
        backgroundColor: active ? "var(--color-primary-dim)" : "transparent",
        border: "1px solid " + (active ? "var(--color-primary-border)" : "transparent"),
        borderRadius: "4px",
        color: active ? "var(--color-primary-light)" : "var(--text-primary)",
        fontSize: "13px",
        fontWeight: 600,
        cursor: "pointer",
        fontFamily: "var(--font-mono)",
        lineHeight: 1,
        transition: "all 0.15s",
      }}
    >
      {children}
    </button>
  );
}
