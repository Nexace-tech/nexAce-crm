/**
 * Date and celebration utilities for the Employee Celebrations Engine.
 * Supports Birthdays (dob) and Work Anniversaries (joinDate).
 *
 * PRIVACY GUARANTEE:
 * Age and birth year are NEVER calculated or exposed for birthdays.
 * Only Month and Day are matched to celebrate the occasion.
 */

export interface CelebrationPerson {
  _id: string;
  name: string;
  photoUrl?: string;
  department?: string;
  role?: string;
  phone?: string;
  dob?: Date | string;
  joinDate?: Date | string;
  preferences?: {
    showBirthdayOnDashboard?: boolean;
    showAnniversaryOnDashboard?: boolean;
    receiveBirthdayEmails?: boolean;
  };
}

export interface CelebrationItem {
  userId: string;
  name: string;
  photoUrl?: string;
  department: string;
  role: string;
  phone?: string;
  type: "birthday" | "anniversary";
  celebrationDate: string; // ISO string for the occurrence this year
  displayDate: string;     // e.g. "Today!", "Tomorrow", "Oct 25"
  daysRemaining: number;   // 0 = today, 1 = tomorrow, etc.
  dayOfWeek: string;       // e.g. "Friday"
  isWeekend: boolean;      // Saturday or Sunday
  milestoneText?: string;  // For anniversaries only (e.g. "2nd Year Milestone", "5 Years Veteran")
  milestoneYears?: number; // Completed years
}

/**
 * Normalizes any Date or ISO string to month (1-12) and day (1-31).
 */
export function getMonthAndDay(dateInput?: Date | string | null): { month: number; day: number } | null {
  if (!dateInput) return null;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  return {
    month: d.getMonth() + 1, // 1 - 12
    day: d.getDate(),        // 1 - 31
  };
}

/**
 * Checks if a given year is a leap year.
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Computes this year's occurrence date for an annual event (like birthday or joining anniversary).
 * Handles Feb 29 on non-leap years by falling back to Feb 28.
 */
export function getOccurrenceDate(month: number, day: number, targetYear: number): Date {
  let adjustedDay = day;
  if (month === 2 && day === 29 && !isLeapYear(targetYear)) {
    adjustedDay = 28;
  }
  return new Date(targetYear, month - 1, adjustedDay, 0, 0, 0, 0);
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const DAY_NAMES = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
];

/**
 * Formats display string for celebration badge.
 */
export function formatCelebrationDay(daysRemaining: number, occurrenceDate: Date): string {
  if (daysRemaining === 0) return "Today!";
  if (daysRemaining === 1) return "Tomorrow";
  if (daysRemaining <= 7) return `In ${daysRemaining} days (${DAY_NAMES[occurrenceDate.getDay()]})`;
  return `${MONTH_NAMES[occurrenceDate.getMonth()]} ${occurrenceDate.getDate()}`;
}

/**
 * Returns milestone text for Work Anniversary based on completed years.
 */
export function getAnniversaryMilestone(yearsCompleted: number): string {
  if (yearsCompleted <= 0) return "New Joiner";
  if (yearsCompleted === 1) return "1st Year Anniversary";
  if (yearsCompleted === 2) return "2nd Year Milestone";
  if (yearsCompleted === 3) return "3rd Year Milestone";
  if (yearsCompleted >= 5) return `${yearsCompleted} Years Veteran`;
  return `${yearsCompleted} Years Milestone`;
}

/**
 * Evaluates celebrations (birthdays or anniversaries) for a collection of users
 * within a forward window (default 14 days).
 */
export function evaluateCelebrations(
  users: CelebrationPerson[],
  type: "birthday" | "anniversary",
  windowDays: number = 14,
  referenceDate: Date = new Date()
): {
  today: CelebrationItem[];
  upcoming: CelebrationItem[];
} {
  const refYear = referenceDate.getFullYear();
  const refStartOfDay = new Date(refYear, referenceDate.getMonth(), referenceDate.getDate(), 0, 0, 0, 0);

  const todayList: CelebrationItem[] = [];
  const upcomingList: CelebrationItem[] = [];

  for (const user of users) {
    // Check opt-out preferences
    if (type === "birthday" && user.preferences?.showBirthdayOnDashboard === false) {
      continue;
    }
    if (type === "anniversary" && user.preferences?.showAnniversaryOnDashboard === false) {
      continue;
    }

    const rawDate = type === "birthday" ? user.dob : user.joinDate;
    const md = getMonthAndDay(rawDate);
    if (!md) continue;

    // For work anniversaries, we must verify that the user didn't join this year
    let milestoneYears: number | undefined;
    let milestoneText: string | undefined;

    if (type === "anniversary") {
      const origDate = new Date(rawDate!);
      const joinYear = origDate.getFullYear();
      milestoneYears = refYear - joinYear;
      if (milestoneYears < 1) {
        // Less than 1 full year, not yet a 1-year anniversary
        continue;
      }
      milestoneText = getAnniversaryMilestone(milestoneYears);
    }

    // Try occurrence in current year, or next year if occurrence already passed earlier this year
    let occurrence = getOccurrenceDate(md.month, md.day, refYear);
    let diffMs = occurrence.getTime() - refStartOfDay.getTime();
    let diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      // Already passed this year, check next year
      occurrence = getOccurrenceDate(md.month, md.day, refYear + 1);
      diffMs = occurrence.getTime() - refStartOfDay.getTime();
      diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    }

    const dayOfWeek = DAY_NAMES[occurrence.getDay()];
    const isWeekend = occurrence.getDay() === 0 || occurrence.getDay() === 6;

    const item: CelebrationItem = {
      userId: user._id.toString(),
      name: user.name,
      photoUrl: user.photoUrl,
      department: user.department || "General",
      role: user.role || "Team Member",
      phone: user.phone,
      type,
      celebrationDate: occurrence.toISOString(),
      displayDate: formatCelebrationDay(diffDays, occurrence),
      daysRemaining: diffDays,
      dayOfWeek,
      isWeekend,
      milestoneText,
      milestoneYears,
    };

    if (diffDays === 0) {
      todayList.push(item);
    } else if (diffDays > 0 && diffDays <= windowDays) {
      upcomingList.push(item);
    }
  }

  // Sort upcoming chronologically
  upcomingList.sort((a, b) => a.daysRemaining - b.daysRemaining);

  return { today: todayList, upcoming: upcomingList };
}
