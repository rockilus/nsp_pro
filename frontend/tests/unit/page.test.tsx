import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

function Dummy() {
  return <div>Hello from Dummy Component</div>;
}

describe('Dummy component', () => {
  it('renders the text', () => {
    render(<Dummy />);
    const el = screen.getByText('Hello from Dummy Component');
    expect(el).toBeTruthy();
  });
});
