import { GymMember } from '../types';

const madridDate = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

export const isMembershipPaymentBlocked = (
  member: Pick<GymMember, 'monthlyFee' | 'paymentDueDate'> | null | undefined,
  today = madridDate(),
) => {
  if (!member?.monthlyFee || !member.paymentDueDate) return false;
  const [year, month, day] = member.paymentDueDate.slice(0, 10).split('-').map(Number);
  const dueDate = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(dueDate.getTime())
    || dueDate.getUTCFullYear() !== year
    || dueDate.getUTCMonth() !== month - 1
    || dueDate.getUTCDate() !== day) return false;
  dueDate.setUTCDate(dueDate.getUTCDate() + 5);
  return dueDate.toISOString().slice(0, 10) <= today;
};
