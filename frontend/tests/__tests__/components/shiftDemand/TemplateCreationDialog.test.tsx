/**
 * Tests for TemplateCreationDialog component
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TemplateCreationDialog } from "../../../../src/components/shiftDemand/templates/TemplateCreationDialog";
import { TemplateType } from "../../../../src/types/shift-demand-template";
import dayjs from "dayjs";
import "@testing-library/jest-dom";

// Mock the translation hook
jest.mock("../../../../src/app/i18n/client", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        create_new_template: "Create New Template",
        template_name: "Template Name",
        template_description: "Description",
        template_description_placeholder:
          "Enter a description for this template (optional)",
        cancel: "Cancel",
        create_template: "Create Template",
        creating: "Creating...",
        template_name_required: "Template name is required",
        template_name_too_short: "Template name must be at least 3 characters",
        template_name_too_long: "Template name cannot exceed 100 characters",
        error_creating_template: "Failed to create template",
      };
      return translations[key] || key;
    },
  }),
}));

// Mock the API client
const mockApi = {
  createTemplate: jest.fn(),
};

// Note: The TemplateCreationDialog doesn't directly call the API,
// it passes data to parent via onTemplateCreated callback.
// This mock is for compatibility with existing test structure.
jest.mock("../../../../src/app/lib/api/shiftDemandTemplateApi", () => ({
  ShiftDemandTemplateApi: mockApi,
}));

const mockProps = {
  lng: "en",
  open: true,
  onClose: jest.fn(),
  teamId: "team-123",
  shifts: [],
  currentPeriod: {
    start: dayjs(),
    end: dayjs().add(1, "month"),
  },
  onTemplateCreated: jest.fn(),
  onError: jest.fn(),
};

describe("TemplateCreationDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mock implementations
    mockApi.createTemplate.mockReset();
  });

  it("renders the dialog with form fields", () => {
    render(<TemplateCreationDialog {...mockProps} />);

    expect(screen.getByText("Create New Template")).toBeInTheDocument();
    expect(screen.getByLabelText(/Template Name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cancel/ })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Create Template/ })
    ).toBeInTheDocument();
  });

  it("validates required template name", async () => {
    const user = userEvent.setup();
    render(<TemplateCreationDialog {...mockProps} />);

    const createButton = screen.getByRole("button", {
      name: /Create Template/,
    });

    // Button should be disabled when name is empty
    expect(createButton).toBeDisabled();

    // Since the button is disabled and can't be clicked,
    // the test verifies the expected behavior: button is disabled without a valid name
  });

  it("validates minimum name length", async () => {
    const user = userEvent.setup();
    render(<TemplateCreationDialog {...mockProps} />);

    const nameInput = screen.getByLabelText(/Template Name/);

    // Since MIN_NAME_LENGTH is 1, test with empty string after typing and deleting
    await user.type(nameInput, "a");
    await user.clear(nameInput);

    const createButton = screen.getByRole("button", {
      name: /Create Template/,
    });

    // Button should be disabled when name is empty
    expect(createButton).toBeDisabled();
  });

  it("enables create button when valid name is provided", async () => {
    const user = userEvent.setup();
    render(<TemplateCreationDialog {...mockProps} />);

    const nameInput = screen.getByLabelText(/Template Name/);
    await user.type(nameInput, "Valid Template Name");

    const createButton = screen.getByRole("button", {
      name: /Create Template/,
    });
    expect(createButton).toBeEnabled();
  });

  it("successfully creates a template", async () => {
    const user = userEvent.setup();

    render(<TemplateCreationDialog {...mockProps} />);

    const nameInput = screen.getByLabelText(/Template Name/);
    const descriptionInput = screen.getByLabelText(/Description/);

    await user.type(nameInput, "Test Template");
    await user.type(descriptionInput, "Test description");

    const createButton = screen.getByRole("button", {
      name: /Create Template/,
    });
    await user.click(createButton);

    await waitFor(() => {
      expect(mockProps.onTemplateCreated).toHaveBeenCalledWith({
        name: "Test Template",
        description: "Test description",
      });
    });

    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it("handles API errors gracefully", async () => {
    const user = userEvent.setup();

    // Mock the onTemplateCreated to throw an error (simulating parent component error)
    const errorMessage = "API Error occurred";
    const onTemplateCreatedMock = jest.fn().mockImplementation(() => {
      throw new Error(errorMessage);
    });

    render(
      <TemplateCreationDialog
        {...mockProps}
        onTemplateCreated={onTemplateCreatedMock}
      />
    );

    const nameInput = screen.getByLabelText(/Template Name/);
    await user.type(nameInput, "Test Template");

    const createButton = screen.getByRole("button", {
      name: /Create Template/,
    });
    await user.click(createButton);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    expect(mockProps.onError).toHaveBeenCalledWith(errorMessage);
  });

  it("resets form when dialog is closed", async () => {
    const user = userEvent.setup();
    const onCloseMock = jest.fn();

    const { rerender } = render(
      <TemplateCreationDialog {...mockProps} onClose={onCloseMock} />
    );

    const nameInput = screen.getByLabelText(/Template Name/);
    await user.type(nameInput, "Test Template");

    // Click cancel to close dialog (which should reset form)
    const cancelButton = screen.getByRole("button", { name: /Cancel/ });
    await user.click(cancelButton);

    // Verify onClose was called
    expect(onCloseMock).toHaveBeenCalled();

    // Re-render with dialog closed and then open again
    rerender(
      <TemplateCreationDialog
        {...mockProps}
        onClose={onCloseMock}
        open={false}
      />
    );
    rerender(
      <TemplateCreationDialog
        {...mockProps}
        onClose={onCloseMock}
        open={true}
      />
    );

    // Form should be reset
    expect(screen.getByLabelText(/Template Name/)).toHaveValue("");
  });

  it("shows character count for name field", async () => {
    const user = userEvent.setup();
    render(<TemplateCreationDialog {...mockProps} />);

    const nameInput = screen.getByLabelText(/Template Name/);
    await user.type(nameInput, "Test");

    expect(screen.getByText("4/100")).toBeInTheDocument();
  });

  it("shows character count for description field", async () => {
    const user = userEvent.setup();
    render(<TemplateCreationDialog {...mockProps} />);

    const descriptionInput = screen.getByLabelText(/Description/);
    await user.type(descriptionInput, "Test description");

    expect(screen.getByText("16/500")).toBeInTheDocument();
  });
});
