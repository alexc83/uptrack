# Coding Standards

These standards apply to the UpTrack repository across both the Angular frontend and Spring Boot backend. The goal is to keep the codebase consistent, readable, scalable, and easy to maintain as the project grows.

## Core Principles

- Write clear, readable, production-minded code.
- Prefer simplicity over cleverness.
- Keep features modular and focused.
- Use meaningful names for variables, methods, classes, components, and files.
- Favor composition and reuse over duplication.
- Optimize for maintainability, not just speed of implementation.
- Follow framework conventions unless there is a strong reason not to.

---

## Frontend: Angular + TypeScript

### TypeScript

- Strict mode should remain enabled.
- Do not use `any` unless there is no practical alternative. Prefer `unknown`, interfaces, union types, or generics.
- Define interfaces or types for:
  - API request and response payloads
  - DTO-style frontend models
  - form values where helpful
  - reusable configuration objects
- Use explicit types when they improve clarity, and type inference when the type is obvious.
- Prefer `const` over `let` unless reassignment is required.
- Use optional chaining and nullish coalescing where appropriate.
- Use template strings for interpolation and multi-line strings.
- Keep functions focused and reasonably small.

### Angular

- Use standalone components by default.
- Prefer component composition over overly large components.
- Use Angular signals where local or shared reactive state benefits from them.
- Use the `inject()` function for dependency injection when it improves clarity and reduces boilerplate.
- Keep routing organized and use lazy loading for feature areas when appropriate.
- Use the async pipe for observables in templates rather than manual subscriptions when possible.
- Prefer Angular templating and bindings over direct DOM manipulation.
- Use deferrable views for non-critical UI where it improves performance.
- Use `NgOptimizedImage` for image rendering where applicable.

### Components

- Each component should have one clear responsibility.
- Move complex logic out of templates and into the component or supporting services/utilities.
- Keep presentational concerns separate from business logic when practical.
- Avoid deeply nested templates when a smaller child component would improve readability.
- Prefer inputs/outputs or shared services with clear contracts over tightly coupled components.

### Forms and Validation

- Use Angular form APIs consistently across a feature.
- Implement proper validation for all user input.
- Use custom validators when built-in validators are not sufficient.
- Show clear, user-friendly validation messages.
- Keep validation logic maintainable and testable.

### Styling

- Use SCSS for styling.
- Prefer PrimeNG components and PrimeFlex utilities before writing custom styles.
- Avoid inline styles unless truly necessary.
- Keep styles co-located with components unless they are global concerns.
- Reuse spacing, layout, and utility patterns consistently.
- Build mobile-friendly, responsive layouts by default.

### Accessibility

- Use semantic HTML elements whenever possible.
- Add ARIA labels and accessibility attributes where needed.
- Ensure buttons, inputs, dialogs, and navigation are keyboard accessible.
- Do not rely on color alone to communicate meaning.
- Favor accessible PrimeNG patterns and verify custom UI behavior.

### Performance

- Use `trackBy` with repeated lists where appropriate.
- Use pure pipes for expensive computations when needed.
- Defer non-essential rendering when useful.
- Avoid unnecessary subscriptions, re-renders, and large template expressions.
- Keep Web Vitals in mind, especially LCP, INP, and CLS.

### Security

- Do not bypass Angular sanitization without a strong, documented reason.
- Avoid `innerHTML` unless content is sanitized and absolutely necessary.
- Treat all backend data as untrusted until validated/rendered safely.

### Frontend File Organization

- Use kebab-case for all file names.
- Follow Angular naming conventions:
  - `*.component.ts` for components
  - `*.service.ts` for services
  - `*.directive.ts` for directives
  - `*.pipe.ts` for pipes
  - `*.spec.ts` for tests
- Organize by feature where practical rather than by technical type only.

### Frontend Import Order

1. Angular core/common imports
2. RxJS imports
3. Other Angular or third-party framework imports
4. App core imports
5. Shared imports
6. Environment imports
7. Relative imports

---

## Backend: Java + Spring Boot

### Java

- Use Java 21 language features where they improve clarity and maintainability.
- Write clean, efficient, well-structured Java code.
- Prefer descriptive names that follow standard Java conventions.
- Use PascalCase for classes and records.
- Use camelCase for methods and variables.
- Use ALL_CAPS for constants.
- Favor immutability where practical.
- Keep methods focused and avoid large “god classes.”

### Spring Boot

- Follow standard layered architecture:
  - controllers
  - services
  - repositories
  - entities/models
  - DTOs
  - configuration
- Use Spring Boot starters and auto-configuration appropriately.
- Use constructor injection over field injection.
- Use annotations correctly and consistently:
  - `@RestController`
  - `@Service`
  - `@Repository`
  - `@Configuration`
  - `@ConfigurationProperties`
- Keep controllers thin and delegate business logic to services.
- Keep services focused on business rules and orchestration.
- Keep repositories focused on persistence concerns only.

### API Design

- Build RESTful APIs using proper HTTP methods and status codes.
- Use request and response DTOs instead of exposing entities directly.
- Validate incoming payloads with Bean Validation.
- Return clear, consistent API responses.
- Design endpoints around resources and actions that make sense to API consumers.

### Validation and Error Handling

- Use `@Valid` for request validation.
- Create custom validators when needed.
- Use centralized exception handling with `@ControllerAdvice` and `@ExceptionHandler`.
- Return clear, structured error responses.
- Avoid leaking internal implementation details in API error messages.

### Data Access and ORM

- Use Spring Data JPA for database access.
- Use Hibernate through JPA in a predictable, maintainable way.
- Model entity relationships carefully and explicitly.
- Be deliberate with cascading and fetch strategies.
- Avoid unnecessary eager loading.
- Use database migrations with Flyway or Liquibase rather than manual schema drift.
- Optimize queries and indexing where needed.

### Security

- Use Spring Security for authentication and authorization.
- Use secure password encoding such as BCrypt when passwords are involved.
- Configure CORS intentionally.
- Validate and authorize all protected operations.
- Never hardcode secrets, credentials, or tokens.

### Configuration

- Use `application.properties` or `application.yml` for configuration.
- Use Spring Profiles for environment-specific configuration such as dev, test, and prod.
- Use `@ConfigurationProperties` for type-safe grouped configuration where appropriate.
- Keep secrets out of version control.

### Logging and Monitoring

- Use SLF4J with Logback for logging.
- Log with appropriate levels:
  - ERROR for failures needing attention
  - WARN for recoverable concerns
  - INFO for important application events
  - DEBUG for development diagnostics
- Do not log secrets or sensitive data.
- Use Spring Boot Actuator for health and metrics when appropriate.

### Testing

- Use JUnit 5 for unit tests.
- Use the Arrange-Act-Assert pattern.
- Use MockMvc for controller/web layer tests.
- Use `@DataJpaTest` for repository tests.
- Use `@SpringBootTest` for integration tests when needed.
- Test business rules in the service layer directly where practical.

### Build and Deployment

- Use Maven for dependency management and builds.
- Keep profiles clear for development, test, and production.
- Use Docker when appropriate for local consistency and deployment.
- Keep the backend easy to run locally and in CI/CD environments.

---

## Naming Conventions

### Frontend

- Components: PascalCase class names, kebab-case file names
- Services: descriptive names ending in `Service`
- Signals, variables, and methods: camelCase
- Constants: SCREAMING_SNAKE_CASE when truly constant

### Backend

- Classes: PascalCase
- Methods and variables: camelCase
- Constants: ALL_CAPS
- Packages: lowercase and domain-oriented

---

## File and Folder Organization

### Frontend

- Organize by feature when possible.
- Keep related component files together.
- Keep shared UI, utilities, and core services in clearly named shared/core areas.
- Avoid dumping all logic into a single flat folder.

### Backend

- Organize by layered structure and domain boundaries.
- Keep DTOs separate from entities.
- Keep configuration classes in a dedicated config package.
- Keep exceptions and handlers in dedicated packages.

---

## Error Handling

- Handle errors where they can be meaningfully resolved.
- Do not swallow exceptions silently.
- Show user-friendly frontend messages.
- Log useful backend diagnostics without exposing sensitive information.
- Use consistent response patterns for API failures.

---

## Code Quality

- No commented-out code unless there is a temporary, clearly justified reason.
- No unused imports, variables, classes, or methods.
- Prefer small, testable units of logic.
- Refactor duplication early.
- Use formatter and linting tools consistently.
- Make code easy for a future teammate to understand quickly.

---

## Testing Standards

- Every meaningful feature should have test coverage appropriate to its level.
- Frontend tests should focus on behavior, rendering, and user interaction.
- Backend tests should focus on controllers, services, repositories, and validation behavior.
- Favor reliable, deterministic tests over fragile implementation-detail tests.

---

## Documentation

- Keep README and project documentation up to date as the architecture evolves.
- Add brief comments only where the intent is not obvious from the code.
- Prefer self-explanatory code over excessive commenting.
- Document important architectural decisions when they affect how future features should be built.

---

## UpTrack-Specific Preferences

- Use Angular standalone components throughout the frontend.
- Use PrimeNG as the primary UI component library.
- Use Spring Boot with a layered architecture in the backend.
- Use Spring Data JPA and MySQL for persistence.
- Use DTOs for API contracts between frontend and backend.
- Build with responsiveness, accessibility, and maintainability in mind.
- Favor portfolio-quality code that looks professional and production-aware.

