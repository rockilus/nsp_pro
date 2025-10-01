/**
 * Unit tests for ConstraintTestBase helper methods
 */

import { ConstraintTestBase } from "./constraint-test-base";

describe("ConstraintTestBase", () => {
  let constraintTestBase: ConstraintTestBase;

  beforeEach(() => {
    constraintTestBase = new ConstraintTestBase();

    // Mock test workers and shifts
    (constraintTestBase as any).testWorkers = [
      { workerId: "worker1", name: "Test Worker 1", teamId: "team1" },
      { workerId: "worker2", name: "Test Worker 2", teamId: "team1" },
    ];

    (constraintTestBase as any).testShifts = [
      { id: "shift1", name: "Morning Shift", teamId: "team1" },
      { id: "shift2", name: "Evening Shift", teamId: "team1" },
    ];
  });

  describe("generateConstraintBlocksFromTemplate", () => {
    it("should generate blocks correctly for all block types", () => {
      const mockTemplate = {
        id: "0",
        constraintType: 1,
        text: "Worker should work shifts",
        language: "en",
        blocks: [
          {
            name: 4, // WORKER block
            type: 3, // SHIFT_WORKER_OPTION
            options: [
              {
                name: "all workers",
                id: "",
                idType: 0,
                isBoolDim: false,
                categoryName: "All",
              },
              {
                name: "Test Worker 1",
                id: "worker1",
                idType: 1,
                isBoolDim: false,
                categoryName: "Workers",
              },
            ],
            placeholder: "Worker",
          },
          {
            name: 5, // TEXT block
            type: 0, // STRING
            options: [],
            placeholder: "should work",
          },
          {
            name: 0, // OPERATOR block
            type: 0, // STRING
            options: ["at most", "at least", "exactly"],
            placeholder: "at least",
          },
          {
            name: 1, // NUMBER block
            type: 1, // NUMBER
            options: [],
            placeholder: 2,
          },
          {
            name: 3, // SHIFT block
            type: 3, // SHIFT_WORKER_OPTION
            options: [
              {
                name: "all shifts",
                id: "",
                idType: 0,
                isBoolDim: false,
                categoryName: "All",
              },
              {
                name: "Morning Shift",
                id: "shift1",
                idType: 2,
                isBoolDim: false,
                categoryName: "Shifts",
              },
            ],
            placeholder: "shifts",
          },
          {
            name: 2, // TIMING block
            type: 0, // STRING
            options: ["consecutive", "per week", "per month"],
            placeholder: "per week",
          },
        ],
      };

      const blocks = constraintTestBase.generateConstraintBlocksFromTemplate(
        mockTemplate,
        {
          workerIndex: 0,
          shiftIndex: 0,
          numberValue: 3,
          stringOverrides: {
            5: "must work",
            0: "at least",
            2: "per week",
          },
        }
      );

      expect(blocks).toHaveLength(6);

      // Check WORKER block (type 3 - SHIFT_WORKER_OPTION)
      expect(blocks[0]).toEqual({
        name: 4,
        type: 3,
        value: [
          {
            name: "Test Worker 1",
            id: "worker1",
            idType: 1,
            isBoolDim: false,
            categoryName: "Workers",
          },
        ],
      });

      // Check TEXT block (type 0 - STRING with override)
      expect(blocks[1]).toEqual({
        name: 5,
        type: 0,
        value: "must work",
      });

      // Check OPERATOR block (type 0 - STRING with override)
      expect(blocks[2]).toEqual({
        name: 0,
        type: 0,
        value: "at least",
      });

      // Check NUMBER block (type 1 - NUMBER)
      expect(blocks[3]).toEqual({
        name: 1,
        type: 1,
        value: 3,
      });

      // Check SHIFT block (type 3 - SHIFT_WORKER_OPTION)
      expect(blocks[4]).toEqual({
        name: 3,
        type: 3,
        value: [
          {
            name: "Morning Shift",
            id: "shift1",
            idType: 2,
            isBoolDim: false,
            categoryName: "Shifts",
          },
        ],
      });

      // Check TIMING block (type 0 - STRING with override)
      expect(blocks[5]).toEqual({
        name: 2,
        type: 0,
        value: "per week",
      });
    });

    it("should handle missing options gracefully", () => {
      const mockTemplate = {
        id: "0",
        constraintType: 1,
        blocks: [
          {
            name: 4,
            type: 3, // SHIFT_WORKER_OPTION
            options: [], // Empty options
            placeholder: "Worker",
          },
        ],
      };

      const blocks = constraintTestBase.generateConstraintBlocksFromTemplate(
        mockTemplate,
        { workerIndex: 0 }
      );

      expect(blocks).toHaveLength(1);
      expect(blocks[0]).toEqual({
        name: 4,
        type: 3,
        value: [
          {
            name: "Test Worker 1",
            id: "worker1",
            idType: 1,
            isBoolDim: false,
            categoryName: "Workers",
          },
        ],
      });
    });

    it("should use placeholder for string blocks without overrides", () => {
      const mockTemplate = {
        id: "0",
        constraintType: 1,
        blocks: [
          {
            name: 5,
            type: 0, // STRING
            options: [],
            placeholder: "default text",
          },
        ],
      };

      const blocks =
        constraintTestBase.generateConstraintBlocksFromTemplate(mockTemplate);

      expect(blocks).toHaveLength(1);
      expect(blocks[0]).toEqual({
        name: 5,
        type: 0,
        value: "default text",
      });
    });

    it("should use default number value for number blocks", () => {
      const mockTemplate = {
        id: "0",
        constraintType: 1,
        blocks: [
          {
            name: 1,
            type: 1, // NUMBER
            options: [],
            placeholder: 5,
          },
        ],
      };

      const blocks = constraintTestBase.generateConstraintBlocksFromTemplate(
        mockTemplate,
        { numberValue: 7 }
      );

      expect(blocks).toHaveLength(1);
      expect(blocks[0]).toEqual({
        name: 1,
        type: 1,
        value: 7,
      });
    });
  });
});
