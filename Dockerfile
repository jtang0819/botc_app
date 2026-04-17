# Stage 1: Build the React client
FROM node:20-alpine AS client-builder

WORKDIR /app/client

# Copy client package files
COPY client/package*.json ./

# Install dependencies
RUN npm ci

# Copy client source
COPY client/src ./src
COPY client/index.html ./
COPY client/vite.config.js ./
COPY client/eslint.config.js ./
COPY client/public ./public

# Build the client
RUN npm run build

# Stage 2: Build the final image with server and client
FROM node:20-alpine

WORKDIR /app

# Copy server package files
COPY server/package*.json ./

# Install server dependencies (production only)
RUN npm ci --only=production

# Copy server source
COPY server/*.js ./

# Copy built client files from stage 1
COPY --from=client-builder /app/client/dist ./public

# Expose the port
EXPOSE 3001

# Start the server
CMD ["node", "server.js"]
