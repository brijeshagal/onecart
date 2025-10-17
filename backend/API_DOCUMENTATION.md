# OneCart Backend API Documentation

## Overview

The OneCart Backend API provides two main endpoints: location search and user registration. It integrates with Blinkit's location API for address suggestions and manages user registration with social logins.

## Base URL

```
http://localhost:3000
```

## Authentication

Currently, the API does not require authentication. Future versions will implement JWT-based authentication.

## Endpoints

### Location Search

#### POST /api/search-location

Search for location suggestions based on user's coordinates and query.

**Request Body:**
```json
{
  "lat": 28.4652382,
  "lng": 77.0615957,
  "query": "delhi"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "title": {
          "text": "Delhi, India",
          "color": { "type": "black", "tint": "900" },
          "font": { "size": "400", "weight": "medium" }
        },
        "subtitle": {
          "text": "New Delhi, Delhi, India",
          "color": { "type": "grey", "tint": "700" },
          "font": { "size": "300", "weight": "regular" }
        },
        "left_image": {
          "url": "https://example.com/image.png"
        },
        "meta": {
          "place_id": "ChIJLQEq84deDTkR4vIaR2oNTpc",
          "session_token": "abc123"
        }
      }
    ],
    "query": "delhi",
    "coordinates": {
      "lat": 28.4652382,
      "lng": 77.0615957
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "message": "Invalid coordinates provided",
    "statusCode": 400
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### User Registration

#### POST /api/register

Register a new user with social logins, addresses, and wallet information.

**Request Body:**
```json
{
  "socialLogins": [
    {
      "platform": "farcaster",
      "username": "testuser123"
    }
  ],
  "email": "test@example.com",
  "phone": "+1234567890",
  "walletAddresses": ["0x1234567890abcdef"],
  "addresses": [
    {
      "name": "Home",
      "address": "123 Main Street, Apartment 4B",
      "floor": "4th Floor",
      "landmark": "Near Central Park",
      "phone": "+1234567890",
      "save_as": "home"
    }
  ],
  "defaultAddressIndex": 0,
  "askBeforeReceiving": true,
  "currentLatitude": 28.4652382,
  "currentLongitude": 77.0615957
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "1",
      "username": "testuser123",
      "email": "test@example.com",
      "phone": "+1234567890",
      "addresses": [
        {
          "id": "address-123",
          "name": "Home",
          "address": "123 Main Street, Apartment 4B",
          "floor": "4th Floor",
          "landmark": "Near Central Park",
          "phone": "+1234567890",
          "save_as": "home",
          "latitude": 28.4652382,
          "longitude": 77.0615957,
          "is_default": true,
          "created_at": "2024-01-01T00:00:00.000Z",
          "updated_at": "2024-01-01T00:00:00.000Z"
        }
      ],
      "defaultAddressIndex": 0,
      "askBeforeReceiving": true,
      "walletAddresses": ["0x1234567890abcdef"],
      "farcasterWalletAddress": -1,
      "primaryWalletIndex": -1,
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    },
    "message": "User registered successfully"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Data Types

### Social Login
```typescript
interface SocialLogin {
  platform: 'farcaster' | 'twitter' | 'discord' | 'telegram';
  username: string;
  walletAddress?: string;
}
```

### User Address
```typescript
interface UserAddress {
  id?: string;
  name: string; // Address display name
  address: string; // Main address details (max 60 chars)
  floor: string; // Floor information
  landmark: string; // Landmark information
  phone: string; // Phone number for this address
  save_as: string; // Address alias
  latitude?: number;
  longitude?: number;
  is_default?: boolean;
  created_at?: Date;
  updated_at?: Date;
}
```

### Blinkit API Response
```typescript
interface UISuggestion {
  title: UISuggestionText;
  subtitle: UISuggestionText;
  left_image: UIImage;
  meta: UISuggestionMeta;
}

interface UISuggestionText {
  text: string;
  color: UIColor;
  font: UIFont;
}

interface UIColor {
  type: string; // e.g. "black" | "grey"
  tint: string; // e.g. "900" | "700"
}

interface UIFont {
  size: string; // e.g. "400" | "300"
  weight: string; // e.g. "medium" | "regular"
}

interface UIImage {
  url: string;
}

interface UISuggestionMeta {
  place_id: string;
  session_token: string;
}
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "statusCode": 400
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `404` - Not Found
- `409` - Conflict
- `500` - Internal Server Error
- `503` - Service Unavailable

## Rate Limiting

Currently, no rate limiting is implemented. Future versions will include rate limiting for API protection.

## Testing

Run tests:
```bash
pnpm test
```

Run tests in watch mode:
```bash
pnpm test:watch
```

## Development

Start development server:
```bash
pnpm dev
```

Build for production:
```bash
pnpm build
```

Start production server:
```bash
pnpm start
```
