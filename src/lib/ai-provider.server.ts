type AIMessage = {
  role: "system" | "user";
  content: string;
};

type AIProviderConfig = {
  apiKey: string;
  apiUrl: string;
  model: string;
};

function getAIProviderConfig(): AIProviderConfig {
  const apiKey = process.env.AI_API_KEY?.trim();
  const apiUrl = process.env.AI_API_URL?.trim();
  const model = process.env.AI_MODEL?.trim();

  const missing = [!apiKey && "AI_API_KEY", !apiUrl && "AI_API_URL", !model && "AI_MODEL"].filter(
    Boolean,
  );
  if (missing.length > 0) {
    throw new Error(`AI 제공자 환경 변수가 필요합니다: ${missing.join(", ")}`);
  }

  return { apiKey, apiUrl, model } as AIProviderConfig;
}

/** Call an OpenAI-compatible chat-completions endpoint and return JSON text. */
export async function callAIJson(messages: AIMessage[]): Promise<string> {
  const { apiKey, apiUrl, model } = getAIProviderConfig();
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
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
