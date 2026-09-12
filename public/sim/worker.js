/**
 * Runs the real battle simulator (otogi_sim) in the browser under Pyodide.
 *
 * The site used to carry its own damage model in TypeScript. It disagreed with the
 * Python engine on defense, the attribute triangle, LB exceed keys and 19 of 29
 * effect types, and there is no way to keep two models of the same game in step. So
 * the browser now runs the engine itself: same code the tier lists are generated
 * with, no second implementation to drift.
 *
 * Plain JS in public/ on purpose -- no bundler, no npm dependency, no build step.
 * It must be a MODULE worker: Pyodide 314 throws "Classic web workers are not
 * supported" from its own entry point, and the failure surfaces as a misleading
 * NetworkError on the script load rather than as that message.
 *
 * Protocol (postMessage):
 *   in  { type: 'init' }              -> { type: 'progress', ... } * n, { type: 'ready', info }
 *   in  { type: 'run', id, payload }  -> { type: 'result', id, data } | { type: 'error', id, message }
 */

const PYODIDE_VERSION = 'v314.0.6';
const PYODIDE_URL = `https://cdn.jsdelivr.net/pyodide/${PYODIDE_VERSION}/full/`;

// GameDataLoader reads these by exact name; missing ones are skipped silently, which
// is why the engine must be handed a directory rather than individual files.
const DATA_FILES = [
  'cards.json',
  'skills.json',
  'abilities.json',
  'constants.json',
  'wbLv.json',
  'wbSkill.json',
  'wbSettings.json',
];

let pyodide = null;
let runFn = null;
let booting = null;

function progress(phase, detail) {
  self.postMessage({ type: 'progress', phase, detail });
}

async function boot() {
  progress('runtime', 'Downloading Python runtime');
  // Dynamic import rather than a static one so the version stays a single constant.
  const { loadPyodide } = await import(PYODIDE_URL + 'pyodide.mjs');
  pyodide = await loadPyodide({ indexURL: PYODIDE_URL });

  progress('engine', 'Loading simulator');
  // no-cache, not no-store: the bundle is a build artifact that changes whenever the
  // engine does, and a stale copy fails as missing FIELDS in the result rather than as
  // a load error -- which surfaces as the page blanking on render. It is ~150 KB, so
  // revalidating costs nothing next to the 6 MB of card data below.
  const zip = await fetch('/sim/otogi_sim.zip', { cache: 'no-cache' });
  if (!zip.ok) throw new Error(`simulator bundle: HTTP ${zip.status}`);
  await pyodide.unpackArchive(await zip.arrayBuffer(), 'zip', {
    extractDir: '/lib/otogi',
  });

  progress('data', 'Loading game data');
  pyodide.FS.mkdirTree('/data');
  // cards.json alone is ~6 MB, so fetch them in parallel and write the bytes
  // straight into the virtual FS rather than round-tripping through JS objects.
  await Promise.all(
    DATA_FILES.map(async (name) => {
      const res = await fetch(`/data/${name}`);
      if (!res.ok) return; // optional file; the loader tolerates absences
      const buf = new Uint8Array(await res.arrayBuffer());
      pyodide.FS.writeFile(`/data/${name}`, buf);
    })
  );

  progress('init', 'Starting engine');
  const info = await pyodide.runPythonAsync(`
import sys
sys.path.insert(0, "/lib/otogi")
import otogi_sim.web as web
web.init("/data")
`);
  runFn = pyodide.runPython('import otogi_sim.web as web; web.run');
  return JSON.parse(info);
}

self.onmessage = async (e) => {
  const msg = e.data || {};

  if (msg.type === 'init') {
    try {
      booting = booting || boot();
      self.postMessage({ type: 'ready', info: await booting });
    } catch (err) {
      booting = null; // let the page retry a failed download
      self.postMessage({ type: 'error', id: msg.id, message: String(err) });
    }
    return;
  }

  if (msg.type === 'run') {
    try {
      booting = booting || boot();
      await booting;
      // The engine seeds a module-global RNG and installs the cast policy on a
      // process-wide singleton, so one battle at a time. The page serialises
      // requests; this worker never runs two concurrently.
      const out = runFn(msg.payload);
      self.postMessage({ type: 'result', id: msg.id, data: JSON.parse(out) });
    } catch (err) {
      self.postMessage({ type: 'error', id: msg.id, message: String(err) });
    }
  }
};
