# TogetherForGood — Backend API

Backend REST API for TogetherForGood, a Social Development Events Platform where users can create, manage, discover, and join community service events.

## Live Links

- Frontend: https://together-for-good-client.vercel.app
- Backend API: https://together-for-good-server.onrender.com
- Client Repository: https://github.com/fatemakhatun21/together-for-good-client
- Server Repository: https://github.com/fatemakhatun21/together-for-good-server

## Technologies Used

- Node.js
- Express.js
- MongoDB Atlas
- JavaScript
- JOSE for JWT verification
- CORS
- dotenv

## Key Features

- RESTful API for community events
- MongoDB database integration
- Create, read, update, and delete events
- Retrieve upcoming and recent events
- JWT authentication for protected API endpoints
- Event ownership verification for update and delete operations
- Join events and prevent duplicate participation
- Retrieve events joined by the authenticated user
- Retrieve events created by the authenticated user

## API Endpoints

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/events` | Retrieve events |
| GET | `/upcoming-events` | Retrieve upcoming events |
| GET | `/recent-events` | Retrieve recent upcoming events |
| GET | `/events/:id` | Retrieve a specific event |

### Protected Endpoints

These endpoints require a valid JWT access token.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/events` | Create a new event |
| PATCH | `/events/:id` | Update an event created by the user |
| DELETE | `/events/:id` | Delete an event created by the user |
| GET | `/my-events` | Retrieve events created by the user |
| POST | `/join-events` | Join an event |
| GET | `/joined-events` | Retrieve joined events |
| GET | `/join-events/:eventId/status` | Check event participation status |

## Authentication and Authorization

The frontend uses Better Auth for authentication.

Protected API requests include a JWT in the Authorization header:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

The backend verifies authentication tokens using JOSE and the frontend application's public JWKS endpoint.

The backend also checks event ownership before allowing users to edit or delete events.

## Database

MongoDB Atlas stores application data.

Main collections:

- `events` — Event details and creator information
- `joinedEvents` — Event participation records

## Environment Variables

Create a `.env` file in the server project root.

```env
MONGODB_URI=your_mongodb_connection_string
BETTER_AUTH_URL=http://localhost:3000
PORT=5000
```

Replace placeholder values with your configuration.

For production, `BETTER_AUTH_URL` must point to the deployed frontend domain:

```env
BETTER_AUTH_URL=https://together-for-good-client.vercel.app
```

Never commit database credentials or secret values to GitHub.

## Installation and Local Setup

### 1. Clone Repository

```bash
git clone https://github.com/fatemakhatun21/together-for-good-server.git
```

### 2. Navigate to Project

```bash
cd together-for-good-server
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment Variables

Create the `.env` file with the required values.

### 5. Start Development Server

```bash
npm run dev
```

The API is available at:

http://localhost:5000

Example public endpoint:

http://localhost:5000/events

## Deployment

The backend is deployed on Render.

Production URL:

https://together-for-good-server.onrender.com

The MongoDB database is hosted on MongoDB Atlas.

## Security

- JWT verification for protected endpoints
- Authentication required for creating and joining events
- Ownership-based authorization for editing and deleting events
- Duplicate event participation prevention
- Database credentials stored in environment variables

## Project Purpose

TogetherForGood connects people through community-driven events and encourages social service, volunteering, and local development initiatives.

## Developer

Developed as part of the Programming Hero Web Development Assignment.

GitHub: https://github.com/fatemakhatun21
