const chatWindow = document.getElementById("chatWindow");
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const sendButton = document.getElementById("sendButton");
const modeButton = document.getElementById("modeButton");

let conversation = [];
let mode = "normal";

function renderModeButton() {
  const isPractice = mode === "practice";
  modeButton.textContent = isPractice ? "Mod: Alıştırma" : "Mod: Normal";
  modeButton.setAttribute("aria-pressed", isPractice ? "true" : "false");
}

modeButton.addEventListener("click", () => {
  mode = mode === "normal" ? "practice" : "normal";
  renderModeButton();
});

renderModeButton();

function appendMessage(role, content) {
  const wrapper = document.createElement("div");
  wrapper.className = `message message--${role === "user" ? "user" : "assistant"}`;

  const meta = document.createElement("div");
  meta.className = "message-meta";
  meta.textContent = role === "user" ? "Sen" : "Öykü";

  const bubble = document.createElement("div");
  bubble.className = "message-bubble";
  bubble.textContent = content;

  wrapper.appendChild(meta);
  wrapper.appendChild(bubble);
  chatWindow.appendChild(wrapper);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

async function sendMessage(text) {
  if (!text.trim()) return;

  appendMessage("user", text);
  conversation.push({ role: "user", content: text });

  sendButton.disabled = true;
  sendButton.textContent = "Düşünüyor...";

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: conversation,
        mode
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const msg =
        errorData?.error ||
        `İstek başarısız (HTTP ${response.status}). Sunucu loglarını kontrol et.`;
      appendMessage("assistant", msg);
      return;
    }

    const data = await response.json();
    const reply = data.reply || "(Empty reply)";

    conversation.push({ role: "assistant", content: reply });
    appendMessage("assistant", reply);
  } catch (err) {
    console.error(err);
    appendMessage(
      "assistant",
      "Sunucuya bağlanırken ağ hatası oldu. Node sunucusunun çalıştığından emin ol."
    );
  } finally {
    sendButton.disabled = false;
    sendButton.textContent = "Gönder";
  }
}

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = userInput.value;
  userInput.value = "";
  sendMessage(text);
});

userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    chatForm.dispatchEvent(new Event("submit"));
  }
});

