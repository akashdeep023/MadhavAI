/**
 * StatusIndicator Tests
 * Tests for status indicator component
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { StatusIndicator } from '../StatusIndicator';

describe('StatusIndicator', () => {
  it('renders success status correctly', () => {
    const { getByText } = render(<StatusIndicator type="success" message="Crop is healthy" />);

    expect(getByText('✅')).toBeTruthy();
    expect(getByText('Crop is healthy')).toBeTruthy();
  });

  it('renders warning status correctly', () => {
    const { getByText } = render(<StatusIndicator type="warning" message="Low soil moisture" />);

    expect(getByText('⚠️')).toBeTruthy();
    expect(getByText('Low soil moisture')).toBeTruthy();
  });

  it('renders danger status correctly', () => {
    const { getByText } = render(<StatusIndicator type="danger" message="Pest detected" />);

    expect(getByText('❌')).toBeTruthy();
    expect(getByText('Pest detected')).toBeTruthy();
  });

  it('renders info status correctly', () => {
    const { getByText } = render(
      <StatusIndicator type="info" message="Weather update available" />
    );

    expect(getByText('ℹ️')).toBeTruthy();
    expect(getByText('Weather update available')).toBeTruthy();
  });

  it('renders neutral status correctly', () => {
    const { getByText } = render(<StatusIndicator type="neutral" message="No updates" />);

    expect(getByText('⚪')).toBeTruthy();
    expect(getByText('No updates')).toBeTruthy();
  });

  it('uses custom icon when provided', () => {
    const { getByText } = render(
      <StatusIndicator type="success" message="Custom icon" icon="🌟" />
    );

    expect(getByText('🌟')).toBeTruthy();
    expect(getByText('Custom icon')).toBeTruthy();
  });

  it('renders different sizes correctly', () => {
    const { rerender, getByText } = render(
      <StatusIndicator type="success" message="Test" size="small" />
    );
    expect(getByText('Test')).toBeTruthy();

    rerender(<StatusIndicator type="success" message="Test" size="medium" />);
    expect(getByText('Test')).toBeTruthy();

    rerender(<StatusIndicator type="success" message="Test" size="large" />);
    expect(getByText('Test')).toBeTruthy();
  });

  it('has correct accessibility properties', () => {
    const { UNSAFE_getByProps } = render(
      <StatusIndicator type="warning" message="Test message" accessibilityLabel="Custom warning" />
    );

    const alert = UNSAFE_getByProps({ accessibilityRole: 'alert' });
    expect(alert.props.accessibilityLabel).toBe('Custom warning');
  });

  it('generates default accessibility label', () => {
    const { UNSAFE_getByProps } = render(<StatusIndicator type="success" message="All good" />);

    const alert = UNSAFE_getByProps({ accessibilityRole: 'alert' });
    expect(alert.props.accessibilityLabel).toBe('success: All good');
  });
});
