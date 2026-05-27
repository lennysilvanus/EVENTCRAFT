export interface TierPreset {
  name: string;
  description: string;
  price: number;
}

export const TICKET_PRESETS: Record<string, TierPreset[]> = {
  CONCERT: [
    { name: "General Admission", description: "Standing area, general access", price: 0 },
    { name: "VIP", description: "Reserved seating + welcome drink", price: 0 },
    { name: "VVIP (Backstage)", description: "Backstage access + meet & greet", price: 0 },
  ],
  FESTIVAL: [
    { name: "Day Pass", description: "Single day entry", price: 0 },
    { name: "Weekend Pass", description: "Full weekend access", price: 0 },
    { name: "VIP Weekend", description: "Dedicated viewing + lounge access", price: 0 },
  ],
  WEDDING: [
    { name: "Guest", description: "General ceremony & reception", price: 0 },
    { name: "VIP Table", description: "Reserved table, priority seating", price: 0 },
    { name: "Bridal Party", description: "Front table, exclusive access", price: 0 },
  ],
  CORPORATE: [
    { name: "Standard", description: "General attendance", price: 0 },
    { name: "Executive", description: "Reserved seating + networking session", price: 0 },
    { name: "Sponsor", description: "Full access + branding visibility", price: 0 },
  ],
  CONFERENCE: [
    { name: "General", description: "Main sessions access", price: 0 },
    { name: "Workshop Pass", description: "Workshops + main sessions", price: 0 },
    { name: "Full Pass", description: "All sessions, workshops & dinner", price: 0 },
  ],
  CHARITY: [
    { name: "Individual", description: "Single entry ticket", price: 0 },
    { name: "Table (8 pax)", description: "Reserved table for 8 guests", price: 0 },
    { name: "Platinum Table", description: "Premium table + recognition", price: 0 },
  ],
  BIRTHDAY: [
    { name: "Entry", description: "General party access", price: 0 },
    { name: "VIP Table", description: "Reserved table with bottle service", price: 0 },
    { name: "Host Table", description: "Seated with the birthday person", price: 0 },
  ],
  SPORTS: [
    { name: "General Stand", description: "Open terrace seating", price: 0 },
    { name: "VIP Box", description: "Covered box seating + catering", price: 0 },
    { name: "Executive Suite", description: "Private suite + premium hospitality", price: 0 },
  ],
  OTHER: [
    { name: "Regular", description: "Standard entry", price: 0 },
    { name: "VIP", description: "Priority access + reserved area", price: 0 },
    { name: "VVIP", description: "Exclusive access + premium treatment", price: 0 },
  ],
};

export function getPresetsForCategory(category: string): TierPreset[] {
  return TICKET_PRESETS[category] ?? TICKET_PRESETS.OTHER;
}
