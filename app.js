const firebaseConfig = {
  apiKey: "AIzaSyD1MbjM8zJMMUOtO3k_CtGBi2fwAWI4UIw",
  authDomain: "diddybase.firebaseapp.com",
  databaseURL:
    "https://diddybase-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "diddybase",
  storageBucket: "diddybase.appspot.com",
  messagingSenderId: "869951185544",
  appId: "1:869951185544:web:e4f6f3520a49a1c116353d",
  measurementId: "G-5HZ357REP6",
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const CHAT_REF = db.ref("chat");

// ===== AES-CBC Helpers =====
function generateKey() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return CryptoJS.enc.Hex.stringify(CryptoJS.lib.WordArray.create(arr)).substr(
    0,
    32
  );
}

function encryptMessage(text, key) {
  const iv = CryptoJS.lib.WordArray.random(16);
  const encrypted = CryptoJS.AES.encrypt(text, CryptoJS.enc.Utf8.parse(key), {
    iv: iv,
  });
  return CryptoJS.enc.Base64.stringify(iv.concat(encrypted.ciphertext));
}

function decryptMessage(ciphertext, key) {
  try {
    const raw = CryptoJS.enc.Base64.parse(ciphertext);
    const iv = CryptoJS.lib.WordArray.create(raw.words.slice(0, 4), 16);
    const ct = CryptoJS.lib.WordArray.create(
      raw.words.slice(4),
      raw.sigBytes - 16
    );
    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: ct },
      CryptoJS.enc.Utf8.parse(key),
      { iv: iv }
    );
    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch {
    return null;
  }
}

// ===== Send Message =====
document.getElementById("sendBtn").addEventListener("click", () => {
  const name = document.getElementById("name").value.trim();
  const msg = document.getElementById("message").value.trim();
  if (!name || !msg) return alert("Enter name + message!");

  const key = generateKey();
  const encrypted = encryptMessage(`${name}: ${msg}`, key);
  const timestamp = Math.floor(Date.now() / 1000);

  CHAT_REF.push({
    message: encrypted,
    key: key,
    user: name,
    timestamp: timestamp,
  });

  document.getElementById("message").value = "";
});

// ===== Fetch Messages + Cleanup =====
function fetchMessages() {
  const fifteenMinAgo = Math.floor(Date.now() / 1000) - 15 * 60;
  CHAT_REF.orderByChild("timestamp")
    .startAt(fifteenMinAgo)
    .on("value", (snapshot) => {
      const chatBox = document.getElementById("chat");
      chatBox.innerHTML = "";
      const data = snapshot.val();
      if (!data) return;
      Object.entries(data).forEach(([id, msg]) => {
        const decrypted = decryptMessage(msg.message, msg.key);
        if (decrypted) {
          const p = document.createElement("p");
          p.textContent = decrypted;
          chatBox.appendChild(p);
        }
        // Delete old messages
        if (msg.timestamp < fifteenMinAgo) {
          CHAT_REF.child(id).remove();
        }
      });
      chatBox.scrollTop = chatBox.scrollHeight;
    });
}

fetchMessages();
