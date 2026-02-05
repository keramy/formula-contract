"use client";

import * as React from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Toggle } from "./toggle";
import { Separator } from "./separator";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  CheckSquare,
  Link as LinkIcon,
  Link2Off,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Minus,
  Undo,
  Redo,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover";
import { Input } from "./input";

// ============================================================================
// TOOLBAR BUTTON - Individual toolbar button component
// ============================================================================

interface ToolbarButtonProps {
  icon: React.ReactNode;
  isActive?: boolean;
  onClick: () => void;
  tooltip?: string;
  disabled?: boolean;
}

function ToolbarButton({ icon, isActive, onClick, tooltip, disabled }: ToolbarButtonProps) {
  return (
    <Toggle
      size="sm"
      pressed={isActive}
      onPressedChange={onClick}
      disabled={disabled}
      className="h-8 w-8 p-0 data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
      title={tooltip}
    >
      {icon}
    </Toggle>
  );
}

// ============================================================================
// LINK POPOVER - Popover for adding/editing links
// ============================================================================

interface LinkPopoverProps {
  editor: Editor;
}

function LinkPopover({ editor }: LinkPopoverProps) {
  const [open, setOpen] = React.useState(false);
  const [url, setUrl] = React.useState("");

  const setLink = React.useCallback(() => {
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
    setUrl("");
    setOpen(false);
  }, [editor, url]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Toggle
          size="sm"
          pressed={editor.isActive("link")}
          className="h-8 w-8 p-0 data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
          title="Add link"
        >
          <LinkIcon className="h-4 w-4" />
        </Toggle>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">URL</label>
          <div className="flex gap-2">
            <Input
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  setLink();
                }
              }}
            />
            <Button size="sm" onClick={setLink}>
              Add
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ============================================================================
// EDITOR TOOLBAR - Main toolbar component
// ============================================================================

interface EditorToolbarProps {
  editor: Editor | null;
}

function EditorToolbar({ editor }: EditorToolbarProps) {
  if (!editor) return null;

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-base-200 bg-base-50/50 p-1.5 rounded-t-lg">
      {/* Text formatting */}
      <ToolbarButton
        icon={<Bold className="h-4 w-4" />}
        isActive={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
        tooltip="Bold (Ctrl+B)"
      />
      <ToolbarButton
        icon={<Italic className="h-4 w-4" />}
        isActive={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        tooltip="Italic (Ctrl+I)"
      />
      <ToolbarButton
        icon={<Strikethrough className="h-4 w-4" />}
        isActive={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        tooltip="Strikethrough"
      />
      <ToolbarButton
        icon={<Code className="h-4 w-4" />}
        isActive={editor.isActive("code")}
        onClick={() => editor.chain().focus().toggleCode().run()}
        tooltip="Inline code"
      />

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* Headings */}
      <ToolbarButton
        icon={<Heading1 className="h-4 w-4" />}
        isActive={editor.isActive("heading", { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        tooltip="Heading 1"
      />
      <ToolbarButton
        icon={<Heading2 className="h-4 w-4" />}
        isActive={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        tooltip="Heading 2"
      />
      <ToolbarButton
        icon={<Heading3 className="h-4 w-4" />}
        isActive={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        tooltip="Heading 3"
      />

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* Lists */}
      <ToolbarButton
        icon={<List className="h-4 w-4" />}
        isActive={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        tooltip="Bullet list"
      />
      <ToolbarButton
        icon={<ListOrdered className="h-4 w-4" />}
        isActive={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        tooltip="Numbered list"
      />
      <ToolbarButton
        icon={<CheckSquare className="h-4 w-4" />}
        isActive={editor.isActive("taskList")}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        tooltip="Task list"
      />

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* Block elements */}
      <ToolbarButton
        icon={<Quote className="h-4 w-4" />}
        isActive={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        tooltip="Quote"
      />
      <ToolbarButton
        icon={<Minus className="h-4 w-4" />}
        isActive={false}
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        tooltip="Horizontal rule"
      />

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* Links */}
      <LinkPopover editor={editor} />
      {editor.isActive("link") && (
        <ToolbarButton
          icon={<Link2Off className="h-4 w-4" />}
          isActive={false}
          onClick={() => editor.chain().focus().unsetLink().run()}
          tooltip="Remove link"
        />
      )}

      <div className="flex-1" />

      {/* Undo/Redo */}
      <ToolbarButton
        icon={<Undo className="h-4 w-4" />}
        isActive={false}
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        tooltip="Undo (Ctrl+Z)"
      />
      <ToolbarButton
        icon={<Redo className="h-4 w-4" />}
        isActive={false}
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        tooltip="Redo (Ctrl+Y)"
      />
    </div>
  );
}

// ============================================================================
// RICH TEXT EDITOR - Main component
// ============================================================================

export interface RichTextEditorProps {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  minHeight?: string;
  className?: string;
  autoFocus?: boolean;
}

export function RichTextEditor({
  value = "",
  onChange,
  placeholder = "Write something...",
  readOnly = false,
  minHeight = "150px",
  className,
  autoFocus = false,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: "is-editor-empty",
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline underline-offset-2 hover:text-primary/80",
        },
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
    ],
    content: value,
    editable: !readOnly,
    autofocus: autoFocus,
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm max-w-none focus:outline-none",
          "prose-headings:font-semibold prose-headings:text-foreground",
          "prose-p:text-foreground prose-p:leading-relaxed",
          "prose-strong:text-foreground prose-strong:font-semibold",
          "prose-ul:list-disc prose-ol:list-decimal",
          "prose-li:text-foreground",
          "prose-blockquote:border-l-4 prose-blockquote:border-primary/30 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-muted-foreground",
          "prose-code:bg-base-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono",
          "prose-hr:border-base-200"
        ),
      },
    },
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
  });

  // Update editor content when value prop changes externally
  React.useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [editor, value]);

  // Update editable state when readOnly changes
  React.useEffect(() => {
    if (editor) {
      editor.setEditable(!readOnly);
    }
  }, [editor, readOnly]);

  return (
    <div
      className={cn(
        "rounded-lg border border-base-200 bg-white overflow-hidden",
        "focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50",
        "transition-all duration-200",
        className
      )}
    >
      {!readOnly && <EditorToolbar editor={editor} />}
      <EditorContent
        editor={editor}
        className={cn("p-3", readOnly && "bg-base-50/30")}
        style={{ minHeight }}
      />
    </div>
  );
}

// ============================================================================
// RICH TEXT EDITOR STYLES - Global styles for the editor
// ============================================================================

// Add these styles to your globals.css:
// .ProseMirror p.is-editor-empty:first-child::before {
//   content: attr(data-placeholder);
//   float: left;
//   color: var(--muted-foreground);
//   pointer-events: none;
//   height: 0;
// }
//
// .ProseMirror ul[data-type="taskList"] {
//   list-style: none;
//   padding: 0;
// }
//
// .ProseMirror ul[data-type="taskList"] li {
//   display: flex;
//   align-items: flex-start;
//   gap: 0.5rem;
// }
//
// .ProseMirror ul[data-type="taskList"] li input[type="checkbox"] {
//   margin-top: 0.25rem;
// }

export default RichTextEditor;
