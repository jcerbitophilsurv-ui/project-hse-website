(() => {
  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  async function fetchYaml(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error('Failed to fetch ' + path);
    const text = await res.text();
    return jsyaml.load(text);
  }

  function projectTileHTML(project) {
    const hasPhoto = Boolean(project.image && String(project.image).trim() !== '');
    const cls = hasPhoto ? 'gallery-tile has-photo' : 'gallery-tile';
    const label = [project.title, project.location].filter(Boolean).join(' — ');
    const altText = escapeHTML(label || 'Horizon Solar Energy installation project');
    const media = hasPhoto
      ? `<img class="gallery-tile-img" src="${escapeHTML(project.image)}" alt="${altText}" loading="lazy">`
      : `<span class="gallery-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"/><path d="M12 12v9M12 12L4 7.5M12 12l8-4.5"/></svg></span>`;
    return `<div class="${cls}">${media}<p>${escapeHTML(label)}</p></div>`;
  }

  async function renderProjects() {
    const grid = document.getElementById('projectsGrid');
    if (!grid) return;
    try {
      const data = await fetchYaml('content/projects.yml');
      const projects = (data && data.projects) || [];
      grid.innerHTML = projects.length
        ? projects.map(projectTileHTML).join('')
        : '<p class="content-empty">No projects added yet.</p>';
    } catch (err) {
      grid.innerHTML = '<p class="content-empty">Unable to load projects right now.</p>';
      console.error(err);
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function articleItemHTML(article) {
    const bodyHtml = typeof marked !== 'undefined' && article.body
      ? marked.parse(article.body)
      : `<p>${escapeHTML(article.body || '')}</p>`;
    return `
      <div class="accordion-item article-item">
        <button class="accordion-trigger" aria-expanded="false">
          <span class="article-trigger-text">
            <span class="article-date">${escapeHTML(formatDate(article.date))}</span>
            <span class="article-title">${escapeHTML(article.title || 'Untitled')}</span>
            <span class="article-excerpt">${escapeHTML(article.excerpt || '')}</span>
          </span>
          <span class="accordion-icon">+</span>
        </button>
        <div class="accordion-panel">${bodyHtml}</div>
      </div>
    `;
  }

  async function renderArticles() {
    const list = document.getElementById('articleList');
    if (!list) return;
    try {
      const data = await fetchYaml('content/articles.yml');
      const articles = (data && data.articles) || [];
      list.innerHTML = articles.length
        ? articles.map(articleItemHTML).join('')
        : '<p class="content-empty">No articles published yet.</p>';
    } catch (err) {
      list.innerHTML = '<p class="content-empty">Unable to load articles right now.</p>';
      console.error(err);
    }
  }

  renderProjects();
  renderArticles();
})();
