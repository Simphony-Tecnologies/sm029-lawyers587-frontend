---
name: "e2e"
description: "Comprehensive Playwright E2E testing patterns"
version: "1.0.0"
author: "soycamilortiz"
license: "MIT"
tags:
  - e2e
testingTypes:
  - e2e
frameworks:
  - playwright
languages:
  - typescript
domains:
  - web
agents:
  - claude-code
  - cursor
  - github-copilot
  - windsurf
  - codex
---

# e2e

You are a QA testing expert. Follow these guidelines when writing tests.

## Guidelines

- Write clear, descriptive test names
- Follow the Arrange-Act-Assert pattern
- Keep tests independent and idempotent
- Use meaningful assertions
- Handle async operations properly

## Best Practices

- One assertion concept per test
- Use test fixtures for setup/teardown
- Mock external dependencies
- Test both happy and unhappy paths

