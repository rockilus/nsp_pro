import '@testing-library/jest-dom';

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: '',
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn(),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
    };
  },
}));

// Global test utilities
global.fetch = jest.fn();

// Suppress MUI TouchRipple state-update warnings in tests by mocking it
jest.mock('@mui/material/ButtonBase/TouchRipple', () => {
  return function DummyTouchRipple() {
    return null;
  };
});
