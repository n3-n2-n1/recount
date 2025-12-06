FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code and TypeScript config
COPY src ./src
COPY tsconfig.json ./

# Build the application
RUN npm run build

# Expose port (Railway sets PORT env var)
EXPOSE ${PORT:-3000}

# Start the application
CMD ["npm", "start"]
