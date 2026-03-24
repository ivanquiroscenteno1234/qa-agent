export type QaLlmProvider = "disabled" | "gemini";

export interface QaLlmFeatureFlags {
  stepParsing: boolean;
  scenarioGeneration: boolean;
  reviewAnalysis: boolean;
}

export interface QaLlmConfig {
  enabled: boolean;
  provider: QaLlmProvider;
  configured: boolean;
  model: string;
  apiKeyPresent: boolean;
  features: QaLlmFeatureFlags;
  statusLabel: string;
  detail: string;
  warning?: string;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value == null) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
}

function normalizeProvider(value: string | undefined, enabled: boolean): QaLlmProvider {
  if (!enabled) {
    return "disabled";
  }

  return value?.trim().toLowerCase() === "gemini" ? "gemini" : "disabled";
}

function enabledFeatureCount(features: QaLlmFeatureFlags): number {
  return [features.stepParsing, features.scenarioGeneration, features.reviewAnalysis].filter(Boolean).length;
}

export function getQaLlmConfig(): QaLlmConfig {
  const enabled = parseBoolean(process.env.QA_LLM_ENABLED, false);
  const provider = normalizeProvider(process.env.QA_LLM_PROVIDER, enabled);
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
  const apiKeyPresent = Boolean(process.env.GEMINI_API_KEY?.trim());
  const features: QaLlmFeatureFlags = {
    stepParsing: parseBoolean(process.env.QA_LLM_STEP_PARSING, false),
    scenarioGeneration: parseBoolean(process.env.QA_LLM_SCENARIO_GENERATION, false),
    reviewAnalysis: parseBoolean(process.env.QA_LLM_REVIEW_ANALYSIS, false)
  };
  const featureCount = enabledFeatureCount(features);

  if (!enabled) {
    return {
      enabled,
      provider,
      configured: false,
      model,
      apiKeyPresent,
      features,
      statusLabel: "LLM disabled",
      detail: "Gemini assistance is turned off globally. The QA runtime will stay on deterministic local behavior."
    };
  }

  if (provider !== "gemini") {
    return {
      enabled,
      provider,
      configured: false,
      model,
      apiKeyPresent,
      features,
      statusLabel: "Invalid provider",
      detail: "QA_LLM_PROVIDER is enabled but not set to a supported value. Gemini-backed features will stay disabled.",
      warning: "Set QA_LLM_PROVIDER=gemini to enable the planned provider path."
    };
  }

  if (!apiKeyPresent) {
    return {
      enabled,
      provider,
      configured: false,
      model,
      apiKeyPresent,
      features,
      statusLabel: "Gemini not configured",
      detail: "Gemini is enabled in configuration, but GEMINI_API_KEY is missing. Deterministic fallback should remain active.",
      warning: "Add a GEMINI_API_KEY value in .env.local before enabling Gemini-backed capabilities."
    };
  }

  if (featureCount === 0) {
    return {
      enabled,
      provider,
      configured: true,
      model,
      apiKeyPresent,
      features,
      statusLabel: "Gemini configured",
      detail: `Gemini is configured with model ${model}, but all Gemini-assisted features are still disabled for rollout safety.`
    };
  }

  if (featureCount < 3) {
    return {
      enabled,
      provider,
      configured: true,
      model,
      apiKeyPresent,
      features,
      statusLabel: "Gemini partially enabled",
      detail: `Gemini is configured with model ${model}; ${featureCount} of 3 planned Gemini-assisted capabilities are enabled.`
    };
  }

  return {
    enabled,
    provider,
    configured: true,
    model,
    apiKeyPresent,
    features,
    statusLabel: "Gemini active",
    detail: `Gemini is configured with model ${model}, and all planned Gemini-assisted capabilities are enabled.`
  };
}