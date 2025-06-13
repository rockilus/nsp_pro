/**
 * Tests for TemplateCreationDialog component
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TemplateCreationDialog } from "../TemplateCreationDialog";
import { TemplateType } from "../../../../types/shift-demand-template";
import dayjs from "dayjs";

// Mock the translation hook
jest.mock("../../../../app/i18n/client", () => ({
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
    expect(createButton).toBeDisabled();

    await user.click(createButton);
    expect(screen.getByText("Template name is required")).toBeInTheDocument();
  });

  it("validates minimum name length", async () => {
    const user = userEvent.setup();
    render(<TemplateCreationDialog {...mockProps} />);

    const nameInput = screen.getByLabelText(/Template Name/);
    await user.type(nameInput, "ab");

    const createButton = screen.getByRole("button", {
      name: /Create Template/,
    });
    await user.click(createButton);

    expect(
      screen.getByText("Template name must be at least 3 characters")
    ).toBeInTheDocument();
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
    const mockTemplate = {
      id: "template-123",
      teamId: "team-123",
      name: "Test Template",
      description: "Test description",
      templateType: TemplateType.STANDARD,
      standardWeekData: [],
      createdBy: "user-123",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockApi.createTemplate.mockResolvedValueOnce(mockTemplate);

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
      expect(mockApi.createTemplate).toHaveBeenCalledWith("team-123", {
        name: "Test Template",
        description: "Test description",
        templateType: TemplateType.STANDARD,
        standardWeekData: [],
      });
    });

    expect(mockProps.onTemplateCreated).toHaveBeenCalledWith(mockTemplate);
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it("handles API errors gracefully", async () => {
    const user = userEvent.setup();
    const errorMessage = "API Error occurred";
    mockApi.createTemplate.mockRejectedValueOnce(new Error(errorMessage));

    render(<TemplateCreationDialog {...mockProps} />);

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
    const { rerender } = render(<TemplateCreationDialog {...mockProps} />);

    const nameInput = screen.getByLabelText(/Template Name/);
    await user.type(nameInput, "Test Template");

    // Close and reopen dialog
    rerender(<TemplateCreationDialog {...mockProps} open={false} />);
    rerender(<TemplateCreationDialog {...mockProps} open={true} />);

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
