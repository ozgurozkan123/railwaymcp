import { exec } from "node:child_process";
import { promisify } from "node:util";
import { analyzeRailwayError } from "./error-handling";

const execAsync = promisify(exec);

export const runRailwayCommand = async (command: string, cwd?: string) => {
  // Pass all environment variables explicitly
  // Railway CLI uses either RAILWAY_TOKEN (project token) or RAILWAY_API_TOKEN (account/team token)
  const env = { ...process.env };
  
  // Debug logging
  console.log(`Running command: ${command}`);
  console.log(`RAILWAY_TOKEN set: ${!!env.RAILWAY_TOKEN}`);
  console.log(`RAILWAY_API_TOKEN set: ${!!env.RAILWAY_API_TOKEN}`);
  
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

export const checkRailwayCliStatus = async (): Promise<void> => {
  try {
    const versionResult = await runRailwayCommand("railway --version");
    console.log(`Railway CLI version: ${versionResult.stdout.trim()}`);
    
    // Check which token is configured
    const hasProjectToken = !!process.env.RAILWAY_TOKEN;
    const hasAccountToken = !!process.env.RAILWAY_API_TOKEN;
    
    console.log(`Token status - RAILWAY_TOKEN: ${hasProjectToken}, RAILWAY_API_TOKEN: ${hasAccountToken}`);
    
    const whoamiResult = await runRailwayCommand("railway whoami");
    console.log(`Whoami result: ${whoamiResult.stdout.trim()}`);
  } catch (error: unknown) {
    console.error("Railway CLI error:", error);
    return analyzeRailwayError(error, "railway whoami");
  }
};
