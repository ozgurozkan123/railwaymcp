#!/bin/bash
set -e

echo "=== Railway MCP Server Startup ==="
echo "Checking Railway CLI..."

# Verify Railway CLI is installed
railway --version
export RAILWAY_API_TOKEN=43bcaad8-00dc-423d-9c12-856ec461a089
unset RAILWAY_TOKEN
railway login --browserless
# Check if RAILWAY_TOKEN or RAILWAY_API_TOKEN is set
if [ -n "$RAILWAY_TOKEN" ] || [ -n "$RAILWAY_API_TOKEN" ]; then
    echo "Railway token detected, verifying authentication..."
    
    # For RAILWAY_API_TOKEN (account/team token), we can verify with whoami
    if [ -n "$RAILWAY_API_TOKEN" ]; then
        echo "Using RAILWAY_API_TOKEN for authentication"
        # Try whoami to verify the token works
        if railway whoami 2>/dev/null; then
            echo "✓ Railway CLI authenticated successfully via RAILWAY_API_TOKEN"
        else
            echo "⚠ RAILWAY_API_TOKEN may be invalid, but proceeding anyway"
        fi
    fi
    
    # For RAILWAY_TOKEN (project token), whoami won't work but deployment commands will
    if [ -n "$RAILWAY_TOKEN" ] && [ -z "$RAILWAY_API_TOKEN" ]; then
        echo "Using RAILWAY_TOKEN for project-level authentication"
        echo "✓ Project token configured (whoami not available with project tokens)"
    fi
else
    echo "⚠ Warning: No Railway token configured"
    echo "Set RAILWAY_TOKEN or RAILWAY_API_TOKEN environment variable"
fi

echo ""
echo "Starting Railway MCP Server..."
echo "==================================="

# Execute the main command
exec "$@"
