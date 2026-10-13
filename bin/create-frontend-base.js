#!/usr/bin/env node
import { promises as fs } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import readline from "node:readline";
import process from "node:process";

const templateDir = fileURLToPath(new URL("../template", import.meta.url));
const isPretty = Boolean(process.stdout.isTTY && process.stderr.isTTY);

function paint(code, text) {
  return isPretty ? `\x1b[${code}m${text}\x1b[0m` : text;
}

const bold = (text) => paint("1", text);
const cyan = (text) => paint("36", text);
const green = (text) => paint("32", text);
const red = (text) => paint("31", text);
const dim = (text) => paint("2", text);

function ok(message) {
  console.log(`${green("✓")} ${message}`);
}

function fail(message) {
  console.error(`${red("✗")} ${message}`);
}

function question(text, hint) {
  return `${cyan("◆")} ${text}${hint ? ` ${dim(hint)}` : ""}`;
}

function banner() {
  console.log("");
  console.log(bold(cyan("frontend-base")));
  console.log(dim("Scaffold a Preact + TypeScript + Rollup project"));
  console.log("");
}

function argDir() {
  return process.argv[2] && !process.argv[2].startsWith("-") ? process.argv[2] : null;
}

function argTitle() {
  return process.argv[3] || null;
}

function gitAuthor() {
  try {
    const name = execFileSync("git", ["config", "user.name"], { encoding: "utf8" }).trim();
    const email = execFileSync("git", ["config", "user.email"], { encoding: "utf8" }).trim();

    return email ? `${name} <${email}>` : name;
  } catch {
    return null;
  }
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

  return (prompt) => {
    if (pipedLines) {
      const answer = index < pipedLines.length ? pipedLines[index++] : null;
      console.log(`${prompt}${answer === null ? "" : answer}`);
      return Promise.resolve(answer);
    }

    return new Promise((resolve) => rl.question(prompt, (answer) => resolve(answer.trim())));
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
    const answer = await ask(question("Project name:", ""));

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

  const answer = await ask(question("App title:", `(${name})`));

  return answer === null || !answer ? name : answer;
}

async function resolveDescription(ask) {
  const answer = await ask(question("Description:", "(enter to keep default)"));

  return answer === null || !answer ? null : answer;
}

async function resolveAuthor(ask) {
  const fallback = gitAuthor();
  const answer = await ask(question("Author:", fallback ? `(${fallback})` : "(optional)"));

  return answer === null || !answer ? fallback : answer;
}

async function askBool(ask, text, fallback) {
  const hint = fallback ? "(Y/n)" : "(y/N)";
  const answer = await ask(question(text, hint));

  if (answer === null || !answer) {
    return fallback;
  }

  if (/^y(es)?$/i.test(answer)) {
    return true;
  }

  if (/^no?$/i.test(answer)) {
    return false;
  }

  return askBool(ask, text, fallback);
}

async function resolveOptions(ask) {
  const name = await resolveName(ask);
  const title = await resolveTitle(ask, name);
  const description = await resolveDescription(ask);
  const author = await resolveAuthor(ask);

  console.log("");

  return {
    name,
    title,
    description,
    author,
    git: await askBool(ask, "Initialize git repository?", true),
    install: await askBool(ask, "Install dependencies now?", false)
  };
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

async function applyPackageJson(targetDir, options) {
  const packagePath = path.join(targetDir, "package.json");
  const pkg = JSON.parse(await fs.readFile(packagePath, "utf8"));
  const fields = ["name"];

  pkg.name = options.name;

  if (options.description) {
    pkg.description = options.description;
    fields.push("description");
  }

  if (options.author) {
    pkg.author = options.author;
    fields.push("author");
  }

  await fs.writeFile(packagePath, JSON.stringify(pkg, null, 2) + "\n");

  return fields;
}

async function applyRollupConfig(targetDir, options) {
  const rollupPath = path.join(targetDir, "rollup.config.ts");
  const config = await fs.readFile(rollupPath, "utf8");
  const safeTitle = options.title.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

  await fs.writeFile(rollupPath, config.replace('title: "My App"', `title: "${safeTitle}"`));
}

async function applyReadme(targetDir, options) {
  const readmePath = path.join(targetDir, "README.md");
  const readme = await fs.readFile(readmePath, "utf8");

  await fs.writeFile(readmePath, readme.replace("# my-app", `# ${options.name}`));
}

function initGit(targetDir) {
  try {
    execFileSync("git", ["init"], { cwd: targetDir, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function installDeps(targetDir) {
  try {
    execFileSync("npm", ["install"], { cwd: targetDir, stdio: "inherit", shell: process.platform === "win32" });
    return true;
  } catch {
    return false;
  }
}

function nextSteps(targetDir, installed) {
  const relative = path.relative(process.cwd(), targetDir);

  console.log("");
  console.log(bold("Next steps"));
  console.log(`  cd ${relative || "."}`);

  if (!installed) {
    console.log("  npm install");
  }

  console.log("  npm run dev");
  console.log("");
}

async function main() {
  banner();

  const pipedLines = await readPipedLines();
  const rl = pipedLines ? null : readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = createAsker(rl, pipedLines);

  try {
    const options = await resolveOptions(ask);
    const targetDir = path.resolve(process.cwd(), argDir() || options.name);

    await assertEmptyDir(targetDir);
    await copyTemplate(targetDir);

    console.log("");
    ok(`Project created at ${path.relative(process.cwd(), targetDir) || "."}`);

    const fields = await applyPackageJson(targetDir, options);
    ok(`package.json → ${fields.join(", ")}`);

    await applyRollupConfig(targetDir, options);
    ok(`rollup.config.ts → title`);

    await applyReadme(targetDir, options);
    ok("README.md → title");

    if (options.git) {
      if (initGit(targetDir)) {
        ok("git repository initialized");
      } else {
        fail("git not found, repository not initialized");
      }
    }

    let installed = false;

    if (options.install) {
      console.log("");
      installed = installDeps(targetDir);

      if (!installed) {
        fail("npm install failed, run it manually");
      }
    }

    nextSteps(targetDir, installed);
  } finally {
    if (rl) {
      rl.close();
    }
  }
}

main().catch((error) => {
  fail(error.message);
  process.exit(1);
});
