import { createLoginRateLimit } from "../middleware/rateLimit";

function responseMock() {
  const headers: Record<string, string> = {};
  return {
    headers,
    statusCode: 200,
    setHeader(name: string, value: string) { headers[name] = value; },
    status(code: number) { this.statusCode = code; return this; },
    json: jest.fn(),
    on: jest.fn(),
  };
}

describe("login rate limit", () => {
  it("blocks attempts beyond the configured limit", () => {
    const middleware = createLoginRateLimit({ windowMs: 60_000, maxAttempts: 1 });
    const request = { ip: "127.0.0.9", socket: {} } as any;
    const firstResponse = responseMock();
    const secondResponse = responseMock();
    const firstNext = jest.fn();
    const secondNext = jest.fn();

    middleware(request, firstResponse as any, firstNext);
    middleware(request, secondResponse as any, secondNext);

    expect(firstNext).toHaveBeenCalledTimes(1);
    expect(secondNext).not.toHaveBeenCalled();
    expect(secondResponse.statusCode).toBe(429);
    expect(secondResponse.headers["Retry-After"]).toBeDefined();
  });
});
