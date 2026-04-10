import { UnitType } from "@prisma/client";
import { unitSetupLabel } from "@/lib/dashboard";

export function UnitBlueprint({
  type,
}: {
  type: UnitType;
}) {
  return (
    <div className="relative h-36 overflow-hidden rounded-[22px] border border-sky-200 bg-[#0d3b66] text-sky-100">
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(rgba(191,219,254,0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(191,219,254,0.14) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(125,211,252,0.18),transparent_35%)]" />

      {type === UnitType.HOUSE ? <HousePlan /> : null}
      {type === UnitType.MASTER_BEDROOM ? <MasterBedroomPlan /> : null}
      {type === UnitType.NORMAL_ROOM ? <NormalRoomPlan /> : null}

      <div className="absolute bottom-3 left-3 rounded-full border border-sky-200/40 bg-sky-100/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]">
        {unitSetupLabel(type)}
      </div>
    </div>
  );
}

function HousePlan() {
  return (
    <>
      <div className="absolute left-8 top-7 h-20 w-28 border border-sky-200/70" />
      <div className="absolute left-20 top-7 h-20 w-px bg-sky-200/70" />
      <div className="absolute left-8 top-[4.25rem] h-px w-28 bg-sky-200/70" />
      <div className="absolute left-12 top-11 text-[10px] uppercase tracking-[0.2em] text-sky-100/80">
        Lounge
      </div>
      <div className="absolute left-24 top-11 text-[10px] uppercase tracking-[0.2em] text-sky-100/80">
        Bed
      </div>
      <div className="absolute left-12 top-[5.25rem] text-[10px] uppercase tracking-[0.2em] text-sky-100/80">
        Kitchen
      </div>
      <div className="absolute right-8 top-9 h-16 w-10 border border-dashed border-sky-200/70" />
      <div className="absolute right-9 top-[3.75rem] text-[10px] uppercase tracking-[0.2em] text-sky-100/80">
        Yard
      </div>
    </>
  );
}

function MasterBedroomPlan() {
  return (
    <>
      <div className="absolute left-10 top-9 h-[4.5rem] w-[6.5rem] border border-sky-200/70" />
      <div className="absolute left-[4.25rem] top-[3.25rem] h-10 w-12 rounded-sm border border-sky-200/70" />
      <div className="absolute right-12 top-12 h-12 w-10 border border-dashed border-sky-200/70" />
      <div className="absolute left-12 top-11 text-[10px] uppercase tracking-[0.2em] text-sky-100/80">
        Room
      </div>
      <div className="absolute right-11 top-[3.75rem] text-[10px] uppercase tracking-[0.2em] text-sky-100/80">
        Bath
      </div>
    </>
  );
}

function NormalRoomPlan() {
  return (
    <>
      <div className="absolute left-12 top-10 h-[4.5rem] w-28 border border-sky-200/70" />
      <div className="absolute left-20 top-16 h-px w-12 bg-sky-200/70" />
      <div className="absolute left-16 top-12 text-[10px] uppercase tracking-[0.2em] text-sky-100/80">
        Room
      </div>
      <div className="absolute right-12 top-12 h-14 w-8 border border-dashed border-sky-200/50" />
    </>
  );
}
