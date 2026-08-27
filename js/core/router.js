/**
 * core/router.js — client-side router sederhana (hash-based).
 * Route divalidasi melalui permission layer.
 */

import { session } from './session.js';
import { permissions } from './permissions.js';

const routes = new Map();
let notFoundHandler = null;
let guard = null;
let currentRoute = null;
let currentParams = null;

function parseHash() {
  const raw = location.hash || '#/login';
  const clean = raw.replace(/^#/, '');
  const [pathPart, queryPart] = clean.split('?');
  const path = pathPart || '/login';
  const query = new URLSearchParams(queryPart || '');
  return { path, query };
}

function matchPath(pattern, path) {
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = path.split('/').filter(Boolean);

  if (patternParts.length !== pathParts.length) return null;

  const params = {};
  for (let i = 0; i < patternParts.length; i++) {
    const pp = patternParts[i];
    const pt = pathParts[i];
    if (pp.startsWith(':')) {
      params[pp.slice(1)] = decodeURIComponent(pt);
    } else if (pp !== pt) {
      return null;
    }
  }
  return params;
}

export function registerRoute(pattern, handler) {
  routes.set(pattern, handler);
}

export function setNotFound(handler) {
  notFoundHandler = handler;
}

/** Guard dipanggil sebelum render; return true untuk izinkan, false untuk blokir. */
export function setGuard(fn) {
  guard = fn;
}

export function navigate(path, options = {}) {
  const target = path.startsWith('#') ? path : `#${path}`;
  if (options.replace) {
    if (location.hash === target) {
      handleRouteChange();
    } else {
      location.replace(target);
      // location.replace() tidak selalu memicu event hashchange, panggil handler secara eksplisit
      handleRouteChange();
    }
    return;
  }
  if (location.hash === target) {
    // paksa render ulang bila sama
    handleRouteChange();
  } else {
    location.hash = target;
  }
}

export function getCurrent() {
  return { route: currentRoute, params: currentParams };
}

export function getParams() {
  return currentParams || {};
}

function findRoute(path) {
  for (const [pattern, handler] of routes.entries()) {
    const params = matchPath(pattern, path);
    if (params !== null) {
      return { handler, params };
    }
  }
  return null;
}

function defaultGuard(path) {
  const PUBLIC = ['/login'];
  if (PUBLIC.some((p) => path.startsWith(p))) return true;
  if (!session.isAuthenticated()) return { redirect: '/login' };
  return true;
}

async function handleRouteChange() {
  const { path, query } = parseHash();
  const result = findRoute(path);

  if (!result) {
    if (notFoundHandler) {
      await notFoundHandler(path);
    } else {
      document.getElementById('app').innerHTML =
        '<div class="page"><h1>404</h1><p>Halaman tidak ditemukan.</p></div>';
    }
    return;
  }

  // Permission guard
  const g = guard || defaultGuard;
  const decision = g(path);
  if (decision === false) {
    navigate('/login');
    return;
  }
  if (decision && decision.redirect) {
    navigate(decision.redirect);
    return;
  }

  // validasi akses via permission layer untuk route terproteksi
  if (!['/login'].some((p) => path.startsWith(p))) {
    if (!permissions.canAccessRoute(path)) {
      navigate('/login');
      return;
    }
  }

  currentRoute = path;
  currentParams = { ...result.params, ...Object.fromEntries(query.entries()) };

  // Reset state UI tiap render
  const modalRoot = document.getElementById('modal-root');
  const toastRoot = document.getElementById('toast-root');
  if (modalRoot) modalRoot.innerHTML = '';
  if (toastRoot) toastRoot.innerHTML = '';

  await result.handler({ params: currentParams, query });
}

export function initRouter() {
  window.addEventListener('hashchange', handleRouteChange);
  // render awal
  if (!location.hash) {
    location.replace('#/login');
  } else {
    handleRouteChange();
  }
}
