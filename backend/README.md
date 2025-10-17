# OneCart Backend

A modern TypeScript Node.js backend API server built with Express.js for e-commerce integration with Blinkit India.

## Features

- 🚀 **TypeScript** - Full type safety and modern JavaScript features
- 🛡️ **Security** - Helmet.js for security headers, CORS configuration
- 📊 **Monitoring** - Health check endpoints with detailed system information
- 🧪 **Testing** - Jest testing framework with TypeScript support
- 🔧 **Development** - Hot reload with nodemon, ESLint, Prettier
- 📦 **Package Manager** - pnpm for fast and efficient package management
- 🌍 **Location Services** - Blinkit API integration for location search
- 🛒 **E-commerce Integration** - Product feed and search functionality
- 📱 **User Management** - User registration and profile management

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp env.example .env

# Start development server
pnpm dev
```

### Available Scripts

```bash
# Development
pnpm dev          # Start development server with hot reload
pnpm build        # Build for production
pnpm start        # Start production server

# Testing
pnpm test         # Run tests
pnpm test:watch   # Run tests in watch mode

# Code Quality
pnpm lint         # Run ESLint
pnpm lint:fix     # Fix ESLint issues
pnpm format       # Format code with Prettier

# Utilities
pnpm clean        # Clean build directory
```

## API Endpoints

### Health Check
- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed system information

### API
- `GET /api` - API information
- `GET /api/status` - API status

### Location Services
- `POST /api/search-location` - Search for location suggestions using Blinkit API

### User Management
- `POST /api/register` - Register new user
- `GET /api/user/:id` - Get user profile

### Feed Services
- `GET /api/feed` - Get home page product feed based on location (Blinkit India)

### Search Services
- `GET /api/search-items` - Search for products based on query and location

## Project Structure

```
backend/
├── src/
│   ├── controllers/     # Route controllers
│   ├── middleware/      # Custom middleware
│   ├── routes/         # Route definitions
│   ├── services/       # Business logic
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Utility functions
│   └── index.ts        # Application entry point
├── tests/              # Test files
├── dist/               # Build output (generated)
└── package.json        # Dependencies and scripts
```

## Environment Variables

Copy `env.example` to `.env` and configure:

```env
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

## Development

The project uses:
- **TypeScript** for type safety
- **Express.js** for the web framework
- **MongoDB** for database
- **Jest** for testing
- **ESLint** for code linting
- **Prettier** for code formatting
- **nodemon** for development hot reload
- **Swagger** for API documentation

## API Documentation

Visit `http://localhost:4000/api-docs` for interactive API documentation.

## Production

```bash
# Build the project
pnpm build

# Start production server
pnpm start
```

## License

MIT
