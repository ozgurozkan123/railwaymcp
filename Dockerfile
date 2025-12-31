FROM node:20-slim

# Install dependencies including curl for Railway CLI
RUN apt-get update && apt-get install -y \
    curl \
    bash \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Railway CLI
RUN curl -fsSL https://railway.com/install.sh | bash

# Set up working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install pnpm and dependencies
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the TypeScript
RUN pnpm build

# Set environment
ENV HOST=0.0.0.0
ENV PYTHONUNBUFFERED=1
ENV NODE_ENV=production

# Expose port
EXPOSE 8000

# Run the MCP server
CMD ["node", "dist/index.js"]
