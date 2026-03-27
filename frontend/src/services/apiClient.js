import { config } from "../config.js";

async function postApi(endpoint, body) {
  const response = await fetch(`${config.apiBaseUrl}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${endpoint} failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

function buildMetadata(requestId) {
  return {
    request_id: requestId,
    debug: false,
  };
}

export async function runListener(context, userMessage) {
  return postApi("/api/v1/listener", {
    context,
    input: { user_message: userMessage },
    metadata: buildMetadata(`listener-${Date.now()}`),
  });
}

export async function runQuestioner(context, userMessage = "Ask the next best questions.") {
  return postApi("/api/v1/questioner", {
    context,
    input: { user_message: userMessage },
    metadata: buildMetadata(`questioner-${Date.now()}`),
  });
}
