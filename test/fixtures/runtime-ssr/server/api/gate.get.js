import {defineEventHandler, getQuery} from 'h3';
import {renderGate} from '../utils/renderGate.js';
export default defineEventHandler(async event => {
    await renderGate(getQuery(event).action);
    return {ok: true};
});
