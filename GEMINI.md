# GEMINI.md - Project Guidelines & Workspace Conventions

This file provides the foundational directives, architectural standards, coding styles, and workflow instructions for developers and AI assistants working on **ocdb**.

---

## 1. Project Overview & Scope
*Briefly describe what **ocdb** is and its primary goals. (e.g., "ocdb is a lightweight, high-performance database/debugger written in Rust...")*

- **Language & Edition:** Rust (Edition 2024)
- **Primary Domain:** [Database / Debugger / CLI / Other]
- **Key Constraints:** Focus on high performance, memory efficiency, and type safety.

---

## 2. Core Architectural Principles
When extending or refactoring **ocdb**, adhere to the following principles:

- **Composition Over Inheritance:** Utilize Rust's trait system for polymorphism. Avoid overly complex nested trait structures. Prefer explicit delegation/wrapping.
- **Safety & Error Handling:**
  - Avoid `unwrap()` and `expect()` in library/production code unless proving a invariant (documented with `// SAFETY:` or comments).
  - Use structured error handling (e.g., using a custom `enum Error` with `thiserror` for libraries, or `anyhow` for application entry points/CLIs).
- **Concurrency & Async:**
  - Define clear boundaries between asynchronous and synchronous operations.
  - If using Tokio or another async runtime, document thread-safety requirements (`Send`, `Sync`).

---

## 3. Coding Style & Conventions
Follow Rust standard idioms and local patterns:

- **Naming Conventions:** Standard Rust naming conventions (`CamelCase` for types/traits, `snake_case` for functions/variables/modules, `SCREAMING_SNAKE_CASE` for constants).
- **Documentation:**
  - Every public module, struct, enum, and function MUST have doc comments (`///`).
  - Provide short examples in doc comments for public API entry points.
- **Imports:** Group imports logically:
  1. Standard library (`std::...`)
  2. External dependencies
  3. Local crate modules (`crate::...` or `super::...`)

---

## 4. Development & Validation Workflows
Always run validation commands before staging or committing any changes.

### Common Commands
- **Check Compilation:** `cargo check`
- **Run Tests:** `cargo test`
- **Linting:** `cargo clippy --all-targets -- -D warnings`
- **Formatting:** `cargo fmt --all --check`

---

## 5. Directives for AI Assistants (Gemini CLI)
*These instructions are foundational mandates for AI tools operating in this repository.*

1. **Strict Type Safety:** Never bypass Rust's type system or use `unsafe` blocks unless absolutely necessary and explicitly approved.
2. **Exhaustive Testing:**
   - Any new feature or bug fix must include corresponding tests (unit tests in the same file or integration tests under `tests/`).
   - Run `cargo test` to verify all changes before completing a task.
3. **No Unused Code:** Do not leave dead code, unused imports, or leftover debug prints in production-bound files.
4. **Surgical Modifications:** When using tools, favor targeted, precise edits to preserve the existing code structure and comments.
5. **No Commits:** Do not stage or commit changes unless explicitly instructed by the user.
