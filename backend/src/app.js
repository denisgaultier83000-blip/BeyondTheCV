// backend/src/app.js  (ESM)

// Imports
import express from "express";
import morgan from "morgan";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { exec } from "child_process";
import { promisify } from "util";
import jwt from "jsonwebtoken";
import { z } from "zod";
import PDFDocument from "pdfkit";
import OpenAI from "openai";

// Si tu l'utilises encore ailleurs, garde-le. Sinon tu peux enlever.
import { orchestrateOrder } from "./orchestrator.js";

// --- DÉBUT ZONE DE DEBUG ---
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') }); // Assure-toi que dotenv est chargé ici

console.log("========================================");
console.log("🔍 DIAGNOSTIC ENVIRONNEMENT (TacticEdge)");
console.log("📂 Dossier d'exécution (CWD):", process.cwd());
console.log("🔑 OpenAI Key détectée ?", !!process.env.OPENAI_API_KEY); 
console.log("🔑 Gemini Key détectée ?", !!process.env.GEMINI_API_KEY);
console.log("========================================");
// --- FIN ZONE DE DEBUG ---

const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-2024-08-06";
const execAsync = promisify(exec);

// -----------------------------
// Validation request existante
// -----------------------------
export const GenerateRequest = z.object({
  meta: z.object({
    candidate_id: z.string(),
    primary_country: z.string(),
    secondary_countries: z.array(z.string()).default([]),
    target_roles: z.array(z.string()).min(1),
    industry: z.string().nullable().optional(),
    ats_max_pages: z.number().int().default(1),
    recruiter_max_pages: z.number().int().default(2),
    variant: z.enum(["ats", "human"]).default("human"),
  }),
  form: z.any(),
  job_posting_text: z.string().nullable().optional(),
  company_name: z.string().nullable().optional(),
  photo_provided: z.boolean().default(false),
  languages: z.array(z.string()).min(1).max(2),
});

// -----------------------------
// Helpers (questions IA)
// -----------------------------
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function safeStr(x) {
  return (typeof x === "string" ? x : "").trim();
}

function esc(s) {
  if (!s) return "";
  return String(s)
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/([{}_#%&$^])/g, "\\$1")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/[<>]/g, ""); // Basic cleanup for LaTeX safety
}

function buildCvTextFromForm(form) {
  // form = payload.form envoyé par le front
  const id = form?.identity || {};
  const headline = safeStr(form?.headline);
  const summary = safeStr(form?.summary);

  const lines = [];
  lines.push(`NAME: ${safeStr(id.fullName)}`);
  lines.push(`EMAIL: ${safeStr(id.email)}`);
  lines.push(`PHONE: ${safeStr(id.phone)}`);
  lines.push(`LOCATION: ${safeStr(id.location)}`);
  if (id.linkedin) lines.push(`LINKEDIN: ${safeStr(id.linkedin)}`);

  if (headline) lines.push(`\nHEADLINE:\n${headline}`);
  if (summary) lines.push(`\nSUMMARY:\n${summary}`);

  const exps = Array.isArray(form?.experiences) ? form.experiences : [];
  if (exps.length) {
    lines.push(`\nEXPERIENCE:`);
    exps.forEach((xp, idx) => {
      const company = safeStr(xp.company);
      const role = safeStr(xp.role);
      const start = safeStr(xp.start);
      const end = safeStr(xp.end) || "present";
      const desc = safeStr(xp.description);
      lines.push(`- (#${idx + 1}) ${role} at ${company} (${start} - ${end})`);
      if (desc) lines.push(`  Details: ${desc}`);
    });
  }

  const edu = Array.isArray(form?.education) ? form.education : [];
  if (edu.length) {
    lines.push(`\nEDUCATION:`);
    edu.forEach((e, idx) => {
      const school = safeStr(e.school);
      const degree = safeStr(e.degree);
      const start = safeStr(e.start);
      const end = safeStr(e.end);
      lines.push(
        `- (#${idx + 1}) ${degree ? degree + " — " : ""}${school} (${start || "?"} - ${end || "?"})`
      );
    });
  }

  const skills = Array.isArray(form?.skills) ? form.skills.map(safeStr).filter(Boolean) : [];
  if (skills.length) lines.push(`\nSKILLS:\n${skills.join(", ")}`);

  return lines.join("\n");
}

function questionsJsonSchema() {
  return {
    name: "interview_questions",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        questions: {
          type: "array",
          maxItems: 60,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              id: { type: "string" },
              category: { type: "string", enum: ["timeline", "role_scope", "impact", "context_culture"] },
              question: { type: "string" },
              probabilityScore: { type: "integer", minimum: 0, maximum: 100 },
              whyThisQuestion: { type: "string" },
              source: {
                type: "object",
                additionalProperties: false,
                properties: {
                  type: { type: "string", enum: ["experience", "education", "location", "name"] },
                  value: { type: "string" },
                  reference: { type: "string" },
                },
                required: ["type", "value", "reference"],
              },
            },
            required: ["id", "category", "question", "probabilityScore", "whyThisQuestion", "source"],
          },
        },
      },
      required: ["questions"],
    },
    strict: true,
  };
}

function postProcessQuestions(raw, limit = 40) {
  const arr = Array.isArray(raw?.questions) ? raw.questions : [];
  const seen = new Set();
  const cleaned = [];

  for (const q of arr) {
    const text = safeStr(q?.question);
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    cleaned.push({
      id: safeStr(q?.id) || `q_${cleaned.length + 1}`,
      category: q?.category || "role_scope",
      question: text,
      probabilityScore: clamp(Number(q?.probabilityScore ?? 0), 0, 100),
      whyThisQuestion: safeStr(q?.whyThisQuestion) || "Likely recruiter follow-up based on your CV.",
      source: {
        type: q?.source?.type || "experience",
        value: safeStr(q?.source?.value) || "CV",
        reference: safeStr(q?.source?.reference) || "CV",
      },
    });
  }

  cleaned.sort((a, b) => b.probabilityScore - a.probabilityScore);
  return cleaned.slice(0, limit);
}

// -----------------------------
// LaTeX Generator
// -----------------------------
function generateLatexSource(form, variant = "human") {
  const id = form?.identity || {};
  const headline = safeStr(form?.headline);
  const summary = safeStr(form?.summary);
  const skills = Array.isArray(form?.skills) ? form.skills : [];
  const experiences = Array.isArray(form?.experiences) ? form.experiences : [];
  const education = Array.isArray(form?.education) ? form.education : [];
  const languages = Array.isArray(form?.languages) ? form.languages : [];

  const isAts = variant === "ats";

  // Header & Preamble
  let tex = `\\documentclass[a4paper,10pt]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[margin=${isAts ? "1in" : "0.75in"}]{geometry}
\\usepackage{enumitem}
\\usepackage{hyperref}
\\usepackage{xcolor}
\\usepackage{titlesec}

${
  isAts
    ? `
% ATS Optimized Styling
\\hypersetup{colorlinks=true, linkcolor=black, urlcolor=black}
\\titleformat{\\section}{\\large\\bfseries\\uppercase}{}{0em}{}[\\titlerule]
`
    : `
% Human / Design Styling
\\definecolor{primary}{HTML}{1FA6A0} % Bleu canard
\\definecolor{secondary}{HTML}{F28C28} % Orange
\\hypersetup{colorlinks=true, linkcolor=primary, urlcolor=primary}
\\titleformat{\\section}{\\Large\\bfseries\\color{primary}}{}{0em}{}[\\titlerule]
`
}

\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{0.5em}

\\begin{document}

% --- HEADER ---
\\begin{center}
    {\\Huge \\textbf{${esc(id.fullName)}}} \\\\[0.5em]
    ${
      headline
        ? `{\\Large ${isAts ? "" : "\\color{secondary}"} ${esc(headline)}} \\\\[0.5em]`
        : ""
    }
    ${esc(id.location)} \\quad $\\bullet$ \\quad ${esc(id.email)} \\quad $\\bullet$ \\quad ${esc(id.phone)}
    ${id.linkedin ? `\\\\ \\href{${id.linkedin}}{LinkedIn Profile}` : ""}
\\end{center}

% --- SUMMARY ---
${
  summary
    ? `\\section*{Summary}
${esc(summary)}`
    : ""
}

% --- EXPERIENCE ---
\\section*{Experience}
${experiences
  .map((xp) => {
    const dateRange = `${esc(xp.start || "")} -- ${esc(xp.end || "Present")}`;
    return `
\\noindent \\textbf{${esc(xp.role)}} \\hfill ${dateRange} \\\\
\\textit{${esc(xp.company)}} ${xp.location ? `--- ${esc(xp.location)}` : ""}
${
  xp.description
    ? `\\begin{itemize}[noitemsep,topsep=0pt,leftmargin=*]
    \\item ${esc(xp.description).replace(/\n/g, "\n    \\item ")}
\\end{itemize}`
    : ""
}
`;
  })
  .join("\n")}

% --- EDUCATION ---
\\section*{Education}
${education
  .map((ed) => {
    const dateRange = `${esc(ed.start || "")} -- ${esc(ed.end || "")}`;
    return `\\noindent \\textbf{${esc(ed.school)}} \\hfill ${dateRange} \\\\
${esc(ed.degree)} ${ed.field ? `in ${esc(ed.field)}` : ""}`;
  })
  .join("\n\n")}

% --- SKILLS & LANGUAGES ---
\\section*{Skills}
\\textbf{Skills:} ${skills.map(esc).join(", ")} \\\\
${
  languages.length
    ? `\\textbf{Languages:} ${languages.map((l) => `${esc(l.name)} (${esc(l.level)})`).join(", ")}`
    : ""
}

\\end{document}
`;
  return tex;
}

function generatePrepLatexSource(prep, candidateName) {
  const safe = (s) => esc(s || "");
  
  let tex = `\\documentclass[a4paper,11pt]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[margin=1in]{geometry}
\\usepackage{xcolor}
\\usepackage{titlesec}
\\usepackage{enumitem}

\\definecolor{primary}{HTML}{1FA6A0}
\\definecolor{danger}{HTML}{B91C1C}
\\definecolor{warn}{HTML}{D97706}

\\titleformat{\\section}{\\Large\\bfseries\\color{primary}}{}{0em}{}[\\titlerule]
\\titleformat{\\subsection}{\\large\\bfseries}{}{0em}{}

\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{0.8em}

\\begin{document}

\\begin{center}
    {\\Huge \\textbf{Interview Preparation Report}} \\\\[0.5em]
    {\\Large For: ${safe(candidateName)}}
\\end{center}

\\section*{Salary Estimation}
\\textbf{Estimated Range:} ${safe(prep.salary_estimation?.range)} \\\\
${safe(prep.salary_estimation?.rationale)}

\\section*{Market Analysis}
${safe(prep.market_analysis)}

\\section*{Recruiter Attention Points (Red Flags)}
${(prep.red_flags || []).map(item => `
\\textbf{Q: ${safe(item.question)}} \\\\
\\textit{\\color{danger}Advice: ${safe(item.advice)}}
`).join("\\\\[1em]\n")}

${(prep.company_questions && prep.company_questions.length > 0) ? `
\\section*{Target Company Questions}
${prep.company_questions.map(item => `
\\textbf{Q: ${safe(item.question)}} \\\\
\\textit{Context: ${safe(item.advice)}}
`).join("\\\\[1em]\n")}
` : ""}

\\section*{Curiosity \\& Culture (Ice Breakers)}
${(prep.curiosity_questions || []).map(item => `
\\textbf{Q: ${safe(item.question)}} \\\\
\\textit{\\color{warn}Fact: ${safe(item.answer)}}
`).join("\\\\[1em]\n")}

${(prep.top_questions && prep.top_questions.length > 0) ? `
\\section*{Top 30 Probable Questions}
${prep.top_questions.map(item => `
\\noindent \\textbf{Q [${item.probabilityScore}\\%]: ${safe(item.question)}} \\\\
\\textit{Context: ${safe(item.whyThisQuestion)}}
`).join("\\\\[1em]\n")}
` : ""}

\\end{document}
`;
  return tex;
}

function prepJsonSchema() {
  return {
    name: "interview_prep_report",
    schema: {
      type: "object",
      properties: {
        red_flags: {
          type: "array",
          items: {
            type: "object",
            properties: {
              question: { type: "string", description: "The tough question a recruiter might ask" },
              advice: { type: "string", description: "Advice on how to answer or fix the issue" }
            },
            required: ["question", "advice"]
          }
        },
        company_questions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              question: { type: "string" },
              advice: { type: "string" }
            },
            required: ["question", "advice"]
          }
        },
        curiosity_questions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              question: { type: "string", description: "Trivia question based on location/school/name" },
              answer: { type: "string", description: "The answer to the trivia" }
            },
            required: ["question", "answer"]
          }
        },
        salary_estimation: {
          type: "object",
          properties: {
            range: { type: "string", description: "e.g. 50k-60k EUR" },
            rationale: { type: "string" }
          },
          required: ["range", "rationale"]
        },
        market_analysis: { type: "string", description: "Brief analysis of the job market for this role" }
      },
      required: ["red_flags", "curiosity_questions", "salary_estimation", "market_analysis"],
      additionalProperties: false
    },
    strict: true
  };
}

// -----------------------------
// App factory
// -----------------------------
export function createApp(opts = {}) {
  const app = express();

  // Check for pdflatex availability on startup
  exec("pdflatex --version", (err) => {
    if (err) {
      console.warn("⚠️  WARNING: pdflatex is NOT installed or not in PATH. PDF generation will fail.");
    } else {
      console.log("✅ pdflatex is installed and available.");
    }
  });

  let openai = opts.openai || null;

  function getOpenAI() {
    if (openai) return openai;
    if (!process.env.OPENAI_API_KEY) {
      throw new Error(
        "The OPENAI_API_KEY environment variable is missing or empty; either provide it, or instantiate the OpenAI client and pass it to createApp({ openai })"
      );
    }
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return openai;
  }

  app.use(express.json({ limit: "10mb" }));
  app.use(morgan("dev"));

  // -----------------------------
  // CORS (dev)
  // -----------------------------
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });

  // -----------------------------
  // JWT Auth (MVP)
  // -----------------------------
  const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

  function signToken(user) {
    return jwt.sign(user, JWT_SECRET, { expiresIn: "2h" });
  }

  function requireAuth(req, res, next) {
    const h = req.headers.authorization || "";
    const token = h.startsWith("Bearer ") ? h.slice(7) : null;

    console.log("AUTH HEADER:", h ? h.slice(0, 30) + "..." : "(none)");

    if (!token) return res.status(401).json({ error: "unauthorized" });

    try {
      req.user = jwt.verify(token, JWT_SECRET);
      return next();
    } catch (e) {
      console.log("JWT VERIFY FAILED:", e?.message);
      return res.status(401).json({ error: "unauthorized" });
    }
  }

  // -----------------------------
  // Routes
  // -----------------------------
  app.get("/health", (req, res) => res.json({ ok: true }));

  app.post("/auth/login", (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "missing_credentials" });

    const user = { id: "demo-user", email };
    const token = signToken(user);
    return res.json({ token });
  });

  app.get("/me", requireAuth, (req, res) => res.json(req.user));

  // POST /orders/:orderId/generate
  app.post("/orders/:orderId/generate", async (req, res) => {
    try {
      const parsed = GenerateRequest.safeParse(req.body || {});
      if (!parsed.success) return res.status(400).json({ error: "invalid_request" });

      const orderId = req.params.orderId;
      const { meta, form, job_posting_text, company_name, photo_provided, languages } = parsed.data;

      const result = await orchestrateOrder({
        orderId,
        meta,
        form,
        job_posting_text,
        company_name,
        photo_provided,
        languages,
      });

      return res.status(200).json(result);
    } catch (err) {
      console.error("/orders generate error:", err);
      return res.status(500).json({ error: "generate_failed" });
    }
  });

  // ✅ QUESTIONS IA (après génération CV)
  app.post("/cv/questions", requireAuth, async (req, res) => {
    try {
      const outputLanguage =
        safeStr(req.body?.output_language) || safeStr(req.body?.languages?.[0]) || "en";

      const form = req.body?.form || {};
      const cvText = buildCvTextFromForm(form);

      const system = [
        "You are a senior recruiter and interview coach.",
        "Analyze the CV and generate interview questions a recruiter is most likely to ask.",
        "You MUST avoid sensitive or discriminatory topics (race, religion, health, politics, etc.).",
        `Output language must strictly match: ${outputLanguage}.`,
        "You are NOT grading the candidate. You are estimating question probability.",
      ].join(" ");

      const user = [
        "CV TEXT:",
        cvText,
        "",
        "Generate the 30 most probable interview questions.",
        "Return JSON only, matching the schema.",
        "Cultural/context questions MUST be based on locations or names found in the CV. Do not invent entities not present.",
        "Do NOT include answers.",
      ].join("\n");

      const resp = await getOpenAI().responses.create({
        model: OPENAI_MODEL,
        input: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        text: {
          format: {
            type: "json_schema",
            ...questionsJsonSchema(),
          },
        },
      });

      const rawText = resp.output_text || "";
      let parsed;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        parsed = { questions: [] };
      }

      const questions = postProcessQuestions(parsed, 30);
      return res.status(200).json({ questions, language: outputLanguage });
    } catch (err) {
      console.error("cv/questions error:", err);
      return res.status(500).json({ error: "questions_failed" });
    }
  });

  // ✅ PREP GENERATION (JSON)
  app.post("/cv/prep", requireAuth, async (req, res) => {
    try {
      const form = req.body?.form || {};
      const meta = req.body?.meta || {};
      const cvText = buildCvTextFromForm(form);
      const company = req.body?.company_name || "Unknown Company";

      const system = `You are an expert recruiter and career coach. Analyze the candidate profile.
1. Identify inconsistencies (gaps, overlaps, weak skills vs seniority, lack of metrics). Generate challenging questions.
2. If a target company is provided ('${company}'), generate specific questions.
3. Identify entities (streets, schools, cities, historical names) in the CV and generate 'curiosity' questions (e.g. 'Who was George Sand?').
4. Estimate salary range (include currency) based on role and location.
5. Analyze job market state for this role.
Output JSON.`;

      const user = `CV TEXT:\n${cvText}\n\nTarget Role: ${meta.target_roles?.[0]}\nLocation: ${meta.primary_country}`;

      const resp = await getOpenAI().responses.create({
        model: OPENAI_MODEL,
        input: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        text: {
          format: {
            type: "json_schema",
            ...prepJsonSchema(),
          },
        },
      });

      const rawText = resp.output_text || "";
      const parsed = JSON.parse(rawText);
      return res.json(parsed);
    } catch (err) {
      console.error("cv/prep error:", err);
      return res.status(500).json({ error: "prep_failed" });
    }
  });

  // ✅ PREP PDF (LaTeX)
  app.post("/cv/prep/pdf", requireAuth, async (req, res) => {
    let tempDir = null;
    try {
      const prep = req.body?.prep || {};
      const candidateName = req.body?.candidate_name || "Candidate";

      // 1. Generate LaTeX source
      const texContent = generatePrepLatexSource(prep, candidateName);

      // 2. Create temp directory
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "prep-gen-"));
      const texPath = path.join(tempDir, "prep.tex");
      const pdfPath = path.join(tempDir, "prep.pdf");

      // 3. Write .tex file
      await fs.writeFile(texPath, texContent);

      // 4. Since pdflatex is not available, return the .tex file instead
      console.warn("pdflatex not available, returning .tex file instead of PDF");
      
      res.setHeader("Content-Type", "text/plain");
      res.setHeader("Content-Disposition", 'attachment; filename="interview_prep.tex"');
      res.send(texContent);

    } catch (err) {
      console.error("cv/prep/pdf error:", err);
      if (err.code === 127 || err.message.includes("pdflatex")) {
        return res.status(500).json({ error: "latex_compiler_not_found" });
      }
      if (!res.headersSent) res.status(500).json({ error: "pdf_failed" });
    } finally {
      if (tempDir) {
        fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      }
    }
  });

  // ✅ PDF via LaTeX (protégé)
  app.post("/cv/pdf", requireAuth, async (req, res) => {
    let tempDir = null;
    try {
      const form = req.body?.form || {};
      const variant = req.body?.meta?.variant || "human";

      // 1. Generate LaTeX source
      const texContent = generateLatexSource(form, variant);

      // 2. Create temp directory
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cv-gen-"));
      const texPath = path.join(tempDir, "cv.tex");
      const pdfPath = path.join(tempDir, "cv.pdf");

      // 3. Write .tex file
      await fs.writeFile(texPath, texContent);

      // 4. Since pdflatex is not available, return the .tex file instead
      console.warn("pdflatex not available, returning .tex file instead of PDF");
      
      res.setHeader("Content-Type", "text/plain");
      res.setHeader("Content-Disposition", `attachment; filename="cv_${variant}.tex"`);
      res.send(texContent);

    } catch (err) {
      console.error("cv/pdf error:", err);
      // Fallback error message if pdflatex is missing
      if (err.code === 127 || err.message.includes("pdflatex")) {
        return res.status(500).json({ error: "latex_compiler_not_found", details: "pdflatex is required on the server." });
      }
      if (!res.headersSent) res.status(500).json({ error: "pdf_failed" });
    } finally {
      if (tempDir) {
        // Cleanup temp files
        fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      }
    }
  });

  // ✅ TeX export (simple .tex generator)
  app.post("/cv/tex", requireAuth, async (req, res) => {
    try {
      const form = req.body?.form || {};
      const variant = req.body?.meta?.variant || "human";
      const tex = generateLatexSource(form, variant);

      res.setHeader("Content-Type", "text/plain");
      res.setHeader("Content-Disposition", 'attachment; filename="cv.tex"');
      return res.status(200).send(tex);
    } catch (err) {
      console.error("cv/tex error:", err);
      return res.status(500).json({ error: "tex_failed" });
    }
  });

  return app;
}
