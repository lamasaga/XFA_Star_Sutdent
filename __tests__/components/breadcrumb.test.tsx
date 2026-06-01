import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Breadcrumb } from '@/components/breadcrumb';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}));

import { usePathname } from 'next/navigation';

describe('Feature 1: 面包屑导航', () => {
  describe('场景 1.7: 面包屑显示页面层级', () => {
    it('在 /scores 页面应显示"首页 > 学业成绩"', () => {
      vi.mocked(usePathname).mockReturnValue('/scores');
      render(<Breadcrumb />);

      expect(screen.getByText('首页')).toBeInTheDocument();
      expect(screen.getByText('学业成绩')).toBeInTheDocument();

      const homeLink = screen.getByText('首页').closest('a');
      expect(homeLink).toHaveAttribute('href', '/dashboard');
    });
  });

  describe('场景 1.8: Dashboard 不显示面包屑', () => {
    it('在 /dashboard 页面不应显示面包屑', () => {
      vi.mocked(usePathname).mockReturnValue('/dashboard');
      const { container } = render(<Breadcrumb />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('场景 1.9: 最后一项不可点击', () => {
    it('当前页面标题不应是链接', () => {
      vi.mocked(usePathname).mockReturnValue('/profile');
      render(<Breadcrumb />);

      const current = screen.getByText('成长档案');
      expect(current.tagName.toLowerCase()).toBe('span');
    });
  });
});
