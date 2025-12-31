import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export const getRailwayAuthToken = (): string => {
	// First, check for environment variable (for remote deployments)
	const envToken = process.env.RAILWAY_TOKEN || process.env.RAILWAY_API_TOKEN;
	if (envToken) {
		return envToken;
	}

	// Fall back to config file (for local usage)
	const homeDir = homedir();
	const configPath = join(homeDir, ".railway", "config.json");

	try {
		const configData = readFileSync(configPath, "utf-8");
		const config = JSON.parse(configData);

		if (config.user?.token) {
			return config.user.token;
		}
	} catch {
		throw new Error(
			"Railway config file not found or invalid. Set RAILWAY_TOKEN environment variable or run 'railway login' to authenticate",
		);
	}

	throw new Error(
		"No Railway authentication token found. Set RAILWAY_TOKEN environment variable or run 'railway login' to authenticate",
	);
};
