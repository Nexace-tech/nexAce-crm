export interface DefaultHolidayDefinition {
  title: string;
  date: string; // "YYYY-MM-DD"
  type: "Mandatory" | "Restricted" | "Company";
  category: "National" | "Religious" | "Cultural" | "Corporate";
  description?: string;
  isHalfDay?: boolean;
}

export const DEFAULT_HOLIDAYS_IN_2025: DefaultHolidayDefinition[] = [
  { title: "New Year's Day", date: "2025-01-01", type: "Restricted", category: "Cultural", description: "First day of the Gregorian year" },
  { title: "Makar Sankranti / Pongal", date: "2025-01-14", type: "Restricted", category: "Cultural", description: "Harvest Festival" },
  { title: "Republic Day", date: "2025-01-26", type: "Mandatory", category: "National", description: "Constitution of India came into effect" },
  { title: "Maha Shivratri", date: "2025-02-26", type: "Restricted", category: "Religious", description: "Night of Lord Shiva" },
  { title: "Holi", date: "2025-03-14", type: "Mandatory", category: "Cultural", description: "Festival of Colors" },
  { title: "Id-ul-Fitr (Ramzan Eid)", date: "2025-03-31", type: "Mandatory", category: "Religious", description: "Celebration marking the end of Ramadan" },
  { title: "Mahavir Jayanti", date: "2025-04-10", type: "Restricted", category: "Religious", description: "Birth anniversary of Lord Mahavira" },
  { title: "Good Friday", date: "2025-04-18", type: "Mandatory", category: "Religious", description: "Crucifixion of Jesus Christ" },
  { title: "Buddha Purnima", date: "2025-05-12", type: "Mandatory", category: "Religious", description: "Birth of Gautama Buddha" },
  { title: "Bakrid / Id-ul-Zuha", date: "2025-06-07", type: "Mandatory", category: "Religious", description: "Feast of the Sacrifice" },
  { title: "Muharram", date: "2025-07-06", type: "Restricted", category: "Religious", description: "Islamic New Year observance" },
  { title: "Independence Day", date: "2025-08-15", type: "Mandatory", category: "National", description: "Indian Independence from British Rule" },
  { title: "Janmashtami", date: "2025-08-16", type: "Restricted", category: "Religious", description: "Birth of Lord Krishna" },
  { title: "Ganesh Chaturthi", date: "2025-08-27", type: "Restricted", category: "Cultural", description: "Arrival of Lord Ganesha" },
  { title: "Milad-un-Nabi", date: "2025-09-05", type: "Restricted", category: "Religious", description: "Prophet Muhammad's Birthday" },
  { title: "Mahatma Gandhi's Birthday", date: "2025-10-02", type: "Mandatory", category: "National", description: "National Father's Birthday observance" },
  { title: "Dussehra (Vijayadashami)", date: "2025-10-02", type: "Mandatory", category: "Cultural", description: "Victory of good over evil" },
  { title: "Diwali (Deepavali)", date: "2025-10-20", type: "Mandatory", category: "Cultural", description: "Festival of Lights" },
  { title: "Govardhan Puja", date: "2025-10-22", type: "Restricted", category: "Religious", description: "Post-Diwali celebration" },
  { title: "Bhai Dooj", date: "2025-10-23", type: "Restricted", category: "Cultural", description: "Sibling bonding festival" },
  { title: "Guru Nanak's Birthday", date: "2025-11-05", type: "Mandatory", category: "Religious", description: "Prakash Parv of Guru Nanak Dev Ji" },
  { title: "Christmas Day", date: "2025-12-25", type: "Mandatory", category: "Religious", description: "Birth of Jesus Christ" },
];

export const DEFAULT_HOLIDAYS_IN_2026: DefaultHolidayDefinition[] = [
  { title: "New Year's Day", date: "2026-01-01", type: "Restricted", category: "Cultural", description: "First day of the Gregorian year" },
  { title: "Makar Sankranti / Pongal", date: "2026-01-14", type: "Restricted", category: "Cultural", description: "Harvest Festival" },
  { title: "Republic Day", date: "2026-01-26", type: "Mandatory", category: "National", description: "Constitution of India came into effect (Long Weekend)" },
  { title: "Maha Shivratri", date: "2026-02-15", type: "Restricted", category: "Religious", description: "Night of Lord Shiva" },
  { title: "Holi", date: "2026-03-04", type: "Mandatory", category: "Cultural", description: "Festival of Colors" },
  { title: "Id-ul-Fitr (Ramzan Eid)", date: "2026-03-20", type: "Mandatory", category: "Religious", description: "Celebration marking the end of Ramadan (Long Weekend)" },
  { title: "Mahavir Jayanti", date: "2026-03-31", type: "Restricted", category: "Religious", description: "Birth anniversary of Lord Mahavira" },
  { title: "Good Friday", date: "2026-04-03", type: "Mandatory", category: "Religious", description: "Crucifixion of Jesus Christ (Long Weekend)" },
  { title: "Buddha Purnima / May Day", date: "2026-05-01", type: "Mandatory", category: "Religious", description: "Birth of Gautama Buddha & International Workers Day (Long Weekend)" },
  { title: "Bakrid / Id-ul-Zuha", date: "2026-05-27", type: "Mandatory", category: "Religious", description: "Feast of the Sacrifice" },
  { title: "Muharram", date: "2026-06-26", type: "Restricted", category: "Religious", description: "Islamic New Year observance (Long Weekend)" },
  { title: "Independence Day", date: "2026-08-15", type: "Mandatory", category: "National", description: "79th Indian Independence Day celebration" },
  { title: "Raksha Bandhan", date: "2026-08-28", type: "Restricted", category: "Cultural", description: "Festival of brother-sister bond (Long Weekend)" },
  { title: "Janmashtami", date: "2026-09-04", type: "Restricted", category: "Religious", description: "Birth of Lord Krishna (Long Weekend)" },
  { title: "Milad-un-Nabi", date: "2026-09-25", type: "Restricted", category: "Religious", description: "Prophet Muhammad's Birthday (Long Weekend)" },
  { title: "Mahatma Gandhi's Birthday", date: "2026-10-02", type: "Mandatory", category: "National", description: "Gandhi Jayanti (Long Weekend)" },
  { title: "Dussehra (Vijayadashami)", date: "2026-10-20", type: "Mandatory", category: "Cultural", description: "Victory of good over evil" },
  { title: "Diwali (Deepavali)", date: "2026-11-08", type: "Mandatory", category: "Cultural", description: "Festival of Lights" },
  { title: "Govardhan Puja", date: "2026-11-09", type: "Restricted", category: "Religious", description: "Post-Diwali celebration" },
  { title: "Bhai Dooj", date: "2026-11-11", type: "Restricted", category: "Cultural", description: "Sibling bonding festival" },
  { title: "Guru Nanak's Birthday", date: "2026-11-24", type: "Mandatory", category: "Religious", description: "Prakash Parv of Guru Nanak Dev Ji" },
  { title: "Christmas Day", date: "2026-12-25", type: "Mandatory", category: "Religious", description: "Birth of Jesus Christ (Long Weekend)" },
];

export const DEFAULT_HOLIDAYS_US_2025: DefaultHolidayDefinition[] = [
  { title: "New Year's Day", date: "2025-01-01", type: "Mandatory", category: "National", description: "Federal Holiday" },
  { title: "Martin Luther King Jr. Day", date: "2025-01-20", type: "Mandatory", category: "National", description: "Federal Holiday (Long Weekend)" },
  { title: "Washington's Birthday (Presidents' Day)", date: "2025-02-17", type: "Mandatory", category: "National", description: "Federal Holiday (Long Weekend)" },
  { title: "Memorial Day", date: "2025-05-26", type: "Mandatory", category: "National", description: "Honoring military personnel (Long Weekend)" },
  { title: "Juneteenth National Independence Day", date: "2025-06-19", type: "Mandatory", category: "National", description: "Federal Holiday" },
  { title: "Independence Day", date: "2025-07-04", type: "Mandatory", category: "National", description: "US Independence Day (Long Weekend)" },
  { title: "Labor Day", date: "2025-09-01", type: "Mandatory", category: "National", description: "Worker appreciation holiday (Long Weekend)" },
  { title: "Columbus Day / Indigenous Peoples' Day", date: "2025-10-13", type: "Mandatory", category: "National", description: "Federal Holiday (Long Weekend)" },
  { title: "Veterans Day", date: "2025-11-11", type: "Mandatory", category: "National", description: "Honoring military veterans" },
  { title: "Thanksgiving Day", date: "2025-11-27", type: "Mandatory", category: "National", description: "National Thanksgiving Day" },
  { title: "Day After Thanksgiving (Black Friday)", date: "2025-11-28", type: "Company", category: "Corporate", description: "Company Holiday (Long Weekend)" },
  { title: "Christmas Day", date: "2025-12-25", type: "Mandatory", category: "National", description: "Federal Holiday" },
];

export const DEFAULT_HOLIDAYS_US_2026: DefaultHolidayDefinition[] = [
  { title: "New Year's Day", date: "2026-01-01", type: "Mandatory", category: "National", description: "Federal Holiday" },
  { title: "Martin Luther King Jr. Day", date: "2026-01-19", type: "Mandatory", category: "National", description: "Federal Holiday (Long Weekend)" },
  { title: "Washington's Birthday (Presidents' Day)", date: "2026-02-16", type: "Mandatory", category: "National", description: "Federal Holiday (Long Weekend)" },
  { title: "Memorial Day", date: "2026-05-25", type: "Mandatory", category: "National", description: "Honoring military personnel (Long Weekend)" },
  { title: "Juneteenth National Independence Day", date: "2026-06-19", type: "Mandatory", category: "National", description: "Federal Holiday (Long Weekend)" },
  { title: "Independence Day", date: "2026-07-03", type: "Mandatory", category: "National", description: "Observed US Independence Day (Long Weekend)" },
  { title: "Labor Day", date: "2026-09-07", type: "Mandatory", category: "National", description: "Worker appreciation holiday (Long Weekend)" },
  { title: "Columbus Day / Indigenous Peoples' Day", date: "2026-10-12", type: "Mandatory", category: "National", description: "Federal Holiday (Long Weekend)" },
  { title: "Veterans Day", date: "2026-11-11", type: "Mandatory", category: "National", description: "Honoring military veterans" },
  { title: "Thanksgiving Day", date: "2026-11-26", type: "Mandatory", category: "National", description: "National Thanksgiving Day" },
  { title: "Day After Thanksgiving (Black Friday)", date: "2026-11-27", type: "Company", category: "Corporate", description: "Company Holiday (Long Weekend)" },
  { title: "Christmas Day", date: "2026-12-25", type: "Mandatory", category: "National", description: "Federal Holiday (Long Weekend)" },
];

export function getPresetHolidays(country: "IN" | "US", year: number): DefaultHolidayDefinition[] {
  let base: DefaultHolidayDefinition[];
  if (country === "US") {
    base = year === 2025 ? DEFAULT_HOLIDAYS_US_2025 : DEFAULT_HOLIDAYS_US_2026;
  } else {
    base = year === 2025 ? DEFAULT_HOLIDAYS_IN_2025 : DEFAULT_HOLIDAYS_IN_2026;
  }

  return base.map((h) => ({
    ...h,
    date: h.date.replace(/^\d{4}/, String(year)),
  }));
}
