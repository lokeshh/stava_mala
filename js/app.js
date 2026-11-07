/**
 * Main Application Controller for Trika Stava SPA
 * Featuring Siddhanta Font, Pure Anvaya, and Kṣemarāja's Vivṛti Commentary
 */

class AppState {
  constructor() {
    this.textManager = window.textManager;
    let savedTextId = localStorage.getItem('trika_current_text') || 'stava_cintamani';
    const entry = this.textManager?.registry?.texts?.find(t => t.id === savedTextId);
    if (savedTextId === 'laghu_stava' || (entry && entry.status === 'coming_soon')) {
      savedTextId = 'stava_cintamani';
      localStorage.setItem('trika_current_text', 'stava_cintamani');
    }
    this.currentTextId = savedTextId;
    this.currentVerseOrder = parseInt(localStorage.getItem(`trika_last_verse_${this.currentTextId}`) || '1', 10);
    this.bookmarks = new Set(JSON.parse(localStorage.getItem(`trika_bookmarks_${this.currentTextId}`) || '[]'));
    // Default to 'light' (शुभ्र ज्योति) as requested
    const savedTheme = localStorage.getItem('trika_theme_v2');
    this.theme = savedTheme || 'light';
    this.fontScale = parseFloat(localStorage.getItem('trika_font_scale') || '1.0');
    // Default to true (Sharada separator in Mūla Shloka) as requested
    const savedSep = localStorage.getItem('trika_use_sharada_separator_v2');
    this.useSharadaSeparator = savedSep !== null ? (savedSep === 'true') : true;
    this.collapsedSections = JSON.parse(localStorage.getItem('trika_collapsed_sections') || '{}');

    this.init();
  }

  async init() {
    // Apply theme
    this.applyTheme(this.theme);
    // Apply font scale
    this.applyFontScale(this.fontScale);

    // Check URL Hash for initial route
    this.readHashRoute();

    // Setup Event Listeners
    this.setupEventListeners();

    // Load current text data (loads .json directly)
    const text = await this.textManager.loadText(this.currentTextId);
    if (text) {
      this.render();
    } else if (this.textManager.corsError) {
      const contentArea = document.getElementById('verse-display-area');
      if (contentArea) {
        contentArea.innerHTML = `
          <div style="text-align:center; padding: 2.5rem 1rem; border: 1px solid var(--border-accent); border-radius: var(--radius-md); background: var(--bg-card); max-width: 600px; margin: 2rem auto;">
            <h3 class="sanskrit" style="color: var(--text-accent); margin-bottom: 0.75rem;">लोकल सर्वर आवश्यकम् (Local Server Required)</h3>
            <p style="font-size: 0.95rem; color: var(--text-secondary); line-height: 1.6; margin-bottom: 1rem;">
              ब्राउज़र सुरक्षा-नियमानुरोधेन <code>.json</code> सञ्चिकां पठितुं लोकल सर्वर आवश्यकः अस्ति।<br>
              कृपया टर्मिनल-मध्ये इदं चालयित्वा पृष्ठं पुनरुद्घाटयतु:
            </p>
            <div style="background: var(--bg-primary); padding: 0.6rem 1rem; border-radius: 6px; font-family: monospace; display: inline-block; margin-bottom: 1rem; border: 1px solid var(--border-subtle); color: var(--text-gold);">
              python3 -m http.server 8000
            </div>
            <p style="font-size: 0.88rem; color: var(--text-muted);">
              ततः ब्राउज़र-मध्ये <a href="http://localhost:8000" style="color: var(--text-accent);">http://localhost:8000</a> उद्घाटयतु।
            </p>
          </div>
        `;
      }
    }
  }

  savePreferences() {
    localStorage.setItem('trika_theme', this.theme);
    localStorage.setItem('trika_theme_v2', this.theme);
    localStorage.setItem('trika_font_scale', this.fontScale.toString());
    localStorage.setItem('trika_use_sharada_separator', this.useSharadaSeparator.toString());
    localStorage.setItem('trika_use_sharada_separator_v2', this.useSharadaSeparator.toString());
    localStorage.setItem('trika_current_text', this.currentTextId);
    localStorage.setItem(`trika_last_verse_${this.currentTextId}`, this.currentVerseOrder.toString());
    localStorage.setItem(`trika_bookmarks_${this.currentTextId}`, JSON.stringify(Array.from(this.bookmarks)));
    localStorage.setItem('trika_collapsed_sections', JSON.stringify(this.collapsedSections));
  }

  applyTheme(theme) {
    this.theme = theme;
    if (theme === 'default') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
    const themeSelect = document.getElementById('select-theme');
    if (themeSelect) themeSelect.value = theme;
    this.savePreferences();
  }

  applyFontScale(scale) {
    this.fontScale = Math.max(0.75, Math.min(1.6, scale));
    document.documentElement.style.setProperty('--sloka-font-size', `${(2.1 * this.fontScale).toFixed(2)}rem`);
    document.documentElement.style.setProperty('--anvaya-font-size', `${(1.35 * this.fontScale).toFixed(2)}rem`);
    document.documentElement.style.setProperty('--vishayartha-font-size', `${(1.12 * this.fontScale).toFixed(2)}rem`);
    document.documentElement.style.setProperty('--avataranika-font-size', `${(1.08 * this.fontScale).toFixed(2)}rem`);
    document.documentElement.style.setProperty('--vivriti-font-size', `${(1.18 * this.fontScale).toFixed(2)}rem`);
    this.savePreferences();
  }

  toggleSharadaSeparator() {
    this.useSharadaSeparator = !this.useSharadaSeparator;
    this.savePreferences();
    this.render();
    UI.showToast(this.useSharadaSeparator ? "सर्वत्र 𑇈 विभाजकः सक्रियः (अन्वयं विना)" : "टीकायां सामान्य-अन्तरिक्षः सक्रियः");
  }

  readHashRoute() {
    const hash = window.location.hash.substring(1);
    if (!hash) return;
    const params = new URLSearchParams(hash);
    const textId = params.get('text');
    const slokaNum = parseInt(params.get('sloka') || '1', 10);

    if (textId) {
      const entry = this.textManager?.registry?.texts?.find(t => t.id === textId);
      if (entry && entry.status === 'coming_soon') {
        UI.showToast(`ग्रन्थ "${entry.title}" शीघ्र ही उपलब्ध होगा!`);
        this.updateHashRoute();
      } else if (this.textManager.setText(textId)) {
        this.currentTextId = textId;
        this.bookmarks = new Set(JSON.parse(localStorage.getItem(`trika_bookmarks_${this.currentTextId}`) || '[]'));
      }
    }
    if (!isNaN(slokaNum) && slokaNum >= 1 && slokaNum <= this.textManager.getTotalVerses()) {
      this.currentVerseOrder = slokaNum;
    }
  }

  updateHashRoute() {
    window.location.hash = `#text=${encodeURIComponent(this.currentTextId)}&sloka=${this.currentVerseOrder}`;
  }

  goToVerse(order) {
    const total = this.textManager.getTotalVerses();
    if (order < 1) order = 1;
    if (order > total) order = total;

    this.currentVerseOrder = order;
    this.savePreferences();
    this.updateHashRoute();
    this.render();

    // Scroll smoothly to top of sloka card if scrolled far
    const card = document.getElementById('current-sloka-card');
    if (card && window.scrollY > 200) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  nextVerse() {
    this.goToVerse(this.currentVerseOrder + 1);
  }

  prevVerse() {
    this.goToVerse(this.currentVerseOrder - 1);
  }

  toggleBookmark(verseOrder = this.currentVerseOrder) {
    if (this.bookmarks.has(verseOrder)) {
      this.bookmarks.delete(verseOrder);
      UI.showToast(`श्लोक ${verseOrder} बुकमार्क से हटाया गया`);
    } else {
      this.bookmarks.add(verseOrder);
      UI.showToast(`श्लोक ${verseOrder} बुकमार्क में जोड़ा गया ★`);
    }
    this.savePreferences();
    this.render();
  }

  async switchText(textId) {
    const entry = this.textManager?.registry?.texts?.find(t => t.id === textId);
    if (entry && entry.status === 'coming_soon') {
      UI.showToast(`ग्रन्थ "${entry.title}" शीघ्र ही उपलब्ध होगा!`);
      const selectorEl = document.getElementById('text-selector');
      if (selectorEl) selectorEl.value = this.currentTextId;
      return;
    }
    const loaded = await this.textManager.loadText(textId);
    if (loaded) {
      this.currentTextId = textId;
      this.currentVerseOrder = parseInt(localStorage.getItem(`trika_last_verse_${this.currentTextId}`) || '1', 10);
      this.bookmarks = new Set(JSON.parse(localStorage.getItem(`trika_bookmarks_${this.currentTextId}`) || '[]'));
      this.savePreferences();
      this.updateHashRoute();
      this.render();
      UI.showToast(`ग्रन्थ परिवर्तित: ${this.textManager.getCurrentText().title}`);
    } else {
      UI.showToast(`ग्रन्थ "${textId}" शीघ्र ही उपलब्ध होगा!`);
      const selectorEl = document.getElementById('text-selector');
      if (selectorEl) selectorEl.value = this.currentTextId;
    }
  }

  render() {
    const text = this.textManager.getCurrentText();
    if (!text) return;

    // Render header title & selector
    const selectorEl = document.getElementById('text-selector');
    if (selectorEl && selectorEl.value !== this.currentTextId) {
      selectorEl.value = this.currentTextId;
    }

    // Update Separator Toggle Button
    const sepBtn = document.getElementById('btn-toggle-separator');
    if (sepBtn) {
      sepBtn.classList.toggle('active', this.useSharadaSeparator);
      sepBtn.title = this.useSharadaSeparator ? "सर्वत्र 𑇈 विभाजक सक्रिय (अन्वयं विना) [सामान्य रिक्तये क्लिक् कुर्वन्तु]" : "सामान्य रिक्ति सक्रिय [सर्वत्र 𑇈 विभाजकाय क्लिक् कुर्वन्तु]";
    }

    // Render Text Info Banner
    const metaContainer = document.getElementById('text-meta-container');
    if (metaContainer) {
      metaContainer.innerHTML = UI.renderTextMeta(text);
    }

    // Render Navigation & Progress Bar
    const total = this.textManager.getTotalVerses();
    const percent = total > 0 ? Math.round((this.currentVerseOrder / total) * 100) : 0;

    const jumpInput = document.getElementById('nav-jump-input');
    if (jumpInput) {
      jumpInput.value = this.currentVerseOrder;
      jumpInput.max = total;
    }

    const progressText = document.getElementById('nav-progress-text');
    if (progressText) {
      const currentDev = UI.toDevanagariDigits(this.currentVerseOrder);
      const totalDev = UI.toDevanagariDigits(total);
      progressText.textContent = `श्लोक ${currentDev} / ${totalDev} (${percent}%)`;
    }

    const progressBar = document.getElementById('nav-progress-fill');
    if (progressBar) {
      progressBar.style.width = `${percent}%`;
    }

    // Render Current Verse: Shloka + ONLY Anvaya and Vivriti
    const verse = this.textManager.getVerse(this.currentVerseOrder);
    const contentArea = document.getElementById('verse-display-area');
    if (!contentArea || !verse) return;

    const isBookmarked = this.bookmarks.has(verse.order);

    const isCommentaryCollapsed = Boolean(
      this.collapsedSections['vivriti'] !== undefined 
        ? this.collapsedSections['vivriti'] 
        : this.collapsedSections['avataranika']
    );

    const isVishayarthaCollapsed = this.collapsedSections['vishayartha'] !== undefined 
      ? Boolean(this.collapsedSections['vishayartha']) 
      : true;

    contentArea.innerHTML = `
      ${UI.renderSlokaCard(verse, isBookmarked, this.useSharadaSeparator, isCommentaryCollapsed, isVishayarthaCollapsed)}
      ${UI.renderAnvayaCard(verse, this.collapsedSections['anvaya'])}
      ${UI.renderVivritiCard(verse, isCommentaryCollapsed, this.useSharadaSeparator)}
    `;

    // Reattach inner card button events
    const btnBookmark = document.getElementById('btn-toggle-bookmark');
    if (btnBookmark) {
      btnBookmark.onclick = () => this.toggleBookmark();
    }

    const btnCopy = document.getElementById('btn-copy-sloka');
    if (btnCopy) {
      btnCopy.onclick = () => UI.copyToClipboard(UI.formatDevanagari(verse.sloka, true), "श्लोकः प्रतिलिपि कृतः (Shloka copied)");
    }

    const btnCopyAnvaya = document.getElementById('btn-copy-anvaya');
    if (btnCopyAnvaya) {
      btnCopyAnvaya.onclick = (e) => UI.copyAnvaya(e);
    }

    const btnCopyVivriti = document.getElementById('btn-copy-vivriti');
    if (btnCopyVivriti) {
      btnCopyVivriti.onclick = (e) => UI.copyVivriti(e);
    }

    const btnPrev = document.getElementById('btn-prev-sloka');
    if (btnPrev) {
      btnPrev.onclick = () => this.prevVerse();
    }

    const btnNext = document.getElementById('btn-next-sloka');
    if (btnNext) {
      btnNext.onclick = () => this.nextVerse();
    }
  }

  setupEventListeners() {
    // Text Selector
    const textSelect = document.getElementById('text-selector');
    if (textSelect) {
      textSelect.onchange = (e) => this.switchText(e.target.value);
    }

    // Jump Input Enter Key
    const jumpInput = document.getElementById('nav-jump-input');
    if (jumpInput) {
      jumpInput.onkeydown = (e) => {
        if (e.key === 'Enter') {
          const val = parseInt(jumpInput.value, 10);
          if (!isNaN(val)) this.goToVerse(val);
        }
      };
    }

    const jumpBtn = document.getElementById('nav-jump-btn');
    if (jumpBtn) {
      jumpBtn.onclick = () => {
        const val = parseInt(jumpInput.value, 10);
        if (!isNaN(val)) this.goToVerse(val);
      };
    }

    // Sharada Separator Toggle
    const btnToggleSep = document.getElementById('btn-toggle-separator');
    if (btnToggleSep) {
      btnToggleSep.onclick = () => this.toggleSharadaSeparator();
    }

    // Font Controls
    const btnFontMinus = document.getElementById('btn-font-minus');
    if (btnFontMinus) {
      btnFontMinus.onclick = () => this.applyFontScale(this.fontScale - 0.1);
    }
    const btnFontPlus = document.getElementById('btn-font-plus');
    if (btnFontPlus) {
      btnFontPlus.onclick = () => this.applyFontScale(this.fontScale + 0.1);
    }

    // Theme Selector
    const themeSelect = document.getElementById('select-theme');
    if (themeSelect) {
      themeSelect.onchange = (e) => this.applyTheme(e.target.value);
    }

    // Table of Contents Modal
    const btnToc = document.getElementById('btn-open-toc');
    if (btnToc) {
      btnToc.onclick = () => this.openTocModal();
    }

    // Bookmarks Modal
    const btnBookmarksList = document.getElementById('btn-open-bookmarks');
    if (btnBookmarksList) {
      btnBookmarksList.onclick = () => this.openBookmarksModal();
    }

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
        return;
      }

      switch (e.key) {
        case 'ArrowLeft':
        case 'j':
        case 'J':
          this.prevVerse();
          break;
        case 'ArrowRight':
        case 'k':
        case 'K':
          this.nextVerse();
          break;
        case 'Home':
          this.goToVerse(1);
          break;
        case 'End':
          this.goToVerse(this.textManager.getTotalVerses());
          break;
        case 'b':
        case 'B':
          this.toggleBookmark();
          break;
        case 't':
        case 'T':
          this.openTocModal();
          break;
        case 'Escape':
          this.closeAllModals();
          break;
      }
    });

    // Hash change event (Back/Forward browser buttons)
    window.addEventListener('hashchange', () => {
      this.readHashRoute();
      this.render();
    });
  }

  openTocModal(filterQuery = '') {
    const modal = document.getElementById('toc-modal');
    if (!modal) return;

    const listContainer = document.getElementById('toc-grid-container');

    const renderGrid = (query) => {
      const verses = this.textManager.searchVerses(query);
      if (verses.length === 0) {
        listContainer.innerHTML = '<div style="text-align:center; padding:2rem; color:var(--text-muted);">कोऽपि श्लोकः न प्राप्तः (No verses found)</div>';
        return;
      }

      listContainer.innerHTML = verses.map(v => {
        const isActive = v.order === this.currentVerseOrder;
        const isBookmarked = this.bookmarks.has(v.order);
        const firstLine = v.first_line || v.sloka.split('\n')[0];
        return `
          <button class="grid-sloka-item ${isActive ? 'active' : ''} ${isBookmarked ? 'bookmarked' : ''}" 
                  onclick="appState.goToVerse(${v.order}); appState.closeAllModals();"
                  title="श्लोक ${v.number} : ${UI.escapeHTML(firstLine)}">
            ${v.number}
          </button>
        `;
      }).join('');
    };

    renderGrid(filterQuery);

    const searchInput = document.getElementById('toc-search-input');
    if (searchInput) {
      searchInput.value = filterQuery;
      searchInput.oninput = (e) => renderGrid(e.target.value);
    }

    modal.classList.add('open');
  }

  openBookmarksModal() {
    const modal = document.getElementById('bookmarks-modal');
    if (!modal) return;

    const listContainer = document.getElementById('bookmarks-list-container');
    const bookmarkArray = Array.from(this.bookmarks).sort((a, b) => a - b);

    if (bookmarkArray.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align:center; padding:2rem; color:var(--text-muted);">
          अद्यापि कोऽपि श्लोकः न बुकमार्कितः।<br>
          (No bookmarked verses yet. Click the ☆ icon on any sloka to save it.)
        </div>
      `;
    } else {
      listContainer.innerHTML = bookmarkArray.map(order => {
        const verse = this.textManager.getVerse(order);
        if (!verse) return '';
        const firstLine = verse.first_line || verse.sloka.split('\n')[0];
        return `
          <div style="display:flex; align-items:center; justify-content:space-between; padding:0.75rem 1rem; border-bottom:1px solid var(--border-subtle); background:var(--bg-secondary); border-radius:var(--radius-sm); margin-bottom:0.5rem;">
            <div>
              <strong class="sanskrit" style="color:var(--text-gold); font-size:1.1rem;">श्लोक ${verse.number}</strong>
              <div class="sanskrit" style="font-size:0.95rem; color:var(--text-primary); margin-top:0.2rem;">
                ${UI.escapeHTML(firstLine)}
              </div>
            </div>
            <div style="display:flex; gap:0.4rem;">
              <button class="icon-btn" onclick="appState.goToVerse(${order}); appState.closeAllModals();" title="श्लोक देखें">
                ➜
              </button>
              <button class="icon-btn" onclick="appState.toggleBookmark(${order}); appState.openBookmarksModal();" title="हटाएँ">
                ✕
              </button>
            </div>
          </div>
        `;
      }).join('');
    }

    modal.classList.add('open');
  }

  closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
  }
}

// Export and instantiate on DOM load
window.AppState = AppState;
document.addEventListener('DOMContentLoaded', () => {
  window.appState = new AppState();
});
