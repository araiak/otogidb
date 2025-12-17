/**
 * Cloudflare Pages Deployment Poller
 *
 * Polls Cloudflare Pages API until the deployment for a specific commit
 * has completed successfully.
 */

import type { CloudflareDeploymentsResponse, CloudflareDeployment } from './types.js';
import { writeFileSync, appendFileSync } from 'fs';

const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_PROJECT_NAME = process.env.CLOUDFLARE_PROJECT_NAME || 'otogidb';
const TARGET_BRANCH = process.env.TARGET_BRANCH || 'dev';
const GITHUB_SHA = process.env.GITHUB_SHA; // Full commit hash from GitHub Actions

// Polling configuration
const POLL_INTERVAL_MS = 15000; // 15 seconds
const MAX_POLL_TIME_MS = 600000; // 10 minutes
const API_BASE = 'https://api.cloudflare.com/client/v4';

interface PollerResult {
  success: boolean;
  deployment?: CloudflareDeployment;
  shortHash?: string;
  error?: string;
}

function getShortHash(fullHash: string | undefined): string {
  return fullHash ? fullHash.substring(0, 7) : 'unknown';
}

async function fetchDeployments(): Promise<CloudflareDeploymentsResponse> {
  const url = `${API_BASE}/accounts/${CLOUDFLARE_ACCOUNT_ID}/pages/projects/${CLOUDFLARE_PROJECT_NAME}/deployments`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Cloudflare API error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<CloudflareDeploymentsResponse>;
}

function findDeploymentByCommit(
  deployments: CloudflareDeployment[],
  commitHash: string,
  branch: string
): CloudflareDeployment | undefined {
  // Find deployment matching the commit hash (can be partial match)
  return deployments.find((d) => {
    const deployCommit = d.deployment_trigger?.metadata?.commit_hash;
    const deployBranch = d.deployment_trigger?.metadata?.branch;

    // Match by commit hash (supports both full and short hash comparison)
    const hashMatches = deployCommit && (
      deployCommit === commitHash ||
      deployCommit.startsWith(commitHash) ||
      commitHash.startsWith(deployCommit)
    );

    // Also verify branch matches
    return hashMatches && deployBranch === branch;
  });
}

function findLatestDeploymentForBranch(
  deployments: CloudflareDeployment[],
  branch: string
): CloudflareDeployment | undefined {
  const branchDeployments = deployments
    .filter((d) => d.deployment_trigger?.metadata?.branch === branch)
    .sort((a, b) => new Date(b.created_on).getTime() - new Date(a.created_on).getTime());

  return branchDeployments[0];
}

async function waitForDeployment(): Promise<PollerResult> {
  const startTime = Date.now();
  const shortHash = getShortHash(GITHUB_SHA);
  const useCommitMatch = !!GITHUB_SHA;

  console.log('═'.repeat(50));
  console.log('Cloudflare Pages Deployment Poller');
  console.log('═'.repeat(50));
  console.log(`Project: ${CLOUDFLARE_PROJECT_NAME}`);
  console.log(`Branch: ${TARGET_BRANCH}`);
  if (useCommitMatch) {
    console.log(`Commit: ${shortHash} (${GITHUB_SHA})`);
  } else {
    console.log(`Commit: (not specified, will use latest)`);
  }
  console.log(`Max wait: ${MAX_POLL_TIME_MS / 1000}s`);
  console.log('');

  while (Date.now() - startTime < MAX_POLL_TIME_MS) {
    try {
      const response = await fetchDeployments();

      if (!response.success) {
        console.error('Cloudflare API returned error:', response.errors);
        await sleep(POLL_INTERVAL_MS);
        continue;
      }

      // Find deployment - by commit hash if available, otherwise latest on branch
      const deployment = useCommitMatch
        ? findDeploymentByCommit(response.result, GITHUB_SHA!, TARGET_BRANCH)
        : findLatestDeploymentForBranch(response.result, TARGET_BRANCH);

      if (!deployment) {
        const waitMsg = useCommitMatch
          ? `Waiting for deployment of commit ${shortHash}...`
          : `Waiting for deployment on branch ${TARGET_BRANCH}...`;
        console.log(waitMsg);
        await sleep(POLL_INTERVAL_MS);
        continue;
      }

      const status = deployment.latest_stage?.status;
      const stageName = deployment.latest_stage?.name;
      const deployCommit = getShortHash(deployment.deployment_trigger?.metadata?.commit_hash);

      console.log(
        `[${deployCommit}] Deployment ${deployment.short_id}: stage=${stageName}, status=${status}`
      );

      if (status === 'success' && stageName === 'deploy') {
        console.log('');
        console.log('═'.repeat(50));
        console.log('Deployment successful!');
        console.log('═'.repeat(50));
        console.log(`Deployment ID: ${deployment.short_id}`);
        console.log(`Commit: ${deployCommit}`);
        console.log(`URL: ${deployment.url}`);
        console.log('═'.repeat(50));

        return { success: true, deployment, shortHash: deployCommit };
      }

      if (status === 'failure' || status === 'canceled') {
        return {
          success: false,
          deployment,
          shortHash: deployCommit,
          error: `Deployment ${status}: ${deployment.short_id} (${deployCommit})`,
        };
      }

      // Still in progress, wait and poll again
      await sleep(POLL_INTERVAL_MS);
    } catch (error) {
      console.error('Error polling Cloudflare:', error);
      await sleep(POLL_INTERVAL_MS);
    }
  }

  return {
    success: false,
    shortHash,
    error: `Timeout waiting for deployment of ${shortHash} after ${MAX_POLL_TIME_MS / 1000}s`,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Write GitHub Actions outputs
function writeGitHubOutput(result: PollerResult): void {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (!outputFile) return;

  appendFileSync(outputFile, `deployment_success=${result.success}\n`);
  appendFileSync(outputFile, `short_hash=${result.shortHash || 'unknown'}\n`);

  if (result.deployment) {
    appendFileSync(outputFile, `deployment_id=${result.deployment.short_id}\n`);
    appendFileSync(outputFile, `deployment_url=${result.deployment.url}\n`);
  }
}

// Export deployment info for use by validation script
export async function pollForDeployment(): Promise<PollerResult> {
  if (!CLOUDFLARE_API_TOKEN || !CLOUDFLARE_ACCOUNT_ID) {
    return {
      success: false,
      error: 'Missing CLOUDFLARE_API_TOKEN or CLOUDFLARE_ACCOUNT_ID environment variables',
    };
  }

  return waitForDeployment();
}

// Run as standalone script
if (import.meta.url === `file://${process.argv[1]}`) {
  pollForDeployment().then((result) => {
    writeGitHubOutput(result);

    if (!result.success) {
      console.error('');
      console.error(`Deployment polling failed: ${result.error}`);
      process.exit(1);
    }
    process.exit(0);
  });
}
