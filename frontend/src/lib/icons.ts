import { Banknote, BookMarked, HeartPulse, IdCard, Radio } from "lucide-react";

// Plain module (not "use client") so server and client components can both use it.
export const ICONS = { medical: HeartPulse, passport: BookMarked, id: IdCard, cash: Banknote, beacon: Radio };
