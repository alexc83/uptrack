import { z } from 'zod';

const required = 'This field is required.';
function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export const credentialSchema = z.object({
  name: z.string().trim().min(1, required).max(180, 'Use 180 characters or fewer.'),
  type: z.enum(['LICENSE', 'CERTIFICATION'], { error: 'Select a credential type.' }),
  issuingOrganization: z.string().trim().min(1, required).max(180, 'Use 180 characters or fewer.'),
  expirationDate: z.string().min(1, required).refine(validDate, 'Enter a valid expiration date.'),
  renewalCycleMonths: z.number({ error: 'Enter a renewal cycle.' }).int('Use a whole number of months.').min(1, 'Renewal cycle must be at least 1 month.'),
  requiredCEHours: z.number({ error: 'Enter required CE hours.' }).min(0, 'Value cannot be negative.').max(999.99, 'Use 999.99 hours or fewer.')
    .refine(value => Number(value.toFixed(2)) === value, 'Use no more than two decimal places.'),
});
