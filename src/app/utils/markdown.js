import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Configure marked defaults for chat messages
marked.setOptions({
  gfm: true,
  breaks: true,
});

// Custom renderer to ensure secure external link rendering
const renderer = new marked.Renderer();
const originalLink = renderer.link.bind(renderer);
renderer.link = (href, title, text) => {
  const html = originalLink(href, title, text);
  return html.replace(
    /^<a /,
    '<a target="_blank" rel="noopener noreferrer" class="rquest-chat-link" '
  );
};

marked.use({ renderer });

/**
 * Format file size in bytes to human-readable string (e.g. 1.2 MB)
 * @param {number} bytes
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (!bytes || bytes <= 0 || isNaN(bytes)) return '';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Resolve local/relative or absolute file URL safely
 * @param {string} url
 * @param {string} apiBase
 * @returns {string}
 */
export function resolveFileUrl(url, apiBase = '') {
  if (!url) return '';
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('blob:') ||
    url.startsWith('data:')
  ) {
    return url;
  }
  const base = apiBase || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
}

/**
 * Render markdown string to sanitized HTML
 * @param {string} markdownText
 * @returns {string} Sanitized HTML
 */
export function renderMarkdown(markdownText) {
  if (!markdownText || typeof markdownText !== 'string') return '';
  try {
    const rawHtml = marked.parse(markdownText);
    const options = {
      ADD_ATTR: ['target', 'rel', 'class'],
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
        'code', 'pre', 'blockquote', 'ul', 'ol', 'li', 'h1', 'h2',
        'h3', 'h4', 'h5', 'h6', 'hr', 'a', 'span',
      ],
    };

    if (typeof window !== 'undefined') {
      const purifier =
        typeof DOMPurify.sanitize === 'function'
          ? DOMPurify
          : typeof DOMPurify === 'function'
          ? DOMPurify(window)
          : null;
      if (purifier && typeof purifier.sanitize === 'function') {
        return purifier.sanitize(rawHtml, options);
      }
    } else if (typeof DOMPurify.sanitize === 'function') {
      return DOMPurify.sanitize(rawHtml, options);
    }
    return rawHtml;
  } catch (err) {
    console.error('Markdown rendering error:', err);
    return String(markdownText);
  }
}

/**
 * Strip Markdown and HTML tags from message text, producing clean readable plain text
 * for clipboard copying without artifacts.
 * @param {string} md
 * @returns {string} Clean plain text
 */
export function stripMarkdownToPlainText(md) {
  if (!md) return '';
  let text = String(md);

  // Decode basic HTML entities
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // Remove code blocks markers, preserve code body
  text = text.replace(/```[a-z0-9_-]*\n([\s\S]*?)```/gi, '$1');
  // Inline code backticks
  text = text.replace(/`([^`]+)`/g, '$1');

  // Images: ![alt](url) -> alt (or empty)
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1');

  // Links: [text](url) -> text (url) if different, or just url if same
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, url) => {
    return label.trim() === url.trim() ? url : `${label} (${url})`;
  });

  // Headers: remove #, ##, etc.
  text = text.replace(/^#{1,6}\s+(.+)$/gm, '$1');

  // Bold & Italic: **text**, *text*, __text__, _text_
  text = text.replace(/(\*\*|__)(.*?)\1/g, '$2');
  text = text.replace(/(\*|_)(.*?)\1/g, '$2');
  text = text.replace(/~~(.*?)~~/g, '$1');

  // Blockquotes: remove leading >
  text = text.replace(/^\s*>\s*(.+)$/gm, '$1');

  // Bullet lists: normalize markdown bullets (*, -, +) to clean unicode bullets
  text = text.replace(/^\s*[-*+]\s+(.+)$/gm, '• $1');

  // Strip all HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // Normalize excessive blank lines to at most two
  text = text.replace(/\n{3,}/g, '\n\n').trim();

  return text;
}

/**
 * Copy text to clipboard with browser fallback
 * @param {string} text Raw text (or markdown)
 * @param {boolean} isMarkdown If true, strips markdown syntax before copying
 * @returns {Promise<boolean>}
 */
export async function copyToClipboard(text, isMarkdown = true) {
  const plainText = isMarkdown ? stripMarkdownToPlainText(text) : String(text || '');
  if (!plainText) return false;

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(plainText);
      return true;
    }
  } catch (err) {
    console.warn('navigator.clipboard failed, attempting fallback:', err);
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = plainText;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '0';
    textArea.style.opacity = '0';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Clipboard copy failed:', err);
    return false;
  }
}
