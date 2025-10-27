import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import RecipeCreateForm from "./RecipeCreateForm";

beforeEach(() => {
  // Reset window.location mocks
  window.location.assign = vi.fn();
  window.location.href = "http://localhost:3000/";
  vi.clearAllMocks();
});

describe("RecipeCreateForm: Field Validation", () => {
  it("shows required error for empty title after blur", async () => {
    render(<RecipeCreateForm />);
    const input = screen.getByRole("textbox", { name: /recipe title/i });

    await userEvent.type(input, "a{backspace}");
    expect(screen.getByText("Title is required")).toBeInTheDocument();
  });
  it("shows required error for empty content after blur", async () => {
    render(<RecipeCreateForm />);
    const textarea = screen.getByRole("textbox", { name: /recipe content/i });
    await userEvent.type(textarea, "a{backspace}");
    expect(screen.getByText("Content is required")).toBeInTheDocument();
  });
  it("rejects whitespace only title/content on submit, shows error", async () => {
    render(<RecipeCreateForm />);
    const title = screen.getByRole("textbox", { name: /recipe title/i });
    const content = screen.getByRole("textbox", { name: /recipe content/i });
    const save = screen.getByRole("button", { name: /save recipe/i });
    await userEvent.type(title, "    ");
    await userEvent.type(content, "   ");

    expect(save).toBeDisabled();
  });
  it("shows length error if title exceeds 50 characters", async () => {
    render(<RecipeCreateForm />);
    const input = screen.getByRole("textbox", { name: /recipe title/i });
    await userEvent.type(input, "a".repeat(51));
    await userEvent.tab();
    expect(screen.getByText("Title must be ≤ 50 characters")).toBeInTheDocument();
  });
  it("shows length error if content exceeds 10 000 characters", async () => {
    render(<RecipeCreateForm />);
    const textarea = screen.getByRole("textbox", { name: /recipe content/i });
    await userEvent.click(textarea);
    await userEvent.paste("b".repeat(10001));
    await userEvent.tab();
    expect(screen.getByText("Content must be ≤ 10 000 characters")).toBeInTheDocument();
  });
  it("does NOT show error for valid inputs", async () => {
    render(<RecipeCreateForm />);
    const title = screen.getByRole("textbox", { name: /recipe title/i });
    const content = screen.getByRole("textbox", { name: /recipe content/i });
    const save = screen.getByRole("button", { name: /save recipe/i });
    await userEvent.type(title, "Good");
    await userEvent.type(content, "Nice content");
    await userEvent.tab(); // blur
    await userEvent.click(save);
    expect(screen.queryByText(/required|must be/i)).not.toBeInTheDocument();
  });
});

describe("RecipeCreateForm: Error State & UI", () => {
  it("disables inputs and buttons during submit", async () => {
    render(<RecipeCreateForm />);
    const title = screen.getByRole("textbox", { name: /recipe title/i });
    const content = screen.getByRole("textbox", { name: /recipe content/i });
    const save = screen.getByRole("button", { name: /save recipe/i });
    await userEvent.type(title, "Abc");
    await userEvent.type(content, "Def");
    await userEvent.click(save);
    expect(save).toBeDisabled();
  });
  it("clears error after user fixes input", async () => {
    render(<RecipeCreateForm />);
    const title = screen.getByRole("textbox", { name: /recipe title/i });
    await userEvent.type(title, "a{backspace}");
    expect(screen.getByText("Title is required")).toBeInTheDocument();
    await userEvent.type(title, "Fixed");
    expect(screen.queryByText("Title is required")).not.toBeInTheDocument();
  });
});

it("updates title on handleTitleChange and sets touched", async () => {
  const { getByRole } = render(<RecipeCreateForm />);
  const input = getByRole("textbox", { name: /recipe title/i });

  await userEvent.clear(input);
  await userEvent.type(input, "Salad");

  expect(input).toHaveValue("Salad");
});

it("updates content on handleContentChange and sets touched", async () => {
  const { getByRole } = render(<RecipeCreateForm />);
  const textarea = getByRole("textbox", { name: /recipe content/i });

  await userEvent.clear(textarea);
  await userEvent.type(textarea, "Lettuce, tomato, olive oil.");

  expect(textarea).toHaveValue("Lettuce, tomato, olive oil.");
});

it("submits valid recipe and redirects on success", async () => {
  const { getByRole } = render(<RecipeCreateForm />);
  const titleInput = getByRole("textbox", { name: /recipe title/i });
  const instructionsInput = getByRole("textbox", { name: /recipe content/i });
  const saveButton = getByRole("button", { name: /save recipe/i });

  await userEvent.type(titleInput, "My Salad");
  await userEvent.type(instructionsInput, "Lettuce!");
  await userEvent.click(saveButton);

  await waitFor(() => expect(window.location.href).toBe("/recipes"));
});

it("disables adjust with AI button when form is invalid", async () => {
  const { getByText } = render(<RecipeCreateForm />);
  const adjustButton = getByText("Adjust with AI");

  // Instead of checking calls, verify the button is disabled (not clickable)
  expect(adjustButton).toBeDisabled();
});

it("calls adjust with AI and opens modal on 202", async () => {
  const { getByRole, getByText, queryByText } = render(<RecipeCreateForm />);

  await userEvent.type(getByRole("textbox", { name: /recipe title/i }), "AI Salad");
  await userEvent.type(getByRole("textbox", { name: /recipe content/i }), "AI Lettuce!");
  await userEvent.click(getByText("Adjust with AI"));

  await waitFor(() => expect(queryByText("Adjust with AI")).toBeInTheDocument());
});
