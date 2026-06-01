import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MoodQuickRecord } from '@/components/mood-quick-record';

describe('Feature 4: Mood — 心情日记快速记录', () => {
  describe('场景 4.3: 显示今日心情记录选项', () => {
    it('应显示 5 个心情等级按钮', () => {
      render(<MoodQuickRecord onRecorded={() => {}} />);

      expect(screen.getByRole('button', { name: /很低落/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /有些低落/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /一般/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /不错/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /非常好/ })).toBeInTheDocument();
    });
  });

  describe('场景 4.4: 选择心情后按钮变为可用', () => {
    it('点击心情按钮后"记录心情"按钮应变为可用', async () => {
      render(<MoodQuickRecord onRecorded={() => {}} />);

      const submitBtn = screen.getByRole('button', { name: /记录心情/ });
      expect(submitBtn).toBeDisabled();

      const goodButton = screen.getByRole('button', { name: /不错/ });
      await userEvent.click(goodButton);

      expect(submitBtn).not.toBeDisabled();
    });
  });

  describe('场景 4.5: 提交心情后触发回调', () => {
    it('提交后应调用 onRecorded', async () => {
      const onRecorded = vi.fn();
      render(<MoodQuickRecord onRecorded={onRecorded} />);

      await userEvent.click(screen.getByRole('button', { name: /非常好/ }));
      await userEvent.type(screen.getByPlaceholderText(/写下今天的心情/), '今天很开心');
      await userEvent.click(screen.getByRole('button', { name: /记录心情/ }));

      await waitFor(() => {
        expect(onRecorded).toHaveBeenCalled();
      });
    });
  });
});
