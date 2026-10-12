import { defineFunction, secret } from '@aws-amplify/backend';

// Any OpenAI-compatible chat endpoint works (Groq, OpenRouter, NVIDIA NIM, ...).
// Providers are tried in order: primary (LLM_*), then backup (LLM2_*), then the offline atlas engine.
export const travelAgent = defineFunction({
  name: 'travel-agent',
  entry: './handler.ts',
  runtime: 22,
  timeoutSeconds: 60,
  memoryMB: 512,
  resourceGroupName: 'data',
  environment: {
    LLM_API_KEY: secret('LLM_API_KEY'),
    LLM_BASE_URL: 'https://api.groq.com/openai/v1',
    /** Comma-separated, tried in order until one answers with valid JSON. */
    LLM_MODELS: 'openai/gpt-oss-120b,openai/gpt-oss-20b,qwen/qwen3.8-27b',
    LLM2_API_KEY: secret('LLM2_API_KEY'),
    LLM2_BASE_URL: 'https://openrouter.ai/api/v1',
    LLM2_MODELS: 'nvidia/nemotron-3-super-120b-a12b:free,nvidia/nemotron-3.5-lightning:free',
    CANVAS_MODEL_ID: 'amazon.nova-canvas-v1:0',
  },
});
