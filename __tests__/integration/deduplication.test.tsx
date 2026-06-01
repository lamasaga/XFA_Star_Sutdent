import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StudentSidebar } from '@/components/student-sidebar';
import { MoodQuickRecord } from '@/components/mood-quick-record';

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

describe('Feature 11: 信息去重验证（全局）', () => {
  describe('场景 11.1: 侧边栏只在学生端页面显示', () => {
    it.each([
      '/dashboard',
      '/profile',
      '/scores',
      '/assessments',
      '/mood',
      '/milestones',
      '/activities',
      '/semester-reports',
      '/settings',
    ])('在 %s 应渲染侧边栏', (pathname) => {
      vi.mocked(usePathname).mockReturnValue(pathname);
      const { container } = render(<StudentSidebar user={mockUser} />);
      expect(container.querySelector('nav')).toBeInTheDocument();
    });
  });

  describe('场景 11.4: MoodQuickRecord 为客户端组件', () => {
    it('应接受 onRecorded 回调', () => {
      const onRecorded = vi.fn();
      render(<MoodQuickRecord onRecorded={onRecorded} />);
      expect(screen.getByRole('button', { name: /不错/ })).toBeInTheDocument();
    });
  });
});
