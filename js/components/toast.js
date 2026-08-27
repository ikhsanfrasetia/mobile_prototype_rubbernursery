/**
 * components/toast.js — toast notification.
 */

export function toast(message, type = 'info', duration = 2600) {
  const root = document.getElementById('toast-root');
  if (!root) return;

  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
  el.innerHTML = `<span>${icon}</span><span></span>`;
  el.querySelector('span:last-child').textContent = message;
  root.appendChild(el);

  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.25s ease';
    setTimeout(() => el.remove(), 260);
  }, duration);
}
