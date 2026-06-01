import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StudentSidebar } from '@/components/student-sidebar';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}));

import { usePathname } from 'next/navigation';

const mockUser = {
  name: '张明',
  className: '高一 1班',
  level: 5,
  points: 320,
};

describe('Feature 1: 全局导航与面包屑', () => {
  describe('场景 1.1: 侧边栏导航在所有学生端页面可见', () => {
    it('应渲染主导航和设置区域', () => {
      vi.mocked(usePathname).mockReturnValue('/dashboard');
      render(<StudentSidebar user={mockUser} />);

      // 主导航项
      expect(screen.getByText('今日工作台')).toBeInTheDocument();
      expect(screen.getByText('成长档案')).toBeInTheDocument();
      expect(screen.getByText('学业成绩')).toBeInTheDocument();
      expect(screen.getByText('心理测评')).toBeInTheDocument();
      expect(screen.getByText('心情日记')).toBeInTheDocument();
      expect(screen.getByText('里程碑')).toBeInTheDocument();
      expect(screen.getByText('活动记录')).toBeInTheDocument();
      expect(screen.getByText('学期报告')).toBeInTheDocument();

      // 底部设置
      expect(screen.getByText('设置')).toBeInTheDocument();

      // 用户信息
      expect(screen.getByText('张明')).toBeInTheDocument();
    });
  });

  describe('场景 1.2: 当前页面在导航中高亮', () => {
    it('在 /scores 页面"学业成绩"应高亮', () => {
      vi.mocked(usePathname).mockReturnValue('/scores');
      render(<StudentSidebar user={mockUser} />);

      const scoresNav = screen.getByText('学业成绩').closest('a');
      expect(scoresNav?.className).toMatch(/bg-\[\#f0f9ff\]|border-l-\[3px\]/);

      // 其他导航项不高亮
      const profileNav = screen.getByText('成长档案').closest('a');
      expect(profileNav?.className).not.toMatch(/bg-\[\#f0f9ff\]|border-l-\[3px\]/);
    });
  });

  describe('场景 1.3: 点击导航项跳转到对应页面', () => {
    it.each([
      ['今日工作台', '/dashboard'],
      ['成长档案', '/profile'],
      ['学业成绩', '/scores'],
      ['心理测评', '/assessments'],
      ['心情日记', '/mood'],
      ['里程碑', '/milestones'],
      ['活动记录', '/activities'],
      ['学期报告', '/semester-reports'],
    ])('"%s" 应链接到 %s', (label, href) => {
      vi.mocked(usePathname).mockReturnValue('/dashboard');
      render(<StudentSidebar user={mockUser} />);

      const link = screen.getByText(label).closest('a');
      expect(link).toHaveAttribute('href', href);
    });
  });

  describe('场景 1.12: 侧边栏用户信息卡片显示正确', () => {
    it('应显示用户姓名、班级、等级和积分', () => {
      vi.mocked(usePathname).mockReturnValue('/dashboard');
      render(<StudentSidebar user={mockUser} />);

      expect(screen.getByText('张明')).toBeInTheDocument();
      expect(screen.getByText(/高一.*1班/)).toBeInTheDocument();
      expect(screen.getByText(/Lv\.5/)).toBeInTheDocument();
      expect(screen.getByText(/320.*积分/)).toBeInTheDocument();
    });
  });
});
