// Category icons mapping
const categoryIcons = {
  Plumbing: '🚰',
  Wiring: '⚡',
  TMT: '🔩',
  Cement: '🏗️',
  Paint: '🎨',
  Tin: '📦',
  Ply: '🪵',
  Tile: '🔲',
  Pipe: '🔧',
  Door: '🚪',
  Manual: '✍️'
};

async function loadCategories() {
  const container = document.getElementById('categoryContainer');

  try {
    if (Store.catalog.categories.length === 0) {
      await Store.loadCatalog();
    }

    const categories = Store.catalog.categories;

    if (categories.length === 0) {
      container.innerHTML = '<p class="loading">No categories found. Please add categories in backend.</p>';
      return;
    }

    container.innerHTML = categories.map(cat => `
      <div class="category-card" data-category-id="${encodeURIComponent(cat._id)}" data-category-name="${encodeURIComponent(cat.name)}">
        <div class="category-icon">${categoryIcons[cat.name] || '📦'}</div>
        <div class="category-name">${cat.name}</div>
      </div>
    `).join('');

    container.innerHTML += `
      <div class="category-card" data-category-id="manual" data-category-name="Manual">
        <div class="category-icon">✍️</div>
        <div class="category-name">Manual Entry</div>
      </div>
    `;
  } catch (error) {
    console.error('Error loading categories:', error);
    container.innerHTML = '<p class="loading">Error loading categories. Please check backend connection.</p>';
  }
}

function selectCategory(categoryId, categoryName) {
  sessionStorage.setItem('selectedCategoryId', categoryId);
  sessionStorage.setItem('selectedCategoryName', categoryName);
  window.location.href = 'billing.html';
}

function setupEventListeners() {
  document.getElementById('backBtn')?.addEventListener('click', () => {
    history.back();
  });

  document.getElementById('refreshCatalogBtn')?.addEventListener('click', async () => {
    await Store.refreshCatalog();
    location.reload();
  });

  document.getElementById('categoryContainer')?.addEventListener('click', event => {
    const card = event.target.closest('.category-card');
    if (!card) return;

    const categoryId = decodeURIComponent(card.dataset.categoryId || '');
    const categoryName = decodeURIComponent(card.dataset.categoryName || '');
    if (!categoryId || !categoryName) return;

    selectCategory(categoryId, categoryName);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await loadCategories();
});
