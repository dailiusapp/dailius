import {
  BookOpenIcon,
  BriefcaseIcon,
  DumbbellIcon,
  MusicIcon,
  SparkleIcon,
  UsersIcon,
} from "./icons";

type Block = {
  time: string;
  label: string;
  kind: "fixed" | "ai";
  icon: typeof BriefcaseIcon;
};

const WEEK: { day: string; blocks: Block[] }[] = [
  {
    day: "Mon",
    blocks: [
      { time: "9:00 AM", label: "Work", kind: "fixed", icon: BriefcaseIcon },
      { time: "6:00 PM", label: "Run", kind: "ai", icon: DumbbellIcon },
    ],
  },
  {
    day: "Tue",
    blocks: [
      { time: "9:00 AM", label: "Work", kind: "fixed", icon: BriefcaseIcon },
      { time: "6:30 PM", label: "Family dinner", kind: "fixed", icon: UsersIcon },
    ],
  },
  {
    day: "Wed",
    blocks: [
      { time: "9:00 AM", label: "Work", kind: "fixed", icon: BriefcaseIcon },
      { time: "7:30 PM", label: "Guitar", kind: "ai", icon: MusicIcon },
    ],
  },
  {
    day: "Thu",
    blocks: [
      { time: "7:00 AM", label: "Reading", kind: "ai", icon: BookOpenIcon },
      { time: "9:00 AM", label: "Work", kind: "fixed", icon: BriefcaseIcon },
    ],
  },
  {
    day: "Fri",
    blocks: [
      { time: "9:00 AM", label: "Work", kind: "fixed", icon: BriefcaseIcon },
      { time: "5:30 PM", label: "Strength", kind: "ai", icon: DumbbellIcon },
    ],
  },
  {
    day: "Sat",
    blocks: [
      { time: "8:00 AM", label: "Long ride", kind: "ai", icon: DumbbellIcon },
      { time: "1:00 PM", label: "Family time", kind: "fixed", icon: UsersIcon },
    ],
  },
  {
    day: "Sun",
    blocks: [{ time: "10:00 AM", label: "Reading", kind: "ai", icon: BookOpenIcon }],
  },
];

export function PlanMockup() {
  return (
    <div
      className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-xl shadow-gray-900/5"
      role="img"
      aria-label="Example week planned by Dailius: work blocks stay fixed each weekday, while Dailius fits a run, guitar practice, reading, strength training, a long ride, and family time around them."
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-surface px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="flex gap-1.5" aria-hidden>
            <span className="h-2.5 w-2.5 rounded-full bg-gray-200" />
            <span className="h-2.5 w-2.5 rounded-full bg-gray-200" />
            <span className="h-2.5 w-2.5 rounded-full bg-gray-200" />
          </span>
          <span className="ml-2 text-sm font-medium text-gray-500">This week</span>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full bg-navy px-3 py-1 text-xs font-semibold text-white">
          <SparkleIcon className="h-3 w-3 text-brand-from" />
          Planned by Dailius
        </span>
      </div>

      <div className="overflow-x-auto no-scrollbar">
        <div className="grid min-w-[640px] snap-x snap-mandatory grid-cols-7 gap-2.5 p-5 sm:min-w-full">
          {WEEK.map(({ day, blocks }) => (
            <div key={day} className="snap-start">
              <p className="px-1 text-xs font-semibold tracking-wide text-gray-400 uppercase">
                {day}
              </p>
              <div className="mt-2.5 flex flex-col gap-2">
                {blocks.map((block) => (
                  <div
                    key={block.label}
                    className={
                      block.kind === "fixed"
                        ? "rounded-lg border border-gray-200 bg-white p-2"
                        : "rounded-lg border border-blue-100 bg-blue-50/60 p-2"
                    }
                  >
                    <block.icon
                      className={
                        block.kind === "fixed"
                          ? "h-3.5 w-3.5 text-gray-400"
                          : "h-3.5 w-3.5 text-brand-to"
                      }
                    />
                    <p className="mt-1.5 text-[11px] leading-tight text-gray-400">
                      {block.time}
                    </p>
                    <p className="text-[12px] leading-tight font-medium text-gray-800">
                      {block.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t border-gray-100 px-5 py-3 text-xs text-gray-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full border border-gray-300 bg-white" />
          Fixed commitment
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-brand-to" />
          Scheduled by Dailius
        </span>
      </div>
    </div>
  );
}
