# Data Schema Specification — FixLink Mobile

## 1. Firebase Collections / Data Models

### `users` Collection
- `id` (string, primary key / auth UID)
- `name` (string)
- `email` (string)
- `role` (string: `'customer'` | `'technician'`)
- `phone` (string, optional)
- `createdAt` (timestamp)

### `requests` / `jobs` Collection
- `id` (string, auto-generated)
- `customerId` (string, reference to `users.id`)
- `customerName` (string)
- `title` (string)
- `description` (string)
- `category` (string)
- `location` (object: `{ latitude: number, longitude: number, address: string }`)
- `status` (string: `'pending'` | `'assigned'` | `'in_progress'` | `'completed'` | `'cancelled'`)
- `technicianId` (string, reference to `users.id` or `null`)
- `attachments` (array of strings: URLs/paths to photos/docs)
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

### `announcements` Collection
- `id` (string)
- `title` (string)
- `message` (string)
- `active` (boolean)
- `createdAt` (timestamp)

### `technicianProfiles` Collection
- `technicianId` (string, reference to `users.id`)
- `skills` (array of strings)
- `rating` (number)
- `completedJobsCount` (number)
- `isAvailable` (boolean)

