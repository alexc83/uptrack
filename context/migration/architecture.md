# Architecture decisions (initial; M02 finalizes)

- React with TypeScript strict mode and Vite in `frontend-react/`; Angular `frontend/` remains read-only.
- Flowbite **React** for interactive components; Tailwind CSS v4 for layout and tokens. Prefer Flowbite primitives first, custom composition only for missing interactions.
- React Router for routing; TanStack Query for server state; React state/context for local UI and auth; native `fetch` centralized in one client; React Hook Form + Zod for complex forms; Lucide icons. No Redux/Zustand unless approved.
- Preserve Angular URL paths including redirects and direct-link report route.
- Preserve REST DTO shapes; confirm actual backend controller annotations and API behavior in M01.
- Handle JWT using existing backend contract; assess existing storage risks, but no unilateral security protocol changes.
- Use Vite `/api` dev proxy when appropriate; production base URL must be environment configurable and documented.
- Avoid hard-coded healthcare data, live credentials or demo passwords in frontend.
- Theme: light/dark, accessible keyboard and focus treatment, responsive tables/cards, modal/drawer dismissal.
- Tests: Vitest + React Testing Library; Playwright for critical end-to-end and screenshot scenarios. Baseline evidence should indicate unavailable services clearly.
- Deployment/cutover cannot happen until parity gate passes.

## Open decisions for M02
Confirm source API CORS assumptions; browser storage and session bootstrapping semantics; exact breakpoints; file upload constraints; Flowbite component gaps; actual accessibility of Angular implementation; dev environment and seeded/test accounts.
