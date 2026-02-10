type AzureOpenAIEnv = Record<string, string | undefined>;

export type AzureOpenAIConfig = {
  endpoint: string;
  apiKey: string;
  deployment: string;
  apiVersion: string;
};

export function isAzureEnabled(env: AzureOpenAIEnv = process.env): boolean {
  return Boolean(env.AZURE_OPENAI_ENDPOINT && env.AZURE_OPENAI_API_KEY && env.AZURE_OPENAI_DEPLOYMENT);
}

export function getAzureConfig(env: AzureOpenAIEnv = process.env): AzureOpenAIConfig | null {
  if (!isAzureEnabled(env)) {
    return null;
  }

  return {
    endpoint: env.AZURE_OPENAI_ENDPOINT as string,
    apiKey: env.AZURE_OPENAI_API_KEY as string,
    deployment: env.AZURE_OPENAI_DEPLOYMENT as string,
    apiVersion: env.AZURE_OPENAI_API_VERSION || "2024-02-15-preview",
  };
}

export function buildAzureChatCompletionsUrl(config: AzureOpenAIConfig): string {
  const url = new URL(`/openai/deployments/${config.deployment}/chat/completions`, config.endpoint);
  url.searchParams.set("api-version", config.apiVersion);
  return url.toString();
}

export function buildAzureHeaders(config: AzureOpenAIConfig): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "api-key": config.apiKey,
  };
}
