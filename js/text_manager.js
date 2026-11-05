/**
 * Text Manager for Trika Stava SPA
 * Handles loading, querying, and switching between multiple Trika Stotra texts.
 */

class TextManager {
  constructor() {
    this.registry = window.TRIKA_REGISTRY || { texts: [] };
    this.loadedTexts = window.TRIKA_TEXTS || {};
    this.currentTextId = 'stava_cintamani';
    this.currentText = this.loadedTexts[this.currentTextId] || null;
    this.corsError = false;
  }

  getTextList() {
    return this.registry.texts || [];
  }

  getCurrentText() {
    if (!this.currentText && this.loadedTexts[this.currentTextId]) {
      this.currentText = this.loadedTexts[this.currentTextId];
    }
    return this.currentText;
  }

  async loadText(textId) {
    if (this.loadedTexts[textId]) {
      this.currentTextId = textId;
      this.currentText = this.loadedTexts[textId];
      return this.currentText;
    }

    const entry = this.registry.texts.find(t => t.id === textId);
    const dataFile = entry ? (entry.dataFile || `data/texts/${textId}.json`) : `data/texts/${textId}.json`;

    try {
      const resp = await fetch(dataFile + '?t=' + Date.now());
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      this.loadedTexts[textId] = data;
      this.currentTextId = textId;
      this.currentText = data;
      return data;
    } catch (err) {
      console.warn(`Could not load ${dataFile}:`, err.message);
      if (typeof window !== 'undefined' && window.location && window.location.protocol === 'file:') {
        this.corsError = true;
      }
      return null;
    }
  }

  setText(textId) {
    if (this.loadedTexts[textId]) {
      this.currentTextId = textId;
      this.currentText = this.loadedTexts[textId];
      return true;
    }
    return false;
  }

  getVerse(verseOrder) {
    const text = this.getCurrentText();
    if (!text || !text.verses) return null;
    return text.verses.find(v => v.order === verseOrder || v.id === verseOrder) || null;
  }

  getTotalVerses() {
    const text = this.getCurrentText();
    return text && text.verses ? text.verses.length : 0;
  }

  searchVerses(query) {
    const text = this.getCurrentText();
    if (!text || !text.verses) return [];
    if (!query || query.trim() === '') return text.verses;

    const norm = (s) => (s || '').replace(/<\/?(?:pr|strong|b|q|span)(?:\s+[^>]*)?>/gi, '').replace(/\u00AD/gu, '').replace(/,/gu, ' ').replace(/\s+/gu, ' ').toLowerCase();
    const q = norm(query.trim());

    return text.verses.filter(v => {
      // Check verse order or tag
      if (String(v.order) === q || v.number.includes(q) || (v.tag && v.tag.includes(q))) {
        return true;
      }
      // Check sloka text
      if (v.sloka && norm(v.sloka).includes(q)) return true;
      // Check avataranika
      if (v.avataranika && norm(v.avataranika).includes(q)) return true;
      // Check anvaya
      if (v.anvaya && norm(v.anvaya).includes(q)) return true;
      // Check vivriti commentary
      if (v.vivriti && norm(v.vivriti).includes(q)) return true;
      return false;
    });
  }

  updateVerse(verseId, updatedFields) {
    const text = this.getCurrentText();
    if (!text || !text.verses) return false;
    const vIndex = text.verses.findIndex(v => v.id === verseId);
    if (vIndex !== -1) {
      text.verses[vIndex] = { ...text.verses[vIndex], ...updatedFields };
      return true;
    }
    return false;
  }

  exportCurrentTextJSON() {
    const text = this.getCurrentText();
    return JSON.stringify(text, null, 2);
  }
}

window.textManager = new TextManager();
