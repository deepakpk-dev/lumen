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
import { topInsight } from '@/src/domain/insights/insights';

export default function HomePage() {
  const router = useRouter();
  const {
    today, cycles, stats, prediction, insights, dailyContent, lifeStage, dailyLogs,
    conceptionToday, ovulationConfirmation, loading,
    isPregnant, gestation, currentTrimester, daysToDue, weekContentToday,
    pregnancyProfile, postpartumProfile,
    isPostpartum, postpartumWeekNumber, recoveryStageToday, latestEpds,
  } = useHealthData();

  useEffect(() => {
    if (!loading && cycles.length === 0 && !pregnancyProfile && !postpartumProfile)
      router.replace('/onboarding');
  }, [loading, cycles.length, pregnancyProfile, postpartumProfile, router]);

  if (loading) return <main className="p-6">Loading…</main>;

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
      title="Today"
      subtitle={parseISODate(today).toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })}
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
        />
      )}
      <ReminderBanner />
      {/* Cycle insight + daily reads are cycle-stage content; hide them while
          pregnancy mode is the active context to avoid surfacing period/PMS
          material to a pregnant user. */}
      {!isPregnant && !isPostpartum && highlight && <InsightCard insight={highlight} />}
      {lifeStage === 'ttc' && (
        <ConceptionCard
          guidance={conceptionToday}
          confirmation={ovulationConfirmation}
          hasCycleHistory={stats.cycleCount > 0}
        />
      )}
      {/* The daily read is now scoped to the active life stage by the content
          engine (the feed filters by lifeStage), so each stage surfaces its own
          guidance. Renders nothing when there is no article for today. */}
      <DailyContentCard article={dailyContent} />
      <Link
        href="/log"
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 px-4 py-4 font-semibold text-white shadow-[0_12px_32px_-8px_rgba(225,29,72,0.55)] transition-all duration-200 hover:shadow-[0_16px_40px_-8px_rgba(225,29,72,0.65)] hover:brightness-105 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-950"
      >
        {dailyLogs.some((l) => l.date === today) ? '✓ Edit today’s log' : 'Log today'}
      </Link>
      <nav className="grid grid-cols-2 gap-3 text-center text-sm">
        <NavTile href="/calendar">Calendar</NavTile>
        <NavTile href="/history">History</NavTile>
        <NavTile href="/settings">Settings</NavTile>
        <NavTile href="/insights">Insights</NavTile>
        <NavTile href="/library">Library</NavTile>
        <NavTile href="/programs">Programs</NavTile>
        {lifeStage === 'ttc' && <NavTile href="/fertility">Fertility</NavTile>}
        {isPregnant && <NavTile href="/pregnancy">Pregnancy</NavTile>}
        {isPostpartum && <NavTile href="/postpartum">Postpartum</NavTile>}
      </nav>
    </PageShell>
  );
}
