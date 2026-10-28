// POST /api/search  { "q": "3 row SUV under $45k not a minivan" }
// Returns the structured intent only. The browser does the filtering and ranking.
// Needs the OPENAI_API_KEY environment variable in Vercel.

const { INTENT_SCHEMA, systemPrompt } = require("../agent/prompt.js");
const inventory = require("../data/inventory.json");

const MODEL = "gpt-4o-mini";
const MAX_QUERY = 300;
const WINDOW_MS = 10 * 60 * 1000;
const PER_IP = 40;          // per instance, per 10 minutes (best effort)
const hits = new Map();

const mi = inventory.cols.indexOf("make"), mo = inventory.cols.indexOf("model");
const byMake = {};
for (const r of inventory.rows) (byMake[r[mi]] ||= new Set()).add(r[mo]);
const CATALOG = Object.entries(byMake).map(([m, s]) => `${m}: ${[...s].sort().join(", ")}`).join("\n");

function limited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  list.push(now);
  hits.set(ip, list);
  return list.length > PER_IP;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST." });
  const key = process.env.OPENAI_API_KEY;
  if (!key) return res.status(503).json({ error: "Live search isn't configured yet." });

  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  if (limited(ip)) return res.status(429).json({ error: "Too many searches in a short time. Try again in a few minutes." });

  let q = (req.body && req.body.q) || "";
  if (typeof q !== "string" || !q.trim()) return res.status(400).json({ error: "Type what you're looking for." });
  q = q.trim().slice(0, MAX_QUERY);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0,
        max_tokens: 700,
        messages: [
          { role: "system", content: systemPrompt(CATALOG) },
          { role: "user", content: q }
        ],
        response_format: { type: "json_schema", json_schema: { name: "search_intent", strict: true, schema: INTENT_SCHEMA } }
      })
    });
    if (!r.ok) {
      const detail = await r.text();
      console.error("OpenAI error", r.status, detail.slice(0, 300));
      return res.status(502).json({ error: "The language model didn't respond. Try again in a moment." });
    }
    const data = await r.json();
    const intent = JSON.parse(data.choices[0].message.content);
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ q, model: MODEL, intent, usage: data.usage });
  } catch (e) {
    console.error(e);
    return res.status(504).json({ error: "Search took too long. Try again." });
  } finally {
    clearTimeout(timer);
  }
};
