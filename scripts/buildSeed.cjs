const fs = require('fs');
const path = require('path');

const snapshotPath = path.join(__dirname, '..', 'vercel-db-snapshot.json');
const draftsPath = path.join(__dirname, '..', 'rss-drafts.json');

let snapshot = {};
if (fs.existsSync(snapshotPath)) {
  snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
}

let drafts = [];
if (fs.existsSync(draftsPath)) {
  drafts = JSON.parse(fs.readFileSync(draftsPath, 'utf8'));
}

const articles = snapshot.articles || [];
const comments = snapshot.comments || [];
const messages = snapshot.messages || [];
const media = snapshot.media || [];
const subscribers = snapshot.subscribers || [];
const matches = snapshot.matches || [];
const siteSettings = snapshot.siteSettings || {};

console.log(`Packing ${articles.length} articles, ${comments.length} comments, ${messages.length} messages, ${media.length} media items...`);

const tsContent = `// Pre-packaged Seed Data for SEN PERSPECTIVE (Vercel & Offline Ready)
// Auto-generated from workspace snapshot to guarantee zero-data loss on Vercel deployment.
import { Article, Match } from '../types';

export const seedArticles: Article[] = ${JSON.stringify(articles, null, 2)};

export const seedComments = ${JSON.stringify(comments, null, 2)};

export const seedMessages = ${JSON.stringify(messages, null, 2)};

export const seedMedia = ${JSON.stringify(media, null, 2)};

export const seedSubscribers = ${JSON.stringify(subscribers, null, 2)};

export const seedMatches: Match[] = ${JSON.stringify(matches, null, 2)};

export const seedSiteSettings = ${JSON.stringify(siteSettings, null, 2)};

export const seedRssDrafts = ${JSON.stringify(drafts, null, 2)};
`;

const targetPath = path.join(__dirname, '..', 'src', 'data', 'seedData.ts');
fs.writeFileSync(targetPath, tsContent, 'utf8');

const sizeMb = (fs.statSync(targetPath).size / (1024 * 1024)).toFixed(2);
console.log(`Successfully generated ${targetPath} (${sizeMb} MB)`);
