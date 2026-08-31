const fs = require('fs');

let content = fs.readFileSync('server/aiNewsroomEngine.ts', 'utf-8');

const oldSaveKeyPattern = /export async function saveApiKey[\s\S]*?fs\.writeFileSync\(apiKeysFile, JSON\.stringify\(keys, null, 2\), "utf-8"\);\s*\} catch \(e\) \{\}\s*\}/m;

const newSaveKey = `export async function saveApiKey(provider: string, key: string) {
  const normProvider = (provider || '').trim().toUpperCase();
  const cleanKey = (key || '').replace(/^["']|["']$/g, '').trim();

  let keys: Record<string, string> = {};
  try {
    if (fs.existsSync(apiKeysFile)) {
      keys = JSON.parse(fs.readFileSync(apiKeysFile, "utf-8"));
    }
  } catch (e) {}
  keys[normProvider] = cleanKey;

  try {
    fs.writeFileSync(apiKeysFile, JSON.stringify(keys, null, 2), "utf-8");
  } catch (e) {}

  // Save to MongoDB
  try {
    cachedMongoKeys[normProvider] = cleanKey;
    await saveDocument("system_config", "api_keys", { data: cachedMongoKeys }, false);
    console.log(\`[MongoDB Sync] Saved API key for \${normProvider} to database.\`);
  } catch (e) {
    console.error("[MongoDB Sync Error] Failed to save API keys to Mongo:", e);
  }
}`;

content = content.replace(oldSaveKeyPattern, newSaveKey);

fs.writeFileSync('server/aiNewsroomEngine.ts', content, 'utf-8');
console.log('Patched saveApiKey');
