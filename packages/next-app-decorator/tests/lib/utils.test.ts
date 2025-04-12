import { deepMergeObjects } from "../../src/lib/utils";
import { z } from "zod";
import {
  zodToOpenAPI,
  isPlainObject,
  joinPath,
  purify,
} from "../../src/lib/utils";

describe("deepMergeObjects", () => {
  it("should merge two plain objects", () => {
    const target = { a: 1, b: 2 };
    const source = { b: 3, c: 4 };
    const result = deepMergeObjects(target, source);
    expect(result).toEqual({ a: 1, b: 3, c: 4 });
  });

  it("should deeply merge nested objects", () => {
    const target = { a: { b: 1 } };
    const source = { a: { c: 2 } };
    const result = deepMergeObjects(target, source as any);
    expect(result).toEqual({ a: { b: 1, c: 2 } });
  });

  it("should overwrite non-object values with object values", () => {
    const target = { a: 1 };
    const source = { a: { b: 2 } };
    const result = deepMergeObjects(target, source as any);
    expect(result).toEqual({ a: { b: 2 } });
  });

  it("should overwrite object values with non-object values", () => {
    const target = { a: { b: 2 } };
    const source = { a: 1 };
    const result = deepMergeObjects(target, source as any);
    expect(result).toEqual({ a: 1 });
  });

  it("should handle multiple sources", () => {
    const target = { a: 1 };
    const source1 = { b: 2 };
    const source2 = { c: 3 };
    const result = deepMergeObjects(target, source1 as any, source2 as any);
    expect(result).toEqual({ a: 1, b: 2, c: 3 });
  });

  it("should skip undefined or null sources", () => {
    const target = { a: 1 };
    const source1 = null;
    const source2 = { b: 2 };
    const result = deepMergeObjects(target, source1 as any, source2 as any);
    expect(result).toEqual({ a: 1, b: 2 });
  });

  it("should throw an error if the target is not a plain object", () => {
    expect(() => deepMergeObjects(null as any, { a: 1 })).toThrow(
      "Target must be a plain object"
    );
  });

  it("should handle empty sources array", () => {
    const target = { a: 1 };
    const result = deepMergeObjects(target);
    expect(result).toEqual({ a: 1 });
  });

  it("should handle deeply nested objects with multiple sources", () => {
    const target = { a: { b: { c: 1 } } };
    const source1 = { a: { b: { d: 2 } } };
    const source2 = { a: { e: 3 } };
    const result = deepMergeObjects(target, source1 as any, source2 as any);
    expect(result).toEqual({ a: { b: { c: 1, d: 2 }, e: 3 } });
  });

  it("should convert ZodString to OpenAPI schema", () => {
    const schema = z.string().describe("A string field");
    const result = zodToOpenAPI(schema);
    expect(result).toEqual({
      type: "string",
      description: "A string field",
    });
  });

  it("should convert ZodNumber to OpenAPI schema", () => {
    const schema = z.number().describe("A number field");
    const result = zodToOpenAPI(schema);
    expect(result).toEqual({
      type: "number",
      description: "A number field",
    });
  });

  it("should convert ZodBoolean to OpenAPI schema", () => {
    const schema = z.boolean().describe("A boolean field");
    const result = zodToOpenAPI(schema);
    expect(result).toEqual({
      type: "boolean",
      description: "A boolean field",
    });
  });

  it("should convert ZodArray to OpenAPI schema", () => {
    const schema = z.array(z.string()).describe("An array of strings");
    const result = zodToOpenAPI(schema);
    expect(result).toEqual({
      type: "array",
      items: {
        type: "string",
      },
      description: "An array of strings",
    });
  });

  it("should convert ZodObject to OpenAPI schema", () => {
    const schema = z
      .object({
        name: z.string(),
        age: z.number().optional(),
      })
      .describe("An object with name and age");
    const result = zodToOpenAPI(schema);
    expect(result).toEqual({
      type: "object",
      properties: {
        name: { type: "string" },
        age: { type: "number" },
      },
      required: ["name"],
      description: "An object with name and age",
    });
  });

  it("should handle ZodDefault with default values", () => {
    const schema = z.string().default("default value");
    const result = zodToOpenAPI(schema);
    expect(result).toEqual({
      type: "string",
      example: "default value",
    });
  });

  it("should handle ZodEffects with transform", () => {
    const schema = z.string().transform((val) => val.toUpperCase());
    const result = zodToOpenAPI(schema);
    expect(result).toEqual({
      type: "string",
    });
  });

  it("should handle nested ZodObjects", () => {
    const schema = z.object({
      user: z.object({
        name: z.string(),
        email: z.string(),
      }),
    });
    const result = zodToOpenAPI(schema);
    expect(result).toEqual({
      type: "object",
      properties: {
        user: {
          type: "object",
          properties: {
            name: { type: "string" },
            email: { type: "string" },
          },
          required: ["name", "email"],
        },
      },
      required: ["user"],
    });
  });

  it("should handle ZodOptional fields", () => {
    const schema = z.object({
      name: z.string(),
      age: z.number().optional(),
    });
    const result = zodToOpenAPI(schema);
    expect(result).toEqual({
      type: "object",
      properties: {
        name: { type: "string" },
        age: { type: "number" },
      },
      required: ["name"],
    });
  });

  it("should fallback to string type for hook body", () => {
    const route = {
      "/": {
        GET: {
          hook: {
            body: z.object({
              name: z.string(),
              age: z.number().optional(),
            }),
          },
        },
      },
    };

    const result = zodToOpenAPI(route["/"].GET.hook.body);

    expect(result).toEqual({
      type: "object",
      properties: {
        name: { type: "string" },
        age: { type: "number" },
      },
      required: ["name"],
    });
  });
});

it("should handle ZodTypeAny as HookResponse = ZodTypeAny", () => {
  const route = {
    hook: {
      response: z.string(),
    },
  };

  const result = zodToOpenAPI(route.hook.response);
  expect(result).toEqual({
    type: "string",
  });
});

it("should handle ZodArray as HookResponse = ZodArray", () => {
  const route = {
    hook: {
      response: z.array(z.string()),
    },
  };

  const result = zodToOpenAPI(route.hook.response);
  expect(result).toEqual({
    type: "array",
    items: {
      type: "string",
    },
  });
});

it("should handle ZodArray with element is ZodObject", () => {
  const route = {
    hook: {
      response: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
        })
      ),
    },
  };

  const result = zodToOpenAPI(route.hook.response);
  expect(result).toEqual({
    type: "array",
    items: {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
      },
      required: ["id", "name"],
    },
  });
});

it("should handle ZodDefault with default values", () => {
  const schema = z.string().default("default value");
  const result = zodToOpenAPI(schema);
  expect(result).toEqual({
    type: "string",
    example: "default value",
  });
});

it("should handle ZodEffects with transformations", () => {
  const schema = z.string().transform((val) => val.toUpperCase());
  const result = zodToOpenAPI(schema);
  expect(result).toEqual({
    type: "string",
  });
});

it("should handle ZodString with checks", () => {
  const schema = z
    .string()
    .min(5)
    .max(10)
    .regex(/^[a-z]+$/)
    .describe("A string field");
  const result = zodToOpenAPI(schema);
  expect(result).toEqual({
    type: "string",
    minLength: 5,
    maxLength: 10,
    pattern: "^[a-z]+$",
    description: "A string field",
  });
});

it("should handle ZodNumber with checks", () => {
  const schema = z.number().min(1).max(100).int().describe("A number field");
  const result = zodToOpenAPI(schema);
  expect(result).toEqual({
    type: "integer",
    minimum: 1,
    maximum: 100,
    description: "A number field",
  });
});

it("should handle ZodBoolean", () => {
  const schema = z.boolean().describe("A boolean field");
  const result = zodToOpenAPI(schema);
  expect(result).toEqual({
    type: "boolean",
    description: "A boolean field",
  });
});

it("should handle ZodArray", () => {
  const schema = z.array(z.string()).describe("An array of strings");
  const result = zodToOpenAPI(schema);
  expect(result).toEqual({
    type: "array",
    items: {
      type: "string",
    },
    description: "An array of strings",
  });
});

it("should handle ZodObject", () => {
  const schema = z
    .object({
      name: z.string(),
      age: z.number().optional(),
    })
    .describe("An object with name and age");
  const result = zodToOpenAPI(schema);
  expect(result).toEqual({
    type: "object",
    properties: {
      name: { type: "string" },
      age: { type: "number" },
    },
    required: ["name"],
    description: "An object with name and age",
  });
});

it("should handle ZodOptional", () => {
  const schema = z.object({
    name: z.string(),
    age: z.number().optional(),
  });
  const result = zodToOpenAPI(schema);
  expect(result).toEqual({
    type: "object",
    properties: {
      name: { type: "string" },
      age: { type: "number" },
    },
    required: ["name"],
  });
});

it("should handle ZodNullable", () => {
  const schema = z.string().nullable().describe("A nullable string");
  const result = zodToOpenAPI(schema);
  expect(result).toEqual({
    type: "string",
    nullable: true,
    description: "A nullable string",
  });
});

it("should handle ZodEnum", () => {
  const schema = z.enum(["A", "B", "C"]).describe("An enum field");
  const result = zodToOpenAPI(schema);
  expect(result).toEqual({
    type: "string",
    enum: ["A", "B", "C"],
    description: "An enum field",
  });
});

it("should handle ZodLiteral", () => {
  const schema = z.literal("fixed value").describe("A literal field");
  const result = zodToOpenAPI(schema);
  expect(result).toEqual({
    type: "string",
    enum: ["fixed value"],
    description: "A literal field",
  });
});

it("should handle ZodUnion", () => {
  const schema = z.union([z.string(), z.number()]).describe("A union field");
  const result = zodToOpenAPI(schema);
  expect(result).toEqual({
    anyOf: [{ type: "string" }, { type: "number" }],
    description: "A union field",
  });
});

it("should handle ZodNull", () => {
  const schema = z.null().describe("A null field");
  const result = zodToOpenAPI(schema);
  expect(result).toEqual({
    type: "null",
    description: "A null field",
  });
});

it("should handle ZodAny", () => {
  const schema = z.any().describe("An any field");
  const result = zodToOpenAPI(schema);
  expect(result).toEqual({
    type: "object",
    additionalProperties: true,
    description: "An any field",
  });
});

it("should handle unsupported schemas with fallback", () => {
  const schema = z.unknown().describe("An unknown field");
  const result = zodToOpenAPI(schema);
  expect(result).toEqual({
    type: "object",
    additionalProperties: true,
    description: "An unknown field",
  });
});
describe("isPlainObject", () => {
  it("should return true for plain objects", () => {
    expect(isPlainObject({})).toBe(true);
    expect(isPlainObject({ a: 1 })).toBe(true);
  });

  it("should return false for non-objects", () => {
    expect(isPlainObject(null)).toBe(false);
    expect(isPlainObject(undefined)).toBe(false);
    expect(isPlainObject(42)).toBe(false);
    expect(isPlainObject("string")).toBe(false);
    expect(isPlainObject([])).toBe(false);
    expect(isPlainObject(new Date())).toBe(false);
  });
});

describe("joinPath", () => {
  it("should join paths correctly", () => {
    expect(joinPath("path", "to", "resource")).toBe("/path/to/resource");
    expect(joinPath("/path/", "/to/", "/resource/")).toBe("/path/to/resource");
    expect(joinPath("path", "", "resource")).toBe("/path/resource");
  });

  it("should handle empty paths", () => {
    expect(joinPath()).toBe("/");
    expect(joinPath("")).toBe("/");
    expect(joinPath("", "")).toBe("/");
  });

  it("should handle leading and trailing slashes", () => {
    expect(joinPath("/path/", "/to/", "/resource/")).toBe("/path/to/resource");
    expect(joinPath("path", "/to/", "resource/")).toBe("/path/to/resource");
  });
});

describe("purify", () => {
  it("should return the input if it is a File", () => {
    const file = new File(["content"], "test.txt");
    expect(purify(file)).toBe(file);
  });

  it("should return undefined for the string 'undefined'", () => {
    expect(purify("undefined")).toBeUndefined();
  });

  it("should return a boolean for 'true' or 'false'", () => {
    expect(purify("true")).toBe(true);
    expect(purify("false")).toBe(false);
  });

  it("should return a number for numeric strings", () => {
    expect(purify("42")).toBe(42);
    expect(purify("3.14")).toBe(3.14);
    expect(purify("1e3")).toBe(1000);
  });

  it("should return a Date for valid date strings", () => {
    const date = "2023-01-01T00:00:00Z";
    expect(purify(date)).toEqual(new Date(date));
  });

  it("should return the input for other strings", () => {
    expect(purify("hello")).toBe("hello");
    expect(purify("not-a-date")).toBe("not-a-date");
  });
});
