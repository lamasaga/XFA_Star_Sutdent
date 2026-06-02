import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TeacherSidebar } from "@/components/teacher/teacher-sidebar";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/teacher",
}));

describe("TeacherSidebar", () => {
  const mockUser = {
    name: "王老师",
    role: "HOMEROOM",
  };

  it("renders all navigation items for homeroom teacher", () => {
    render(<TeacherSidebar user={mockUser} />);

    expect(screen.getByText("班级看板")).toBeInTheDocument();
    expect(screen.getByText("我的学生")).toBeInTheDocument();
    expect(screen.getByText("写评语")).toBeInTheDocument();
    expect(screen.getByText("预警中心")).toBeInTheDocument();
    expect(screen.getByText("数据录入")).toBeInTheDocument();
    expect(screen.getByText("报告生成")).toBeInTheDocument();
    expect(screen.getByText("审核中心")).toBeInTheDocument();
  });

  it("does not show review and reports for subject teacher", () => {
    render(<TeacherSidebar user={{ name: "刘老师", role: "SUBJECT" }} />);

    expect(screen.getByText("班级看板")).toBeInTheDocument();
    expect(screen.getByText("我的学生")).toBeInTheDocument();
    expect(screen.queryByText("报告生成")).not.toBeInTheDocument();
    expect(screen.queryByText("审核中心")).not.toBeInTheDocument();
  });

  it("shows active state for current page", () => {
    render(<TeacherSidebar user={mockUser} />);

    const dashboardLink = screen.getByText("班级看板").closest("a");
    expect(dashboardLink).toHaveClass("bg-[#f0f9ff]");
  });

  it("displays teacher name in footer", () => {
    render(<TeacherSidebar user={mockUser} />);

    expect(screen.getByText("王老师")).toBeInTheDocument();
    expect(screen.getByText("班主任")).toBeInTheDocument();
  });
});
