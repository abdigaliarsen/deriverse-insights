import { useState } from "react";
import { TagDefinition } from "@/hooks/use-trade-tags";
import { X, Plus, Tag } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { sanitizeInput } from "@/lib/sanitize";

interface TagManagerProps {
  tags: TagDefinition[];
  selectedTagIds: string[];
  onToggleTag: (tagId: string) => void;
  onAddTag: (name: string) => void;
  onRemoveTag: (id: string) => void;
}

export function TagManager({ tags, selectedTagIds, onToggleTag, onAddTag, onRemoveTag }: TagManagerProps) {
  const [newTagName, setNewTagName] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const handleAdd = () => {
    const name = sanitizeInput(newTagName.trim(), 30);
    if (name && !tags.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
      onAddTag(name);
      setNewTagName("");
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <Tag className="h-3 w-3" />
          Tags
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-56 p-2"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-1">
          {tags.map((tag) => {
            const isSelected = selectedTagIds.includes(tag.id);
            return (
              <div key={tag.id} className="flex items-center gap-1.5 group">
                <button
                  onClick={() => onToggleTag(tag.id)}
                  className={`flex-1 flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors ${
                    isSelected ? "bg-primary/20 text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                  {tag.name}
                </button>
                <button
                  onClick={() => onRemoveTag(tag.id)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-loss transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex gap-1 mt-2 pt-2 border-t border-border">
          <input
            type="text"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="New tag..."
            maxLength={30}
            className="flex-1 bg-background border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            onClick={handleAdd}
            disabled={!newTagName.trim()}
            className="p-1 rounded bg-primary text-primary-foreground disabled:opacity-30 hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface TagBadgesProps {
  tags: TagDefinition[];
  tagIds: string[];
}

export function TagBadges({ tags, tagIds }: TagBadgesProps) {
  if (tagIds.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-0.5">
      {tagIds.map((id) => {
        const tag = tags.find((t) => t.id === id);
        if (!tag) return null;
        return (
          <span
            key={id}
            className="px-1.5 py-0 rounded text-[9px] font-medium"
            style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
          >
            {tag.name}
          </span>
        );
      })}
    </div>
  );
}
