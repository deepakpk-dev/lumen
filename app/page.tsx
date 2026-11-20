'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useHealthData } from '@/src/state/useHealthData';
import { PageShell, NavTile } from '@/src/components/PageShell';
import { CycleSummary } from '@/src/components/CycleSummary';
import { parseISODate } from '@/src/domain/dates';
import { ReminderBanner } from '@/src/components/ReminderBanner';
import { InsightCard } from '@/src/components/InsightCard';
import { DailyContentCard } from '@/src/components/DailyContentCard';
import { ConceptionCard } from '@/src/components/ConceptionCard';
import { PregnancyCard } from '@/src/components/PregnancyCard';
import { PostLossCard } from '@/src/components/PostLossCard';
import { PostpartumCard } from '@/src/components/PostpartumCard';
import { LumenIcon } from '@/src/components/LumenIcon';
import { MOOD_OPTIONS } from '@/src/domain/log-options';
import { topInsight } from '@/src/domain/insights/insights';

const stageLabel = {
  cycle: 'Cycle tracking', ttc: 'Trying to conceive', pregnancy: 'Pregnancy',
  postpartum: 'Postpartum recovery', menopause: 'Perimenopause',
};

export default function HomePage() {
  const router = useRouter();
  const {
    today, cycles, stats, prediction, insights, dailyContent, lifeStage, dailyLogs,
    conceptionToday, ovulationConfirmation, loading,
    isPregnant, gestation, currentTrimester, daysToDue, weekContentToday,
    pregnancyProfile, postpartumProfile,
    isPostpartum, postpartumWeekNumber, recoveryStageToday, latestEpds,
    onboardingComplete, personalization, setDraftMood,
  } = useHealthData();

  const needsOnboarding = !onboardingComplete && cycles.length === 0 && !pregnancyProfile && !postpartumProfile;
  useEffect(() => {
    if (!loading && needsOnboarding) router.replace('/onboarding');
  }, [loading, needsOnboarding, router]);

  if (loading || needsOnboarding) return <main className="lumen-page" aria-busy="true">Loading…</main>;

  const lastPeriodStart = cycles.at(-1)?.startDate ?? null;
  const highlight = topInsight(insights);

  const endedByLoss =
    !isPregnant &&
    pregnancyProfile?.status === 'ended' &&
    pregnancyProfile?.endReason === 'loss' &&
    cycles.length === 0;

  return (
    <PageShell
      backHref={null}
      title={personalization?.preferredName ? <>Welcome back,<br />{personalization.preferredName}.</> : 'Today'}
      eyebrow={parseISODate(today).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
      subtitle={endedByLoss ? undefined : 'Here’s a gentle look at your day.'}
      action={endedByLoss ? undefined : (
        <Link href="/profile" className="lumen-badge" aria-label={`${stageLabel[lifeStage]} preferences`}><LumenIcon name="heart" size={14} />{stageLabel[lifeStage]}</Link>
      )}
    >
      {isPostpartum && postpartumWeekNumber !== null && recoveryStageToday ? (
        <PostpartumCard
          week={postpartumWeekNumber}
          stage={recoveryStageToday}
          latestBand={latestEpds?.band ?? null}
        />
      ) : isPregnant && gestation && currentTrimester && daysToDue !== null && weekContentToday ? (
        <PregnancyCard
          gestation={gestation}
          trimester={currentTrimester}
          daysToDue={daysToDue}
          week={weekContentToday}
        />
      ) : endedByLoss ? (
        <PostLossCard />
      ) : (
        <CycleSummary
          prediction={prediction}
          stats={stats}
          lastPeriodStart={lastPeriodStart}
          today={today}
          showPhase={lifeStage !== 'menopause'}
        />
      )}
      {lifeStage === 'menopause' && (
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Cycles often become irregular in perimenopause — predictions carry extra uncertainty.
        </p>
      )}
      {!endedByLoss && <ReminderBanner />}
      {lifeStage === 'ttc' && (
        <ConceptionCard
          guidance={conceptionToday}
          confirmation={ovulationConfirmation}
          hasCycleHistory={stats.cycleCount > 0}
          estimatedCycleLength={stats.averageCycleLength}
        />
      )}
      <section className="lumen-card lumen-checkin-card">
        <h2 className="lumen-editorial-title">A moment for you</h2>
        <p className="lumen-subtitle">{dailyLogs.some((log) => log.date === today) ? 'Your check-in is here whenever you want to revisit it.' : 'How are you feeling today?'}</p>
        {!isPregnant && !isPostpartum && !endedByLoss && lifeStage !== 'menopause' && (
          <div className="lumen-quick-moods" aria-label="Start a check-in with a mood" role="group">
            {MOOD_OPTIONS.filter((mood) => ['Calm', 'Happy', 'Anxious', 'Energetic'].includes(mood)).map((mood) => (
              <button key={mood} type="button" className="lumen-chip" onClick={() => {
                setDraftMood({ date: today, mood });
                router.push('/log');
              }}>{mood}</button>
            ))}
          </div>
        )}
        <Link href="/log" className="lumen-button mt-4 w-full">
          {dailyLogs.some((log) => log.date === today) ? 'Edit today’s log' : 'Log today'}
          <LumenIcon name="arrow" size={17} />
        </Link>
      </section>
      {!isPregnant && !isPostpartum && !endedByLoss && highlight && <InsightCard insight={highlight} />}
      {/* The provider picks a stage-specific read. Skip it on the loss path. */}
      {!endedByLoss && <DailyContentCard article={dailyContent} />}
      <div className="grid grid-cols-2 gap-2">
        {lifeStage === 'ttc' && <NavTile href="/fertility">Fertility</NavTile>}
        {isPregnant && <NavTile href="/pregnancy">Pregnancy</NavTile>}
        {isPostpartum && <NavTile href="/postpartum">Postpartum</NavTile>}
        <NavTile href="/programs">Programs</NavTile>
        {!isPregnant && !isPostpartum && <NavTile href="/history">History</NavTile>}
        <NavTile href="/settings">Settings</NavTile>
      </div>
    </PageShell>
  );
}
