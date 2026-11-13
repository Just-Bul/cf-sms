// cf-sms — Cloudflare Worker for Reportude (reportude.in).
//
// 1. Incoming e-mail (Cloudflare Email Routing sends it here):
//    - noreply@reportude.in  → refused. Nobody can reply to it; the sender is told to write to support@.
//    - support@reportude.in  → forwarded to the inbox in SUPPORT_FORWARD_TO (a verified Email Routing address).
//    - anything else         → refused.
// 2. HTTP requests: placeholder response (unchanged from the original deployment).

const NOREPLY = "noreply@reportude.in";
const SUPPORT = "support@reportude.in";

export default {
  async fetch() {
    return new Response("Hello world");
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
