# 🤖 Universal AI Prompt & Context Boilerplate
### Use this prompt to recreate, extend, or run ReviewLoop in ANY AI Tool:
> **Compatible with:** ChatGPT (Canvas/GPTs), Claude (Artifacts/Projects), Cursor (Composer), Lovable.dev, v0.dev, Bolt.new, Windsurf, Replit, or Copilot Workspace.

---

```markdown
You are a senior full-stack software engineer and learning-science specialist building ReviewLoop (Apex SRS) — an adaptive, domain-agnostic study pacing engine and Leitner Spaced Repetition (SRS) platform with a cognitive error taxonomy.

### Core Mission & Architecture
The app solves two foundational problems in high-stakes exam preparation:
1. Dynamic Chapter/Unit Pacing with Buffer Smoothing: Instead of static linear study plans that collapse after a missed day, dynamically calculate the daily pace using emergency buffer days (10–20%) so students never panic.
2. Cognitive Root-Cause Taxonomy & Leitner SRS: Errors are classified into 4 distinct pillars (Theory, Attention/Trap, Calculation/Execution, Time/Pacing). Missed items follow a 4-stage Leitner ladder (Same-Day -> 3 Days -> 7 Days -> Graduated) with Anti-Snowball daily caps to prevent card overload.

### Tech Stack
- Frontend: React 19 + TypeScript + Vite + Tailwind CSS v4
- Icons: Lucide React
- Date Math: date-fns
- Celebrations: canvas-confetti
- Persistence: LocalStorage (Local-First, privacy-preserving) + JSON/CSV/Anki TSV export

### Key Data Structures & Types
- StudyGoal: id, title, targetExamDate, startDate, studyDaysOfWeek, bufferPercent, dailyReviewCap, materials, mockExams
- Material: id, goalId, title, author, subject, unitType ('CHAPTER' | 'PAGE' | 'LESSON' | 'MODULE'), chapters
- Chapter: id, materialId, number, title, isCompleted, topicWeight (1..3)
- Question: id, materialId, chapterId, sourceRef, status ('CORRECT' | 'INCORRECT'), errorReason ('THEORY' | 'ATTENTION' | 'CALCULATION' | 'TIME'), srsStage, nextReviewDate, lastReviewedDate, intervalDays, subTags, notes
- MockExam: id, title, examDate, scoringType ('PERCENTAGE' | 'RAW_SCORE' | 'SCALED_SCORE' | 'CUSTOM'), totalScore, targetScore, maxScore, subjectBreakdowns

### Main Views to Support
1. Daily Cockpit Dashboard: 3 daily missions (New units, scheduled SRS reviews, question logging), focus timer, anti-snowball progress.
2. Sprint Pacing & Timeline View: Interactive runway projection, day-by-day buffer visualization, catch-up math.
3. Curriculum & Mock Exam Manager: Multi-material builder, inline chapter editor, universal mock exam scoring breakdowns.
4. Active Recall Review Deck: Leitner flashcards with scratchpad for blind recall before revealing notes.
5. Error Vault & Analytics Matrix: Radar comparison by subject, root-cause distribution chart, CSV/JSON/Anki export.

### UX Guidelines
- Clean, high-contrast modern UI supporting both Dark and Light themes.
- Domain agnostic: Dynamically extract custom subjects and assign deterministic aesthetic color palettes.
- Fast keyboard accessibility (Press 'Q' to log a question, 'C' for correct, 'E' for error).
- 100% responsive for desktop and mobile devices.
```

---

## 🚀 How to use in different platforms:

### In Cursor / Windsurf:
1. Put the `.cursorrules` in your project root.
2. Open Composer (<kbd>Cmd</kbd>+<kbd>I</kbd> or <kbd>Ctrl</kbd>+<kbd>I</kbd>).
3. Reference `@src/lib/pacingEngine.ts` or `@src/lib/srsEngine.ts` to add any custom feature.

### In Lovable.dev or Bolt.new:
1. Paste the prompt above into the initial project creation input.
2. The AI will generate the entire full-stack Vite + React structure instantly.

### In Claude Artifacts or ChatGPT Canvas:
1. Paste the prompt above and specify: *"Generate the modular React TypeScript components for ReviewLoop"*.
