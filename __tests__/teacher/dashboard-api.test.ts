import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/teachers/me/dashboard/route";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

// Mock next-auth
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    teacherClass: {
      findMany: vi.fn(),
    },
    comment: {
      count: vi.fn(),
    },
    milestone: {
      count: vi.fn(),
    },
  },
}));

describe("Dashboard API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 401 when user is not a teacher", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { role: "STUDENT" },
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns dashboard data for authenticated teacher", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { teacherId: "teacher1", name: "王老师", role: "TEACHER" },
    });

    vi.mocked(prisma.teacherClass.findMany).mockResolvedValue([
      {
        isHomeroom: true,
        class: {
          id: "class1",
          name: "1班",
          grade: { name: "高一" },
          students: [
            {
              id: "student1",
              name: "张明",
              careerProfile: { fiveDimensions: JSON.stringify({ 学业: 82 }) },
              moodEntries: [{ date: new Date(), rating: 4 }],
            },
          ],
        },
      },
    ]);

    vi.mocked(prisma.comment.count).mockResolvedValue(5);
    vi.mocked(prisma.milestone.count).mockResolvedValue(0);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.teacher.name).toBe("王老师");
    expect(data.classStats.studentCount).toBe(1);
    expect(data.warnings).toBeDefined();
    expect(data.todos).toBeDefined();
  });
});
