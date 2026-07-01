interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * Date calculator MCP.
 *
 * Keyless, offline: the difference between two dates, add/subtract a duration
 * from a date, and calendar facts about a date (weekday, ISO week, day-of-year,
 * quarter, leap year). All in UTC. Uses the platform Date — no API, no key.
 */


const DAYNAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function isoWeek(d: Date): number {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

const tools: McpToolExport['tools'] = [
  {
    name: 'date_diff',
    description: 'Compute the difference between two dates/times (UTC). Returns the signed difference in ms, seconds, minutes, hours, days and weeks, plus a human-readable summary. Accepts ISO-8601 (e.g. "2026-01-01" or "2026-01-01T12:00:00Z").',
    inputSchema: { type: 'object', properties: { from: { type: 'string', description: 'Start date/time (ISO-8601).' }, to: { type: 'string', description: 'End date/time (ISO-8601).' } }, required: ['from', 'to'] },
  },
  {
    name: 'add_duration',
    description: 'Add (or subtract, with negatives) a duration to a date and return the new UTC date/time. Provide any of years/months/weeks/days/hours/minutes/seconds.',
    inputSchema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Base date/time (ISO-8601).' },
        years: { type: 'number' }, months: { type: 'number' }, weeks: { type: 'number' },
        days: { type: 'number' }, hours: { type: 'number' }, minutes: { type: 'number' }, seconds: { type: 'number' },
      },
      required: ['date'],
    },
  },
  {
    name: 'date_info',
    description: 'Calendar facts about a date (UTC): weekday, day-of-year, ISO week number, quarter, whether the year is a leap year, and days in that month.',
    inputSchema: { type: 'object', properties: { date: { type: 'string', description: 'A date (ISO-8601).' } }, required: ['date'] },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'date_diff': {
      const a = Date.parse(reqStr(args, 'from', '"2026-01-01"')), b = Date.parse(reqStr(args, 'to', '"2026-12-31"'));
      if (Number.isNaN(a) || Number.isNaN(b)) return { error: 'Could not parse one of the dates (use ISO-8601).' };
      const ms = b - a, sec = ms / 1000;
      const absDays = Math.floor(Math.abs(ms) / 86400000);
      const remH = Math.floor((Math.abs(ms) % 86400000) / 3600000);
      return { from: new Date(a).toISOString(), to: new Date(b).toISOString(), milliseconds: ms, seconds: sec, minutes: sec / 60, hours: sec / 3600, days: +(sec / 86400).toFixed(4), weeks: +(sec / 604800).toFixed(4), human: `${ms < 0 ? '-' : ''}${absDays} day(s) ${remH} hour(s)` };
    }
    case 'add_duration': {
      const base = Date.parse(reqStr(args, 'date', '"2026-01-01"'));
      if (Number.isNaN(base)) return { error: 'Could not parse the date (use ISO-8601).' };
      const d = new Date(base);
      const n = (k: string) => (typeof args[k] === 'number' ? (args[k] as number) : 0);
      // Add years+months with month-end CLAMPING (Jan 31 + 1mo -> Feb 28/29),
      // matching date-fns/moment rather than JS's raw day overflow.
      const day = d.getUTCDate();
      d.setUTCDate(1);
      d.setUTCFullYear(d.getUTCFullYear() + n('years'), d.getUTCMonth() + n('months'));
      const maxDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
      d.setUTCDate(Math.min(day, maxDay));
      // Then the exact durations (these SHOULD roll over normally).
      d.setUTCDate(d.getUTCDate() + n('weeks') * 7 + n('days'));
      d.setUTCHours(d.getUTCHours() + n('hours'), d.getUTCMinutes() + n('minutes'), d.getUTCSeconds() + n('seconds'));
      return { input: new Date(base).toISOString(), result: d.toISOString() };
    }
    case 'date_info': {
      const t = Date.parse(reqStr(args, 'date', '"2026-06-30"'));
      if (Number.isNaN(t)) return { error: 'Could not parse the date (use ISO-8601).' };
      const d = new Date(t);
      const y = d.getUTCFullYear();
      const startOfYear = Date.UTC(y, 0, 1);
      const dayOfYear = Math.floor((Date.UTC(y, d.getUTCMonth(), d.getUTCDate()) - startOfYear) / 86400000) + 1;
      const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
      return { date: d.toISOString().slice(0, 10), weekday: DAYNAMES[d.getUTCDay()], day_of_year: dayOfYear, iso_week: isoWeek(d), quarter: Math.floor(d.getUTCMonth() / 3) + 1, is_leap_year: leap, days_in_month: new Date(Date.UTC(y, d.getUTCMonth() + 1, 0)).getUTCDate() };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

function reqStr(args: Record<string, unknown>, key: string, ex: string): string {
  const v = args[key];
  if (typeof v !== 'string' || !v.trim()) throw new Error(`Required argument "${key}" is missing. Pass a string like ${ex}.`);
  return v;
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
