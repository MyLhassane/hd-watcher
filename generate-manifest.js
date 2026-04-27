const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, 'logs');
const outFile = path.resolve(__dirname, 'manifest.json');

function parseFrontmatter(content) {
  const match = /^---\s*\n([\s\S]*?)\n---/m.exec(content);
  if (!match) return {};

  return match[1].split('\n').reduce((data, line) => {
    const [key, ...rest] = line.split(':');
    if (!key) return data;
    const rawKey = key.trim();
    let value = rest.join(':').trim();
    
    // Handle arrays (e.g., tags: [coding, ui])
    if (value.startsWith('[') && value.endsWith(']')) {
      value = value.slice(1, -1).split(',').map(v => v.trim());
    } else if (value === 'true' || value === 'false') {
      value = value === 'true';
    } else if (/^\d+(\.\d+)?$/.test(value)) {
      value = Number(value);
    }
    
    data[rawKey] = value;
    return data;
  }, {});
}

function walkDirectory(dir) {
  const entries = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });

  items.forEach((item) => {
    const itemPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      entries.push(...walkDirectory(itemPath));
    } else if (item.isFile() && item.name.toLowerCase().endsWith('.md')) {
      entries.push(itemPath);
    }
  });

  return entries;
}

function buildManifest() {
  if (!fs.existsSync(rootDir)) {
    console.warn('Directory logs/ not found. Generating empty manifest.');
    return { generatedAt: new Date().toISOString(), files: [] };
  }

  const markdownFiles = walkDirectory(rootDir);
  const files = markdownFiles.map((filePath) => {
    const content = fs.readFileSync(filePath, 'utf8');
    const frontmatter = parseFrontmatter(content);
    const relativePath = path.relative(__dirname, filePath).replace(/\\/g, '/');

    return {
      path: relativePath,
      url: relativePath,
      frontmatter: {
        title: frontmatter.title || path.basename(filePath, '.md'),
        category: frontmatter.category || '',
        progress: frontmatter.progress || 0,
        public: frontmatter.public !== false,
        date: frontmatter.date || null,
        description: frontmatter.description || '',
        tags: frontmatter.tags || [],
        status: frontmatter.status || 'unknown'
      }
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    files
  };
}

const manifest = buildManifest();
fs.writeFileSync(outFile, JSON.stringify(manifest, null, 2), 'utf8');
console.log(`Generated manifest with ${manifest.files.length} markdown file(s).`);
