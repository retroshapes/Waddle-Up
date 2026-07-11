(function () {
  "use strict";

  const config = {
    apiKey: "AIzaSyBlxw4A6HUp3c3ydA1gxQyNfew3VRMuFo8",
    authDomain: "pixel-jumper-43541.firebaseapp.com",
    projectId: "pixel-jumper-43541",
    storageBucket: "pixel-jumper-43541.firebasestorage.app",
    messagingSenderId: "100679285037",
    appId: "1:100679285037:web:a1ac0a00d1c29d3296fba4"
  };

  let db;
  let readyPromise;

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      const existing = document.querySelector('script[src="' + src + '"]');
      if (existing) {
        if (window.firebase) resolve();
        else existing.addEventListener("load", resolve, { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function initialize() {
    if (readyPromise) return readyPromise;
    readyPromise = loadScript("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js")
      .then(function () {
        return loadScript("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js");
      })
      .then(function () {
        if (!firebase.apps.length) firebase.initializeApp(config);
        db = firebase.firestore();
        return db;
      });
    return readyPromise;
  }

  function getDeviceId() {
    let id = localStorage.getItem("waddle_up_device");
    if (!id) {
      id = "wu_" + Date.now() + "_" + Math.random().toString(36).slice(2, 11);
      localStorage.setItem("waddle_up_device", id);
    }
    return id;
  }

  async function submitScore(name, score) {
    const cleanName = String(name || "").trim().slice(0, 20);
    const cleanScore = Math.max(0, Math.floor(Number(score) || 0));
    if (!cleanName) throw new Error("Enter a name");

    const lastSubmit = Number(localStorage.getItem("waddle_up_last_submit") || 0);
    if (Date.now() - lastSubmit < 8000) throw new Error("Please wait a moment");

    await initialize();
    await db.collection("highscores").add({
      name: cleanName,
      score: cleanScore,
      deviceId: getDeviceId(),
      timestamp: Date.now()
    });
    localStorage.setItem("waddle_up_last_submit", String(Date.now()));
  }

  function timestampOf(entry) {
    const value = entry.timestamp || entry.createdAt || entry.created_at;
    if (!value) return 0;
    if (typeof value === "number") return value;
    if (typeof value.toMillis === "function") return value.toMillis();
    if (value.seconds) return value.seconds * 1000;
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  function rangeFor(filter) {
    if (filter === "all-time") return null;
    const start = new Date();
    let end = null;
    if (filter === "today") start.setHours(0, 0, 0, 0);
    else if (filter === "week") {
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
    } else if (filter === "month") {
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
    } else if (filter === "contest") {
      start.setFullYear(2026, 3, 20);
      start.setHours(0, 0, 0, 0);
      end = new Date(2026, 3, 27, 23, 59, 59, 999);
    } else return null;
    return { start: start.getTime(), end: end ? end.getTime() : null };
  }

  async function getScores(filter, limit) {
    const cleanFilter = ["all-time", "today", "week", "month", "contest"].includes(filter)
      ? filter
      : "all-time";
    await initialize();
    const snapshot = await db.collection("highscores")
      .orderBy("score", "desc")
      .limit(cleanFilter === "all-time" ? (limit || 20) : 500)
      .get();
    let scores = snapshot.docs.map(function (doc) {
      return Object.assign({ id: doc.id }, doc.data());
    });
    const range = rangeFor(cleanFilter);
    if (range) {
      scores = scores.filter(function (entry) {
        const timestamp = timestampOf(entry);
        return timestamp >= range.start && (!range.end || timestamp <= range.end);
      });
    }
    return scores.slice(0, limit || 20);
  }

  window.waddleUpFirebase = {
    initialize: initialize,
    submitScore: submitScore,
    getScores: getScores
  };
})();
