#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import * as http from "node:http";
import * as tools from "./tools";
import { getVersion } from "./utils";

const createServer = () => {
	const server = new McpServer(
		{
			name: "railway-mcp-server",
			title: "Railway MCP Server",
			version: getVersion(),
		},
		{
			capabilities: {
				logging: {},
			},
		},
	);

	Object.values(tools).forEach((tool) => {
		server.registerTool(
			tool.name,
			{
				title: tool.title,
				description: tool.description,
				inputSchema: tool.inputSchema,
			},
			tool.handler,
		);
	});

	return server;
};

const startHttpServer = async () => {
	const port = parseInt(process.env.PORT || "8000", 10);
	const host = process.env.HOST || "0.0.0.0";

	// Map to store SSE transports for each session
	const sseTransports = new Map<string, SSEServerTransport>();
	
	// Streamable HTTP transport for stateless POST requests
	const httpTransport = new StreamableHTTPServerTransport({
		sessionIdGenerator: undefined, // Stateless mode
	});
	
	// Create and connect an MCP server for HTTP transport
	const httpMcpServer = createServer();
	await httpMcpServer.connect(httpTransport);

	const httpServer = http.createServer(async (req, res) => {
		// Set CORS headers
		res.setHeader("Access-Control-Allow-Origin", "*");
		res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, DELETE");
		res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept, Authorization, Mcp-Session-Id");
		res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");

		// Handle preflight
		if (req.method === "OPTIONS") {
			res.writeHead(204);
			res.end();
			return;
		}

		const url = new URL(req.url || "/", `http://${req.headers.host}`);
		const pathname = url.pathname;

		// Health check endpoint
		if ((pathname === "/health" || pathname === "/") && req.method === "GET") {
			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(JSON.stringify({
				status: "ok",
				name: "railway-mcp-server",
				version: getVersion(),
				transport: "streamable-http",
				endpoints: {
					mcp: "/mcp",
					sse: "/mcp/sse",
					messages: "/mcp/messages"
				}
			}));
			return;
		}

		// Main MCP endpoint - handles POST requests for Streamable HTTP transport
		if (pathname === "/mcp" && req.method === "POST") {
			console.log("MCP POST request received");
			try {
				await httpTransport.handleRequest(req, res);
			} catch (error) {
				console.error("Error handling MCP request:", error);
				if (!res.headersSent) {
					res.writeHead(500, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ error: "Internal server error" }));
				}
			}
			return;
		}

		// Also handle DELETE for session cleanup (required by Streamable HTTP spec)
		if (pathname === "/mcp" && req.method === "DELETE") {
			console.log("MCP DELETE request received");
			try {
				await httpTransport.handleRequest(req, res);
			} catch (error) {
				console.error("Error handling MCP DELETE:", error);
				if (!res.headersSent) {
					res.writeHead(500, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ error: "Internal server error" }));
				}
			}
			return;
		}

		// SSE endpoint - establishes SSE connection (for clients that prefer SSE)
		if (pathname === "/mcp/sse" && req.method === "GET") {
			console.log("SSE connection request received");
			
			const server = createServer();
			const transport = new SSEServerTransport("/mcp/messages", res);
			
			// Store the transport with a session ID
			const sessionId = transport.sessionId;
			sseTransports.set(sessionId, transport);
			
			console.log(`SSE connection established, session: ${sessionId}`);

			// Clean up on close
			res.on("close", () => {
				console.log(`SSE connection closed, session: ${sessionId}`);
				sseTransports.delete(sessionId);
			});

			await server.connect(transport);
			return;
		}

		// Messages endpoint - receives POST messages for an SSE session
		if (pathname === "/mcp/messages" && req.method === "POST") {
			const sessionId = url.searchParams.get("sessionId");
			
			if (!sessionId) {
				res.writeHead(400, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ error: "Missing sessionId parameter" }));
				return;
			}

			const transport = sseTransports.get(sessionId);
			if (!transport) {
				res.writeHead(404, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ error: "Session not found" }));
				return;
			}

			// Read request body
			let body = "";
			req.on("data", (chunk) => {
				body += chunk.toString();
			});

			req.on("end", async () => {
				try {
					await transport.handlePostMessage(req, res, body);
				} catch (error) {
					console.error("Error handling message:", error);
					if (!res.headersSent) {
						res.writeHead(500, { "Content-Type": "application/json" });
						res.end(JSON.stringify({ error: "Internal server error" }));
					}
				}
			});
			return;
		}

		// 404 for unknown paths
		res.writeHead(404, { "Content-Type": "application/json" });
		res.end(JSON.stringify({ error: "Not found", path: pathname }));
	});

	httpServer.listen(port, host, () => {
		console.log(`Railway MCP Server running on http://${host}:${port}`);
		console.log(`MCP endpoint (Streamable HTTP): http://${host}:${port}/mcp`);
		console.log(`SSE endpoint: http://${host}:${port}/mcp/sse`);
	});
};

const startStdioServer = async () => {
	const server = createServer();
	const transport = new StdioServerTransport();
	await server.connect(transport);
};

const main = async () => {
	// Check if we should use HTTP (for remote deployment) or stdio (for local)
	const useHttp = process.env.USE_HTTP === "true" || process.env.PORT !== undefined;
	
	if (useHttp) {
		console.log("Starting Railway MCP Server with HTTP transport...");
		await startHttpServer();
	} else {
		console.log("Starting Railway MCP Server with stdio transport...");
		await startStdioServer();
	}
};

main().catch((error) => {
	console.error("Failed to start Railway MCP server:", error);
	process.exit(1);
});
