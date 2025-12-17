/**
 * Cloudflare Pages Deployment Poller
 *
 * Polls Cloudflare Pages API until the deployment for a specific commit
 * has completed successfully.
 */

import type { CloudflareDeploymentsResponse, CloudflareDeployment } from './types.js';
import { appendFileSync } from 'fs';

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

function formatElapsed(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${seconds}s`;
}

async function fetchDeployments(): Promise<CloudflareDeploymentsResponse> {
  // Filter by preview environment on the API side
  const url = `${API_BASE}/accounts/${CLOUDFLARE_ACCOUNT_ID}/pages/projects/${CLOUDFLARE_PROJECT_NAME}/deployments?env=preview`;

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
  return deployments.find((d) => {
    const deployCommit = d.deployment_trigger?.metadata?.commit_hash;
    const deployBranch = d.deployment_trigger?.metadata?.branch;
    const isPreview = d.environment === 'preview';

    const hashMatches = deployCommit && (
      deployCommit === commitHash ||
      deployCommit.startsWith(commitHash) ||
      commitHash.startsWith(deployCommit)
    );

    return isPreview && hashMatches && deployBranch === branch;
  });
}

function findLatestDeploymentForBranch(
  deployments: CloudflareDeployment[],
  branch: string
): CloudflareDeployment | undefined {
  // Filter by preview environment AND branch
  const branchDeployments = deployments
    .filter((d) => d.environment === 'preview' && d.deployment_trigger?.metadata?.branch === branch)
    .sort((a, b) => new Date(b.created_on).getTime() - new Date(a.created_on).getTime());

  if (branchDeployments.length === 0) return undefined;

  const latest = branchDeployments[0];
  const latestStatus = latest.latest_stage?.status;

  // If latest is in progress (active/idle) or successful, return it
  // This ensures we wait for in-progress builds rather than skipping to old successful ones
  if (latestStatus === 'active' || latestStatus === 'idle' || latestStatus === 'success') {
    return latest;
  }

  // If latest failed/canceled, find the most recent successful one
  return branchDeployments.find((d) => d.latest_stage?.status === 'success');
}

async function waitForDeployment(): Promise<PollerResult> {
  const startTime = Date.now();
  const shortHash = getShortHash(GITHUB_SHA);
  const useCommitMatch = !!GITHUB_SHA;

  console.log('═'.repeat(60));
  console.log('Cloudflare Pages Deployment Poller');
  console.log('═'.repeat(60));
  console.log(`Project:    ${CLOUDFLARE_PROJECT_NAME}`);
  console.log(`Branch:     ${TARGET_BRANCH}`);
  if (useCommitMatch) {
    console.log(`Mode:       Exact commit match`);
    console.log(`Commit:     ${shortHash} (${GITHUB_SHA})`);
  } else {
    console.log(`Mode:       Latest successful deployment on branch`);
  }
  console.log(`Max wait:   ${MAX_POLL_TIME_MS / 1000}s`);
  console.log(`Poll every: ${POLL_INTERVAL_MS / 1000}s`);
  console.log('═'.repeat(60));
  console.log('');

  let lastStatus = '';

  while (Date.now() - startTime < MAX_POLL_TIME_MS) {
    const elapsed = Date.now() - startTime;
    const elapsedStr = formatElapsed(elapsed);

    try {
      const response = await fetchDeployments();

      if (!response.success) {
        console.log(`[${elapsedStr}] ⚠ API error, retrying...`);
        await sleep(POLL_INTERVAL_MS);
        continue;
      }

      // Find deployment - by exact commit hash, or latest on branch
      const deployment = useCommitMatch
        ? findDeploymentByCommit(response.result, GITHUB_SHA!, TARGET_BRANCH)
        : findLatestDeploymentForBranch(response.result, TARGET_BRANCH);

      if (!deployment) {
        // Show what deployments exist on the branch
        const branchDeployments = response.result.filter(
          (d) => d.deployment_trigger?.metadata?.branch === TARGET_BRANCH
        );

        if (branchDeployments.length > 0) {
          const latestCommit = getShortHash(branchDeployments[0].deployment_trigger?.metadata?.commit_hash);
          console.log(`[${elapsedStr}] ⏳ Waiting for ${shortHash}... (latest on branch: ${latestCommit})`);
        } else {
          console.log(`[${elapsedStr}] ⏳ Waiting for deployment of ${shortHash}... (no deployments on ${TARGET_BRANCH} yet)`);
        }
        await sleep(POLL_INTERVAL_MS);
        continue;
      }

      const status = deployment.latest_stage?.status;
      const stageName = deployment.latest_stage?.name;
      const deployCommit = getShortHash(deployment.deployment_trigger?.metadata?.commit_hash);
      const statusKey = `${stageName}:${status}`;

      // Only log if status changed
      if (statusKey !== lastStatus) {
        const stageEmoji = getStageEmoji(stageName, status);
        console.log(`[${elapsedStr}] ${stageEmoji} [${deployCommit}] ${stageName}: ${status}`);
        lastStatus = statusKey;
      }

      if (status === 'success' && stageName === 'deploy') {
        console.log('');
        console.log('═'.repeat(60));
        console.log('✅ Deployment successful!');
        console.log('═'.repeat(60));
        console.log(`Deployment ID: ${deployment.short_id}`);
        console.log(`Commit:        ${deployCommit}`);
        console.log(`URL:           ${deployment.url}`);
        console.log(`Duration:      ${elapsedStr}`);
        console.log('═'.repeat(60));

        return { success: true, deployment, shortHash: deployCommit };
      }

      if (status === 'failure' || status === 'canceled') {
        console.log('');
        console.log('═'.repeat(60));
        console.log(`❌ Deployment ${status}!`);
        console.log('═'.repeat(60));
        console.log(`Deployment ID: ${deployment.short_id}`);
        console.log(`Commit:        ${deployCommit}`);
        console.log(`Stage:         ${stageName}`);
        console.log('═'.repeat(60));

        return {
          success: false,
          deployment,
          shortHash: deployCommit,
          error: `Deployment ${status} at stage "${stageName}": ${deployment.short_id} (${deployCommit})`,
        };
      }

      // Still in progress, wait and poll again
      await sleep(POLL_INTERVAL_MS);
    } catch (error) {
      const elapsed = formatElapsed(Date.now() - startTime);
      console.log(`[${elapsed}] ⚠ Error polling: ${error instanceof Error ? error.message : error}`);
      await sleep(POLL_INTERVAL_MS);
    }
  }

  const elapsed = formatElapsed(Date.now() - startTime);
  console.log('');
  console.log('═'.repeat(60));
  console.log(`⏰ Timeout after ${elapsed}`);
  console.log('═'.repeat(60));

  return {
    success: false,
    shortHash,
    error: `Timeout waiting for deployment of ${shortHash} after ${formatElapsed(MAX_POLL_TIME_MS)}`,
  };
}

function getStageEmoji(stage: string | undefined, status: string | undefined): string {
  if (status === 'success') return '✓';
  if (status === 'failure') return '✗';
  if (status === 'active') return '⟳';
  if (stage === 'queued') return '📋';
  if (stage === 'initialize') return '🔧';
  if (stage === 'clone_repo') return '📥';
  if (stage === 'build') return '🔨';
  if (stage === 'deploy') return '🚀';
  return '•';
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
