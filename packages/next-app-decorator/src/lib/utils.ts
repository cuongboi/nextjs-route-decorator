import { SchemaObject } from "openapi3-ts/oas30";
import { z } from "zod";

export function isPlainObject(value: any): value is object {
  return (
    value !== null &&
    typeof value === "object" &&
    Object.prototype.toString.call(value) === "[object Object]"
  );
}

export function deepMergeObjects<T extends object>(
  target: T,
  ...sources: Partial<T>[]
): T {
  // Return target if no sources provided
  if (sources.length === 0) {
    return target;
  }

  const source = sources.shift();

  // Skip if source is undefined/null
  if (!source) {
    return deepMergeObjects(target, ...sources);
  }

  // Ensure target is an object
  if (!isPlainObject(target)) {
    throw new Error("Target must be a plain object");
  }

  // Process each property in source
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const targetValue = (target as any)[key];
      const sourceValue = source[key];

      // Only merge if sourceValue is a plain object
      if (isPlainObject(sourceValue) && sourceValue !== null) {
        if (isPlainObject(targetValue)) {
          // Recursively merge objects
          (target as any)[key] = deepMergeObjects(targetValue, sourceValue);
        } else {
          // Create new object if target doesn't have one
          (target as any)[key] = deepMergeObjects({}, sourceValue);
        }
      } else {
        // Directly assign non-object values
        (target as any)[key] = sourceValue;
      }
    }
  }

  // Continue with remaining sources
  return deepMergeObjects(target, ...sources);
}

export const joinPath = (...paths: string[]) => {
  return ("/" +
    paths
      .map((path) => String(path).replace(/^\/|\/$/g, ""))
      .filter((path) => path?.length > 0)
      .join("/")) as `/${string}`;
};

export const purify = (input: string | File) => {
  if (input instanceof File) return input;

  if (input === "undefined") return undefined;
  if (input === "true" || input === "false") return input === "true";

  if (/^[\d|\.\,\e]+$/.test(input)) return Number(input);

  const dateValue = new Date(input);
  if (!isNaN(dateValue.getTime())) return dateValue;

  return input;
};

const getBaseProps = (schema: z.ZodTypeAny) => ({
  ...(schema._def.description && { description: schema._def.description }),
  ...(schema instanceof z.ZodDefault && {
    example: schema._def.defaultValue(),
  }),
});

export function zodToOpenAPI(zodSchema: z.ZodTypeAny): SchemaObject {
  if (zodSchema instanceof z.ZodEffects) {
    zodSchema = zodSchema._def.schema;
  }

  if (zodSchema instanceof z.ZodOptional) {
    zodSchema = zodSchema._def.innerType;
  }

  if (zodSchema instanceof z.ZodString) {
    return {
      type: "string",
      ...getBaseProps(zodSchema),
    };
  }

  if (zodSchema instanceof z.ZodNumber) {
    return {
      type: "number",
      ...getBaseProps(zodSchema),
    };
  }

  if (zodSchema instanceof z.ZodBoolean) {
    return {
      type: "boolean",
      ...getBaseProps(zodSchema),
    };
  }

  if (zodSchema?._def.typeName === "ZodArray") {
    return {
      type: "array",
      items: zodToOpenAPI(zodSchema._def.type),
      ...getBaseProps(zodSchema),
    };
  }

  if (zodSchema._def.typeName === "ZodObject") {
    const shape = zodSchema._def.shape();

    return {
      type: "object",
      properties: Object.fromEntries(
        Object.entries(shape).map(([key, value]) => [
          key,
          zodToOpenAPI(value as z.ZodTypeAny),
        ])
      ),
      required: Object.entries(shape)
        .filter(([_, value]) => !(value instanceof z.ZodOptional))
        .map(([key]) => key),
      ...getBaseProps(zodSchema),
    };
  }

  // Default fallback
  return {
    type: "string",
    ...getBaseProps(zodSchema),
  };
}
