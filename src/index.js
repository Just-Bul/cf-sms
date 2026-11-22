// cf-sms — Cloudflare Worker for Reportude (reportude.in).
//
// 1. Incoming e-mail (Cloudflare Email Routing sends it here):
//    - noreply@reportude.in  → refused. Nobody can reply to it; the sender is told to write to support@.
//    - support@reportude.in  → forwarded to the inbox in SUPPORT_FORWARD_TO (a verified Email Routing address).
//    - anything else         → refused.
// 2. HTTP requests: placeholder response (unchanged from the original deployment).
// 3. Scheduled (every 5 minutes): calls the Reportude backend's /cron/* jobs that need to run
//    more often than once a day. Vercel's Hobby plan only allows daily cron jobs, so these
//    run from here instead. The daily/weekly/monthly ones stay in the backend's vercel.json.

const NOREPLY = "noreply@reportude.in";
const SUPPORT = "support@reportude.in";

// Same schedule the backend uses when it runs as a long-lived server (src/scheduler/index.js).
export const jobsDue = (scheduledTime) => {
  const d = new Date(scheduledTime);
  const m = d.getUTCMinutes();
  const h = d.getUTCHours();
  const minuteOfEpoch = Math.floor(scheduledTime / 60000);
  const jobs = ["process-broadcasts"];                                   // every 5 min
  if (m % 15 === 0) jobs.push("cost-waste-alerts");                      // every 15 min
  if (m === 0) jobs.push("cost-budget-alerts", "cost-spike-alerts");     // hourly
  if (m === 0 && h % 4 === 0) jobs.push("cost-opt-alerts");              // every 4 h
  if (m === 0 && h % 6 === 0) jobs.push("sheet-memory-refresh");         // every 6 h
  if (minuteOfEpoch % 45 === 0) jobs.push("google-token-refresh");       // every 45 min
  return jobs;
};

const runJob = async (env, job) => {
  const res = await fetch(`${env.API_BASE}/cron/${job}`, {
    headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
  });
  console.log(JSON.stringify({ job, status: res.status }));
  return res.status;
};

export default {
  async fetch() {
    return new Response("Hello world");
  },

  async scheduled(event, env, ctx) {
    if (!env.API_BASE || !env.CRON_SECRET) {
      console.log("cron skipped: API_BASE or CRON_SECRET not set");
      return;
    }
    ctx.waitUntil(Promise.allSettled(jobsDue(event.scheduledTime).map((job) => runJob(env, job))));
  },

  async email(message, env) {
    const to = String(message.to || "").toLowerCase();

    if (to === NOREPLY) {
      message.setReject(`This address (${NOREPLY}) is not monitored and cannot receive replies. Please write to ${SUPPORT} instead.`);
      return;
    }
    if (to === SUPPORT) {
      if (!env.SUPPORT_FORWARD_TO) {
        message.setReject("Support inbox is not configured yet. Please try again later.");
        return;
      }
      await message.forward(env.SUPPORT_FORWARD_TO);
      return;
    }
    message.setReject("Unknown recipient.");
  },
};
