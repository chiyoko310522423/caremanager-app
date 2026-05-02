import { useState, useRef } from "react";

const STORAGE_KEY = "cm_v4";

const KADAI_ITEMS = [
  { id: "k1", domain: "ADL", label: "食事" },
  { id: "k2", domain: "ADL", label: "排泄" },
  { id: "k3", domain: "ADL", label: "入浴" },
  { id: "k4", domain: "ADL", label: "整容" },
  { id: "k5", domain: "ADL", label: "更衣" },
  { id: "k6", domain: "ADL", label: "移乗・移動" },
  { id: "k7", domain: "ADL", label: "コミュニケーション" },
  { id: "k8", domain: "IADL", label: "調理" },
  { id: "k9", domain: "IADL", label: "洗濯・掃除" },
  { id: "k10", domain: "IADL", label: "買い物" },
  { id: "k11", domain: "IADL", label: "服薬管理" },
  { id: "k12", domain: "IADL", label: "金銭管理" },
  { id: "k13", domain: "健康", label: "疾患・病状管理" },
  { id: "k14", domain: "健康", label: "リハビリ" },
  { id: "k15", domain: "精神", label: "認知機能" },
  { id: "k16", domain: "精神", label: "行動・心理症状" },
  { id: "k17", domain: "社会", label: "社会参加" },
  { id: "k18", domain: "環境", label: "住んでいる環境" },
  { id: "k19", domain: "環境", label: "家族・介護力" },
];

const DOMAIN_COLORS = {
  日常生活動作: "#1565c0",
  IADL: "#2e7d32",
  健康: "#c62828",
  精神: "#6a1b9a",
  社会: "#e65100",
  環境: "#37474f",
  ADL: "#1565c0",
};

const HENKA_TYPES = [
  { id: "入院", label: "入院", icon: "🏥", color: "#c62828" },
  { id: "退院", label: "退院", icon: "🏠", color: "#2e7d32" },
  { id: "受診", label: "受診", icon: "🩺", color: "#1565c0" },
  { id: "訪問", label: "訪問", icon: "🚗", color: "#6a1b9a" },
  { id: "状態変化", label: "状態変化", icon: "📋", color: "#e65100" },
  { id: "サービス変更", label: "サービス変更", icon: "🔄", color: "#37474f" },
  { id: "その他", label: "その他", icon: "📝", color: "#757575" },
];

const NYURYOKU_MODES = [
  { id: "写真", icon: "📷", label: "写真・画像", sub: "カメラで撮影またはギャラリーから（複数枚OK）" },
  { id: "文章", icon: "🎙", label: "音声・テキスト", sub: "マイクで話すまたはテキスト貼り付け" },
  { id: "両方", icon: "🤖", label: "写真＋音声・テキスト", sub: "両方合わせると精度UP（おすすめ）" },
];

const BUNSHO_TYPES = [
  { id: "保険証", icon: "🪪", label: "介護保険証", color: "#1976d2" },
  { id: "薬", icon: "💊", label: "お薬手帳・処方箋", color: "#c62828" },
  { id: "まとめ", icon: "📋", label: "病院サマリー", color: "#2e7d32" },
  { id: "assessment_doc", icon: "📝", label: "認定調査票", color: "#6a1b9a" },
  { id: "引き渡す", icon: "🔄", label: "前事業所引き継ぎ", color: "#e65100" },
  { id: "other_doc", icon: "📁", label: "その他書類", color: "#37474f" },
];

function load() {
  try {
    const d = localStorage.getItem(STORAGE_KEY);
    return d ? JSON.parse(d) : {};
  } catch { return {}; }
}

function save(u) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(u)); } catch {}
}

function buildCarePlanPrompt(user) {
  const r = user.evaluation?.[0];
  return `あなたは居宅介護支援の専門家AIです。以下の利用者情報からケアプラン第2表（居宅サービス計画書）の下書きを作成日：${new Date().toLocaleDateString("ja-JP")}

【利用者情報】
氏名：${user.name || "未入力"}
要介護度：${user.kaigo_do || "未入力"}
主な疾患：${user.shikkan || "未入力"}
生活状況：${user.seikatsu || "未入力"}
本人の意向：${user.iko || "未入力"}
家族の意向：${user.kazoku_iko || "未入力"}
課題：${user.kadai?.join("、") || "未選択"}

【評価情報】
${r ? `評価日：${r.date}\n改善点：${r.improvements}\n自立支援の取り組み：${r.selfActions}\n次の目標：${r.nextGoal}` : "評価情報なし"}

以下の形式でケアプラン第2表を作成してください：

1. 生活全般の解決すべき課題（ニーズ）
2. 長期目標（6ヶ月〜1年）
3. 短期目標（3ヶ月）
4. サービス内容
5. サービス種別
6. 頻度・期間

北九州市の居宅介護支援の実態に即した、実用的な内容でお願いします。`;
}

function safeJsonParse(raw) {
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("JSONが見つかりません");
  return JSON.parse(m[0]);
}

function formatCarePlanText(plan) {
  return `居宅サービス計画書（第2表）\n作成日：${new Date().toLocaleDateString("ja-JP")}\n\n` +
    Object.entries(plan).map(([k, v]) => `【${k}】\n${v}`).join("\n\n");
}

const C = {
  page: { minHeight: "100vh", background: "#eef2f7", fontFamily: "'Hiragino Kaku Gothic ProN', 'Meiryo', sans-serif" },
  header: { background: "linear-gradient(135deg, #1565c0 0%, #2e7d32 100%)", color: "white", padding: "16px 20px", display: "flex", alignItems: "center", gap: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" },
  headerTitle: { fontSize: "18px", fontWeight: "bold", margin: 0 },
  headerSub: { fontSize: "12px", opacity: 0.85, margin: 0 },
  nav: { background: "white", display: "flex", borderBottom: "1px solid #e0e0e0", overflowX: "auto" },
  navBtn: (active) => ({ padding: "12px 16px", border: "none", background: "none", cursor: "pointer", fontSize: "13px", fontWeight: active ? "bold" : "normal", color: active ? "#1565c0" : "#666", borderBottom: active ? "3px solid #1565c0" : "3px solid transparent", whiteSpace: "nowrap" }),
  main: { padding: "16px", maxWidth: "800px", margin: "0 auto" },
  card: { background: "white", borderRadius: "12px", padding: "16px", marginBottom: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" },
  cardTitle: { fontSize: "16px", fontWeight: "bold", color: "#1a1a1a", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" },
  label: { fontSize: "13px", color: "#555", marginBottom: "4px", display: "block" },
  input: { width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box", marginBottom: "12px" },
  textarea: { width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box", marginBottom: "12px", minHeight: "80px", resize: "vertical" },
  btn: (color = "#1565c0") => ({ background: color, color: "white", border: "none", borderRadius: "8px", padding: "10px 16px", fontSize: "14px", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }),
  btnOutline: { background: "white", color: "#1565c0", border: "2px solid #1565c0", borderRadius: "8px", padding: "10px 16px", fontSize: "14px", fontWeight: "bold", cursor: "pointer" },
  badge: (color) => ({ background: color + "22", color: color, borderRadius: "4px", padding: "2px 8px", fontSize: "12px", fontWeight: "bold" }),
  chip: (color = "#1565c0") => ({ background: color + "18", color: color, borderRadius: "20px", padding: "4px 10px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px", margin: "2px" }),
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" },
  aiBox: { background: "#f0f7ff", border: "1px solid #bbdefb", borderRadius: "8px", padding: "12px", marginTop: "8px", whiteSpace: "pre-wrap", fontSize: "13px", lineHeight: "1.7" },
  successMsg: { color: "#2e7d32", background: "#e8f5e9", borderRadius: "6px", padding: "8px 12px", fontSize: "13px", marginTop: "8px" },
};

function StatusBadge({ status }) {
  const m = { 全介助: ["#ffebee", "#c62828"], 一部補助: ["#fff3e0", "#e65100"], 見守り: ["#fffde7", "#f9a825"], 自立: ["#e8f5e9", "#2e7d32"] };
  const [bg, col] = m[status] || ["#f5f5f5", "#757575"];
  return <span style={{ background: bg, color: col, borderRadius: "4px", padding: "2px 6px", fontSize: "11px", fontWeight: "bold" }}>{status}</span>;
}

function Empty({ icon, message }) {
  return <div style={{ textAlign: "center", padding: "48px 20px", color: "#999" }}>
    <div style={{ fontSize: "48px", marginBottom: "12px" }}>{icon}</div>
    <p style={{ fontSize: "14px" }}>{message}</p>
  </div>;
}

function Chip({ label, color = "#1565c0" }) {
  return <span style={C.chip(color)}>{label}</span>;
}

function HyokaTab({ user, onSave }) {
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), period: "", improvements: "", selfActions: "", nextGoal: "" });
  const [saved, setSaved] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [carePlan, setCarePlan] = useState("");
  const [carePlanError, setCarePlanError] = useState("");

  const handleSave = () => {
    const evals = [form, ...(user.evaluation || [])].slice(0, 10);
    onSave({ ...user, evaluation: evals });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const generateCarePlan = async () => {
    setGenerating(true);
    setCarePlan("");
    setCarePlanError("");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: buildCarePlanPrompt({ ...user, evaluation: [form] }) }]
        })
      });
      const data = await res.json();
      const text = data.content?.map(i => i.text || "").join("") || "";
      setCarePlan(text);
    } catch (e) {
      setCarePlanError("生成中にエラーが発生しました: " + e.message);
    }
    setGenerating(false);
  };

  return (
    <div>
      <div style={C.card}>
        <div style={C.cardTitle}>📊 自立支援評価</div>
        <label style={C.label}>評価日</label>
        <input type="date" style={C.input} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
        <label style={C.label}>評価期間</label>
        <input style={C.input} placeholder="例：令和6年4月〜6月" value={form.period} onChange={e => setForm({ ...form, period: e.target.value })} />
        <label style={C.label}>改善・維持できた点</label>
        <textarea style={C.textarea} placeholder="例：入浴回数が週2回から週3回に増加" value={form.improvements} onChange={e => setForm({ ...form, improvements: e.target.value })} />
        <label style={C.label}>本人の自立支援の取り組み</label>
        <textarea style={C.textarea} placeholder="例：毎朝のラジオ体操を継続できている" value={form.selfActions} onChange={e => setForm({ ...form, selfActions: e.target.value })} />
        <label style={C.label}>次の目標・課題</label>
        <textarea style={C.textarea} placeholder="例：外出機会を増やし社会参加を促進する" value={form.nextGoal} onChange={e => setForm({ ...form, nextGoal: e.target.value })} />
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button style={C.btn()} onClick={handleSave}>💾 評価を保存する</button>
          <button style={C.btn("#2e7d32")} onClick={generateCarePlan} disabled={generating}>
            {generating ? "⏳ 生成中..." : "🤖 ケアプラン第2表を自動生成"}
          </button>
        </div>
        {saved && <div style={C.successMsg}>✅ 保存しました！</div>}
      </div>

      {(carePlan || carePlanError) && (
        <div style={C.card}>
          <div style={C.cardTitle}>📄 ケアプラン第2表（下書き）</div>
          {carePlanError && <div style={{ color: "#c62828", fontSize: "13px" }}>{carePlanError}</div>}
          {carePlan && (
            <>
              <div style={C.aiBox}>{carePlan}</div>
              <button style={{ ...C.btn("#37474f"), marginTop: "8px" }} onClick={() => {
                const blob = new Blob([carePlan], { type: "text/plain;charset=utf-8" });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = `ケアプラン_${user.name || "利用者"}_${form.date}.txt`;
                a.click();
              }}>💾 テキストで保存</button>
            </>
          )}
        </div>
      )}

      {user.evaluation?.length > 0 && (
        <div style={C.card}>
          <div style={C.cardTitle}>📈 過去の評価履歴</div>
          {user.evaluation.map((e, i) => (
            <div key={i} style={{ borderBottom: "1px solid #eee", paddingBottom: "12px", marginBottom: "12px" }}>
              <div style={{ fontWeight: "bold", fontSize: "14px", marginBottom: "6px" }}>📅 {e.date} {e.period && `（${e.period}）`}</div>
              {e.improvements && <div style={{ fontSize: "13px", color: "#555", marginBottom: "4px" }}>✨ {e.improvements}</div>}
              {e.selfActions && <div style={{ fontSize: "13px", color: "#555", marginBottom: "4px" }}>💪 {e.selfActions}</div>}
              {e.nextGoal && <div style={{ fontSize: "13px", color: "#1565c0" }}>🎯 {e.nextGoal}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AssessmentTab({ user, onSave }) {
  const [mode, setMode] = useState(null);
  const [images, setImages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef();

  const handleImages = (e) => {
    const files = Array.from(e.target.files || []);
    Promise.all(files.map(f => new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res({ name: f.name, data: r.result.split(",")[1], type: f.type });
      r.onerror = rej;
      r.readAsDataURL(f);
    }))).then(setImages);
  };

  const analyze = async () => {
    if (!mode) { setError("入力モードを選択してください"); return; }
    if (mode !== "文章" && images.length === 0) { setError("画像を選択してください"); return; }
    if (mode !== "写真" && !text.trim()) { setError("テキストを入力してください"); return; }
    setLoading(true); setError(""); setResult("");
    try {
      const content = [];
      if (images.length > 0) {
        images.forEach(img => content.push({ type: "image", source: { type: "base64", media_type: img.type, data: img.data } }));
      }
      const prompt = `あなたは介護支援専門員（ケアマネージャー）のアシスタントAIです。
以下の情報から利用者のアセスメント情報を抽出・整理してください。

${text ? `【テキスト情報】\n${text}\n` : ""}
${images.length > 0 ? "【画像情報】添付の画像（書類・写真等）から情報を読み取ってください。\n" : ""}

以下の形式でJSON形式で出力してください：
{
  "name": "氏名",
  "age": "年齢",
  "kaigo_do": "要介護度",
  "shikkan": "主な疾患・既往歴",
  "seikatsu": "現在の生活状況",
  "iko": "本人の意向・希望",
  "kazoku_iko": "家族の意向",
  "adl": {
    "食事": "自立/見守り/一部補助/全介助",
    "排泄": "自立/見守り/一部補助/全介助",
    "入浴": "自立/見守り/一部補助/全介助",
    "移動": "自立/見守り/一部補助/全介助"
  },
  "kadai": ["課題1", "課題2"],
  "notes": "その他特記事項"
}
情報がない項目は空文字にしてください。`;
      content.push({ type: "text", text: prompt });
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, messages: [{ role: "user", content }] })
      });
      const data = await res.json();
      const raw = data.content?.map(i => i.text || "").join("") || "";
      setResult(raw);
      try {
        const parsed = safeJsonParse(raw);
        onSave({ ...user, ...parsed });
      } catch {}
    } catch (e) {
      setError("エラー: " + e.message);
    }
    setLoading(false);
  };

  return (
    <div>
      <div style={C.card}>
        <div style={C.cardTitle}>📋 アセスメント自動転記</div>
        <p style={{ fontSize: "13px", color: "#666", marginBottom: "12px" }}>書類の写真やテキストからアセスメント情報を自動で抽出します</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "16px" }}>
          {NYURYOKU_MODES.map(m => (
            <button key={m.id} onClick={() => setMode(m.id)} style={{ border: mode === m.id ? "2px solid #1565c0" : "1px solid #ddd", borderRadius: "8px", padding: "10px 8px", background: mode === m.id ? "#e3f2fd" : "white", cursor: "pointer", textAlign: "center" }}>
              <div style={{ fontSize: "24px" }}>{m.icon}</div>
              <div style={{ fontSize: "12px", fontWeight: "bold", color: mode === m.id ? "#1565c0" : "#333", marginTop: "4px" }}>{m.label}</div>
              <div style={{ fontSize: "10px", color: "#888", marginTop: "2px" }}>{m.sub}</div>
            </button>
          ))}
        </div>
        {mode && (mode === "写真" || mode === "両方") && (
          <>
            <label style={C.label}>📷 書類の写真・画像を選択（複数可）</label>
            <input type="file" accept="image/*" multiple ref={fileRef} onChange={handleImages} style={{ marginBottom: "12px" }} />
            {images.length > 0 && <div style={{ fontSize: "13px", color: "#2e7d32", marginBottom: "8px" }}>✅ {images.length}枚の画像を選択済み</div>}
          </>
        )}
        {mode && (mode === "文章" || mode === "両方") && (
          <>
            <label style={C.label}>📝 テキストを貼り付け or 入力</label>
            <textarea style={C.textarea} placeholder="アセスメント内容、申し送り事項などを入力またはコピペしてください" value={text} onChange={e => setText(e.target.value)} rows={6} />
          </>
        )}
        {error && <div style={{ color: "#c62828", fontSize: "13px", marginBottom: "8px" }}>{error}</div>}
        <button style={C.btn()} onClick={analyze} disabled={loading || !mode}>
          {loading ? "⏳ 解析中..." : "🤖 AIで自動解析・転記"}
        </button>
      </div>
      {result && (
        <div style={C.card}>
          <div style={C.cardTitle}>✅ 解析結果</div>
          <div style={C.aiBox}>{result}</div>
          <div style={{ ...C.successMsg, marginTop: "8px" }}>利用者情報に自動反映されました</div>
        </div>
      )}
    </div>
  );
}

function TimelineTab({ user, onSave }) {
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), type: "", memo: "", voice: "" });
  const [saved, setSaved] = useState(false);
  const [listening, setListening] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState("");

  const startVoice = () => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert("このブラウザは音声入力に対応していません");
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = "ja-JP";
    rec.continuous = false;
    rec.interimResults = false;
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onresult = (e) => {
      const t = e.results[0][0].transcript;
      setForm(f => ({ ...f, memo: f.memo + (f.memo ? "\n" : "") + t }));
    };
    rec.onerror = () => setListening(false);
    rec.start();
  };

  const aiFormat = async () => {
    if (!form.memo) return;
    setAiLoading(true); setAiResult("");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: `以下の介護記録のメモを、介護支援専門員の記録として適切な形式に整形してください。5W1Hを意識し、簡潔で専門的な文章にしてください。

メモ：${form.memo}

整形した記録文を出力してください（説明不要）：` }]
        })
      });
      const data = await res.json();
      setAiResult(data.content?.map(i => i.text || "").join("") || "");
    } catch (e) {
      setAiResult("エラー: " + e.message);
    }
    setAiLoading(false);
  };

  const handleSave = () => {
    const entry = { ...form, memo: aiResult || form.memo, createdAt: new Date().toISOString() };
    const timeline = [entry, ...(user.timeline || [])].slice(0, 100);
    onSave({ ...user, timeline });
    setForm({ date: new Date().toISOString().slice(0, 10), type: "", memo: "", voice: "" });
    setAiResult("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <div style={C.card}>
        <div style={C.cardTitle}>🎙 タイムライン記録</div>
        <div style={C.grid2}>
          <div>
            <label style={C.label}>日付</label>
            <input type="date" style={C.input} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
          </div>
          <div>
            <label style={C.label}>種別</label>
            <select style={C.input} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
              <option value="">選択</option>
              {HENKA_TYPES.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
            </select>
          </div>
        </div>
        <label style={C.label}>記録内容</label>
        <textarea style={C.textarea} placeholder="記録内容を入力（音声入力も可）" value={form.memo} onChange={e => setForm({ ...form, memo: e.target.value })} rows={4} />
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
          <button style={C.btn(listening ? "#c62828" : "#6a1b9a")} onClick={startVoice}>
            {listening ? "🔴 録音中..." : "🎙 音声入力"}
          </button>
          <button style={C.btn("#e65100")} onClick={aiFormat} disabled={aiLoading || !form.memo}>
            {aiLoading ? "⏳ 整形中..." : "✨ AIで整形"}
          </button>
        </div>
        {aiResult && (
          <div style={{ marginBottom: "12px" }}>
            <label style={C.label}>✅ AI整形後（編集可）</label>
            <textarea style={C.textarea} value={aiResult} onChange={e => setAiResult(e.target.value)} rows={4} />
          </div>
        )}
        <button style={C.btn()} onClick={handleSave} disabled={!form.type || !form.memo}>💾 記録を保存</button>
        {saved && <div style={C.successMsg}>✅ 保存しました！</div>}
      </div>

      {user.timeline?.length > 0 ? (
        <div style={C.card}>
          <div style={C.cardTitle}>📅 記録一覧</div>
          {user.timeline.map((t, i) => {
            const ht = HENKA_TYPES.find(h => h.id === t.type);
            return (
              <div key={i} style={{ display: "flex", gap: "12px", paddingBottom: "12px", marginBottom: "12px", borderBottom: "1px solid #f0f0f0" }}>
                <div style={{ fontSize: "24px" }}>{ht?.icon || "📝"}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "4px" }}>
                    <span style={{ fontSize: "13px", fontWeight: "bold" }}>{t.date}</span>
                    {ht && <span style={C.badge(ht.color)}>{ht.label}</span>}
                  </div>
                  <div style={{ fontSize: "13px", color: "#444", lineHeight: "1.6" }}>{t.memo}</div>
                </div>
              </div>
            );
          })}
        </div>
      ) : <Empty icon="📋" message="まだ記録がありません" />}
    </div>
  );
}

function KadaiTab({ user, onSave }) {
  const [selected, setSelected] = useState(user.kadai || []);
  const [generating, setGenerating] = useState(false);
  const [sogo, setSogo] = useState(user.sogo || "");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const toggle = (label) => {
    setSelected(s => s.includes(label) ? s.filter(x => x !== label) : [...s, label]);
  };

  const generateSogo = async () => {
    if (selected.length === 0) { setError("課題を1つ以上選択してください"); return; }
    setGenerating(true); setError(""); setSogo("");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: `介護支援専門員として、以下の課題を持つ利用者の「課題整理総括表」の総合的な課題を作成してください。

利用者名：${user.name || "利用者"}
要介護度：${user.kaigo_do || "不明"}
選択された課題：${selected.join("、")}
生活状況：${user.seikatsu || "未入力"}
本人の意向：${user.iko || "未入力"}

以下の形式で出力してください：
1. 生活課題の全体像（200字程度）
2. 優先的に取り組む課題とその理由
3. 自立支援の視点からの方向性

北九州市の居宅介護支援の実態に即した内容でお願いします。` }]
        })
      });
      const data = await res.json();
      const text = data.content?.map(i => i.text || "").join("") || "";
      setSogo(text);
      onSave({ ...user, kadai: selected, sogo: text });
    } catch (e) {
      setError("エラー: " + e.message);
    }
    setGenerating(false);
  };

  const handleSave = () => {
    onSave({ ...user, kadai: selected, sogo });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const domains = [...new Set(KADAI_ITEMS.map(k => k.domain))];

  return (
    <div>
      <div style={C.card}>
        <div style={C.cardTitle}>📊 課題整理総括表</div>
        <p style={{ fontSize: "13px", color: "#666", marginBottom: "12px" }}>該当する課題にチェックを入れてください</p>
        {domains.map(domain => (
          <div key={domain} style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "13px", fontWeight: "bold", color: DOMAIN_COLORS[domain] || "#333", marginBottom: "8px", padding: "4px 8px", background: (DOMAIN_COLORS[domain] || "#333") + "18", borderRadius: "4px", display: "inline-block" }}>
              {domain}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {KADAI_ITEMS.filter(k => k.domain === domain).map(k => (
                <button key={k.id} onClick={() => toggle(k.label)} style={{ border: selected.includes(k.label) ? `2px solid ${DOMAIN_COLORS[domain] || "#1565c0"}` : "1px solid #ddd", borderRadius: "20px", padding: "6px 12px", background: selected.includes(k.label) ? (DOMAIN_COLORS[domain] || "#1565c0") + "18" : "white", color: selected.includes(k.label) ? DOMAIN_COLORS[domain] || "#1565c0" : "#555", cursor: "pointer", fontSize: "13px", fontWeight: selected.includes(k.label) ? "bold" : "normal" }}>
                  {selected.includes(k.label) ? "✓ " : ""}{k.label}
                </button>
              ))}
            </div>
          </div>
        ))}
        {selected.length > 0 && (
          <div style={{ marginBottom: "12px" }}>
            <div style={C.label}>選択中の課題：</div>
            <div>{selected.map(s => <Chip key={s} label={s} color="#1565c0" />)}</div>
          </div>
        )}
        {error && <div style={{ color: "#c62828", fontSize: "13px", marginBottom: "8px" }}>{error}</div>}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button style={C.btn("#2e7d32")} onClick={generateSogo} disabled={generating}>
            {generating ? "⏳ 生成中..." : "🤖 AIで総合課題を生成"}
          </button>
          <button style={C.btn()} onClick={handleSave}>💾 保存</button>
        </div>
        {saved && <div style={C.successMsg}>✅ 保存しました！</div>}
      </div>
      {sogo && (
        <div style={C.card}>
          <div style={C.cardTitle}>📄 総合的な課題</div>
          <div style={C.aiBox}>{sogo}</div>
          <textarea style={{ ...C.textarea, marginTop: "8px" }} value={sogo} onChange={e => setSogo(e.target.value)} rows={8} />
          <button style={{ ...C.btn("#37474f"), marginTop: "4px" }} onClick={() => {
            const blob = new Blob([`課題整理総括表\n\n選択課題：${selected.join("、")}\n\n${sogo}`], { type: "text/plain;charset=utf-8" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = `課題整理_${user.name || "利用者"}.txt`;
            a.click();
          }}>💾 テキストで保存</button>
        </div>
      )}
    </div>
  );
}

function UserInfoTab({ user, onSave }) {
  const [form, setForm] = useState({
    name: user.name || "", age: user.age || "", kaigo_do: user.kaigo_do || "",
    shikkan: user.shikkan || "", seikatsu: user.seikatsu || "",
    iko: user.iko || "", kazoku_iko: user.kazoku_iko || "", notes: user.notes || ""
  });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSave({ ...user, ...form });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={C.card}>
      <div style={C.cardTitle}>👤 利用者基本情報</div>
      <div style={C.grid2}>
        <div>
          <label style={C.label}>氏名</label>
          <input style={C.input} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="山田 花子" />
        </div>
        <div>
          <label style={C.label}>年齢</label>
          <input style={C.input} value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} placeholder="75歳" />
        </div>
      </div>
      <label style={C.label}>要介護度</label>
      <select style={C.input} value={form.kaigo_do} onChange={e => setForm({ ...form, kaigo_do: e.target.value })}>
        <option value="">選択</option>
        {["要支援1", "要支援2", "要介護1", "要介護2", "要介護3", "要介護4", "要介護5"].map(d => <option key={d} value={d}>{d}</option>)}
      </select>
      <label style={C.label}>主な疾患・既往歴</label>
      <input style={C.input} value={form.shikkan} onChange={e => setForm({ ...form, shikkan: e.target.value })} placeholder="例：脳梗塞後遺症、高血圧、糖尿病" />
      <label style={C.label}>現在の生活状況</label>
      <textarea style={C.textarea} value={form.seikatsu} onChange={e => setForm({ ...form, seikatsu: e.target.value })} placeholder="独居、家族構成、住環境など" />
      <label style={C.label}>本人の意向・希望</label>
      <textarea style={C.textarea} value={form.iko} onChange={e => setForm({ ...form, iko: e.target.value })} placeholder="例：自宅で生活を続けたい" />
      <label style={C.label}>家族の意向</label>
      <textarea style={C.textarea} value={form.kazoku_iko} onChange={e => setForm({ ...form, kazoku_iko: e.target.value })} placeholder="例：安全に生活できるよう支援してほしい" />
      <label style={C.label}>特記事項</label>
      <textarea style={C.textarea} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="その他気になること等" />
      <button style={C.btn()} onClick={handleSave}>💾 保存する</button>
      {saved && <div style={C.successMsg}>✅ 保存しました！</div>}
    </div>
  );
}

const TABS = [
  { id: "user", label: "👤 基本情報" },
  { id: "assessment", label: "📋 アセスメント" },
  { id: "timeline", label: "🎙 タイムライン" },
  { id: "kadai", label: "📊 課題整理" },
  { id: "hyoka", label: "📈 評価・プラン" },
];

export default function App() {
  const [data, setData] = useState(() => load());
  const [tab, setTab] = useState("user");
  const [userKey, setUserKey] = useState(() => Object.keys(load())[0] || "");
  const [newName, setNewName] = useState("");
  const [showNewUser, setShowNewUser] = useState(false);

  const users = Object.values(data);
  const user = data[userKey] || {};

  const saveUser = (u) => {
    const key = u.id || Date.now().toString();
    const updated = { ...data, [key]: { ...u, id: key } };
    setData(updated);
    save(updated);
    if (!userKey) setUserKey(key);
  };

  const addUser = () => {
    if (!newName.trim()) return;
    const key = Date.now().toString();
    const u = { id: key, name: newName.trim() };
    const updated = { ...data, [key]: u };
    setData(updated);
    save(updated);
    setUserKey(key);
    setNewName("");
    setShowNewUser(false);
    setTab("user");
  };

  return (
    <div style={C.page}>
      <div style={C.header}>
        <div>
          <h1 style={C.headerTitle}>🏥 ケアマネージャーアプリ</h1>
          <p style={C.headerSub}>北九州市 居宅介護支援 業務効率化システム</p>
        </div>
      </div>

      <div style={{ background: "white", padding: "12px 16px", borderBottom: "1px solid #e0e0e0" }}>
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          <select style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "14px", flex: 1, maxWidth: "300px" }} value={userKey} onChange={e => setUserKey(e.target.value)}>
            <option value="">利用者を選択</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name || "名前未入力"} {u.kaigo_do ? `（${u.kaigo_do}）` : ""}</option>)}
          </select>
          <button style={C.btn("#2e7d32")} onClick={() => setShowNewUser(!showNewUser)}>＋ 新規登録</button>
        </div>
        {showNewUser && (
          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <input style={{ ...C.input, marginBottom: 0, flex: 1 }} placeholder="利用者名を入力" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === "Enter" && addUser()} />
            <button style={C.btn()} onClick={addUser}>登録</button>
          </div>
        )}
      </div>

      {!userKey ? (
        <div style={{ ...C.main }}>
          <Empty icon="👥" message="利用者を選択するか、新規登録してください" />
        </div>
      ) : (
        <>
          <div style={C.nav}>
            {TABS.map(t => <button key={t.id} style={C.navBtn(tab === t.id)} onClick={() => setTab(t.id)}>{t.label}</button>)}
          </div>
          <div style={C.main}>
            {tab === "user" && <UserInfoTab user={user} onSave={saveUser} />}
            {tab === "assessment" && <AssessmentTab user={user} onSave={saveUser} />}
            {tab === "timeline" && <TimelineTab user={user} onSave={saveUser} />}
            {tab === "kadai" && <KadaiTab user={user} onSave={saveUser} />}
            {tab === "hyoka" && <HyokaTab user={user} onSave={saveUser} />}
          </div>
        </>
      )}
    </div>
  );
}
