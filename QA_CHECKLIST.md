# TaskFlow QA checklist

Use this checklist after installing dependencies and starting MongoDB. The current delivery has been checked for source syntax and project structure in the creation environment; run this manual end-to-end checklist in your local environment because a MongoDB service and installed npm dependencies were not available there.

## Account and workspace
- [ ] Register with a new email and a password of at least 8 characters.
- [ ] Confirm a starter workspace is created and appears in the workspace switcher.
- [ ] Sign out and sign back in.
- [ ] Create a second workspace and switch between both workspaces.
- [ ] Confirm a user who is not a workspace member receives a 403 from team-scoped API routes.

## Projects and tasks
- [ ] Create a project, edit its name/description/color, archive it, restore it, and delete it when it has no tasks.
- [ ] Confirm a project with existing tasks cannot be deleted.
- [ ] Create a task with title, project, assignee, status, priority, due date, and tags.
- [ ] Edit task details and save them.
- [ ] Add a comment and confirm it appears in the discussion panel.
- [ ] Delete a task and confirm it disappears from the list and board.
- [ ] Search by title, description, and tag; filter by status, project, and priority.
- [ ] Drag a card to another board column and confirm the status is saved after refresh.
- [ ] Change status using the card selector as an alternative to drag-and-drop.

## Team and invitations
- [ ] Create an invitation as an owner/admin and copy the generated URL.
- [ ] Open the URL while signed out; sign in or register with the invited email and confirm the invite destination is preserved.
- [ ] Try accepting the invitation with a different signed-in email and confirm access is blocked.
- [ ] Accept with the invited email and confirm the new workspace appears in the switcher.
- [ ] Confirm a regular member cannot create invitations or remove other members through the API.
- [ ] Remove a member and confirm their assigned tasks become unassigned.
- [ ] Have a non-owner leave a workspace and confirm their assigned tasks become unassigned.

## Pagination and dashboard data correctness
- [ ] Create more than 20 tasks and confirm the task list Previous/Next controls show all results without duplicates.
- [ ] Request `/api/tasks/:teamId?page=1&limit=5` and confirm `pagination.total`, `totalPages`, and next/previous flags are correct.
- [ ] Create more than 20 activity events and confirm Load older activity appends the next page.
- [ ] Create more than 250 tasks (or seed equivalent test data) and confirm dashboard stats still match the full task collection.

## Dashboard and activity
- [ ] Confirm task totals and status distribution match the task list.
- [ ] Confirm project progress matches completed tasks / total tasks.
- [ ] Confirm upcoming deadlines and overdue counts update as task dates/statuses change.
- [ ] Confirm workload distribution changes when tasks are assigned, completed, or unassigned.
- [ ] Confirm task, project, comment, and member events appear in the activity timeline.

## Security and API operations
- [ ] Confirm requests without a Bearer token receive 401 on protected endpoints.
- [ ] Confirm a user from another workspace receives 403 when accessing workspace-scoped resources.
- [ ] Confirm malformed JSON returns 400 and an unknown route returns a generic 404 message.
- [ ] Confirm the API rate-limit response is returned after the configured threshold.
- [ ] Confirm `/api/health/ready` returns 200 only when MongoDB is connected.

## Production container path
- [ ] Set a unique `JWT_SECRET` in the root `.env` file. Compose must refuse to start without it.
- [ ] Run `docker compose up --build -d`.
- [ ] Open `http://localhost:8080` and register or sign in.
- [ ] Verify `http://localhost:8080/api/health` returns `{ "status": "ok", ... }`.
- [ ] Check API and MongoDB logs with `docker compose logs -f api mongodb`.

## AWS deployment path
- [ ] Choose AWS Free account plan at signup and verify credits/expiry in Billing.
- [ ] Create MongoDB Atlas database user and restrict Network Access to EC2 public IP.
- [ ] Confirm EC2 instance type is covered by the account's current Free Tier/credits before launch.
- [ ] Configure SSH ingress from your IP only; allow HTTP/HTTPS publicly; do not expose API or MongoDB ports.
- [ ] Point DNS at EC2 public IPv4 address before starting Caddy.
- [ ] Create production `.env` with Atlas URI, unique JWT secret, and DOMAIN; never commit it.
- [ ] Start `docker-compose.prod.yml`, verify HTTPS certificate and `/api/health/ready`, then test registration and full task flows.
- [ ] Review AWS Billing/credit usage and terminate resources when the demo is no longer required.
