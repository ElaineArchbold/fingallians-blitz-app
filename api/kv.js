import { createClient } from "@supabase/supabase-js";

// Server-side only — uses the service_role key so it bypasses Row Level
// Security. This key must never be exposed to the browser; it's read here
// from a Vercel env var, same as the Turso credentials were before.
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// Table created once via the migration SQL (see migrate_kv_to_supabase.sql),
// not auto-created here — DDL isn't available through the standard client.
const TABLE = "blitz_kv_store";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const { key } = req.query;
      if (!key) return res.status(400).json({ error: "key is required" });
      const { data, error } = await supabase
        .from(TABLE)
        .select("value")
        .eq("key", key)
        .maybeSingle();
      if (error) throw error;
      if (!data) return res.status(404).json({ error: "not found" });
      return res.status(200).json({ key, value: data.value });
    }

    if (req.method === "POST") {
      const { key, value } = req.body || {};
      if (!key || value === undefined) {
        return res.status(400).json({ error: "key and value are required" });
      }
      const { error } = await supabase
        .from(TABLE)
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
      if (error) throw error;
      return res.status(200).json({ key, value });
    }

    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ error: "method not allowed" });
  } catch (err) {
    console.error("kv handler error", err);
    return res.status(500).json({ error: "server error", detail: String(err) });
  }
}
