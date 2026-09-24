/**
 * components/empty-state.js
 * Standard Reusable Empty State Card Component for SIGMA Rubber Nursery.
 * 
 * Standard Visual Rule:
 * 1. Document Icon (Feather/Lucide FileText SVG)
 * 2. Color: #000000 (Monochrome flat, no gradient, no shadow)
 * 3. No colored circular background or badge
 * 4. Centered alignment
 * 5. Order: Icon -> Title -> Description
 * 6. Accessibility: aria-hidden="true" on decorative icon
 */

export const STANDARD_DOCUMENT_ICON = `
  <div style="width: 44px; height: 44px; border-radius: 50%; background: #F1F5F9; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px auto; color: #64748B;">
    <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
      <polyline points="10 9 9 9 8 9"></polyline>
    </svg>
  </div>
`;

/**
 * Render standard empty state card HTML
 * @param {Object} options
 * @param {string} options.title - Header / Title of empty state
 * @param {string} options.description - Detailed explanation
 * @param {string} [options.customStyle] - Optional override style
 * @param {string} [options.actionHtml] - Optional action buttons (e.g. + Tambah)
 * @param {string} [options.id] - Optional DOM ID
 * @returns {string} HTML string
 */
export function renderEmptyStateCard({
  title = 'Belum Ada Data',
  description = '',
  customStyle = '',
  actionHtml = '',
  id = ''
} = {}) {
  const idAttr = id ? ` id="${id}"` : '';
  const defaultStyle = `background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 32px 20px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.02);`;
  const styleAttr = customStyle ? `${defaultStyle} ${customStyle}`.trim() : defaultStyle;

  return `
    <div${idAttr} style="${styleAttr}">
      ${STANDARD_DOCUMENT_ICON}
      <h3 style="font-size: 0.92rem; font-weight: 700; color: #0F172A; margin: 0 0 4px 0; line-height: 1.35; letter-spacing: -0.01em;">${title}</h3>
      ${description ? `<p style="font-size: 0.78rem; color: #64748B; margin: 0 auto; line-height: 1.5; max-width: 290px;">${description}</p>` : ''}
      ${actionHtml ? `<div style="margin-top: 16px;">${actionHtml}</div>` : ''}
    </div>
  `;
}
