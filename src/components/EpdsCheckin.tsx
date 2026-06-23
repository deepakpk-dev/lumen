'use client';

import { useState } from 'react';
import { EPDS_QUESTIONS, EPDS_SOURCE, scoreEpds, type EpdsResult } from '@/src/domain/postpartum/epds';
import { useHealthData } from '@/src/state/useHealthData';

export function EpdsCheckin() {
  const { saveEpdsCheckin } = useHealthData();
  const [answers, setAnswers] = useState<(number | null)[]>(Array(10).fill(null));
  const [result, setResult] = useState<EpdsResult | null>(null);

  const complete = answers.every((a) => a !== null);

  function choose(qi: number, value: number) {
    setAnswers((prev) => {
      const next = [...prev];
      next[qi] = value;
      return next;
    });
  }

  async function submit() {
    if (!complete) return;
    const responses = answers as number[];
    const r = scoreEpds(responses);
    setResult(r);
    await saveEpdsCheckin(responses);
  }

  if (result) {
    return (
      <div className="space-y-4">
        <section className="space-y-2 rounded-md border border-neutral-200 bg-neutral-50 p-4">
          <h2 className="text-base font-semibold">Your check-in</h2>
          <p className="text-sm text-neutral-700">Score: {result.total} / 30</p>
          <p className="text-sm text-neutral-700">{result.bandText}</p>
          <p className="text-xs text-neutral-500">
            This is a screening tool, not a diagnosis. Please share your result with your
            healthcare provider.
          </p>
        </section>

        {result.riskFlag && (
          <section className="space-y-2 rounded-md border border-rose-300 bg-rose-50 p-4">
            <h3 className="text-sm font-semibold text-rose-800">Support is available</h3>
            <p className="text-sm text-neutral-700">
              You do not have to go through this alone. If you are in danger or thinking of
              harming yourself, please reach out right now.
            </p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-700">
              <li>Contact your healthcare provider as soon as you can.</li>
              <li>Call a crisis or mental-health support line in your area.</li>
              <li>If you are in immediate danger, contact your local emergency services.</li>
            </ul>
          </section>
        )}

        <p className="text-[11px] text-neutral-500">Source: {EPDS_SOURCE}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-neutral-700">
        This short check-in asks how you have felt in the past 7 days. It is a screening tool,
        not a diagnosis. Answer the option closest to how you have been feeling.
      </p>

      {EPDS_QUESTIONS.map((q, qi) => (
        <fieldset key={q.prompt} role="radiogroup" aria-label={q.prompt} className="space-y-2">
          <legend className="text-sm font-medium">{q.prompt}</legend>
          {q.options.map((o) => (
            <label key={o.label} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={`epds-${qi}`}
                value={o.value}
                checked={answers[qi] === o.value}
                onChange={() => choose(qi, o.value)}
              />
              {o.label}
            </label>
          ))}
        </fieldset>
      ))}

      <button
        type="button"
        onClick={submit}
        disabled={!complete}
        className="w-full rounded-md bg-rose-600 px-4 py-2 font-medium text-white disabled:opacity-50"
      >
        See my result
      </button>
    </div>
  );
}
