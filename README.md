# CSSBB Cards

Flashcards and quizzes for the ASQ Certified Six Sigma Black Belt (CSSBB) exam, built as an
installable iPhone web app. It works offline, and each person's progress is stored only on
their own device.

**Live app:** `https://YOUR-USERNAME.github.io/cssbb-flashcards/`

## What's in this repository

| Path | What it is |
| --- | --- |
| `source/` | The flashcard workbook (`.xlsx`). **This is the only file you edit to change content.** Keep exactly one workbook here. |
| `tools/build_data.py` | Converts the workbook into `data/cards.json` and checks it for errors. |
| `.github/workflows/deploy.yml` | Runs the conversion and publishes the site every time you commit. |
| `data/cards.json` | The app's content, generated from the workbook. Don't edit by hand. |
| `index.html`, `app.js`, `styles.css` | The app itself. |
| `sw.js`, `manifest.webmanifest`, `icons/` | Offline support, Home Screen install, and app icons. |

## Updating the cards

1. Edit the workbook in Excel. Keep the sheet names (**Terms**, **Quiz Bank**, **Distractor Glossary**) and column headers as they are.
2. In this repository on github.com, open `source/`, delete the old workbook, and upload the new one. Commit.
3. Open the **Actions** tab. Within a minute or two you should see a green check next to **Build and publish**.
   - A red X means the workbook has a problem. Click the run, then the **build** job, then **Convert the workbook into app data** to see exactly which rows to fix. The live site is left unchanged until a build succeeds.
4. On the iPhone, open the app, close it, and open it again. New content downloads in the background on the first launch and appears on the next.

**Rules the build checks:** unique term and question IDs, a definition for every term, a valid
section name, difficulty from 1 to 5, a valid Term ID on every question, and six wrong answers
with explanations on every question.

**Keep IDs stable.** Each person's progress is saved against the term IDs (T001, T002, …). Never
reuse or renumber an ID. Give new terms the next unused number, such as T451.

## Notes

- Progress lives on each device. It is never uploaded. Users can back up and restore it from **Settings → Data and backup**.
- Installing to the Home Screen matters on iPhone: iOS can erase website data in a regular Safari tab after 7 days without a visit.
- Not affiliated with or endorsed by ASQ.
