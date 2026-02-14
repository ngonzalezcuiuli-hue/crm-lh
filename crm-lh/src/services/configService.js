import { db } from "./firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

export async function getAppSettings() {
  const ref = doc(db, `config/appSettings`);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

export async function updateObjetivoComercial(mes, valor) {
  const ref = doc(db, `config/appSettings`);
  await updateDoc(ref, { [`objetivosComerciales.${mes}`]: valor });
}
