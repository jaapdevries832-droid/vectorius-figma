# AI Persona Testing Guide

Use this guide to generate magic links that allow AI agents (like ChatGPT) to log into your Vercel preview app as different test personas.

---

## Quick Start

```powershell
# Generate a token for Maya (student)
npx dotenv -e .env.local -- npx tsx scripts/generate-persona-token.ts `
  --user-id "860b887a-521d-42b9-a8c9-308144fc0e64" `
  --persona "maya-7th-grader" `
  --role "student" `
  --base-url "https://vectorius-figma-git-lesson-51-jaap-de-vries-projects.vercel.app"
```

Copy the magic link and give it to ChatGPT!

---

## Test Personas

### Student: Maya (7th Grade Female)

| Field | Value |
|-------|-------|
| Email | `maya.test@vectorius.local` |
| User UID | `860b887a-521d-42b9-a8c9-308144fc0e64` |
| Role | `student` |
| Persona ID | `maya-7th-grader` |

**Generate token:**
```powershell
npx dotenv -e .env.local -- npx tsx scripts/generate-persona-token.ts `
  --user-id "860b887a-521d-42b9-a8c9-308144fc0e64" `
  --persona "maya-7th-grader" `
  --role "student" `
  --base-url "https://YOUR-VERCEL-PREVIEW-URL.vercel.app"
```

---

### Parent: Sarah (Maya's Parent)

| Field | Value |
|-------|-------|
| Email | `sarah.test@vectorius.local` |
| User UID | `09345bb5-e880-441f-88b1-d39ca655d6c3` |
| Role | `parent` |
| Persona ID | `sarah-parent` |

**Generate token:**
```powershell
npx dotenv -e .env.local -- npx tsx scripts/generate-persona-token.ts `
  --user-id "09345bb5-e880-441f-88b1-d39ca655d6c3" `
  --persona "sarah-parent" `
  --role "parent" `
  --base-url "https://YOUR-VERCEL-PREVIEW-URL.vercel.app"
```

---

### Advisor: Michael (Math Advisor)

| Field | Value |
|-------|-------|
| Email | `michael.test@vectorius.local` |
| User UID | `8bab11ff-be97-4a6e-b38b-e8224932bb96` |
| Role | `advisor` |
| Persona ID | `michael-advisor` |

**Generate token:**
```powershell
npx dotenv -e .env.local -- npx tsx scripts/generate-persona-token.ts `
  --user-id "8bab11ff-be97-4a6e-b38b-e8224932bb96" `
  --persona "michael-advisor" `
  --role "advisor" `
  --base-url "https://YOUR-VERCEL-PREVIEW-URL.vercel.app"
```

---

## ChatGPT Prompts

### For Student Persona (Maya)

```
Go to [MAGIC_LINK_URL] and explore the student dashboard as Maya, a 7th grade female student.

Please:
1. Navigate through all available sections (dashboard, assignments, schedule, skills, achievements)
2. Try interacting with any clickable elements
3. Note any UX issues, confusing elements, or things that don't work
4. Report what works well and what could be improved

Format your response as:
- **What Works Well**: List positive observations
- **UX Issues**: List problems with severity (minor/medium/major)
- **Suggestions**: List improvement ideas
```

### For Parent Persona (Sarah)

```
Go to [MAGIC_LINK_URL] and explore the parent dashboard as Sarah, a parent of a 7th grade student.

Please:
1. Navigate through all available sections (dashboard, children overview, reports, notes)
2. Check if you can see your child's (Maya's) information
3. Note any UX issues, confusing elements, or things that don't work
4. Report what works well and what could be improved

Format your response as:
- **What Works Well**: List positive observations
- **UX Issues**: List problems with severity (minor/medium/major)
- **Suggestions**: List improvement ideas
```

### For Advisor Persona (Michael)

```
Go to [MAGIC_LINK_URL] and explore the advisor dashboard as Michael, a math advisor who mentors students.

Please:
1. Navigate through all available sections (dashboard, students, assignments, curriculum, schedule)
2. Check if you can see your assigned student's (Maya's) information
3. Try any advisor-specific actions (creating assignments, viewing progress, etc.)
4. Note any UX issues, confusing elements, or things that don't work

Format your response as:
- **What Works Well**: List positive observations
- **UX Issues**: List problems with severity (minor/medium/major)
- **Suggestions**: List improvement ideas
```

---

## Token Options

| Option | Description | Default |
|--------|-------------|---------|
| `--user-id` | Supabase User UID (required) | - |
| `--persona` | Persona name for logging | `test-persona` |
| `--role` | User role (student/parent/advisor) | `student` |
| `--ttl` | Token lifetime in hours | `24` |
| `--base-url` | Your Vercel preview URL | `http://localhost:3000` |

**Example with all options:**
```powershell
npx dotenv -e .env.local -- npx tsx scripts/generate-persona-token.ts `
  --user-id "860b887a-521d-42b9-a8c9-308144fc0e64" `
  --persona "maya-7th-grader" `
  --role "student" `
  --ttl 48 `
  --base-url "https://vectorius-figma-git-lesson-51-jaap-de-vries-projects.vercel.app"
```

---

## Troubleshooting

### "Missing SUPABASE_SERVICE_ROLE_KEY"
Make sure `.env.local` contains the service role key from Supabase Dashboard → Settings → API.

### "User not found"
The User UID is incorrect. Go to Supabase → Authentication → Users and copy the correct UID.

### "Token has already been used"
Each token is single-use. Generate a new one with the same command.

### "Persona testing is disabled in production"
This is intentional! Magic links only work on Vercel Preview deployments, not production.

### Magic link redirects to login page
1. Check that the user has a `profiles` record with the correct role
2. Check that `SUPABASE_SERVICE_ROLE_KEY` is set in Vercel Preview environment
3. Make sure Vercel has been redeployed after adding the env variable

### ChatGPT says "I can't access that URL"
Make sure you're using ChatGPT Plus with browsing/agent mode enabled. The free version cannot browse websites.

---

## Security Notes

- Magic links only work on **Preview** deployments (blocked in production)
- Tokens are **single-use** and expire after 24 hours (configurable)
- The `SUPABASE_SERVICE_ROLE_KEY` is never exposed to the browser
- Test users should use fake emails (`.local` domain) and isolated test data
