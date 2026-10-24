// Waits for the Vercel deployment of a commit to be ready and writes its URL
// to the step's outputs as `url`. Vercel creates a GitHub deployment for the
// commit; its latest status carries the URL as environment_url once it's ready.
//
// Plain Node with fetch, so it runs in the Playwright container, which has no
// `gh` or `jq`.
//
// env: GITHUB_TOKEN, SHA, ENVIRONMENT ("preview" or "production"), and
// optionally CHECK_PATH, a path that must answer 200 (sent with BYPASS as the
// x-vercel-protection-bypass header).

import { appendFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const { GITHUB_API_URL, GITHUB_REPOSITORY, GITHUB_OUTPUT, GITHUB_TOKEN, SHA, ENVIRONMENT, CHECK_PATH, BYPASS } =
  process.env;
const name = ENVIRONMENT[0].toUpperCase() + ENVIRONMENT.slice(1);
const matches = new RegExp(`^${ENVIRONMENT}`, 'i');

async function api(path) {
  const res = await fetch(`${GITHUB_API_URL}/repos/${GITHUB_REPOSITORY}/${path}`, {
    headers: { authorization: `Bearer ${GITHUB_TOKEN}`, accept: 'application/vnd.github+json' },
  });
  if (!res.ok) throw new Error(`GET ${path} answered ${res.status}`);
  return res.json();
}

function fail(message) {
  console.log(`::error::${message}`);
  process.exit(1);
}

let ready = false;
let url = '';
for (let i = 0; i < 120 && !ready; i++) {
  if (i > 0) await sleep(10_000);
  const deployments = await api(`deployments?sha=${SHA}&per_page=100`);
  const deployment = deployments.find((d) => matches.test(d.environment));
  if (!deployment) {
    console.log(`No ${name} deployment for ${SHA} yet`);
    continue;
  }
  const [status] = await api(`deployments/${deployment.id}/statuses?per_page=1`);
  console.log(`Deployment ${deployment.id}: ${status?.state ?? 'pending'}`);
  switch (status?.state) {
    case 'success':
      ready = true;
      url = (status.environment_url ?? '').replace(/\/$/, '');
      break;
    case 'failure':
    case 'error':
    case 'inactive':
      fail(`The Vercel ${name} deployment ended in ${status.state}`);
  }
}
if (!ready) fail(`Timed out waiting for the Vercel ${name} of ${SHA}`);

if (CHECK_PATH) {
  if (!url) fail(`The ready Vercel ${name} of ${SHA} has no URL`);
  const res = await fetch(url + CHECK_PATH, {
    headers: BYPASS ? { 'x-vercel-protection-bypass': BYPASS } : {},
    redirect: 'manual',
  });
  if (res.status !== 200) fail(`${url}${CHECK_PATH} answered ${res.status}`);
}

console.log(`${name}: ${url || 'ready'}`);
appendFileSync(GITHUB_OUTPUT, `url=${url}\n`);
