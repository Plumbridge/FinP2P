# FinP2P Core - Production Dockerfile
# Multi-stage build for optimized production image

# =============================================================================
# STAGE 1: Build Stage
# =============================================================================
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build the application
RUN npm run build

# =============================================================================
# STAGE 2: Production Stage
# =============================================================================
FROM node:18-alpine AS production

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S finp2p -u 1001

# Set working directory
WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/adapters ./adapters
COPY --from=builder /app/core ./core
COPY --from=builder /app/demos ./demos
COPY --from=builder /app/layerzero-router ./layerzero-router
COPY --from=builder /app/frontend ./frontend

# Create logs directory
RUN mkdir -p logs && chown -R finp2p:nodejs logs

# Copy environment template
COPY env.example .env.example

# Switch to non-root user
USER finp2p

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["node", "dist/adapters/index.js"]
