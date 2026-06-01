import '@testing-library/jest-dom';
import { server } from './mocks/server';

// 启动 MSW
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
