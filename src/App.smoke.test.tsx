// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import App from "./App";

afterEach(cleanup);

describe("App renders end-to-end (jsdom smoke)", () => {
  it("mounts the shell and the signature retrieval card on Today", () => {
    render(<App />);
    expect(screen.getByText("Vitals")).toBeTruthy();
    expect(screen.getByText(/Retrieval ratio/i)).toBeTruthy();
  });

  it("navigates to every tab without throwing", () => {
    render(<App />);
    for (const label of ["Plan", "Syllabus", "Activity", "Today"]) {
      fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${label}$`) }));
    }
    // Activity tab content present after the loop visited it
    fireEvent.click(screen.getByRole("button", { name: /^Activity$/ }));
    expect(screen.getByText(/Weekly recap/i)).toBeTruthy();
  });

  it("Syllabus shows the two coverage bars and expands a specialty", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /^Syllabus$/ }));
    expect(screen.getByText(/Blueprint coverage/i)).toBeTruthy();
    fireEvent.click(screen.getByText("General Medicine"));
    expect(screen.getByText("Sepsis & septic shock")).toBeTruthy();
  });
});
