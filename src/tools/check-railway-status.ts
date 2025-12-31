import { checkRailwayCliStatus, getRequestTokens } from "../cli";
import { createToolResponse } from "../utils";

export const checkRailwayStatusTool = {
	name: "check-railway-status",
	title: "Check Railway CLI Status",
	description:
		"Check whether the Railway CLI is installed and if the user is logged in. This tool helps agents verify the Railway CLI setup before attempting to use other Railway tools.",
	inputSchema: {},
	handler: async () => {
		try {
			const { version, tokenType, tokenStatus } = await checkRailwayCliStatus();
			const requestTokens = getRequestTokens();
			
			const tokenSource = requestTokens.token || requestTokens.apiToken 
				? "via request header" 
				: "via environment variable";
			
			return createToolResponse(
				"✅ Railway CLI Status Check Passed\n\n" +
					`**CLI Version:** ${version}\n` +
					`**Token Type:** ${tokenType}\n` +
					`**Token Source:** ${tokenSource}\n` +
					`**Status:** ${tokenStatus}\n\n` +
					"**Available Commands based on token type:**\n" +
					(tokenType === "project" 
						? "• `railway up` - Deploy current directory\n• `railway logs` - View logs\n• `railway redeploy` - Redeploy service\n\n" +
						  "**Note:** Project tokens cannot use: `railway whoami`, `railway init`, `railway link`"
						: tokenType === "account/team"
						? "• All Railway CLI commands available\n• `railway whoami`, `railway init`, `railway link`, etc."
						: "• Please set RAILWAY_TOKEN or RAILWAY_API_TOKEN to use Railway commands"),
			);
		} catch (error: unknown) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error occurred";
			return createToolResponse(
				"❌ Railway CLI Status Check Failed\n\n" +
					`**Error:** ${errorMessage}\n\n` +
					"**Next Steps:**\n" +
					"• If Railway CLI is not installed: Install it from https://docs.railway.com/guides/cli\n" +
					"• If not logged in: Set RAILWAY_TOKEN or RAILWAY_API_TOKEN environment variable\n" +
					"• Or pass tokens via request headers: X-Railway-Token or X-Railway-Api-Token\n\n" +
					"**Token Types:**\n" +
					"• RAILWAY_TOKEN: Project token - limited to project-level commands\n" +
					"• RAILWAY_API_TOKEN: Account/Team token - full access to all commands",
			);
		}
	},
};
