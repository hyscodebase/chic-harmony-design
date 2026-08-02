type AIMessage = {
  role: "system" | "user";
  content: string;
};

type AIProviderConfig = {
  apiKey: string;
  apiUrl: string;
  model: string;
};

const LOVABLE_AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-3.6-flash";

function getAIProviderConfig(): AIProviderConfig {
  // Lovable AI Gateway (default). A custom OpenAI-compatible provider can still
  // override it with AI_API_KEY + AI_API_URL.
  const customKey = process.env.AI_API_KEY?.trim();
  const customUrl = process.env.AI_API_URL?.trim();
  const model = process.env.AI_MODEL?.trim() || DEFAULT_MODEL;

  if (customKey && customUrl) {
    return { apiKey: customKey, apiUrl: customUrl, model };
  }

  const lovableKey = process.env.LOVABLE_API_KEY?.trim();
  if (!lovableKey) {
    throw new Error("AI 연결이 설정되지 않았습니다: LOVABLE_API_KEY 가 없습니다.");
  }
  return { apiKey: lovableKey, apiUrl: LOVABLE_AI_GATEWAY_URL, model };
}

/** Call an OpenAI-compatible chat-completions endpoint and return JSON text. */
export async function callAIJson(messages: AIMessage[]): Promise<string> {
  const { apiKey, apiUrl, model } = getAIProviderConfig();
  const isGateway = apiUrl === LOVABLE_AI_GATEWAY_URL;
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(isGateway
        ? { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" }
        : { Authorization: `Bearer ${apiKey}` }),
    },
    body: JSON.stringify({
      model,
      messages,
      response_format: { type: "json_object" },
    }),
  });

  if (response.status === 429) {
    throw new Error("AI 사용량 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.");
  }
  if (response.status === 402) {
    throw new Error("AI 제공자의 크레딧이 소진되었습니다.");
  }
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 200);
    throw new Error(`AI 제공자 오류 (${response.status}): ${detail}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return payload.choices?.[0]?.message?.content ?? "{}";
}
