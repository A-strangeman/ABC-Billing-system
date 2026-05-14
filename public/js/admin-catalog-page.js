let catalog = { categories: [], materials: [], sizes: [], fittings: [] };

function clearCatalogCache() {
  localStorage.removeItem('catalog_data');
  localStorage.removeItem('catalog_time');
  console.log('🗑️ Catalog cache cleared - changes will appear immediately!');
}

async function loadCatalog() {
  try {
    console.log('📦 Loading catalog...');
    catalog = await API.getCatalog();
    console.log('✅ Catalog loaded:', catalog);
    renderAll();
  } catch (error) {
    console.error('❌ Error loading catalog:', error);
    showError('Failed to load catalog');
  }
}

function renderAll() {
  renderCategories();
  renderMaterials();
  renderSizes();
  renderFittings();
  populateDropdowns();
}

function renderCategories() {
  const list = document.getElementById('categoryList');

  if (!catalog.categories || catalog.categories.length === 0) {
    list.innerHTML = '<div class="loading-msg">No categories yet</div>';
    return;
  }

  list.innerHTML = catalog.categories.map(cat => `
    <span class="item-chip">
      ${cat.name}
      <button class="delete-chip-btn" data-entity="category" data-id="${cat._id}" title="Delete">×</button>
    </span>
  `).join('');
}

function renderMaterials() {
  const list = document.getElementById('materialList');

  if (!catalog.materials || catalog.materials.length === 0) {
    list.innerHTML = '<div class="loading-msg">No materials yet</div>';
    return;
  }

  list.innerHTML = catalog.materials.map(mat => {
    const cat = catalog.categories.find(c => c._id === mat.categoryId);
    return `
      <span class="item-chip">
        ${cat?.name || 'Unknown'} → ${mat.name}
        <button class="delete-chip-btn" data-entity="material" data-id="${mat._id}" title="Delete">×</button>
      </span>
    `;
  }).join('');
}

function renderSizes() {
  const list = document.getElementById('sizeList');

  if (!catalog.sizes || catalog.sizes.length === 0) {
    list.innerHTML = '<div class="loading-msg">No sizes yet</div>';
    return;
  }

  list.innerHTML = catalog.sizes.map(size => {
    const mat = catalog.materials.find(m => m._id === size.materialId);
    return `
      <span class="item-chip">
        ${mat?.name || 'Unknown'} → ${size.value}
        <button class="delete-chip-btn" data-entity="size" data-id="${size._id}" title="Delete">×</button>
      </span>
    `;
  }).join('');
}

function renderFittings() {
  const list = document.getElementById('fittingList');

  if (!catalog.fittings || catalog.fittings.length === 0) {
    list.innerHTML = '<div class="loading-msg">No fittings yet</div>';
    return;
  }

  list.innerHTML = catalog.fittings.map(fit => {
    const mat = catalog.materials.find(m => m._id === fit.materialId);
    return `
      <span class="item-chip">
        ${mat?.name || 'Unknown'} → ${fit.name}
        <button class="delete-chip-btn" data-entity="fitting" data-id="${fit._id}" title="Delete">×</button>
      </span>
    `;
  }).join('');
}

function populateDropdowns() {
  const catSelect = document.getElementById('materialCategory');
  catSelect.innerHTML = '<option value="">Select category</option>' +
    (catalog.categories || []).map(c => `<option value="${c._id}">${c.name}</option>`).join('');

  const matOptions = '<option value="">Select material</option>' +
    (catalog.materials || []).map(m => `<option value="${m._id}">${m.name}</option>`).join('');

  document.getElementById('sizeMaterial').innerHTML = matOptions;
  document.getElementById('fittingMaterial').innerHTML = matOptions;
}

async function addCategory() {
  const name = document.getElementById('categoryName').value.trim();
  const btn = document.getElementById('addCategoryBtn');

  if (!name) {
    alert('Please enter category name');
    return;
  }

  try {
    btn.disabled = true;
    btn.textContent = 'Adding...';

    console.log('➕ Adding category:', name);
    await API.addCategory({ name });

    clearCatalogCache();

    document.getElementById('categoryName').value = '';
    showSuccess('categorySuccess');

    await loadCatalog();
  } catch (error) {
    console.error('❌ Error adding category:', error);
    alert('Failed to add category: ' + (error.error || error.message));
  } finally {
    btn.disabled = false;
    btn.textContent = 'Add';
  }
}

async function addMaterial() {
  const categoryId = document.getElementById('materialCategory').value;
  const name = document.getElementById('materialName').value.trim();
  const btn = document.getElementById('addMaterialBtn');

  if (!categoryId) {
    alert('Please select a category');
    return;
  }
  if (!name) {
    alert('Please enter material name');
    return;
  }

  try {
    btn.disabled = true;
    btn.textContent = 'Adding...';

    console.log('➕ Adding material:', { categoryId, name });
    await API.addMaterial({ categoryId, name });

    clearCatalogCache();

    document.getElementById('materialName').value = '';
    showSuccess('materialSuccess');

    await loadCatalog();
  } catch (error) {
    console.error('❌ Error adding material:', error);
    alert('Failed to add material: ' + (error.error || error.message));
  } finally {
    btn.disabled = false;
    btn.textContent = 'Add';
  }
}

async function addSize() {
  const materialId = document.getElementById('sizeMaterial').value;
  const value = document.getElementById('sizeValue').value.trim();
  const btn = document.getElementById('addSizeBtn');

  if (!materialId) {
    alert('Please select a material');
    return;
  }
  if (!value) {
    alert('Please enter size value');
    return;
  }

  try {
    btn.disabled = true;
    btn.textContent = 'Adding...';

    console.log('➕ Adding size:', { materialId, value });
    await API.addSize({ materialId, value });

    clearCatalogCache();

    document.getElementById('sizeValue').value = '';
    showSuccess('sizeSuccess');

    await loadCatalog();
  } catch (error) {
    console.error('❌ Error adding size:', error);
    alert('Failed to add size: ' + (error.error || error.message));
  } finally {
    btn.disabled = false;
    btn.textContent = 'Add';
  }
}

async function addFitting() {
  const materialId = document.getElementById('fittingMaterial').value;
  const name = document.getElementById('fittingName').value.trim();
  const btn = document.getElementById('addFittingBtn');

  if (!materialId) {
    alert('Please select a material');
    return;
  }
  if (!name) {
    alert('Please enter fitting name');
    return;
  }

  try {
    btn.disabled = true;
    btn.textContent = 'Adding...';

    console.log('➕ Adding fitting:', { materialId, name });
    await API.addFitting({ materialId, name });

    clearCatalogCache();

    document.getElementById('fittingName').value = '';
    showSuccess('fittingSuccess');

    await loadCatalog();
  } catch (error) {
    console.error('❌ Error adding fitting:', error);
    alert('Failed to add fitting: ' + (error.error || error.message));
  } finally {
    btn.disabled = false;
    btn.textContent = 'Add';
  }
}

async function deleteCategory(id) {
  if (!confirm('Delete this category and all its materials?')) return;

  try {
    await API.deleteCategory(id);
    clearCatalogCache();
    await loadCatalog();
    alert('✓ Category deleted');
  } catch (error) {
    console.error('Error:', error);
    alert('Failed to delete: ' + (error.error || error.message));
  }
}

async function deleteMaterial(id) {
  if (!confirm('Delete this material and all its sizes/fittings?')) return;

  try {
    await API.deleteMaterial(id);
    clearCatalogCache();
    await loadCatalog();
    alert('✓ Material deleted');
  } catch (error) {
    console.error('Error:', error);
    alert('Failed to delete: ' + (error.error || error.message));
  }
}

async function deleteSize(id) {
  if (!confirm('Delete this size?')) return;

  try {
    await API.deleteSize(id);
    clearCatalogCache();
    await loadCatalog();
    alert('✓ Size deleted');
  } catch (error) {
    console.error('Error:', error);
    alert('Failed to delete: ' + (error.error || error.message));
  }
}

async function deleteFitting(id) {
  if (!confirm('Delete this fitting?')) return;

  try {
    await API.deleteFitting(id);
    clearCatalogCache();
    await loadCatalog();
    alert('✓ Fitting deleted');
  } catch (error) {
    console.error('Error:', error);
    alert('Failed to delete: ' + (error.error || error.message));
  }
}

function showSuccess(elementId) {
  const elem = document.getElementById(elementId);
  elem.classList.add('show');
  setTimeout(() => {
    elem.classList.remove('show');
  }, 3000);
}

function showError(message) {
  alert('Error: ' + message);
}

function setupEventListeners() {
  document.getElementById('backBtn')?.addEventListener('click', () => {
    history.back();
  });

  document.getElementById('addCategoryBtn')?.addEventListener('click', addCategory);
  document.getElementById('addMaterialBtn')?.addEventListener('click', addMaterial);
  document.getElementById('addSizeBtn')?.addEventListener('click', addSize);
  document.getElementById('addFittingBtn')?.addEventListener('click', addFitting);

  document.addEventListener('click', async event => {
    const deleteButton = event.target.closest('.delete-chip-btn');
    if (!deleteButton) return;

    const entity = deleteButton.dataset.entity;
    const id = deleteButton.dataset.id;
    if (!entity || !id) return;

    if (entity === 'category') await deleteCategory(id);
    if (entity === 'material') await deleteMaterial(id);
    if (entity === 'size') await deleteSize(id);
    if (entity === 'fitting') await deleteFitting(id);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await loadCatalog();
});
