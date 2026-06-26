'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useHealthData } from '@/src/state/useHealthData';
import { CycleSummary } from '@/src/components/CycleSummary';
import { InsightCard } from '@/src/components/InsightCard';
import { DailyContentCard } from '@/src/components/DailyContentCard';
import { ConceptionCard } from '@/src/components/ConceptionCard';
import { PregnancyCard } from '@/src/components/PregnancyCard';
import { PostLossCard } from '@/src/components/PostLossCard';
import { PostpartumCard } from '@/src/components/PostpartumCard';
import { topInsight } from '@/src/domain/insights/insights';
import { todayISO } from '@/src/domain/dates';

export default function HomePage() {
  const router = useRouter();
  const {
    cycles, stats, prediction, insights, dailyContent, lifeStage,
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
    <main className="mx-auto max-w-md space-y-6 p-6">
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
          today={todayISO()}
        />
      )}
      {/* Cycle insight + daily reads are cycle-stage content; hide them while
          pregnancy mode is the active context to avoid surfacing period/PMS
          material to a pregnant user. */}
      {!isPregnant && !isPostpartum && highlight && <InsightCard insight={highlight} />}
      {lifeStage === 'ttc' && (
        <ConceptionCard guidance={conceptionToday} confirmation={ovulationConfirmation} />
      )}
      {/* The reading library and daily read are cycle-stage content; in TTC,
          pregnancy, and postpartum modes each stage surfaces its own guidance,
          so we scope these out to keep off-stage material from showing. */}
      {lifeStage === 'cycle' && <DailyContentCard article={dailyContent} />}
      <nav className="grid grid-cols-2 gap-3 text-center text-sm">
        <Link href="/log" className="rounded-md bg-rose-600 px-4 py-3 text-white">
          Log today
        </Link>
        <Link href="/calendar" className="rounded-md border px-4 py-3">
          Calendar
        </Link>
        <Link href="/history" className="rounded-md border px-4 py-3">
          History
        </Link>
        <Link href="/settings" className="rounded-md border px-4 py-3">
          Settings
        </Link>
        <Link href="/insights" className="rounded-md border px-4 py-3">
          Insights
        </Link>
        {lifeStage === 'cycle' && (
          <Link href="/library" className="rounded-md border px-4 py-3">
            Library
          </Link>
        )}
        {lifeStage === 'ttc' && (
          <Link href="/fertility" className="rounded-md border px-4 py-3">
            Fertility
          </Link>
        )}
        {isPregnant && (
          <Link href="/pregnancy" className="rounded-md border px-4 py-3">
            Pregnancy
          </Link>
        )}
        {isPostpartum && (
          <Link href="/postpartum" className="rounded-md border px-4 py-3">
            Postpartum
          </Link>
        )}
      </nav>
    </main>
  );
}
