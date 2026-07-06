export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = req.body;
  if (!body || typeof body.model !== "string" || !body.model.startsWith("claude-") || Number(body.max_tokens) > 2048) {
    return res.status(400).json({ error: "Invalid request" });
  }

  try {
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = await anthropicRes.json();
    return res.status(anthropicRes.status).json(data);
  } catch {
    return res.status(502).json({ error: "Upstream request failed" });
  }
}
