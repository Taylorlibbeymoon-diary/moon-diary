# Caring for Moon Diary

A gentle guide to looking after your app yourself. You don't need to remember any of this. Come back to it whenever you need it.

Live app: **https://taylorlibbeymoon-diary.github.io/moon-diary/**

---

## 1. The most important things

- **Your diary lives only on your phone**, inside the Moon Diary app on your home screen. It isn't on GitHub, and it isn't in this folder.
- **Never delete the Moon Diary icon from your home screen** without saving a keepsake first. On iPhone, deleting a home-screen app also deletes everything stored inside it.
- **Clearing Safari's history and website data** can also remove your diary.
- **Save a keepsake regularly.** Your garden offers one quietly each month. Save it to **iCloud Drive** so a copy lives off your phone.
- **This project's code is public on GitHub.** Your entries never are, but any words you type into the files in this folder (like `content/prompts.js`) can be seen by anyone. Keep anything private out of them.

---

## 2. What's where

### Your words: edit these freely

| File | What it holds |
|---|---|
| `content/prompts.js` | The daily soft questions |
| `content/checkin.js` | The tap-able check-in words |
| `content/rhythms.js` | Cycle phase words, dosha descriptions, climates and season lines |
| `content/ayurveda.js` | Seasonal (ritucharya), daily (dinacharya), dosha, cycle and weather invitations |
| `content/letters.js` | The instructions Claude reads before writing your letters |
| `css/style.css` | The colours (at the very top) and the look |

### How the app works: change these with care (or ask Claude)

| File | What it does |
|---|---|
| `index.html` | Every screen of the app |
| `js/app.js` | Home screen, recording, review, check-in, updates |
| `js/garden.js` | Your garden (month, phase, mood) |
| `js/settings-screen.js` | The "your rhythms" page |
| `js/db.js` | Saving to your phone's private storage |
| `js/recorder.js` | Camera and microphone |
| `js/rhythms.js` | Cycle day and season maths |
| `js/ayurveda.js` | Choosing ayurvedic invitations |
| `js/learning.js` | Questions that adapt, and gentle noticings |
| `js/weather.js` | Optional weather |
| `js/claude.js` | Talking to Claude for letters |
| `js/letters.js` | The letters pages and the "before anything leaves your phone" screen |
| `js/keepsake.js`, `js/zip.js` | Saving and bringing back keepsakes |
| `js/today-screen.js` | The "today's rhythm" page |
| `sw.js` | Lets the app open offline, and brings updates to your phone |
| `manifest.webmanifest`, `icons/` | The app's name and moon icon on your home screen |

---

## 3. Changing your words

1. Open the file in any text editor. TextEdit works, but choose **Format → Make Plain Text** first.
2. Change the words inside the quotes `"like this"`.
3. Keep these the same, or the app may stop working:
   - the quote marks around each piece of text
   - the comma at the end of each line or item
   - the short names on the left, like `mood:` or `dry:`
4. If your words need a straight quote `"` inside them, use curly quotes `“ ”` or an apostrophe `’` instead.

Each content file has its own instructions at the top.

---

## 4. Seeing a change on your Mac before publishing

1. Open **Terminal**, then type `cd ` (with a space after it) and drag the **Moon Diary** folder onto the window. Press **Return**.
2. Start a small local web server:

   ```bash
   python3 -m http.server 8000
   ```

3. In your browser, go to **http://localhost:8000**.
4. When you're finished, go back to Terminal and press **Control-C**.

If something looks broken or blank, undo your last change (see section 7) and try again.

---

## 5. Publishing a change to your phone

**Step 1: bump the version number in two places.** This tells phones to fetch the fresh files. Both numbers must match.

- In `sw.js`: `const CACHE = "moon-diary-v12";` → change `v12` to `v13`
- In `js/app.js`: `const APP_VERSION = 12;` → change `12` to `13`

**Step 2: save and send to GitHub.** In Terminal, inside the Moon Diary folder:

```bash
git add -A
```

```bash
git commit -m "Describe your change here"
```

```bash
git push
```

**Step 3: wait a minute or two,** then open Moon Diary on your phone with signal. It refreshes itself the next time you're on the home screen. The bottom of your garden shows the version, so you can check the new number arrived.

You can always ask Claude instead: *"Please publish my changes to Moon Diary."*

---

## 6. Your Claude key (for letters)

- **Where it lives:** only on your phone, in **your rhythms → Claude letters**.
- **Costs:** each letter is roughly a few cents. You can see your usage and add credit at **console.anthropic.com** (Billing and Usage).
- **If a key stops working** (it expired, or the account needs credit), the letter screen will say so gently. Make a new key and paste it in.
- **If a key might have leaked:** delete it at **console.anthropic.com → API keys**, then make a new one. Choose **Default Workspace** when creating it.
- **Keys are never** sent anywhere except Anthropic, and never put in keepsakes.

---

## 7. If something goes wrong

**The app looks old, or a new feature is missing.**
Check the version at the bottom of your garden. If it's behind, swipe Moon Diary away in the app switcher and open it again with signal.

**I edited a file and now it's broken.**
In Terminal, inside the Moon Diary folder, this puts one file back the way it was at the last save. Replace `content/prompts.js` with your file's name:

```bash
git checkout -- content/prompts.js
```

**I published something broken.**
This shows the history of saved changes:

```bash
git log --oneline
```

Then this undoes the most recent saved change:

```bash
git revert HEAD
```

Then publish again with `git push`, after bumping the version number (section 5).

**Recording says it needs permission.**
On your iPhone, go to **Settings → Apps → Safari → Camera** (and **Microphone**) and choose **Ask** or **Allow**.

**Seeing what's happening inside the app on your phone.**
On the Mac, open Safari → **Settings → Advanced** and tick **Show features for web developers**. Connect your iPhone with a cable. On the iPhone, turn on **Settings → Apps → Safari → Advanced → Web Inspector**. Then, in Mac Safari, the **Develop** menu lists your iPhone and Moon Diary.

---

## 8. Moving to a new phone

1. On your old phone: **your rhythms → save everything → Save keepsake → Save to Files → iCloud Drive**.
2. On your new phone: open the live app in Safari, then **Share → Add to Home Screen**.
3. Open Moon Diary, go to **your rhythms → bring back a keepsake**, and choose the file from iCloud Drive.
4. Add your Claude key again if you use letters. Keys aren't in keepsakes.

Your monthly keepsakes can be brought back one after another. Nothing is ever doubled.

---

## 9. Asking Claude for help

Claude remembers this project's main decisions between conversations. Helpful things to mention:

- what you see, and which screen you're on
- the version number at the bottom of your garden
- whether it happens on your phone, your Mac, or both

For example: *"In Moon Diary version 11, the check-in doesn't appear after I keep a recording on my iPhone."*

---

## 10. A few words, explained

- **PWA**: a website that can be added to your home screen and behave like an app.
- **Service worker** (`sw.js`): a small helper that keeps a copy of the app on your phone so it opens offline.
- **IndexedDB**: your phone's private storage, where your entries, recordings and letters live.
- **Git**: keeps a history of every change to the code, so anything can be undone.
- **GitHub Pages**: the free service that puts the app's code on the web at a secure https address.
- **Keepsake**: a .zip file holding your moments, check-ins, letters and settings, plus a readable page.
- **API key**: a private password that lets Moon Diary talk to Claude, billed to your Anthropic account.
