# Sindh Safe City backend

REST API and MongoDB persistence for the Sindh Safe City university project. This is an academic prototype, not a production surveillance platform.

## Technology

Node.js (18+), Express, MongoDB Atlas, Mongoose, JWT, bcryptjs, dotenv, cors, helmet, express-rate-limit, express-validator, and nodemon.

## Folder structure

```text
Desktop/
├── sindh safe city project/       # Existing HTML/CSS/vanilla JavaScript frontend
│   ├── login.html
│   ├── signup.html
│   ├── dashboard.html
│   ├── cameras.html
│   ├── incidents.html
│   ├── css/styles.css
│   └── js/
│       ├── api.js
│       ├── app.js
│       └── auth.js
└── backend/
    ├── src/
    │   ├── config/
    │   ├── controllers/
    │   ├── middleware/
    │   ├── models/
    │   ├── routes/
    │   ├── seed/
    │   ├── services/
    │   ├── utils/
    │   ├── app.js
    │   └── server.js
    ├── .env
    ├── .env.example
    ├── .gitignore
    └── package.json
```

The current frontend directory is named `sindh safe city project`; the backend was created as its sibling at `Desktop/backend`. Neither frontend files nor records in MongoDB are moved or deleted by this project.

## Install and configure

Open a terminal in the backend folder:

```powershell
cd "$HOME\Desktop\backend"
npm install
```

Edit `backend/.env` and replace the placeholders:

1. `MONGODB_URI`: your MongoDB Atlas connection string, with the correct database name. Add your development machine's IP to the Atlas Network Access allowlist and create a database user with only the permissions you need.
2. `JWT_SECRET`: a private, long, random value. Never share it, put it in frontend files, or commit it.
3. `CLIENT_ORIGIN`: exact origin(s) where Live Server serves the frontend. For default Live Server ports the example permits both `http://127.0.0.1:5500` and `http://localhost:5500`; comma-separate additional exact origins.
4. `PORT`, `NODE_ENV`, `JWT_EXPIRES_IN`, and `API_BASE_URL` can be adjusted as required. `API_BASE_URL` documents the local API address; the frontend's centralized API constant is `js/api.js`.

The checked-in local `.env` contains only dummy placeholders and is ignored by Git. The server deliberately exits before listening when the Atlas URI still contains placeholders, so it will not try connecting with fake credentials. No actual Atlas connection has been made for this implementation.

Start the backend after replacing MongoDB/JWT placeholders:

```powershell
npm run dev
```

`npm start` starts without nodemon. `GET http://localhost:5000/api/health` is a public API availability check; it does not claim that the database is connected. The server logs a MongoDB connection only after a real connection succeeds.

## Run the frontend

In VS Code, open the existing frontend folder and use Live Server on `login.html` (or `signup.html`). Keep the origin consistent with `CLIENT_ORIGIN`. The frontend calls `http://localhost:5000/api` by default from `js/api.js`.

Do not open pages with `file://`; use Live Server so CORS has a normal origin. The API URL and browser token operations are centralized in `js/api.js`.

## Authentication and security notes

- Signup accepts `name`, `email`, and `password`; the server always assigns the `Operator` role. Public requests cannot self-assign `Admin`.
- Passwords are hashed with bcryptjs (12 rounds); password fields are excluded from normal Mongoose queries and never returned.
- Login returns a bearer JWT and safe user profile. Send the token as `Authorization: Bearer <token>` on private endpoints.
- Logout is stateless: `POST /api/auth/logout` acknowledges the request; the frontend then removes the JWT and user profile from localStorage. A stateless JWT is not revoked server-side before its expiry. The frontend clears local credentials on 401.
- This academic frontend stores the JWT in localStorage. Any script executing on the same origin could read it (including injected script); use secure HttpOnly cookies with CSRF protection for a production deployment. Never store passwords in browser storage.
- Helmet, a rate limit on `/api`, JSON request size limits, strict CORS origins, express-validator, Mongoose schema validation, safe response selection, and controlled query filters are enabled.

## API response format

Success responses use `{ "success": true, "message": "...", "data": ... }` when there is a message, or `{ "success": true, "data": ... }`. Errors use `{ "success": false, "message": "...", "errors": [...] }` where appropriate. Validation errors are HTTP 400, unauthenticated requests are 401, missing records 404, duplicate IDs/emails 409, and successful creates 201.

All endpoints below except `POST /api/auth/signup`, `POST /api/auth/login`, and `GET /api/health` require a bearer token. Camera/incident mutation endpoints are available to authenticated Admin and Operator accounts in this university prototype.

### Authentication

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/signup` | Create an Operator account (`name`, `email`, `password`) |
| POST | `/api/auth/login` | Verify credentials; returns `data.token` and safe `data.user` |
| GET | `/api/auth/me` | Current authenticated profile |
| POST or GET | `/api/auth/logout` | Stateless logout acknowledgement; clear token in client |

### Cameras

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/cameras` | Create; `cameraId` optional (server-generated), `cameraName`, `location`, `cameraType`, `status`, `description` |
| GET | `/api/cameras` | List/search/filter/paginate |
| GET | `/api/cameras/:id` | Get one camera by MongoDB ObjectId |
| PUT | `/api/cameras/:id` | Update camera fields |
| DELETE | `/api/cameras/:id` | Delete only if no incident references it |

List query options: `q` searches the camera text index; `status=Active|Offline|Maintenance`; `page`; `limit` (maximum 100).

### Incidents

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/incidents` | Create; server assigns `reportedBy` from JWT and generates `incidentId` if omitted |
| GET | `/api/incidents` | List/search/filter/paginate; camera and reporter are populated safely |
| GET | `/api/incidents/:id` | Get incident details |
| PUT | `/api/incidents/:id` | Update allowed incident fields |
| DELETE | `/api/incidents/:id` | Delete incident |

Create/update fields: `title`, `incidentType`, `description`, `location`, optional camera ObjectId, `priority=Low|Medium|High|Critical`, `status=Open|In Progress|Resolved`. A supplied camera reference must exist. Search/filter options: `q`, `status`, `priority`, `incidentType`, `page`, `limit` (max 100).

### Dashboard, activity, notifications, assistant

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/dashboard/stats` | Live camera/incident totals and recent incidents |
| GET | `/api/activity` | Paginated activity logs, newest first |
| GET | `/api/notifications` | Paginated notifications for the current user plus general notifications |
| PATCH | `/api/notifications/:id/read` | Mark an accessible notification read |
| POST | `/api/assistant/query` | Rule-based database question (`{ "question": "..." }`) |

Dashboard fields: `totalCameras`, `activeCameras`, `offlineCameras`, `totalIncidents`, `openIncidents`, `resolvedIncidents`, `recentIncidents`. The assistant supports questions about active/offline cameras, open/resolved incidents, recent incidents, and overall counts. It is not a trained or paid AI model.

Important user actions are recorded in ActivityLog (register, login, camera and incident create/update/status change/delete). Creating an incident also creates a notification.

## Collections, relations, indexes

- **Users**: unique email, name, bcrypt password hash, role, timestamps. Password excluded by default.
- **Cameras**: unique cameraId, name, location, type, status, description, timestamps.
- **Incidents**: unique incidentId, content, status/priority/type, timestamps, optional `camera -> Camera`, required `reportedBy -> User`.
- **ActivityLogs**: required `user -> User`, action/description and optional entity type/id; created timestamp.
- **Notifications**: title/message/type/read flag, optional `user -> User`; created timestamp. A null user denotes a general notification.

Mongoose references are ObjectIds and are populated only when the response needs associated display fields. Incident references prevent deleting a camera that is still in use.

Indexes are declared in schemas and created by Mongoose: unique user email, unique cameraId and incidentId, camera status, incident status/priority/createdAt, text indexes on camera (name/location/description) and incident (title/type/description/location), and activity/notification time/user indexes. Do not add duplicate indexes without checking the existing plan.

## Aggregation pipelines

`src/services/analyticsService.js` contains and uses five documented pipelines:

1. `incidentStatusPipeline`: `$group` count by incident status.
2. `incidentTypePipeline`: `$group` count by incident type.
3. `cameraStatusPipeline`: `$group` count by camera status (also used for dashboard stats).
4. `recentIncidentPipeline`: newest five incidents, `$lookup` camera label, projection of display fields (also used for dashboard).
5. `incidentsByDatePipeline`: `$group` incident count per calendar date and sort.

The dashboard combines status aggregates for totals and returns the recent-incidents aggregation. The type/date aggregates are available for later reports without hardcoded metrics.

## Text search (advanced database feature)

Camera `q` uses the camera text index; incident `q` uses the incident text index through MongoDB `$text` search. Search uses the indexed document terms over the fields listed in the collection section. Other filters are built from validated, allowlisted query parameters rather than accepting arbitrary MongoDB operators from the client.

## Explain executionStats

After setting a real Atlas URI and seeding sample cameras, run:

```powershell
npm run explain
```

`src/seed/explainQuery.js` runs the same exact camera-name query with `explain("executionStats")`, adds a named `cameraName` index, and runs explain again. It prints the actual plans and statistics from your database. No performance numbers are asserted here; compare the returned `winningPlan`, `totalDocsExamined`, `totalKeysExamined`, and execution time on your own dataset. The script creates an index, but does not delete data.

## Seed data

After configuring Atlas, run:

```powershell
npm run seed
```

The idempotent seed inserts a sample Operator, 60 fictional cameras, 900 fictional incidents, 20 activity logs, and 20 notifications (at least 1,001 documents in total). Upserts preserve existing documents and the script never drops collections or deletes existing records. Re-running it does not create duplicates for its stable sample identifiers.

Demo account created only if that sample email does not exist:

```text
operator@safecity.example
safecity-demo-2026
```

It is a fictional local demonstration credential, not an Atlas credential. Change/remove it in a safe development database before any public deployment.
