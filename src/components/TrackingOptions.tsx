import type { LifeStage, TrackingGroup } from '@/src/domain/types';
import { LumenIcon, type LumenIconName } from './LumenIcon';

const options: { key: TrackingGroup; label: string; icon: LumenIconName }[] = [
  { key: 'mood', label: 'Mood', icon: 'smile' },
  { key: 'symptoms', label: 'Symptoms', icon: 'activity' },
  { key: 'flow', label: 'Period flow', icon: 'drop' },
  { key: 'notes', label: 'Notes', icon: 'book' },
  { key: 'fertility', label: 'Fertility signals', icon: 'spark' },
];

export function trackingOptions(stage: LifeStage | 'pregnant') {
  return options.flatMap((option) => {
    if (option.key === 'fertility' && stage !== 'ttc') return [];
    if (option.key === 'flow' && (stage === 'pregnancy' || stage === 'pregnant')) return [];
    if (option.key === 'flow' && stage === 'postpartum') return [{ ...option, label: 'Recovery bleeding' }];
    return [option];
  });
}

export function TrackingOptions({ choices, selected, onChange }: {
  choices: typeof options;
  selected: TrackingGroup[];
  onChange: (value: TrackingGroup[]) => void;
}) {
  return (
    <fieldset className="setup-tracking">
      <legend className="sr-only">Prioritize fields in your daily check-in</legend>
      {choices.map(({ key, label, icon }) => (
        <label key={key} className="setup-choice">
          <span className="lumen-icon-box"><LumenIcon name={icon} size={17} /></span>
          <strong>{label}</strong>
          <input type="checkbox" className="lumen-check" checked={selected.includes(key)}
            onChange={(e) => onChange(e.target.checked ? [...selected, key] : selected.filter((item) => item !== key))} />
        </label>
      ))}
    </fieldset>
  );
}
