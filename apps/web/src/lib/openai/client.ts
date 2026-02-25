import OpenAI from 'openai'

const DEFAULT_OPENAI_API_KEY = 'placeholder-openai-api-key'

export function getOpenAIClient(apiKey?: string) {
  return new OpenAI({
    apiKey: apiKey || process.env.OPENAI_API_KEY || DEFAULT_OPENAI_API_KEY,
  })
}
