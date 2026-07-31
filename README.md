# Open Music API

A Hapi.js REST API for a music service built with [Node.js](https://nodejs.org/). Supports user authentication, song/album management, playlists with collaborations, activity tracking, and CSV playlist export via RabbitMQ.

## Architecture

```
src/
├── api/              # Hapi plugins — handler.js, routes.js, index.js per domain
├── service/          # Business logic (postgres/, redis/, rabbitmq/, storage/)
├── validator/        # Joi validation schemas per domain
├── exception/        # Custom error classes
├── tokenize/         # JWT access + refresh token management
├── utils/            # Shared DB-to-model mappers
└── server.js         # Entry point — wires up all plugins and auth
```

**Database layers:**
- **PostgreSQL** — primary database (`node-pg-migrate` for schema migrations in `migrations/`)
- **Redis** — caching (`CacheService`)
- **RabbitMQ** — async message broker for playlist exports (`ProducerService`)

## Setup

### Prerequisites

- Node.js
- PostgreSQL
- Redis
- RabbitMQ

### Environment Variables

Create a `.env` file (see `.gitignore`) with the following required variables:

```env
PORT=3000
HOST=localhost
ACCESS_TOKEN_KEY=your-access-token-secret
ACCESS_TOKEN_AGE=3600
REFRESH_TOKEN_KEY=your-refresh-token-secret
```

### Install & Run

```bash
npm install
npm start        # dev server via nodemon on src/server.js
npm run lint     # ESLint on src/
npm run migrate  # run node-pg-migrate against PostgreSQL
```

## API Endpoints

### Songs
| Method | Path | Description |
|--------|------|-------------|
| POST | `/songs` | Add a new song |
| GET | `/songs` | List all songs |
| GET | `/songs/{id}` | Get a song by ID |
| PUT | `/songs/{id}` | Update a song by ID |
| DELETE | `/songs/{id}` | Delete a song by ID |

### Albums
| Method | Path | Description |
|--------|------|-------------|
| POST | `/albums` | Add a new album |
| GET | `/albums` | List all albums |
| GET | `/albums/{id}` | Get an album by ID |
| PUT | `/albums/{id}` | Update an album by ID |
| DELETE | `/albums/{id}` | Delete an album by ID |
| POST | `/albums/{id}/covers` | Upload cover image (multipart/form-data) |
| GET | `/albums/file/images/{param*}` | Serve cover images |

### Users
| Method | Path | Description |
|--------|------|-------------|
| POST | `/users` | Register a new user |
| GET | `/users/{id}` | Get user by ID |

### Authentications
| Method | Path | Description |
|--------|------|-------------|
| POST | `/authentications` | Login (returns access + refresh tokens) |
| PUT | `/authentications` | Refresh access token using refresh token |
| DELETE | `/authentications` | Logout (invalidate refresh token) |

### Playlists *(requires JWT)*
| Method | Path | Description |
|--------|------|-------------|
| POST | `/playlists` | Create a playlist |
| GET | `/playlists` | List playlists |
| GET | `/playlists/{id}/songs` | Get songs in a playlist |
| POST | `/playlists/{id}/songs` | Add a song to a playlist |
| DELETE | `/playlists/{id}` | Delete a playlist |
| DELETE | `/playlists/{id}/songs` | Remove a song from a playlist |

### Collaborations *(requires JWT)*
| Method | Path | Description |
|--------|------|-------------|
| POST | `/collaborations` | Add a user to a playlist collaboration |
| DELETE | `/collaborations` | Remove a user from a playlist collaboration |

### Activity *(requires JWT)*
| Method | Path | Description |
|--------|------|-------------|
| GET | `/playlists/{id}/activities` | Get activity history for a playlist |

### Exports *(requires JWT)*
| Method | Path | Description |
|--------|------|-------------|
| POST | `/export/playlists/{id}` | Request a CSV export of playlist songs to email |

## Auth

JWT via `@hapi/jwt`. Tokens are signed with `ACCESS_TOKEN_KEY` and `REFRESH_TOKEN_KEY`. The `aud`, `iss`, and `sub` verification checks are disabled. Endpoints requiring authentication use the `openmusic_jwt` strategy.

## Error Handling

Custom error hierarchy in `src/exception/`:
- `ClientError` — base for 4xx errors (status code 400 by default)
- `AuthenticationError` — 401
- `AuthorizationError` — 403
- `InvariantError` — 409
- `NotFoundError` — 404

Errors are caught by the `onPreResponse` extension in `server.js` and returned as a consistent `{ status: 'fail', message: '...' }` shape.

## Project Conventions

- **CommonJS** (`require`/`module.exports`) — not ES modules
- **ESLint 9.x** with `eslint-config-dicodingacademy` base, configured in `eslint.config.mjs`
- **Joi** for request validation; each domain has `validator/<domain>/schema.js` and `validator/<domain>/index.js`
- **Hapi plugin pattern**: each domain in `src/api/<domain>/` exports `{ name, version, register }` from `index.js`
- **`node-pg-migrate`** for migrations; migration files live in `migrations/` with timestamp prefixes
- **Album cover images** are stored in `src/api/albums/file/images/` (gitignored)