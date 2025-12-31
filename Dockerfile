FROM node:20-slim

# Install dependencies 
RUN apt-get update && apt-get install -y \
    curl \
    bash \
    ca-certificates \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Install Railway CLI directly from GitHub releases
# Download the specific version to avoid network issues with install script
RUN wget -q https://github.com/railwayapp/cli/releases/download/v4.16.1/railway-v4.16.1-amd64.deb -O /tmp/railway.deb \
    && dpkg -i /tmp/railway.deb \
    && rm /tmp/railway.deb

# Verify Railway CLI installation
RUN railway --version

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
ENV NODE_ENV=production

# Expose port
EXPOSE 8000

# Run the MCP server
CMD ["node", "dist/index.js"]
