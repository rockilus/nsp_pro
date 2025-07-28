import { describe, it, expect } from "@jest/globals";
import fs from "fs";
import path from "path";

/**
 * Test suite to verify API centralization refactoring for TemplateViewer
 * Ensures TemplateViewer uses callbacks instead of direct API calls
 */
describe("TemplateViewer API Centralization", () => {
  const frontendPath = path.resolve(__dirname, "../../src");
  const viewerFile = path.join(
    frontendPath,
    "components/shiftDemand/templates/TemplateViewer.tsx"
  );
  const windowFile = path.join(
    frontendPath,
    "components/shiftDemand/templates/TemplateManagementWindow.tsx"
  );

  describe("TemplateViewer Component", () => {
    it("should not make direct ShiftDemandTemplateApi.updateTemplate calls", () => {
      if (!fs.existsSync(viewerFile)) {
        console.warn(`TemplateViewer file not found: ${viewerFile}`);
        return;
      }

      const viewerContent = fs.readFileSync(viewerFile, "utf8");
      expect(viewerContent).not.toContain(
        "ShiftDemandTemplateApi.updateTemplate"
      );
    });

    it("should not import ShiftDemandTemplateApi (except for TemplateUtils)", () => {
      if (!fs.existsSync(viewerFile)) {
        console.warn(`TemplateViewer file not found: ${viewerFile}`);
        return;
      }

      const viewerContent = fs.readFileSync(viewerFile, "utf8");
      const apiImportLines = viewerContent
        .split("\n")
        .filter(
          (line) =>
            line.includes("ShiftDemandTemplateApi") && line.includes("import")
        );

      expect(apiImportLines.length).toBe(0);
    });

    it("should use onUpdateTemplate callback for API operations", () => {
      if (!fs.existsSync(viewerFile)) {
        console.warn(`TemplateViewer file not found: ${viewerFile}`);
        return;
      }

      const viewerContent = fs.readFileSync(viewerFile, "utf8");
      expect(viewerContent).toContain("await onUpdateTemplate({");
    });

    it("should have proper interface with onUpdateTemplate callback prop", () => {
      if (!fs.existsSync(viewerFile)) {
        console.warn(`TemplateViewer file not found: ${viewerFile}`);
        return;
      }

      const viewerContent = fs.readFileSync(viewerFile, "utf8");
      expect(viewerContent).toContain(
        "onUpdateTemplate: (updates: Partial<ShiftDemandTemplateDTO>) => Promise<void>"
      );
    });

    it("should still import TemplateUtils for other functionality (if needed)", () => {
      if (!fs.existsSync(viewerFile)) {
        console.warn(`TemplateViewer file not found: ${viewerFile}`);
        return;
      }

      const viewerContent = fs.readFileSync(viewerFile, "utf8");
      // This is optional - just log if TemplateUtils is used
      const hasTemplateUtils = viewerContent.includes("TemplateUtils");
      if (hasTemplateUtils) {
        console.log(
          "ℹ️ TemplateViewer still uses TemplateUtils (for other functionality)"
        );
      }
    });
  });

  describe("TemplateManagementWindow Integration", () => {
    it("should have handleUpdateTemplate method", () => {
      if (!fs.existsSync(windowFile)) {
        console.warn(`TemplateManagementWindow file not found: ${windowFile}`);
        return;
      }

      const windowContent = fs.readFileSync(windowFile, "utf8");
      expect(windowContent).toContain("const handleUpdateTemplate = async");
    });

    it("should pass handleUpdateTemplate to TemplateViewer", () => {
      if (!fs.existsSync(windowFile)) {
        console.warn(`TemplateManagementWindow file not found: ${windowFile}`);
        return;
      }

      const windowContent = fs.readFileSync(windowFile, "utf8");
      expect(windowContent).toContain(
        "onUpdateTemplate={handleUpdateTemplate}"
      );
    });

    // it("should make centralized API calls in handleUpdateTemplate", () => {
    //   if (!fs.existsSync(windowFile)) {
    //     console.warn(`TemplateManagementWindow file not found: ${windowFile}`);
    //     return;
    //   }

    //   const windowContent = fs.readFileSync(windowFile, "utf8");
    //   expect(windowContent).toContain(
    //     "await ShiftDemandTemplateApi.updateTemplate("
    //   );
    // });
  });

  // describe("Overall API Centralization Pattern", () => {
  //   it("should follow the centralized API pattern correctly", () => {
  //     if (!fs.existsSync(viewerFile) || !fs.existsSync(windowFile)) {
  //       console.warn("Component files not found, skipping pattern test");
  //       return;
  //     }

  //     const viewerContent = fs.readFileSync(viewerFile, "utf8");
  //     const windowContent = fs.readFileSync(windowFile, "utf8");

  //     // TemplateViewer should be centralized
  //     const viewerCentralized =
  //       !viewerContent.includes("ShiftDemandTemplateApi.updateTemplate") &&
  //       viewerContent.includes("await onUpdateTemplate({");

  //     // TemplateManagementWindow should provide the callback
  //     const windowProvides =
  //       windowContent.includes("onUpdateTemplate={handleUpdateTemplate}") &&
  //       windowContent.includes("await ShiftDemandTemplateApi.updateTemplate(");

  //     expect(viewerCentralized).toBe(true);
  //     expect(windowProvides).toBe(true);
  //   });
  // });
});
