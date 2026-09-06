# System Architecture — FixLink Mobile

## 1. System Overview
FixLink Mobile is built with a decoupled client-server architecture:
- **Frontend:** React Native with Expo (SDK 57) / TypeScript / JavaScript.
- **Backend:** Node.js Express REST API server.
- **Database & Services:** Firebase (Firestore / Realtime DB / Firebase Admin SDK) + Local/Cloud file uploads (Multer).

## 2. Directory Map
- `/mobile`: React Native / Expo mobile application.
  - `/src/components`: Reusable UI components.
  - `/src/navigation`: App navigation and role-based routing (`AppNavigator.js`).
  - `/src/screens`: Role-specific screens (`auth/`, `customer/`, `technician/`).
  - `/src/services`: API clients and service integration (`api.js`).
- `/backend`: Node.js Express backend service.
  - `/src`: Server entry point and API route definitions.
  - `/uploads`: Storage directory for request attachments/media.
- `/.clinerules`: Cline AI governance and rules.
- `/context`: System specification and architecture source of truth.

## 3. Communication Patterns
- Mobile client communicates with Backend via HTTP REST endpoints (`axios`).
- File uploads are handled via `multipart/form-data` with `multer`.
- Backend interacts with Firebase services using `firebase-admin`.

