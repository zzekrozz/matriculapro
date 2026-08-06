import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const projectRoot = process.cwd();
const scannedRoots = ['src', 'public', 'supabase/email-templates']
  .map((path) => join(projectRoot, path));
const allowedExtensions = new Set(['.js', '.jsx', '.ts', '.tsx', '.html']);
const forbiddenPatterns = [
  { label: 'Google Analytics', pattern: /googletagmanager\.com|google-analytics\.com|gtag\s*\(/i },
  { label: 'Meta Pixel', pattern: /connect\.facebook\.net|fbq\s*\(/i },
  { label: 'TikTok Pixel', pattern: /analytics\.tiktok\.com|ttq\s*\./i },
  { label: 'Hotjar', pattern: /static\.hotjar\.com|hj\s*\(/i },
];

const files: string[] = [];
const walk = (directory: string) => {
  if (!statSafe(directory)) return;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (allowedExtensions.has(entry.name.slice(entry.name.lastIndexOf('.')))) files.push(path);
  }
};

function statSafe(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

for (const root of scannedRoots) walk(root);

const hits: string[] = [];
for (const file of files) {
  const content = readFileSync(file, 'utf8');
  for (const forbidden of forbiddenPatterns) {
    if (forbidden.pattern.test(content)) {
      hits.push(`${relative(projectRoot, file)}: ${forbidden.label}`);
    }
  }
}

if (hits.length > 0) {
  console.error('UNAUTHORIZED_TRACKING_STATUS=BLOCKED');
  for (const hit of hits) console.error(`- ${hit}`);
  process.exit(1);
}

console.log(`UNAUTHORIZED_TRACKING_STATUS=VALID (${files.length} archivos comprobados)`);
