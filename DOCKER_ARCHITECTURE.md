# Docker Architecture Guide - Picxel-Puzzle

## Understanding the Multi-Stage Dockerfile

This document explains the Docker build architecture to prevent confusion and ensure proper usage.

## 🏗️ Multi-Stage Build Overview

Our Dockerfile uses **4 distinct stages**, each with a specific purpose:

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│    BASE     │───▶│ DEVELOPMENT │    │   BUILDER   │───▶│ PRODUCTION  │
│   STAGE     │    │   STAGE     │    │   STAGE     │    │   STAGE     │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

### 1. BASE Stage
**Purpose:** Common foundation for all other stages
```dockerfile
FROM node:20-alpine AS base
```
- Installs system dependencies (Sharp, Python, build tools)
- Sets up working directory
- Installs **production dependencies only** (`--omit=dev`)
- **Used by:** Development, Builder, and Production stages

### 2. DEVELOPMENT Stage
**Purpose:** For local development with hot reload
```dockerfile
FROM base AS development
```
- Installs **all dependencies** (including dev dependencies)
- Copies source code directly
- Runs `npm run dev` (uses `tsx` for TypeScript)
- **Target for:** `docker-compose --profile dev up app-dev`

### 3. BUILDER Stage
**Purpose:** Builds the production application
```dockerfile
FROM base AS builder
```
- Installs **all dependencies** (needs dev tools for building)
- Copies source code
- Runs `npm run build` to create production assets
- **Output:** `dist/` directory with built application
- **Never runs directly** - only used to build artifacts

### 4. PRODUCTION Stage
**Purpose:** Optimized runtime for production deployment
```dockerfile
FROM node:20-alpine AS production
```
- Fresh Alpine image (smaller, more secure)
- Installs **production dependencies only**
- Copies **built artifacts** from BUILDER stage
- Creates non-root user for security
- Runs `npm start` (runs pre-built `dist/index.js`)
- **Target for:** `docker-compose up app`

## 🚫 Common Mistakes to Avoid

### ❌ Wrong: Mixing Development and Production Commands

```dockerfile
# NEVER DO THIS in builder stage:
RUN npm run dev  # ❌ This is for development, not building

# NEVER DO THIS in production stage:
CMD ["npm", "run", "dev"]  # ❌ This needs dev dependencies
```

### ✅ Correct: Use Appropriate Commands for Each Stage

```dockerfile
# Builder stage - builds the app:
RUN npm run build  # ✅ Creates production assets

# Production stage - runs pre-built app:
CMD ["npm", "start"]  # ✅ Runs dist/index.js
```

## 📋 Build Scripts Explained

From `package.json`:
```json
{
  "scripts": {
    "dev": "NODE_ENV=development tsx server/index.ts",      // 🔧 Development
    "build": "vite build && esbuild server/index.ts ...",   // 🏗️ Build
    "start": "NODE_ENV=production node dist/index.js"       // 🚀 Production
  }
}
```

### Script Usage by Stage:
- **Development Stage:** `npm run dev` (direct TypeScript execution)
- **Builder Stage:** `npm run build` (creates production build)
- **Production Stage:** `npm start` (runs compiled JavaScript)

## 🐳 Docker Compose Services

### Production Service (`app`)
```yaml
app:
  target: production  # Uses PRODUCTION stage
  environment:
    - NODE_ENV=production
```

### Development Service (`app-dev`)
```yaml
app-dev:
  target: development  # Uses DEVELOPMENT stage
  environment:
    - NODE_ENV=development
  profiles: [dev]
```

## 🔄 Build Flow Visualization

```
Source Code
    │
    ▼
┌─────────────────┐
│ BUILDER Stage   │
│ npm run build   │ ──┐
└─────────────────┘   │
                      │ Built Assets (dist/)
                      │
                      ▼
              ┌─────────────────┐
              │ PRODUCTION Stage│
              │ npm start       │
              └─────────────────┘
```

## 🛠️ Development vs Production

| Aspect | Development | Production |
|--------|-------------|------------|
| **Dependencies** | All (dev + prod) | Production only |
| **TypeScript** | Direct execution (`tsx`) | Pre-compiled (`node`) |
| **Hot Reload** | ✅ Yes | ❌ No |
| **Build Step** | ❌ Not needed | ✅ Required |
| **Source Code** | Mounted as volume | Copied into image |
| **Security** | Root user OK | Non-root user |
| **Image Size** | Larger | Optimized |

## 🚀 Usage Commands

### For Development (with hot reload):
```bash
docker-compose --profile dev up app-dev --build
```

### For Production:
```bash
docker-compose up app --build
```

### Build Only:
```bash
docker-compose build --no-cache
```

## 🔍 Troubleshooting Guide

### Error: "tsx: not found"
**Cause:** Trying to run `npm run dev` in production stage
**Fix:** Use `npm start` in production, `npm run dev` only in development

### Error: "Missing script: build:prod"
**Cause:** Using non-existent script name
**Fix:** Use exact script names from `package.json`

### Error: "Cannot find module './dist/index.js'"
**Cause:** Production stage trying to run unbuild app
**Fix:** Ensure builder stage runs `npm run build`

### Error: Lock file sync issues
**Cause:** `npm ci` strict requirements
**Fix:** Use `npm install` (already implemented)

## 📁 File Structure After Build

```
/app/
├── dist/                    # Built application (from builder)
│   ├── index.js            # Compiled server
│   └── public/             # Built frontend assets
├── migrations/             # Database migrations
├── shared/                 # Shared TypeScript definitions
├── uploads/                # File uploads (volume)
└── package.json           # Dependencies
```

## 🔒 Security Best Practices

1. **Non-root user** in production stage
2. **Minimal dependencies** in production (no dev tools)
3. **Fresh base image** for production (no build artifacts)
4. **Health checks** for monitoring
5. **Volume mounting** for persistent data

## 📝 Key Takeaways

1. **Never mix development and production commands**
2. **Builder stage builds, production stage runs**
3. **Development stage is for development only**
4. **Each stage has specific dependencies and purposes**
5. **Use appropriate Docker Compose services for each environment**

This architecture ensures:
- ✅ Fast development with hot reload
- ✅ Optimized production builds
- ✅ Security best practices
- ✅ Minimal production image size
- ✅ Clear separation of concerns
