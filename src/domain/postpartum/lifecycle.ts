import type {
  ISODate,
  PostpartumProfile,
  PostpartumReturnTo,
} from '@/src/domain/types';

export function startPostpartum(input: {
  birthDate: ISODate;
  today: ISODate;
  breastfeeding?: boolean;
}): PostpartumProfile {
  return {
    id: 'current',
    birthDate: input.birthDate,
    startedAt: input.today,
    breastfeeding: input.breastfeeding,
    status: 'active',
  };
}

export function setBreastfeeding(p: PostpartumProfile, value: boolean): PostpartumProfile {
  return { ...p, breastfeeding: value };
}

export function editBirthDate(p: PostpartumProfile, birthDate: ISODate): PostpartumProfile {
  return { ...p, birthDate };
}

export function endPostpartum(
  p: PostpartumProfile,
  opts: { returnTo: PostpartumReturnTo; endDate: ISODate },
): PostpartumProfile {
  return { ...p, status: 'ended', returnedTo: opts.returnTo, endDate: opts.endDate };
}
