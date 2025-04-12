import type { SchemaObject } from "openapi3-ts/oas30";
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
  const baseProps = getBaseProps(zodSchema);

  if (zodSchema instanceof z.ZodDefault) {
    const innerSchema = zodToOpenAPI(zodSchema._def.innerType);
    return { ...innerSchema, ...baseProps };
  }

  if (zodSchema instanceof z.ZodEffects) {
    const innerSchema = zodToOpenAPI(zodSchema._def.schema);
    return { ...innerSchema, ...baseProps };
  }

  if (zodSchema instanceof z.ZodString) {
    const schema: any = { type: "string" };
    const checks = zodSchema._def.checks || [];
    for (const check of checks) {
      switch (check.kind) {
        case "min":
          schema.minLength = check.value;
          break;
        case "max":
          schema.maxLength = check.value;
          break;
        case "length":
          schema.minLength = schema.maxLength = check.value;
          break;
        case "regex":
          schema.pattern = check.regex.source;
          break;
        case "url":
          schema.format = "uri";
          break;
        case "datetime":
          schema.format = "date-time";
          break;
        case "startsWith":
          schema.pattern = `^${check.value}`;
          break;
        case "endsWith":
          schema.pattern = `${check.value}$`;
          break;
        case "ip":
          schema.format = check.version === "v6" ? "ipv6" : "ipv4";
          break;
        case "base64":
          schema.format = "byte";
          break;

        default:
          schema.format = check.kind;
      }
    }
    return { ...schema, ...baseProps };
  }

  if (zodSchema instanceof z.ZodNumber) {
    const schema: any = { type: "number" };
    const checks = zodSchema._def.checks || [];
    for (const check of checks) {
      switch (check.kind) {
        case "min":
          schema.minimum = check.value;
          if (!check.inclusive && schema.minimum === check.value) {
            schema.exclusiveMinimum = true;
          }
          break;
        case "max":
          schema.maximum = check.value;
          if (!check.inclusive && schema.maximum === check.value) {
            schema.exclusiveMaximum = true;
          }
          break;
        case "int":
          schema.type = "integer";
          break;
        case "multipleOf":
          schema.multipleOf = check.value;
          break;
      }
    }
    return { ...schema, ...baseProps };
  }

  if (zodSchema instanceof z.ZodDate) {
    return { type: "string", format: "date-time", ...baseProps };
  }

  if (zodSchema instanceof z.ZodBoolean) {
    return { type: "boolean", ...baseProps };
  }

  if (zodSchema?._def.typeName === "ZodArray") {
    return {
      type: "array",
      items: zodToOpenAPI(zodSchema._def.type),
      ...baseProps,
    };
  }

  if (zodSchema._def.typeName === "ZodObject") {
    const shape = zodSchema._def.shape();
    const properties: any = {};
    const required: string[] = [];

    for (const key in shape) {
      const fieldSchema = shape[key];
      properties[key] = zodToOpenAPI(fieldSchema);
      if (
        !(
          fieldSchema instanceof z.ZodOptional ||
          fieldSchema instanceof z.ZodNullable
        )
      ) {
        required.push(key);
      }
    }

    return {
      type: "object",
      properties,
      required: required.length > 0 ? required : undefined,
      ...baseProps,
    };
  }

  if (zodSchema instanceof z.ZodOptional) {
    return zodToOpenAPI(zodSchema._def.innerType);
  }

  if (zodSchema instanceof z.ZodNullable) {
    const innerSchema = zodToOpenAPI(zodSchema._def.innerType);
    return { ...innerSchema, nullable: true, ...baseProps };
  }

  if (zodSchema instanceof z.ZodEnum) {
    return { type: "string", enum: zodSchema._def.values, ...baseProps };
  }

  if (zodSchema instanceof z.ZodLiteral) {
    const value = zodSchema._def.value;
    const type =
      typeof value === "string"
        ? "string"
        : typeof value === "number"
          ? "number"
          : "boolean";
    return { type, enum: [value], ...baseProps };
  }

  if (zodSchema instanceof z.ZodUnion) {
    const options = zodSchema._def.options.map((option: z.ZodTypeAny) =>
      zodToOpenAPI(option)
    );
    return { anyOf: options, ...baseProps };
  }

  if (zodSchema instanceof z.ZodNull) {
    return { type: "null", ...baseProps };
  }

  if (zodSchema instanceof z.ZodAny) {
    return { type: "object", additionalProperties: true, ...baseProps };
  }

  return {
    type: "string",
    ...baseProps,
  };
}
