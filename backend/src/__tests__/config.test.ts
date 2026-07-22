import { getJwtSecret, parseConfiguredOrigins, validateProductionEnvironment } from "../lib/config";

const validProductionEnv = {
  NODE_ENV: "production",
  DATABASE_URL: "postgresql://example.invalid/database",
  JWT_SECRET: "a-unique-production-secret-that-is-long-enough",
  FRONTEND_URL: "https://erp.example.com",
};

describe("production configuration", () => {
  it("rejects missing required variables", () => {
    expect(() => validateProductionEnvironment({ NODE_ENV: "production" })).toThrow(
      "Missing required production environment variables"
    );
  });

  it("rejects weak secrets and non-HTTPS origins", () => {
    expect(() => validateProductionEnvironment({ ...validProductionEnv, JWT_SECRET: "change-me" })).toThrow("JWT_SECRET");
    expect(() => validateProductionEnvironment({ ...validProductionEnv, FRONTEND_URL: "http://erp.example.com" })).toThrow("HTTPS");
  });

  it("accepts valid production configuration", () => {
    expect(() => validateProductionEnvironment(validProductionEnv)).not.toThrow();
    expect(getJwtSecret(validProductionEnv)).toBe(validProductionEnv.JWT_SECRET);
  });

  it("normalizes configured origins and adds localhost only outside production", () => {
    expect(parseConfiguredOrigins({ FRONTEND_URL: "https://one.example/, https://two.example" })).toEqual([
      "https://one.example",
      "https://two.example",
      "http://localhost:5173",
    ]);
    expect(parseConfiguredOrigins(validProductionEnv)).toEqual(["https://erp.example.com"]);
  });
});
