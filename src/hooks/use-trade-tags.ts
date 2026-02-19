import { useLocalStorage } from "./use-local-storage";
import { validateLocalStorageData, tagDefinitionsSchema, tradeTagMappingSchema } from "@/lib/sanitize";

export interface TagDefinition {
  id: string;
  name: string;
  color: string;
}

const DEFAULT_TAGS: TagDefinition[] = [
  { id: "breakout", name: "Breakout", color: "hsl(175 80% 50%)" },
  { id: "reversal", name: "Reversal", color: "hsl(270 60% 60%)" },
  { id: "scalp", name: "Scalp", color: "hsl(38 92% 55%)" },
  { id: "swing", name: "Swing", color: "hsl(145 65% 48%)" },
  { id: "momentum", name: "Momentum", color: "hsl(0 72% 55%)" },
];

const TAG_COLORS = [
  "hsl(175 80% 50%)",
  "hsl(270 60% 60%)",
  "hsl(38 92% 55%)",
  "hsl(145 65% 48%)",
  "hsl(0 72% 55%)",
  "hsl(200 80% 55%)",
  "hsl(320 70% 55%)",
  "hsl(60 80% 50%)",
];

export function useTradeTags() {
  const [rawTags, setRawTags] = useLocalStorage<TagDefinition[]>("deriverse-tag-definitions", DEFAULT_TAGS);
  const [rawMappings, setRawMappings] = useLocalStorage<Record<string, string[]>>("deriverse-trade-tags", {});

  const tags = validateLocalStorageData(rawTags, tagDefinitionsSchema, DEFAULT_TAGS);
  const mappings = validateLocalStorageData(rawMappings, tradeTagMappingSchema, {});

  const addTag = (name: string) => {
    const id = `tag-${Date.now()}`;
    const colorIdx = tags.length % TAG_COLORS.length;
    setRawTags([...tags, { id, name, color: TAG_COLORS[colorIdx] }]);
  };

  const removeTag = (id: string) => {
    setRawTags(tags.filter((t) => t.id !== id));
    // Clean up mappings
    const newMappings = { ...mappings };
    for (const tradeId of Object.keys(newMappings)) {
      newMappings[tradeId] = newMappings[tradeId].filter((tagId) => tagId !== id);
      if (newMappings[tradeId].length === 0) delete newMappings[tradeId];
    }
    setRawMappings(newMappings);
  };

  const toggleTradeTag = (tradeId: string, tagId: string) => {
    const current = mappings[tradeId] || [];
    const updated = current.includes(tagId)
      ? current.filter((id) => id !== tagId)
      : [...current, tagId];
    setRawMappings({ ...mappings, [tradeId]: updated });
  };

  const getTradeTagIds = (tradeId: string): string[] => {
    return mappings[tradeId] || [];
  };

  return { tags, mappings, addTag, removeTag, toggleTradeTag, getTradeTagIds, TAG_COLORS };
}
