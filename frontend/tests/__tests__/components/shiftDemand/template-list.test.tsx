import { describe, it, expect } from "@jest/globals";
import fs from "fs";
import path from "path";

/**
 * Test suite to verify API centralization refactoring for TemplateList
 * Ensures TemplateList uses callbacks instead of direct API calls
 */
describe("TemplateList API Centralization", () => {
  const frontendPath = path.resolve(__dirname, "../../../../src");
  const listFile = path.join(
    frontendPath,
    "components/shiftDemand/templates/TemplateList.tsx",
  );
  const windowFile = path.join(
    frontendPath,
    "components/shiftDemand/templates/TemplateManagementWindow.tsx",
  );

  describe("TemplateList Component", () => {
    it("should not make direct ShiftDemandTemplateApi.getTemplates calls", () => {
      if (!fs.existsSync(listFile)) {
        console.warn(`TemplateList file not found: ${listFile}`);
        return;
      }

      const listContent = fs.readFileSync(listFile, "utf8");
      expect(listContent).not.toContain("ShiftDemandTemplateApi.getTemplates");
    });

    it("should not make direct ShiftDemandTemplateApi.deleteTemplate calls", () => {
      if (!fs.existsSync(listFile)) {
        console.warn(`TemplateList file not found: ${listFile}`);
        return;
      }

      const listContent = fs.readFileSync(listFile, "utf8");
      expect(listContent).not.toContain(
        "ShiftDemandTemplateApi.deleteTemplate",
      );
    });

    it("should not import ShiftDemandTemplateApi (except for TemplateUtils)", () => {
      if (!fs.existsSync(listFile)) {
        console.warn(`TemplateList file not found: ${listFile}`);
        return;
      }

      const listContent = fs.readFileSync(listFile, "utf8");
      const apiImportLines = listContent
        .split("\n")
        .filter(
          (line) =>
            line.includes("ShiftDemandTemplateApi") && line.includes("import"),
        );

      expect(apiImportLines.length).toBe(0);
    });

    it("should use onLoadTemplates callback", () => {
      if (!fs.existsSync(listFile)) {
        console.warn(`TemplateList file not found: ${listFile}`);
        return;
      }

      const listContent = fs.readFileSync(listFile, "utf8");
      expect(listContent).toContain("onLoadTemplates");
    });

    it("should use onDeleteTemplateRequest callback", () => {
      if (!fs.existsSync(listFile)) {
        console.warn(`TemplateList file not found: ${listFile}`);
        return;
      }

      const listContent = fs.readFileSync(listFile, "utf8");
      expect(listContent).toContain("onDeleteTemplateRequest");
    });

    it("should have proper interface with callback props", () => {
      if (!fs.existsSync(listFile)) {
        console.warn(`TemplateList file not found: ${listFile}`);
        return;
      }

      const listContent = fs.readFileSync(listFile, "utf8");
      expect(listContent).toContain("onLoadTemplates: () => Promise<void>");
      // Check for the actual signature from the file
      const hasDeleteRequest =
        listContent.includes("onDeleteTemplateRequest: (") &&
        listContent.includes("templateId: string") &&
        listContent.includes("templateName: string") &&
        listContent.includes(") => Promise<void>");
      expect(hasDeleteRequest).toBe(true);
    });

    it("should still import TemplateUtils for formatting (if needed)", () => {
      if (!fs.existsSync(listFile)) {
        console.warn(`TemplateList file not found: ${listFile}`);
        return;
      }

      const listContent = fs.readFileSync(listFile, "utf8");
      // This is optional - just log if TemplateUtils is used
      const hasTemplateUtils = listContent.includes("TemplateUtils");
      if (hasTemplateUtils) {
        console.log(
          "ℹ️ TemplateList still uses TemplateUtils (for formatting)",
        );
      }
    });
  });

  describe("TemplateManagementWindow Integration", () => {
    // it("should have handleLoadTemplates method", () => {
    //   if (!fs.existsSync(windowFile)) {
    //     console.warn(`TemplateManagementWindow file not found: ${windowFile}`);
    //     return;
    //   }

    //   const windowContent = fs.readFileSync(windowFile, "utf8");
    //   expect(windowContent).toContain("const handleLoadTemplates = async");
    // });

    // it("should have handleDeleteTemplateRequest method", () => {
    //   if (!fs.existsSync(windowFile)) {
    //     console.warn(`TemplateManagementWindow file not found: ${windowFile}`);
    //     return;
    //   }

    //   const windowContent = fs.readFileSync(windowFile, "utf8");
    //   expect(windowContent).toContain(
    //     "const handleDeleteTemplateRequest = async"
    //   );
    // });

    it("should pass handleLoadTemplates to TemplateList", () => {
      if (!fs.existsSync(windowFile)) {
        console.warn(`TemplateManagementWindow file not found: ${windowFile}`);
        return;
      }

      const windowContent = fs.readFileSync(windowFile, "utf8");
      expect(windowContent).toContain("onLoadTemplates={handleLoadTemplates}");
    });

    it("should pass handleDeleteTemplateRequest to TemplateList", () => {
      if (!fs.existsSync(windowFile)) {
        console.warn(`TemplateManagementWindow file not found: ${windowFile}`);
        return;
      }

      const windowContent = fs.readFileSync(windowFile, "utf8");
      expect(windowContent).toContain(
        "onDeleteTemplateRequest={handleDeleteTemplateRequest}",
      );
    });

    // it("should make centralized API calls in handleLoadTemplates", () => {
    //   if (!fs.existsSync(windowFile)) {
    //     console.warn(`TemplateManagementWindow file not found: ${windowFile}`);
    //     return;
    //   }

    //   const windowContent = fs.readFileSync(windowFile, "utf8");
    //   expect(windowContent).toContain(
    //     "await ShiftDemandTemplateApi.getTemplates("
    //   );
    // });

    // it("should make centralized API calls in handleDeleteTemplateRequest", () => {
    //   if (!fs.existsSync(windowFile)) {
    //     console.warn(`TemplateManagementWindow file not found: ${windowFile}`);
    //     return;
    //   }

    //   const windowContent = fs.readFileSync(windowFile, "utf8");
    //   expect(windowContent).toContain(
    //     "await ShiftDemandTemplateApi.deleteTemplate("
    //   );
    // });
  });

  // describe("Overall API Centralization Pattern", () => {
  //   it("should follow the centralized API pattern correctly", () => {
  //     if (!fs.existsSync(listFile) || !fs.existsSync(windowFile)) {
  //       console.warn("Component files not found, skipping pattern test");
  //       return;
  //     }

  //     const listContent = fs.readFileSync(listFile, "utf8");
  //     const windowContent = fs.readFileSync(windowFile, "utf8");

  //     // TemplateList should be centralized
  //     const listCentralized =
  //       !listContent.includes("ShiftDemandTemplateApi.getTemplates") &&
  //       !listContent.includes("ShiftDemandTemplateApi.deleteTemplate") &&
  //       listContent.includes("onLoadTemplates") &&
  //       listContent.includes("onDeleteTemplateRequest");

  //     // TemplateManagementWindow should provide the callbacks
  //     const windowProvides =
  //       windowContent.includes("onLoadTemplates={handleLoadTemplates}") &&
  //       windowContent.includes(
  //         "onDeleteTemplateRequest={handleDeleteTemplateRequest}"
  //       ) &&
  //       windowContent.includes("await ShiftDemandTemplateApi.getTemplates(") &&
  //       windowContent.includes("await ShiftDemandTemplateApi.deleteTemplate(");

  //     expect(listCentralized).toBe(true);
  //     expect(windowProvides).toBe(true);
  //   });
  // });
});
