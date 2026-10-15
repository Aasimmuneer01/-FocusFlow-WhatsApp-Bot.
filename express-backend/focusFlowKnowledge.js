/**
 * Verified FocusFlow Knowledge Base & Support Guidelines (CommonJS for Express)
 */

const FOCUSFLOW_APP_INFO = {
  name: "FocusFlow",
  installUrl: "https://noteshub9.vercel.app/",
  purpose: "Answer user questions about FocusFlow, guide users through installation and troubleshooting, and help report app or content issues.",
};

function getRelevantKnowledgeSnippet(query) {
  const q = String(query || "").toLowerCase();

  if (q.includes("install") || q.includes("download") || q.includes("link") || q.includes("website") || q.includes("get the app")) {
    return "TOPIC: INSTALLATION. Direct users to the official installation & download page: https://noteshub9.vercel.app/ (Explain that noteshub9 is the current supplied installation link for FocusFlow. Do not claim support for all devices unless verified).";
  }

  if (q.includes("pdf") || q.includes("notes") || q.includes("book") || q.includes("document") || q.includes("missing")) {
    return "TOPIC: MISSING CONTENT/PDF. Ask the user for specific details: Class, Subject, Chapter/Lesson, and the exact title of the missing PDF.";
  }

  if (q.includes("incorrect") || q.includes("wrong answer") || q.includes("mistake") || q.includes("typo") || q.includes("error in question")) {
    return "TOPIC: CONTENT ERROR / INCORRECT ANSWER. Ask for: Subject, Chapter name, the question details (or a screenshot), and what they believe the correct answer should be.";
  }

  if (q.includes("crash") || q.includes("not opening") || q.includes("freeze") || q.includes("black screen") || q.includes("bug") || q.includes("issue")) {
    return "TOPIC: APP TROUBLESHOOTING & BUGS. Ask what happens on launch (black screen, error message, instant close) and their device model and OS. Explain you will record the details provided.";
  }

  if (q.includes("thank") || q.includes("thx") || q.includes("bye") || q.includes("goodbye")) {
    return "TOPIC: COURTESY / CLOSING. Reply with a brief, friendly sign-off. Do not repeat greeting.";
  }

  if (q.match(/^(hi|hello|hey|greetings|start|hola)(\s|$|[!.?])/)) {
    return "TOPIC: GREETING. Give a brief, warm welcome from FocusFlow Support and ask how you can help them today.";
  }

  return "TOPIC: GENERAL SUPPORT. Help with FocusFlow questions, installation (https://noteshub9.vercel.app/), or reporting issues. If unclear, ask one short clarifying question.";
}

const FOCUSFLOW_BASE_INSTRUCTION = `You are FocusFlow Support on WhatsApp.
FocusFlow install link: https://noteshub9.vercel.app/ (current supplied installation link).

Guidelines:
- Keep replies friendly, natural, and concise (40-80 words, under 140 tokens).
- Use WhatsApp markdown (*bold* for links/key items).
- Reply specifically to the user's message. Never send a generic template.
- Do not invent fake ticket IDs, claim engineering was notified, or pretend you checked an account unless real.
- Do not claim iOS or all Android versions are supported without verification.`;

module.exports = {
  FOCUSFLOW_APP_INFO,
  getRelevantKnowledgeSnippet,
  FOCUSFLOW_BASE_INSTRUCTION,
};
