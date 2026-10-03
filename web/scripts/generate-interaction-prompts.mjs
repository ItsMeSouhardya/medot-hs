// Non-public helper. Fixed dictionary keys only; no arbitrary text/voice input.
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import nextEnv from "@next/env";
import { createServer } from "vite";
const web = fileURLToPath(new URL("../", import.meta.url));
const source = JSON.parse(await readFile(new URL("../src/data/interaction-prompts.json", import.meta.url), "utf8"));
const review = JSON.parse(await readFile(new URL("../src/data/interaction-prompts-review.json", import.meta.url), "utf8"));
const keys = ["move-closer", "mismatch", "match", "expired-match", "unavailable", "duplicate", "multiple-results", "scan-finished"];
const hash = value => createHash("sha256").update(value).digest("hex");
if (Object.keys(source).join(",") !== "en,bn,hi" || Object.values(source).some(prompts => Object.keys(prompts).join(",") !== keys.join(",") || Object.values(prompts).some(text => typeof text !== "string" || !text.trim() || text.length > 2000))) throw new Error("Invalid fixed prompt manifest");
const args = process.argv.slice(2);
if (args.length > 1 || args.some(arg => !["--check", "--generate"].includes(arg))) {
  console.error("Use --check or --generate. No text, model, language or voice arguments are accepted."); process.exitCode = 1;
} else {
  const approved = Object.keys(source).filter(language => review.reviews[language]?.scriptHash === hash(JSON.stringify(source[language])) && /^\d{4}-\d{2}-\d{2}T/.test(review.reviews[language]?.reviewedAt ?? ""));
  for (const language of Object.keys(source)) console.log(`${language}: ${approved.includes(language) ? "human review recorded" : "review pending"}; scriptHash ${hash(JSON.stringify(source[language]))}`);
  if (args[0] !== "--generate") console.log("Check only: no database/provider calls or audio writes.");
  else if (!approved.length) { console.log("No approved language scripts. No generation performed."); process.exitCode = 2; }
  else {
    let compiler, stage = "configuration";
    const nativeFetch = globalThis.fetch;
    try {
      nextEnv.loadEnvConfig(web);
      // Operator-only diagnostics expose status and known reason codes, never
      // request credentials, voice IDs, arbitrary response bodies or messages.
      globalThis.fetch = async (...args) => {
        const response = await nativeFetch(...args);
        if (typeof args[0] === "string" && args[0].startsWith("https://api.elevenlabs.io/v1/text-to-speech/") && !response.ok) {
          const allowed = ["invalid_api_key", "missing_permissions", "quota_exceeded", "model_not_found", "voice_not_found", "paid_plan_required", "invalid_parameters", "invalid_request_body", "unsupported_language", "insufficient_credits"];
          let reason = "";
          try {
            if (Number(response.headers.get("content-length")) < 4096) {
              const code = (await response.clone().json())?.detail?.status;
              if (allowed.includes(code)) reason = "; " + code;
            }
          } catch {}
          console.error(`Provider HTTP ${response.status}${reason}`);
        }
        return response;
      };
      // Compile existing TS services with the already installed development
      // runtime; no HTTP listener or application route is opened.
      stage = "service loading";
      compiler = await createServer({ root: web, configFile: false, server: { middlewareMode: true, hmr: false, watch: null }, appType: "custom", logLevel: "silent" });
      const { synthesizeSpeech, speechConfiguration } = await compiler.ssrLoadModule("/src/lib/speech/provider.ts");
      const { reserveSpeechGeneration } = await compiler.ssrLoadModule("/src/lib/speech/budget.ts");
      const directory = new URL("../public/audio/prompts/", import.meta.url);
      await mkdir(directory, { recursive: true });
      let manifest = { version: 1, assets: {} };
      try { manifest = JSON.parse(await readFile(new URL("manifest.json", directory), "utf8")); } catch {}
      for (const language of approved) {
        stage = "voice configuration";
        const configurationHash = hash(JSON.stringify(speechConfiguration(language)));
        for (const key of keys) {
          const text = source[language][key], id = language + "/" + key;
          const filename = `${language}-${key}.mp3`, target = new URL(filename, directory);
          const old = manifest.assets[id];
          if (old?.text === text && old.configurationHash === configurationHash) {
            try { if (hash(await readFile(target)) === old.audioHash) { console.log(`${id}: reused`); continue; } } catch {}
          }
          stage = "database budget";
          if (!await reserveSpeechGeneration(new Date())) throw new Error("Budget unavailable");
          stage = "provider audio";
          const bytes = await synthesizeSpeech({ text, language });
          stage = "asset write";
          await writeFile(target, bytes);
          manifest.assets[id] = { filename, text, language, provider: "ElevenLabs", configurationHash, audioHash: hash(bytes), reviewedAt: review.reviews[language].reviewedAt };
          await writeFile(new URL("manifest.json", directory), JSON.stringify(manifest, null, 2) + "\n");
          console.log(`${id}: generated`);
        }
      }
    } catch { console.error(`Cue generation unavailable at ${stage}; private provider/database diagnostics withheld. Completed assets remain recoverable.`); process.exitCode = 1; }
    finally { globalThis.fetch = nativeFetch; await compiler?.close(); }
  }
}
