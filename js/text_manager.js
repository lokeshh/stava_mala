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

  setText(textId) {
    if (this.loadedTexts[textId]) {
      this.currentTextId = textId;
      this.currentText = this.loadedTexts[textId];
      return true;
    }
    console.warn(`Text "${textId}" not yet loaded in window.TRIKA_TEXTS`);
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

    const q = query.trim().toLowerCase();
    return text.verses.filter(v => {
      // Check verse order or tag
      if (String(v.order) === q || v.number.includes(q) || (v.tag && v.tag.includes(q))) {
        return true;
      }
      // Check sloka text
      if (v.sloka && v.sloka.toLowerCase().includes(q)) return true;
      // Check avataranika
      if (v.avataranika && v.avataranika.toLowerCase().includes(q)) return true;
      // Check anvaya
      if (v.anvaya && v.anvaya.toLowerCase().includes(q)) return true;
      // Check vivriti commentary
      if (v.vivriti && v.vivriti.toLowerCase().includes(q)) return true;
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
