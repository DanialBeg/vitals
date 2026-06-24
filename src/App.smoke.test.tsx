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

  // Both the desktop side-nav and the mobile tab bar render in the DOM (CSS
  // hides one per viewport; jsdom applies no CSS), so each label matches twice.
  const navClick = (label: string) =>
    fireEvent.click(screen.getAllByRole("button", { name: new RegExp(`^${label}$`) })[0]);

  it("navigates to every tab without throwing", () => {
    render(<App />);
    for (const label of ["Plan", "Syllabus", "Activity", "Today"]) navClick(label);
    navClick("Activity");
    expect(screen.getByText(/Weekly recap/i)).toBeTruthy();
  });

  it("Syllabus shows the two coverage bars and expands a specialty", () => {
    render(<App />);
    navClick("Syllabus");
    expect(screen.getByText(/Blueprint coverage/i)).toBeTruthy();
    fireEvent.click(screen.getByText("General Medicine"));
    expect(screen.getByText("Sepsis & septic shock")).toBeTruthy();
  });
});
