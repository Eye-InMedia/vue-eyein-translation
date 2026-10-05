let release;
let startedResolve;
let started = new Promise(resolve => {startedResolve = resolve;});
export async function renderGate(action) {
    if (action === 'wait') await started;
    else if (action === 'hold') {
        const blocked = new Promise(resolve => {release = resolve;});
        startedResolve();
        await blocked;
    } else if (action === 'release') {
        release?.();
        started = new Promise(resolve => {startedResolve = resolve;});
    }
}
