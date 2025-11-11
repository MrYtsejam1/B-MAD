/**
 * LangChain configuration
 */

export interface LangChainConfig {
  provider: 'openai' | 'anthropic';
  model: string;
  temperature: number;
  maxTokens: number;
  timeout: number;
  maxRetries: number;
  baseDelay: number;
}

export const langChainConfig: LangChainConfig = {
  provider: (process.env.LANGCHAIN_PROVIDER as 'openai' | 'anthropic') || 'openai',
  model: process.env.LANGCHAIN_MODEL || 'gpt-4',
  temperature: parseFloat(process.env.LANGCHAIN_TEMPERATURE || '0.3'),
  maxTokens: parseInt(process.env.LANGCHAIN_MAX_TOKENS || '2000'),
  timeout: parseInt(process.env.LANGCHAIN_TIMEOUT || '30000'),
  maxRetries: parseInt(process.env.LANGCHAIN_MAX_RETRIES || '3'),
  baseDelay: parseInt(process.env.LANGCHAIN_BASE_DELAY || '1000')
};
