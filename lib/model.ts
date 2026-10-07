import { calculate } from './calculator';
export type Entity = { id: string; name: string; image: string; icon: string; coverPosition?: string; [key: string]: any };
export type Product = Entity & { storeId: string; sectionId: string; purchased: boolean; frequent: boolean; finished: boolean; price: number | null; lastPrice: number | null; lastDate: string; notes: string };
export type CartItem = { productId: string; quantity: number; price: number | null; discount: number };
export type Operation = 'add' | 'subtract' | 'multiply' | 'divide';
export type QuickItem = { id: string; amount: number; operation?: Operation };
export type Home = { products: Product[]; stores: Entity[]; sections: Entity[]; lists: Entity[]; cover: string; cart: CartItem[]; quickCart?: QuickItem[]; calculatorExpression?: string; photoCatalogVersion?: number; budget: number | null; cartStoreId: string; cartListId: string; history: any[] };
export const lineTotal = (item: CartItem) => Math.max(0, Math.round(((item.price || 0) * item.quantity - item.discount) * 100) / 100);
export const total = (cart: CartItem[]) => Math.round(cart.reduce((s, i) => s + lineTotal(i), 0) * 100) / 100;
export const operationSymbol = (operation: Operation = 'add') => ({add: '+', subtract: '−', multiply: '×', divide: '÷'})[operation];
export const operationLabel = (operation: Operation = 'add') => ({add: 'Sumar', subtract: 'Restar', multiply: 'Multiplicar', divide: 'Dividir'})[operation];
export function quickSteps(items: QuickItem[] = [], initial = 0) {
  let value = initial;
  return items.map(item => {
    const before = value;
    switch (item.operation || 'add') {
      case 'subtract': value -= item.amount; break;
      case 'multiply': value *= item.amount; break;
      case 'divide': value = item.amount === 0 ? NaN : value / item.amount; break;
      default: value += item.amount;
    }
    return {...item, before, after: value, delta: Math.round((value - before) * 100) / 100};
  });
}
export const quickTotal = (items: QuickItem[] = [], initial = 0) => Math.round((quickSteps(items, initial).at(-1)?.after ?? initial) * 100) / 100;
export const cartTotal = (home: Home) => home.calculatorExpression ? (calculate(home.calculatorExpression).value ?? NaN) : quickTotal(home.quickCart, total(home.cart));
export function calculatorExpression(home: Home) {
 if(home.calculatorExpression)return home.calculatorExpression;
 let expression=total(home.cart)?String(total(home.cart)):'';
 for(const item of home.quickCart||[]) {
  const op=item.operation||'add';const symbol=({add:'+',subtract:'-',multiply:'*',divide:'/'})[op];
  if(!expression&&op==='add')expression=String(item.amount);
  else expression=(op==='multiply'||op==='divide'?`(${expression||'0'})`:expression||'0')+symbol+item.amount;
 }
 return expression;
}
export const money = (n: number) => '₡' + new Intl.NumberFormat('es-CR', { maximumFractionDigits: 2 }).format(n);
