(function () {
  const MENU_ITEMS = [
    { key: 'welcome', href: 'welcome.html', label: '🏠 Dashboard' },
    { key: 'make-bill', href: 'make-bill.html', label: '📝 Make a New Bill' },
    { key: 'edit-bill', href: 'edit-bill.html', label: '✏️ Edit Bills' },
    { key: 'reports', href: 'reports.html', label: '📊 Reports' },
    { key: 'admin-catalog', href: 'admin-catalog.html', label: '⚙️ Manage Catalog' }
  ];

  function buildMenu(activeKey) {
    const ul = document.createElement('ul');
    ul.className = 'menu';

    MENU_ITEMS.forEach(function (item) {
      const li = document.createElement('li');
      if (item.key === activeKey) {
        li.className = 'active';
      }

      const link = document.createElement('a');
      link.href = item.href;
      link.textContent = item.label;

      li.appendChild(link);
      ul.appendChild(li);
    });

    return ul;
  }

  function buildHeaderAction(dataset) {
    if (!dataset.headerActionId || !dataset.headerActionLabel) {
      return null;
    }

    const button = document.createElement('button');
    button.id = dataset.headerActionId;
    button.className = dataset.headerActionClass || 'btn-secondary';
    button.textContent = dataset.headerActionLabel;
    return button;
  }

  function buildLayout() {
    const body = document.body;
    if (!body || body.dataset.useBaseLayout !== 'true') {
      return;
    }

    const template = document.getElementById('page-content-template');
    if (!template) {
      return;
    }

    const activePage = body.dataset.pageKey || 'welcome';
    const headerTitle = body.dataset.headerTitle || document.title;
    const companyName = body.dataset.companyName || 'ABC Company';

    const dashboard = document.createElement('div');
    dashboard.className = 'dashboard';

    const sidebar = document.createElement('aside');
    sidebar.className = 'sidebar';

    const title = document.createElement('h2');
    title.className = 'company-title';
    title.textContent = companyName;

    sidebar.appendChild(title);
    sidebar.appendChild(buildMenu(activePage));

    const main = document.createElement('main');
    main.className = 'content';

    const header = document.createElement('header');
    const h1 = document.createElement('h1');
    h1.textContent = headerTitle;
    header.appendChild(h1);

    const headerAction = buildHeaderAction(body.dataset);
    if (headerAction) {
      header.appendChild(headerAction);
    }

    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'page-content';
    contentWrapper.appendChild(template.content.cloneNode(true));

    main.appendChild(header);
    main.appendChild(contentWrapper);

    dashboard.appendChild(sidebar);
    dashboard.appendChild(main);

    const firstScript = body.querySelector('script');
    body.insertBefore(dashboard, firstScript || null);
    template.remove();
  }

  document.addEventListener('DOMContentLoaded', buildLayout);
})();
