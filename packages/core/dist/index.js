"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  DEFAULT_SETTINGS: () => DEFAULT_SETTINGS,
  DEFAULT_TEMPLATES: () => DEFAULT_TEMPLATES,
  DEFAULT_THRESHOLDS: () => DEFAULT_THRESHOLDS,
  WORKLOAD_COLORS: () => WORKLOAD_COLORS,
  addDays: () => import_date_fns3.addDays,
  addMonths: () => import_date_fns3.addMonths,
  addWeeks: () => import_date_fns3.addWeeks,
  calculateDailyMetrics: () => calculateDailyMetrics,
  calculateEstimatedTravelTime: () => calculateEstimatedTravelTime,
  calculateEventDurationForDay: () => calculateEventDurationForDay,
  calculateOvernightNights: () => calculateOvernightNights,
  calculateRangeMetrics: () => calculateRangeMetrics,
  differenceInDays: () => import_date_fns3.differenceInDays,
  differenceInHours: () => import_date_fns3.differenceInHours,
  differenceInMinutes: () => import_date_fns3.differenceInMinutes,
  eachDayOfInterval: () => import_date_fns3.eachDayOfInterval,
  endOfDay: () => import_date_fns3.endOfDay,
  endOfMonth: () => import_date_fns3.endOfMonth,
  endOfWeek: () => import_date_fns3.endOfWeek,
  eventOverlapsDay: () => eventOverlapsDay,
  extractClientName: () => extractClientName,
  extractServiceInfo: () => extractServiceInfo,
  findClientMatches: () => findClientMatches,
  format: () => import_date_fns3.format,
  formatDateFull: () => formatDateFull,
  formatDateRelative: () => formatDateRelative,
  formatDateShort: () => formatDateShort,
  formatDuration: () => formatDuration,
  formatHours: () => formatHours,
  formatHoursDisplay: () => formatHoursDisplay,
  formatTime: () => formatTime,
  formatTimeRange: () => formatTimeRange,
  getClientCandidateFromEvent: () => getClientCandidateFromEvent,
  getConfidentClientMatch: () => getConfidentClientMatch,
  getDateRange: () => getDateRange,
  getEventsForDate: () => getEventsForDate,
  getPeriodRange: () => getPeriodRange,
  getRelativeTimeString: () => getRelativeTimeString,
  getServiceTypeLabel: () => getServiceTypeLabel,
  getWorkloadColor: () => getWorkloadColor,
  getWorkloadLabel: () => getWorkloadLabel,
  getWorkloadLevel: () => getWorkloadLevel,
  getWorkloadSummary: () => getWorkloadSummary,
  isCacheValid: () => isCacheValid,
  isDefinitelyPersonal: () => isDefinitelyPersonal,
  isOvernightEvent: () => isOvernightEvent,
  isSameDay: () => import_date_fns3.isSameDay,
  isSameMonth: () => import_date_fns3.isSameMonth,
  isSamePeriod: () => isSamePeriod,
  isSameWeek: () => import_date_fns3.isSameWeek,
  isToday: () => import_date_fns3.isToday,
  isTomorrow: () => import_date_fns3.isTomorrow,
  isWorkEvent: () => isWorkEvent,
  isYesterday: () => import_date_fns3.isYesterday,
  navigateDate: () => navigateDate,
  normalizeName: () => normalizeName,
  parseDate: () => parseDate,
  parseISO: () => import_date_fns3.parseISO,
  parseRawGoogleEvent: () => parseRawGoogleEvent,
  processEvent: () => processEvent,
  processEvents: () => processEvents,
  searchClients: () => searchClients,
  startOfDay: () => import_date_fns3.startOfDay,
  startOfMonth: () => import_date_fns3.startOfMonth,
  startOfWeek: () => import_date_fns3.startOfWeek,
  subDays: () => import_date_fns3.subDays,
  subMonths: () => import_date_fns3.subMonths,
  subWeeks: () => import_date_fns3.subWeeks
});
module.exports = __toCommonJS(index_exports);

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
var import_date_fns = require("date-fns");
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
  const durationHours = (0, import_date_fns.differenceInMinutes)(event.end, event.start) / 60;
  if (durationHours >= 8 && !(0, import_date_fns.isSameDay)(event.start, event.end)) {
    return true;
  }
  return false;
}
function calculateOvernightNights(event) {
  if (!isOvernightEvent(event)) {
    return 0;
  }
  const nights = (0, import_date_fns.differenceInCalendarDays)(event.end, event.start);
  return Math.max(1, nights);
}
function calculateEventDurationForDay(event, date) {
  const dayStart = (0, import_date_fns.startOfDay)(date);
  const dayEnd = (0, import_date_fns.endOfDay)(date);
  if ((0, import_date_fns.isAfter)(event.start, dayEnd) || (0, import_date_fns.isBefore)(event.end, dayStart)) {
    return 0;
  }
  const effectiveStart = (0, import_date_fns.isAfter)(event.start, dayStart) ? event.start : dayStart;
  const effectiveEnd = (0, import_date_fns.isBefore)(event.end, dayEnd) ? event.end : dayEnd;
  let minutes = (0, import_date_fns.differenceInMinutes)(effectiveEnd, effectiveStart);
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
var import_date_fns2 = require("date-fns");
var DEFAULT_TRAVEL_TIME = 15;
function eventOverlapsDay(event, date) {
  const dayStart = (0, import_date_fns2.startOfDay)(date);
  const dayEnd = (0, import_date_fns2.endOfDay)(date);
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
  const days = (0, import_date_fns2.eachDayOfInterval)({ start: startDate, end: endDate });
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
      startDate = (0, import_date_fns2.startOfDay)(referenceDate);
      endDate = (0, import_date_fns2.endOfDay)(referenceDate);
      break;
    case "weekly":
      startDate = (0, import_date_fns2.startOfWeek)(referenceDate, { weekStartsOn });
      endDate = (0, import_date_fns2.endOfWeek)(referenceDate, { weekStartsOn });
      break;
    case "monthly":
      startDate = (0, import_date_fns2.startOfMonth)(referenceDate);
      endDate = (0, import_date_fns2.endOfMonth)(referenceDate);
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
var import_date_fns3 = require("date-fns");
function formatDateRelative(date) {
  if ((0, import_date_fns3.isToday)(date)) {
    return "Today";
  }
  if ((0, import_date_fns3.isTomorrow)(date)) {
    return "Tomorrow";
  }
  if ((0, import_date_fns3.isYesterday)(date)) {
    return "Yesterday";
  }
  return (0, import_date_fns3.format)(date, "EEEE, MMMM d");
}
function formatDateFull(date) {
  return (0, import_date_fns3.format)(date, "EEEE, MMMM d, yyyy");
}
function formatDateShort(date) {
  return (0, import_date_fns3.format)(date, "MMM d");
}
function formatTime(date, use24Hour = false) {
  return (0, import_date_fns3.format)(date, use24Hour ? "HH:mm" : "h:mm a");
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
  const diffMinutes = (0, import_date_fns3.differenceInMinutes)(date, now);
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
      return { start: (0, import_date_fns3.startOfDay)(referenceDate), end: (0, import_date_fns3.endOfDay)(referenceDate) };
    case "week":
      return {
        start: (0, import_date_fns3.startOfWeek)(referenceDate, { weekStartsOn }),
        end: (0, import_date_fns3.endOfWeek)(referenceDate, { weekStartsOn })
      };
    case "month":
      return { start: (0, import_date_fns3.startOfMonth)(referenceDate), end: (0, import_date_fns3.endOfMonth)(referenceDate) };
  }
}
function navigateDate(date, period, direction) {
  const amount = direction === "forward" ? 1 : -1;
  switch (period) {
    case "day":
      return direction === "forward" ? (0, import_date_fns3.addDays)(date, 1) : (0, import_date_fns3.subDays)(date, 1);
    case "week":
      return direction === "forward" ? (0, import_date_fns3.addWeeks)(date, 1) : (0, import_date_fns3.subWeeks)(date, 1);
    case "month":
      return direction === "forward" ? (0, import_date_fns3.addMonths)(date, 1) : (0, import_date_fns3.subMonths)(date, 1);
  }
}
function isSamePeriod(date1, date2, period, weekStartsOn = 0) {
  switch (period) {
    case "day":
      return (0, import_date_fns3.isSameDay)(date1, date2);
    case "week":
      return (0, import_date_fns3.isSameWeek)(date1, date2, { weekStartsOn });
    case "month":
      return (0, import_date_fns3.isSameMonth)(date1, date2);
  }
}
function parseDate(dateString) {
  try {
    const date = (0, import_date_fns3.parseISO)(dateString);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
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
  differenceInMinutes,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
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
  isSameDay,
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
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks
});
