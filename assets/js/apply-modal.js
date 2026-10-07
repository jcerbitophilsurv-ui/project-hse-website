(() => {
  const overlay = document.getElementById('applyModalOverlay');
  if (!overlay) return;

  const closeBtn = document.getElementById('applyModalClose');
  const roleTitle = document.getElementById('applyModalRole');
  const roleInput = document.getElementById('applyRoleInput');
  const jobsList = document.getElementById('jobsList');
  const nameInput = document.getElementById('applyName');

  function openModal(role) {
    roleTitle.textContent = role || 'this role';
    roleInput.value = role || '';
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    nameInput.focus();
  }

  function closeModal() {
    overlay.hidden = true;
    document.body.style.overflow = '';
  }

  if (jobsList) {
    jobsList.addEventListener('click', (e) => {
      const btn = e.target.closest('.job-apply-btn');
      if (!btn) return;
      openModal(btn.dataset.role);
    });
  }

  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !overlay.hidden) closeModal();
  });
})();
