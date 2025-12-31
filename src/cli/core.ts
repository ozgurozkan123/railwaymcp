import { exec } from "node:child_process";
import { promisify } from "node:util";
import { analyzeRailwayError } from "./error-handling";

const execAsync = promisify(exec);

// Global token storage that can be set from request headers
let requestToken: string | null = null;
let requestApiToken: string | null = null;

export const setRequestTokens = (token: string | null, apiToken: string | null) => {
  requestToken = token;
  requestApiToken = apiToken;
};

export const getRequestTokens = () => ({
  token: requestToken,
  apiToken: requestApiToken,
});

export const getCurrentEnv = () => {
  const env = { ...process.env };
  
  // Override with request-level tokens if provided
  if (requestToken) {
    env.RAILWAY_TOKEN = requestToken;
  }
  if (requestApiToken) {
    env.RAILWAY_API_TOKEN = requestApiToken;
  }
  
  return env;
};

export const runRailwayCommand = async (command: string, cwd?: string) => {
  // Pass all environment variables explicitly
  // Railway CLI uses either RAILWAY_TOKEN (project token) or RAILWAY_API_TOKEN (account/team token)
  // Priority: Request headers > Environment variables
  const env = getCurrentEnv();
  
  // Debug logging
  console.log(`Running command: ${command}`);
  console.log(`RAILWAY_TOKEN set: ${!!env.RAILWAY_TOKEN}`);
  console.log(`RAILWAY_API_TOKEN set: ${!!env.RAILWAY_API_TOKEN}`);
  console.log(`Token source: ${requestToken || requestApiToken ? 'header' : 'env'}`);
  
  const { stdout, stderr } = await execAsync(command, { 
    cwd,
    env,
    // Increase buffer size for large outputs
    maxBuffer: 10 * 1024 * 1024,
  });
  
  if (stderr) {
    console.log(`Command stderr: ${stderr}`);
  }
  
  return { stdout, stderr, output: stdout + stderr };
};

export const runRailwayJsonCommand = async (command: string, cwd?: string) => {
  const { stdout } = await runRailwayCommand(command, cwd);
  return JSON.parse(stdout.trim());
};

export const checkRailwayCliStatus = async (): Promise<{ version: string; tokenType: string; tokenStatus: string }> => {
  // Check Railway CLI version
  let version = "unknown";
  try {
    const versionResult = await runRailwayCommand("railway --version");
    version = versionResult.stdout.trim();
    console.log(`Railway CLI version: ${version}`);
  } catch (error) {
    console.error("Railway CLI version check failed:", error);
    throw new Error("Railway CLI is not installed or not accessible");
  }
  
  const env = getCurrentEnv();
  const hasProjectToken = !!env.RAILWAY_TOKEN;
  const hasAccountToken = !!env.RAILWAY_API_TOKEN;
  
  console.log(`Token status - RAILWAY_TOKEN: ${hasProjectToken}, RAILWAY_API_TOKEN: ${hasAccountToken}`);
  
  // Determine token type for informational purposes
  let tokenType = "none";
  let tokenStatus = "No token configured";
  
  if (hasProjectToken && !hasAccountToken) {
    tokenType = "project";
    tokenStatus = "Project token configured (limited to project-level commands like 'railway up', 'railway logs')";
  } else if (hasAccountToken) {
    tokenType = "account/team";
    tokenStatus = "Account/Team token configured (full access to all commands)";
  } else if (hasProjectToken && hasAccountToken) {
    tokenType = "both (project takes precedence)";
    tokenStatus = "Both tokens configured - RAILWAY_TOKEN takes precedence";
  }
  
  // Only try whoami if we have an account token (project tokens don't support whoami)
  if (hasAccountToken) {
    try {
      const whoamiResult = await runRailwayCommand("railway whoami");
      console.log(`Whoami result: ${whoamiResult.stdout.trim()}`);
      tokenStatus = `Account/Team token valid - ${whoamiResult.stdout.trim()}`;
    } catch (error: unknown) {
      console.error("Railway whoami failed:", error);
      // Token might be invalid
      tokenStatus = "Account/Team token configured but may be invalid or expired";
    }
  } else if (hasProjectToken) {
    // For project tokens, we can't run whoami, but we can try to validate by listing projects
    // or just report that we have a token set
    tokenStatus = "Project token configured - use project-level commands (railway up, railway logs, railway redeploy)";
  }
  
  return { version, tokenType, tokenStatus };
};
