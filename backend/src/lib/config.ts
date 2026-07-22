const DEVELOPMENT_JWT_SECRET = "dev-secret-change-me";

export type Environment = Record<string, string | undefined>;

export function validateProductionEnvironment(env: Environment = process.env): void {
  if (env.NODE_ENV !== "production") return;

  const missing = ["DATABASE_URL", "JWT_SECRET", "FRONTEND_URL"].filter((key) => !env[key]?.trim());
  if (missing.length > 0) {
    throw new Error(`Missing required production environment variables: ${missing.join(", ")}`);
  }

  const secret = env.JWT_SECRET!;
  if (secret.length < 32 || secret === DEVELOPMENT_JWT_SECRET || secret.includes("change-me")) {
    throw new Error("JWT_SECRET must be a unique production secret of at least 32 characters");
  }

  for (const origin of parseConfiguredOrigins(env)) {
    const url = new URL(origin);
    if (url.protocol !== "https:") {
      throw new Error("Every production FRONTEND_URL origin must use HTTPS");
    }
  }
}

export function getJwtSecret(env: Environment = process.env): string {
  if (env.NODE_ENV === "production") {
    validateProductionEnvironment(env);
    return env.JWT_SECRET!;
  }
  return env.JWT_SECRET || DEVELOPMENT_JWT_SECRET;
}

export function parseConfiguredOrigins(env: Environment = process.env): string[] {
  const configured = (env.FRONTEND_URL || "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);

  if (env.NODE_ENV !== "production") configured.push("http://localhost:5173");
  return [...new Set(configured)];
}
