/**
 * API test for constraint creation functionality
 *
 * This test verifies that constraint creation via API works correctly
 * for setting up test data in E2E tests.
 */

import { test, expect } from "@playwright/test";
import { ConstraintTestBase } from "../../utils/constraint-test-base";

const constraintTestBase = new ConstraintTestBase();

test.describe("Constraint API Tests", () => {
  test.beforeEach(async () => {
    // Setup the constraint test environment
    await constraintTestBase.setupConstraintTests(test.info().workerIndex);
  });

  test("should create constraint via API successfully", async () => {
    // Get available constraint templates
    const templates = await constraintTestBase.getTestConstraintTemplates();

    if (templates.length === 0) {
      test.skip(
        true,
        "No constraint templates available - cannot test constraint creation"
      );
      return;
    }

    const template = templates[0];
    console.log(
      `Using template: ${template.id} (type: ${template.constraintType})`
    );

    // Create a test constraint
    const constraintData = {
      constraintType: template.constraintType,
      templateId: template.id,
      language: "en",
      blocks: [], // Empty blocks for basic test
      text: "API Test Constraint - Worker assignment rule",
      hard: true,
      priority: "high",
      active: true,
    };

    const createdConstraint = await constraintTestBase.createTestConstraint(
      constraintData
    );

    expect(createdConstraint.constraintId).toBeTruthy();
    expect(createdConstraint.teamId).toBeTruthy();

    console.log(`✅ Created constraint: ${createdConstraint.constraintId}`);

    // Verify constraint can be retrieved
    const constraints = await constraintTestBase.getTestConstraints();
    const foundConstraint = constraints.find(
      (c) => c.id === createdConstraint.constraintId
    );

    expect(foundConstraint).toBeTruthy();
    expect(foundConstraint.text).toBe(
      "API Test Constraint - Worker assignment rule"
    );
    expect(foundConstraint.hard).toBe(true);

    console.log(
      `✅ Constraint verified in database with text: ${foundConstraint.text}`
    );

    // Clean up
    await constraintTestBase.deleteTestConstraint(
      createdConstraint.constraintId
    );
    console.log(`✅ Constraint cleanup completed`);
  });

  test("should update constraint via API successfully", async () => {
    // Get available constraint templates
    const templates = await constraintTestBase.getTestConstraintTemplates();

    if (templates.length === 0) {
      test.skip(
        true,
        "No constraint templates available - cannot test constraint update"
      );
      return;
    }

    const template = templates[0];

    // Create a test constraint first
    const constraintData = {
      constraintType: template.constraintType,
      templateId: template.id,
      language: "en",
      blocks: [],
      text: "Original constraint text",
      hard: true,
      priority: "high",
      active: true,
    };

    const createdConstraint = await constraintTestBase.createTestConstraint(
      constraintData
    );

    // Update the constraint
    const updates = {
      text: "Updated constraint text",
      hard: false,
      priority: "low",
    };

    const updatedConstraint = await constraintTestBase.updateTestConstraint(
      createdConstraint.constraintId,
      updates
    );

    expect(updatedConstraint.constraintId).toBe(createdConstraint.constraintId);

    // Verify the updates were applied
    const constraints = await constraintTestBase.getTestConstraints();
    const foundConstraint = constraints.find(
      (c) => c.id === createdConstraint.constraintId
    );

    expect(foundConstraint.text).toBe("Updated constraint text");
    expect(foundConstraint.hard).toBe(false);

    console.log(
      `✅ Constraint updated successfully: ${foundConstraint.text}, hard: ${foundConstraint.hard}`
    );

    // Clean up
    await constraintTestBase.deleteTestConstraint(
      createdConstraint.constraintId
    );
  });

  test("should delete constraint via API successfully", async () => {
    // Get available constraint templates
    const templates = await constraintTestBase.getTestConstraintTemplates();

    if (templates.length === 0) {
      test.skip(
        true,
        "No constraint templates available - cannot test constraint deletion"
      );
      return;
    }

    const template = templates[0];

    // Create a test constraint first
    const constraintData = {
      constraintType: template.constraintType,
      templateId: template.id,
      language: "en",
      blocks: [],
      text: "Constraint to be deleted",
      hard: true,
      priority: "medium",
      active: true,
    };

    const createdConstraint = await constraintTestBase.createTestConstraint(
      constraintData
    );

    // Verify it exists
    let constraints = await constraintTestBase.getTestConstraints();
    let foundConstraint = constraints.find(
      (c) => c.id === createdConstraint.constraintId
    );
    expect(foundConstraint).toBeTruthy();

    // Delete the constraint
    await constraintTestBase.deleteTestConstraint(
      createdConstraint.constraintId
    );

    // Verify it's deleted
    constraints = await constraintTestBase.getTestConstraints();
    foundConstraint = constraints.find(
      (c) => c.id === createdConstraint.constraintId
    );
    expect(foundConstraint).toBeFalsy();

    console.log(`✅ Constraint deleted successfully`);
  });

  test("should retrieve constraint templates successfully", async () => {
    const templates = await constraintTestBase.getTestConstraintTemplates();

    expect(Array.isArray(templates)).toBe(true);
    console.log(`✅ Retrieved ${templates.length} constraint templates`);

    if (templates.length > 0) {
      const template = templates[0];
      expect(template.id).toBeTruthy();
      expect(template.constraintType).toBeDefined();
      expect(template.text).toBeTruthy();

      console.log(
        `✅ Template validation passed: ${template.id} - ${template.text}`
      );
    }
  });
});
