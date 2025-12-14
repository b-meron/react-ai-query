# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- (placeholder for upcoming changes)

## [0.1.3] - 2025-12-14

### Changed

- Cost reporting now surfaces only token counts, prefers provider-reported `usage.total_tokens`, and marks cache hits with `tokens: 0`.
- Hook, execution, and streaming helpers no longer expose USD estimates, keeping cost tracking provider-agnostic and token-focused.

## [0.1.2] - 2025-12-12

### Added

- Streaming scenarios, including `useAIStream`, `<AIStream>`, and related DemoPage components, landed along with new schema/type exports for API, error, feedback, moderation, extraction, and streaming flows.
- DemoPage was restructured around `PlaygroundScenario`/`ScenarioPlaygroundLayout`, new per-scenario result components, and improved schema loading via Vite raw imports.

### Changed

- Cache keys now include temperature, maxTokens, and providerOptions, ensuring finer-grained cache hits.
- Scenario/streaming wiring was refactored for modularity, better dependency handling, and clearer UI state.

## [0.1.1] - 2025-12-09

### Changed

- Officially renamed the project from “Intent UI” to `react-ai-query` across code, docs, and metadata, and refreshed the README with feature comparisons, security guidance, and Next.js/Express proxy examples.

## [0.1.0] - 2024-12-08

### Added

- Initial release of react ai query
- `useAI<T>()` hook for schema-safe AI inference
- `<AIText />` headless component with render props
- Mock provider for deterministic, zero-cost development
- OpenAI provider with `gpt-4o-mini` support
- Local provider skeleton for OpenAI-compatible local LLMs (Ollama, LM Studio)
- Zod schema validation on all AI responses
- Session caching with configurable policies
- Timeout and retry mechanisms
- Cost estimation (tokens)
- Prompt and input sanitization
- Typed `AIError` with error codes
- Vite + Tailwind demo environment
- Full documentation and examples
