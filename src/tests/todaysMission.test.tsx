import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TodaysMission, DAILY_QUESTION_GOAL } from "@/components/student/TodaysMission";

const renderMission = (questions: number, loading = false) =>
  render(
    <MemoryRouter>
      <TodaysMission questions={questions} loading={loading} />
    </MemoryRouter>
  );

describe("TodaysMission widget", () => {
  it("shows loading skeleton while metrics load", () => {
    const { container } = renderMission(0, true);
    expect(container.querySelector(".animate-pulse")).not.toBeNull();
  });

  it("shows start state with zero activity", () => {
    renderMission(0);
    expect(screen.getByText(/0 \/ 20 completed/)).toBeDefined();
    expect(screen.getByText("Start Today's Practice")).toBeDefined();
    expect(screen.getByText("+0 XP")).toBeDefined();
  });

  it("shows live progress and XP for partial completion", () => {
    renderMission(12);
    expect(screen.getByText(/12 \/ 20 completed/)).toBeDefined();
    expect(screen.getByText("Continue Practice")).toBeDefined();
    expect(screen.getByText("+12 XP")).toBeDefined();
    expect(DAILY_QUESTION_GOAL).toBe(20);
  });

  it("shows completion state with no CTA at/above goal", () => {
    renderMission(25);
    expect(screen.getByText(/Mission complete/)).toBeDefined();
    expect(screen.queryByText("Continue Practice")).toBeNull();
    expect(screen.getByText("+20 XP")).toBeDefined();
  });
});
