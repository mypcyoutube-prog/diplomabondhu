import { serviceUnavailable } from './errors';
import type { Env } from '../config/env';

export interface AiGenerateInput {
  system: string;
  user: string;
  maxTokens: number;
}

export interface AiGenerateResult {
  text: string;
  tokensUsed: number;
}

export interface AiProvider {
  readonly configured: boolean;
  readonly name: string;
  generate(input: AiGenerateInput): Promise<AiGenerateResult>;
}

class OpenAiCompatibleProvider implements AiProvider {
  readonly configured = true;
  readonly name: string;

  constructor(private readonly env: Env) {
    this.name = `${env.AI_PROVIDER}:${env.AI_MODEL}`;
  }

  async generate(input: AiGenerateInput): Promise<AiGenerateResult> {
    const response = await fetch(`${this.env.AI_BASE_URL.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.env.AI_API_KEY}`
      },
      body: JSON.stringify({
        model: this.env.AI_MODEL,
        messages: [
          { role: 'system', content: input.system },
          { role: 'user', content: input.user }
        ],
        max_tokens: input.maxTokens,
        temperature: 0.4,
        response_format: { type: 'json_object' }
      })
    });
    if (!response.ok) {
      throw serviceUnavailable(`AI provider request failed with status ${response.status}`);
    }
    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { total_tokens?: number };
    };
    const text = payload.choices?.[0]?.message?.content ?? '';
    return { text, tokensUsed: payload.usage?.total_tokens ?? 0 };
  }
}

class NotConfiguredProvider implements AiProvider {
  readonly configured = false;
  readonly name = 'none';

  async generate(): Promise<AiGenerateResult> {
    throw serviceUnavailable('AI provider is not configured. Set AI_PROVIDER and AI_API_KEY on the server.');
  }
}

let testOverride: AiProvider | undefined;

export function setAiProviderForTests(provider: AiProvider | undefined) {
  testOverride = provider;
}

export function getAiProvider(env: Env): AiProvider {
  if (testOverride) return testOverride;
  if (env.AI_PROVIDER === 'openai' && env.AI_API_KEY) return new OpenAiCompatibleProvider(env);
  return new NotConfiguredProvider();
}
