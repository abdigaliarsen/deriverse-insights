import { z } from "zod";

export function sanitizeInput(input: string, maxLength = 500): string {
  const stripped = input.replace(/<[^>]*>/g, "");
  return stripped.slice(0, maxLength);
}

export const tradeNotesSchema = z.record(z.string(), z.string().max(500));

export const tradeTagMappingSchema = z.record(z.string(), z.array(z.string()));

export const tagDefinitionSchema = z.object({
  id: z.string(),
  name: z.string().max(30),
  color: z.string().max(20),
});

export const tagDefinitionsSchema = z.array(tagDefinitionSchema);

export function validateLocalStorageData<T>(data: unknown, schema: z.ZodType<T>, fallback: T): T {
  const result = schema.safeParse(data);
  return result.success ? result.data : fallback;
}
