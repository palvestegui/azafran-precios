import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import fs from "fs";

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const docRef = doc(db, "config", "global");
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    console.log(JSON.stringify(docSnap.data().products, null, 2));
  } else {
    console.log("No such document!");
  }
  process.exit(0);
}
run();
