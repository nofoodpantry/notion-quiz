exports.handler = async (event) => {

try {

const { items } = JSON.parse(event.body || "{}");

if (!Array.isArray(items) || !items.length) {

return { statusCode: 400, body: JSON.stringify({ error: "No items submitted" }) };

}

let score = 0;

const details = [items.map](http://items.map)((q) => {

const type = q.type || "";

let isCorrect = false;

if (type.toLowerCase().includes("mcq")) {

const ua = (q.userAnswer || "").trim();

const correct = (q.correct || "").trim();

if (!ua || !correct) isCorrect = false;

else if (ua.toUpperCase() === correct.toUpperCase()) isCorrect = true;

else if (Array.isArray(q.options)) {

const letters = ["A","B","C","D","E","F","G"];

const userIdx = letters.indexOf(ua.toUpperCase());

if (userIdx >= 0 && q.options[userIdx]?.trim() === correct.trim()) isCorrect = true;

}

} else {

const ua = (q.userAnswer || "").trim().toLowerCase();

const accept = (q.correct || "")

.split(",")

.map(s => s.trim().toLowerCase())

.filter(Boolean);

if (ua && accept.length) isCorrect = accept.includes(ua);

}

if (isCorrect) score += 1;

return { id: [q.id](http://q.id), correctAnswer: q.correct || "", userAnswer: q.userAnswer || "", isCorrect };

});

return {

statusCode: 200,

headers: { "Content-Type": "application/json" },

body: JSON.stringify({ total: items.length, score, details }),

};

} catch (e) {

return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: e.message }) };

}

};