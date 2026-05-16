import { getBloomContext } from "./bloom.js";

export function buildVisualPrompt(phase, summary) {
  const bloom = getBloomContext(phase);
  return [
    `Create a calm, medically responsible visual explainer for the BLOOM maternal phase "${bloom.title}".`,
    `Context: ${summary || bloom.primaryCheck}`,
    "Style: warm editorial healthcare illustration, soft natural colors, no gore, no diagnosis claims, supportive and practical."
  ].join(" ");
}

export async function requestFalVisual(prompt) {
  if (!process.env.FAL_KEY || !process.env.FAL_API_URL) {
    return {
      provider: "fal-stub",
      status: "prompt-ready",
      imageUrl: null,
      note: "fal.ai endpoint is not configured. Use the returned prompt for visual generation."
    };
  }

  const response = await fetch(process.env.FAL_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Key ${process.env.FAL_KEY}`
    },
    body: JSON.stringify({ prompt })
  });

  if (!response.ok) {
    return {
      provider: "fal",
      status: "failed",
      imageUrl: null,
      note: `fal request failed with ${response.status}. Check FAL_API_URL for the selected model.`
    };
  }

  const data = await response.json();
  return {
    provider: "fal",
    status: "sent",
    imageUrl: data.imageUrl || data.url || data.images?.[0]?.url || null,
    raw: data
  };
}

