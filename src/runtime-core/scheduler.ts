const queue = new Set();
let isFulshing = false;
const p = Promise.resolve();
export function nextTick(fn) {
  return fn ? p.then(fn) : p;
}
export function queueJobs(fn) {
  queue.add(fn);
  queueFlush();
}
function queueFlush() {
  if (isFulshing) return;
  isFulshing = true;
  nextTick(flushJobs);
}

function flushJobs() {
  queue.forEach((job: any) => job());
  isFulshing = false;
}
