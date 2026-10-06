import type { jsPDF as JsPdfType } from 'jspdf';
import type { Prescription } from '@/lib/api/prescriptions';
import type { PatientProfile, Profile } from '@/types';
import type { HealthMetric, MetricType } from '@/lib/api/healthMetrics';
import { METRIC_SPEC, formatMetric } from '@/lib/api/healthMetrics';
import type { AppointmentWithDoctor } from '@/lib/api/appointments';

// Lazy-load jsPDF — it's ~150 KB + html2canvas peer; loading it only when
// the user actually taps "Download PDF" or "Export medical record" keeps
// first-paint small.
async function loadJsPdf() {
  const mod = await import('jspdf');
  return mod.jsPDF;
}
type jsPDF = JsPdfType;

// ----- Shared layout helpers --------------------------------------------------

const BRAND = '#1E5EFF';
const INK   = '#0B1220';
const MUTED = '#64748B';
const MARGIN = 15;
const PAGE_W = 210; // A4 mm
const PAGE_H = 297;

function header(doc: jsPDF, title: string, subtitle?: string) {
  doc.setFillColor(BRAND);
  doc.rect(0, 0, PAGE_W, 18, 'F');
  doc.setTextColor('#ffffff');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Doctor Cares', MARGIN, 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(title, PAGE_W - MARGIN, 11, { align: 'right' });

  doc.setTextColor(INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(title, MARGIN, 30);
  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(MUTED);
    doc.text(subtitle, MARGIN, 36);
  }
}

function footer(doc: jsPDF, text: string) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(MUTED);
    doc.text(text, MARGIN, PAGE_H - 8);
    doc.text(`Page ${i} of ${pageCount}`, PAGE_W - MARGIN, PAGE_H - 8, { align: 'right' });
  }
}

function wrap(doc: jsPDF, text: string, x: number, y: number, maxWidth: number): number {
  const lines = doc.splitTextToSize(text, maxWidth) as string[];
  doc.text(lines, x, y);
  return y + lines.length * (doc.getFontSize() * 0.42);
}

function ensureSpace(doc: jsPDF, y: number, needed = 20): number {
  if (y + needed > PAGE_H - 15) {
    doc.addPage();
    return 25;
  }
  return y;
}

// ----- Single prescription PDF -----------------------------------------------

export async function prescriptionPdf(rx: Prescription): Promise<jsPDF> {
  const JsPDF = await loadJsPdf();
  const doc = new JsPDF({ unit: 'mm', format: 'a4' });
  header(doc, 'Prescription', `Issued ${new Date(rx.issued_at).toLocaleString()}`);

  let y = 48;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(INK);

  // Doctor + patient block
  doc.setFont('helvetica', 'bold');
  doc.text('Prescriber', MARGIN, y);
  doc.text('Patient', PAGE_W / 2, y);
  doc.setFont('helvetica', 'normal');
  y += 5;
  doc.text(`Dr. ${rx.doctor?.full_name ?? '—'}`, MARGIN, y);
  doc.text(rx.patient?.full_name ?? '—', PAGE_W / 2, y);
  y += 10;

  if (rx.diagnosis) {
    doc.setFont('helvetica', 'bold');
    doc.text('Diagnosis', MARGIN, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    y = wrap(doc, rx.diagnosis, MARGIN, y, PAGE_W - MARGIN * 2);
    y += 6;
  }

  // Medications header
  y = ensureSpace(doc, y, 10);
  doc.setFont('helvetica', 'bold');
  doc.text('Medications', MARGIN, y);
  y += 2;
  doc.setDrawColor(220);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 6;

  rx.medications.forEach((m, i) => {
    y = ensureSpace(doc, y, 24);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`${i + 1}. ${m.name}`, MARGIN, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const line = `${m.dosage || '—'} · ${m.frequency || '—'} · for ${m.duration || '—'}`;
    doc.setTextColor(MUTED);
    doc.text(line, MARGIN + 5, y);
    doc.setTextColor(INK);
    y += 5;
    if (m.instructions) {
      y = wrap(doc, `Instructions: ${m.instructions}`, MARGIN + 5, y, PAGE_W - MARGIN * 2 - 5);
    }
    y += 4;
  });

  if (rx.notes) {
    y = ensureSpace(doc, y, 20);
    doc.setFont('helvetica', 'bold');
    doc.text('Additional notes', MARGIN, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    y = wrap(doc, rx.notes, MARGIN, y, PAGE_W - MARGIN * 2);
    y += 6;
  }

  // Signature placeholder
  y = ensureSpace(doc, y, 25);
  y = Math.max(y, PAGE_H - 50);
  doc.setDrawColor(180);
  doc.line(MARGIN, y, MARGIN + 70, y);
  y += 5;
  doc.setFontSize(9);
  doc.setTextColor(MUTED);
  doc.text(`Dr. ${rx.doctor?.full_name ?? ''}`, MARGIN, y);
  doc.text('Signature / stamp', MARGIN, y + 4);

  footer(doc, 'Doctor Cares · present this prescription at any licensed pharmacy');
  return doc;
}

export async function downloadPrescriptionPdf(rx: Prescription): Promise<void> {
  const doc = await prescriptionPdf(rx);
  const date = new Date(rx.issued_at).toISOString().slice(0, 10);
  const name = (rx.patient?.full_name ?? 'patient').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  doc.save(`prescription-${date}-${name}.pdf`);
}

// ----- Full medical record export --------------------------------------------

export interface MedicalRecordData {
  profile: Profile | null;
  patient: PatientProfile | null;
  metrics: Partial<Record<MetricType, HealthMetric>>;
  appointments: AppointmentWithDoctor[];
  prescriptions: Prescription[];
}

export async function medicalRecordPdf(data: MedicalRecordData): Promise<jsPDF> {
  const JsPDF = await loadJsPdf();
  const doc = new JsPDF({ unit: 'mm', format: 'a4' });
  header(doc, 'Medical Record', `Generated ${new Date().toLocaleString()}`);
  let y = 48;
  doc.setFontSize(10);
  doc.setTextColor(INK);

  // Demographics
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
  doc.text('Demographics', MARGIN, y); y += 5;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);

  const demoRows: [string, string | number | null | undefined][] = [
    ['Full name',   data.profile?.full_name],
    ['Phone',       data.profile?.phone],
    ['Date of birth', data.patient?.date_of_birth],
    ['Gender',      data.patient?.gender],
    ['Blood group', data.patient?.blood_group],
    ['Height',      data.patient?.height_cm ? `${data.patient.height_cm} cm` : null],
    ['NHIS number', data.patient?.nhis_number],
  ];
  demoRows.forEach(([k, v]) => {
    if (v == null || v === '') return;
    doc.setTextColor(MUTED); doc.text(k, MARGIN, y);
    doc.setTextColor(INK);  doc.text(String(v), MARGIN + 45, y);
    y += 5;
  });
  y += 4;

  // Medical history
  y = ensureSpace(doc, y, 30);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
  doc.text('Medical history', MARGIN, y); y += 5;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);

  const historyBlock = (label: string, items: string[] | string | null | undefined) => {
    if (!items || (Array.isArray(items) && items.length === 0)) return;
    y = ensureSpace(doc, y, 12);
    doc.setTextColor(MUTED); doc.text(label, MARGIN, y); y += 4;
    doc.setTextColor(INK);
    const text = Array.isArray(items) ? items.join(', ') : items;
    y = wrap(doc, text, MARGIN, y, PAGE_W - MARGIN * 2);
    y += 4;
  };
  historyBlock('Allergies',       data.patient?.allergies);
  historyBlock('Chronic conditions',   data.patient?.chronic_conditions);
  historyBlock('Current medications',  data.patient?.current_medications);
  historyBlock('Immunizations',        data.patient?.immunizations);
  historyBlock('Past surgeries',       data.patient?.past_surgeries);
  historyBlock('Family history',       data.patient?.family_history);
  historyBlock('Smoking', data.patient?.smoking_status);
  historyBlock('Alcohol', data.patient?.alcohol_use);
  y += 2;

  // Latest vitals
  const vitalEntries = Object.entries(data.metrics) as [MetricType, HealthMetric][];
  if (vitalEntries.length) {
    y = ensureSpace(doc, y, 20);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
    doc.text('Latest vitals', MARGIN, y); y += 5;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    vitalEntries.forEach(([type, m]) => {
      y = ensureSpace(doc, y, 6);
      const spec = METRIC_SPEC[type];
      doc.setTextColor(MUTED); doc.text(spec.label, MARGIN, y);
      doc.setTextColor(INK);
      doc.text(`${formatMetric(m)} ${m.unit}  (${new Date(m.taken_at).toLocaleDateString()})`, MARGIN + 45, y);
      y += 5;
    });
    y += 4;
  }

  // Appointments
  if (data.appointments.length) {
    y = ensureSpace(doc, y, 20);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
    doc.text(`Appointments (${data.appointments.length})`, MARGIN, y); y += 5;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    data.appointments.slice(0, 50).forEach((a) => {
      y = ensureSpace(doc, y, 10);
      doc.setTextColor(INK);
      doc.text(`${new Date(a.scheduled_at).toLocaleString()}`, MARGIN, y);
      doc.text(`Dr. ${a.doctor?.full_name ?? '—'}`, MARGIN + 50, y);
      doc.setTextColor(MUTED);
      doc.text(`${a.status} · ${a.mode}`, PAGE_W - MARGIN, y, { align: 'right' });
      y += 5;
    });
    y += 4;
  }

  // Prescriptions
  if (data.prescriptions.length) {
    y = ensureSpace(doc, y, 20);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
    doc.text(`Prescriptions (${data.prescriptions.length})`, MARGIN, y); y += 5;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    data.prescriptions.slice(0, 100).forEach((rx) => {
      y = ensureSpace(doc, y, 16);
      doc.setTextColor(INK);
      doc.setFont('helvetica', 'bold');
      doc.text(`${new Date(rx.issued_at).toLocaleDateString()} · Dr. ${rx.doctor?.full_name ?? '—'}`, MARGIN, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      if (rx.diagnosis) {
        doc.setTextColor(MUTED);
        y = wrap(doc, `Diagnosis: ${rx.diagnosis}`, MARGIN, y, PAGE_W - MARGIN * 2);
      }
      doc.setTextColor(INK);
      rx.medications.forEach((m) => {
        y = ensureSpace(doc, y, 6);
        y = wrap(doc, `  • ${m.name} — ${m.dosage}, ${m.frequency}, ${m.duration}`,
          MARGIN, y, PAGE_W - MARGIN * 2);
      });
      y += 3;
    });
  }

  footer(doc, 'Doctor Cares · personal medical record · keep confidential');
  return doc;
}

export async function downloadMedicalRecordPdf(data: MedicalRecordData): Promise<void> {
  const doc = await medicalRecordPdf(data);
  const name = (data.profile?.full_name ?? 'patient').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  const date = new Date().toISOString().slice(0, 10);
  doc.save(`medical-record-${date}-${name}.pdf`);
}
