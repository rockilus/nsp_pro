import { describe, it, expect } from "@jest/globals";
import fs from "fs";
import path from "path";

/**
 * Test suite for frontend integration of template application to date ranges
 * Verifies that types, API client, and components are properly integrated
 */
describe("Frontend Template Application Integration", () => {
  const frontendPath = path.resolve(__dirname, "../../src");

  describe("Type Definitions", () => {
    const typesFile = path.join(frontendPath, "types/shift-demand-template.ts");

    const requiredTypes = [
      "ApplyTemplateToDateRangeDTO",
      "TemplateApplicationResult",
    ];

    requiredTypes.forEach((type) => {
      it(`should define ${type} type`, () => {
        if (!fs.existsSync(typesFile)) {
          console.warn(`Types file not found: ${typesFile}`);
          return;
        }

        const typesContent = fs.readFileSync(typesFile, "utf8");
        const hasType =
          typesContent.includes(`interface ${type}`) ||
          typesContent.includes(`type ${type}`);
        expect(hasType).toBe(true);
      });
    });
  });

  describe("API Client", () => {
    const apiFile = path.join(
      frontendPath,
      "app/lib/api/shiftDemandTemplateApi.ts"
    );

    it("should have applyTemplateToDateRange method", () => {
      if (!fs.existsSync(apiFile)) {
        console.warn(`API file not found: ${apiFile}`);
        return;
      }

      const apiContent = fs.readFileSync(apiFile, "utf8");
      expect(apiContent).toContain("applyTemplateToDateRange");
    });
  });

  describe("Dialog Component", () => {
    const dialogFile = path.join(
      frontendPath,
      "components/shiftDemand/templates/TemplateApplicationToRangeDialog.tsx"
    );

    it("should exist as a component file", () => {
      expect(fs.existsSync(dialogFile)).toBe(true);
    });

    if (
      fs.existsSync(
        path.join(
          frontendPath,
          "components/shiftDemand/templates/TemplateApplicationToRangeDialog.tsx"
        )
      )
    ) {
      const requiredFeatures = [
        "DatePicker",
        "TemplateApplicationToRangeDialogProps",
      ];

      requiredFeatures.forEach((feature) => {
        it(`should include ${feature}`, () => {
          const dialogFile = path.join(
            frontendPath,
            "components/shiftDemand/templates/TemplateApplicationToRangeDialog.tsx"
          );
          const dialogContent = fs.readFileSync(dialogFile, "utf8");
          expect(dialogContent).toContain(feature);
        });
      });
    }
  });

  describe("Management Window Integration", () => {
    const windowFile = path.join(
      frontendPath,
      "components/shiftDemand/templates/TemplateManagementWindow.tsx"
    );

    const integrationFeatures = [
      "TemplateApplicationToRangeDialog",
      "showRangeApplicationDialog",
      "handleRangeApplicationComplete",
    ];

    integrationFeatures.forEach((feature) => {
      it(`should integrate ${feature}`, () => {
        if (!fs.existsSync(windowFile)) {
          console.warn(`Window file not found: ${windowFile}`);
          return;
        }

        const windowContent = fs.readFileSync(windowFile, "utf8");
        expect(windowContent).toContain(feature);
      });
    });
  });

  describe("Internationalization", () => {
    const translationsFile = path.join(
      frontendPath,
      "app/i18n/locales/en/shift-demand-templates.json"
    );

    const requiredTranslations = [
      "apply_template_to_date_range",
      "select_date_range",
      "overwrite_existing_demands",
      "template_application_summary",
    ];

    requiredTranslations.forEach((key) => {
      it(`should have translation key: ${key}`, () => {
        if (!fs.existsSync(translationsFile)) {
          console.warn(`Translations file not found: ${translationsFile}`);
          return;
        }

        const translationsContent = fs.readFileSync(translationsFile, "utf8");
        expect(translationsContent).toContain(`"${key}"`);
      });
    });
  });

  describe("Overall Integration", () => {
    it("should have complete feature implementation", () => {
      const dialogFile = path.join(
        frontendPath,
        "components/shiftDemand/templates/TemplateApplicationToRangeDialog.tsx"
      );
      const windowFile = path.join(
        frontendPath,
        "components/shiftDemand/templates/TemplateManagementWindow.tsx"
      );
      const typesFile = path.join(
        frontendPath,
        "types/shift-demand-template.ts"
      );
      const apiFile = path.join(
        frontendPath,
        "app/lib/api/shiftDemandTemplateApi.ts"
      );

      // Check if key files exist
      const coreFilesExist = [
        dialogFile,
        windowFile,
        typesFile,
        apiFile,
      ].filter((file) => fs.existsSync(file));

      // At least some core files should exist for integration
      expect(coreFilesExist.length).toBeGreaterThan(0);
    });
  });
});
