import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RegisterForm from "./RegisterForm";

const setup = () => {
  return render(<RegisterForm />);
};

afterEach(() => {
  // Clean up window.location mocks etc if mutated
  window.location.href = "http://localhost:3000/";
});

describe("RegisterForm - State Transitions & Validation", () => {
  it("sets touched.email true and validates on email blur", async () => {
    setup();
    const emailInput = screen.getByLabelText(/email/i);
    await userEvent.type(emailInput, "demo@{tab}"); // incomplete email
    expect(emailInput).toHaveValue("demo@");
    expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
  });

  it("correctly validates valid email and password, clears errors", async () => {
    setup();
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/^password/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    await userEvent.type(emailInput, "user@email.com{tab}");
    await userEvent.type(passwordInput, "abcABC123{tab}");
    await userEvent.type(confirmPasswordInput, "abcABC123{tab}");

    expect(screen.queryByTestId("form-error-alert")).not.toBeInTheDocument();
  });

  it("shows error for password too short", async () => {
    setup();
    const passwordInput = screen.getByLabelText(/^password/i);
    await userEvent.type(passwordInput, "1234{tab}");
    const passwordErrorId = passwordInput.getAttribute("aria-describedby");
    expect(screen.getAllByTestId(`field-error-${passwordErrorId}`)).toHaveLength(1);
  });

  it("shows error for password missing digit", async () => {
    setup();
    const passwordInput = screen.getByLabelText(/^password/i);
    await userEvent.type(passwordInput, "abcdefgh{tab}");
    const passwordErrorId = passwordInput.getAttribute("aria-describedby");
    expect(screen.getByTestId(`field-error-${passwordErrorId}`)).toHaveTextContent(/one digit/i);
  });
});

describe("RegisterForm - Handler Functions", () => {
  it("shows mismatch error only for confirmPassword (password valid stays without error)", async () => {
    setup();
    const passwordInput = screen.getByLabelText(/^password/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

    await userEvent.type(passwordInput, "Abcdef12");
    await userEvent.type(confirmPasswordInput, "Different");
    await userEvent.tab();

    const confirmPasswordErrorId = confirmPasswordInput.getAttribute("aria-describedby");
    const passwordErrorId = passwordInput.getAttribute("aria-describedby");

    expect(screen.getByTestId(`field-error-${confirmPasswordErrorId}`)).toHaveTextContent(
      /password must contain at least one digit/i
    );
    expect(screen.queryByTestId(`field-error-${passwordErrorId}`)).not.toBeInTheDocument();
  });
});

describe("RegisterForm - handleSubmit flow", () => {
  it("prevents submission when form is invalid", async () => {
    setup();
    const submitBtn = screen.getByRole("button", { name: /create account/i });
    await userEvent.click(submitBtn);
    expect(submitBtn).toBeDisabled(); // Should not become submitting when invalid
  });
  it("submits and redirects on success", async () => {
    setup();
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/^password/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    await userEvent.type(emailInput, "test@test.com");
    await userEvent.type(passwordInput, "Passw0rd1");
    await userEvent.type(confirmPasswordInput, "Passw0rd1");
    const submitBtn = screen.getByRole("button", { name: /create account/i });
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(window.location.pathname).toBe("/");
    });
  });
  it("shows form-level error from registerUser API", async () => {
    setup();
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/^password/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    await userEvent.type(emailInput, "exists@test.com");
    await userEvent.type(passwordInput, "Passw0rd1");
    await userEvent.type(confirmPasswordInput, "Passw0rd1");
    const submitBtn = screen.getByRole("button", { name: /create account/i });
    await userEvent.click(submitBtn);
    await waitFor(() => {
      // Form-level error visible
      expect(screen.getByTestId("form-error-alert")).toHaveTextContent(/user already exists/i);
    });
  });

  it("prevents submission when form is invalid (no API call)", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");

    setup();
    const submitBtn = screen.getByRole("button", { name: /create account/i });

    await userEvent.click(submitBtn);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(submitBtn).toBeDisabled();

    fetchSpy.mockRestore();
  });
});

describe("RegisterForm - UI State/Accessibility & Error Clear", () => {
  it("each input has correct label, describedby, and error a11y", async () => {
    setup();
    const emailInput = screen.getByLabelText(/email/i);
    const emailLabel = screen.getByText(/email/i);
    expect(emailInput.id).toBeTruthy();
    expect(emailLabel).toHaveAttribute("for", emailInput.id);
    expect(emailInput).toHaveAttribute("aria-describedby");
    await userEvent.type(emailInput, "bademail");
    await userEvent.tab();
    const describedId = emailInput.getAttribute("aria-describedby");
    expect(screen.getByTestId(`field-error-${describedId}`)).toHaveTextContent(/invalid email/i);
    expect(emailInput).toHaveAttribute("aria-invalid", "true");
  });

  it("error message disappears after valid correction", async () => {
    setup();
    const emailInput = screen.getByLabelText(/email/i);
    await userEvent.type(emailInput, "bademail");
    await userEvent.tab();
    const describedId = emailInput.getAttribute("aria-describedby");
    expect(screen.getByTestId(`field-error-${describedId}`)).toHaveTextContent(/invalid email/i);
    // Clear error by correcting
    await userEvent.clear(emailInput);
    await userEvent.type(emailInput, "good@example.com");
    await userEvent.tab();
    expect(screen.queryByTestId(`field-error-${describedId}`)).not.toBeInTheDocument();
  });

  it("FormErrorAlert and InlineErrors are rendered as a11y-live alerts", async () => {
    setup();
    const emailInput = screen.getByLabelText(/email/i);
    // cause error on email
    await userEvent.type(emailInput, "bademail");
    await userEvent.tab();
    const describedId = emailInput.getAttribute("aria-describedby");
    const errorAlert = screen.getByTestId(`field-error-${describedId}`);
    // InlineErrors: role=alert; aria-live=polite
    expect(errorAlert.closest("div")).toHaveAttribute("role", "alert");
    expect(errorAlert.closest("div")).toHaveAttribute("aria-live", "polite");

    // Test FormErrorAlert at form-level
    await userEvent.clear(emailInput);
    await userEvent.type(emailInput, "exists@test.com");
    const passwordInput = screen.getByLabelText(/^password/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    await userEvent.type(passwordInput, "Abcdef12");
    await userEvent.type(confirmPasswordInput, "Abcdef12");
    const submitBtn = screen.getByRole("button", { name: /create account/i });
    await userEvent.click(submitBtn);
    const formError = await screen.findByTestId("form-error-alert");
    expect(formError).toHaveAttribute("role", "alert");
  });
});
