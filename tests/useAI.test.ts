import { describe, it, expect } from "vitest";
import { z } from "zod";
import { mockProvider } from "../src/providers/mock";
import { executeAI } from "../src/core/execution";

describe("executeAI", () => {
    it("returns mock data for string schema", async () => {
        const result = await executeAI<string>({
            prompt: "Test prompt",
            schema: z.string(),
            provider: mockProvider,
        });

        expect(typeof result.data).toBe("string");
        expect(result.data.length).toBeGreaterThan(0);
        expect(result.tokens).toBeGreaterThan(0);
        expect(result.fromCache).toBe(false);
    });

    it("caches results on second call", async () => {
        const prompt = "Cached prompt test " + Date.now();

        const result1 = await executeAI<string>({
            prompt,
            schema: z.string(),
            provider: mockProvider,
            cache: "session",
        });

        const result2 = await executeAI<string>({
            prompt,
            schema: z.string(),
            provider: mockProvider,
            cache: "session",
        });

        expect(result1.fromCache).toBe(false);
        expect(result2.fromCache).toBe(true);
        expect(result1.data).toBe(result2.data);
        expect(result2.tokens).toBe(0);
    });

    it("uses fallback on validation error", async () => {
        // Use a schema with a refinement that will always fail
        const impossibleSchema = z.number().refine((n) => n > 1000000, {
            message: "Number must be greater than 1000000"
        });

        const result = await executeAI<number>({
            prompt: "Test",
            schema: impossibleSchema,
            provider: mockProvider,
            fallback: 999,
        });

        expect(result.data).toBe(999);
        expect(result.usedFallback).toBe(true);
    });
});

describe("mockProvider", () => {
    it("has correct name", () => {
        expect(mockProvider.name).toBe("mock");
    });

    it("returns deterministic results", async () => {
        const result1 = await mockProvider.execute({
            prompt: "Hello",
            schema: z.string(),
            temperature: 0,
        });

        const result2 = await mockProvider.execute({
            prompt: "Hello",
            schema: z.string(),
            temperature: 0,
        });

        expect(result1.data).toBe(result2.data);
    });
});

