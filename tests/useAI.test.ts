import { describe, it, expect } from "vitest";
import { z } from "zod";
import { mockProvider } from "../src/providers/mock";
import { executeAI } from "../src/core/execution";

describe("executeAI", () => {
    it("returns mock data for string schema", async () => {
        const result = await executeAI({
            prompt: "Test prompt",
            schema: z.string(),
            provider: "mock",
        });

        expect(result.data).toContain("Mock value for: Test prompt");
        expect(result.tokens).toBeGreaterThan(0);
        expect(result.estimatedUSD).toBeGreaterThan(0);
        expect(result.fromCache).toBe(false);
    });

    it("caches results on second call", async () => {
        const prompt = "Cached prompt test " + Date.now();

        const result1 = await executeAI({
            prompt,
            schema: z.string(),
            provider: "mock",
            cache: "session",
        });

        const result2 = await executeAI({
            prompt,
            schema: z.string(),
            provider: "mock",
            cache: "session",
        });

        expect(result1.fromCache).toBe(false);
        expect(result2.fromCache).toBe(true);
        expect(result1.data).toBe(result2.data);
    });

    it("uses fallback on validation error", async () => {
        // Use a schema with constraints the mock can't satisfy
        const result = await executeAI({
            prompt: "Test",
            schema: z.number().min(100), // Mock returns 42, which fails min(100) validation
            provider: "mock",
            fallback: 999,
        });

        expect(result.data).toBe(999);
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

