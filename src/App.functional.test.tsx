// @vitest-environment jsdom
// End-to-end behaviour through the real UI: countdown, logging questions/cards,
// the Anki trap, streak and retrieval ratio all update from real interactions.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import App from "./App";
import { useStore } from "./state/store";
import { freshState } from "./state/defaults";
import { daysToExam } from "./derive/phases";
import { currentStreak } from "./derive/streak";
import { todayISO } from "./lib/date";

// Run tests in local (unconfigured) mode so the app isn't behind the auth gate.
vi.mock("./sync/supabase", () => ({ supabase: null, isSyncConfigured: false, TABLE: "vitals_state" }));

beforeEach(() => useStore.getState().replaceState(freshState()));
afterEach(cleanup);

const log = (button: string) => {
  fireEvent.click(screen.getByRole("button", { name: button })); // open the sheet
  fireEvent.click(screen.getByRole("button", { name: "Log it" })); // submit defaults
};

describe("Vitals is functional end-to-end", () => {
  it("counts down the real days to the exam deadline", () => {
    render(<App />);
    const expected = daysToExam(freshState(), todayISO());
    expect(expected).toBeGreaterThan(0); // 2027-02-09 is in the future
    // The status-bar readout shows that exact number.
    const readout = screen.getByTitle("Days to the DWE");
    expect(readout.textContent).toContain(String(expected));
    // It's derived from today's date, so it decreases by one each calendar day.
    expect(daysToExam(freshState(), "2027-02-08")).toBe(1);
    expect(daysToExam(freshState(), "2027-02-09")).toBe(0);
  });

  it("logging questions updates the daily goal and retrieval ratio", () => {
    render(<App />);
    // before: empty state, no ratio pill
    expect(screen.queryByText("In band")).toBeNull();

    log("+ Questions"); // default 20 questions

    expect(screen.getByText(/Goal hit/)).toBeTruthy(); // 20 / 20
    expect(screen.getByText("In band")).toBeTruthy(); // ratio is 100% active
    expect(useStore.getState().log).toHaveLength(1);
    expect(useStore.getState().log[0]).toMatchObject({ type: "questions", count: 20 });
  });

  it("making cards without reviewing fires the Anki trap warning", () => {
    render(<App />);
    expect(screen.queryByText(/wasted effort/)).toBeNull();

    log("+ Cards"); // default 10 cards, type reflects the tapped button

    expect(useStore.getState().log[0]).toMatchObject({ type: "cards", count: 10 });
    expect(screen.getByText(/wasted effort/)).toBeTruthy();
  });

  it("advances the streak on questions but not on passive input", () => {
    render(<App />);
    log("+ Lecture"); // passive — must NOT start a streak
    expect(currentStreak(useStore.getState(), todayISO())).toBe(0);

    log("+ Questions"); // active — starts the streak
    expect(currentStreak(useStore.getState(), todayISO())).toBe(1);
    // and the Consistency card renders that streak
    const consistency = screen.getByText("Consistency").closest("section")!;
    expect(within(consistency).getAllByText("1").length).toBeGreaterThanOrEqual(1);
  });

  it("ticking a condition raises blueprint coverage off zero", () => {
    render(<App />);
    // jump to Syllabus (first matching nav button)
    fireEvent.click(screen.getAllByRole("button", { name: /^Syllabus$/ })[0]);
    fireEvent.click(screen.getByText("General Medicine")); // expand
    const before = useStore.getState().syllabus;
    expect(Object.keys(before)).toHaveLength(0);
    fireEvent.click(screen.getByText("Sepsis & septic shock")); // none -> learning
    expect(useStore.getState().syllabus["gen:0"]).toBe("learning");
  });

  it("settings edits the synced profile (daily question goal)", () => {
    render(<App />);
    expect(useStore.getState().profile.dailyQuestionTarget).toBe(20); // default
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    const dialog = screen.getByRole("dialog", { name: "Settings" });
    expect(within(dialog).getByText("Exam date")).toBeTruthy();
    fireEvent.change(within(dialog).getByLabelText("Daily question goal"), { target: { value: "35" } });
    expect(useStore.getState().profile.dailyQuestionTarget).toBe(35);
  });
});
