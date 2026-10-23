# RadioDx Exam Module
Folder: `radiodx-exam/` → index.html, css/exam.css, js/exam.js, data/questions.json (self-contained, scoped, no build step).
**Deploy:** copy the folder into the root of repo Radiodx-website-new-1 (GitHub → Add file → Upload files, keep folder structure) → Commit. Open `.../Radiodx-website-new-1/radiodx-exam/`.
**Integrate:** add `<a href="radiodx-exam/">Exams</a>` to your navigation. Existing pages are untouched.
**Add questions:** append objects to data/questions.json (types: single, multiple [all-or-nothing], numeric). Invalid entries are reported on load.
**Local test:** `python -m http.server` in the folder (file:// blocks fetch).
**Limits:** progress/theme use LocalStorage only (per browser, clearable, no login). Sample bank only.
