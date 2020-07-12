import React from 'react';
import { render } from '@testing-library/react';
import App from './App';

test('renders learn react link', () => {
  const { getByText } = render(<App name="foobar" />);
  const linkElement = getByText(/foobar/i);
  expect(linkElement).toBeInTheDocument();
});
