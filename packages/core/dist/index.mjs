// src/models/workload.model.ts
var DEFAULT_THRESHOLDS = {
  daily: {
    comfortable: 4,
    busy: 6,
    high: 8
  },
  weekly: {
    comfortable: 25,
    busy: 35,
    high: 45
  },
  monthly: {
    comfortable: 100,
    busy: 140,
    high: 180
  }
};
var WORKLOAD_COLORS = {
  comfortable: "#10B981",
  // Green
  busy: "#F59E0B",
  // Amber
  high: "#F97316",
  // Orange
  burnout: "#EF4444"
  // Red
};
function getWorkloadLevel(hours, period, thresholds = DEFAULT_THRESHOLDS) {
  const config = thresholds[period];
  if (hours <= config.comfortable) {
    return "comfortable";
  } else if (hours <= config.busy) {
    return "busy";
  } else if (hours <= config.high) {
    return "high";
  } else {
    return "burnout";
  }
}

// src/models/settings.model.ts
var DEFAULT_SETTINGS = {
  thresholds: DEFAULT_THRESHOLDS,
  includeTravelTime: true,
  defaultTravelBuffer: 15,
  googleClientId: "",
  selectedCalendars: [],
  defaultCalendarView: "month",
  weekStartsOn: 0,
  timeFormat: "12h",
  showWeekNumbers: false,
  cacheExpiryMinutes: 15,
  autoRefreshMinutes: 15,
  enableAnalytics: true,
  enableNotifications: true
};
function isCacheValid(entry) {
  if (!entry) return false;
  return Date.now() - entry.timestamp < entry.expiryMs;
}

// src/models/template.model.ts
var DEFAULT_TEMPLATES = [
  {
    name: "15-Minute Drop-In",
    icon: "\u{1F3E0}",
    type: "drop-in",
    duration: 15,
    includeTravel: true,
    travelBuffer: 15,
    isDefault: true
  },
  {
    name: "30-Minute Visit",
    icon: "\u{1F415}",
    type: "drop-in",
    duration: 30,
    includeTravel: true,
    travelBuffer: 15,
    isDefault: true
  },
  {
    name: "45-Minute Walk",
    icon: "\u{1F9AE}",
    type: "walk",
    duration: 45,
    includeTravel: true,
    travelBuffer: 15,
    isDefault: true
  },
  {
    name: "60-Minute Visit",
    icon: "\u{1F43E}",
    type: "drop-in",
    duration: 60,
    includeTravel: true,
    travelBuffer: 15,
    isDefault: true
  },
  {
    name: "Overnight Stay",
    icon: "\u{1F319}",
    type: "overnight",
    duration: 720,
    // 12 hours
    includeTravel: true,
    travelBuffer: 15,
    isDefault: true
  },
  {
    name: "Housesit",
    icon: "\u{1F3E1}",
    type: "housesit",
    duration: 1440,
    // 24 hours
    includeTravel: true,
    travelBuffer: 15,
    isDefault: true
  },
  {
    name: "Meet & Greet",
    icon: "\u{1F44B}",
    type: "meet-greet",
    duration: 30,
    includeTravel: true,
    travelBuffer: 15,
    isDefault: true
  },
  {
    name: "Nail Trim",
    icon: "\u2702\uFE0F",
    type: "nail-trim",
    duration: 15,
    includeTravel: true,
    travelBuffer: 15,
    isDefault: true
  }
];

// src/services/event-processor.ts
import {
  startOfDay,
  endOfDay,
  differenceInMinutes,
  isSameDay,
  isAfter,
  isBefore,
  differenceInCalendarDays
} from "date-fns";
var workEventPatterns = {
  // Duration suffixes (common naming: "Fluffy - 30")
  minutesSuffix: /\b(15|20|30|45|60)\b/i,
  // Meet and greet variations
  meetAndGreet: /\b(MG|M&G|Meet\s*&?\s*Greet)\b/i,
  // Housesit/overnight indicators
  housesitSuffix: /\b(HS|Housesit|House\s*sit)\b/i,
  overnight: /\b(ON|Overnight|Over\s*night)\b/i,
  // Specific services
  nailTrim: /\b(nail\s*trim|NT)\b/i,
  walk: /\b(walk|walking)\b/i,
  dropIn: /\b(drop[\s-]?in|visit)\b/i,
  // Pet/client name patterns (Name - Duration)
  petNamePattern: /^([A-Za-z]+(?:\s*(?:&|and|,)\s*[A-Za-z]+)*)\s*[-–—]\s*/i
};
var personalEventPatterns = {
  // Admin/business time (not client appointments)
  admin: /\b(admin|administration|administrative|paperwork|bookkeeping|billing)\b/i,
  // Off day markers
  offDay: /^\s*✨\s*off\s*✨/i,
  dayOff: /\b(day\s*off|off\s*day|no\s*work)\b/i,
  // Personal appointments
  doctor: /\b(doctor|dr\.|dentist|medical|appointment|appt)\b/i,
  personal: /\b(personal|private|family)\b/i,
  // Blocked time
  blocked: /\b(blocked|busy|unavailable|break)\b/i,
  // Holidays
  holiday: /\b(holiday|vacation|pto|time\s*off)\b/i,
  // Meals/breaks
  meals: /\b(lunch|dinner|breakfast|meal)\b/i,
  // Transportation
  travel: /\b(flight|airport|travel(?!.*time))\b/i,
  // Entertainment
  entertainment: /\b(movie|concert|show|game|party)\b/i,
  // Generic personal
  me: /\b(me time|self care|gym|workout|exercise)\b/i
};
function isDefinitelyPersonal(title) {
  for (const pattern of Object.values(personalEventPatterns)) {
    if (pattern.test(title)) {
      return true;
    }
  }
  return false;
}
function matchesWorkPattern(title) {
  if (workEventPatterns.minutesSuffix.test(title)) return true;
  if (workEventPatterns.meetAndGreet.test(title)) return true;
  if (workEventPatterns.housesitSuffix.test(title)) return true;
  if (workEventPatterns.overnight.test(title)) return true;
  if (workEventPatterns.nailTrim.test(title)) return true;
  if (workEventPatterns.walk.test(title)) return true;
  if (workEventPatterns.dropIn.test(title)) return true;
  if (workEventPatterns.petNamePattern.test(title)) return true;
  return false;
}
function isWorkEvent(eventOrTitle) {
  const title = typeof eventOrTitle === "string" ? eventOrTitle : eventOrTitle.title;
  if (!title || title.trim().length === 0) {
    return false;
  }
  if (isDefinitelyPersonal(title)) {
    return false;
  }
  return matchesWorkPattern(title);
}
function isOvernightEvent(event) {
  const title = event.title.toLowerCase();
  if (workEventPatterns.housesitSuffix.test(title) || workEventPatterns.overnight.test(title)) {
    return true;
  }
  const durationHours = differenceInMinutes(event.end, event.start) / 60;
  if (durationHours >= 8 && !isSameDay(event.start, event.end)) {
    return true;
  }
  return false;
}
function calculateOvernightNights(event) {
  if (!isOvernightEvent(event)) {
    return 0;
  }
  const nights = differenceInCalendarDays(event.end, event.start);
  return Math.max(1, nights);
}
function calculateEventDurationForDay(event, date) {
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);
  if (isAfter(event.start, dayEnd) || isBefore(event.end, dayStart)) {
    return 0;
  }
  const effectiveStart = isAfter(event.start, dayStart) ? event.start : dayStart;
  const effectiveEnd = isBefore(event.end, dayEnd) ? event.end : dayEnd;
  let minutes = differenceInMinutes(effectiveEnd, effectiveStart);
  if (isOvernightEvent(event)) {
    minutes = Math.min(minutes, 12 * 60);
  }
  return Math.max(0, minutes);
}
function extractClientName(title) {
  const match = title.match(workEventPatterns.petNamePattern);
  if (match) {
    return match[1].trim();
  }
  const separators = [" - ", " \u2013 ", " \u2014 ", " | ", " @ "];
  for (const sep of separators) {
    const idx = title.indexOf(sep);
    if (idx > 0) {
      return title.substring(0, idx).trim();
    }
  }
  return title.trim();
}
function extractServiceInfo(title) {
  const info = {
    type: "other",
    duration: 30
    // default
  };
  const durationMatch = title.match(/\b(15|20|30|45|60)\b/);
  if (durationMatch) {
    info.duration = parseInt(durationMatch[1], 10);
  }
  if (workEventPatterns.meetAndGreet.test(title)) {
    info.type = "meet-greet";
    info.duration = info.duration || 30;
  } else if (workEventPatterns.housesitSuffix.test(title)) {
    info.type = "housesit";
    info.duration = 1440;
  } else if (workEventPatterns.overnight.test(title)) {
    info.type = "overnight";
    info.duration = 720;
  } else if (workEventPatterns.nailTrim.test(title)) {
    info.type = "nail-trim";
    info.duration = info.duration || 15;
  } else if (workEventPatterns.walk.test(title)) {
    info.type = "walk";
  } else if (workEventPatterns.dropIn.test(title)) {
    info.type = "drop-in";
  } else if (durationMatch) {
    info.type = "drop-in";
  }
  info.petName = extractClientName(title);
  return info;
}
function processEvent(event) {
  const isWork = isWorkEvent(event);
  return {
    ...event,
    isWorkEvent: isWork,
    isOvernightEvent: isWork ? isOvernightEvent(event) : false,
    clientName: isWork ? extractClientName(event.title) : void 0,
    serviceInfo: isWork ? extractServiceInfo(event.title) : void 0
  };
}
function processEvents(events) {
  return events.map((event) => processEvent(event));
}
function getServiceTypeLabel(type) {
  const labels = {
    "drop-in": "Drop-In Visit",
    walk: "Walk",
    overnight: "Overnight",
    housesit: "Housesit",
    "meet-greet": "Meet & Greet",
    "nail-trim": "Nail Trim",
    other: "Other"
  };
  return labels[type] || "Other";
}
function parseRawGoogleEvent(raw, calendarId) {
  const isAllDay = !raw.start.dateTime;
  const start = isAllDay ? /* @__PURE__ */ new Date(raw.start.date + "T00:00:00") : new Date(raw.start.dateTime);
  const end = isAllDay ? /* @__PURE__ */ new Date(raw.end.date + "T23:59:59") : new Date(raw.end.dateTime);
  const event = {
    id: raw.id,
    calendarId,
    title: raw.summary || "Untitled Event",
    description: raw.description,
    location: raw.location,
    start,
    end,
    allDay: isAllDay,
    recurringEventId: raw.recurringEventId,
    status: raw.status || "confirmed"
  };
  return processEvent(event);
}

// src/services/workload-calculator.ts
import {
  startOfDay as startOfDay2,
  endOfDay as endOfDay2,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval
} from "date-fns";
var DEFAULT_TRAVEL_TIME = 15;
function eventOverlapsDay(event, date) {
  const dayStart = startOfDay2(date);
  const dayEnd = endOfDay2(date);
  return event.start <= dayEnd && event.end >= dayStart;
}
function calculateEstimatedTravelTime(workEvents, travelTimePerLeg = DEFAULT_TRAVEL_TIME) {
  if (workEvents.length === 0) return 0;
  let trips = 0;
  const sortedEvents = [...workEvents].sort(
    (a, b) => a.start.getTime() - b.start.getTime()
  );
  for (let i = 0; i < sortedEvents.length; i++) {
    const event = sortedEvents[i];
    const prevEvent = i > 0 ? sortedEvents[i - 1] : null;
    if (prevEvent && event.location && prevEvent.location === event.location) {
      trips += 1;
    } else {
      trips += 2;
    }
  }
  return trips * travelTimePerLeg;
}
function getEventsForDate(events, date) {
  return events.filter((e) => eventOverlapsDay(e, date));
}
function calculateDailyMetrics(date, events, options = {}) {
  const {
    includeTravelTime = true,
    thresholds = DEFAULT_THRESHOLDS,
    travelBuffer = DEFAULT_TRAVEL_TIME
  } = options;
  const dayEvents = getEventsForDate(events, date);
  const workEvents = dayEvents.filter((e) => e.isWorkEvent);
  let workTime = 0;
  for (const event of workEvents) {
    workTime += calculateEventDurationForDay(event, date);
  }
  const travelTime = includeTravelTime ? calculateEstimatedTravelTime(workEvents, travelBuffer) : 0;
  const totalTime = workTime + travelTime;
  const totalHours = totalTime / 60;
  return {
    date,
    workTime,
    travelTime,
    totalTime,
    eventCount: workEvents.length,
    level: getWorkloadLevel(totalHours, "daily", thresholds)
  };
}
function calculateRangeMetrics(startDate, endDate, events, options = {}) {
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  return days.map((date) => {
    const dayEvents = events.filter((e) => eventOverlapsDay(e, date));
    return calculateDailyMetrics(date, dayEvents, options);
  });
}
function getPeriodRange(period, referenceDate = /* @__PURE__ */ new Date(), weekStartsOn = 0) {
  let startDate;
  let endDate;
  switch (period) {
    case "daily":
      startDate = startOfDay2(referenceDate);
      endDate = endOfDay2(referenceDate);
      break;
    case "weekly":
      startDate = startOfWeek(referenceDate, { weekStartsOn });
      endDate = endOfWeek(referenceDate, { weekStartsOn });
      break;
    case "monthly":
      startDate = startOfMonth(referenceDate);
      endDate = endOfMonth(referenceDate);
      break;
  }
  return { startDate, endDate };
}
function getWorkloadSummary(period, events, options = {}) {
  const {
    referenceDate = /* @__PURE__ */ new Date(),
    includeTravelTime = true,
    thresholds = DEFAULT_THRESHOLDS,
    travelBuffer = DEFAULT_TRAVEL_TIME,
    weekStartsOn = 0
  } = options;
  const { startDate, endDate } = getPeriodRange(period, referenceDate, weekStartsOn);
  const metrics = calculateRangeMetrics(startDate, endDate, events, {
    includeTravelTime,
    thresholds,
    travelBuffer
  });
  const totalWorkMinutes = metrics.reduce((sum, m) => sum + m.workTime, 0);
  const totalTravelMinutes = metrics.reduce((sum, m) => sum + m.travelTime, 0);
  const totalEvents = metrics.reduce((sum, m) => sum + m.eventCount, 0);
  const busiestDay = metrics.reduce(
    (max, m) => m.totalTime > max.hours * 60 ? { date: m.date, hours: m.totalTime / 60 } : max,
    { date: startDate, hours: 0 }
  );
  const totalHours = (totalWorkMinutes + totalTravelMinutes) / 60;
  const daysInPeriod = metrics.length;
  const averageDailyHours = totalHours / daysInPeriod;
  return {
    period,
    startDate,
    endDate,
    totalWorkHours: totalWorkMinutes / 60,
    totalTravelHours: totalTravelMinutes / 60,
    averageDailyHours,
    busiestDay,
    level: getWorkloadLevel(totalHours, period, thresholds),
    eventCount: totalEvents
  };
}
function getWorkloadColor(level) {
  const colors = {
    comfortable: "#10B981",
    busy: "#F59E0B",
    high: "#F97316",
    burnout: "#EF4444"
  };
  return colors[level];
}
function getWorkloadLabel(level) {
  const labels = {
    comfortable: "Comfortable",
    busy: "Busy",
    high: "High",
    burnout: "Burnout Risk"
  };
  return labels[level];
}
function formatHours(hours) {
  if (hours < 1) {
    return `${Math.round(hours * 60)} min`;
  }
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) {
    return `${h}h`;
  }
  return `${h}h ${m}m`;
}

// src/utils/client-matching.ts
function normalizeName(name) {
  return name.trim().toLowerCase();
}
function findClientMatches(clients, candidate) {
  if (!candidate) return [];
  const normalizedCandidate = normalizeName(candidate);
  return clients.filter(
    (client) => normalizeName(client.name) === normalizedCandidate
  );
}
function getClientCandidateFromEvent(event) {
  if (event.clientName) {
    return event.clientName.trim();
  }
  if (event.title) {
    const parts = event.title.split(" - ");
    const candidate = parts[0].trim();
    if (candidate.length < 2) return null;
    const serviceKeywords = ["visit", "walk", "drop-in", "overnight", "housesit", "meet", "greet"];
    if (serviceKeywords.includes(candidate.toLowerCase())) return null;
    return candidate;
  }
  return null;
}
function getConfidentClientMatch(clients, event) {
  const candidate = getClientCandidateFromEvent(event);
  if (!candidate) return null;
  const matches = findClientMatches(clients, candidate);
  if (matches.length === 1) {
    return matches[0].id;
  }
  return null;
}
function searchClients(clients, searchTerm) {
  if (!searchTerm) return clients;
  const normalizedTerm = normalizeName(searchTerm);
  return clients.filter(
    (client) => normalizeName(client.name).includes(normalizedTerm) || client.email && normalizeName(client.email).includes(normalizedTerm) || client.address && normalizeName(client.address).includes(normalizedTerm)
  );
}

// src/utils/date.ts
import {
  format,
  isToday,
  isTomorrow,
  isYesterday,
  startOfDay as startOfDay3,
  endOfDay as endOfDay3,
  startOfWeek as startOfWeek2,
  endOfWeek as endOfWeek2,
  startOfMonth as startOfMonth2,
  endOfMonth as endOfMonth2,
  addDays,
  addWeeks,
  addMonths,
  subDays,
  subWeeks,
  subMonths,
  differenceInMinutes as differenceInMinutes2,
  differenceInHours,
  differenceInDays,
  isSameDay as isSameDay2,
  isSameWeek,
  isSameMonth,
  parseISO,
  eachDayOfInterval as eachDayOfInterval2
} from "date-fns";
function formatDateRelative(date) {
  if (isToday(date)) {
    return "Today";
  }
  if (isTomorrow(date)) {
    return "Tomorrow";
  }
  if (isYesterday(date)) {
    return "Yesterday";
  }
  return format(date, "EEEE, MMMM d");
}
function formatDateFull(date) {
  return format(date, "EEEE, MMMM d, yyyy");
}
function formatDateShort(date) {
  return format(date, "MMM d");
}
function formatTime(date, use24Hour = false) {
  return format(date, use24Hour ? "HH:mm" : "h:mm a");
}
function formatTimeRange(start, end, use24Hour = false) {
  return `${formatTime(start, use24Hour)} - ${formatTime(end, use24Hour)}`;
}
function formatDuration(minutes) {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}m`;
}
function formatHoursDisplay(hours) {
  if (hours < 1) {
    return `${Math.round(hours * 60)} min`;
  }
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) {
    return `${h}h`;
  }
  return `${h}h ${m}m`;
}
function getRelativeTimeString(date) {
  const now = /* @__PURE__ */ new Date();
  const diffMinutes = differenceInMinutes2(date, now);
  if (Math.abs(diffMinutes) < 1) {
    return "now";
  }
  const isFuture = diffMinutes > 0;
  const absDiff = Math.abs(diffMinutes);
  if (absDiff < 60) {
    return isFuture ? `in ${absDiff} min` : `${absDiff} min ago`;
  }
  const diffHours = Math.floor(absDiff / 60);
  if (diffHours < 24) {
    return isFuture ? `in ${diffHours}h` : `${diffHours}h ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  return isFuture ? `in ${diffDays}d` : `${diffDays}d ago`;
}
function getDateRange(period, referenceDate = /* @__PURE__ */ new Date(), weekStartsOn = 0) {
  switch (period) {
    case "day":
      return { start: startOfDay3(referenceDate), end: endOfDay3(referenceDate) };
    case "week":
      return {
        start: startOfWeek2(referenceDate, { weekStartsOn }),
        end: endOfWeek2(referenceDate, { weekStartsOn })
      };
    case "month":
      return { start: startOfMonth2(referenceDate), end: endOfMonth2(referenceDate) };
  }
}
function navigateDate(date, period, direction) {
  const amount = direction === "forward" ? 1 : -1;
  switch (period) {
    case "day":
      return direction === "forward" ? addDays(date, 1) : subDays(date, 1);
    case "week":
      return direction === "forward" ? addWeeks(date, 1) : subWeeks(date, 1);
    case "month":
      return direction === "forward" ? addMonths(date, 1) : subMonths(date, 1);
  }
}
function isSamePeriod(date1, date2, period, weekStartsOn = 0) {
  switch (period) {
    case "day":
      return isSameDay2(date1, date2);
    case "week":
      return isSameWeek(date1, date2, { weekStartsOn });
    case "month":
      return isSameMonth(date1, date2);
  }
}
function parseDate(dateString) {
  try {
    const date = parseISO(dateString);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}
export {
  DEFAULT_SETTINGS,
  DEFAULT_TEMPLATES,
  DEFAULT_THRESHOLDS,
  WORKLOAD_COLORS,
  addDays,
  addMonths,
  addWeeks,
  calculateDailyMetrics,
  calculateEstimatedTravelTime,
  calculateEventDurationForDay,
  calculateOvernightNights,
  calculateRangeMetrics,
  differenceInDays,
  differenceInHours,
  differenceInMinutes2 as differenceInMinutes,
  eachDayOfInterval2 as eachDayOfInterval,
  endOfDay3 as endOfDay,
  endOfMonth2 as endOfMonth,
  endOfWeek2 as endOfWeek,
  eventOverlapsDay,
  extractClientName,
  extractServiceInfo,
  findClientMatches,
  format,
  formatDateFull,
  formatDateRelative,
  formatDateShort,
  formatDuration,
  formatHours,
  formatHoursDisplay,
  formatTime,
  formatTimeRange,
  getClientCandidateFromEvent,
  getConfidentClientMatch,
  getDateRange,
  getEventsForDate,
  getPeriodRange,
  getRelativeTimeString,
  getServiceTypeLabel,
  getWorkloadColor,
  getWorkloadLabel,
  getWorkloadLevel,
  getWorkloadSummary,
  isCacheValid,
  isDefinitelyPersonal,
  isOvernightEvent,
  isSameDay2 as isSameDay,
  isSameMonth,
  isSamePeriod,
  isSameWeek,
  isToday,
  isTomorrow,
  isWorkEvent,
  isYesterday,
  navigateDate,
  normalizeName,
  parseDate,
  parseISO,
  parseRawGoogleEvent,
  processEvent,
  processEvents,
  searchClients,
  startOfDay3 as startOfDay,
  startOfMonth2 as startOfMonth,
  startOfWeek2 as startOfWeek,
  subDays,
  subMonths,
  subWeeks
};
