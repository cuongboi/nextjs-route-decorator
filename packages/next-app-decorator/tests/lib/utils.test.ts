import { deepMergeObjects } from "../../src/lib/utils";
import { z } from "zod";
import { zodToOpenAPI } from "../../src/lib/utils";

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

  describe("zodToOpenAPI", () => {
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

    it("should fallback to string type for unsupported schemas", () => {
      const schema = z.any();
      const result = zodToOpenAPI(schema);
      expect(result).toEqual({
        type: "string",
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

  test("should handle ZodTypeAny as HookResponse = ZodTypeAny", () => {
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
});
