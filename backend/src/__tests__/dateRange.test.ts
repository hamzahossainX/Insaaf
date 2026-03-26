import { inclusiveDateRange } from "../lib/dateRange";

describe("inclusiveDateRange", () => {
  it("includes the entire 'to' day, not just midnight", () => {
    const range = inclusiveDateRange("2026-07-12", "2026-07-15");
    expect(range?.gte?.toISOString().slice(0, 10)).toBe("2026-07-12");
    // The 15th should be included up to the last millisecond of that day.
    expect(range?.lte?.getHours()).toBe(23);
    expect(range?.lte?.getMinutes()).toBe(59);
    expect(range?.lte?.getSeconds()).toBe(59);
  });

  it("returns undefined when neither from nor to is given (no filter = show all)", () => {
    expect(inclusiveDateRange(undefined, undefined)).toBeUndefined();
  });

  it("handles an open-ended 'from' with no 'to'", () => {
    const range = inclusiveDateRange("2026-07-12", undefined);
    expect(range?.gte).toBeDefined();
    expect(range?.lte).toBeUndefined();
  });
});
