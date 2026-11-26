/* Synthetic engineering QA only. No biological inference or Allen data. */
'use strict';
const assert = require('node:assert/strict');
const vm = require('node:vm');
const core = require('../scripts/population-dynamics-core.js');
let passed = 0;
function test(name, fn) { fn(); passed++; console.log('PASS ' + name); }
function close(a, b, tol = 1e-8) { assert.ok(Math.abs(a - b) <= tol, `${a} != ${b}`); }
function fromCounts(counts, width = 1) {
    return counts[0].map((_, j) => ({ unitId: 100 + j, spikes: counts.flatMap((row, i) => Array.from({ length: row[j] }, (_, k) => (i + (k + 1) / (row[j] + 1)) * width)) }));
}
function fixture(n = 100) { return Array.from({ length: n }, (_, i) => [2 + (i * 7 % 5), 1 + (i * 11 % 7), (i * i + i * 3) % 11, 0, 3]); }
const options = { recordingId: 'synthetic-qa', start: 0, end: 100, binWidth: 1, coverage: null };
const trains = fromCounts(fixture());
let result;
test('continuous counts, IDs and train-constant exclusions', () => {
    result = core.run(trains, options);
    assert.deepEqual(result.counts, fixture());
    assert.deepEqual(result.pca.unitIds, [100, 101, 102]);
    assert.deepEqual(result.excludedUnits, [{ unitId: 103, reason: 'constant_in_training' }, { unitId: 104, reason: 'constant_in_training' }]);
    assert.equal(result.options.coverage, null);
    assert.ok(result.assumptions.some(s => s.includes('coverage is unknown')));
    assert.equal(result.models.line.imposedUnitEigenvalue, true);
    assert.equal(result.splits.train.indices.length, 70);
    assert.equal(result.splits.validation.indices.length, 15);
    assert.equal(result.splits.test.indices.length, 15);
    assert.equal(core.validateResult(JSON.parse(JSON.stringify(result))).valid, true);
});
test('half-open boundaries, duplicate timestamps and exact selected range', () => {
    const input = fromCounts(fixture());
    input[0].spikes.push(-1, 0, 0, 1, 99, 100, 101); input[0].spikes.sort((a, b) => a - b);
    const r = core.run(input, options);
    close(r.counts[0][0], fixture()[0][0] + 2);
    close(r.counts[1][0], fixture()[1][0] + 1);
    close(r.counts[99][0], fixture()[99][0] + 1);
    assert.deepEqual(r.binTimes[0], [0, 1]); assert.deepEqual(r.binTimes[99], [99, 100]);
});
test('decimal boundaries use explicit edges without timestamp rounding', () => {
    const input = fromCounts(fixture(), 0.1);
    input[0].spikes.push(0.3, 0.1 * 3, 10); input[0].spikes.sort((a, b) => a - b);
    const r = core.run(input, { ...options, end: 10, binWidth: 0.1 });
    assert.equal(r.counts[2][0], fixture()[2][0] + 1); // 0.3 < stored edge 0.30000000000000004
    assert.equal(r.counts[3][0], fixture()[3][0] + 1);
});
test('known coverage gaps, partial bins and split boundaries never become pairs', () => {
    const r = core.run(trains, { ...options, end: 99.5, coverage: [[0, 30], [35, 60], [62, 100]] });
    assert.ok(r.excludedBins.some(b => b.binIndex === 99 && b.reason === 'partial_final_bin'));
    assert.ok(r.excludedBins.some(b => b.binIndex === 30 && b.reason === 'not_fully_covered'));
    for (const split of Object.values(r.splits)) for (const [i, j] of split.pairs) {
        assert.ok(split.indices.includes(i) && split.indices.includes(j)); assert.equal(r.binIndices[j], r.binIndices[i] + 1);
    }
    assert.equal(r.binIndices.length, 92);
    assert.equal(core.validateResult(r).valid, true);
});
test('adjacent coverage intervals merge; uncovered selection fails explicitly', () => {
    const r = core.run(trains, { ...options, coverage: [[0, 30], [30, 100]] });
    assert.deepEqual(r.counts, result.counts); assert.deepEqual(r.options.coverage, [[0, 100]]);
    assert.throws(() => core.run(trains, { ...options, coverage: [] }), /at least 20/);
    assert.throws(() => core.run(trains, { ...options, coverage: [[0, 50], [49, 100]] }), /non-overlapping/);
});
test('PCA orthonormality, train sample normalization and explained variance', () => {
    const pc = result.pca;
    for (let k = 0; k < 2; k++) {
        close(pc.loadings[k].reduce((s, x) => s + x * x, 0), 1);
        close(result.splits.train.indices.reduce((s, i) => s + pc.scores[i][k], 0) / 70, 0);
        close(result.splits.train.indices.reduce((s, i) => s + pc.scores[i][k] ** 2, 0) / 69, pc.eigenvalues[k]);
        const max = pc.loadings[k].reduce((a, b) => Math.abs(a) >= Math.abs(b) ? a : b); assert.ok(max > 0);
    }
    close(pc.loadings[0].reduce((s, x, i) => s + x * pc.loadings[1][i], 0), 0);
});
test('PCA matches independent full symmetric Jacobi eigensolver', () => {
    // Different algorithm from production power/deflation; small synthetic QA matrix.
    const counts = Array.from({ length: 140 }, (_, i) => Array.from({ length: 7 }, (_, j) =>
        (i * (j + 3) + i * i * (j % 3 + 1)) % (11 + j) + (i % 5) * (j % 2)));
    const r = core.run(fromCounts(counts), { ...options, end: 140 }), train = counts.slice(0, 98), p = 7;
    const means = Array.from({ length: p }, (_, j) => train.reduce((s, row) => s + row[j], 0) / train.length);
    const scales = means.map((m, j) => Math.sqrt(train.reduce((s, row) => s + (row[j] - m) ** 2, 0) / (train.length - 1)));
    const C = means.map((_, j) => means.map((__, k) => train.reduce((s, row) => s + (row[j] - means[j]) * (row[k] - means[k]), 0) / ((train.length - 1) * scales[j] * scales[k])));
    const V = means.map((_, j) => means.map((__, k) => Number(j === k)));
    for (let iteration = 0; iteration < 10000; iteration++) {
        let a = 0, b = 1;
        for (let j = 0; j < p; j++) for (let k = j + 1; k < p; k++) if (Math.abs(C[j][k]) > Math.abs(C[a][b])) { a = j; b = k; }
        if (Math.abs(C[a][b]) < 1e-14) break;
        const angle = 0.5 * Math.atan2(2 * C[a][b], C[b][b] - C[a][a]), c = Math.cos(angle), s = Math.sin(angle);
        const aa = C[a][a], bb = C[b][b], ab = C[a][b];
        for (let j = 0; j < p; j++) if (j !== a && j !== b) {
            const ja = C[j][a], jb = C[j][b]; C[j][a] = C[a][j] = c * ja - s * jb; C[j][b] = C[b][j] = s * ja + c * jb;
        }
        C[a][a] = c * c * aa - 2 * s * c * ab + s * s * bb;
        C[b][b] = s * s * aa + 2 * s * c * ab + c * c * bb; C[a][b] = C[b][a] = 0;
        for (let j = 0; j < p; j++) { const ja = V[j][a], jb = V[j][b]; V[j][a] = c * ja - s * jb; V[j][b] = s * ja + c * jb; }
    }
    const order = means.map((_, j) => j).sort((a, b) => C[b][b] - C[a][a]);
    for (let d = 0; d < 2; d++) {
        close(r.pca.eigenvalues[d], C[order[d]][order[d]], 1e-10);
        close(Math.abs(r.pca.loadings[d].reduce((s, v, j) => s + v * V[j][order[d]], 0)), 1, 1e-10);
    }
});
test('test changes cannot leak into PCA, ridge selection or models', () => {
    const counts = fixture(); for (let i = 85; i < 100; i++) { counts[i][0] += 20; counts[i][1] += 13; counts[i][3] += 30; }
    const r = core.run(fromCounts(counts), options);
    for (const key of ['mean', 'scale', 'loadings', 'eigenvalues', 'unitIds']) assert.deepEqual(r.pca[key], result.pca[key]);
    assert.deepEqual(r.models, result.models); assert.deepEqual(r.ridgeSelection, result.ridgeSelection);
    assert.notDeepEqual(r.metrics.affine.test, result.metrics.affine.test);
    assert.equal(r.excludedUnits[0].unitId, 103);
});
test('validation changes cannot leak into train PCA or constrained model', () => {
    const counts = fixture(); for (let i = 70; i < 85; i++) counts[i][0] += 20;
    const r = core.run(fromCounts(counts), options);
    assert.deepEqual(r.pca.loadings, result.pca.loadings); assert.deepEqual(r.models.line, result.models.line);
});
test('stable, unstable, complex and neutral dynamics have honest decay/fixed-point metadata', () => {
    const stable = core.describeDynamics([[0.5, 0], [0, 0.25]], [1, 1], 0.1);
    assert.equal(stable.stability, 'stable'); assert.deepEqual(stable.fixedPoint, { kind: 'unique', value: [2, 4 / 3] });
    close(stable.eigenvalues[0].decayTimeSeconds, -0.1 / Math.log(0.5));
    const unstable = core.describeDynamics([[1.2, 0], [0, -1.1]], [0, 0], 1);
    assert.equal(unstable.stability, 'unstable'); assert.ok(unstable.eigenvalues.every(e => e.decayTimeSeconds === null));
    const complex = core.describeDynamics([[0, -0.8], [0.8, 0]], [0, 0], 1);
    assert.equal(complex.spectrum, 'complex_conjugate'); assert.equal(complex.stability, 'stable'); close(complex.eigenvalues[0].modulus, 0.8);
    assert.equal(core.describeDynamics([[1, 0], [0, 0.5]], [0, 1], 1).fixedPoint.kind, 'line');
    assert.equal(core.describeDynamics([[1, 0], [0, 0.5]], [1, 1], 1).fixedPoint.kind, 'none');
    assert.equal(core.describeDynamics([[1, 0], [0, 1]], [0, 0], 1).fixedPoint.kind, 'all');
    assert.equal(core.describeDynamics([[0.999999, 0], [0, 0.999998]], [1, 1], 1).fixedPoint.kind, 'unique');
});
test('affine centered ridge convention and unpenalized intercept', () => {
    const scores = [[-1, 0], [0, -1], [1, 0], [0, 1], [3, 4], [5, 1], [7, 4], [5, 7]];
    const pairs = [[0, 4], [1, 5], [2, 6], [3, 7]];
    const m = core.fitAffine(scores, pairs, 0.5);
    assert.deepEqual(m.A, [[1, 0], [0, 1.5]]); assert.deepEqual(m.b, [5, 4]);
});
test('line grid recovers exact imposed direction and transverse residuals', () => {
    const scores = [], pairs = [], theta = Math.PI / 4, u = [Math.cos(theta), Math.sin(theta)], normal = [-u[1], u[0]];
    for (let k = 0; k < 50; k++) {
        const a = (k * 13 % 17) - 8, b = (k * 7 % 11) - 5, i = scores.length;
        scores.push(u.map((x, d) => x * a + normal[d] * b), u.map((x, d) => x * a + normal[d] * (0.7 * b + 0.4)));
        pairs.push([i, i + 1]);
    }
    const m = core.fitLine(scores, pairs); close(m.theta, theta); close(m.alpha, 0.7); close(m.beta, 0.4); close(m.trainingMse, 0);
    for (let d = 0; d < 2; d++) close(m.A[d][0] * u[0] + m.A[d][1] * u[1], u[d]);
});
test('constant, rank-one, invalid identities and unsorted/nonfinite inputs fail', () => {
    assert.throws(() => core.run(fromCounts(Array.from({ length: 100 }, () => [1, 1])), options), /two Units/);
    assert.throws(() => core.run(fromCounts(Array.from({ length: 100 }, (_, i) => [i % 4, i % 4])), options), /two resolved/);
    assert.throws(() => core.run([{ unitId: 1, spikes: [2, 1] }, trains[1]], options), /sorted/);
    assert.throws(() => core.run([{ unitId: 1, spikes: [NaN] }, trains[1]], options), /finite/);
    assert.throws(() => core.run([trains[0], trains[0]], options), /unique/);
    assert.throws(() => core.run(trains, { ...options, binWidth: 0 }), /positive/);
    assert.throws(() => core.run(trains, { ...options, recordingId: null }), /Recording/);
});
test('resource limits fail before excessive count/covariance allocation', () => {
    assert.throws(() => core.run(trains, { ...options, end: 10001 }), /Too many bins/);
    assert.throws(() => core.run(Array.from({ length: 513 }, (_, i) => ({ unitId: i, spikes: [] })), options), /512/);
    assert.throws(() => core.run(Array.from({ length: 512 }, (_, i) => ({ unitId: i, spikes: [] })), { ...options, end: 5000 }), /2 million/);
    const input = Array.from({ length: 300 }, (_, i) => ({ unitId: i, spikes: [i % 5 + 0.2] }));
    assert.throws(() => core.run(input, { ...options, end: 5000 }), /Covariance/);
});
test('persistence rejects corrupt shapes, counts, split identities and nonfinite metadata', () => {
    const corruptions = [r => { r.schema = 'other'; }, r => { r.counts[0][0] = -1; }, r => { r.binIndices[1] = 99; }, r => { r.pca.unitIds[0] = 999; },
        r => { r.pca.scores[0][0] = Infinity; }, r => { r.splits.test.pairs[0][0] = 0; }, r => { r.models.affine.dynamics.eigenvalues[0].real = 99; },
        r => { r.models.line.imposedUnitEigenvalue = false; }, r => { r.assumptions = []; }, r => { delete r.metrics; },
        r => { r.pca.unitIds.reverse(); }, r => { r.pca.mean[0] += 1; }, r => { r.pca.scores[3][1] += 1; },
        r => { r.metrics.affine.test.perDimension[0] += 1; }, r => { r.models.line.alpha += 0.1; }];
    for (const corrupt of corruptions) { const r = JSON.parse(JSON.stringify(result)); corrupt(r); assert.equal(core.validateResult(r).valid, false); }
    for (const invalid of [null, {}, [], 1]) assert.equal(core.validateResult(invalid).valid, false);
});
test('deterministic repeats and progress stages', () => {
    const progress = [], r = core.run(trains, options, x => progress.push(x)); assert.deepEqual(r, result);
    assert.equal(progress[0].stage, 'validate'); assert.equal(progress.at(-1).fraction, 1); assert.ok(progress.some(p => p.stage === 'fit_line'));
});
test('self-contained worker factory executes result and error messages', () => {
    const messages = [], context = { self: { postMessage: m => messages.push(m) } }; vm.createContext(context); vm.runInContext(core.workerSource(), context);
    context.self.onmessage({ data: { id: 'qa', trains, options } });
    const response = messages.find(m => m.type === 'result'); assert.ok(response); assert.equal(response.id, 'qa');
    assert.equal(JSON.stringify(response.result), JSON.stringify(result)); assert.ok(messages.some(m => m.type === 'progress'));
    context.self.onmessage({ data: { id: 'bad', trains: [], options } }); assert.equal(messages.at(-1).type, 'error');
});
console.log(`${passed} population-dynamics synthetic QA checks passed.`);
