import { UnitType } from "@prisma/client";
import {
  Bath,
  BedDouble,
  Building2,
  CalendarClock,
  DoorClosed,
  Home,
} from "lucide-react";
import { unitUseLabel } from "@/lib/dashboard";

export function UnitFacts({
  type,
  propertyName,
  floorLabel,
  finalLabel,
  finalIcon,
}: {
  type: UnitType;
  propertyName: string;
  floorLabel?: string | null;
  finalLabel: string;
  finalIcon?: React.ComponentType<{ className?: string }>;
}) {
  const TypeIcon =
    type === UnitType.HOUSE ? Home : type === UnitType.MASTER_BEDROOM ? Bath : DoorClosed;
  const FinalIcon = finalIcon ?? CalendarClock;

  return (
    <div className="mt-4 grid gap-2">
      <Fact icon={Building2} text={propertyName} />
      <Fact icon={TypeIcon} text={unitUseLabel(type)} />
      <Fact icon={type === UnitType.MASTER_BEDROOM ? Bath : BedDouble} text={floorLabel || "Layout ready"} />
      <Fact icon={FinalIcon} text={finalLabel} />
    </div>
  );
}

function Fact({
  icon: Icon,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
      <div className="rounded-xl bg-white p-2 text-sky-700 shadow-sm">
        <Icon className="size-4" />
      </div>
      <span className="font-medium">{text}</span>
    </div>
  );
}
