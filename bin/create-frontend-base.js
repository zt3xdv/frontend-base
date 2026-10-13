#!/usr/bin/env node
import { promises as fs } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import readline from "node:readline";
import process from "node:process";

const templateDir = fileURLToPath(new URL("../template", import.meta.url));

function argDir() {
  return process.argv[2] && !process.argv[2].startsWith("-") ? process.argv[2] : null;
}

function argTitle() {
  return process.argv[3] || null;
}

async function readPipedLines() {
  if (process.stdin.isTTY) {
    return null;
  }

  const lines = [];
  const rl = readline.createInterface({ input: process.stdin });

  rl.on("line", (line) => lines.push(line));
  await new Promise((resolve) => rl.on("close", resolve));

  return lines;
}

function createAsker(rl, pipedLines) {
  let index = 0;

  return (question) => {
    if (pipedLines) {
      return Promise.resolve(index < pipedLines.length ? pipedLines[index++] : null);
    }

    return new Promise((resolve) => rl.question(question, (answer) => resolve(answer.trim())));
  };
}

function sanitizeName(input) {
  return input.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-_.]/g, "");
}

function isValidName(name) {
  return /^[a-z0-9-_][a-z0-9-_.]*$/.test(name) && name.length <= 214;
}

async function resolveName(ask) {
  let name = sanitizeName(argDir() || "");

  while (!isValidName(name)) {
    const answer = await ask("Project name: ");

    if (answer === null) {
      throw new Error("Project name required.");
    }

    name = sanitizeName(answer);
  }

  return name;
}

async function resolveTitle(ask, name) {
  const arg = argTitle();

  if (arg) {
    return arg;
  }

  const answer = await ask(`App title (${name}): `);

  if (answer === null || !answer) {
    return name;
  }

  return answer;
}

async function assertEmptyDir(targetDir) {
  try {
    const entries = await fs.readdir(targetDir);

    if (entries.length > 0) {
      throw new Error(`Directory ${targetDir} is not empty.`);
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}

async function copyTemplate(targetDir) {
  await fs.cp(templateDir, targetDir, {
    recursive: true,
    filter: (source) => !source.includes("node_modules")
  });
  await fs.rename(path.join(targetDir, "_gitignore"), path.join(targetDir, ".gitignore"));
}

async function applyOptions(targetDir, name, title) {
  const packagePath = path.join(targetDir, "package.json");
  const pkg = JSON.parse(await fs.readFile(packagePath, "utf8"));

  pkg.name = name;
  await fs.writeFile(packagePath, JSON.stringify(pkg, null, 2) + "\n");

  const rollupPath = path.join(targetDir, "rollup.config.ts");
  const rollupConfig = await fs.readFile(rollupPath, "utf8");
  const safeTitle = title.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

  await fs.writeFile(rollupPath, rollupConfig.replace('title: "My App"', `title: "${safeTitle}"`));
}

async function main() {
  const pipedLines = await readPipedLines();
  const rl = pipedLines ? null : readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = createAsker(rl, pipedLines);

  try {
    const name = await resolveName(ask);
    const title = await resolveTitle(ask, name);
    const targetDir = path.resolve(process.cwd(), argDir() || name);

    await assertEmptyDir(targetDir);
    await copyTemplate(targetDir);
    await applyOptions(targetDir, name, title);

    console.log(`\nDone. Next steps:\n`);
    console.log(`  cd ${argDir() || name}`);
    console.log(`  npm install`);
    console.log(`  npm run dev\n`);
  } finally {
    if (rl) {
      rl.close();
    }
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
