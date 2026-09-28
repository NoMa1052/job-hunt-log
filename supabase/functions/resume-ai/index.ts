// resume-ai: every AI action for Resume Studio.
// Secrets: ANTHROPIC_API_KEY (required), ANTHROPIC_MODEL (optional).
// Reads go through the caller's JWT so RLS applies; writes that users can't
// make themselves (usage log, match results, tailored copies) use the service role.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-5-5";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Monthly limits per action. 0 = not included in the plan.
const LIMITS: Record<string, Record<string, number>> = {
  free: { parse: 3, improve: 20, match: 5, tailor: 0, cover_letter: 0, insights: 0 },
  pro: { parse: 50, improve: 500, match: 300, tailor: 150, cover_letter: 150, insights: 30 },
};
const AI_ACTIONS = Object.keys(LIMITS.free);

const RESUME_SCHEMA = `{
  "contact": {"name": "", "email": "", "phone": "", "location": "", "links": [""]},
  "summary": "",
  "experience": [{"company": "", "title": "", "location": "", "start": "", "end": "", "bullets": [""]}],
  "education": [{"school": "", "degree": "", "field": "", "start": "", "end": "", "details": [""]}],
  "skills": [""],
  "projects": [{"name": "", "description": "", "bullets": [""]}]
}`;

const WRITING_RULES = `Writing rules: concise and specific. Lead bullets with strong verbs. Quantify results only when the source gives numbers; never invent metrics, employers, titles, dates, degrees, or skills. No filler phrases, no buzzwords, no em-dashes.`;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

class HttpError extends Error {
  constructor(public status: number, message: string, public extra: Record<string, unknown> = {}) { super(message); }
}

function parseJson(text: string) {
  const clean = text.replace(/```json|```/g, "").trim();
  const start = clean.search(/[\[{]/);
  const end = Math.max(clean.lastIndexOf("}"), clean.lastIndexOf("]"));
  if (start === -1 || end === -1) throw new HttpError(502, "The AI returned an unreadable response. Try again.");
  try { return JSON.parse(clean.slice(start, end + 1)); }
  catch { throw new HttpError(502, "The AI returned an unreadable response. Try again."); }
}

async function callClaude(system: string, content: unknown, maxTokens = 4000) {
  if (!ANTHROPIC_KEY) throw new HttpError(500, "AI isn't configured yet (missing ANTHROPIC_API_KEY).");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages: [{ role: "user", content }] }),
  });
  if (!res.ok) {
    console.error("Anthropic error", res.status, await res.text());
    throw new HttpError(502, "The AI request failed. Try again in a moment.");
  }
  const data = await res.json();
  const text = (data.content ?? []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n");
  return { text, usage: data.usage ?? { input_tokens: 0, output_tokens: 0 } };
}

async function monthlyCount(admin: SupabaseClient, userId: string, action: string) {
  const monthStart = new Date();
  monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0);
  const { count, error } = await admin.from("ai_usage").select("id", { count: "exact", head: true })
    .eq("user_id", userId).eq("action", action).gte("created_at", monthStart.toISOString());
  if (error) throw error;
  return count ?? 0;
}

async function getPlan(admin: SupabaseClient, userId: string) {
  const { data } = await admin.from("profiles").select("plan").eq("user_id", userId).maybeSingle();
  return (data?.plan === "pro" ? "pro" : "free") as "free" | "pro";
}

async function enforceLimit(admin: SupabaseClient, userId: string, action: string) {
  const plan = await getPlan(admin, userId);
  const limit = LIMITS[plan][action];
  if (limit === 0) throw new HttpError(402, "This is a Pro feature.", { code: "upgrade_required", action });
  const used = await monthlyCount(admin, userId, action);
  if (used >= limit) throw new HttpError(429, "Monthly limit reached.", { code: "limit_reached", action, used, limit, plan });
}

async function logUsage(admin: SupabaseClient, userId: string, action: string, usage: any) {
  await admin.from("ai_usage").insert({ user_id: userId, action, input_tokens: usage.input_tokens ?? 0, output_tokens: usage.output_tokens ?? 0 });
}

async function getResume(db: SupabaseClient, resumeId?: string, applicationResumeId?: string | null) {
  const id = resumeId ?? applicationResumeId;
  if (id) {
    const { data } = await db.from("resumes").select("*").eq("id", id).maybeSingle();
    if (data) return data;
  }
  const { data: def } = await db.from("resumes").select("*").eq("is_default", true).maybeSingle();
  if (def) return def;
  const { data: latest } = await db.from("resumes").select("*").is("application_id", null)
    .order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (!latest) throw new HttpError(400, "Add a resume first.", { code: "no_resume" });
  return latest;
}

async function getApplication(db: SupabaseClient, applicationId: string) {
  if (!applicationId) throw new HttpError(400, "application_id is required");
  const { data } = await db.from("applications").select("*").eq("id", applicationId).maybeSingle();
  if (!data) throw new HttpError(404, "That application couldn't be found.");
  if (!data.job_description?.trim()) throw new HttpError(400, "Paste the job description first.", { code: "no_job_description" });
  return data;
}

const jobBlock = (app: any) => `<job>\nCompany: ${app.company}\nPosition: ${app.position}\nLocation: ${app.location}\nHiring manager: ${app.hiring_manager || "unknown"}\n\nDescription:\n${String(app.job_description).slice(0, 15000)}\n</job>`;
const resumeBlock = (r: any) => `<resume>\n${JSON.stringify(r.content)}\n</resume>`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const db = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: { user }, error: userErr } = await db.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userErr || !user) return json({ error: "Your session expired. Sign in again." }, 401);

    const body = await req.json().catch(() => ({}));
    const action: string = body.action;

    if (action === "usage") {
      const plan = await getPlan(admin, user.id);
      const usage: Record<string, { used: number; limit: number }> = {};
      for (const a of AI_ACTIONS) usage[a] = { used: await monthlyCount(admin, user.id, a), limit: LIMITS[plan][a] };
      return json({ plan, usage });
    }

    if (!AI_ACTIONS.includes(action)) return json({ error: "Unknown action" }, 400);
    await enforceLimit(admin, user.id, action);

    // PARSE: uploaded PDF (from storage) or extracted text -> structured resume
    if (action === "parse") {
      const system = `You convert resumes into structured JSON. Return ONLY valid JSON matching this shape, no commentary:\n${RESUME_SCHEMA}\nCopy the candidate's facts faithfully. Clean up formatting and obvious typos, but do not rewrite or embellish. Use empty strings or empty arrays when a field is missing.`;
      let content: unknown;
      if (body.file_path) {
        if (!String(body.file_path).startsWith(`${user.id}/`)) throw new HttpError(403, "That file isn't yours.");
        if (!String(body.file_path).toLowerCase().endsWith(".pdf")) throw new HttpError(400, "Send Word files as extracted text.");
        const { data: file, error } = await db.storage.from("resumes").download(body.file_path);
        if (error || !file) throw new HttpError(404, "The uploaded file couldn't be found.");
        const bytes = new Uint8Array(await file.arrayBuffer());
        let bin = ""; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
        content = [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: btoa(bin) } },
          { type: "text", text: "Convert this resume to the JSON shape." },
        ];
      } else if (body.text?.trim()) {
        content = `Convert this resume to the JSON shape.\n<resume_text>\n${String(body.text).slice(0, 40000)}\n</resume_text>`;
      } else throw new HttpError(400, "Provide file_path or text");
      const { text, usage } = await callClaude(system, content);
      await logUsage(admin, user.id, action, usage);
      return json({ content: parseJson(text) });
    }

    // IMPROVE: rewrite one section (or one entry of a list section)
    if (action === "improve") {
      const resume = await getResume(db, body.resume_id);
      const section: string = body.section;
      if (!["summary", "experience", "education", "skills", "projects"].includes(section)) throw new HttpError(400, "Invalid section");
      const current = typeof body.index === "number" ? resume.content?.[section]?.[body.index] : resume.content?.[section];
      if (current === undefined) throw new HttpError(400, "That section couldn't be found. Save and try again.");
      const system = `You are an expert resume editor. Improve the given resume section. ${WRITING_RULES}\nReturn ONLY valid JSON with the exact same shape and keys as the input section: {"improved": <section>, "notes": ["short reason for each main change"]}.`;
      const prompt = `Target role: ${resume.target_role || "not specified"}\nFull resume for context:\n${resumeBlock(resume)}\n\nSection to improve (${section}${typeof body.index === "number" ? ` #${body.index}` : ""}):\n${JSON.stringify(current)}\n\nUser instruction: ${String(body.instruction ?? "").slice(0, 500) || "Make it sharper and more impactful."}`;
      const { text, usage } = await callClaude(system, prompt, 2500);
      await logUsage(admin, user.id, action, usage);
      return json(parseJson(text));
    }

    // MATCH: score a resume against the job description
    if (action === "match") {
      const app = await getApplication(db, body.application_id);
      const resume = await getResume(db, body.resume_id, app.resume_id);
      const system = `You are a recruiter screening a resume against a job description. Be honest and specific, not generous. Return ONLY valid JSON:\n{"score": <0-100 integer>, "summary": "one or two sentences", "strengths": [""], "missing_keywords": ["skills or terms in the job that are absent from the resume"], "suggestions": [{"section": "experience|summary|skills|projects", "original": "existing bullet or text, or empty if new", "suggested": "rewritten text", "why": ""}]}\nOnly suggest rewrites grounded in facts already on the resume. ${WRITING_RULES}`;
      const { text, usage } = await callClaude(system, `${jobBlock(app)}\n\n${resumeBlock(resume)}`);
      await logUsage(admin, user.id, action, usage);
      const result = parseJson(text);
      const score = Math.max(0, Math.min(100, Math.round(Number(result.score) || 0)));
      const { data: saved } = await admin.from("resume_matches").insert({ user_id: user.id, application_id: app.id, resume_id: resume.id, score, result }).select().single();
      return json({ ...result, score, match_id: saved?.id, resume_id: resume.id });
    }

    // TAILOR: create a job-specific copy linked to the application
    if (action === "tailor") {
      const app = await getApplication(db, body.application_id);
      const base = await getResume(db, body.resume_id, null);
      const system = `You tailor resumes to a specific job. Reorder and rewrite existing content to emphasize what this job values, mirror the job's language where truthful, and tighten the summary. ${WRITING_RULES}\nReturn ONLY valid JSON: {"content": <resume in the same shape as input>, "changes": ["short description of each change"]}`;
      const { text, usage } = await callClaude(system, `${jobBlock(app)}\n\n${resumeBlock(base)}`, 6000);
      await logUsage(admin, user.id, action, usage);
      const out = parseJson(text);
      const { data: created, error } = await admin.from("resumes").insert({
        user_id: user.id,
        title: `${base.title} for ${app.company || "this job"}`.slice(0, 100),
        target_role: (app.position || base.target_role || "").slice(0, 100),
        content: out.content,
        parent_resume_id: base.parent_resume_id ?? base.id,
        application_id: app.id,
      }).select().single();
      if (error) throw error;
      await admin.from("applications").update({ resume_id: created.id }).eq("id", app.id).eq("user_id", user.id);
      return json({ resume: created, changes: out.changes ?? [] });
    }

    // COVER LETTER: draft a new one or edit the user's draft
    if (action === "cover_letter") {
      const app = await getApplication(db, body.application_id);
      const resume = await getResume(db, body.resume_id, app.resume_id);
      const tone = ["warm", "formal", "direct"].includes(body.tone) ? body.tone : "warm";
      const draft = String(body.draft ?? "").trim();
      const system = `You write cover letters that sound like a real person, not a template. Tone: ${tone}. Under 300 words. Open with something specific to the company or role, connect 2 or 3 concrete experiences from the resume to the job's needs, and close with a clear, confident ask. Address the hiring manager by name if provided. ${WRITING_RULES}\nReturn ONLY valid JSON: {"cover_letter": "plain text with paragraph breaks"}`;
      const task = draft ? `Edit and improve this draft, keeping the writer's voice:\n<draft>\n${draft.slice(0, 8000)}\n</draft>` : "Write a new cover letter.";
      const { text, usage } = await callClaude(system, `${jobBlock(app)}\n\n${resumeBlock(resume)}\n\n${task}`, 2000);
      await logUsage(admin, user.id, action, usage);
      return json(parseJson(text));
    }

    // INSIGHTS: patterns across the user's saved job descriptions vs their resume
    if (action === "insights") {
      const { data: apps } = await db.from("applications").select("company, position, job_description")
        .neq("job_description", "").order("created_at", { ascending: false }).limit(25);
      if (!apps || apps.length < 3) throw new HttpError(400, "Add job descriptions to at least 3 applications first.", { code: "not_enough_data" });
      const resume = await getResume(db, body.resume_id, null);
      const jobs = apps.map((a, i) => `<job n="${i + 1}">${a.position} at ${a.company}\n${a.job_description.slice(0, 3000)}</job>`).join("\n");
      const system = `You analyze a job seeker's applications to find patterns. Return ONLY valid JSON:\n{"total_jobs": <n>, "top_skills": [{"skill": "", "job_count": <n>, "on_resume": true|false}], "gaps": [{"skill": "", "job_count": <n>, "advice": "how to address it honestly, e.g. surface related experience or learn it"}], "role_themes": [""], "recommendations": [""]}\nList up to 15 top_skills sorted by job_count. Count carefully. ${WRITING_RULES}`;
      const { text, usage } = await callClaude(system, `${jobs}\n\n${resumeBlock(resume)}`, 3000);
      await logUsage(admin, user.id, action, usage);
      return json(parseJson(text));
    }

    return json({ error: "Unhandled action" }, 400);
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message, ...e.extra }, e.status);
    console.error(e);
    return json({ error: "Something went wrong. Try again." }, 500);
  }
});
