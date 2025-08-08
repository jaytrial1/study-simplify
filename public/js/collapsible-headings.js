// Shared helper: applyHeadingCollapsibles
// Exposes window.applyHeadingCollapsibles if not already defined
(function(){
  if (typeof window.applyHeadingCollapsibles === 'function') return;
  window.applyHeadingCollapsibles = function(messageElement){
    try {
      if (!messageElement) return;
      // Respect user toggle from localStorage: default enabled
      const enabled = localStorage.getItem('collapse_feature_enabled');
      if (enabled !== null && enabled !== '1') return;
      const contentContainer = messageElement.querySelector?.('.formatted-content') || messageElement;
      if (!contentContainer || contentContainer.classList.contains('collapsible-applied')) return;

      const childNodes = Array.from(contentContainer.childNodes);
      const isHeadingNode = (node) => node && node.nodeType === 1 && /^H[1-6]$/.test(node.tagName);
      if (!childNodes.some(isHeadingNode)) return;

      const root = { heading: null, level: 0, nodes: [], children: [] };
      const stack = [root];
      for (const node of childNodes) {
        if (isHeadingNode(node)) {
          const level = parseInt(node.tagName.substring(1), 10);
          while (stack.length && stack[stack.length - 1].level >= level) stack.pop();
          const parent = stack[stack.length - 1] || root;
          const section = { heading: node, level, nodes: [], children: [] };
          parent.children.push(section);
          stack.push(section);
        } else {
          (stack[stack.length - 1] || root).nodes.push(node);
        }
      }
      if (root.nodes.length > 0) {
        const synth = document.createElement('h2');
        synth.textContent = 'Overview';
        root.children.unshift({ heading: synth, level: 2, nodes: root.nodes.slice(), children: [] });
        root.nodes = [];
      }
      if (root.children.length === 0) return;

      contentContainer.classList.add('collapsible-applied');
      contentContainer.innerHTML = '';

      const controls = document.createElement('div');
      controls.className = 'section-controls';
      controls.innerHTML = '<button type="button" class="toggle-all toggle-all-cycle" title="Expand all"><i class="fas fa-expand-alt"></i></button>';
      contentContainer.appendChild(controls);

      const expandAll = () => contentContainer.querySelectorAll('.collapsible-section').forEach(sec => sec.classList.add('expanded'));
      const collapseAll = () => contentContainer.querySelectorAll('.collapsible-section').forEach(sec => sec.classList.remove('expanded'));
      const allSectionsExpanded = () => Array.from(contentContainer.querySelectorAll('.collapsible-section')).every(sec => sec.classList.contains('expanded'));
      const updateCycleIcon = () => {
        const btn = controls.querySelector('.toggle-all-cycle');
        if (!btn) return;
        if (allSectionsExpanded()) { btn.title = 'Collapse all'; btn.innerHTML = '<i class="fas fa-compress-alt"></i>'; }
        else { btn.title = 'Expand all'; btn.innerHTML = '<i class="fas fa-expand-alt"></i>'; }
      };
      controls.querySelector('.toggle-all-cycle')?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (allSectionsExpanded()) collapseAll(); else expandAll();
        updateCycleIcon();
      });
      updateCycleIcon();

      const renderSection = (section, indexWithinParent, parentContainer) => {
        const wrapper = document.createElement('div');
        wrapper.className = `collapsible-section level-${section.level}`;
        if (section.level > 1) wrapper.classList.add('nested');
        const depth = Math.max(0, section.level - 1);
        wrapper.style.setProperty('--depth', String(depth));
        wrapper.style.position = 'relative';

        const header = document.createElement('div');
        header.className = 'collapsible-header';
        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'collapsible-toggle';
        toggleBtn.setAttribute('aria-label', 'Toggle section');
        toggleBtn.innerHTML = '<i class="fas fa-chevron-down"></i>';

        // Local subtopics toggle removed per request

        const titleEl = section.heading; titleEl.classList.add('collapsible-title');
        header.appendChild(toggleBtn); header.appendChild(titleEl);

        const body = document.createElement('div'); body.className = 'collapsible-content';
        section.nodes.forEach(n => body.appendChild(n));
        wrapper.appendChild(header); wrapper.appendChild(body); parentContainer.appendChild(wrapper);

        const isTopLevel = section.level === 1 || (section.level === 2 && titleEl.textContent === 'Overview');
        const shouldExpand = section.level === 1 || (isTopLevel && indexWithinParent === 0);
        if (shouldExpand) wrapper.classList.add('expanded');

        const toggle = () => wrapper.classList.toggle('expanded');
        header.addEventListener('click', toggle);
        toggleBtn.addEventListener('click', (e) => { e.stopPropagation(); toggle(); });
        // No branch-specific toggle behavior

        section.children.forEach((child, idx) => renderSection(child, idx, parentContainer));
      };

      root.children.forEach((section, idx) => renderSection(section, idx, contentContainer));
    } catch (e) {
      console.warn('applyHeadingCollapsibles (shared) failed:', e);
    }
  };
})();


