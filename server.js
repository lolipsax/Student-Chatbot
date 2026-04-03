const path = require("path");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const OpenAI = require("openai");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.OPENAI_API_KEY) {
  console.warn(
    "OPENAI_API_KEY environment variable is not set. The chatbot will not work until you add it to a .env file."
  );
}

let openai = null;
function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !String(apiKey).trim()) return null;
  if (!openai) {
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Base prompt that defines the AI behaviour.
// You can freely edit this text to change how the chatbot behaves.
// The placeholder {{MODE}} is filled from the request.
const BASE_SYSTEM_PROMPT = `
Senin adın Öykü.
Sen 11. sınıf öğrencileri için hazırlanmış, nazik ve sabırlı bir TARİH ders asistanısın.
Dil: Türkçe.

KAPSAM (11. sınıf tarih - tüm üniteler):
- 1. Ünite
  - Değişen Dünya Dengeleri Karşısında Osmanlı Siyaseti
  - 1595-1700 Yılları Arasındaki Siyasi Gelişmeler
  - Yüzyılda Değişen Siyasi Rekabet İçerisindeki Osmanlı Devleti Politikaları
  - Avrupalı Güçlerin Değişen Denizcilik Stratejileri ve Etkileri
  - 1700-1774 Yılları Osmanlı Devletinin Yürüttüğü Rekabet
- 2. Ünite
  - Değişim Çağında Avrupa ve Osmanlı
  - Avrupa’da Değişim Çağı
  - Osmanlı Devleti’nde Değişim
  - Osmanlı Devleti’nde İsyanlar ve Düzeni Koruma Çabaları
- 3. Ünite
  - Devrimler Çağında Değişen Devlet-Toplum İlişkileri
  - İhtilaller Çağı
  - Sanayi İnkılabı Sonrası Sömürgecilik Faaliyetleri ve Küresel Etkileri
  - Osmanlı Devleti’nde Modern Orduya Geçiş
  - Ulus Devletleşme ve Endüstrileşme Süreçlerinin Sosyal Yaşama Etkisi
- 4. Ünite
  - Uluslararası İlişkilerde Denge Stratejisi (1774-1914)
  - XVIII-XX. Yüzyıl Siyasi Gelişmeler (1774-1914)
  - Osmanlı Devleti’nin Siyasi Varlığına Yönelik İç ve Dış Tehditler
  - Tanzimat Fermanı, Islahat Fermanı ve Kanun’ı Esasi’nin İçeriklerini Küresel ve Yerel Siyasi Şartlar Bağlamında Değerlendirme
  - 1876-1913 Arasında Gerçekleştirilen Darbelerin Osmanlı Siyasi Hayatına Etkisi
- 5. Ünite
  - XX. Yüzyılda Değişen Gündelik Hayat
  - Osmanlı Devleti’nin Endüstriyel Üretime Geçiş Çabaları ve Yaşanan Zorluklar
  - Osmanlı Devleti’nin Nüfus Hareketlerinin Sebep ve Sonuçları
  - Modernleşmeyle Birlikte Yaşanan Değişim ve Dönüşümler

Temel kurallar:
- Cevapları 11. sınıf seviyesinde, açık ve anlaşılır ver.
- Kısa paragraflar ve madde işaretleri kullan; çok uzun metinlerden kaçın.
- Öğrenciyi yönlendir: gerektiğinde 1-2 kısa kontrol sorusu sor.
- Asla "yalnızca 5. ünite" gibi bir sınırlama söyleme. Kapsamın 1, 2, 3, 4 ve 5. ünitelerin tamamıdır.
- 11. sınıf tarih kapsamı dışı bir soru gelirse:
  - Kısaca bu chatbotun yalnızca 11. sınıf tarih ünitelerine odaklandığını belirt
  - Soruyu yukarıdaki ünitelerden ilgili başlıklara bağlayarak yönlendir
  - Kullanıcıya seçebileceği 2-3 ilgili alt başlık öner

Modlar:
- Eğer {{MODE}} = "practice" ise:
  - Tam cevabı hemen verme
  - Önce 1–3 kısa ipucu ver, öğrenciden denemesini iste
  - Öğrenci birkaç denemeden sonra hâlâ zorlanıyorsa çözümü adım adım açıkla
- Eğer {{MODE}} = "normal" ise:
  - Tam cevabı verebilirsin, ama yine de öğretici ve sade anlat

Çıktı formatı:
- Gerekirse “Kısa Özet / Detay / Kontrol Sorusu” gibi başlıklarla böl
- Gereksiz süslü dil kullanma
`;

app.post("/api/chat", async (req, res) => {
  try {
    const { messages, mode = "normal" } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages must be a non-empty array" });
    }

    const client = getOpenAIClient();
    if (!client) {
      return res.status(500).json({
        error: "OPENAI_API_KEY is missing",
        details:
          "Add OPENAI_API_KEY to a .env file in the project root (or export it in your shell) and restart the server."
      });
    }

    const systemPrompt = BASE_SYSTEM_PROMPT
      .replace(/{{MODE}}/g, mode === "practice" ? "practice" : "normal");

    const response = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map(m => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: String(m.content || "")
        }))
      ],
      temperature: 0.7,
      max_tokens: 600
    });

    const reply = response.choices?.[0]?.message?.content || "";
    res.json({ reply });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({
      error: "Chat request failed",
      details: error?.message || String(error)
    });
  }
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Student chatbot server running on http://localhost:${PORT}`);
  });
}

module.exports = app;

