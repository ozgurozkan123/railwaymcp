import { exec } from "node:child_process";
import { promisify } from "node:util";
import { analyzeRailwayError } from "./error-handling";

const execAsync = promisify(exec);

export const runRailwayCommand = async (command: string, cwd?: string) => {
  // Pass environment variables explicitly, including RAILWAY_API_TOKEN
  const env = { ...process.env };
  
  const { stdout, stderr } = await execAsync(command, { 
    cwd,
    env,
    // Increase buffer size for large outputs
    maxBuffer: 10 * 1024 * 1024,
  });
  return { stdout, stderr, output: stdout + stderr };
};

export const runRailwayJsonCommand = async (command: string, cwd?: string) => {
  const { stdout } = await runRailwayCommand(command, cwd);
  return JSON.parse(stdout.trim());
};

export const checkRailwayCliStatus = async (): Promise<void> => {
  try {
    await runRailwayCommand("railway --version");
    // Check if RAILWAY_API_TOKEN is set
    if (process.env.RAILWAY_API_TOKEN) {
      console.log("RAILWAY_API_TOKEN is configured");
    } else {
      console.log("Warning: RAILWAY_API_TOKEN not set");
    }
    await runRailwayCommand("railway whoami");
  } catch (error: unknown) {
    return analyzeRailwayError(error, "railway whoami");
  }
};
