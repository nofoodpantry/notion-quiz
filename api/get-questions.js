// api/get-questions.js

const { Client } = require("@notionhq/client");

const notion = new Client({ auth: process.env.NOTION_TOKEN });

const QUIZ_DB_ID = process.env.NOTION_QUIZ_DB_ID;

const LECTURE_ID_MAP = {

L1: process.env.L1_ID,

L2: process.env.L2_ID,

L3: process.env.L3_ID,

L4: process.env.L4_ID,

L5: process.env.L5_ID,

L6: process.env.L6_ID,

L7: process.env.L7_ID,

L8: process.env.L8_ID,

};

// Safe options parser (no angle-bracket literals, no regex literals)

function parseOptions(str) {

if (!str) return [];

let s = String(str).replace(/rn/g, "n"); // normalize CRLF

// Build a RegExp for HTML tags without writing angle brackets directly

const lt = String.fromCharCode(60);  // "<"

const gt = String.fromCharCode(62);  // ">"

const tagRe = new RegExp(lt + "[[1]](" + gt + ")*" + gt, "g"); // matches any HTML tag like 
, 
, etc.

s = s.replace(tagRe, "n"); // turn tags into newlines

return s

.split("n")

.map(x => x.trim())

.filter(Boolean);

}

module.exports = async (req, res) => {

try {

const { count: countRaw, lectureTitles } = req.query || {};

const count = Math.max(1, Math.min(parseInt(countRaw || "20", 10), 50));

// Map L1–L8 titles to lecture page IDs via env vars

let lectureIds = [];

if (lectureTitles) {

lectureIds = lectureTitles

.split(",")

.map(s => s.trim())

.map(key => LECTURE_ID_MAP[key])

.filter(Boolean);

}

// Build Notion query

const queryBody = { database_id: QUIZ_DB_ID, page_size: 100 };

// Only add filter if we actually have mapped IDs

if (lectureIds.length > 0) {

queryBody.filter = {

or: [lectureIds.map](http://lectureIds.map)(id => ({

property: "Lecture",

relation: { contains: id },

})),

};

}

// Paginate up to ~500 rows

let results = [];

let has_more = true;

let cursor = undefined;

while (has_more && results.length < 500) {

const response = await notion.databases.query({ ...queryBody, start_cursor: cursor });

results = results.concat(response.results || []);

has_more = response.has_more;

cursor = [response.next](http://response.next)_cursor;

}

// Map to plain objects

const items = [results.map](http://results.map)(page => {

const p = [page.properties](http://page.properties) || {};

const getText = prop => {

if (!prop) return "";

if (prop.type === "title") return (prop.title || []).map(t => t.plain_text).join("");

if (prop.type === "rich_text") return ([prop.rich](http://prop.rich)_text || []).map(t => t.plain_text).join("");

if (prop.type === "select") return [prop.select](http://prop.select)?.name || "";

if (prop.type === "status") return prop.status?.name || "";

if (prop.type === "relation") return prop.relation?.map(r => [r.id](http://r.id)) || [];

if (prop.type === "number") return prop.number ?? "";

if (prop.type === "url") return prop.url || "";

return "";

};

return {

id: [page.id](http://page.id),

type: getText(p["Type"]),

question: getText(p["Question"]),

options: parseOptions(getText(p["Options"])),

correct: getText(p["Correct answer"]),

lectureIds: Array.isArray(p["Lecture"]?.relation)

? p["Lecture"].[relation.map](http://relation.map)(r => [r.id](http://r.id))

: [],

};

});

// Shuffle and take N

for (let i = items.length - 1; i > 0; i--) {

const j = Math.floor(Math.random() * (i + 1));

[items[i], items[j]] = [items[j], items[i]];

}

const selected = items.slice(0, count);

res.status(200).json({ count: selected.length, items: selected });

} catch (e) {

res.status(200).json({ error: e.message });

}

};
