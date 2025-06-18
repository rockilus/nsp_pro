import { describe, it, expect } from "@jest/globals";
import fs from "fs";
import path from "path";

/**
 * Test suite to verify the API centralization refactoring
 * Checks that components follow the centralized API pattern
 */
describe("API Centralization", () => {
  const frontendPath = path.resolve(__dirname, "../../src");

  describe("TemplateApplicationToRangeDialog", () => {
    const dialogFile = path.join(
      frontendPath,
      "components/shiftDemand/templates/TemplateApplicationToRangeDialog.tsx"
    );

    it("should not directly import ShiftDemandTemplateApi", () => {
      if (!fs.existsSync(dialogFile)) {
        console.warn(`File not found: ${dialogFile}`);
        return;
      }

      const dialogContent = fs.readFileSync(dialogFile, "utf8");
      expect(dialogContent).not.toContain("ShiftDemandTemplateApi");
    });

    it("should have onApplyTemplate prop for callback pattern", () => {
      if (!fs.existsSync(dialogFile)) {
        console.warn(`File not found: ${dialogFile}`);
        return;
      }

      const dialogContent = fs.readFileSync(dialogFile, "utf8");
      expect(dialogContent).toContain("onApplyTemplate");
    });

    it("should use callback for API operations", () => {
      if (!fs.existsSync(dialogFile)) {
        console.warn(`File not found: ${dialogFile}`);
        return;
      }

      const dialogContent = fs.readFileSync(dialogFile, "utf8");
      expect(dialogContent).toContain("await onApplyTemplate");
    });

    it("should have proper TypeScript interface for callback", () => {
      if (!fs.existsSync(dialogFile)) {
        console.warn(`File not found: ${dialogFile}`);
        return;
      }

      const dialogContent = fs.readFileSync(dialogFile, "utf8");
      expect(dialogContent).toContain("ApplyTemplateToDateRangeDTO");
      expect(dialogContent).toContain("TemplateApplicationResult");
    });
  });

  describe("TemplateManagementWindow", () => {
    const windowFile = path.join(
      frontendPath,
      "components/shiftDemand/templates/TemplateManagementWindow.tsx"
    );

    it("should have handleApplyTemplateToRange method", () => {
      if (!fs.existsSync(windowFile)) {
        console.warn(`File not found: ${windowFile}`);
        return;
      }

      const windowContent = fs.readFileSync(windowFile, "utf8");
      expect(windowContent).toContain("handleApplyTemplateToRange");
    });

    it("should make centralized API calls", () => {
      if (!fs.existsSync(windowFile)) {
        console.warn(`File not found: ${windowFile}`);
        return;
      }

      const windowContent = fs.readFileSync(windowFile, "utf8");
      expect(windowContent).toContain(
        "ShiftDemandTemplateApi.applyTemplateToDateRange"
      );
    });

    it("should pass callback to dialog component", () => {
      if (!fs.existsSync(windowFile)) {
        console.warn(`File not found: ${windowFile}`);
        return;
      }

      const windowContent = fs.readFileSync(windowFile, "utf8");
      expect(windowContent).toContain(
        "onApplyTemplate={handleApplyTemplateToRange}"
      );
    });

    it("should import required types", () => {
      if (!fs.existsSync(windowFile)) {
        console.warn(`File not found: ${windowFile}`);
        return;
      }

      const windowContent = fs.readFileSync(windowFile, "utf8");
      expect(windowContent).toContain("ApplyTemplateToDateRangeDTO");
    });
  });

  describe("API Centralization Pattern", () => {
    it("should follow separation of concerns principle", () => {
      // This test verifies the overall pattern is maintained
      const dialogFile = path.join(
        frontendPath,
        "components/shiftDemand/templates/TemplateApplicationToRangeDialog.tsx"
      );
      const windowFile = path.join(
        frontendPath,
        "components/shiftDemand/templates/TemplateManagementWindow.tsx"
      );

      if (!fs.existsSync(dialogFile) || !fs.existsSync(windowFile)) {
        console.warn("Component files not found, skipping pattern test");
        return;
      }

      const dialogContent = fs.readFileSync(dialogFile, "utf8");
      const windowContent = fs.readFileSync(windowFile, "utf8");

      // Dialog should not have direct API calls
      expect(dialogContent).not.toContain(
        "ShiftDemandTemplateApi.applyTemplateToDateRange"
      );

      // Window should have the API logic
      expect(windowContent).toContain("ShiftDemandTemplateApi");

      // Both should use proper TypeScript types
      expect(dialogContent).toContain("ApplyTemplateToDateRangeDTO");
      expect(windowContent).toContain("ApplyTemplateToDateRangeDTO");
    });
  });
});
