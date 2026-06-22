import type { DueDateSource, ISODate, PregnancyProfile } from '@/src/domain/types';
import { eddFromLmp, lmpFromEdd } from './gestation';

export interface StartPregnancyInput {
  today: ISODate;
  dueDate?: ISODate;
  lmp?: ISODate;
  averageCycleLength?: number;
  source?: DueDateSource;
}

export function startPregnancy(input: StartPregnancyInput): PregnancyProfile {
  let dueDate: ISODate;
  let lmp: ISODate;
  let source: DueDateSource;

  if (input.dueDate) {
    dueDate = input.dueDate;
    lmp = lmpFromEdd(dueDate);
    source = input.source ?? 'manual';
  } else if (input.lmp) {
    lmp = input.lmp;
    dueDate = eddFromLmp(lmp, { averageCycleLength: input.averageCycleLength });
    source = input.source ?? 'lmp';
  } else {
    throw new Error('startPregnancy requires either dueDate or lmp');
  }

  return {
    id: 'current',
    dueDate,
    lmp,
    dueDateSource: source,
    startedAt: input.today,
    status: 'active',
  };
}

export function editDueDate(
  profile: PregnancyProfile,
  dueDate: ISODate,
  source: DueDateSource,
): PregnancyProfile {
  return { ...profile, dueDate, lmp: lmpFromEdd(dueDate), dueDateSource: source };
}

export function endByBirth(
  profile: PregnancyProfile,
  endDate: ISODate,
): PregnancyProfile {
  return { ...profile, status: 'ended', endReason: 'birth', endDate };
}

export function endByLoss(
  profile: PregnancyProfile,
  endDate: ISODate,
): PregnancyProfile {
  return { ...profile, status: 'ended', endReason: 'loss', endDate };
}
