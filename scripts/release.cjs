/**
 * release.cjs
 * ──────────────────────────────────────────────────────────────────────
 * One-click release for StockLite.
 *
 * Usage:
 *   npm run release            → bumps patch (1.0.2 → 1.0.3), builds & publishes
 *   npm run release -- minor   → bumps minor (1.0.2 → 1.1.0), builds & publishes
 *   npm run release -- major   → bumps major (1.0.2 → 2.0.0), builds & publishes
 *   npm run release -- 1.2.5   → sets exact version 1.2.5, builds & publishes
 *
 * Prerequisites:
 *   Set the GH_TOKEN environment variable with a GitHub Personal Access Token
 *   that has "repo" scope. You only need to do this once:
 *
 *   [PowerShell — permanent for your user]:
 *     [System.Environment]::SetEnvironmentVariable("GH_TOKEN", "ghp_xxxx", "User")
 *
 *   [PowerShell — current session only]:
 *     $env:GH_TOKEN = "ghp_xxxx"
 *
 * What it does:
 *   1. Validates GH_TOKEN is set
 *   2. Bumps version in package.json (and package-lock.json via npm)
 *   3. Commits the version bump + creates a git tag
 *   4. Runs tsc && vite build && electron-builder --publish always
 *   5. Pushes the commit + tag to GitHub
 *   6. electron-builder auto-creates the GitHub Release and uploads the installer
 *
 * That's it — your clients will see the update automatically.
 * ──────────────────────────────────────────────────────────────────────
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, "..");
const PKG_PATH = path.join(ROOT, "package.json");

function run(cmd, opts = {}) {
  console.log(`\n  ▸ ${cmd}\n`);
  execSync(cmd, {
    cwd: ROOT,
    stdio: "inherit",
    env: { ...process.env },
    ...opts,
  });
}

function readPkg() {
  return JSON.parse(fs.readFileSync(PKG_PATH, "utf-8"));
}

function bumpVersion(current, type) {
  const [major, minor, patch] = current.split(".").map(Number);
  switch (type) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
    default:
      return `${major}.${minor}.${patch + 1}`;
  }
}

function isExplicitVersion(str) {
  return /^\d+\.\d+\.\d+$/.test(str);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

(function main() {
  // 1. Check GH_TOKEN
  if (!process.env.GH_TOKEN) {
    console.error(`
  ╔═══════════════════════════════════════════════════════════════╗
  ║  ERROR: GH_TOKEN is not set!                                ║
  ║                                                             ║
  ║  Create a GitHub Personal Access Token (classic) with       ║
  ║  "repo" scope at: https://github.com/settings/tokens        ║
  ║                                                             ║
  ║  Then set it permanently:                                   ║
  ║  [System.Environment]::SetEnvironmentVariable(              ║
  ║    "GH_TOKEN", "ghp_xxxx", "User"                          ║
  ║  )                                                          ║
  ║                                                             ║
  ║  Or for current session only:                               ║
  ║    $env:GH_TOKEN = "ghp_xxxx"                              ║
  ╚═══════════════════════════════════════════════════════════════╝
`);
    process.exit(1);
  }

  // 2. Determine new version
  const arg = process.argv[2] || "patch";
  const pkg = readPkg();
  const oldVersion = pkg.version;
  let newVersion;

  if (isExplicitVersion(arg)) {
    newVersion = arg;
  } else if (["patch", "minor", "major"].includes(arg)) {
    newVersion = bumpVersion(oldVersion, arg);
  } else {
    console.error(`  ✗ Invalid argument: "${arg}". Use patch, minor, major, or an explicit version (e.g. 1.2.3)`);
    process.exit(1);
  }

  console.log(`
  ╔═══════════════════════════════════════════════════════════════╗
  ║  StockLite Release                                          ║
  ║  ${oldVersion}  →  ${newVersion}${" ".repeat(Math.max(0, 46 - oldVersion.length - newVersion.length))}║
  ╚═══════════════════════════════════════════════════════════════╝
  `);

  // 3. Bump version using npm (updates both package.json and package-lock.json)
  console.log("  ● Bumping version...");
  run(`npm version ${newVersion} --no-git-tag-version`);

  // 4. Git commit + tag
  console.log("  ● Committing version bump...");
  run(`git add package.json package-lock.json`);
  run(`git commit -m "release: v${newVersion}"`);
  run(`git tag v${newVersion}`);

  // 5. Build + Publish (electron-builder creates GitHub Release & uploads installer)
  console.log("  ● Building and publishing...");
  run(`tsc`);
  run(`npx vite build`);
  run(`npx electron-builder --publish always`);

  // 6. Push commit + tag to GitHub
  console.log("  ● Pushing to GitHub...");
  run(`git push`);
  run(`git push --tags`);

  console.log(`
  ╔═══════════════════════════════════════════════════════════════╗
  ║  ✓  Release v${newVersion} published successfully!${" ".repeat(Math.max(0, 34 - newVersion.length))}║
  ║                                                             ║
  ║  Your clients will receive the update automatically.        ║
  ╚═══════════════════════════════════════════════════════════════╝
  `);
})();
