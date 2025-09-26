# -----------------------------
# Base stage (common setup)
# -----------------------------
FROM node:20-alpine AS base

# Install system dependencies for Sharp and other native modules
RUN apk add --no-cache \
    libc6-compat \
    python3 \
    make \
    g++ \
    vips-dev

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (production only for base)
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force

# -----------------------------
# Development stage
# -----------------------------
FROM base AS development
ENV NODE_ENV=development

# Install all dependencies including dev dependencies
RUN npm install --no-audit --no-fund

# Copy source code
COPY . .

# Expose port
EXPOSE 5000

# Start development server
CMD ["npm", "run", "dev"]

# -----------------------------
# Builder stage
# -----------------------------
FROM node:20-alpine AS builder
ENV NODE_ENV=production

# Install system dependencies for building
RUN apk add --no-cache \
    libc6-compat \
    python3 \
    make \
    g++ \
    vips-dev

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies for building (including dev dependencies)
RUN npm install --no-audit --no-fund

# Copy source code
COPY . .

# Build the application
RUN npm run build
  
# -----------------------------
# Production stage
# -----------------------------
FROM node:20-alpine AS production
ENV NODE_ENV=production

# Install system dependencies for Sharp
RUN apk add --no-cache \
    libc6-compat \
    vips-dev

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist

# Copy necessary runtime files
COPY --chown=nextjs:nodejs migrations ./migrations
COPY --chown=nextjs:nodejs shared ./shared
COPY --chown=nextjs:nodejs drizzle.config.ts ./

# Create uploads directory with proper permissions
RUN mkdir -p uploads && chown -R nextjs:nodejs uploads

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

# Start production server
CMD ["npm", "start"]
  