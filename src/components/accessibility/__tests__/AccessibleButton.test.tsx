/**
 * AccessibleButton Tests
 * Tests for accessible button component
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AccessibleButton } from '../AccessibleButton';

describe('AccessibleButton', () => {
  it('renders with icon and label', () => {
    const { getByText } = render(<AccessibleButton icon="🌾" label="Crops" onPress={() => {}} />);

    expect(getByText('🌾')).toBeTruthy();
    expect(getByText('Crops')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByRole } = render(<AccessibleButton icon="🌾" label="Crops" onPress={onPress} />);

    fireEvent.press(getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <AccessibleButton icon="🌾" label="Crops" onPress={onPress} disabled={true} />
    );

    fireEvent.press(getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('has correct accessibility properties', () => {
    const { getByRole } = render(
      <AccessibleButton
        icon="🌾"
        label="Crops"
        onPress={() => {}}
        accessibilityLabel="View crops"
        accessibilityHint="Navigate to crops screen"
      />
    );

    const button = getByRole('button');
    expect(button.props.accessibilityLabel).toBe('View crops');
    expect(button.props.accessibilityHint).toBe('Navigate to crops screen');
  });

  it('renders different sizes correctly', () => {
    const { rerender, getByRole } = render(
      <AccessibleButton icon="🌾" label="Crops" onPress={() => {}} size="small" />
    );
    expect(getByRole('button')).toBeTruthy();

    rerender(<AccessibleButton icon="🌾" label="Crops" onPress={() => {}} size="medium" />);
    expect(getByRole('button')).toBeTruthy();

    rerender(<AccessibleButton icon="🌾" label="Crops" onPress={() => {}} size="large" />);
    expect(getByRole('button')).toBeTruthy();
  });

  it('renders different variants correctly', () => {
    const variants: Array<'primary' | 'secondary' | 'success' | 'warning' | 'danger'> = [
      'primary',
      'secondary',
      'success',
      'warning',
      'danger',
    ];

    variants.forEach((variant) => {
      const { getByRole } = render(
        <AccessibleButton icon="🌾" label="Crops" onPress={() => {}} variant={variant} />
      );
      expect(getByRole('button')).toBeTruthy();
    });
  });

  it('uses label as accessibility label when not provided', () => {
    const { getByRole } = render(<AccessibleButton icon="🌾" label="Crops" onPress={() => {}} />);

    const button = getByRole('button');
    expect(button.props.accessibilityLabel).toBe('Crops');
  });
});
