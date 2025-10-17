# OneCart Backend

A modern TypeScript Node.js backend API server built with Express.js.

## Features

- 🚀 **TypeScript** - Full type safety and modern JavaScript features
- 🛡️ **Security** - Helmet.js for security headers, CORS configuration
- 📊 **Monitoring** - Health check endpoints with detailed system information
- 🧪 **Testing** - Jest testing framework with TypeScript support
- 🔧 **Development** - Hot reload with nodemon, ESLint, Prettier
- 📦 **Package Manager** - pnpm for fast and efficient package management

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
- **Jest** for testing
- **ESLint** for code linting
- **Prettier** for code formatting
- **nodemon** for development hot reload

## Production

```bash
# Build the project
pnpm build

# Start production server
pnpm start
```

## License

MIT
