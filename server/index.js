import "dotenv/config";
import express from "express";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    aiConfigured: Boolean(process.env.GEMINI_API_KEY)
  });
});

app.post("/api/generate", async (req, res) => {
  try {
    if (!ai) {
      return res.status(500).json({
        error: "Gemini API key is not configured. Add GEMINI_API_KEY to your .env file."
      });
    }

    const {
      senderName,
      senderDepartment,
      semesterClass,
      hodName,
      hodDepartment,
      dates,
      purpose,
      students
    } = req.body || {};

    if (
      !senderName?.trim() ||
      !senderDepartment?.trim() ||
      !semesterClass?.trim() ||
      !dates?.trim() ||
      !purpose?.trim()
    ) {
      return res.status(400).json({
        error: "Please complete all fields marked with * before generating the application."
      });
    }

    const studentNames = Array.isArray(students)
      ? students.map((s) => String(s).trim()).filter(Boolean)
      : [];

    const prompt = `
Generate a formal Duty Leave Application for Carmel College of Engineering and Technology.

Use ONLY the information supplied below. Do not invent or assume any personal information, event details, dates, locations, organizers, achievements, roles, responsibilities, attendance facts, or HOD details.

SENDER
Name: ${senderName.trim()}
Department: ${senderDepartment.trim()}
Semester/Class: ${semesterClass.trim()}

RECIPIENT / HOD (OPTIONAL)
HOD Name: ${hodName?.trim() || "Not provided"}
HOD Department: ${hodDepartment?.trim() || "Not provided"}

LEAVE DATE(S)
${dates.trim()}

REASON / PURPOSE
Raw user input:
${purpose.trim()}

STUDENTS
${studentNames.length
  ? studentNames.map((name, i) => `${i + 1}. ${name}`).join("\n")
  : "No student list was provided."}

REASON/PURPOSE TRANSFORMATION:
The Reason/Purpose may be a short phrase, keywords, incomplete sentence, or informal description.
Turn it into one or more clear, meaningful, grammatically correct, professional sentences suitable for an official college duty-leave application.
Preserve the user's original meaning.
You may improve grammar, wording, and sentence structure.
Do NOT add unsupported facts such as event dates, locations, organizers, achievements, duties, roles, or technical details.
Do not change or reinterpret the supplied date wording.

SUBJECT:
Create a concise subject from the supplied Reason/Purpose.
Use this pattern:
Subject: Request for Duty Leave for [concise purpose]
Do not invent a purpose that is not supported by the user's input.

MANDATORY LETTER STRUCTURE:
Follow this structure EXACTLY and keep the sections in this order. Replace every [...] with the real value — never leave placeholders in the output:

From

${senderName.trim()}
${senderDepartment.trim()}
${semesterClass.trim()}

To

[HOD Name if provided; otherwise write "Head of Department" — never invent a name]
[HOD Department — include only when it was provided by the user]

Subject: Request for Duty Leave for [concise purpose derived from the supplied reason]

Respected Sir/Madam,

I am writing to request duty leave for the following students from the Department of ${senderDepartment.trim()}:
[numbered student list — include only when students were supplied; omit this sentence and the list entirely when no students are provided]

[One meaningful sentence explaining the absence. IMPORTANT: place the supplied Date(s) naturally in the middle of the body here, following the style "We missed our regular classes on [Date(s)] as we were actively engaged in [professionally rewritten reason/purpose]." Do not move the date into the heading or create a separate date heading.]

[One formal request sentence asking for duty leave for the mentioned date/period, based only on supplied information.]

Thank you for your time and consideration.

Yours sincerely,

${senderName.trim()}
${semesterClass.trim()}, ${senderDepartment.trim()}

RULES:
- The From section is MANDATORY and must appear FIRST. It must contain the sender's name, department, and semester/class exactly as supplied — never omit or skip it.
- The To section is mandatory. If HOD name is not provided, write "Head of Department"; never invent a person's name.
- Include HOD department only when it was supplied by the user.
- Do not add a college address, roll number, or any field not supplied by the user.
- Include the Subject generated from the supplied purpose.
- Include every supplied student name exactly, as a numbered list.
- If no students are supplied, omit the student-list sentence and numbered list entirely.
- Keep the supplied date wording unchanged and use it in the middle of the body paragraph.
- The date must not be replaced by a guessed or reformatted date.
- Use the professionally rewritten Reason/Purpose in the body.
- Keep the application concise, formal, and ready to submit.
- Do not use Markdown, bullet symbols, code fences, explanations, notes, or placeholders in the final output.
- Return only the final plain-text application.
`;

    const interaction = await ai.interactions.create({
      model: "gemini-3.8-flash",
      input: prompt,
      generation_config: {
        thinking_level: "low",
        temperature: 0.35,
        max_output_tokens: 1200
      }
    });

    const text = interaction.output_text?.trim();

    if (!text) {
      return res.status(502).json({
        error: "Gemini returned an empty response. Please try again."
      });
    }

    res.json({ text });
  } catch (error) {
    console.error("Gemini generation error:", error);
    res.status(500).json({
      error: error?.message || "Unable to generate the application."
    });
  }
});

app.listen(port, () => {
  console.log(`Duty Leave AI server running at http://localhost:${port}`);
});
