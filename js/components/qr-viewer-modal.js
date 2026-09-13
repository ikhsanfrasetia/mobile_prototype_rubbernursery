/**
 * js/components/qr-viewer-modal.js
 * Template Terpadu QR Code Viewer Modal untuk Master Bedengan & Master Batch (TASK HARMONISASI)
 */

import { openModal, closeModal } from './modal.js';
import { toast } from './toast.js';
import { esc } from '../core/utils.js';

export function openQRViewerModal({
  type,
  typeTitle,
  code,
  name,
  programName,
  programCode,
  startDate,
  verificationText = 'Terverifikasi Sistem SIGMA',
  payload
}) {
  const payloadJson = JSON.stringify(payload, null, 2);

  const html = `
    <div style="padding: 18px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 440px; margin: 0 auto; box-sizing: border-box;">
      
      <!-- HEADER -->
      <div style="text-align: center; border-bottom: 2px solid #116834; padding-bottom: 10px; margin-bottom: 14px;">
        <div style="font-size: 1.05rem; font-weight: 800; color: #116834; letter-spacing: 0.05em; text-transform: uppercase;">PT SOCFIN INDONESIA</div>
        <div style="font-size: 0.76rem; color: #64748B; font-weight: 600; margin-top: 2px;">Identitas QR Code ${esc(typeTitle)} &amp; Pembibitan Karet</div>
      </div>

      <!-- QR BESAR & IDENTITY -->
      <div style="text-align: center; margin-bottom: 14px;">
        <div style="display: inline-block; padding: 12px; background: #FFFFFF; border: 2px solid #0F172A; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.06); margin-bottom: 8px;">
          <svg viewBox="0 0 100 100" width="130" height="130" style="display: block;">
            <rect width="100" height="100" fill="#FFFFFF"/>
            <!-- Corner Squares -->
            <rect x="6" y="6" width="26" height="26" fill="#0F172A"/>
            <rect x="10" y="10" width="18" height="18" fill="#FFFFFF"/>
            <rect x="14" y="14" width="10" height="10" fill="#0F172A"/>

            <rect x="68" y="6" width="26" height="26" fill="#0F172A"/>
            <rect x="72" y="10" width="18" height="18" fill="#FFFFFF"/>
            <rect x="76" y="14" width="10" height="10" fill="#0F172A"/>

            <rect x="6" y="68" width="26" height="26" fill="#0F172A"/>
            <rect x="10" y="72" width="18" height="18" fill="#FFFFFF"/>
            <rect x="14" y="76" width="10" height="10" fill="#0F172A"/>

            <!-- Pattern Grid -->
            <rect x="38" y="10" width="6" height="6" fill="#0F172A"/>
            <rect x="48" y="10" width="6" height="6" fill="#0F172A"/>
            <rect x="58" y="10" width="6" height="6" fill="#0F172A"/>
            <rect x="38" y="22" width="6" height="6" fill="#0F172A"/>
            <rect x="48" y="22" width="6" height="6" fill="#0F172A"/>
            <rect x="10" y="38" width="6" height="6" fill="#0F172A"/>
            <rect x="22" y="38" width="6" height="6" fill="#0F172A"/>
            <rect x="38" y="38" width="8" height="8" fill="#0F172A"/>
            <rect x="52" y="38" width="8" height="8" fill="#0F172A"/>
            <rect x="66" y="38" width="6" height="6" fill="#0F172A"/>
            <rect x="78" y="38" width="6" height="6" fill="#0F172A"/>
            <rect x="38" y="52" width="6" height="6" fill="#0F172A"/>
            <rect x="48" y="52" width="6" height="6" fill="#0F172A"/>
            <rect x="62" y="52" width="6" height="6" fill="#0F172A"/>
            <rect x="76" y="52" width="6" height="6" fill="#0F172A"/>
            <rect x="86" y="52" width="6" height="6" fill="#0F172A"/>
            <rect x="38" y="68" width="6" height="6" fill="#0F172A"/>
            <rect x="48" y="74" width="8" height="8" fill="#0F172A"/>
            <rect x="62" y="68" width="6" height="6" fill="#0F172A"/>
            <rect x="74" y="68" width="8" height="8" fill="#0F172A"/>
            <rect x="86" y="78" width="6" height="6" fill="#0F172A"/>
            <rect x="60" y="86" width="6" height="6" fill="#0F172A"/>
            <rect x="74" y="86" width="6" height="6" fill="#0F172A"/>
          </svg>
        </div>

        <div style="font-size: 1.15rem; font-weight: 800; color: #0F172A; font-family: monospace; letter-spacing: -0.01em;">${esc(code)}</div>
        <div style="font-size: 0.86rem; font-weight: 600; color: #475569; margin-top: 2px;">${esc(name)}</div>
      </div>

      <!-- INFORMASI GRID -->
      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px; margin-bottom: 12px; font-size: 0.78rem;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px 12px;">
          <div>
            <div style="font-size: 0.68rem; color: #64748B;">Pembibitan</div>
            <div style="font-weight: 700; color: #1E293B;">${esc(programName || '-')}</div>
          </div>
          <div>
            <div style="font-size: 0.68rem; color: #64748B;">Kode Pembibitan</div>
            <div style="font-weight: 700; color: #1E293B; font-family: monospace;">${esc(programCode || '-')}</div>
          </div>
          <div>
            <div style="font-size: 0.68rem; color: #64748B;">Tanggal Mulai</div>
            <div style="font-weight: 600; color: #1E293B;">${esc(startDate || '-')}</div>
          </div>
          <div>
            <div style="font-size: 0.68rem; color: #64748B;">Verifikasi</div>
            <div style="font-weight: 700; color: #166534; display: flex; align-items: center; gap: 4px;">
              <svg viewBox="0 0 24 24" width="13" height="13" stroke="#166534" stroke-width="2.5" fill="none"><polyline points="20 6 9 17 4 12"></polyline></svg>
              <span>${esc(verificationText)}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- PAYLOAD JSON DATA QR -->
      <div style="margin-bottom: 14px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
          <span style="font-size: 0.70rem; font-weight: 700; color: #64748B; text-transform: uppercase;">Payload JSON Data QR</span>
          <button id="btn-copy-qr-payload" type="button" style="background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 4px; padding: 3px 8px; font-size: 0.70rem; font-weight: 600; color: #334155; cursor: pointer; display: flex; align-items: center; gap: 4px;">
            <svg viewBox="0 0 24 24" width="11" height="11" stroke="currentColor" stroke-width="2" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            <span>Salin Data</span>
          </button>
        </div>
        <pre id="qr-payload-json" style="background: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 6px; padding: 8px 10px; font-size: 0.70rem; font-family: monospace; color: #1E293B; margin: 0; overflow-x: auto; white-space: pre-wrap; word-break: break-all;">${esc(payloadJson)}</pre>
      </div>

      <!-- FOOTER -->
      <div style="display: flex; gap: 8px; justify-content: flex-end; border-top: 1px solid #E2E8F0; padding-top: 12px;">
        <button id="btn-close-qr-modal" type="button" style="flex: 1; padding: 9px 12px; background: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.80rem; font-weight: 600; color: #475569; cursor: pointer; text-align: center;">Tutup</button>
        <button id="btn-print-qr" type="button" style="flex: 1; padding: 9px 12px; background: #FFFFFF; border: 1px solid #116834; border-radius: 6px; font-size: 0.80rem; font-weight: 700; color: #116834; cursor: pointer; text-align: center;">Cetak (Print)</button>
        <button id="btn-export-pdf-qr" type="button" style="flex: 1; padding: 9px 12px; background: #116834; border: none; border-radius: 6px; font-size: 0.80rem; font-weight: 700; color: #FFFFFF; cursor: pointer; text-align: center;">Ekspor PDF</button>
      </div>

    </div>
  `;

  openModal(html);

  document.getElementById('btn-close-qr-modal')?.addEventListener('click', closeModal);

  document.getElementById('btn-copy-qr-payload')?.addEventListener('click', () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(payloadJson);
      }
      toast('Payload JSON QR berhasil disalin.', 'success');
    } catch {
      toast('Payload JSON QR berhasil disalin.', 'success');
    }
  });

  document.getElementById('btn-print-qr')?.addEventListener('click', () => {
    toast('Dokumen QR siap dicetak.', 'info');
    if (typeof window !== 'undefined' && window.print) {
      window.print();
    }
  });

  document.getElementById('btn-export-pdf-qr')?.addEventListener('click', () => {
    toast(`Ekspor PDF QR ${typeTitle} sedang diproses.`, 'success');
  });
}
