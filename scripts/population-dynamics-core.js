// SPDX-License-Identifier: MIT
/* Continuous neural-time population analysis. No event-mean concatenation.
 * Plain-browser/Node implementation; the factory has no external dependencies.
 * Synthetic tests are QA, not scientific validation or biological evidence. */
(function (root, factory) {
    'use strict';
    const api = factory();
    api.workerSource = function () {
        return '"use strict";const PopulationDynamics=(' + factory.toString() + ')();self.onmessage=function(event){' +
            'const m=event.data;try{const result=PopulationDynamics.run(m.trains,m.options,function(progress){' +
            'self.postMessage({id:m.id,type:"progress",progress});});' +
            'self.postMessage({id:m.id,type:"result",result});}catch(e){' +
            'self.postMessage({id:m.id,type:"error",error:e.message});}};';
    };
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.NeuropixelsPopulationDynamics = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function populationDynamicsFactory() {
    'use strict';
    const SCHEMA = 'neuropixels-population-dynamics/1';
    const LIMITS = Object.freeze({ maxUnits: 512, maxBins: 10000, maxCountCells: 2000000,
        maxCovarianceOps: 250000000, maxPcaOps: 250000000, maxPcaIterations: 5000, maxSpikes: 20000000 });
    const RIDGES = [1e-8, 1e-6, 1e-4, 1e-3, 1e-2];
    const finite = Number.isFinite;
    function check(ok, message) { if (!ok) throw new Error(message); }
    function validId(id) { return (typeof id === 'string' && id.length > 0 && id.length <= 200) || Number.isSafeInteger(id); }
    function lowerBound(a, x) { let l = 0, r = a.length; while (l < r) { const m = (l + r) >>> 1; if (a[m] < x) l = m + 1; else r = m; } return l; }
    function dot(a, b) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; }
    function progressCall(callback, stage, fraction) { if (typeof callback === 'function') callback({ stage, fraction }); }
    function coverageIntervals(coverage) {
        if (coverage == null) return null;
        check(Array.isArray(coverage) && coverage.length <= LIMITS.maxBins, 'Coverage must be an ordered array of [start,end] neural-second intervals (or null when unknown).');
        const out = [];
        for (const interval of coverage) {
            check(Array.isArray(interval) && interval.length === 2 && interval.every(finite) && interval[1] > interval[0], 'Each coverage interval must have finite start < end.');
            const prev = out[out.length - 1];
            check(!prev || interval[0] >= prev[1], 'Coverage intervals must be ordered and non-overlapping.');
            if (prev && interval[0] === prev[1]) prev[1] = interval[1];
            else out.push(interval.slice());
        }
        return out;
    }
    function makeBins(options) {
        check(options && finite(options.start) && finite(options.end) && options.end > options.start && finite(options.binWidth) && options.binWidth > 0,
            'Choose finite neural-time start < end and a positive bin width in seconds.');
        const { start, end, binWidth } = options;
        const ratio = (end - start) / binWidth;
        check(finite(ratio) && ratio <= LIMITS.maxBins, 'Too many bins: select a shorter range or increase bin width (limit 10000).');
        // Round only the number of near-integral bins, never spike timestamps.
        const rounded = Math.round(ratio), integral = Math.abs(ratio - rounded) <= 1e-10 * Math.max(1, ratio);
        const n = integral ? rounded : Math.ceil(ratio);
        check(n > 0 && start + binWidth > start, 'Bin width is below neural-time floating-point resolution.');
        const edges = Array.from({ length: n + 1 }, (_, i) => i === n ? end : start + i * binWidth);
        check(edges.every((x, i) => finite(x) && (!i || x > edges[i - 1])), 'Bin edges cannot be resolved at this time scale.');
        const coverage = coverageIntervals(options.coverage);
        const indices = [], times = [], excluded = [];
        let c = 0;
        for (let i = 0; i < n; i++) {
            let reason = null;
            if (i === n - 1 && !integral) reason = 'partial_final_bin';
            if (coverage) {
                while (c < coverage.length && coverage[c][1] <= edges[i]) c++;
                if (!coverage[c] || coverage[c][0] > edges[i] || coverage[c][1] < edges[i + 1]) reason = reason || 'not_fully_covered';
            }
            if (reason) excluded.push({ binIndex: i, reason });
            else { indices.push(i); times.push([edges[i], edges[i + 1]]); }
        }
        check(indices.length >= 20, 'Need at least 20 fully retained bins; extend the time range or reduce bin width.');
        return { edges, indices, times, excluded, coverage };
    }
    function makeSplits(binIndices) {
        const n = binIndices.length, t = Math.floor(n * 0.7), v = t + Math.floor(n * 0.15);
        const result = {};
        for (const [name, start, end] of [['train', 0, t], ['validation', t, v], ['test', v, n]]) {
            const indices = Array.from({ length: end - start }, (_, k) => start + k);
            const pairs = [];
            for (let i = start; i < end - 1; i++) if (binIndices[i + 1] === binIndices[i] + 1) pairs.push([i, i + 1]);
            check(pairs.length >= 2, 'The ' + name + ' split needs at least two adjacent transition pairs. Extend the range; gaps and split boundaries are not bridged.');
            result[name] = { indices, binIndices: indices.map(i => binIndices[i]), pairs };
        }
        return result;
    }
    function pca2(counts, trainRows, originalIds, report) {
        const n = trainRows.length, all = originalIds.length, mean = [], scale = [], kept = [], excludedUnits = [];
        for (let j = 0; j < all; j++) {
            let m = 0, ss = 0, k = 0;
            for (const i of trainRows) { k++; const d = counts[i][j] - m; m += d / k; ss += d * (counts[i][j] - m); }
            if (!(ss > 0)) excludedUnits.push({ unitId: originalIds[j], reason: 'constant_in_training' });
            else { kept.push(j); mean.push(m); scale.push(Math.sqrt(ss / (n - 1))); }
        }
        const p = kept.length;
        check(p >= 2, 'PCA needs at least two Units with nonconstant training activity. Change the range or Unit selection.');
        check(n * p * p <= LIMITS.maxCovarianceOps, 'Covariance work exceeds 250 million operations. Select fewer Units or fewer bins.');
        const x = counts.map(row => Float64Array.from(kept, (j, k) => (row[j] - mean[k]) / scale[k]));
        const covariance = Array.from({ length: p }, () => new Float64Array(p));
        for (const row of trainRows) for (let j = 0; j < p; j++) for (let k = 0; k <= j; k++) covariance[j][k] += x[row][j] * x[row][k] / (n - 1);
        for (let j = 0; j < p; j++) for (let k = 0; k < j; k++) covariance[k][j] = covariance[j][k];
        const loadings = [], eigenvalues = [], iterations = [];
        let state = 0x13579bdf, ops = 0;
        function random() { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) / 4294967296 - 0.5; }
        function multiply(vector) { ops += p * p; check(ops <= LIMITS.maxPcaOps, 'PCA iteration work exceeds 250 million operations. Select fewer Units or a different range.'); return Float64Array.from(covariance, row => dot(row, vector)); }
        function orthogonalize(vector) { for (const axis of loadings) { const d = dot(vector, axis); for (let j = 0; j < p; j++) vector[j] -= d * axis[j]; } return vector; }
        for (let pc = 0; pc < 2; pc++) {
            let vector = orthogonalize(Float64Array.from({ length: p }, random)), norm = Math.sqrt(dot(vector, vector));
            for (let j = 0; j < p; j++) vector[j] /= norm;
            let eigenvalue = 0, converged = false, iteration = 0;
            for (; iteration < LIMITS.maxPcaIterations; iteration++) {
                const product = orthogonalize(multiply(vector));
                norm = Math.sqrt(dot(product, product));
                check(norm > 1e-12, 'Population training activity has fewer than two resolved principal components.');
                for (let j = 0; j < p; j++) vector[j] = product[j] / norm;
                const av = multiply(vector); eigenvalue = dot(vector, av);
                let residual = 0; for (let j = 0; j < p; j++) residual += Math.pow(av[j] - eigenvalue * vector[j], 2);
                if (Math.sqrt(residual) <= (pc ? 1e-13 : 1e-14) * eigenvalue) { converged = true; break; }
                if (iteration % 100 === 0) progressCall(report, 'pca_' + (pc + 1), Math.min(0.65, 0.25 + pc * 0.15 + iteration / 50000));
            }
            check(converged, 'PCA did not converge within the bounded iteration budget. Try fewer Units or a different time range.');
            check(eigenvalue > Math.max(1e-10, (eigenvalues[0] || eigenvalue) * 1e-10), 'Population training activity has fewer than two resolved principal components.');
            let largest = 0; for (let j = 1; j < p; j++) if (Math.abs(vector[j]) > Math.abs(vector[largest])) largest = j;
            if (vector[largest] < 0) for (let j = 0; j < p; j++) vector[j] *= -1;
            loadings.push(Array.from(vector)); eigenvalues.push(eigenvalue); iterations.push(iteration + 1);
        }
        const totalVariance = covariance.reduce((s, row, i) => s + row[i], 0);
        return { pca: { unitIds: kept.map(j => originalIds[j]), mean, scale, loadings, eigenvalues,
            explainedVarianceRatio: eigenvalues.map(e => e / totalVariance), totalVariance, iterations,
            scores: x.map(row => loadings.map(axis => dot(row, axis))) }, excludedUnits };
    }
    function checkPairs(scores, pairs) {
        check(Array.isArray(scores) && scores.length > 1 && scores.every(row => Array.isArray(row) && row.length === 2 && row.every(finite)), 'Scores must be finite two-dimensional rows.');
        check(Array.isArray(pairs) && pairs.length >= 2 && pairs.every(pair => Array.isArray(pair) && pair.length === 2 && pair.every(i => Number.isInteger(i) && i >= 0 && i < scores.length)), 'At least two valid transition pairs are required.');
    }
    function fitAffine(scores, pairs, ridge) {
        checkPairs(scores, pairs); check(finite(ridge) && ridge >= 0, 'Ridge must be finite and nonnegative.');
        const mx = [0, 0], my = [0, 0], n = pairs.length;
        for (const [i, j] of pairs) for (let d = 0; d < 2; d++) { mx[d] += scores[i][d] / n; my[d] += scores[j][d] / n; }
        const xx = [[0, 0], [0, 0]], yx = [[0, 0], [0, 0]];
        for (const [i, j] of pairs) for (let d = 0; d < 2; d++) for (let e = 0; e < 2; e++) {
            xx[d][e] += (scores[i][d] - mx[d]) * (scores[i][e] - mx[e]) / n;
            yx[d][e] += (scores[j][d] - my[d]) * (scores[i][e] - mx[e]) / n;
        }
        xx[0][0] += ridge; xx[1][1] += ridge;
        const det = xx[0][0] * xx[1][1] - xx[0][1] * xx[1][0];
        check(finite(det) && det > 0, 'Affine training covariance is singular; use positive ridge.');
        const A = yx.map(row => [(row[0] * xx[1][1] - row[1] * xx[1][0]) / det, (row[1] * xx[0][0] - row[0] * xx[0][1]) / det]);
        return { A, b: my.map((v, d) => v - dot(A[d], mx)), ridge };
    }
    function metric(scores, pairs, model) {
        const perDimension = [0, 0];
        for (const [i, j] of pairs) for (let d = 0; d < 2; d++) {
            const predicted = model.value ? model.value[d] : dot(model.A[d], scores[i]) + model.b[d];
            perDimension[d] += Math.pow(predicted - scores[j][d], 2) / pairs.length;
        }
        return { mse: (perDimension[0] + perDimension[1]) / 2, perDimension, pairCount: pairs.length };
    }
    function fitLine(scores, pairs) {
        checkPairs(scores, pairs);
        let best = null;
        for (let k = 0; k < 720; k++) {
            const theta = k * Math.PI / 720, u = [Math.cos(theta), Math.sin(theta)], normal = [-u[1], u[0]];
            let mx = 0, my = 0; const n = pairs.length;
            for (const [i, j] of pairs) { mx += dot(normal, scores[i]) / n; my += dot(normal, scores[j]) / n; }
            let variance = 0, covariance = 0;
            for (const [i, j] of pairs) { const dx = dot(normal, scores[i]) - mx; variance += dx * dx; covariance += dx * (dot(normal, scores[j]) - my); }
            const alpha = Math.max(0, Math.min(0.999999, variance > 0 ? covariance / variance : 0));
            const beta = my - alpha * mx;
            const A = u.map((v, d) => u.map((w, e) => v * w + alpha * normal[d] * normal[e]));
            const model = { A, b: normal.map(v => beta * v), theta, alpha, beta, u, normal, imposedUnitEigenvalue: true };
            const error = metric(scores, pairs, model).mse;
            if (!best || error < best.trainingMse) best = Object.assign(model, { trainingMse: error });
        }
        return best;
    }
    function describeDynamics(A, b, binWidth) {
        check(Array.isArray(A) && A.length === 2 && A.every(row => Array.isArray(row) && row.length === 2 && row.every(finite)) &&
            Array.isArray(b) && b.length === 2 && b.every(finite) && finite(binWidth) && binWidth > 0, 'Dynamics require finite 2x2 A, 2-vector b and positive binWidth.');
        const tr = A[0][0] + A[1][1], det = A[0][0] * A[1][1] - A[0][1] * A[1][0];
        const discriminant = tr * tr - 4 * det;
        const root = Math.sqrt(Math.abs(discriminant));
        const eigenvalues = discriminant < 0 ? [{ real: tr / 2, imaginary: root / 2 }, { real: tr / 2, imaginary: -root / 2 }] :
            [{ real: (tr + root) / 2, imaginary: 0 }, { real: (tr - root) / 2, imaginary: 0 }];
        for (const e of eigenvalues) {
            e.modulus = Math.hypot(e.real, e.imaginary);
            e.stability = e.modulus > 1 + 1e-10 ? 'unstable' : e.modulus < 1 - 1e-10 ? 'stable' : 'neutral';
            // A growth mode has no decay time. Zero modes vanish in one step.
            e.decayTimeSeconds = e.stability === 'stable' && e.modulus > 0 ? -binWidth / Math.log(e.modulus) : null;
        }
        const M = [[1 - A[0][0], -A[0][1]], [-A[1][0], 1 - A[1][1]]];
        const d = M[0][0] * M[1][1] - M[0][1] * M[1][0];
        const norm = Math.max(...M.flat().map(Math.abs));
        // Roundoff in I-A scales with A, then with M in the determinant.
        // Do not mistake a slow but nonsingular stable model for a fixed line.
        const tolerance = 32 * Number.EPSILON * Math.max(1, ...A.flat().map(Math.abs)) * norm;
        let fixedPoint;
        if (Math.abs(d) > tolerance) fixedPoint = { kind: 'unique', value: [(b[0] * M[1][1] - M[0][1] * b[1]) / d, (M[0][0] * b[1] - b[0] * M[1][0]) / d] };
        else {
            const row = dot(M[0], M[0]) >= dot(M[1], M[1]) ? 0 : 1;
            const length2 = dot(M[row], M[row]);
            const candidate = length2 > 1e-20 ? M[row].map(v => v * b[row] / length2) : [0, 0];
            const residual = Math.hypot(dot(M[0], candidate) - b[0], dot(M[1], candidate) - b[1]);
            fixedPoint = residual <= 1e-8 * Math.max(1, Math.hypot(...b)) ?
                { kind: length2 > 1e-20 ? 'line' : 'all', representative: candidate } : { kind: 'none' };
        }
        return { eigenvalues, spectrum: discriminant < 0 ? 'complex_conjugate' : 'real',
            stability: eigenvalues.some(e => e.stability === 'unstable') ? 'unstable' : eigenvalues.some(e => e.stability === 'neutral') ? 'neutral' : 'stable', fixedPoint };
    }
    function run(trains, options, progress) {
        progressCall(progress, 'validate', 0);
        check(Array.isArray(trains) && trains.length >= 2 && trains.length <= LIMITS.maxUnits, 'Select between 2 and 512 Units.');
        check(options && validId(options.recordingId), 'An original Recording ID is required.');
        const bins = makeBins(options), unitIds = trains.map(t => t && t.unitId);
        check(unitIds.every(validId) && new Set(unitIds).size === unitIds.length, 'Unit IDs must be original, valid and unique within this Recording.');
        check(trains.length * (bins.edges.length - 1) <= LIMITS.maxCountCells, 'Count matrix exceeds 2 million cells. Select fewer Units or a shorter range.');
        let spikeCount = 0;
        for (const train of trains) {
            const a = train.spikes;
            check(Array.isArray(a) || (ArrayBuffer.isView(a) && !(a instanceof DataView)), 'Each Unit requires an array of sorted spike times in seconds.');
            spikeCount += a.length; check(spikeCount <= LIMITS.maxSpikes, 'Spike input exceeds 20 million timestamps. Read a bounded neural-time range.');
            for (let i = 0; i < a.length; i++) check(finite(a[i]) && (i === 0 || a[i] >= a[i - 1]), 'Spike times must be finite and sorted in neural seconds.');
        }
        const splits = makeSplits(bins.indices);
        const counts = bins.times.map(() => new Array(trains.length));
        for (let j = 0; j < trains.length; j++) {
            const a = trains[j].spikes;
            for (let i = 0; i < bins.times.length; i++) counts[i][j] = lowerBound(a, bins.times[i][1]) - lowerBound(a, bins.times[i][0]);
        }
        progressCall(progress, 'counts', 0.2);
        const { pca, excludedUnits } = pca2(counts, splits.train.indices, unitIds, progress);
        progressCall(progress, 'fit_affine', 0.65);
        const ridgeSelection = []; let affine = null, bestError = Infinity;
        for (const ridge of RIDGES) {
            const model = fitAffine(pca.scores, splits.train.pairs, ridge);
            const validationMse = metric(pca.scores, splits.validation.pairs, model).mse;
            ridgeSelection.push({ ridge, validationMse });
            if (validationMse < bestError) { bestError = validationMse; affine = model; }
        }
        progressCall(progress, 'fit_line', 0.75);
        const line = fitLine(pca.scores, splits.train.pairs);
        affine.dynamics = describeDynamics(affine.A, affine.b, options.binWidth);
        line.dynamics = describeDynamics(line.A, line.b, options.binWidth);
        const value = [0, 0]; for (const i of splits.train.indices) for (let d = 0; d < 2; d++) value[d] += pca.scores[i][d] / splits.train.indices.length;
        const models = { affine, line, persistence: { A: [[1, 0], [0, 1]], b: [0, 0] }, trainMean: { value } }, metrics = {};
        for (const [name, model] of Object.entries(models)) { metrics[name] = {}; for (const [split, data] of Object.entries(splits)) metrics[name][split] = metric(pca.scores, data.pairs, model); }
        const assumptions = ['Continuous neural-time spike counts, not concatenated event means.',
            'Standardization and PCA fitted on chronological training bins only; sample standard deviation (n-1).',
            'Affine ridge minimizes mean-pair squared Euclidean error + ridge * ||A||_F^2; intercept is unpenalized. Validation selects ridge; test is never used for fitting or selection.',
            'Constrained line model imposes an eigenvalue of one.',
            'Line orientation selected by training SSE on 720 orientations over [0, pi); alpha constrained to [0, 0.999999].',
            'Held-out MSE is mean squared prediction error per PC dimension; Euclidean loss is twice overall MSE.'];
        if (bins.coverage === null) assumptions.push('Acquisition coverage is unknown. Bins assume continuous observation over the selected neural-time range; silent bins may include unreported acquisition gaps.');
        if (bins.excluded.some(b => b.reason === 'partial_final_bin')) assumptions.push('The partial final bin is excluded to keep equal-duration count features.');
        const result = { schema: SCHEMA, recordingId: options.recordingId,
            options: { start: options.start, end: options.end, binWidth: options.binWidth, coverage: bins.coverage }, feature: 'spike_count',
            unitIds, excludedUnits, binEdges: bins.edges, binIndices: bins.indices, binTimes: bins.times, excludedBins: bins.excluded,
            counts, pca, splits, models, metrics, ridgeSelection, assumptions, limits: Object.assign({}, LIMITS) };
        const validation = validateResult(result); check(validation.valid, 'Nonfinite or invalid numerical result: ' + validation.errors.join('; '));
        progressCall(progress, 'complete', 1); return result;
    }
    function validateResult(r) {
        try {
            check(r && r.schema === SCHEMA && validId(r.recordingId) && r.feature === 'spike_count', 'Unknown schema, feature or Recording identity.');
            check(Array.isArray(r.unitIds) && r.unitIds.length >= 2 && r.unitIds.length <= LIMITS.maxUnits && r.unitIds.every(validId) && new Set(r.unitIds).size === r.unitIds.length, 'Invalid Unit identities.');
            const expected = makeBins(r.options), n = expected.indices.length, p = r.unitIds.length;
            check(n * p <= LIMITS.maxCountCells, 'Saved count matrix exceeds resource limits.');
            const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
            check(equal(r.binEdges, expected.edges) && equal(r.binIndices, expected.indices) && equal(r.binTimes, expected.times) && equal(r.excludedBins, expected.excluded), 'Saved bin identity/coverage is inconsistent.');
            const rows = (a, h, w, predicate) => Array.isArray(a) && a.length === h && a.every(row => Array.isArray(row) && row.length === w && row.every(predicate || finite));
            check(rows(r.counts, n, p, x => Number.isSafeInteger(x) && x >= 0), 'Counts must be nonnegative integers with original Unit columns.');
            check(equal(r.splits, makeSplits(r.binIndices)), 'Split indices or transition pairs do not match chronological bins.');
            const pc = r.pca, ids = pc && pc.unitIds, excluded = r.excludedUnits;
            check(Array.isArray(ids) && ids.length >= 2 && new Set(ids).size === ids.length && ids.every(id => r.unitIds.includes(id)), 'Invalid PCA Unit identities.');
            check(Array.isArray(excluded) && excluded.every(e => e && r.unitIds.includes(e.unitId) && e.reason === 'constant_in_training') &&
                new Set(ids.concat(excluded.map(e => e.unitId))).size === p && ids.length + excluded.length === p, 'Unit exclusions do not partition original Units.');
            const q = ids.length, vector = (a, length, predicate) => Array.isArray(a) && a.length === length && a.every(predicate || finite);
            check(vector(pc.mean, q) && vector(pc.scale, q, x => finite(x) && x > 0) && rows(pc.loadings, 2, q) && rows(pc.scores, n, 2) &&
                vector(pc.eigenvalues, 2, x => finite(x) && x > 0) && vector(pc.explainedVarianceRatio, 2, x => finite(x) && x > 0 && x <= 1 + 1e-10) && finite(pc.totalVariance) && pc.totalVariance > 0 && vector(pc.iterations, 2, x => Number.isInteger(x) && x > 0 && x <= LIMITS.maxPcaIterations), 'Invalid PCA shape or numerical values.');
            const near = (a, b) => Math.abs(a - b) <= 1e-8 * Math.max(1, Math.abs(a), Math.abs(b));
            const retainedIds = [], expectedExcluded = [], trainRows = r.splits.train.indices;
            for (let j = 0; j < p; j++) {
                let mean = 0, ss = 0, k = 0;
                for (const i of trainRows) { k++; const d = r.counts[i][j] - mean; mean += d / k; ss += d * (r.counts[i][j] - mean); }
                if (ss > 0) {
                    const index = retainedIds.length; retainedIds.push(r.unitIds[j]);
                    check(near(pc.mean[index], mean) && near(pc.scale[index], Math.sqrt(ss / (k - 1))), 'Saved standardization does not match training counts and Unit identity.');
                } else expectedExcluded.push({ unitId: r.unitIds[j], reason: 'constant_in_training' });
            }
            check(equal(ids, retainedIds) && equal(excluded, expectedExcluded), 'PCA Unit order or exclusion reason differs from training counts.');
            check(near(dot(pc.loadings[0], pc.loadings[0]), 1) && near(dot(pc.loadings[1], pc.loadings[1]), 1) && near(dot(pc.loadings[0], pc.loadings[1]), 0), 'PCA axes are not orthonormal.');
            const columns = ids.map(id => r.unitIds.indexOf(id));
            for (let i = 0; i < n; i++) for (let d = 0; d < 2; d++) {
                let score = 0; for (let j = 0; j < q; j++) score += (r.counts[i][columns[j]] - pc.mean[j]) / pc.scale[j] * pc.loadings[d][j];
                check(near(score, pc.scores[i][d]), 'PCA scores do not match retained bin/Unit counts.');
            }
            check(near(pc.totalVariance, q) && pc.eigenvalues[0] + 1e-8 >= pc.eigenvalues[1], 'Invalid standardized PCA variance.');
            for (let d = 0; d < 2; d++) {
                const variance = trainRows.reduce((s, i) => s + pc.scores[i][d] * pc.scores[i][d], 0) / (trainRows.length - 1);
                check(near(pc.eigenvalues[d], variance) && near(pc.explainedVarianceRatio[d], variance / pc.totalVariance), 'PCA eigenvariance does not match training scores.');
            }
            check(Array.isArray(r.assumptions) && r.assumptions.length > 0 && r.assumptions.every(s => typeof s === 'string') && (r.options.coverage != null || r.assumptions.some(s => s.includes('coverage is unknown'))), 'Missing analysis assumptions or unknown-coverage warning.');
            for (const name of ['affine', 'line', 'persistence', 'trainMean']) {
                const model = r.models && r.models[name];
                check(model && (name === 'trainMean' ? vector(model.value, 2) : rows(model.A, 2, 2) && vector(model.b, 2)), 'Invalid model ' + name + '.');
                for (const split of ['train', 'validation', 'test']) {
                    const m = r.metrics && r.metrics[name] && r.metrics[name][split];
                    check(m && finite(m.mse) && m.mse >= 0 && vector(m.perDimension, 2, x => finite(x) && x >= 0) && m.pairCount === r.splits[split].pairs.length && Math.abs(m.mse - (m.perDimension[0] + m.perDimension[1]) / 2) <= 1e-10 * Math.max(1, m.mse), 'Invalid held-out metrics.');
                    const recomputed = metric(pc.scores, r.splits[split].pairs, model);
                    check(near(m.mse, recomputed.mse) && m.perDimension.every((x, d) => near(x, recomputed.perDimension[d])), 'Metrics do not match model predictions on saved transition pairs.');
                }
            }
            check(RIDGES.includes(r.models.affine.ridge) && Array.isArray(r.ridgeSelection) && r.ridgeSelection.length === RIDGES.length && r.ridgeSelection.every((x, i) => x.ridge === RIDGES[i] && finite(x.validationMse) && x.validationMse >= 0), 'Invalid ridge selection.');
            const line = r.models.line;
            check(line.imposedUnitEigenvalue === true && finite(line.theta) && line.theta >= 0 && line.theta < Math.PI && finite(line.alpha) && line.alpha >= 0 && line.alpha <= 0.999999 && finite(line.beta) && vector(line.u, 2) && vector(line.normal, 2) && finite(line.trainingMse), 'Invalid constrained line model.');
            const u = [Math.cos(line.theta), Math.sin(line.theta)], normal = [-u[1], u[0]];
            for (let d = 0; d < 2; d++) {
                check(near(line.u[d], u[d]) && near(line.normal[d], normal[d]) && near(line.b[d], line.beta * normal[d]), 'Inconsistent constrained line direction or offset.');
                for (let e = 0; e < 2; e++) check(near(line.A[d][e], u[d] * u[e] + line.alpha * normal[d] * normal[e]), 'Constrained line matrix does not impose its declared eigenvalue.');
            }
            check(near(line.trainingMse, r.metrics.line.train.mse), 'Line training loss is inconsistent.');
            const winner = r.ridgeSelection.reduce((a, b) => b.validationMse < a.validationMse ? b : a);
            check(winner.ridge === r.models.affine.ridge && near(winner.validationMse, r.metrics.affine.validation.mse), 'Saved ridge was not selected on validation loss.');
            // Reject NaN/Infinity anywhere, including derived eigen/fixed-point metadata.
            let visited = 0;
            function scan(value, depth) { check(depth < 20 && ++visited <= 6000000, 'Saved analysis structure exceeds limits.'); if (typeof value === 'number') check(finite(value), 'Nonfinite saved number.'); else if (value && typeof value === 'object') for (const v of Object.values(value)) scan(v, depth + 1); }
            scan(r, 0);
            for (const name of ['affine', 'line']) check(equal(r.models[name].dynamics, describeDynamics(r.models[name].A, r.models[name].b, r.options.binWidth)), 'Inconsistent model spectrum or fixed point.');
            return { valid: true, errors: [] };
        } catch (error) { return { valid: false, errors: [error.message] }; }
    }
    return { schema: SCHEMA, limits: LIMITS, run, validateResult, fitAffine, fitLine, describeDynamics };
});
