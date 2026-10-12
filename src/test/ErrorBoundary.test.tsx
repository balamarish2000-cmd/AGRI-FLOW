import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '../components/ErrorBoundary';

// Component that conditionally throws a rendering error for testing
const CrashingComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Simulated component crash during procurement card render');
  }
  return <div data-testid="healthy-component">All systems operational</div>;
};

// Interactive test harness to verify error recovery
const TestHarness = () => {
  const [hasError, setHasError] = useState(true);

  return (
    <ErrorBoundary
      fallbackMessage="Custom failure fallback: Procurement widget failed to render"
      onReset={() => setHasError(false)}
    >
      <CrashingComponent shouldThrow={hasError} />
    </ErrorBoundary>
  );
};

describe('React ErrorBoundary Component', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Suppress console.error in test output since we expect error to be thrown
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders healthy children when no rendering exception is thrown', () => {
    render(
      <ErrorBoundary>
        <CrashingComponent shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('healthy-component')).toBeInTheDocument();
    expect(screen.getByText('All systems operational')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('catches descendant rendering exceptions and displays friendly fallback UI', () => {
    render(
      <ErrorBoundary fallbackMessage="Custom error message for testing">
        <CrashingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    const alertBox = screen.getByRole('alert');
    expect(alertBox).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Custom error message for testing')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /go to home/i })).toBeInTheDocument();

    // Verify raw error stack is NOT exposed to the user
    expect(screen.queryByText(/Simulated component crash/i)).not.toBeInTheDocument();
  });

  it('recovers cleanly when the "Try Again" recovery action is triggered', () => {
    render(<TestHarness />);

    // Initially in error state
    expect(screen.getByRole('alert')).toBeInTheDocument();

    // Click "Try Again"
    const retryButton = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(retryButton);

    // Should recover and display healthy component
    expect(screen.getByTestId('healthy-component')).toBeInTheDocument();
    expect(screen.getByText('All systems operational')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
