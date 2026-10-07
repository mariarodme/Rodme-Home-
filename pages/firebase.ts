import {initializeApp} from 'firebase/app';
import {getAuth, GoogleAuthProvider, signInWithPopup, browserLocalPersistence, setPersistence} from 'firebase/auth';
import {initializeFirestore,persistentLocalCache,persistentMultipleTabManager} from 'firebase/firestore';
const app=initializeApp({apiKey:'AIzaSyA-tKXyjqwD45RA6Zel-dbk77TH757LOBk',authDomain:'rodme-home.firebaseapp.com',projectId:'rodme-home',storageBucket:'rodme-home.firebasestorage.app',messagingSenderId:'340185409440',appId:'1:340185409440:web:b4f2dbbe224d114542a6c5'});
export const auth=getAuth(app);
export const db=initializeFirestore(app,{localCache:persistentLocalCache({tabManager:persistentMultipleTabManager()})});
export async function login(){
 await setPersistence(auth,browserLocalPersistence);
 const provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});
 // Popup stays on the GitHub Pages origin, avoiding third-party redirect storage.
 return signInWithPopup(auth,provider);
}
export function friendlyError(error:unknown){
 const e=error as {code?:string;message?:string};
 if(e.code==='auth/unauthorized-domain')return 'Falta autorizar mariarodme.github.io en Firebase → Authentication → Configuración → Dominios autorizados.';
 if(e.code==='auth/popup-blocked')return 'El navegador bloqueó la ventana de Google. Permite ventanas emergentes y vuelve a tocar Entrar con Google.';
 if(e.code==='auth/popup-closed-by-user'||e.code==='auth/cancelled-popup-request')return 'Se cerró el acceso de Google. Puedes volver a intentarlo.';
 if(e.code==='permission-denied')return 'No pudimos acceder al hogar. Revisa que Cloud Firestore esté creado y sus reglas estén publicadas.';
 if(e.code==='unavailable'||e.code==='auth/network-request-failed')return 'Revisa tu conexión a internet y vuelve a intentarlo.';
 return e.message||'No pudimos completar la operación. Vuelve a intentarlo.';
}
