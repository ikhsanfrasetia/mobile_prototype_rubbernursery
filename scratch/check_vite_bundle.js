// scratch/check_vite_bundle.js
async function testFetch() {
  try {
    const res = await fetch('http://localhost:3000/js/modules/process-mapping/process-mapping-data.js');
    const text = await res.text();
    console.log('Fetch status:', res.status);
    console.log('Includes applyTrueGapResolutionPlan:', text.includes('applyTrueGapResolutionPlan'));
    console.log('Includes export function applyTrueGapResolutionPlan:', text.includes('export function applyTrueGapResolutionPlan'));
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}
testFetch();
