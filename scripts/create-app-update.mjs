import { createClient } from "@supabase/supabase-js";
import { execSync } from "node:child_process";
import fs from "node:fs";

function readEnvFile(path) {
  if (!fs.existsSync(path)) return;

  fs.readFileSync(path, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .filter(line => !line.trim().startsWith("#"))
    .forEach(line => {
      const index = line.indexOf("=");
      if (index <= 0) return;

      const key = line.slice(0, index).trim();
      const value = line.slice(index + 1).trim().replace(/^"|"$/g, "");
      if (!process.env[key]) process.env[key] = value;
    });
}

readEnvFile(".env.local");
readEnvFile(".env");

function getArg(name, fallback = "") {
  const prefix = `--${name}=`;
  const item = process.argv.find(value => value.startsWith(prefix));
  return item ? item.slice(prefix.length).trim() : fallback;
}

function getGitValue(command, fallback = "") {
  try {
    return execSync(command, { encoding: "utf8" }).trim();
  } catch {
    return fallback;
  }
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL/VITE_SUPABASE_URL and SUPABASE_SECRET_KEY/SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const version = getArg("version", pkg.version || "0.0.0");
const type = getArg("type", "update");
const commit = getGitValue("git rev-parse --short HEAD");
const commitMessage = getGitValue("git log -1 --pretty=%s", "App update");
const title = getArg("title", commitMessage);
const message = getArg("message", commitMessage);
const now = new Date().toISOString();

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const payload = {
  title,
  message,
  version,
  is_active: true,
  image_url: "",
  legacy_data: {
    updateType: type,
    source: "push_script",
    commit,
  },
  published_at_utc: now,
  created_at: now,
  updated_at: now,
};

const { data, error } = await supabase
  .from("app_updates")
  .insert(payload)
  .select("id,title,version")
  .single();

if (error) {
  console.error(error.message);
  process.exit(1);
}

console.log(JSON.stringify({ status: "success", appUpdate: data }, null, 2));
