// scripts/generate-sitemap.js
// Run:  node scripts/generate-sitemap.js
// Cron: 0 3 * * * (daily at 3 AM)

import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { gzipSync } from 'zlib';
import { config } from 'dotenv';

config({ path: '../.env' });

// ═══════════════════════════════════════════════════════════════════
// Config
// ═══════════════════════════════════════════════════════════════════
const BASE_URL = 'https://resident.quest';  // ✅ Fixed: Match prerender worker domain
const PUBLIC_DIR = './public';
const MAX_URLS_PER_SITEMAP = 45000;
const SUPABASE_PAGE_SIZE = 1000;

const supabase = createClient(
  "https://zsigeikgurxbzghoxgyu.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzaWdlaWtndXJ4YnpnaG94Z3l1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3NjYyNTksImV4cCI6MjA4NzM0MjI1OX0.dgjTL2ye8VAKDYsaI-LwUoQmkzM4TdMD-5rEaigLtF0",
);

// ═══════════════════════════════════════════════════════════════════
// UPDATED SLUGIFY (Matches the App)
// ═══════════════════════════════════════════════════════════════════
function slugify(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[–—]/g, '-')           // em-dash / en-dash → hyphen
    .replace(/[()[\]{}]/g, '')        // remove brackets
    .replace(/[^a-z0-9\s-]/g, '')    // remove other special chars
    .replace(/\s+/g, '-')            // spaces → hyphens
    .replace(/-+/g, '-')             // collapse multiple hyphens
    .replace(/^-|-$/g, '');           // trim leading/trailing hyphens
}

// ═══════════════════════════════════════════════════════════════════
// Paginated Supabase fetcher (handles > 1000 rows)
// ═══════════════════════════════════════════════════════════════════
async function fetchAll(table, select, filters = {}, order = 'created_at') {
  const rows = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from(table)
      .select(select)
      .range(from, from + SUPABASE_PAGE_SIZE - 1)
      .order(order, { ascending: false });

    for (const [col, val] of Object.entries(filters)) {
      query = query.eq(col, val);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Supabase error on "${table}": ${error.message}`);

    rows.push(...(data || []));
    hasMore = data?.length === SUPABASE_PAGE_SIZE;
    from += SUPABASE_PAGE_SIZE;
  }

  return rows;
}

// ═══════════════════════════════════════════════════════════════════
// Extract Unique Topics
// ═══════════════════════════════════════════════════════════════════
async function fetchUniqueTopics() {
  const { data } = await supabase
    .from('questions')
    .select('disease, organ_system, subject');
  
  const topics = new Set();
  data?.forEach(q => {
    if (q.disease) topics.add(q.disease);
    if (q.organ_system) topics.add(q.organ_system);
    if (q.subject) topics.add(q.subject);
  });
  return [...topics];
}

// ═══════════════════════════════════════════════════════════════════
// URL entry builder
// ═══════════════════════════════════════════════════════════════════
function urlEntry({ loc, lastmod, changefreq, priority, images = [] }) {
  const imageXml = images
    .filter(Boolean)
    .map((img) => `
      <image:image>
        <image:loc>${escXml(img.url)}</image:loc>
        ${img.caption ? `<image:caption>${escXml(img.caption)}</image:caption>` : ''}
      </image:image>`)
    .join('');

  return `  <url>
    <loc>${escXml(loc)}</loc>
    ${lastmod ? `<lastmod>${formatDate(lastmod)}</lastmod>` : ''}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>${imageXml}
  </url>`;
}

// ═══════════════════════════════════════════════════════════════════
// Sitemap XML wrapper
// ═══════════════════════════════════════════════════════════════════
function wrapSitemap(entries) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
  xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join('\n')}
</urlset>`;
}

function wrapSitemapIndex(sitemaps) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps.map((s) => `  <sitemap>
    <loc>${escXml(s.loc)}</loc>
    <lastmod>${formatDate(s.lastmod)}</lastmod>
  </sitemap>`).join('\n')}
</sitemapindex>`;
}

// ═══════════════════════════════════════════════════════════════════
// Robots.txt generator
// ═══════════════════════════════════════════════════════════════════
function generateRobotsTxt(sitemapFiles) {
  return `# ResidentQuest robots.txt
# Generated: ${new Date().toISOString()}

User-agent: *
Allow: /
Allow: /question/
Allow: /quiz/
Allow: /topic/
Allow: /study-pack/
Allow: /exam/
Allow: /browse

# Block internal app routes (no SEO value)
Disallow: /home
Disallow: /results
Disallow: /settings
Disallow: /profile
Disallow: /bookmarks
Disallow: /paused
Disallow: /stats
Disallow: /history
Disallow: /api/
Disallow: /auth/
Disallow: /callback
Disallow: /login
Disallow: /signup
Disallow: /admin/

# Block query parameters (avoid duplicate content)
Disallow: /*?*

# Throttle aggressive SEO crawlers
User-agent: AhrefsBot
Crawl-delay: 2

User-agent: SemrushBot
Crawl-delay: 2

User-agent: MJ12bot
Crawl-delay: 5

User-agent: DotBot
Crawl-delay: 2

# Sitemaps
${sitemapFiles.map((f) => `Sitemap: ${BASE_URL}/${f}`).join('\n')}
`;
}

// ═══════════════════════════════════════════════════════════════════
// Main generator
// ═══════════════════════════════════════════════════════════════════
async function generateSitemaps() {
  console.log('🚀 Starting sitemap generation…\n');
  const startTime = Date.now();

  if (!existsSync(PUBLIC_DIR)) mkdirSync(PUBLIC_DIR, { recursive: true });

  try {
    // ── Parallel data fetch ──
    console.log('📦 Fetching data from Supabase…');

    const [questions, quizzes, studyPacks, topicNames] = await Promise.all([
      fetchAll('questions', 'slug, created_at, image_url, question_text'),
      fetchAll('quizzes', 'slug, created_at, updated_at', { is_published: true }),
      fetchAll('study_packs', 'slug, created_at', { is_published: true }),
      fetchUniqueTopics(),
    ]);

    const now = new Date().toISOString();

    // 1. Static & Exam pages
    const staticEntries = [
      urlEntry({ loc: `${BASE_URL}/`, changefreq: 'daily', priority: '1.0' }),
      urlEntry({ loc: `${BASE_URL}/browse`, changefreq: 'daily', priority: '0.9' }),
      urlEntry({ loc: `${BASE_URL}/exam/step1`, changefreq: 'weekly', priority: '0.9' }),
      urlEntry({ loc: `${BASE_URL}/exam/step2`, changefreq: 'weekly', priority: '0.9' }),
      urlEntry({ loc: `${BASE_URL}/exam/step3`, changefreq: 'weekly', priority: '0.9' }),
    ];

    // 2. Study Packs (Priority 0.9)
    const packEntries = studyPacks.map(p => 
      urlEntry({ loc: `${BASE_URL}/study-pack/${p.slug}`, lastmod: p.created_at, changefreq: 'weekly', priority: '0.9' })
    );

    // 3. Topic Hubs (Priority 0.8)
    const topicEntries = topicNames.map(topic => 
      urlEntry({ loc: `${BASE_URL}/topic/${slugify(topic)}`, lastmod: now, changefreq: 'weekly', priority: '0.8' })
    );

    // 4. Quizzes (Priority 0.8)
    const quizEntries = quizzes.map(q => 
      urlEntry({ loc: `${BASE_URL}/quiz/${q.slug}`, lastmod: q.updated_at || q.created_at, changefreq: 'monthly', priority: '0.8' })
    );

    // 5. Questions (Priority 0.6)
    const questionEntries = questions.map(q => 
      urlEntry({ loc: `${BASE_URL}/question/${q.slug}`, lastmod: q.updated_at || q.created_at, changefreq: 'monthly', priority: '0.6', images: q.image_url ? [{ url: q.image_url }] : [] })
    );

    const allEntries = [...staticEntries, ...packEntries, ...topicEntries, ...quizEntries, ...questionEntries];
    const sitemapFiles = [];

    console.log(`📊 URL breakdown:`);
    console.log(`   Static:    ${staticEntries.length}`);
    console.log(`   Study Packs: ${packEntries.length}`);
    console.log(`   Topics:    ${topicEntries.length}`);
    console.log(`   Quizzes:   ${quizEntries.length}`);
    console.log(`   Questions: ${questionEntries.length}`);
    console.log(`   Total:     ${allEntries.length}\n`);

    // ── Generate sitemap(s) with splitting if needed ──
    if (allEntries.length <= MAX_URLS_PER_SITEMAP) {
      // Single sitemap
      const xml = wrapSitemap(allEntries);
      writeFileSync(`${PUBLIC_DIR}/sitemap.xml`, xml, 'utf-8');
      sitemapFiles.push('sitemap.xml');
      console.log(`   ✓ sitemap.xml (${allEntries.length} URLs)`);
    } else {
      // Split into multiple sitemaps
      const chunks = [];
      for (let i = 0; i < allEntries.length; i += MAX_URLS_PER_SITEMAP) {
        chunks.push(allEntries.slice(i, i + MAX_URLS_PER_SITEMAP));
      }
      
      chunks.forEach((chunk, idx) => {
        const filename = `sitemap-${idx + 1}.xml`;
        const xml = wrapSitemap(chunk);
        writeFileSync(`${PUBLIC_DIR}/${filename}`, xml, 'utf-8');
        sitemapFiles.push(filename);
        console.log(`   ✓ ${filename} (${chunk.length} URLs)`);
      });

      // Generate sitemap index
      const sitemapIndex = wrapSitemapIndex(
        sitemapFiles.map(f => ({ loc: `${BASE_URL}/${f}`, lastmod: now }))
      );
      writeFileSync(`${PUBLIC_DIR}/sitemap.xml`, sitemapIndex, 'utf-8');
      console.log(`   ✓ sitemap.xml (index of ${sitemapFiles.length} sitemaps)`);
    }

    // ── Robots.txt ──
    const robotsTxt = generateRobotsTxt(sitemapFiles.length > 1 ? ['sitemap.xml'] : sitemapFiles);
    writeFileSync(`${PUBLIC_DIR}/robots.txt`, robotsTxt, 'utf-8');
    console.log(`\n🤖 robots.txt generated`);

    // ── Summary ──
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n✅ Done in ${elapsed}s`);
    console.log(`   Total URLs: ${allEntries.length}`);
    console.log(`   Topic Pages: ${topicEntries.length} (priority 0.8 — crawl magnets)`);
    console.log(`   Sitemaps:   ${sitemapFiles.length}`);
    console.log(`   Output:     ${PUBLIC_DIR}/\n`);

    // ── Ping search engines ──
    if (process.env.PING_SEARCH_ENGINES === 'true') {
      await pingSearchEngines();
    }
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

        // ═══════════════════════════════════════════════════════════════════
// Ping Google & Bing
// ═══════════════════════════════════════════════════════════════════
async function pingSearchEngines() {
  const encoded = encodeURIComponent(`${BASE_URL}/sitemap.xml`);
  const endpoints = [
    { name: 'Google', url: `https://www.google.com/ping?sitemap=${encoded}` },
    { name: 'Bing', url: `https://www.bing.com/ping?sitemap=${encoded}` },
  ];

  console.log('\n📡 Pinging search engines…');
  for (const { name, url } of endpoints) {
    try {
      const res = await fetch(url);
      console.log(`   ${res.ok ? '✓' : '✗'} ${name}: ${res.status}`);
    } catch (err) {
      console.log(`   ✗ ${name}: ${err.message}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
// Utilities
// ═════════════════════════════════════════════════════════════════
function escXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatDate(dateStr) {
  try { return new Date(dateStr).toISOString().split('T')[0]; }
  catch { return new Date().toISOString().split('T')[0]; }
}

generateSitemaps();