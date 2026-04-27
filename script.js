// Initialize Markdown parser and DOM elements
const md = window.markdownit();
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const hamburger = document.getElementById('hamburger');
const closeSidebar = document.getElementById('closeSidebar');
const accordion = document.getElementById('accordion');
const showAllBtn = document.getElementById('showAllBtn');
const timeline = document.getElementById('timeline');
const timelineSubtitle = document.getElementById('timeline-subtitle');
const statusBadge = document.getElementById('statusBadge');
const searchInput = document.getElementById('searchInput');
const dateFilter = document.getElementById('dateFilter');

// Category UI mapping - connects category names to card selectors
const categoryMap = {
  Dev: { label: 'Dev', selector: 'dev' },
  Creative: { label: 'Creative', selector: 'creative' },
  HomeLab: { label: 'HomeLab', selector: 'homelab' }
};

// State management
let manifestFiles = [];
let currentBranch = null;
let currentSearch = '';
let currentDateFilter = 'all';

/**
 * Format date string to Latin numeric format with Arabic month names
 * @param {string} value - Date string or null
 * @returns {string} - Formatted date or '-' if invalid
 */
function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  // Format: "27 Apr 2026" (Latin numbers)
  return new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

/**
 * Parse YAML frontmatter from markdown content
 * Regex: Matches content between --- delimiters
 * Returns object with key-value pairs and type conversion
 * @param {string} content - Markdown file content
 * @returns {object} - Parsed YAML as object
 */
function parseFrontmatter(content) {
  const match = /^---\s*\n([\s\S]*?)\n---/m.exec(content);
  if (!match) return {};
  return match[1].split('\n').reduce((data, line) => {
    const [rawKey, ...rawValues] = line.split(':');
    if (!rawKey) return data;
    const key = rawKey.trim();
    let value = rawValues.join(':').trim();
    // Type conversion: boolean and numeric values
    if (value === 'true' || value === 'false') value = value === 'true';
    if (/^\d+(\.\d+)?$/.test(value)) value = Number(value);
    data[key] = value;
    return data;
  }, {});
}

/**
 * Normalize manifest entry for UI processing
 * - Removes 'logs/' prefix from paths
 * - Extracts title, category, dates
 * - Respects public/private filtering
 * - Splits path into tree structure
 * @param {object} entry - Raw manifest file entry
 * @returns {object} - Normalized entry with all fields
 */
function normalizeEntry(entry) {
  const rawPath = entry.path || entry.url || '';
  const withoutLogs = rawPath.replace(/^\/?logs\/?/i, '');
  const normalizedPath = withoutLogs.replace(/^\//, '');
  const frontmatter = entry.frontmatter || {};
  return {
    ...entry,
    path: normalizedPath,
    title: frontmatter.title || normalizedPath.split('/').pop().replace(/\.md$/i, ''),
    category: frontmatter.category || detectCategory(normalizedPath),
    date: frontmatter.date || frontmatter.updated || frontmatter.created || null,
    progress: Number(frontmatter.progress || 0),
    public: frontmatter.public !== false,
    description: frontmatter.description || '',
    tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
    status: frontmatter.status || 'unknown',
    treePath: normalizedPath.split('/').filter(Boolean)
  };
}

/**
 * Detect category from file path if not specified
 * @param {string} path - File path
 * @returns {string} - Dev|Creative|HomeLab
 */
function detectCategory(path) {
  if (/\bdev\b/i.test(path)) return 'Dev';
  if (/\bcreative\b/i.test(path)) return 'Creative';
  if (/homelab/i.test(path)) return 'HomeLab';
  return 'Dev';
}

/**
 * Fetch and parse manifest.json
 * @returns {Promise<array>} - Array of file entries or empty array on error
 */
function fetchManifest() {
  return fetch('manifest.json')
    .then((response) => {
      if (!response.ok) throw new Error('Manifest not found');
      return response.json();
    })
    .then((data) => Array.isArray(data.files) ? data.files : data)
    .catch(() => []);
}

/**
 * Build tree structure from normalized files
 * Creates hierarchical branches (up to 6 levels as per spec)
 * Only includes public files (public: true or undefined)
 * @param {array} files - Normalized file entries
 * @returns {array} - Tree structure with branches and leaves
 */
function collectBranches(files) {
  const tree = [];

  files.forEach((file) => {
    if (!file.public) return; // Skip private files
    let nodeList = tree;
    const segments = file.treePath;
    segments.forEach((segment, index) => {
      const existing = nodeList.find((item) => item.name === segment);
      if (existing) {
        if (index === segments.length - 1) {
          existing.type = 'file';
          existing.file = file;
        } else {
          nodeList = existing.children;
        }
        return;
      }
      // Create new branch or leaf node
      const newNode = {
        name: segment,
        type: index === segments.length - 1 ? 'file' : 'branch',
        children: [],
        file: index === segments.length - 1 ? file : null,
        fullPath: segments.slice(0, index + 1).join('/')
      };
      nodeList.push(newNode);
      if (index < segments.length - 1) nodeList = newNode.children;
    });
  });

  return tree;
}

/**
 * Render accordion tree recursively
 * Supports nested branches up to 6 levels with CSS indentation
 * Files (leaves) are clickable to filter timeline
 * @param {array} tree - Tree structure from collectBranches()
 * @param {element} container - DOM container for accordion
 * @param {number} level - Current nesting level (0-5)
 * @returns {element} - Populated container
 */
function renderAccordion(tree, container, level = 0) {
  container.innerHTML = '';

  tree.forEach((node) => {
    const item = document.createElement('div');
    item.className = 'accordion-item';

    const button = document.createElement('button');
    button.className = 'accordion-button';
    button.dataset.level = String(Math.min(level, 6));
    button.style.setProperty('--level', String(level));
    button.type = 'button';

    const label = document.createElement('span');
    label.className = 'label';
    label.textContent = node.name;
    button.appendChild(label);

    const badge = document.createElement('span');
    badge.className = 'chevron';
    badge.textContent = node.type === 'branch' ? '›' : '•';
    button.appendChild(badge);

    item.appendChild(button);

    if (node.type === 'branch') {
      const panel = document.createElement('div');
      panel.className = 'accordion-panel';

      button.addEventListener('click', () => {
        const isOpen = panel.classList.toggle('open');
        button.classList.toggle('open', isOpen);
        button.setAttribute('aria-expanded', String(isOpen));
        panel.style.maxHeight = isOpen ? `${panel.scrollHeight + 24}px` : '0px';
        if (!isOpen) panel.style.opacity = '0';
      });

      const subtree = renderAccordion(node.children, document.createElement('div'), level + 1);
      panel.appendChild(subtree);
      item.appendChild(panel);
    } else {
      button.classList.add('accordion-leaf');
      button.addEventListener('click', () => {
        selectBranch(node.fullPath, node.file);
        closeDrawer();
      });
    }

    container.appendChild(item);
  });

  return container;
}

/**
 * Update card UI with progress and last activity
 * Maps frontmatter data to HTML elements
 * @param {string} categoryKey - Dev|Creative|HomeLab
 * @param {string} label - Display label (unused)
 * @param {number} progress - Progress percentage (0-100)
 * @param {string} lastDate - Last activity date formatted
 */
function updateProgressCard(categoryKey, label, progress, lastDate) {
  const card = categoryMap[categoryKey];
  if (!card) return;
  const labelNode = document.getElementById(`${card.selector}-progress-label`);
  const fillNode = document.getElementById(`${card.selector}-progress-fill`);
  const activityNode = document.getElementById(`${card.selector}-last-activity`);
  labelNode.textContent = `${progress}%`;
  fillNode.style.width = `${progress}%`;
  activityNode.textContent = lastDate || '-';
}

/**
 * Update all category cards with data from files
 * Calculates: average progress, latest activity date
 * Called when manifest loads successfully
 * @param {array} files - Normalized file entries
 */
function updateCards(files) {
  const groups = {
    Dev: [],
    Creative: [],
    HomeLab: []
  };

  files.filter((file) => file.public).forEach((file) => {
    const category = file.category in groups ? file.category : 'Dev';
    groups[category].push(file);
  });

  Object.entries(groups).forEach(([category, entries]) => {
    if (!entries.length) {
      updateProgressCard(category, category, 0, '-');
      return;
    }
    const latest = entries.slice().sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))[0];
    const averageProgress = Math.round(entries.reduce((sum, item) => sum + (item.progress || 0), 0) / entries.length);
    updateProgressCard(category, category, averageProgress, formatDate(latest.date));
  });
}

/**
 * Render reverse-chronological timeline
 * Shows files sorted newest-to-oldest with title, description, progress bar
 * Can filter by branchPath (e.g., 'Dev/Home')
 * @param {array} files - Normalized file entries
 * @param {string} branchPath - Optional folder path filter
 */
function renderTimeline(files, branchPath = null) {
  const entries = files.filter((file) => {
    // Branch filter
    if (branchPath && !file.path.startsWith(branchPath)) return false;
    
    // Public filter
    if (!file.public) return false;
    
    // Date filter
    if (currentDateFilter !== 'all') {
      const fileDate = new Date(file.date);
      const now = new Date();
      const diffTime = now - fileDate;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      switch (currentDateFilter) {
        case 'today':
          if (diffDays > 1) return false;
          break;
        case 'week':
          if (diffDays > 7) return false;
          break;
        case 'month':
          if (diffDays > 30) return false;
          break;
      }
    }
    
    // Search filter
    if (currentSearch) {
      const searchLower = currentSearch.toLowerCase();
      const titleMatch = file.title.toLowerCase().includes(searchLower);
      const descMatch = file.description.toLowerCase().includes(searchLower);
      const categoryMatch = file.category.toLowerCase().includes(searchLower);
      if (!titleMatch && !descMatch && !categoryMatch) return false;
    }
    
    return true;
  });
  
  const sorted = entries.slice().sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  timeline.innerHTML = '';

  if (!sorted.length) {
    const empty = document.createElement('div');
    empty.className = 'timeline-item';
    empty.innerHTML = '<h3>لا توجد ملفات متاحة</h3><p>جرب تغيير معايير البحث أو الفلترة.</p>';
    timeline.appendChild(empty);
    return;
  }

  sorted.forEach((file) => {
    const item = document.createElement('article');
    item.className = 'timeline-item';
    
    const title = document.createElement('h3');
    title.textContent = file.title;
    title.style.cursor = 'pointer';
    title.addEventListener('click', () => toggleTimelineItem(item, file));

    const description = document.createElement('div');
    description.innerHTML = file.description ? md.renderInline(file.description) : `<span style="color: var(--muted);">${file.path}</span>`;

    const meta = document.createElement('div');
    meta.className = 'timeline-meta';
    meta.innerHTML = `<span>التاريخ: ${formatDate(file.date)}</span><span>التقدم: ${file.progress}%</span><span>${file.category}</span>`;

    const progress = document.createElement('div');
    progress.className = 'timeline-progress';
    const progressFill = document.createElement('span');
    progressFill.style.width = `${file.progress}%`;
    progress.appendChild(progressFill);

    item.appendChild(title);
    item.appendChild(description);
    item.appendChild(meta);
    item.appendChild(progress);
    timeline.appendChild(item);
  });
}

/**
 * Toggle detailed view of timeline item
 * Shows tags, status, and file path
 * @param {element} item - Timeline item element
 * @param {object} file - File data
 */
function toggleTimelineItem(item, file) {
  const isExpanded = item.classList.contains('expanded');
  
  if (isExpanded) {
    // Collapse - remove content div
    const content = item.querySelector('.timeline-content');
    if (content) content.remove();
    item.classList.remove('expanded');
  } else {
    // Expand - add content div
    const content = document.createElement('div');
    content.className = 'timeline-content';
    
    const path = document.createElement('p');
    path.style.margin = '0.5rem 0 0';
    path.innerHTML = `<strong>المسار:</strong> <code>${file.path}</code>`;
    
    const status = document.createElement('p');
    status.style.margin = '0.5rem 0 0';
    status.innerHTML = `<strong>الحالة:</strong> ${file.status || 'غير محدد'}`;
    
    content.appendChild(path);
    content.appendChild(status);
    
    // Add tags if they exist
    if (file.tags && file.tags.length > 0) {
      const tagsContainer = document.createElement('div');
      tagsContainer.className = 'timeline-tags';
      tagsContainer.style.marginTop = '0.75rem';
      file.tags.forEach(tag => {
        const tagElement = document.createElement('span');
        tagElement.className = 'tag';
        tagElement.textContent = `#${tag}`;
        tagsContainer.appendChild(tagElement);
      });
      content.appendChild(tagsContainer);
    }
    
    item.appendChild(content);
    item.classList.add('expanded');
  }
}

/**
 * Select a branch to filter timeline
 * Updates UI subtitle and filters timeline to branch-specific items
 * @param {string} path - Full path (e.g., 'Dev/Home') or null for all
 * @param {object} file - File object (unused in current version)
 */
function selectBranch(path, file) {
  currentBranch = path || null;
  timelineSubtitle.textContent = path ? `عرض سجل ${path}` : 'عرض جميع الملفات العامة مرتبة من الأحدث للأقدم';
  renderTimeline(manifestFiles, path);
  showAllBtn.classList.toggle('active', !path);
}

/**
 * Open sidebar drawer with overlay
 */
function openDrawer() {
  sidebar.classList.add('open');
  sidebar.setAttribute('aria-hidden', 'false');
  overlay.classList.add('visible');
  overlay.classList.remove('hidden');
}

/**
 * Close sidebar drawer with overlay
 */
function closeDrawer() {
  sidebar.classList.remove('open');
  sidebar.setAttribute('aria-hidden', 'true');
  overlay.classList.remove('visible');
  overlay.classList.add('hidden');
}

/**
 * Main initialization function
 * 1. Fetch manifest.json from root
 * 2. Normalize entries (remove private files)
 * 3. Populate cards with category stats
 * 4. Build and render accordion tree
 * 5. Render initial timeline
 * 6. Attach event listeners
 */
function initialize() {
  fetchManifest().then((items) => {
    const normalized = items.map(normalizeEntry);
    manifestFiles = normalized;
    updateCards(normalized);
    const tree = collectBranches(normalized);
    renderAccordion(tree, accordion);
    renderTimeline(normalized);
    statusBadge.textContent = `تم التحميل ${normalized.length} عنصر`;
  });

  // Navigation events
  hamburger.addEventListener('click', openDrawer);
  closeSidebar.addEventListener('click', closeDrawer);
  overlay.addEventListener('click', closeDrawer);
  showAllBtn.addEventListener('click', () => {
    currentBranch = null;
    selectBranch(null, null);
  });

  // Search and filter events
  searchInput.addEventListener('input', (e) => {
    currentSearch = e.target.value.trim();
    renderTimeline(manifestFiles, currentBranch);
  });

  dateFilter.addEventListener('change', (e) => {
    currentDateFilter = e.target.value;
    renderTimeline(manifestFiles, currentBranch);
  });
}

// Boot sequence
initialize();
