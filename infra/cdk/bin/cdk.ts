#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { BeerOClockStack } from "../lib/cdk-stack";
import { GitHubRoleStack } from "../lib/github-role-stack";
import * as dotenv from "dotenv";
import * as dotenvExpand from "dotenv-expand";
import * as path from "path";
import * as fs from "fs";

const app = new cdk.App();

// Path to the root of the project (where your .env files live)
const rootPath = path.resolve(__dirname, "../../../");
console.log(`Project root path: ${rootPath}`);

// 1. Try .env.prod first, then fallback to .env
const prodEnv = path.join(rootPath, ".env.prod");
const devEnv = path.join(rootPath, ".env");
const envPath = fs.existsSync(prodEnv) ? prodEnv : devEnv;
console.log(`Checking for environment files...`);

if (fs.existsSync(envPath)) {
  const myEnv = dotenv.config({ path: envPath });
  dotenvExpand.expand(myEnv);
  console.log(`Using environment file: ${envPath}`);
} else {
  console.warn(
    `No .env file found at ${envPath}. Proceeding without loading environment variables from file.`,
  );
}

new BeerOClockStack(app, "BeerOClockStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: "ap-southeast-2",
  },
});

// One-time stack — deploy once locally to create the GitHub OIDC role.
// After deploying, copy the RoleArn output into .github/workflows/deploy.yml.
new GitHubRoleStack(app, "GitHubRoleStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: "ap-southeast-2",
  },
});
