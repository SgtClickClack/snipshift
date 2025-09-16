import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MultiStepForm, Step } from '../multi-step-form';

// Mock components for testing
const MockStepComponent = ({ data, updateData }: { data: any; updateData: (data: any) => void }) => (
  <div>
    <input
      data-testid="test-input"
      value={data?.testValue || ''}
      onChange={(e) => updateData({ testValue: e.target.value })}
      placeholder="Test input"
    />
  </div>
);

const mockSteps: Step[] = [
  {
    id: 'step1',
    title: 'Step 1',
    description: 'First step',
    component: <MockStepComponent />,
    validation: () => {
      const data = (window as any).currentStepData || {};
      return !!data.testValue;
    }
  },
  {
    id: 'step2',
    title: 'Step 2',
    description: 'Second step',
    component: <MockStepComponent />,
    validation: () => true
  },
  {
    id: 'step3',
    title: 'Step 3',
    description: 'Third step',
    component: <MockStepComponent />
  }
];

describe('MultiStepForm', () => {
  const mockOnComplete = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (window as any).currentStepData = {};
  });

  it('renders the first step by default', () => {
    render(
      <MultiStepForm
        steps={mockSteps}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
        title="Test Form"
        subtitle="Test subtitle"
      />
    );

    expect(screen.getByText('Test Form')).toBeInTheDocument();
    expect(screen.getByText('Test subtitle')).toBeInTheDocument();
    expect(screen.getByText('Step 1')).toBeInTheDocument();
    expect(screen.getByText('First step')).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
    expect(screen.getByText('33% Complete')).toBeInTheDocument();
  });

  it('shows progress bar with correct percentage', () => {
    render(
      <MultiStepForm
        steps={mockSteps}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
        title="Test Form"
      />
    );

    expect(screen.getByText('33% Complete')).toBeInTheDocument();
    
    // Progress bar should be visible
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
  });

  it('displays step navigation dots', () => {
    render(
      <MultiStepForm
        steps={mockSteps}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
        title="Test Form"
      />
    );

    // Should show 3 step dots
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('validates step before allowing next', async () => {
    const user = userEvent.setup();
    render(
      <MultiStepForm
        steps={mockSteps}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
        title="Test Form"
      />
    );

    const nextButton = screen.getByText('Next');
    expect(nextButton).toBeInTheDocument();

    // Try to go to next step without filling required field
    await user.click(nextButton);
    
    // Should stay on step 1 because validation fails
    expect(screen.getByText('Step 1')).toBeInTheDocument();
    expect(mockOnComplete).not.toHaveBeenCalled();
  });

  it('allows navigation to next step when validation passes', async () => {
    const user = userEvent.setup();
    render(
      <MultiStepForm
        steps={mockSteps}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
        title="Test Form"
      />
    );

    const input = screen.getByTestId('test-input');
    const nextButton = screen.getByText('Next');

    // Fill required field
    await user.type(input, 'test value');
    (window as any).currentStepData = { testValue: 'test value' };

    // Click next
    await user.click(nextButton);

    // Should move to step 2
    await waitFor(() => {
      expect(screen.getByText('Step 2')).toBeInTheDocument();
      expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
      expect(screen.getByText('67% Complete')).toBeInTheDocument();
    });
  });

  it('allows navigation back to previous step', async () => {
    const user = userEvent.setup();
    render(
      <MultiStepForm
        steps={mockSteps}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
        title="Test Form"
      />
    );

    // Go to step 2 first
    const input = screen.getByTestId('test-input');
    await user.type(input, 'test value');
    (window as any).currentStepData = { testValue: 'test value' };
    
    await user.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(screen.getByText('Step 2')).toBeInTheDocument();
    });

    // Click previous button
    const previousButton = screen.getByText('Previous');
    await user.click(previousButton);

    // Should go back to step 1
    await waitFor(() => {
      expect(screen.getByText('Step 1')).toBeInTheDocument();
      expect(screen.getByText('33% Complete')).toBeInTheDocument();
    });
  });

  it('shows complete button on last step', async () => {
    const user = userEvent.setup();
    render(
      <MultiStepForm
        steps={mockSteps}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
        title="Test Form"
      />
    );

    // Navigate to last step
    const input = screen.getByTestId('test-input');
    await user.type(input, 'test value');
    (window as any).currentStepData = { testValue: 'test value' };
    
    await user.click(screen.getByText('Next'));
    await waitFor(() => {
      expect(screen.getByText('Step 2')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Next'));
    await waitFor(() => {
      expect(screen.getByText('Step 3')).toBeInTheDocument();
    });

    // Should show complete button instead of next
    expect(screen.getByText('Complete Setup')).toBeInTheDocument();
    expect(screen.queryByText('Next')).not.toBeInTheDocument();
  });

  it('calls onComplete when form is completed', async () => {
    const user = userEvent.setup();
    render(
      <MultiStepForm
        steps={mockSteps}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
        title="Test Form"
      />
    );

    // Navigate through all steps
    const input = screen.getByTestId('test-input');
    await user.type(input, 'test value');
    (window as any).currentStepData = { testValue: 'test value' };
    
    await user.click(screen.getByText('Next'));
    await waitFor(() => {
      expect(screen.getByText('Step 2')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Next'));
    await waitFor(() => {
      expect(screen.getByText('Step 3')).toBeInTheDocument();
    });

    // Click complete
    await user.click(screen.getByText('Complete Setup'));

    expect(mockOnComplete).toHaveBeenCalledWith({
      step1: { testValue: 'test value' },
      step2: {},
      step3: {}
    });
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <MultiStepForm
        steps={mockSteps}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
        title="Test Form"
      />
    );

    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('allows clicking on completed step dots', async () => {
    const user = userEvent.setup();
    render(
      <MultiStepForm
        steps={mockSteps}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
        title="Test Form"
      />
    );

    // Complete step 1
    const input = screen.getByTestId('test-input');
    await user.type(input, 'test value');
    (window as any).currentStepData = { testValue: 'test value' };
    
    await user.click(screen.getByText('Next'));
    await waitFor(() => {
      expect(screen.getByText('Step 2')).toBeInTheDocument();
    });

    // Click on step 1 dot to go back
    const step1Dot = screen.getByText('1');
    await user.click(step1Dot);

    await waitFor(() => {
      expect(screen.getByText('Step 1')).toBeInTheDocument();
    });
  });

  it('shows checkmark for completed steps', async () => {
    const user = userEvent.setup();
    render(
      <MultiStepForm
        steps={mockSteps}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
        title="Test Form"
      />
    );

    // Complete step 1
    const input = screen.getByTestId('test-input');
    await user.type(input, 'test value');
    (window as any).currentStepData = { testValue: 'test value' };
    
    await user.click(screen.getByText('Next'));
    await waitFor(() => {
      expect(screen.getByText('Step 2')).toBeInTheDocument();
    });

    // Step 1 dot should show checkmark
    const step1Dot = screen.getByRole('button', { name: /step 1/i });
    expect(step1Dot).toHaveClass('bg-green-500');
  });

  it('handles steps without validation', async () => {
    const user = userEvent.setup();
    const stepsWithoutValidation: Step[] = [
      {
        id: 'step1',
        title: 'Step 1',
        description: 'No validation',
        component: <MockStepComponent />
      }
    ];

    render(
      <MultiStepForm
        steps={stepsWithoutValidation}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
        title="Test Form"
      />
    );

    const nextButton = screen.getByText('Next');
    await user.click(nextButton);

    expect(mockOnComplete).toHaveBeenCalled();
  });

  it('updates form data correctly', async () => {
    const user = userEvent.setup();
    render(
      <MultiStepForm
        steps={mockSteps}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
        title="Test Form"
      />
    );

    const input = screen.getByTestId('test-input');
    await user.type(input, 'test data');
    (window as any).currentStepData = { testValue: 'test data' };

    await user.click(screen.getByText('Next'));
    await waitFor(() => {
      expect(screen.getByText('Step 2')).toBeInTheDocument();
    });

    // Go back and verify data is preserved
    await user.click(screen.getByText('Previous'));
    await waitFor(() => {
      expect(screen.getByText('Step 1')).toBeInTheDocument();
    });

    expect(input).toHaveValue('test data');
  });
});
