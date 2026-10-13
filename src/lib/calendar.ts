/**
 * Lightweight iCalendar (.ics) generator. No external dependency — the ICS
 * format is a plain text spec and the subset we need (VEVENT with title,
 * description, location, DTSTART/DTEND) is small.
 *
 * Spec: RFC 5545 §3.6.1 (VEVENT).
 */

export interface CalendarEvent {
  /** Stable UID; required by RFC 5545. Appointment id + "@doctor-cares" works well. */
  uid: string;
  /** Human title: "Appointment with Dr. Jane Doe". */
  title: string;
  /** Multi-line description (symptoms, mode, fee). Newlines are escaped. */
  description?: string;
  /** Location hint — "Video consultation", clinic address, etc. */
  location?: string;
  /** Start time (ISO or Date). */
  start: string | Date;
  /** End time (ISO or Date). If missing, defaults to start + 30 min. */
  end?: string | Date;
}

/**
 * Format a Date into RFC 5545 UTC `yyyyMMddTHHmmssZ`. We always emit UTC
 * (`Z` suffix) which calendars (iOS/Android/Google/Outlook) all accept,
 * regardless of the viewer's local timezone.
 */
function toIcsUtc(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    'Z'
  );
}

/** Escape special chars per RFC 5545 §3.3.11 — backslash, comma, semicolon, newline. */
function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
    .replace(/\r?\n/g, '\\n');
}

/** Build the full .ics file contents for one event. */
export function buildIcs(event: CalendarEvent): string {
  const start = event.start instanceof Date ? event.start : new Date(event.start);
  const end =
    event.end === undefined
      ? new Date(start.getTime() + 30 * 60_000)
      : event.end instanceof Date
        ? event.end
        : new Date(event.end);

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Doctor Cares//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${escapeIcsText(event.uid)}`,
    `DTSTAMP:${toIcsUtc(new Date())}`,
    `DTSTART:${toIcsUtc(start)}`,
    `DTEND:${toIcsUtc(end)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
  ];
  if (event.description) lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
  if (event.location) lines.push(`LOCATION:${escapeIcsText(event.location)}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');
  // RFC 5545 uses CRLF line endings.
  return lines.join('\r\n') + '\r\n';
}

/**
 * Trigger a browser download of the .ics file. Fires a Blob + anchor click
 * — same technique the chat image-save path uses. No native call; works in
 * both the web PWA and Capacitor WebView.
 */
export function downloadIcs(event: CalendarEvent, filename = 'appointment.ics'): void {
  const ics = buildIcs(event);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Delay revoke to give Safari time to kick off the download.
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
