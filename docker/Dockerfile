FROM node:18-alpine

# Create non-root user first
RUN addgroup -g 1001 -S nodejs && \
    adduser -S finp2p -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Create necessary directories with correct ownership
RUN mkdir -p /app/logs /app/config && \
    chown -R finp2p:nodejs /app

# Switch to non-root user early
USER finp2p

# Install dependencies first (for better caching)
COPY --chown=finp2p:nodejs package.json ./
RUN npm install

# Copy only necessary source files
COPY --chown=finp2p:nodejs src/ ./src/
COPY --chown=finp2p:nodejs tsconfig.json ./

# Build TypeScript
RUN npm run build

# Remove dev dependencies to reduce image size
RUN npm prune --production

# Switch to non-root user
USER finp2p

# Expose ports
EXPOSE 3000 50051

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node dist/healthcheck.js

# Start the application
CMD ["node", "dist/index.js"]