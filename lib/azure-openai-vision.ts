export type AzureVisionConfig = {
  endpoint: string;
  apiKey: string;
  visionDeployment: string;
  apiVersion: string;
};

export function getAzureVisionConfig(): AzureVisionConfig | null {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const visionDeployment =
    process.env.AZURE_OPENAI_VISION_DEPLOYMENT ||
    process.env.AZURE_OPENAI_DEPLOYMENT;
  const apiVersion =
    process.env.AZURE_OPENAI_API_VERSION || "2024-02-15-preview";

  if (!endpoint || !apiKey || !visionDeployment) return null;

  return { endpoint, apiKey, visionDeployment, apiVersion };
}

export function buildAzureVisionCompletionsUrl(
  config: AzureVisionConfig
): string {
  const url = new URL(
    `/openai/deployments/${config.visionDeployment}/chat/completions`,
    config.endpoint
  );
  url.searchParams.set("api-version", config.apiVersion);
  return url.toString();
}

export function buildAzureVisionHeaders(
  config: AzureVisionConfig
): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "api-key": config.apiKey,
  };
}
