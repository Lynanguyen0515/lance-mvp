# Lance · Occasions MVP

Mobile-first prototype for hotel housekeeping: a ranked "next room" queue for housekeepers, plus guest **occasions** (anniversary, birthday…) that flow from the front desk to the room as a surprise checklist.

**Live demo:** https://lynanguyen0515.github.io/lance-mvp/ (open on a phone or in DevTools mobile view)

## Try it
1. Tap the avatar (top left) to switch between **Maya** (housekeeper) and **Jordan** (front desk). No PIN.
2. As Jordan, tap room **204 → Birthday → Add**. It jumps up Maya's queue.
3. As Maya, **Start 105**, tick the anniversary items (or mark one *Out of stock*), add a photo, **Complete**.
4. Open **104 → Can't enter → DND**. Tap **+1h** twice and it comes back.
5. Back as Jordan: see *Surprise set 📷* and any missing-item alerts.

Every action has **Undo** on the toast. **Reset demo data** is in the user switcher. All data is mock (`src/data.js`) and saved in localStorage.

## Run locally
```
npm install
npm run dev
```
