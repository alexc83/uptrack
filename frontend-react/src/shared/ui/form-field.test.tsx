import { screen } from '@testing-library/react';
import { TextInput } from 'flowbite-react';
import { expect, it } from 'vitest';
import { FormField } from './form-field';
import { renderWithProviders } from '../../test/render-with-providers';
it('associates labels, hints and errors without form state', () => {
  renderWithProviders(<FormField label="Example" hint="Hint text" error="Error text">{attributes => <TextInput {...attributes} />}</FormField>);
  const input = screen.getByRole('textbox', { name: 'Example' });
  expect(input).toHaveAccessibleDescription('Hint text Error text');
  expect(input).toHaveAttribute('aria-invalid', 'true');
  expect(screen.getByRole('alert')).toHaveTextContent('Error text');
});
