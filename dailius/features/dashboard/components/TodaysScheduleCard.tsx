import { CalendarIcon } from "@/components/landing/icons";
import { DashboardCard } from "./DashboardCard";
import { ScheduledBlockRow } from "@/features/planning/components/ScheduledBlockRow";
import { CommitmentRow } from "@/features/planning/components/CommitmentRow";
import type { CommitmentBlock, ScheduledBlock } from "@/features/planning/types";

export function TodaysScheduleCard({
  todaysBlocks,
  todaysCommitments,
}: {
  todaysBlocks: ScheduledBlock[];
  todaysCommitments: CommitmentBlock[];
}) {
  const hasNothing = todaysBlocks.length === 0 && todaysCommitments.length === 0;

  return (
    <DashboardCard title="Today's Schedule" icon={<CalendarIcon className="h-5 w-5 text-gray-400" />}>
      {hasNothing ? (
        <p className="text-[15px] leading-6 text-gray-600">No activities scheduled today.</p>
      ) : (
        <ul className="space-y-2">
          {[
            ...todaysBlocks.map((block) => ({ startTime: block.startTime, kind: "block" as const, block })),
            ...todaysCommitments.map((commitment) => ({
              startTime: commitment.startTime,
              kind: "commitment" as const,
              commitment,
            })),
          ]
            .sort((a, b) => a.startTime.localeCompare(b.startTime))
            .map((item) =>
              item.kind === "block" ? (
                <ScheduledBlockRow key={item.block.id} block={item.block} showRationale={false} />
              ) : (
                <CommitmentRow key={item.commitment.id} commitment={item.commitment} />
              ),
            )}
        </ul>
      )}
    </DashboardCard>
  );
}
