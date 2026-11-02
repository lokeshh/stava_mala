/**
 * UI Components & View Renderers for Trika Stava SPA
 * Featuring Siddhanta Font, Pure Anvaya, and Kṣemarāja's Vivṛti Commentary
 */

const UI = {
  /**
   * Format Devanagari text based on the Sharada separator setting
   */
  formatDevanagari(text, useSharadaSeparator = false) {
    if (!text) return '';
    if (useSharadaSeparator) {
      // 1. Replace all whitespace runs with Sharada separator (𑇈)
      let t = text.replace(/[ \t\r\f\v]+/gu, '𑇈');

      // 2. Strictly remove 𑇈 around hyphens and dashes (—, –, -)
      t = t.replace(/[ \t\r\f\v𑇈]+([—–\-])/gu, '$1');
      t = t.replace(/([—–\-])[ \t\r\f\v𑇈]+/gu, '$1');

      // 3. Skip replacing space after , and punctuation (remove 𑇈 before, ensure standard space after)
      t = t.replace(/[ 𑇈]+([,;:?!])/gu, '$1');
      t = t.replace(/([,;:?!])[ 𑇈]*/gu, '$1 ');

      // 4. Ensure single space before dandas (॥ and ।) when following a word or hyphen
      t = t.replace(/([^\s𑇈॥।])[ 𑇈]*(॥|।।|[।])/gu, '$1 $2');

      // 5. Clean verse numbers inside double dandas: remove spaces and 𑇈 inside
      // e.g. ॥ ५३ ॥ -> ॥५३॥, ॥ ४७ (१) ॥ -> ॥४७(१)॥
      t = t.replace(/(॥|।।)[ 𑇈]*([०-९\d\s𑇈()]+?)[ 𑇈]*(॥|।।)/gu, (match, d1, inner, d2) => {
        const cleanInner = inner.replace(/[ 𑇈]+/gu, '');
        return `${d1}${cleanInner}${d2}`;
      });

      // 6. Skip replacing space after । and ॥ (ensure standard space after, never 𑇈)
      t = t.replace(/([।])[ 𑇈]+/gu, '$1 ');
      t = t.replace(/(॥|।।)[ 𑇈]+/gu, '$1 ');

      // 7. Clean line ends & beginnings (remove trailing/leading 𑇈 or spaces per line)
      t = t.replace(/[ 𑇈]+$/gmu, '');
      t = t.replace(/^[ 𑇈]+/gmu, '');

      // Normalize any double spaces that might have occurred from punctuation spacing
      t = t.replace(/ {2,}/g, ' ');

      return t.trim();
    } else {
      // Normal clean Sanskrit spacing
      let t = text.replace(/𑇈/gu, ' ');
      t = t.replace(/[ \t]+/gu, ' ');
      t = t.replace(/[ \t]+([—–-])(\n|$)/gmu, '$1$2');
      t = t.replace(/[ \t]+([,;:?!])/gu, '$1');
      t = t.replace(/([,;:?!])[ \t]+/gu, '$1 ');

      // Ensure single space before dandas (॥ and ।)
      t = t.replace(/([^\s॥।])[ \t]*(॥|।।|[।])/gu, '$1 $2');

      // Remove spaces inside double dandas ॥ ५३ ॥ -> ॥५३॥
      t = t.replace(/(॥|।।)[ \t]*([०-९\d\s()]+?)[ \t]*(॥|।।)/gu, (match, d1, inner, d2) => {
        const cleanInner = inner.replace(/\s+/g, '');
        return `${d1}${cleanInner}${d2}`;
      });

      t = t.replace(/[ \t]+$/gmu, '');
      t = t.replace(/^[ \t]+/gmu, '');
      t = t.replace(/ {2,}/g, ' ');
      return t.trim();
    }
  },

  /**
   * Escape HTML utility
   */
  escapeHTML(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  /**
   * Format commentary / prose text with clean spacing or Sharada separator and bold pratīka
   * e.g. "भव - प्रकाशैकात्मना" -> "<strong class=\"pratika-bold\">भव</strong> प्रकाशैकात्मना"
   * e.g. "निर्द्वन्द्वे - परमाद्वयरूपे" -> "<strong class=\"pratika-bold\">निर्द्वन्द्वे</strong> परमाद्वयरूपे"
   */
  formatCommentaryHTML(text, useSharadaSeparator = false) {
    if (!text) return '';
    // 1. Format clean Devanagari spacing (standard spaces) or Sharada separator
    let t = UI.formatDevanagari(text, useSharadaSeparator);

    // 2. Escape HTML entities
    t = UI.escapeHTML(t);

    // 3. Highlight pratīka word directly preceding a single hyphen/dash, removing the redundant hyphen
    const pratikaRegex = /(?:^|(?<=[\s\n(𑇈]))(?!\d+|[०-९]+)([\u0900-\u097F\u1CD0-\u1CFF\uA8E0-\uA8FF]+)([,;:?!]?)\s*(?<![-—–])[-—–](?![-—–])\s*/gu;

    const sepSpace = useSharadaSeparator ? '𑇈' : ' ';
    t = t.replace(pratikaRegex, (match, word, punct) => {
      // If there is punctuation like comma, skip replacing space after punct (keep normal space)
      const after = punct ? `${punct} ` : sepSpace;
      return `<strong class="pratika-bold">${word}</strong>${after}`;
    });

    t = t.replace(/[ \t]+$/gmu, '');
    t = t.replace(/ {2,}/g, ' ');

    return t.trim();
  },

  /**
   * Copy text to clipboard with notification
   */
  copyToClipboard(text, message = "प्रतिलिपि कृता (Copied to clipboard!)") {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        UI.showToast(message);
      }).catch(() => {
        UI.fallbackCopy(text, message);
      });
    } else {
      UI.fallbackCopy(text, message);
    }
  },

  fallbackCopy(text, message) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      document.execCommand('copy');
      UI.showToast(message);
    } catch (err) {
      UI.showToast("प्रतिलिपि असमर्था (Failed to copy)");
    }
    document.body.removeChild(ta);
  },

  /**
   * Show toast notification
   */
  showToast(msg) {
    let toast = document.getElementById("app-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "app-toast";
      toast.className = "toast-notice";
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
      toast.classList.remove("show");
    }, 2400);
  },

  /**
   * Render Text Meta Banner
   */
  renderTextMeta(text) {
    return `
      <div class="text-meta-banner">
        <div class="meta-left">
          <div class="text-title-large sanskrit">${UI.escapeHTML(text.title)}</div>
          <div class="text-author-sub">
            ग्रन्थकार: <strong>${UI.escapeHTML(text.author)}</strong> • ${UI.escapeHTML(text.tradition)} • टीका: <strong>${UI.escapeHTML(text.commentator || 'आचार्य क्षेमराज (विवृति)')}</strong>
          </div>
        </div>
        <div class="meta-badges">
          <span class="badge badge-saffron">कुल श्लोकाः: ${text.total_verses}</span>
          <span class="badge">${UI.escapeHTML(text.meter || 'अनुष्टुप्')}</span>
        </div>
      </div>
    `;
  },

  /**
   * Render Main Sloka Display Card (with optional Avataraṇikā)
   */
  renderSlokaCard(verse, isBookmarked, useSharada = false) {
    // Mūla Shloka necessarily uses the separator ALWAYS
    const slokaFormatted = UI.formatDevanagari(verse.sloka, true);
    const lines = slokaFormatted.split('\n');
    const avataranikaFormatted = verse.avataranika ? UI.formatCommentaryHTML(verse.avataranika, useSharada) : '';
    const vishayarthaFormatted = verse.vishayartha_sangraha ? UI.formatCommentaryHTML(verse.vishayartha_sangraha, useSharada) : '';

    return `
      <article class="sloka-display-card" id="current-sloka-card">
        <div class="sloka-header-row">
          <div class="sloka-num-badge sanskrit">श्लोक ${verse.number} <span class="ms-tag">(${verse.order} / ${window.textManager ? window.textManager.getTotalVerses() : 121})</span></div>
          <div class="sloka-card-actions">
            <button class="icon-btn ${isBookmarked ? 'active' : ''}" id="btn-toggle-bookmark" title="बुकमार्क करें (Bookmark [B])" aria-label="Bookmark">
              ${isBookmarked ? '★' : '☆'}
            </button>
            <button class="icon-btn" id="btn-copy-sloka" title="श्लोक प्रतिलिपि करें (Copy Shloka)" aria-label="Copy">
              ⎘
            </button>
          </div>
        </div>

        ${vishayarthaFormatted ? `
          <div class="vishayartha-wrap">
            <div class="vishayartha-header">
              <span class="vishayartha-tag sanskrit">मूलश्लोकानां संक्षेपेण विषयार्थसंग्रहः</span>
            </div>
            <div class="vishayartha-text sanskrit">${vishayarthaFormatted}</div>
          </div>
        ` : ''}

        ${avataranikaFormatted ? `
          <div class="avataranika-wrap">
            <div class="avataranika-header">
              <span class="avataranika-tag sanskrit">अवतरणिका (भूमिका)</span>
            </div>
            <div class="avataranika-text sanskrit">${avataranikaFormatted}</div>
          </div>
        ` : ''}

        <div class="sloka-text-box">
          ${lines.map(l => `<div class="sloka-line sanskrit">${UI.escapeHTML(l)}</div>`).join('')}
          <div class="sloka-meter-tag sanskrit">छन्द: अनुष्टुप्</div>
        </div>

        <div class="sloka-nav-arrows">
          <button class="nav-arrow-btn" id="btn-prev-sloka" ${verse.order <= 1 ? 'disabled' : ''}>
            <span>← पूर्व श्लोक</span>
            <span class="key-hint">Left</span>
          </button>
          <button class="nav-arrow-btn" id="btn-next-sloka" ${verse.order >= (window.textManager ? window.textManager.getTotalVerses() : 121) ? 'disabled' : ''}>
            <span>अग्रिम श्लोक →</span>
            <span class="key-hint">Right</span>
          </button>
        </div>
      </article>
    `;
  },

  /**
   * Render Anvaya Card (Always uses standard clean spaces for readability)
   */
  renderAnvayaCard(verse, isCollapsed) {
    const anvayaFormatted = UI.formatDevanagari(verse.anvaya, false);
    return `
      <section class="detail-card anvaya-card ${isCollapsed ? 'collapsed' : ''}" data-section="anvaya">
        <div class="card-header" onclick="UI.toggleCard(this)">
          <div class="card-header-left">
            <span class="card-title anvaya-title sanskrit">🧭 अन्वयः (Anvaya / Prose Order)</span>
            <span class="card-badge">संस्कृत-पदान्वय</span>
          </div>
          <div style="display:flex; align-items:center; gap:0.5rem;">
            <button class="icon-btn" style="width:28px; height:28px; font-size:0.8rem;" onclick="event.stopPropagation(); UI.copyToClipboard('${UI.escapeHTML(anvayaFormatted).replace(/'/g, "\\'")}', 'अन्वयः प्रतिलिपि कृतः')" title="अन्वय कॉपी करें">
              ⎘
            </button>
            <span class="card-toggle-icon">▼</span>
          </div>
        </div>
        <div class="card-body">
          <div class="anvaya-content sanskrit">
            ${UI.escapeHTML(anvayaFormatted)}
          </div>
        </div>
      </section>
    `;
  },

  /**
   * Render Kṣemarāja's Vivṛti Commentary Card (Always uses standard clean spaces)
   */
  renderVivritiCard(verse, isCollapsed, useSharada = false) {
    if (!verse.vivriti) return '';
    const paragraphs = verse.vivriti.split('\n\n').filter(p => p.trim());
    const fullTextFormatted = UI.formatDevanagari(verse.vivriti, useSharada);

    return `
      <section class="detail-card vivriti-card ${isCollapsed ? 'collapsed' : ''}" data-section="vivriti">
        <div class="card-header" onclick="UI.toggleCard(this)">
          <div class="card-header-left">
            <span class="card-title vivriti-title sanskrit">📜 विवृत्तिः (श्रीक्षेमराजकृतव्याख्या)</span>
            <span class="card-badge">काश्मीर-संस्कृत-टीका</span>
          </div>
          <div style="display:flex; align-items:center; gap:0.5rem;">
            <button class="icon-btn" style="width:28px; height:28px; font-size:0.8rem;" onclick="event.stopPropagation(); UI.copyToClipboard('${UI.escapeHTML(fullTextFormatted).replace(/'/g, "\\'")}', 'विवृत्तिः प्रतिलिपि कृता')" title="विवृत्ति कॉपी करें">
              ⎘
            </button>
            <span class="card-toggle-icon">▼</span>
          </div>
        </div>
        <div class="card-body vivriti-body">
          ${paragraphs.map(p => `
            <p class="vivriti-para sanskrit">${UI.formatCommentaryHTML(p, useSharada)}</p>
          `).join('')}
        </div>
      </section>
    `;
  },

  /**
   * Toggle Card Accordion
   */
  toggleCard(headerEl) {
    const card = headerEl.closest('.detail-card');
    if (card) {
      card.classList.toggle('collapsed');
      const sectionName = card.dataset.section;
      if (window.appState && sectionName) {
        window.appState.collapsedSections[sectionName] = card.classList.contains('collapsed');
        window.appState.savePreferences();
      }
    }
  }
};

window.UI = UI;
