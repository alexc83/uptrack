# Repository Guidelines

## Project Overview

UpTrack is a full-stack web application with an Angular frontend and Spring Boot backend.

- Frontend: Angular 21 (standalone), PrimeNG, TypeScript
- Backend: Spring Boot 3, Java 21, MySQL

---

## Context Files

Before making changes, read the following files:

- context/project-overview.md
- context/coding-standards.md
- context/ai-interaction.md
- context/current-feature.md

These files define:
- Architecture and system design
- Coding standards and conventions
- Expected AI behavior
- Current feature scope

Do not proceed without aligning with these files.

---

## Project Structure & Module Organization
This repository is split into `frontend/` and `backend/`.

- `frontend/src/` contains the Angular app. Core app files currently live in `frontend/src/app/` (`app.ts`, `app.routes.ts`, `app.spec.ts`), with static assets in `frontend/public/`.
- `backend/src/main/java/com/ccruce/backend/` contains the Spring Boot application code.
- `backend/src/main/resources/` holds runtime config and web resources.
- `backend/src/test/java/` mirrors the Java package structure for tests.
- `context/` stores project screenshots and reference material, not application code.

## Build, Test, and Development Commands
Run commands from the relevant subproject directory.

- `cd frontend && npm start` starts the Angular dev server on `http://localhost:4200/`.
- `cd frontend && npm run build` creates a production build.
- `cd frontend && npm test` runs Angular unit tests with Vitest.
- `cd backend && ./mvnw spring-boot:run` starts the Spring Boot API locally.
- `cd backend && ./mvnw test` runs JUnit and Spring test suites.
- `cd backend && ./mvnw package` builds the backend artifact.

## Coding Style & Naming Conventions
- Follow `frontend/.editorconfig`: UTF-8, spaces, 2-space indentation, final newline, trimmed trailing whitespace.
- TypeScript uses single quotes and Angular file naming such as `feature-name.ts`, `feature-name.spec.ts`, and `feature-name.scss`.
- Java follows standard Spring conventions: 4-space indentation, `PascalCase` class names, `camelCase` methods and fields, packages under `com.ccruce.backend`.
- Prefer small, focused modules and keep frontend and backend changes isolated unless the feature requires both.

## Testing Guidelines
- Frontend tests live beside source files as `*.spec.ts`.
- Backend tests live under `backend/src/test/java/` and should mirror production packages.
- Add or update tests for any behavior change; treat `npm test` and `./mvnw test` as the minimum pre-PR check.

## Commit & Pull Request Guidelines
Git history is short but shows concise, imperative subjects such as `chore: add ...` and `Bootstrapped the frontend and backend`. Prefer `type: short summary` (`feat:`, `fix:`, `chore:`) and keep each commit scoped to one logical change.

PRs should include a brief description, linked issue if applicable, test evidence, and screenshots for UI changes. Call out config, schema, or security-impacting changes explicitly.

## Security & Configuration Tips
Do not commit secrets. Keep environment-specific values out of `backend/src/main/resources/application.properties` and document required local overrides in the PR when configuration changes.

**IMPORTANT:** Do not add Gemini to any commit messages
