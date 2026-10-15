import fs from "fs/promises";
import path from "path";
import { MainDashboard } from "@/components/MainDashboard";

export default async function Page() {
  const backendDir = path.join(process.cwd(), "express-backend");

  let serverCode = "";
  let vercelJson = "";
  let packageJson = "";
  let envExample = "";
  let knowledgeCode = "";
  let readmeMarkdown = "";

  try {
    serverCode = await fs.readFile(path.join(backendDir, "server.js"), "utf-8");
    vercelJson = await fs.readFile(path.join(backendDir, "vercel.json"), "utf-8");
    packageJson = await fs.readFile(path.join(backendDir, "package.json"), "utf-8");
    envExample = await fs.readFile(path.join(backendDir, ".env.example"), "utf-8");
    knowledgeCode = await fs.readFile(path.join(backendDir, "focusFlowKnowledge.js"), "utf-8");
    readmeMarkdown = await fs.readFile(path.join(backendDir, "README.md"), "utf-8");
  } catch (err) {
    console.error("Error reading express-backend files:", err);
  }

  const appUrl = (process.env.APP_URL || "https://focusflow-bot.vercel.app").replace(/\/+$/, "");

  return (
    <MainDashboard
      serverCode={serverCode}
      vercelJson={vercelJson}
      packageJson={packageJson}
      envExample={envExample}
      knowledgeCode={knowledgeCode}
      readmeMarkdown={readmeMarkdown}
      appUrl={appUrl}
    />
  );
}
