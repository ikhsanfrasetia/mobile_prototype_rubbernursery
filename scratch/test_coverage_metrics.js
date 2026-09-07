// scratch/test_coverage_metrics.js
import * as PMData from '../js/modules/process-mapping/process-mapping-data.js';

await PMData.initProjectDataStore();

const metrics = PMData.getCoverageMetrics();
console.log('Metrics from getCoverageMetrics():', JSON.stringify(metrics, null, 2));
