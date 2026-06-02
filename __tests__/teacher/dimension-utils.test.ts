import { describe, it, expect } from "vitest";
import {
  getGradeBenchmark,
  getDimensionLabel,
  calculateBalance,
  getBalanceStatus,
  normalizeScore,
  SIX_DIMENSIONS,
} from "@/lib/dimension-utils";

describe("dimension-utils", () => {
  describe("getGradeBenchmark", () => {
    it("returns correct benchmark for 高一", () => {
      expect(getGradeBenchmark("高一")).toBe(182);
    });

    it("returns correct benchmark for 高二", () => {
      expect(getGradeBenchmark("高二")).toBe(192);
    });

    it("returns correct benchmark for 高三", () => {
      expect(getGradeBenchmark("高三")).toBe(200);
    });

    it("returns default 170 for unknown grade", () => {
      expect(getGradeBenchmark("未知")).toBe(170);
    });
  });

  describe("getDimensionLabel", () => {
    it("returns 超前 for score >= 100% of theory max", () => {
      const result = getDimensionLabel(230, 170); // 230/230 = 100%
      expect(result.label).toBe("超前");
      expect(result.color).toBe("#9333ea");
    });

    it("returns 优秀 for score >= 90% of theory max", () => {
      const result = getDimensionLabel(215, 170); // 215/230 ≈ 93%
      expect(result.label).toBe("优秀");
      expect(result.color).toBe("#16a34a");
    });

    it("returns 良好 for score >= 80% of theory max", () => {
      const result = getDimensionLabel(206, 170); // 206/230 ≈ 89.6%
      expect(result.label).toBe("良好");
      expect(result.color).toBe("#2563eb");
    });

    it("returns 正常 for score >= 65% of theory max", () => {
      const result = getDimensionLabel(175, 170); // 175/230 ≈ 76%
      expect(result.label).toBe("正常");
      expect(result.color).toBe("#ca8a04");
    });

    it("returns 需支持 for score < 65% of theory max", () => {
      const result = getDimensionLabel(148, 170); // 148/230 ≈ 64.3%
      expect(result.label).toBe("需支持");
      expect(result.color).toBe("#dc2626");
    });
  });

  describe("calculateBalance", () => {
    it("returns 100 for perfectly balanced scores", () => {
      const scores = { a: 80, b: 80, c: 80, d: 80, e: 80 };
      expect(calculateBalance(scores)).toBe(100);
    });

    it("returns lower value for unbalanced scores", () => {
      const scores = { a: 100, b: 60, c: 60, d: 60, e: 60 };
      const balance = calculateBalance(scores);
      expect(balance).toBeLessThan(100);
      expect(balance).toBeGreaterThan(0);
    });

    it("returns 0 for empty object", () => {
      expect(calculateBalance({})).toBe(0);
    });
  });

  describe("getBalanceStatus", () => {
    it("returns 非常均衡 for balance >= 90", () => {
      const result = getBalanceStatus(95);
      expect(result.status).toBe("非常均衡");
      expect(result.color).toBe("#16a34a");
    });

    it("returns 严重偏科 for balance < 65", () => {
      const result = getBalanceStatus(50);
      expect(result.status).toBe("严重偏科");
      expect(result.color).toBe("#dc2626");
    });
  });

  describe("normalizeScore", () => {
    it("returns 100 for max score", () => {
      expect(normalizeScore(230, 170)).toBe(100);
    });

    it("returns 50 for half score", () => {
      expect(normalizeScore(200, 170)).toBe(50);
    });

    it("returns 0 for minimum score", () => {
      expect(normalizeScore(170, 170)).toBe(0);
    });

    it("caps at 100 for overflow", () => {
      expect(normalizeScore(250, 170)).toBe(100);
    });
  });

  describe("SIX_DIMENSIONS", () => {
    it("has exactly 6 dimensions", () => {
      expect(SIX_DIMENSIONS).toHaveLength(6);
    });

    it("has correct dimension keys", () => {
      const keys = SIX_DIMENSIONS.map((d) => d.key);
      expect(keys).toContain("逻辑");
      expect(keys).toContain("创新");
      expect(keys).toContain("表达");
      expect(keys).toContain("才情");
      expect(keys).toContain("身心");
      expect(keys).toContain("德行");
    });
  });
});
