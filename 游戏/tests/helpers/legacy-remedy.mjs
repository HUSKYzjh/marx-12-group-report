import {initialPrologue} from '../../lib/prologue-state.ts';
import {initialRemedy} from '../../lib/remedy-lab.ts';

// Explicit pre-open-flow save fixture. Never downgrade new sessions in production.
export function legacyRemedyPrologue(){
 return {...initialPrologue(),remedyLabs:{consumption:initialRemedy('consumption'),investment:initialRemedy('investment'),exports:initialRemedy('exports')}};
}
