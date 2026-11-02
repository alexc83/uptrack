import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, type FieldErrors, type ResolverOptions } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  name: z.string().trim().min(1, 'Name required').max(5, 'Name too long'),
  password: z.string().min(8, 'Password too short'),
  nested: z.object({ code: z.string().min(2, 'Code too short') }).optional(),
});

type Input = z.input<typeof schema>;
type Output = z.output<typeof schema>;

const options = (overrides: Partial<ResolverOptions<Input>> = {}) =>
  ({ fields: {}, criteriaMode: 'firstError', shouldUseNativeValidation: false, ...overrides }) as ResolverOptions<Input>;

describe('zodResolver with Zod 4 (M06 compatibility gate)', () => {
  it('returns parsed values and no errors for valid input', async () => {
    const result = await zodResolver(schema)({ name: '  Ada ', password: '12345678' }, undefined, options());
    expect(result.errors).toEqual({});
    expect(result.values).toMatchObject({ name: 'Ada', password: '12345678' });
  });

  it('returns field errors (does not reject) for invalid input', async () => {
    const result = await zodResolver(schema)({ name: '', password: '1' }, undefined, options());
    const errors = result.errors as FieldErrors<Input>;
    expect(errors.name?.message).toBe('Name required');
    expect(errors.password?.message).toBe('Password too short');
    expect(errors.name?.type).toBeTruthy();
    expect(result.values).toEqual({});
  });

  it('maps nested paths', async () => {
    const result = await zodResolver(schema)({ name: 'a', password: '12345678', nested: { code: 'x' } }, undefined, options());
    expect((result.errors as FieldErrors<Input>).nested?.code?.message).toBe('Code too short');
  });

  it('collects all criteria when criteriaMode is all', async () => {
    const multi = z.object({ password: z.string().min(8, 'short').regex(/\d/, 'digit') });
    const result = await zodResolver(multi)({ password: 'a' }, undefined, { fields: {}, criteriaMode: 'all', shouldUseNativeValidation: false } as never);
    const errors = result.errors as FieldErrors<{ password: string }>;
    expect(Object.keys(errors.password?.types ?? {}).length).toBe(2);
  });

  it('supports async refinements (async resolver path)', async () => {
    const asyncSchema = z.object({ name: z.string() }).refine(async (v) => { await Promise.resolve(); return v.name !== 'taken'; }, { message: 'Name taken', path: ['name'] });
    const bad = await zodResolver(asyncSchema)({ name: 'taken' }, undefined, options() as never);
    expect((bad.errors as FieldErrors<{ name: string }>).name?.message).toBe('Name taken');
    const good = await zodResolver(asyncSchema)({ name: 'free' }, undefined, options() as never);
    expect(good.errors).toEqual({});
    expect(good.values).toEqual({ name: 'free' });
  });

  it('rethrows non-Zod errors', async () => {
    const boom = z.object({ a: z.string() }).refine(() => { throw new Error('boom'); });
    await expect(zodResolver(boom)({ a: 'x' }, undefined, options() as never)).rejects.toThrow('boom');
  });

  it('infers input and output types', () => {
    expectTypeOf<Input['name']>().toEqualTypeOf<string>();
    expectTypeOf<Output['password']>().toEqualTypeOf<string>();
  });

  it('drives a real React Hook Form: invalid submit shows errors, no uncaught rejection', async () => {
    const onValid = vi.fn();
    const onInvalid = vi.fn();
    const rejections: unknown[] = [];
    const handler = (e: unknown) => rejections.push(e);
    process.on('unhandledRejection', handler);

    function Harness() {
      const { register, handleSubmit, formState: { errors } } = useForm<Input, unknown, Output>({ resolver: zodResolver(schema), mode: 'onSubmit' });
      return (
        <form onSubmit={(e) => void handleSubmit(onValid, onInvalid)(e)}>
          <input aria-label="name" {...register('name')} />
          <input aria-label="password" {...register('password')} />
          {errors.name && <p role="alert">{errors.name.message}</p>}
          {errors.password && <p role="alert">{errors.password.message}</p>}
          <button type="submit">go</button>
        </form>
      );
    }
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'go' }));
    expect(await screen.findByText('Name required')).toBeInTheDocument();
    expect(screen.getByText('Password too short')).toBeInTheDocument();
    expect(onInvalid).toHaveBeenCalledTimes(1);
    expect(onValid).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('name'), '  Ada ');
    await user.type(screen.getByLabelText('password'), '12345678');
    await user.click(screen.getByRole('button', { name: 'go' }));
    await vi.waitFor(() => expect(onValid).toHaveBeenCalledTimes(1));
    expect(onValid.mock.calls[0]?.[0]).toMatchObject({ name: 'Ada', password: '12345678' });
    await new Promise((r) => setTimeout(r, 0));
    process.off('unhandledRejection', handler);
    expect(rejections).toEqual([]);
  });
});
