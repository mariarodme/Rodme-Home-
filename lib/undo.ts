import type {Home} from './model';
import {mergeHomes} from '../pages/merge';
export function undoChange(before:Home,after:Home,current:Home){const result=mergeHomes(after,before,current);if(result.conflicts.length)throw Error('Ese dato cambió después. Revisa el producto antes de corregirlo para conservar los cambios compartidos.');return result.home;}
