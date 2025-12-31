#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
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
	const transports = new Map<string, SSEServerTransport>();

	const httpServer = http.createServer(async (req, res) => {
		// Set CORS headers
		res.setHeader("Access-Control-Allow-Origin", "*");
		res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, DELETE");
		res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept, Authorization");

		// Handle preflight
		if (req.method === "OPTIONS") {
			res.writeHead(204);
			res.end();
			return;
		}

		const url = new URL(req.url || "/", `http://${req.headers.host}`);
		const pathname = url.pathname;

		// Health check endpoint
		if (pathname === "/health" || pathname === "/") {
			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(JSON.stringify({
				status: "ok",
				name: "railway-mcp-server",
				version: getVersion(),
				endpoints: {
					sse: "/mcp/sse",
					messages: "/mcp/messages"
				}
			}));
			return;
		}

		// SSE endpoint - establishes SSE connection
		if (pathname === "/mcp/sse" && req.method === "GET") {
			console.log("SSE connection request received");
			
			const server = createServer();
			const transport = new SSEServerTransport("/mcp/messages", res);
			
			// Store the transport with a session ID
			const sessionId = transport.sessionId;
			transports.set(sessionId, transport);
			
			console.log(`SSE connection established, session: ${sessionId}`);

			// Clean up on close
			res.on("close", () => {
				console.log(`SSE connection closed, session: ${sessionId}`);
				transports.delete(sessionId);
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

			const transport = transports.get(sessionId);
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
		console.log(`SSE endpoint: http://${host}:${port}/mcp/sse`);
		console.log(`Messages endpoint: http://${host}:${port}/mcp/messages`);
	});
};

const startStdioServer = async () => {
	const server = createServer();
	const transport = new StdioServerTransport();
	await server.connect(transport);
};

const main = async () => {
	// Check if we should use SSE (for remote deployment) or stdio (for local)
	const useSSE = process.env.USE_SSE === "true" || process.env.PORT !== undefined;
	
	if (useSSE) {
		console.log("Starting Railway MCP Server with SSE transport...");
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
