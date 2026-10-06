const fs = require("fs");
const path = require("path");

const jsonPath = path.join(__dirname, "sleep-indicator-data.json");
const htmlPath = path.join(__dirname, "sleep-indicator-docs.html");
const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function typeLabel(type, selection) {
  const map = {
    cards: "כרטיסי בחירה",
    noise: "בחירה מרובה",
    batteries: "מחוונים",
    lead: "טופס פרטים"
  };
  const base = map[type] || type;
  if (selection === "single") return `${base} (בחירה אחת)`;
  if (selection === "multiple") return `${base} (אפשר כמה)`;
  return base;
}

function table(headers, rows) {
  const head = headers.map((h) => `<th>${esc(h)}</th>`).join("");
  const body = rows
    .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`)
    .join("\n");
  return `<table border="1" cellpadding="8" cellspacing="0" width="100%">
  <thead><tr>${head}</tr></thead>
  <tbody>
${body}
  </tbody>
</table>`;
}

function renderQuestion(q) {
  const bits = [];
  bits.push(`<h2>שאלה ${q.step}: ${esc(q.title)}</h2>`);
  bits.push(`<p><b>מזהה:</b> ${esc(q.id)} &nbsp;|&nbsp; <b>סוג:</b> ${esc(typeLabel(q.type, q.selection))}</p>`);
  if (q.helper) bits.push(`<p>${esc(q.helper)}</p>`);
  if (q.feeds && q.feeds.length) {
    bits.push(`<p><b>משפיע על:</b> ${esc(q.feeds.join(", "))}</p>`);
  }

  if (q.type === "cards") {
    bits.push(table(
      ["ערך", "תשובה", "אייקון", "משוב מיידי", "ציון"],
      q.options.map((opt) => [
        esc(opt.value),
        esc(opt.label),
        esc(opt.icon || ""),
        esc(opt.feedback || ""),
        opt.score != null ? String(opt.score) : "—"
      ])
    ));
    if (q.defaultScore != null) {
      bits.push(`<p><b>ציון ברירת מחדל:</b> ${esc(q.defaultScore)}</p>`);
    }
  }

  if (q.type === "noise") {
    bits.push(table(
      ["ערך", "משפט מהסביבה", "משקל"],
      q.options.map((opt) => [esc(opt.value), esc(opt.label), String(opt.weight)])
    ));
    bits.push(`<p><b>משוב בסימון:</b> ${esc(q.feedbackOnSelect)}</p>`);
    bits.push(`<p><b>משוב אחרי סינון:</b> ${esc(q.feedbackOnFilter)}</p>`);
  }

  if (q.type === "batteries") {
    bits.push(`<p><b>משוב:</b> ${esc(q.feedback)}</p>`);
    bits.push(`<p><b>טווח מחוון:</b> ${q.slider.min}–${q.slider.max} (ברירת מחדל ${q.slider.default})</p>`);
    bits.push(table(
      ["מזהה", "מצבר", "אייקון", "ברירת מחדל"],
      q.items.map((item) => [esc(item.id), esc(item.label), esc(item.icon), `${item.default}%`])
    ));
    bits.push("<h3>השפעת רעשי רקע על המצברים</h3>");
    bits.push(table(
      ["מצבר", "בסיס אחרי רעש", "הורדה לכל משפט", "מינימום"],
      Object.entries(q.noiseImpact).map(([id, rule]) => [
        esc(id),
        String(rule.base),
        String(rule.penaltyPerNoise),
        String(rule.min)
      ])
    ));
    bits.push(`<p><b>אזהרה אם נבחרו רעשי רקע:</b> ${esc(q.noiseWarning)}</p>`);
    bits.push("<p>ציון עמוד האנרגיה = ממוצע ששת המצברים.</p>");
  }

  if (q.type === "lead") {
    bits.push(`<p>${esc(q.helper)}</p>`);
    bits.push(table(
      ["שדה", "תווית", "דוגמה", "חובה", "שגיאה"],
      q.fields.map((field) => [
        esc(field.id),
        esc(field.label),
        esc(field.placeholder),
        field.required ? "כן" : "לא",
        `${esc(field.errorTitle)} — ${esc(field.errorMessage)}`
      ])
    ));
    bits.push(`<p><b>הערת פרטיות:</b> ${esc(q.privacyNote)}</p>`);
  }

  return bits.join("\n");
}

const stages = data.scoring.moonStages;
const stageById = Object.fromEntries(stages.map((s) => [s.id, s]));
const pillars = data.scoring.pillars;

const html = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>${esc(data.product.name)} — מסמך תוכן מלא</title>
  <style>
    body {
      font-family: Arial, Helvetica, sans-serif;
      color: #1f2937;
      line-height: 1.6;
      max-width: 900px;
      margin: 24px auto;
      padding: 0 24px 48px;
    }
    h1 { color: #312e81; font-size: 28px; }
    h2 { color: #4338ca; font-size: 20px; margin-top: 32px; border-bottom: 1px solid #c7d2fe; padding-bottom: 6px; }
    h3 { color: #4f46e5; font-size: 16px; margin-top: 22px; }
    p { margin: 8px 0 12px; }
    table { border-collapse: collapse; margin: 12px 0 20px; font-size: 14px; }
    th { background: #eef2ff; text-align: right; }
    td, th { vertical-align: top; }
    .meta { color: #4b5563; }
    .note { background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px 12px; }
  </style>
</head>
<body>
  <h1>${esc(data.product.name)} — ${esc(data.product.tagline)}</h1>
  <p class="meta">${esc(data.product.subtitle)}</p>
  <p class="note">מסמך תוכן מלא של השאלון, הניקוד ומסך התוצאות. אפשר להעלות את הקובץ לגוגל דרייב ולבחור Open with Google Docs.</p>

  <h2>תוכן עניינים</h2>
  <p>1. השאלון (10 שאלות)</p>
  <p>2. כללי ניקוד ומפת הירח</p>
  <p>3. מסך התוצאות</p>
  <p>4. טיפים לפי גיל</p>
  <p>5. פענוח התנגדויות</p>
  <p>6. פענוח חמשת עמודי התווך</p>

  <h1>1. השאלון</h1>
  ${data.questions.map(renderQuestion).join("\n")}

  <h1>2. כללי ניקוד ומפת הירח</h1>
  <p>כל ציון הוא בסולם 0–100. חמש דרגות ירח נקבעות לפי הסף הבא:</p>
  ${table(
    ["דרגה", "מזהה", "טווח ציון", "סטטוס", "אייקון"],
    stages.map((s) => [
      String(s.grade),
      esc(s.id),
      `${s.minScore}–${s.maxScore}`,
      esc(s.statusText),
      esc(s.emoji)
    ])
  )}
  <h3>חמשת העמודים</h3>
  ${table(
    ["מזהה", "שם מלא", "שם קצר", "שאלת מקור"],
    pillars.map((p) => [esc(p.id), esc(p.name), esc(p.shortName), esc(p.sourceQuestion)])
  )}
  <p>ציון רמת האנרגיה = ממוצע ששת המצברים בשאלה 7.</p>

  <h1>3. מסך התוצאות</h1>
  <p><b>תגית:</b> ${esc(data.results.headerBadge)}</p>
  <p><b>כותרת:</b> ${esc(data.results.title)}</p>
  <p>${esc(data.results.intro)}</p>
  <p><b>כותרת העמודים:</b> ${esc(data.results.axesTitle)}</p>
  <h3>${esc(data.results.gapVisualizer.title)}</h3>
  <p>${esc(data.results.gapVisualizer.body)}</p>
  ${table(
    ["צד", "תווית", "משפט"],
    [
      ["ציפייה חברתית", esc(data.results.gapVisualizer.expectation.label), esc(data.results.gapVisualizer.expectation.value)],
      ["ביולוגיה אמיתית", esc(data.results.gapVisualizer.biology.label), esc(data.results.gapVisualizer.biology.value)]
    ]
  )}
  <p><b>${esc(data.results.objectionCard.title)}</b></p>
  <p><b>${esc(data.results.microTip.title)}</b></p>
  <h3>${esc(data.results.cta.title)}</h3>
  <p>${esc(data.results.cta.body)}</p>
  <p><b>וואטסאפ:</b> ${esc(data.ui.buttons.whatsapp)}</p>
  <p><b>PDF:</b> ${esc(data.ui.buttons.pdf)} — ${esc(data.results.cta.pdfModalTitle)}: ${esc(data.results.cta.pdfModalBody)}</p>
  <h3>${esc(data.results.repairModal.title)}</h3>
  <p>${esc(data.results.repairModal.body)}</p>

  <h1>4. טיפים לפי גיל</h1>
  ${data.results.tipsByAge.map((tip) => `
    <h2>${esc(tip.label)}</h2>
    <p>${esc(tip.intro)}</p>
    <p><b>${esc(tip.tipLabel)}:</b> ${esc(tip.tip)}</p>
  `).join("\n")}

  <h1>5. פענוח התנגדויות</h1>
  ${data.results.objectionEmpathy.map((item) => `
    <h2>${esc(item.label)} (${esc(item.value)})</h2>
    <p>${esc(item.text)}</p>
  `).join("\n")}

  <h1>6. פענוח חמשת עמודי התווך</h1>
  <p>לכל עמוד יש חמישה נוסחי פענוח לפי דרגת הירח. בממשק מצורף גם הציון בפועל.</p>
  ${pillars.map((pillar) => {
    const texts = data.results.pillarInterpretations[pillar.id];
    const rows = stages.map((stage) => {
      const item = texts[stage.id];
      return [
        `${esc(stage.emoji)} ${esc(stage.statusText)}`,
        `${stage.minScore}–${stage.maxScore}`,
        `<b>${esc(item.title)}</b><br>${esc(item.body)}`
      ];
    });
    return `
      <h2>${esc(pillar.name)}</h2>
      ${table(["דרגת ירח", "טווח", "פענוח"], rows)}
    `;
  }).join("\n")}

  <p class="meta">${esc(data.product.footer)}</p>
</body>
</html>
`;

fs.writeFileSync(htmlPath, html, "utf8");
console.log("Wrote", htmlPath);
