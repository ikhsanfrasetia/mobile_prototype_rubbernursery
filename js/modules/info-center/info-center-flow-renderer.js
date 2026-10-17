/**
 * js/modules/info-center/info-center-flow-renderer.js
 * 
 * Engine Perender Diagram Alur Proses — Pusat Informasi Aplikasi
 * 
 * JAMINAN KEAMANAN RENDERING:
 * 1. Sequential Rendering Queue: Mencegah tabrakan DOM scratchpad internal Mermaid.
 * 2. Text Sanitization: Mengamankan label, karakter tanda kutip, dan simbol khusus.
 * 3. Honest Empty State: Fitur tanpa flow TIDAK di-render sebagai diagram dummy atau alur fitur lain.
 * 4. Distinct Visual Styling: Membedakan alur terdefinisi penuh vs urutan sekuensial sementara.
 */

/**
 * Sanitasi string agar aman di dalam sintaks Mermaid flowchart
 * @param {string} str 
 * @returns {string}
 */
function sanitizeMermaidText(str) {
  if (!str) return '';
  return String(str)
    .replace(/"/g, "'")
    .replace(/[<>]/g, '')
    .replace(/[\r\n]+/g, ' ')
    .trim();
}

/**
 * Menghasilkan kode sintaks Mermaid TD dari node dan edge terverifikasi
 * @param {Object} featureObj 
 * @returns {string}
 */
export function generateMermaidDiagramSyntax(featureObj) {
  if (!featureObj || !Array.isArray(featureObj.nodes) || featureObj.nodes.length === 0) {
    return '';
  }

  const nodes = featureObj.nodes;
  const edges = Array.isArray(featureObj.edges) ? featureObj.edges : [];
  const nodeMap = new Map();
  nodes.forEach((n) => nodeMap.set(n.id, n));

  let str = 'graph TD\n';

  // Render Nodes
  nodes.forEach((node) => {
    const rawTitle = node.title || node.code || node.id;
    const safeTitle = sanitizeMermaidText(rawTitle);
    const codeTag = node.code ? `<div style='font-size:11px;font-weight:700;color:#1e3a8a;'>${sanitizeMermaidText(node.code)}</div>` : '';
    const labelHtml = `<div style='padding:4px;text-align:center;'>${codeTag}<div style='font-size:12px;color:#0f172a;'>${safeTitle}</div></div>`;

    let shapeOpen = '["';
    let shapeClose = '"]';
    if (node.type === 'decision') {
      shapeOpen = '{"';
      shapeClose = '"}';
    } else if (node.type === 'start' || node.type === 'end') {
      shapeOpen = '(["';
      shapeClose = '"])';
    }

    str += `  N_${node.id}${shapeOpen}\`${labelHtml}\`${shapeClose}\n`;

    // Styling Node Berdasarkan Tipe
    if (node.type === 'start' || node.type === 'end') {
      str += `  style N_${node.id} fill:#ecfdf5,stroke:#059669,stroke-width:2px,color:#065f46\n`;
    } else if (node.type === 'decision') {
      str += `  style N_${node.id} fill:#fefce8,stroke:#ca8a04,stroke-width:1.5px,color:#854d0e\n`;
    } else {
      str += `  style N_${node.id} fill:#ffffff,stroke:#cbd5e1,stroke-width:1.5px,color:#1e293b\n`;
    }
  });

  // Render Edges
  if (featureObj.flowStatus === 'EXPLICIT_FLOW' && edges.length > 0) {
    // 1. Relasi Eksplisit Terdefinisi Penuh
    edges.forEach((edge) => {
      if (nodeMap.has(edge.from) && nodeMap.has(edge.to)) {
        const safeLabel = sanitizeMermaidText(edge.label);
        if (safeLabel) {
          str += `  N_${edge.from} -- "${safeLabel}" --> N_${edge.to}\n`;
        } else {
          str += `  N_${edge.from} --> N_${edge.to}\n`;
        }
      }
    });
  } else if (featureObj.flowStatus === 'SEQUENTIAL_BASELINE') {
    // 2. Fallback Sekuensial Sementara (Hubungan langkah demi langkah)
    for (let i = 0; i < nodes.length - 1; i++) {
      const fromNode = nodes[i];
      const toNode = nodes[i + 1];
      if (fromNode.type === 'end') continue;
      str += `  N_${fromNode.id} --> N_${toNode.id}\n`;
    }
  }

  return str;
}

/**
 * Antrean eksekusi sekuensial (Sequential Rendering Queue)
 * Mencegah pemanggilan mermaid.render bersamaan pada DOM scratchpad
 */
let isRenderingQueueActive = false;
const renderQueue = [];

function processNextInQueue() {
  if (renderQueue.length === 0) {
    isRenderingQueueActive = false;
    return;
  }
  isRenderingQueueActive = true;
  const item = renderQueue.shift();
  item.execute().finally(() => {
    setTimeout(processNextInQueue, 20); // Delay kecil untuk pembersihan DOM scratchpad
  });
}

function queueMermaidRender(renderFn) {
  return new Promise((resolve, reject) => {
    renderQueue.push({
      execute: async () => {
        try {
          const res = await renderFn();
          resolve(res);
        } catch (err) {
          reject(err);
        }
      }
    });
    if (!isRenderingQueueActive) {
      processNextInQueue();
    }
  });
}

/**
 * Merender satu elemen kontainer diagram Mermaid secara aman
 * @param {HTMLElement} containerEl 
 * @param {string} mermaidSyntax 
 * @returns {Promise<void>}
 */
export async function renderMermaidDiagramSafely(containerEl, mermaidSyntax) {
  if (!containerEl) return;

  if (!mermaidSyntax || mermaidSyntax.trim() === '') {
    containerEl.innerHTML = '';
    return;
  }

  if (typeof window === 'undefined' || !window.mermaid) {
    containerEl.innerHTML = `
      <div class="ic-alert-box ic-alert-warning">
        Perpustakaan visualisasi Mermaid belum siap dimuat.
      </div>
    `;
    return;
  }

  // Masukkan ke antrean sekuensial
  return queueMermaidRender(async () => {
    try {
      window.mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'loose',
        theme: 'neutral',
        flowchart: {
          curve: 'basis',
          padding: 16,
          useMaxWidth: true
        }
      });

      const uniqueId = 'ic-mermaid-' + Math.random().toString(36).substring(2, 10);
      const { svg } = await window.mermaid.render(uniqueId, mermaidSyntax);
      containerEl.innerHTML = svg;

      // Make SVG responsive
      const svgEl = containerEl.querySelector('svg');
      if (svgEl) {
        svgEl.style.maxWidth = '100%';
        svgEl.style.height = 'auto';
        svgEl.style.display = 'block';
        svgEl.style.margin = '0 auto';
      }
    } catch (renderError) {
      console.warn('⚠️ [InfoCenterFlowRenderer] Kegagalan render Mermaid:', renderError);
      containerEl.innerHTML = `
        <div class="ic-alert-box ic-alert-danger">
          <strong>Gagal menampilkan diagram alur secara visual.</strong><br>
          <small>Sintaks diagram tidak dapat diproses: ${sanitizeMermaidText(renderError.message || '')}</small>
        </div>
      `;
    }
  });
}
