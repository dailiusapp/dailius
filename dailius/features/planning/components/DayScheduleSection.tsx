import { toISODate } from "@/features/planning/services/dateUtils";
import type { CommitmentBlock, ScheduledBlock } from "@/features/planning/types";
import { ScheduledBlockRow } from "./ScheduledBlockRow";
import { CommitmentRow } from "./CommitmentRow";

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat("en-US", { weekday: "long" });
const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

type ScheduleItem =
  | { startTime: string; kind: "block"; block: ScheduledBlock }
  | { startTime: string; kind: "commitment"; commitment: CommitmentBlock };

export function DayScheduleSection({
  date,
  blocks,
  commitments,
}: {
  date: Date;
  blocks: ScheduledBlock[];
  commitments: CommitmentBlock[];
}) {
  const iso = toISODate(date);
  const items: ScheduleItem[] = [
    ...blocks.map((block): ScheduleItem => ({ startTime: block.startTime, kind: "block", block })),
    ...commitments.map((commitment): ScheduleItem => ({
      startTime: commitment.startTime,
      kind: "commitment",
      commitment,
    })),
  ].sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <section
      id={`day-${iso}`}
      className="scroll-mt-24 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm target:ring-2 target:ring-brand-to target:ring-offset-2"
    >
      <h2 className="text-base font-semibold text-navy">
        {WEEKDAY_FORMATTER.format(date)} <span className="font-normal text-gray-500">{DATE_FORMATTER.format(date)}</span>
      </h2>

      <div className="mt-4">
        {items.length === 0 ? (
          <p className="text-[15px] leading-6 text-gray-600">Rest day.</p>
        ) : (
          <ul className="space-y-3">
            {items.map((item) =>
              item.kind === "block" ? (
                <ScheduledBlockRow key={item.block.id} block={item.block} />
              ) : (
                <CommitmentRow key={item.commitment.id} commitment={item.commitment} />
              ),
            )}
          </ul>
        )}
      </div>
    </section>
  );
}
