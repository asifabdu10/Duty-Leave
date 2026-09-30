import { useMemo, useState } from "react";
import {
  Clipboard,
  Check,
  Download,
  FileText,
  GraduationCap,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  UserRound,
  Building2,
  CalendarDays,
  Send,
  Users,
  AlertCircle,
  PencilLine
} from "lucide-react";
import { jsPDF } from "jspdf";

const HOD_DEPARTMENTS = [
  "Department of Computer Science & Engineering, Carmel College of Engineering and Technology",
  "Department of Electrical and Electronics Engineering, Carmel College of Engineering and Technology",
  "Department of Civil Engineering, Carmel College of Engineering and Technology",
  "Department of Mechanical Engineering, Carmel College of Engineering and Technology"
];

const DEPARTMENTS = [
  "Computer Science & Engineering",
  "Electrical and Electronics Engineering",
  "Civil Engineering",
  "Mechanical Engineering",
  "Other"
];

const initialForm = {
  senderName: "",
  senderDepartment: "Computer Science & Engineering",
  semesterClass: "",
  hodName: "",
  hodDepartment: "",
  dates: "",
  purpose: "",
  students: [""]
};

function Field({ label, icon: Icon, required = false, children, hint }) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
        {Icon && <Icon size={16} className="text-slate-500" />}
        {label}
        {required && <span className="text-red-500">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

function App() {
  const [form, setForm] = useState(initialForm);
  const [generated, setGenerated] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);

  const validStudents = useMemo(
    () => form.students.map((s) => s.trim()).filter(Boolean),
    [form.students]
  );

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const updateStudent = (index, value) => {
    setForm((current) => ({
      ...current,
      students: current.students.map((s, i) => (i === index ? value : s))
    }));
  };

  const addStudent = () => {
    setForm((current) => ({ ...current, students: [...current.students, ""] }));
  };

  const removeStudent = (index) => {
    setForm((current) => {
      const next = current.students.filter((_, i) => i !== index);
      return { ...current, students: next.length ? next : [""] };
    });
  };

  const generate = async () => {
    setError("");
    setCopied(false);

    const required = [
      form.senderName,
      form.senderDepartment,
      form.semesterClass,
      form.dates,
      form.purpose
    ];

    if (required.some((value) => !value.trim())) {
      setError("Please complete all fields marked with *.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Generation failed.");
      }

      setGenerated(data.text);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyText = async () => {
    if (!generated) return;
    await navigator.clipboard.writeText(generated);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const downloadPdf = async () => {
    if (!generated.trim()) return;

    setPdfLoading(true);
    try {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const margin = 20;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const contentWidth = pageWidth - margin * 2;
      const lineHeight = 7;
      const lines = generated.split(/\r?\n/);

      pdf.setProperties({
        title: "Duty Leave Application",
        subject: "CCET Duty Leave Application",
        author: form.senderName || "CCET Duty Leave AI"
      });

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(12);

      let y = margin;

      for (const paragraph of lines) {
        const wrapped = paragraph.trim()
          ? pdf.splitTextToSize(paragraph, contentWidth)
          : [""];

        for (const line of wrapped) {
          if (y + lineHeight > pageHeight - margin) {
            pdf.addPage();
            y = margin;
          }

          pdf.text(line, margin, y);
          y += lineHeight;
        }

        if (paragraph.trim() === "") {
          y += 2;
        }
      }

      const safeName = (form.senderName || "duty-leave-application")
        .trim()
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase();

      pdf.save(`${safeName || "duty-leave-application"}-duty-leave.pdf`);
    } catch (err) {
      setError(err.message || "Unable to create the PDF.");
    } finally {
      setPdfLoading(false);
    }
  };

  const reset = () => {
    setForm({ ...initialForm, students: [""] });
    setGenerated("");
    setError("");
    setCopied(false);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/10 p-2.5">
              <GraduationCap size={25} />
            </div>
            <div>
              <p className="text-lg font-bold tracking-tight">Duty Leave AI</p>
              <p className="text-xs text-slate-400">Carmel College of Engineering and Technology</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 sm:flex">
            <Sparkles size={14} />
            Gemini AI
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8 lg:px-8 lg:py-10">
        <div className="mb-8 max-w-3xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">
            <FileText size={14} />
            Universal Application Formatter
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Generate a formal duty-leave application.
          </h1>
          <p className="mt-3 text-slate-500">
            Generate with Gemini, edit the final letter yourself, then download the edited version as a PDF.
          </p>
        </div>

        <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft sm:p-7">
            <div className="mb-7 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Application details</h2>
                <p className="mt-1 text-sm text-slate-500">Fields marked * are required. HOD and student details are optional.</p>
              </div>
              <button
                onClick={reset}
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Reset
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Sender name" icon={UserRound} required>
                  <input
                    value={form.senderName}
                    onChange={(e) => update("senderName", e.target.value)}
                    placeholder="e.g. Asif Abdulla P A"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none transition focus:border-slate-500 focus:bg-white focus:ring-4 focus:ring-slate-100"
                  />
                </Field>

                <Field label="Sender department" icon={Building2} required>
                  <select
                    value={form.senderDepartment}
                    onChange={(e) => update("senderDepartment", e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none transition focus:border-slate-500 focus:bg-white focus:ring-4 focus:ring-slate-100"
                  >
                    {DEPARTMENTS.map((department) => (
                      <option key={department}>{department}</option>
                    ))}
                  </select>
                </Field>

                <Field
                  label="Semester / Class"
                  icon={GraduationCap}
                  required
                  hint="Custom text is allowed, e.g. S7 CSE A, S5 EEE B."
                >
                  <input
                    value={form.semesterClass}
                    onChange={(e) => update("semesterClass", e.target.value)}
                    placeholder="e.g. S7 CSE A"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none transition focus:border-slate-500 focus:bg-white focus:ring-4 focus:ring-slate-100"
                  />
                </Field>
              </div>

              <div className="border-t border-slate-100 pt-6">
                <div className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900">
                  <Send size={16} />
                  Recipient / HOD
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                    Optional
                  </span>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="HOD name" icon={UserRound} hint="Leave empty if you do not want to specify an HOD.">
                    <input
                      value={form.hodName}
                      onChange={(e) => update("hodName", e.target.value)}
                      placeholder="e.g. Dr. Sujithra MS"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none transition focus:border-slate-500 focus:bg-white focus:ring-4 focus:ring-slate-100"
                    />
                  </Field>

                  <Field label="HOD department" icon={Building2} hint="Optional. Select only when HOD details are provided.">
                    <select
                      value={form.hodDepartment}
                      onChange={(e) => update("hodDepartment", e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none transition focus:border-slate-500 focus:bg-white focus:ring-4 focus:ring-slate-100"
                    >
                      <option value="">Not specified</option>
                      {HOD_DEPARTMENTS.map((department) => (
                        <option key={department}>{department}</option>
                      ))}
                    </select>
                  </Field>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-6">
                <div className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900">
                  <CalendarDays size={16} />
                  Leave details
                </div>

                <div className="space-y-5">
                  <Field label="Date(s)" required hint='Natural text is allowed, such as "10th and 11th September 2026".'>
                    <input
                      value={form.dates}
                      onChange={(e) => update("dates", e.target.value)}
                      placeholder="10th and 11th September 2026"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none transition focus:border-slate-500 focus:bg-white focus:ring-4 focus:ring-slate-100"
                    />
                  </Field>

                  <Field label="Reason / purpose" required>
                    <textarea
                      value={form.purpose}
                      onChange={(e) => update("purpose", e.target.value)}
                      rows={4}
                      placeholder="e.g. Web development and design for Sparkz 2k26"
                      className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none transition focus:border-slate-500 focus:bg-white focus:ring-4 focus:ring-slate-100"
                    />
                  </Field>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-6">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                      <Users size={16} />
                      Student list
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                        Optional
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      {validStudents.length} student{validStudents.length === 1 ? "" : "s"} added
                    </p>
                  </div>
                  <button
                    onClick={addStudent}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                  >
                    <Plus size={15} />
                    Add student
                  </button>
                </div>

                <div className="space-y-2.5">
                  {form.students.map((student, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        value={student}
                        onChange={(e) => updateStudent(index, e.target.value)}
                        placeholder={`Student ${index + 1} name`}
                        className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none transition focus:border-slate-500 focus:bg-white focus:ring-4 focus:ring-slate-100"
                      />
                      <button
                        onClick={() => removeStudent(index)}
                        aria-label={`Remove student ${index + 1}`}
                        className="rounded-xl border border-slate-200 px-3 text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <div className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  <AlertCircle className="mt-0.5 shrink-0" size={18} />
                  <span>{error}</span>
                </div>
              )}

              <button
                onClick={generate}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-slate-900/10 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    Generating application...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Generate with Gemini
                  </>
                )}
              </button>
            </div>
          </section>

          <section className="xl:sticky xl:top-6 xl:self-start">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Letter preview & editor</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Edit the generated content before copying or downloading it.
                </p>
              </div>
              {generated && (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={copyText}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                  >
                    {copied ? <Check size={15} /> : <Clipboard size={15} />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                  <button
                    onClick={downloadPdf}
                    disabled={pdfLoading}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {pdfLoading ? (
                      <RefreshCw size={15} className="animate-spin" />
                    ) : (
                      <Download size={15} />
                    )}
                    {pdfLoading ? "Creating PDF..." : "Download PDF"}
                  </button>
                </div>
              )}
            </div>

            <div className="mb-2 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs text-slate-500">
              <PencilLine size={15} />
              <span>
                The text below is editable. Your PDF will contain the edited version.
              </span>
            </div>

            <div className="print-area letter-paper min-h-[620px] rounded-3xl border border-slate-200 bg-white p-5 shadow-soft sm:p-8">
              {generated ? (
                <textarea
                  value={generated}
                  onChange={(e) => setGenerated(e.target.value)}
                  spellCheck="true"
                  aria-label="Editable duty leave application"
                  className="min-h-[570px] w-full resize-y border-0 bg-transparent text-[15px] leading-7 text-slate-800 outline-none focus:ring-0"
                />
              ) : (
                <div className="flex min-h-[550px] flex-col items-center justify-center text-center">
                  <div className="mb-5 rounded-2xl bg-slate-100 p-4 text-slate-600">
                    <FileText size={30} />
                  </div>
                  <h3 className="font-bold text-slate-900">No application generated yet</h3>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">
                    Fill in the form and click “Generate with Gemini” to create your formal duty-leave application.
                  </p>
                </div>
              )}
            </div>

            {generated && (
              <div className="no-print mt-3 grid gap-2 sm:grid-cols-2">
                <button
                  onClick={generate}
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  <RefreshCw size={16} />
                  Regenerate
                </button>
                <button
                  onClick={downloadPdf}
                  disabled={pdfLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  <Download size={16} />
                  Download edited PDF
                </button>
              </div>
            )}
          </section>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-6 text-center text-xs text-slate-400 lg:px-8">
          Universal Duty Leave AI Formatter • CCET • Gemini-powered
        </div>
      </footer>
    </div>
  );
}

export default App;
