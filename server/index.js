import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, "../dist");

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
    aiConfigured: Boolean(process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY)
  });
});

app.post("/api/generate", async (req, res) => {
  try {
    if (!ai && !process.env.GROQ_API_KEY) {
      return res.status(500).json({
        error: "AI API key is not configured. Add GEMINI_API_KEY or GROQ_API_KEY to your environment variables."
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
      students,
      applicationDate
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

    const today = new Date();
    const defaultTodayFormatted = today.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
    const finalApplicationDate = applicationDate?.trim() || defaultTodayFormatted;

    // Clean any accidental repetition of "Department of" or college name from the input:
    const rawRecipientDepartment = hodDepartment?.trim() || senderDepartment.trim();
    let cleanDept = rawRecipientDepartment.replace(/,\s*Carmel College of Engineering and Technology.*/gi, "").trim();
    while (/^Department of\s+/i.test(cleanDept)) {
      cleanDept = cleanDept.replace(/^Department of\s+/i, "").trim();
    }
    const recipientDepartmentLine = `Department of ${cleanDept}, Carmel College of Engineering and Technology`;

    const prompt = `Generate an official, formal Duty Leave Application for Carmel College of Engineering and Technology.

Use ONLY the information supplied below. Do not invent any extra facts, locations, event organizers, achievements, or details.

SENDER:
Name: ${senderName.trim()}
Department: ${senderDepartment.trim()}
Semester/Class: ${semesterClass.trim()}

APPLICATION GENERATION DATE (TODAY): ${finalApplicationDate}

RECIPIENT / HOD:
${hodName?.trim() ? `HOD Name: ${hodName.trim()}` : "Designation: Head of Department"}
Department: ${recipientDepartmentLine}

LEAVE DATE(S): ${dates.trim()}
REASON / PURPOSE (USER INPUT): ${purpose.trim()}
STUDENTS:
${
  studentNames.length
    ? studentNames.map((name, i) => `${i + 1}. ${name}`).join("\n")
    : "Only the applicant (single student)."
}

REASON/PURPOSE TRANSFORMATION:
Turn the user's Reason/Purpose into clear, meaningful, grammatically correct, professional wording suitable for an official college duty-leave application. Preserve original intent without adding unsupported facts.

SUBJECT:
Create a concise subject line:
Subject: Request for Duty Leave for [concise purpose derived from the supplied reason]

MANDATORY LETTER STRUCTURE AND EXACT SPACING:
Follow this exact structure and spacing. Sections separated by a blank line MUST have exactly one blank line between them:

From
${senderName.trim()}
${senderDepartment.trim()}
${semesterClass.trim()}

${finalApplicationDate}

To
${hodName?.trim() ? `${hodName.trim()}\nHead of Department` : "Head of Department"}
${recipientDepartmentLine}

Subject: Request for Duty Leave for [concise purpose derived from the supplied reason]

Respected Sir/Madam,

${
  studentNames.length > 1
    ? `I am writing to request duty leave for the following students from the Department of ${senderDepartment.trim()}:\n${studentNames.map((n, i) => `${i + 1}. ${n}`).join("\n")}\n\nWe missed our regular classes on ${dates.trim()} as we were actively engaged in [professionally rewritten reason/purpose].\n\nWe kindly request you to grant us duty leave for the mentioned date(s).`
    : `I missed my regular classes on ${dates.trim()} as I was actively engaged in [professionally rewritten reason/purpose].\n\nI kindly request you to grant me duty leave for the mentioned date.`
}

Thank you for your time and consideration.

Yours sincerely,

${senderName.trim()}
${semesterClass.trim()}, ${senderDepartment.trim()}

RULES:
1. SPACING:
   - "From" block: "From", Name, Department, and Semester/Class must be on consecutive lines without empty lines in between.
   - Leave EXACTLY ONE empty line after the From block, then output the Application Date (${finalApplicationDate}).
   - Leave EXACTLY ONE empty line after the Application Date, then output the "To" block.
   - "To" block: "To", HOD designation, and "${recipientDepartmentLine}" must be on consecutive lines without empty lines in between.
   - Leave EXACTLY ONE empty line before and after "Subject: ...".
   - Leave EXACTLY ONE empty line after "Respected Sir/Madam,".
   - Leave EXACTLY ONE empty line between the explanation paragraph and the request paragraph.
   - Leave EXACTLY ONE empty line before "Thank you for your time and consideration."
   - Leave EXACTLY ONE empty line before "Yours sincerely,".
   - Leave EXACTLY ONE empty line after "Yours sincerely," followed consecutively by the sender's Name and "Semester/Class, Department".
2. CONTENT:
   - In the "To" block, the recipient line must be EXACTLY: "${recipientDepartmentLine}". Do NOT repeat or duplicate "Department of" or "Carmel College of Engineering and Technology".
   - Place the supplied date(s) (${dates.trim()}) naturally in the body sentence ("I missed my regular classes on ...").
   - Do NOT use markdown, bold symbols (**), hashtags (##), asterisks, or placeholders.
   - Output ONLY the final plain-text application.
`;

    const candidateModels = [
      "gemini-3.5-flash-lite",
      "gemini-3.1-flash-lite",
      "gemini-3.5-flash"
    ];

    let text = "";
    let lastError = null;

    if (ai) {
      for (const model of candidateModels) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
              temperature: 0.25,
              maxOutputTokens: 1200
            }
          });
          const candidateText = response.text?.trim();
          if (candidateText) {
            text = candidateText;
            break;
          }
        } catch (err) {
          lastError = err;
          console.warn(`Model ${model} failed, trying next available model:`, err.message);
          continue;
        }
      }
    }

    // Optional Groq failover / alternative (14,400 free requests per day)
    if (!text && process.env.GROQ_API_KEY) {
      try {
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.25,
            max_tokens: 1200
          })
        });
        const groqData = await groqRes.json();
        text = groqData.choices?.[0]?.message?.content?.trim();
      } catch (groqErr) {
        console.error("Groq fallback error:", groqErr);
      }
    }

    if (!text) {
      return res.status(502).json({
        error: lastError?.message || "AI returned an empty response or quota was exceeded. Please try again in a few moments."
      });
    }

    res.json({ text });
  } catch (error) {
    console.error("AI generation error:", error);
    res.status(500).json({
      error: error?.message || "Unable to generate the application."
    });
  }
});

// Serve built frontend if dist exists (for full-stack deployment on Render/Railway/Heroku)
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    res.sendFile(path.join(distPath, "index.html"), (err) => {
      if (err) next();
    });
  });
}

export default app;

if (process.env.NODE_ENV !== "test" && !process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Duty Leave AI server running at http://localhost:${port}`);
  });
}
