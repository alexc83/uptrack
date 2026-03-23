# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UpTrack is a full-stack web application with an Angular frontend and Spring Boot backend.

- **Frontend:** Angular 21 (standalone components), PrimeNG UI library, TypeScript 5.9, Vitest
- **Backend:** Spring Boot 3.5.12 (Java 21), Spring Data JPA, Spring Security, MySQL

## Context Files

Read the following to get the full context of the project.

- @context/project-overview.md
- @context/coding-standards.md
- @context/ai-interaction.md
- @context/current-feature.md
- 
## Commands

### Frontend (`/frontend`)

```bash
npm start          # Dev server at http://localhost:4200 (hot reload)
npm run build      # Production build to dist/
npm run watch      # Development build with watch mode
npm test           # Run unit tests with Vitest
```

### Backend (`/backend`)

```bash
./mvnw spring-boot:run   # Run at http://localhost:8080 (DevTools hot reload)
./mvnw clean package     # Build JAR to target/
./mvnw test              # Run tests
```

## Architecture

### Frontend

Uses modern Angular **standalone components** (no NgModules). The entry point is `src/main.ts` → `bootstrapApplication(App, appConfig)`.

- `src/app/app.ts` — root component
- `src/app/app.routes.ts` — route definitions (currently empty)
- `src/app/app.config.ts` — global providers (router, error listeners)

PrimeNG is the UI component library. Use PrimeFlex for layout utilities and PrimeIcons for icons. Theme configuration comes from `@primeuix/themes`.

Styling uses SCSS. Global styles are in `src/styles.scss`; component styles are co-located. Prettier is configured (100 char width, single quotes) — run it via the editor or `npx prettier --write`.

### Backend

Standard Spring Boot layered architecture under `com.ccruce.backend`. The database is MySQL; configure connection in `src/main/resources/application.properties` (currently only has `spring.application.name=backend`).

Spring Security is included as a dependency but not yet configured.
