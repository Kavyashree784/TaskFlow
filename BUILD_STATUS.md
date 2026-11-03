# TaskFlow build status — 3 November 2026

## Changes included in this delivery

- Replaced the capped-task dashboard calculation with MongoDB aggregation for exact workspace-wide counts and workload totals.
- Added bounded server-side pagination metadata to task and activity endpoints.
- Added Previous/Next controls to the task list and Load older activity to the activity timeline.
- Explicitly set the Kanban board fetch limit to 100 and disclose when more tasks exist.
- Added API-wide and stricter authentication rate limits.
- Added database readiness endpoint and made the health endpoint report database connection state.
- Sanitized production 5xx responses and handled malformed JSON errors.
- Ensured database errors from authentication middleware use the central error handler rather than returning a false 401.
- Added query indexes for dashboard and timeline access paths.
- Removed the insecure default JWT secret from local Docker Compose; compose now requires a configured secret.
- Added a production Compose topology using Atlas, Caddy and Docker with an EC2 bootstrap script.
- Added a Windows PowerShell environment/dependency setup helper.
- Added five Node built-in helper tests and backend/frontend source syntax-check scripts.
- Added a YAMIK SDE interview defence guide.

## Checks run in the build environment

| Check | Result |
|---|---|
| Backend JavaScript syntax | Passed — 16 files |
| Backend helper tests | Passed — 5 tests |
| Frontend JSX/JavaScript syntax parse | Passed — 18 files |
| package.json JSON parsing | Passed |
| Local and production Compose YAML parsing | Passed |
| npm dependency installation | Timed out while accessing the package registry |
| Vite production build | Not run; frontend dependencies could not be installed |
| Docker image build / Compose startup | Not run; Docker is unavailable in this environment |
| Database-backed API integration tests | Not run; no MongoDB service available |
| Browser end-to-end tests | Not run |
| AWS deployment | Not run; AWS account and credentials are not connected |

## Required next verification on the Windows laptop

1. Extract the ZIP and open the project root in VS Code.
2. Run `Set-ExecutionPolicy -Scope Process Bypass` then `.\scripts\setup-windows.ps1` in PowerShell.
3. Configure MongoDB either through Docker Desktop (`docker compose up -d mongodb`) or an Atlas connection string in `backend/.env`.
4. Run `npm run check`, `npm test`, and `npm run build`.
5. Run `npm run dev`, register a test account, and complete the manual checklist in `QA_CHECKLIST.md`.
6. Only after those checks pass, prepare the AWS account and deploy with `docker-compose.prod.yml`.
