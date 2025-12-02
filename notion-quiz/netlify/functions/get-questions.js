import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const QUIZ_DB_ID = process.env.NOTION_QUIZ_DB_ID;

function parseOptions(str) {
  if (!str) return [];
  return str.split(/\n|<br>/i).map(s => s.trim()).filter(Boolean);
}

export async function handler(event) {
  try {
    const url = new URL(event.rawUrl);
    const count = Math.max(1, Math.min(parseInt(url.searchParams.get("count") || "20", 10), 50));
    const lectureIdsParam = url.searchParams.get("lectures");

    const filters = [];
    if (lectureIdsParam) {
      const lectures = lectureIdsParam.split(",").map(s => s.trim()).filter(Boolean);
      if (lectures.length) {
        filters.push({
          property: "Lecture",
          relation: { contains: lectures[0] }
        });
        for (let i = 1; i < lectures.length; i++) {
          filters.push({
            property: "Lecture",
            relation: { contains: lectures[i] }
          });
        }
      }
    }

    const queryBody = { database_id: QUIZ_DB_ID, page_size: 100 };
    if (filters.length === 1) queryBody.filter = filters[0];
    if (filters.length > 1) queryBody.filter = { or: filters };

    let results = [];
    let has_more = true;
    let cursor = undefined;
    while (has_more && results.length < 500) {
      const res = await notion.databases.query({ ...queryBody, start_cursor: cursor });
      results = results.concat(res.results);
      has_more = res.has_more;
      cursor = res.next_cursor;
    }

    const items = results.map((page) => {
      const props = page.properties || {};
      const getText = (p) => {
        if (!p) return "";
        if (p.type === "title") return p.title.map(t => t.plain_text).join("");
        if (p.type === "rich_text") return p.rich_text.map(t => t.plain_text).join("");
        if (p.type === "select") return p.select?.name || "";
        if (p.type === "status") return p.status?.name || "";
        if (p.type === "relation") return p.relation?.map(r => r.id) || [];
        if (p.type === "number") return p.number ?? "";
        if (p.type === "url") return p.url || "";
        return "";
      };

      const qType = getText(props["Type"]);
      const question = getText(props["Question"]);
      const optionsRaw = getText(props["Options"]);
      const correct = getText(props["Correct answer"]);
      const lectures = Array.isArray(props["Lecture"]?.relation)
        ? props["Lecture"].relation.map(r => r.id)
        : [];

      return {
        id: page.id,
        type: qType,
        question,
        options: parseOptions(optionsRaw),
        correct,
        lectureIds: lectures,
      };
    });

    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    const selected = items.slice(0, count);

    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ count: selected.length, items: selected }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
}