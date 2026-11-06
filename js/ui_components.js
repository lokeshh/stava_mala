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
    // Replace commas with just a space as requested (e.g. "स्वभित्ताववभासयन्, अवरोहक्रमेण" -> "स्वभित्ताववभासयन् अवरोहक्रमेण")
    let cleanText = text.replace(/,/gu, ' ');

    if (useSharadaSeparator) {
      // 1. Replace all whitespace runs with Sharada separator (𑇈)
      let t = cleanText.replace(/[ \t\r\f\v]+/gu, '𑇈');

      // 2. Strictly remove 𑇈 around hyphens and dashes (—, –, -)
      t = t.replace(/[ \t\r\f\v𑇈]+([—–\-])/gu, '$1');
      t = t.replace(/([—–\-])[ \t\r\f\v𑇈]+/gu, '$1');

      // 3. Punctuation spacing (remove 𑇈 before, ensure standard space after)
      t = t.replace(/[ 𑇈]+([;:?!])/gu, '$1');
      t = t.replace(/([;:?!])[ 𑇈]*/gu, '$1 ');

      // Remove space before dandas (॥ and ।)
      t = t.replace(/[ \t\r\f\v𑇈\u00A0]+(॥|।।|[।])/gu, '$1');

      // 4. Clean verse numbers inside double dandas: remove spaces and 𑇈 inside
      // e.g. ॥ ५३ ॥ -> ॥५३॥, ॥ ४७ (१) ॥ -> ॥४७(१)॥
      t = t.replace(/(॥|।।)[ 𑇈\u00A0]*([०-९\d\s𑇈()]+?)[ 𑇈\u00A0]*(॥|।।)/gu, (match, d1, inner, d2) => {
        const cleanInner = inner.replace(/[ 𑇈\u00A0]+/gu, '');
        return `${d1}${cleanInner}${d2}`;
      });

      // 6. Skip replacing space after । and ॥ (ensure standard space after, never 𑇈)
      t = t.replace(/([।])[ 𑇈\u00A0]+/gu, '$1 ');
      t = t.replace(/(॥|।।)[ 𑇈\u00A0]+/gu, '$1 ');

      // 7. Clean line ends & beginnings (remove trailing/leading 𑇈 or spaces per line)
      t = t.replace(/[ 𑇈]+$/gmu, '');
      t = t.replace(/^[ 𑇈]+/gmu, '');

      // Normalize any double spaces that might have occurred from punctuation spacing
      t = t.replace(/ {2,}/g, ' ');

      return t.trim();
    } else {
      // Normal clean Sanskrit spacing
      let t = cleanText.replace(/𑇈/gu, ' ');
      t = t.replace(/[ \t]+/gu, ' ');
      t = t.replace(/[ \t]+([—–-])(\n|$)/gmu, '$1$2');
      t = t.replace(/[ \t]+([;:?!])/gu, '$1');
      t = t.replace(/([;:?!])[ \t]+/gu, '$1 ');

      // Remove space before dandas (॥ and ।)
      t = t.replace(/[ \t\u00A0]+(॥|।।|[।])/gu, '$1');

      // Remove spaces inside double dandas ॥ ५३ ॥ -> ॥५३॥
      t = t.replace(/(॥|।।)[ \t\u00A0]*([०-९\d\s()]+?)[ \t\u00A0]*(॥|।।)/gu, (match, d1, inner, d2) => {
        const cleanInner = inner.replace(/[\s\u00A0]+/g, '');
        return `${d1}${cleanInner}${d2}`;
      });

      t = t.replace(/([।])[ \t\u00A0]+/gu, '$1 ');
      t = t.replace(/(॥|।।)[ \t\u00A0]+/gu, '$1 ');

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
   * Syllable-aware Devanagari hyphenator for Sanskrit compounds.
   * Inserts soft hyphens (&shy; / \u00AD) at phonetic akṣara boundaries.
   * When lines wrap, browsers break at these soft hyphens and display a '-' character,
   * while remaining completely invisible when fitting on a single line.
   */
  hyphenateDevanagariWord(word) {
    if (!word || word.length < 12) return word;
    // Match Devanagari syllables: independent vowels, consonants with conjuncts/virama/matras, avagraha, modifiers
    const aksaraRegex = /(?:[\u0904-\u0914\u0960\u0961\u093D]|(?:[\u0915-\u0939\u0958-\u095F]\u093C?\u094D)*[\u0915-\u0939\u0958-\u095F]\u093C?(?:[\u093E-\u094C\u0962\u0963]|\u094D)?)(?:[\u0901-\u0903])?/gu;
    const aksaras = word.match(aksaraRegex);
    if (!aksaras || aksaras.length <= 3) return word;

    let result = '';
    for (let i = 0; i < aksaras.length; i++) {
      result += aksaras[i];
      // 1. Keep at least 2 aksaras before first hyphen
      if (i < 1) continue;
      // 2. Keep at least 2 aksaras after last hyphen
      if (i >= aksaras.length - 2) continue;
      // 3. Do not break before a pure halanta coda (e.g. next aksara is 'म्' or 'त्' ending with virama)
      if (i + 1 < aksaras.length && aksaras[i + 1].endsWith('\u094D')) continue;
      // 4. Do not break before an avagraha 'ऽ'
      if (i + 1 < aksaras.length && aksaras[i + 1] === 'ऽ') continue;
      // 5. Do not break after an avagraha 'ऽ'
      if (aksaras[i] === 'ऽ') continue;

      result += '\u00AD';
    }

    // Safety: ensure any leading or trailing characters not captured by aksaraRegex (e.g. danda, digits, punctuation) are preserved
    const firstAksara = aksaras[0];
    const prefixIdx = word.indexOf(firstAksara);
    const prefix = prefixIdx > 0 ? word.slice(0, prefixIdx) : '';
    const matchedLen = prefix.length + aksaras.join('').length;
    const suffix = matchedLen < word.length ? word.slice(matchedLen) : '';

    return prefix + result + suffix;
  },

  /**
   * Add soft hyphens to all long Sanskrit words (length >= 12) in HTML or plain text.
   * Only matches Devanagari word characters (\u0900-\u0963, \u0971-\u097F),
   * explicitly excluding dandas (\u0964, \u0965), digits (\u0966-\u096F), and punctuation.
   */
  addSoftHyphens(str) {
    if (!str) return '';
    return str.replace(/[\u0900-\u0963\u0971-\u097F\u1CD0-\u1CFF\uA8E0-\uA8FF]{12,}/gu, (match) => {
      const cleanMatch = match.replace(/\u00AD/gu, '');
      return UI.hyphenateDevanagariWord(cleanMatch);
    });
  },

  /**
   * Format commentary / prose text with clean spacing or Sharada separator and bold pratīka
   * Words quoted directly from the root verse are highlighted using <strong class="pratika-bold">.
   */
  formatCommentaryHTML(text, useSharadaSeparator = false, verse = null) {
    if (!text) return '';
    // 1. Format clean Devanagari spacing (standard spaces) or Sharada separator
    let t = UI.formatDevanagari(text, useSharadaSeparator);

    // 2. Escape HTML entities
    t = UI.escapeHTML(t);

    const sepSpace = useSharadaSeparator ? '𑇈' : ' ';

    // 2.5 Support explicit pratīka markings directly in the text:
    // <pr>word</pr>, <strong>word</strong>, <b>word</b>, or **word** (with optional trailing hyphen)
    const explicitRegex = /(?:\*\*|&lt;pr(?:\s+[^>]*)?&gt;|&lt;strong(?:\s+class="[^"]*")?&gt;|&lt;b&gt;|<pr>|<strong>|<b>)([\s\S]+?)(?:\*\*|&lt;\/pr&gt;|&lt;\/strong&gt;|&lt;\/b&gt;|<\/pr>|<\/strong>|<\/b>)([;:?!]?)[ \t\r\f\v𑇈]*(?:(?<![-—–])[-—–](?![-—–])[ \t\r\f\v𑇈]*)?/gu;
    t = t.replace(explicitRegex, (match, word, punct) => {
      const cleanWord = word.trim();
      const after = punct ? `${punct} ` : sepSpace;
      return `<strong class="pratika-bold">${cleanWord}</strong>${after}`;
    });

    // 2.6 Support explicit "pratikas" array defined on the verse object in JSON (if present)
    if (verse && Array.isArray(verse.pratikas) && verse.pratikas.length > 0) {
      const sorted = [...verse.pratikas].filter(Boolean).map(p => p.trim()).sort((a, b) => b.length - a.length);
      for (const pratika of sorted) {
        if (!pratika) continue;
        const escaped = pratika.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pRegex = new RegExp(`(?<![<\\/\\w])(${escaped})([;:?!]?)[ \\t\\r\\f\\v𑇈]*(?:(?<![-—–])[-—–](?![-—–])[ \\t\\r\\f\\v𑇈]*)?`, 'gu');
        t = t.replace(pRegex, (m, word, punct) => {
          const after = punct ? `${punct} ` : sepSpace;
          return `<strong class="pratika-bold">${word}</strong>${after}`;
        });
      }
    }

    // 2.7 Support <q>...</q> quotation tags for quoted verses/passages
    const quoteRegex = /(?:&lt;|<)q(?:\s+[^>]*)?(?:&gt;|>)([\s\S]*?)(?:&lt;|<)\/q\s*(?:&gt;|>)/gi;
    t = t.replace(quoteRegex, (match, inner) => {
      return `<span class="commentary-quote">${inner.trim()}</span>`;
    });

    // 3. Convert newlines to <br> and restore any escaped <br> tags
    t = t.replace(/\n/g, '<br>');
    t = t.replace(/&lt;br\s*\/?&gt;/gi, '<br>');

    t = t.replace(/[ \t]+$/gmu, '');
    t = t.replace(/ {2,}/g, ' ');

    return UI.addSoftHyphens(t.trim());
  },

  /**
   * Format Anvaya (prose word order) text cleanly with standard Devanagari spacing and soft hyphens.
   * Pure prose order without any pratīka highlighting.
   */
  formatAnvayaHTML(text) {
    if (!text) return '';
    // 1. Format clean Devanagari spacing (standard spaces, never Sharada separator)
    let t = UI.formatDevanagari(text, false);

    // 2. Escape HTML entities
    t = UI.escapeHTML(t);

    // 3. Strip any manual pratika or bold markup if present
    t = t.replace(/<\/?(?:pr|strong|b)(?:\s+[^>]*)?>/gi, '').replace(/\*\*/g, '');

    // 3.5 Support <q>...</q> quotation tags if present
    const quoteRegex = /(?:&lt;|<)q(?:\s+[^>]*)?(?:&gt;|>)([\s\S]*?)(?:&lt;|<)\/q\s*(?:&gt;|>)/gi;
    t = t.replace(quoteRegex, (match, inner) => {
      return `<span class="commentary-quote">${inner.trim()}</span>`;
    });

    // 4. Convert newlines to <br> and restore any escaped <br> tags
    t = t.replace(/\n/g, '<br>');
    t = t.replace(/&lt;br\s*\/?&gt;/gi, '<br>');

    t = t.replace(/[ \t]+$/gmu, '');
    t = t.replace(/ {2,}/g, ' ');

    // 5. Syllable-aware soft hyphenation for clean line breaks
    return UI.addSoftHyphens(t.trim());
  },

  /**
   * Copy text to clipboard with notification
   */
  copyToClipboard(text, message = "प्रतिलिपि कृता (Copied to clipboard!)") {
    const clean = (text || '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/?(?:pr|strong|b|q|span)(?:\s+[^>]*)?>/gi, '')
      .replace(/\*\*/g, '')
      .replace(/\u00AD/gu, '');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(clean).then(() => {
        UI.showToast(message);
      }).catch(() => {
        UI.fallbackCopy(clean, message);
      });
    } else {
      UI.fallbackCopy(clean, message);
    }
  },

  fallbackCopy(text, message) {
    const clean = (text || '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/?(?:pr|strong|b|q|span)(?:\s+[^>]*)?>/gi, '')
      .replace(/\*\*/g, '')
      .replace(/\u00AD/gu, '');
    const ta = document.createElement("textarea");
    ta.value = clean;
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
   * Render Minimal Text Header
   */
  renderTextMeta(text) {
    const author = text.author || '';
    const total = String(text.total_verses || 121).replace(/\d/g, d => '०१२३४५६७८९'[d]);
    return `
      <div class="text-meta-minimal">
        <h1 class="text-title-minimal sanskrit">${UI.escapeHTML(text.title)}</h1>
        <div class="text-meta-details sanskrit">
          <span>${UI.escapeHTML(author)}</span>
          <span class="meta-sep">•</span>
          <span>${total} श्लोकाः</span>
        </div>
      </div>
    `;
  },

  /**
   * Format a single line of Mūla Sloka for HTML presentation.
   * Renders pāda-ending marks (।, -, and ॥१॥, ॥२॥, etc.)
   * with a different color and twice as short (font-size: 0.5em) without altering spaces.
   */
  formatSlokaLineHTML(line) {
    if (!line) return '';

    // Match trailing pāda punctuation: e.g. '॥१॥', '॥५६॥', '॥', '।', or '-' / '—' / '–'
    const endRegex = /((?:(?:॥|।।)[^॥।।\r\n]*?(?:॥|।।)|[।॥]|[-—–]))$/u;
    const endMatch = line.match(endRegex);

    let textBefore = line;
    let endPuncHTML = '';

    if (endMatch) {
      textBefore = line.substring(0, endMatch.index);
      const punc = endMatch[1];
      const isHyphen = /^[-—–]$/u.test(punc);
      const puncClass = isHyphen ? 'sloka-punc sloka-punc-hyphen' : 'sloka-punc';
      endPuncHTML = `<span class="${puncClass}">${UI.escapeHTML(punc)}</span>`;
    }

    // Mid-line single danda (if two padas are placed on a single line)
    const midDandaRegex = /([।])([ \t\r\f\v𑇈\u00A0]+|$)/gu;
    textBefore = textBefore.replace(midDandaRegex, '<span class="sloka-punc">$1</span>$2');

    // Escape HTML and add soft hyphens to text portions without breaking any span tags
    if (textBefore.includes('<span class="sloka-punc">')) {
      const parts = textBefore.split(/(<span class="sloka-punc">.*?<\/span>)/gu);
      textBefore = parts.map(part => {
        if (part.startsWith('<span class="sloka-punc">')) return part;
        return UI.addSoftHyphens(UI.escapeHTML(part));
      }).join('');
    } else {
      textBefore = UI.addSoftHyphens(UI.escapeHTML(textBefore));
    }

    return textBefore + endPuncHTML;
  },

  /**
   * Render Main Sloka Display Card (with optional Avataraṇikā)
   */
  renderSlokaCard(verse, isBookmarked, useSharada = false, isCommentaryCollapsed = false, isVishayarthaCollapsed = true) {
    // Mūla Shloka necessarily uses the separator ALWAYS
    const slokaFormatted = UI.formatDevanagari(verse.sloka, true);
    const lines = slokaFormatted.split('\n');
    const avataranikaFormatted = verse.avataranika ? UI.formatCommentaryHTML(verse.avataranika, useSharada, verse) : '';
    const vishayarthaFormatted = verse.vishayartha_sangraha ? UI.formatCommentaryHTML(verse.vishayartha_sangraha, useSharada, verse) : '';

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
          <div class="vishayartha-wrap ${isVishayarthaCollapsed ? 'collapsed' : ''}" data-section="vishayartha">
            <div class="vishayartha-header" onclick="UI.toggleCard(this)" title="विषयार्थसंग्रहः विस्तारयतु / सङ्कोचयतु">
              <div class="vishayartha-header-left">
                <span class="vishayartha-tag sanskrit">विषयार्थसंग्रहः</span>
              </div>
              <span class="card-toggle-icon">▼</span>
            </div>
            <div class="vishayartha-text sanskrit">${vishayarthaFormatted}</div>
          </div>
        ` : ''}

        ${avataranikaFormatted ? `
          <div class="avataranika-wrap ${isCommentaryCollapsed ? 'collapsed' : ''}" data-section="vivriti">
            <div class="avataranika-header" onclick="UI.toggleCard(this)" title="विस्तारयतु / सङ्कोचयतु">
              <div class="avataranika-header-left">
                <span class="avataranika-tag sanskrit">अवतरणिका</span>
              </div>
              <span class="card-toggle-icon">▼</span>
            </div>
            <div class="avataranika-text sanskrit">${avataranikaFormatted}</div>
          </div>
        ` : ''}

        <div class="sloka-text-box">
          ${lines.map(l => `<div class="sloka-line sanskrit">${UI.formatSlokaLineHTML(l)}</div>`).join('')}
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
            <span class="card-title anvaya-title sanskrit">🧭 अन्वयः</span>
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
            ${UI.formatCommentaryHTML(verse.anvaya, false, verse)}
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
            <span class="card-title vivriti-title sanskrit">📜 विवृत्तिः</span>
            <span class="card-badge">श्रीक्षेमराजकृता</span>
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
            <p class="vivriti-para sanskrit">${UI.formatCommentaryHTML(p, useSharada, verse)}</p>
          `).join('')}
        </div>
      </section>
    `;
  },

  /**
   * Toggle Card Accordion (Synchronizes Avataraṇikā and Vivṛti commentary cards)
   */
  toggleCard(headerEl) {
    const card = headerEl.closest('.detail-card, .avataranika-wrap, .vishayartha-wrap');
    if (!card) return;

    const sectionName = card.dataset.section || (card.classList.contains('avataranika-wrap') ? 'vivriti' : null) || (card.classList.contains('vishayartha-wrap') ? 'vishayartha' : null);

    if (sectionName === 'vivriti' || sectionName === 'avataranika') {
      // Synchronize both Vivriti and Avataranika together
      const vivritiCard = document.querySelector('.vivriti-card');
      const avataranikaCard = document.querySelector('.avataranika-wrap');

      // Invert current state based on clicked card
      const isCurrentlyCollapsed = card.classList.contains('collapsed');
      const shouldCollapse = !isCurrentlyCollapsed;

      if (vivritiCard) {
        vivritiCard.classList.toggle('collapsed', shouldCollapse);
      }
      if (avataranikaCard) {
        avataranikaCard.classList.toggle('collapsed', shouldCollapse);
      }

      if (window.appState) {
        window.appState.collapsedSections['vivriti'] = shouldCollapse;
        window.appState.collapsedSections['avataranika'] = shouldCollapse;
        window.appState.savePreferences();
      }
      return;
    }

    // Default for other cards (e.g. anvaya)
    card.classList.toggle('collapsed');
    if (window.appState && sectionName) {
      window.appState.collapsedSections[sectionName] = card.classList.contains('collapsed');
      window.appState.savePreferences();
    }
  }
};

window.UI = UI;
