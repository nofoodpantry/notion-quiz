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

function parseOptions(str) {

if (!str) return [];

return str.split(/n|
/i).map(s => s.trim()).filter(Boolean);

}

exports.handler = async (event) => {

const qs = event.queryStringParameters || {};

const echo = qs.echo === "1";

const nofilter = qs.nofilter === "1";

const debug = qs.debug === "1";

if (echo) {

return {

statusCode: 200,

headers: { "Content-Type": "application/json" },

body: JSON.stringify({ ok: true, echo: qs })

};

}

let debugInfo = {};

try {

const url = new URL(event.rawUrl);

const count = Math.max(1, Math.min(parseInt(url.searchParams.get("count") || "20", 10), 50));

let lectureIds = [];

if (!nofilter) {

const lectureTitlesParam = url.searchParams.get("lectureTitles");

if (lectureTitlesParam) {

lectureIds = lectureTitlesParam

.split(",")

.map(s => s.trim())

.map(key => LECTURE_ID_MAP[key])

.filter(Boolean);

}

}

const queryBody = { database_id: QUIZ_DB_ID, page_size: 100 };

if (!nofilter && lectureIds.length) {

queryBody.filter = {

or: [lectureIds.map](http://lectureIds.map)(id => ({

property: "Lecture",

relation: { contains: id },

})),

};

}

debugInfo.queryBody = queryBody;

let results = [];

let has_more = true;

let cursor = undefined;

while (has_more && results.length < 500) {

const res = await notion.databases.query({ ...queryBody, start_cursor: cursor });

results = results.concat(res.results);

has_more = res.has_more;

cursor = [res.next](http://res.next)_cursor;

}

const items = [results.map](http://results.map)((page) => {

const p = [page.properties](http://page.properties) || {};

const getText = (prop) => {

if (!prop) return "";

if (prop.type === "title") return [prop.title.map](http://prop.title.map)(t => t.plain_text).join("");

if (prop.type === "rich_text") return [prop.rich](http://prop.rich)_[text.map](http://text.map)(t => t.plain_text).join("");

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

for (let i = items.length - 1; i > 0; i--) {

const j = Math.floor(Math.random() * (i + 1));

[items[i], items[j]] = [items[j], items[i]];

}

const selected = items.slice(0, count);

const payload = { count: selected.length, items: selected };

if (debug) payload.debug = debugInfo;

return {

statusCode: 200,

headers: { "Content-Type": "application/json" },

body: JSON.stringify(payload),

};

} catch (e) {

const errorPayload = { error: e.message };

if (debug) errorPayload.debug = debugInfo;

return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify(errorPayload) };

}

};