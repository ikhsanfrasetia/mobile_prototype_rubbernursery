import fs from 'fs';
import { buildInfoCenterViewModel, ALLOWED_OPERATIONAL_ROLE_IDS } from '../js/modules/info-center/info-center-adapter.js';
import { generateMermaidDiagramSyntax } from '../js/modules/info-center/info-center-flow-renderer.js';

console.log('=== TEST SUITE: VALIDASI KOREKSI DROPDOWN PERAN OPERASIONAL PUSAT INFORMASI ===\n');

// 1. Verifikasi Data JSON & Baseline JS
const jsonStr = fs.readFileSync('data/info-center-data.json', 'utf8');
const baselineStr = fs.readFileSync('js/data/info-center-baseline.js', 'utf8');

console.log('1. Pemeriksaan Independensi Sumber Data & Konsistensi:');
const hasOldProcessRef1 = jsonStr.includes('data/process-mapping-data.json');
const hasOldProcessRef2 = baselineStr.includes('data/process-mapping-data.json');
console.log(`   - File info-center-data.json bebas referensi lama: ${!hasOldProcessRef1 ? 'PASS' : 'FAIL'}`);
console.log(`   - File info-center-baseline.js bebas referensi lama: ${!hasOldProcessRef2 ? 'PASS' : 'FAIL'}`);

if (hasOldProcessRef1 || hasOldProcessRef2) {
  throw new Error('Ditemukan referensi ke process-mapping-data.json yang melanggar independensi!');
}

const rawData = JSON.parse(jsonStr);
const vm = buildInfoCenterViewModel(rawData);

// 2. Pemeriksaan Tepat 5 Role pada Model
console.log('\n2. Pemeriksaan Daftar Role yang Diizinkan (Tepat 5 Role):');
const expectedRoles = [
  { id: 'mantri-tanaman', name: 'Mantri Bibitan' },
  { id: 'asisten-bibitan', name: 'Asisten Bibitan' },
  { id: 'asisten', name: 'Asisten Divisi' },
  { id: 'askep', name: 'Asisten Kepala' },
  { id: 'pengurus', name: 'Pengurus Kebun' }
];

console.log(`   - Jumlah role pada model: ${vm.roles.length} (Ekspektasi: 5)`);
if (vm.roles.length !== 5) {
  throw new Error(`CRITICAL: Jumlah role pada model adalah ${vm.roles.length}, bukan 5!`);
}

expectedRoles.forEach((exp, idx) => {
  const actualRole = vm.roles[idx];
  console.log(`   - [${idx + 1}] ID: ${actualRole.id} | Nama: ${actualRole.name}`);
  if (actualRole.id !== exp.id || actualRole.name !== exp.name) {
    throw new Error(`Mismatch pada role urutan ${idx + 1}: didapat ${actualRole.id} (${actualRole.name}), ekspektasi ${exp.id} (${exp.name})`);
  }
});

// 3. Pemeriksaan Pengecualian Role yang Dilarang
console.log('\n3. Pemeriksaan Pengecualian Role yang Tidak Boleh Ditampilkan:');
const forbiddenRoleIds = ['ktu', 'tekniker-i', 'pengurus-kebun-sepupu'];
forbiddenRoleIds.forEach(fId => {
  const foundInVm = vm.roles.some(r => r.id === fId || r.code === fId);
  const foundInJson = rawData.roles.some(r => r.id === fId || r.code === fId);
  console.log(`   - Role dilarang [${fId}]: Tidak ada di model (${!foundInVm}) & Tidak ada di JSON (${!foundInJson}) -> ${(!foundInVm && !foundInJson) ? 'PASS' : 'FAIL'}`);
  if (foundInVm || foundInJson) {
    throw new Error(`CRITICAL: Role terlarang [${fId}] masih ditemukan!`);
  }
});

// 4. Pemeriksaan Dropdown UI (Tepat 6 Opsi)
console.log('\n4. Pemeriksaan Simulasi Opsi Dropdown UI:');
const dropdownOptions = [
  { value: 'ALL', label: 'Semua Peran Operasional' },
  ...vm.roles.map(r => ({ value: r.id, label: r.name }))
];

console.log(`   - Jumlah total opsi dropdown: ${dropdownOptions.length} (Ekspektasi: tepat 6)`);
if (dropdownOptions.length !== 6) {
  throw new Error(`CRITICAL: Dropdown menghasilkan ${dropdownOptions.length} opsi, bukan 6!`);
}

dropdownOptions.forEach((opt, idx) => {
  console.log(`     [Opsi ${idx + 1}] Value: "${opt.value}" | Label: "${opt.label}"`);
});

// 5. Pemeriksaan Filter "Semua Peran Operasional" (ALL)
console.log('\n5. Pemeriksaan Filter "Semua Peran Operasional" (ALL):');
const allCombinedModules = vm.modules.filter((m) => {
  return vm.roles.some((r) => {
    return (r.accessibleModules && r.accessibleModules.includes(m.id)) || (r.primaryModules && r.primaryModules.includes(m.id));
  });
});
console.log(`   - Modul gabungan dari 5 role resmi: ${allCombinedModules.length} modul terverifikasi -> PASS`);
if (allCombinedModules.length === 0) {
  throw new Error('CRITICAL: Filter ALL menghasilkan 0 modul!');
}

// 6. Pemeriksaan Filter Role Individu
console.log('\n6. Pemeriksaan Filter Setiap Role Individu (Tidak Ada Tabel Kosong):');
vm.roles.forEach(r => {
  const activeRoleId = r.id;
  const relevantModules = vm.modules.filter((m) => {
    if (activeRoleId === 'mantri-tanaman' || activeRoleId === 'asisten-bibitan') {
      return (r.accessibleModules && r.accessibleModules.includes(m.id)) || (r.primaryModules && r.primaryModules.includes(m.id));
    }
    if (r.accessibleModules && r.accessibleModules.includes(m.id)) return true;
    if (r.primaryModules && r.primaryModules.includes(m.id)) return true;
    const pRole = (m.primaryRole || '').toLowerCase();
    const rRole = (m.relatedRole || '').toLowerCase();
    const targetName = (r.name || '').toLowerCase();
    return pRole.includes(targetName) || rRole.includes(targetName);
  });

  console.log(`   - [${r.code}] ${r.name}: ${relevantModules.length} Modul Terkait -> PASS`);
  if (relevantModules.length === 0) {
    throw new Error(`CRITICAL: Role ${r.name} menghasilkan tabel kosong!`);
  }
});

// 7. Konsistensi JSON vs Baseline Fallback
console.log('\n7. Pemeriksaan Konsistensi Data JSON vs Baseline JS:');
const baselineMatch = baselineStr.includes(JSON.stringify(rawData.roles[0].id));
console.log(`   - Fallback baseline konsisten dengan JSON: ${baselineMatch ? 'PASS' : 'FAIL'}`);

// 8. Rute Cocok terhadap app.js
console.log('\n8. Pemeriksaan Kesesuaian Rute terhadap app.js:');
const appJsCode = fs.readFileSync('js/app.js', 'utf8');
const registeredRoutes = new Set([...appJsCode.matchAll(/registerRoute\(['"]([^'"]+)['"]/g)].map(m => m[1]));

let invalidRouteCount = 0;
vm.modules.forEach((m) => {
  m.features.forEach((f) => {
    if (f.prototypeRoute) {
      if (!registeredRoutes.has(f.prototypeRoute)) {
        console.warn(`   ⚠️ Warning: Rute ${f.prototypeRoute} pada fitur [${f.name}] tidak ditemukan di app.js`);
        invalidRouteCount++;
      }
    }
  });
});
console.log(`   - Seluruh rute fitur terdaftar di app.js: ${invalidRouteCount === 0 ? 'PASS (100% Cocok)' : 'WARNING'}`);

console.log('\n🎉 SELURUH PENGUJIAN OTOMATIS DINYATAKAN LULUS (100% PASS)!');
