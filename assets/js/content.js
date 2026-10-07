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

  function formatJobDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function jobCardHTML(job) {
    const qualifications = Array.isArray(job.qualifications) ? job.qualifications : [];
    const qualificationsHtml = qualifications.length
      ? `<ul class="job-qualifications">${qualifications.map((q) => `<li>${escapeHTML(q)}</li>`).join('')}</ul>`
      : '';
    const posted = formatJobDate(job.posted_date);
    const roleAttr = escapeHTML(job.title || 'this role');

    return `
      <div class="job-card">
        <div class="job-card-head">
          <h3>${escapeHTML(job.title)}</h3>
          <span class="job-card-type">${escapeHTML(job.type)}</span>
        </div>
        <p class="job-card-location">${escapeHTML(job.location)}${posted ? ` &middot; Posted ${escapeHTML(posted)}` : ''}</p>
        <p class="job-card-summary">${escapeHTML(job.summary)}</p>
        ${qualificationsHtml}
        <button type="button" class="btn btn-gold job-apply-btn" data-role="${roleAttr}">Apply for this role</button>
      </div>
    `;
  }

  async function renderJobs() {
    const list = document.getElementById('jobsList');
    if (!list) return;
    try {
      const data = await fetchYaml('content/jobs.yml');
      const jobs = (data && data.jobs) || [];
      list.innerHTML = jobs.length
        ? jobs.map(jobCardHTML).join('')
        : '<p class="content-empty">There are no open roles right now. We\'re always glad to hear from people who want to work in solar — send your CV to <a href="mailto:sales@horizonsolar.net">sales@horizonsolar.net</a> and we\'ll keep it on file.</p>';
    } catch (err) {
      list.innerHTML = '<p class="content-empty">Unable to load open roles right now. Please try again shortly.</p>';
      console.error(err);
    }
  }

  renderProjects();
  renderArticles();
  renderJobs();
})();
