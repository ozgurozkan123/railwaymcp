# Railway MCP Server

A Model Context Protocol (MCP) server for interacting with your Railway account. This is a deployed MCP server that provides a set of opinionated workflows and tools for managing Railway resources.

**Deployed Endpoint:** https://railwaymcp.onrender.com/mcp

> [!IMPORTANT]
> The MCP server doesn't include destructive actions by design, that said, you should still keep an eye on which tools and commands are being executed.

## Remote Deployment Configuration

This server is deployed on Render and can be used remotely. Configure your MCP client to connect to the deployed endpoint.

### Authentication Methods

The server supports two authentication methods:

#### 1. Environment Variables (Server-side)
The server has default Railway tokens set via environment variables:
- `RAILWAY_TOKEN` - Project token for project-level commands
- `RAILWAY_API_TOKEN` - Account/Team token for full access

#### 2. Request Headers (Per-request)
You can override tokens on a per-request basis by passing headers:
- `X-Railway-Token` or `Railway-Token` - For project tokens
- `X-Railway-Api-Token` or `Railway-Api-Token` - For account/team tokens

**Header tokens take precedence over environment variables.**

### Token Types

| Token Type | Environment Variable | Header | Capabilities |
|------------|---------------------|--------|--------------|
| Project Token | `RAILWAY_TOKEN` | `X-Railway-Token` | `railway up`, `railway logs`, `railway redeploy` |
| Account/Team Token | `RAILWAY_API_TOKEN` | `X-Railway-Api-Token` | All commands including `railway whoami`, `railway init`, `railway link` |

**Note:** You can only use one type of token at a time. If both are set, `RAILWAY_TOKEN` takes precedence.

### Getting Railway Tokens

#### Project Token
1. Go to your Railway project settings
2. Navigate to Settings > Tokens
3. Create a new Project Token

#### Account Token (Personal)
1. Go to https://railway.com/account/tokens
2. Create a new API token

#### Team Token
1. Go to your Team settings in Railway
2. Navigate to Tokens section
3. Create a new Team Token

## Client Configuration

### Cursor
Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "railway-mcp-server": {
      "url": "https://railwaymcp.onrender.com/mcp"
    }
  }
}
```

### Claude Desktop
Add to Claude Desktop config:

```json
{
  "mcpServers": {
    "railway-mcp-server": {
      "url": "https://railwaymcp.onrender.com/mcp"
    }
  }
}
```

### VS Code
Add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "railway-mcp-server": {
      "url": "https://railwaymcp.onrender.com/mcp"
    }
  }
}
```

## Available MCP Tools

The Railway MCP Server provides the following tools:

- `check-railway-status` - Checks Railway CLI status, token configuration, and authentication
- **Project Management**
  - `list-projects` - List all Railway projects
  - `create-project-and-link` - Create a new project and link it to a directory
- **Service Management**
  - `list-services` - List all services in a project
  - `link-service` - Link a service to a directory
  - `deploy` - Deploy a service
  - `deploy-template` - Deploy a template from the [Railway Template Library](https://railway.com/deploy)
- **Environment Management**
  - `create-environment` - Create a new environment
  - `link-environment` - Link an environment to a directory
- **Configuration & Variables**
  - `list-variables` - List environment variables
  - `set-variables` - Set environment variables
  - `generate-domain` - Generate a railway.app domain for a project
- **Monitoring & Logs**
  - `get-logs` - Retrieve build or deployment logs for a service
  - `list-deployments` - List deployments for a service

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/health` | GET | Health check with auth status |
| `/mcp` | POST | Main MCP endpoint (Streamable HTTP) |
| `/mcp/sse` | GET | SSE transport endpoint |
| `/mcp/messages` | POST | SSE message handling |

## Example Usage

### Creating a new project and deploying

```text
Create a Next.js app in this directory and deploy it to Railway. Make sure to also assign it a domain.
```

### Deploy a database template

```text
Deploy a Postgres database
```

### Pull environment variables

```text
Pull environment variables for my project and save them in a .env file
```

### Create a new environment

```text
Create a new development environment called `development` that duplicates production.
```

## Local Development

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 10.14.0
- Railway CLI installed

### Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/ozgurozkan123/railwaymcp.git
   cd railwaymcp
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Start development server**

   ```bash
   pnpm dev
   ```

4. **Build for production**

   ```bash
   pnpm build
   ```

## Docker Deployment

Build and run locally:

```bash
docker build -t railwaymcp .
docker run -p 8000:8000 -e RAILWAY_API_TOKEN=your-token railwaymcp
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port (default: 8000) | No |
| `HOST` | Server host (default: 0.0.0.0) | No |
| `RAILWAY_TOKEN` | Railway project token | No* |
| `RAILWAY_API_TOKEN` | Railway account/team token | No* |

*At least one token type is recommended for full functionality.
