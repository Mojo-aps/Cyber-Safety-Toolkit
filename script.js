/* ==============================
   Cyber Safety Toolkit - script.js
   FINAL: API Fixed + Welcome Message + Play Removed for Bangla Tips
   ============================== */

let currentLang = localStorage.getItem("lang") || "en";
let translations = {};
let chatBox = null;
let apiKey = null; // Initialize as null

// Global addMessage
window.addMessage = function(text, sender) {
  if (!chatBox) return;
  const msg = document.createElement("div");
  msg.classList.add("message", sender);
  msg.innerHTML = text;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
  return msg;
};

/* ==============================
   TEXT-TO-SPEECH: Play/Stop
   ============================== */

window.speak = function(text, button) {
  if (!('speechSynthesis' in window)) {
    alert("Sorry, your browser doesn't support text-to-speech.");
    return;
  }

  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
    if (button) {
      button.innerHTML = '<span>▶ Play</span>';
      button.classList.remove("playing");
    }
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = currentLang === "bn" ? "bn-BD" : "en-US";
  utterance.rate = 0.9;

  utterance.onend = () => {
    if (button) {
      button.innerHTML = '<span>▶ Play</span>';
      button.classList.remove("playing");
    }
  };

  window.speechSynthesis.speak(utterance);
  if (button) {
    button.innerHTML = '<span>⏹ Stop</span>';
    button.classList.add("playing");
  }
};

/* ==============================
   DARK MODE: Toggle + System
   ============================== */

function applyTheme() {
  const toggle = document.getElementById("themeToggle");
  if (!toggle) return;

  const saved = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = saved || (prefersDark ? "dark" : "light");

  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);

  const slider = toggle.querySelector(".toggle-slider");
  if (slider) {
    slider.style.transform = theme === "dark" ? "translateX(26px)" : "translateX(0)";
    slider.style.background = theme === "dark" ? "#ffd700" : "#004aad";
  }
}

function setupThemeToggle() {
  const toggle = document.getElementById("themeToggle");
  if (!toggle) return;

  toggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") || "light";
    const newTheme = current === "dark" ? "light" : "dark";

    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);

    const slider = toggle.querySelector(".toggle-slider");
    if (slider) {
      slider.style.transform = newTheme === "dark" ? "translateX(26px)" : "translateX(0)";
      slider.style.background = newTheme === "dark" ? "#ffd700" : "#004aad";
    }
  });
}

/* ==============================
   LOAD TIPS FROM localization.json
   ============================== */

async function loadAwarenessTips() {
  const tipsContainer = document.getElementById("tipsContainer");
  const searchInput = document.getElementById("searchInput");

  if (!tipsContainer || !translations[currentLang]) return;

  const tips = translations[currentLang].tips || [];

  let filtered = tips;

  displayTips(filtered);

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      const query = searchInput.value.toLowerCase();
      filtered = tips.filter(tip => 
        (tip.title?.toLowerCase().includes(query)) || 
        (tip.content?.toLowerCase().includes(query))
      );
      displayTips(filtered);
    });
  }

  function displayTips(tips) {
    tipsContainer.innerHTML = "";
    if (!tips.length) {
      tipsContainer.innerHTML = "<p>No tips found.</p>";
      return;
    }

    tips.forEach(tip => {
      const div = document.createElement("div");
      div.classList.add("tip-card");

      const title = tip.title || "";
      const content = tip.content || "";

      let audioHTML = '';
      // Add Play button only for English (EN) tips
      if (currentLang === "en") {
        audioHTML = `
          <button class="audio-btn" onclick="speak('${content.replace(/'/g, "\\'")}', this)">
            <span>▶ Play</span>
          </button>
        `;
      }

      div.innerHTML = `
        <h3>${title}</h3>
        <p>${content}</p>
        <div class="tip-footer">${audioHTML}</div>
      `;
      tipsContainer.appendChild(div);
    });
  }
}

// Load OpenAI API Key
async function loadApiKey() {
  try {
    const res = await fetch("../data/openai-key.json");
    if (!res.ok) throw new Error("API key file not found");
    const data = await res.json();
    apiKey = data.openai_api_key;
    console.log("API key loaded successfully.");
  } catch (err) {
    console.warn("API key failed to load:", err);
    apiKey = null;
    addMessage("Warning: API key not found. Using fallback responses.", "bot");
  }
}

// Load translations
async function loadTranslations() {
  try {
    const res = await fetch("../data/localization.json");
    if (!res.ok) throw new Error("Localization not found");
    translations = await res.json();
    applyLanguage(currentLang);
  } catch (err) {
    console.error("Failed to load translations:", err);
  }
}

// Apply language
function applyLanguage(lang) {
  currentLang = lang;
  localStorage.setItem("lang", lang);

  const t = translations[lang] || translations["en"];

  document.querySelectorAll("[data-lang]").forEach(el => {
    const key = el.getAttribute("data-lang");
    const keys = key.split(".");
    let value = t;
    for (let k of keys) value = value?.[k];
    if (value) el.textContent = value;
  });

  document.querySelectorAll("[data-lang-placeholder]").forEach(el => {
    const key = el.getAttribute("data-lang-placeholder");
    const keys = key.split(".");
    let value = t;
    for (let k of keys) value = value?.[k];
    if (value) el.placeholder = value;
  });

  document.querySelectorAll(".lang-btn").forEach(btn => {
    btn.classList.remove("active");
    if (btn.id === `lang-${lang}`) btn.classList.add("active");
  });

  // Update welcome message when language changes
  if (chatBox) {
    chatBox.innerHTML = ""; // Clear existing messages
    const welcomeText = t?.chatbot?.welcome || "Hello!";
    addMessage(welcomeText, "bot");
  }

  if (window.location.pathname.includes("awareness")) {
    loadAwarenessTips();
  }
}

// Language switcher
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("lang-btn")) {
    const lang = e.target.id.split("-")[1];
    if (currentLang !== lang) {
      applyLanguage(lang);
    }
  }
});

// OpenAI API Call with Fallback
async function callOpenAI(question) {
  if (!apiKey) {
    return getFallbackResponse(question);
  }

  const prompt = currentLang === "bn"
    ? `সাইবার নিরাপত্তা বিষয়ে বাংলায় সংক্ষিপ্ত উত্তর দাও: ${question}`
    : `Answer briefly in English about cyber safety: ${question}`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 150
      })
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    return data.choices[0].message.content.trim();
  } catch (err) {
    console.warn("OpenAI API call failed:", err);
    addMessage("Error: API call failed. Using fallback response.", "bot");
    return getFallbackResponse(question);
  }
}

// Fallback Response
function getFallbackResponse(question) {
  const q = question.toLowerCase();
  if (q.includes("hi") || q.includes("hello") || q.includes("হাই")) {
    return currentLang === "bn"
      ? "হ্যালো! অনলাইন নিরাপত্তা নিয়ে কী জানতে চাও?"
      : "Hi! How can I help you with online safety?";
  }
  if (q.includes("phishing") || q.includes("ফিশিং")) {
    return currentLang === "bn"
      ? "ফিশিং হলো জাল ইমেইল/লিংক।<br><br><strong>চেনার উপায়:</strong><br>• 'https' আছে কিনা<br>• প্রেরক সন্দেহজনক কিনা"
      : "Phishing is a fake email/link.<br><br><strong>How to spot:</strong><br>• Check 'https'<br>• Suspicious sender";
  }
  return currentLang === "bn"
    ? "খুব ভালো প্রশ্ন!<br><br><strong>থিঙ্ক বিফোর ইউ ক্লিক</strong>।"
    : "Great question!<br><br><strong>Think Before You Click</strong>.";
}

/* ==============================
   DOM LOADED
   ============================== */

document.addEventListener("DOMContentLoaded", async () => {
  applyTheme();
  setupThemeToggle();

  chatBox = document.getElementById("chatBox");
  await loadApiKey();
  await loadTranslations();

  /* Phishing URL Checker */
  const checkBtn = document.getElementById("checkBtn");
  const urlInput = document.getElementById("urlInput");
  const resultMessage = document.getElementById("resultMessage");

  if (checkBtn && urlInput && resultMessage) {
    checkBtn.addEventListener("click", () => {
      const url = urlInput.value.trim();
      if (!url) {
        resultMessage.textContent = currentLang === "bn" ? "একটি URL লিখুন।" : "Please enter a URL.";
        resultMessage.className = "";
        return;
      }
      resultMessage.textContent = currentLang === "bn" ? "যাচাই করা হচ্ছে..." : "Checking...";
      resultMessage.className = "";

      const suspiciousWords = ["login", "verify", "update", "bank", "free", "click", "secure", "account"];
      const isSuspicious = suspiciousWords.some(word => url.toLowerCase().includes(word));

      setTimeout(() => {
        if (isSuspicious) {
          resultMessage.innerHTML = currentLang === "bn" 
            ? "Warning: এই লিংকটি সন্দেহজনক। ক্লিক করবেন না!"
            : "Warning: This link looks suspicious. Avoid clicking!";
          resultMessage.className = "unsafe";
        } else {
          resultMessage.innerHTML = currentLang === "bn"
            ? "Success: এই লিংকটি নিরাপদ বলে মনে হচ্ছে।"
            : "Success: This link seems safe to visit.";
          resultMessage.className = "safe";
        }
      }, 1200);
    });
  }

  /* Password Strength Analyzer */
  const analyzeBtn = document.getElementById("analyzeBtn");
  const passwordInput = document.getElementById("passwordInput");
  const strengthText = document.getElementById("strengthText");
  const suggestionText = document.getElementById("suggestionText");
  const strengthBar = document.getElementById("strengthBar");

  if (analyzeBtn && passwordInput && strengthText && suggestionText && strengthBar) {
    analyzeBtn.addEventListener("click", () => {
      const password = passwordInput.value;
      strengthBar.innerHTML = "";
      strengthText.textContent = "";
      suggestionText.textContent = "";

      if (!password) {
        strengthText.textContent = currentLang === "bn" ? "একটি পাসওয়ার্ড লিখুন।" : "Please enter a password.";
        return;
      }

      let score = 0;
      const feedback = [];

      if (password.length >= 12) score += 2;
      else if (password.length >= 8) score += 1;
      else feedback.push(currentLang === "bn" ? "কমপক্ষে ৮ অক্ষর ব্যবহার করুন" : "Use at least 8 characters");

      if (/[A-Z]/.test(password)) score++;
      else feedback.push(currentLang === "bn" ? "বড় হাতের অক্ষর যোগ করুন" : "Add uppercase letters");

      if (/[a-z]/.test(password)) score++;
      else feedback.push(currentLang === "bn" ? "ছোট হাতের অক্ষর যোগ করুন" : "Add lowercase letters");

      if (/[0-9]/.test(password)) score++;
      else feedback.push(currentLang === "bn" ? "সংখ্যা যোগ করুন" : "Add numbers");

      if (/[^A-Za-z0-9]/.test(password)) score++;
      else feedback.push(currentLang === "bn" ? "চিহ্ন যোগ করুন (!@#$%)" : "Add symbols (!@#$%)");

      if (password.length > 0 && !/(name|123|password|abc)/i.test(password)) score++;
      else if (password.length > 0) feedback.push(currentLang === "bn" ? "সাধারণ শব্দ এড়িয়ে চলুন" : "Avoid common words");

      const bar = document.createElement("div");
      bar.style.height = "8px";
      bar.style.borderRadius = "4px";
      bar.style.transition = "all 0.3s";

      if (score <= 3) {
        bar.style.width = "30%";
        bar.style.background = "#f85149";
        strengthText.textContent = currentLang === "bn" ? "দুর্বল" : "Weak";
        strengthText.style.color = "#f85149";
      } else if (score <= 5) {
        bar.style.width = "60%";
        bar.style.background = "#f8b500";
        strengthText.textContent = currentLang === "bn" ? "মাঝারি" : "Medium";
        strengthText.style.color = "#f8b500";
      } else {
        bar.style.width = "100%";
        bar.style.background = "#3fb950";
        strengthText.textContent = currentLang === "bn" ? "শক্তিশালী" : "Strong";
        strengthText.style.color = "#3fb950";
      }

      strengthBar.appendChild(bar);

      if (feedback.length > 0) {
        suggestionText.innerHTML = (currentLang === "bn" ? "<strong>টিপস:</strong>" : "<strong>Tips:</strong>") + " " + feedback.slice(0, 3).join(" • ");
      } else {
        suggestionText.textContent = currentLang === "bn" ? "দারুণ! তোমার পাসওয়ার্ড শক্তিশালী।" : "Great! Your password is strong.";
      }
    });
  }

  /* Awareness Tips */
  if (window.location.pathname.includes("awareness")) {
    loadAwarenessTips();
  }

  /* OpenAI Chatbot */
  const sendBtn = document.getElementById("sendBtn");
  const userInput = document.getElementById("userInput");

  if (sendBtn && userInput && chatBox) {
    sendBtn.addEventListener("click", sendMessage);
    userInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") sendMessage();
    });
    userInput.focus();

    async function sendMessage() {
      const question = userInput.value.trim();
      if (!question) return;

      addMessage(question, "user");
      userInput.value = "";

      const thinkingMsg = addMessage(
        currentLang === "bn" ? "টাইপ করা হচ্ছে..." : "Typing...",
        "bot"
      );

      const response = await callOpenAI(question);
      thinkingMsg.innerHTML = response;
    }
  }
});