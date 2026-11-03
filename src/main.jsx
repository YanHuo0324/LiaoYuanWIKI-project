import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import { ArrowUpRight, BookOpen, ChevronLeft, Lock, LogOut, Plus, Search, X } from "lucide-react";
import "./style.css";

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = url && anon ? createClient(url, anon) : null;

function Intro({ onFinish }) {
  const [progress, setProgress] = useState(0);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let frame;
    let startTime;

    const duration = 2800;

    function animate(timestamp) {
      if (!startTime) startTime = timestamp;

      const elapsed = timestamp - startTime;
      const value = Math.min(100, Math.round((elapsed / duration) * 100));

      setProgress(value);

      if (value < 100) {
        frame = requestAnimationFrame(animate);
      } else {
        setTimeout(() => setLeaving(true), 350);
        setTimeout(onFinish, 850);
      }
    }

    frame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frame);
  }, [onFinish]);

  return (
    <div className={`intro-overlay ${leaving ? "intro-leaving" : ""}`}>
      <div className="intro-content">
        <p className="intro-eyebrow">WELCOME TO</p>
<img
  className="intro-logo"
  src="/logo.png"
  alt="燎原维基百科 Logo"
/>
        <h1>燎原维基百科</h1>

        <p className="intro-subtitle">2026 · 新的征程，新的起点</p>

        <div className="intro-progress">
          <div
            className="intro-progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="intro-progress-info">
          <span>LOADING</span>
          <span>{progress}%</span>
        </div>
      </div>
    </div>
  );
}
const sections = [
  {
    mode: "members",
    name: "成员变更",
    number: "01",
    description: "成员加入、退出与变动记录"
  },
  {
    mode: "submissions",
    name: "废物投稿",
    number: "02",
    description: "投稿内容与文章收录"
  },
  {
    mode: "events",
    name: "事件记录",
    number: "03",
    description: "重要事件与历史记录"
  }
];
function App() {
  const [posts, setPosts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [category, setCategory] = useState("全部");
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState(
  window.location.pathname === "/admin" ? "login" : "home"
);
  const [session, setSession] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [draft, setDraft] = useState({
  title: "",
  excerpt: "",
  content: "",
  category: "成员变更",
  cover_url: ""
});
  const [editingId, setEditingId] = useState(null);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadPosts() {
    if (!supabase) return;
    const { data, error } = await supabase.from("posts").select("*").eq("published", true).order("created_at", { ascending: false });
    if (error) setNotice(error.message); else setPosts(data || []);
  }
  async function checkAdmin(user) {
    if (!user || !supabase) { setIsAdmin(false); return; }
    const { data } = await supabase.from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle();
    setIsAdmin(!!data);
  }
  useEffect(() => {
    loadPosts();
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); checkAdmin(data.session?.user); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s); checkAdmin(s?.user);
    });
    return () => listener.subscription.unsubscribe();
  }, []);
  useEffect(() => {
  if (isAdmin && mode === "login") {
    setMode("manage");
  }
}, [isAdmin, mode]);

  const categories = useMemo(() => ["全部", ...new Set(posts.map(p => p.category).filter(Boolean))], [posts]);
  const filtered = posts.filter(p => (category === "全部" || p.category === category) &&
    `${p.title} ${p.excerpt} ${p.content}`.toLowerCase().includes(search.toLowerCase()));
  const activeSection = sections.find(section => section.mode === mode);

  const sectionPosts = activeSection
  ? posts.filter(post => post.category === activeSection.name)
  : [];  

  async function login(e) {
    e.preventDefault(); setLoading(true); setNotice("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false); setNotice(error ? error.message : "成功登录");
  }
  async function logout() { await supabase.auth.signOut(); setMode("home"); }
  function editPost(post) {
    setDraft({ title: post.title, excerpt: post.excerpt || "", content: post.content || "", category: post.category || "成员变更", cover_url: post.cover_url || "" });
    setEditingId(post.id); setMode("editor");
  }
  async function savePost(e) {
    e.preventDefault(); setLoading(true); setNotice("");
    const payload = { ...draft, published: true, updated_at: new Date().toISOString() };
    const result = editingId
      ? await supabase.from("posts").update(payload).eq("id", editingId)
      : await supabase.from("posts").insert(payload);
    setLoading(false);
    if (result.error) { setNotice(result.error.message); return; }
    setNotice("文章已保存并发布"); setMode("manage"); setEditingId(null);
    setDraft({ title: "", excerpt: "", content: "", category: "成员变更", cover_url: "" }); await loadPosts();
  }
  async function deletePost(id) {
    if (!confirm("确定删除这篇文章吗？")) return;
    const { error } = await supabase.from("posts").delete().eq("id", id);
    setNotice(error ? error.message : "文章删除成功"); await loadPosts();
  }
  async function uploadCover(file) {
    if (!file || !supabase) return;
    const ext = file.name.split(".").pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("article-images").upload(path, file, { upsert: false });
    if (error) { setNotice(error.message); return; }
    const { data } = supabase.storage.from("article-images").getPublicUrl(path);
    setDraft(d => ({ ...d, cover_url: data.publicUrl }));
  }

  if (!supabase) return <Setup />;
  return <div className="shell">
    <header className="topbar">
      <button className="brand" onClick={() => { setMode("home"); setSelected(null); }}><img className="brand-logo" src="/logo.png" alt="燎原维基百科" /><span>燎原维基百科</span></button>
      <nav>
  <button onClick={() => { setMode("home"); setSelected(null); }}>首页</button>
  <button onClick={() => setMode("members")}>成员变更</button>
  <button onClick={() => setMode("submissions")}>废物投稿</button>
  <button onClick={() => setMode("events")}>事件记录</button>
  <button onClick={() => setMode("about")}>关于</button>
  {isAdmin && (
  <button className="login-link" onClick={logout}>
    <LogOut size={15} /> 退出登录
  </button>
)}
        {isAdmin && <button onClick={() => setMode("manage")}>文章管理</button>}
      
      </nav>
    </header>

    {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice("")}><X size={15}/></button></div>}

    {mode === "home" && !selected && <>
      <section className="hero">
        <div className="hero-layout">
          <div className="hero-text">
            <p className="eyebrow">成员变更 | 废物投稿 | 事件记录</p>
            <h1>燎原维基百科<br/><em>2026新起点</em></h1>
            <p className="hero-copy">认准正统燎原，反对所有假燎原/借刀废物，如果遇到假燎原，请立即找到官方举报</p>
            <a href="#articles" className="text-link">阅读最新文章 <ArrowUpRight size={16}/></a>
          </div>
          <div className="hero-visual">
            <img className="hero-logo" src="/logo.png" alt="燎原维基百科徽章" />
          </div>
        </div>
      </section>
      <section className="category-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">技术支持：Lunar</p>
            <h2>文章板块</h2>
          </div>
        </div>
        <div className="category-grid">
          {sections.map(section => (
            <button
              className="category-card"
              key={section.mode}
              onClick={() => {
                setMode(section.mode);
                setSelected(null);
                setSearch("");
              }}
            >
              <span className="category-number">{section.number}</span>
              <h3>{section.name}</h3>
              <p>{section.description}</p>
              <span className="category-link">进入板块 ↗</span>
            </button>
          ))}
        </div>
      </section>
      <section className="article-section" id="articles"><div className="section-heading"><div><p className="eyebrow">THE JOURNAL</p><h2>近期文章</h2></div><div className="searchbox"><Search size={16}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索文章"/></div></div>
      <div className="filters">{categories.map(c => <button key={c} className={category === c ? "active" : ""} onClick={() => setCategory(c)}>{c}</button>)}</div>
      {filtered.length ? <div className="post-grid">{filtered.map(post => <article className="post-card" key={post.id} onClick={() => setSelected(post)}>
        {post.cover_url ? <img className="cover" src={post.cover_url} alt=""/> : <div className="cover-placeholder"><BookOpen size={25}/></div>}
        <div className="post-meta"><span>{post.category || "成员变更"}</span><span>{new Date(post.created_at).toLocaleDateString("zh-CN")}</span></div><h3>{post.title}</h3><p>{post.excerpt}</p><span className="read-more">阅读全文 <ArrowUpRight size={15}/></span>
      </article>)}</div> : <div className="empty"><BookOpen size={28}/><p>还没有新文章 等待收录中</p></div>}</section>
    </>}

    {activeSection && !selected && (
  <main className="category-page">
    <button className="back" onClick={() => setMode("home")}>
      <ChevronLeft size={17} /> 返回首页
    </button>

    <p className="eyebrow">
      ARCHIVE · {activeSection.number}
    </p>

    <h1>{activeSection.name}</h1>

    <p className="reader-excerpt">
      {activeSection.description}
    </p>

    <div className="post-grid">
      {sectionPosts.length ? (
        sectionPosts.map(post => (
          <article
            className="post-card"
            key={post.id}
            onClick={() => setSelected(post)}
          >
            {post.cover_url ? (
              <img className="cover" src={post.cover_url} alt="" />
            ) : (
              <div className="cover-placeholder">
                <BookOpen size={25} />
              </div>
            )}

            <div className="post-meta">
              <span>{post.category}</span>
              <span>
                {new Date(post.created_at).toLocaleDateString("zh-CN")}
              </span>
            </div>

            <h3>{post.title}</h3>
            <p>{post.excerpt}</p>
            <span className="read-more">
              阅读全文 <ArrowUpRight size={15} />
            </span>
          </article>
        ))
      ) : (
        <div className="empty">
          <BookOpen size={28} />
          <p>这个板块暂时还没有文章</p>
        </div>
      )}
    </div>
  </main>
)}
    {selected && <main className="reader"><button className="back" onClick={() => setSelected(null)}><ChevronLeft size={17}/> 返回文章列表</button>{selected.cover_url && <img className="reader-cover" src={selected.cover_url} alt=""/>}<p className="eyebrow">{selected.category} · {new Date(selected.created_at).toLocaleDateString("zh-CN")}</p><h1>{selected.title}</h1><p className="reader-excerpt">{selected.excerpt}</p><div className="article-content">{selected.content}</div></main>}
    {mode === "about" && <main className="reader about"><p className="eyebrow">ABOUT LiaoYuan</p><h1>这里是燎原维基百科站点</h1><p className="reader-excerpt">创始人：逸林 风绝</p><div className="article-content">本站点文章分为三个板块：成员变更，欢迎投稿</div></main>}
    {mode === "login" && <main className="auth-card"><p className="eyebrow">PRIVATE AREA</p><h2>管理员登录</h2><p>登录后可以创建、编辑和删除文章。</p><form onSubmit={login}><label>邮箱<input type="email" required value={email} onChange={e => setEmail(e.target.value)}/></label><label>password<input type="password" required value={password} onChange={e => setPassword(e.target.value)}/></label><button className="primary" disabled={loading}>{loading ? "登录中…" : "登录后台"}</button></form></main>}
    {mode === "manage" && isAdmin && <main className="manager"><div className="section-heading"><div><p className="eyebrow">DASHBOARD</p><h2>文章管理</h2></div><button className="primary small" onClick={() => { setEditingId(null); setDraft({ title: "", excerpt: "", content: "", category: "成员变更", cover_url: "" }); setMode("editor"); }}><Plus size={16}/> 编辑新文章</button></div>{posts.map(p => <div className="manage-row" key={p.id}><div><b>{p.title}</b><small>{p.category} · {new Date(p.created_at).toLocaleDateString("zh-CN")}</small></div><div><button onClick={() => editPost(p)}>编辑</button><button className="danger" onClick={() => deletePost(p.id)}>删除</button></div></div>)}</main>}
    {mode === "editor" && isAdmin && <main className="editor"><button className="back" onClick={() => setMode("manage")}><ChevronLeft size={17}/> 返回管理</button><p className="eyebrow">EDITOR</p><h2>{editingId ? "编辑文章" : "发布一篇新文章"}</h2><form onSubmit={savePost}><label>文章标题<input required value={draft.title} onChange={e => setDraft({...draft, title:e.target.value})}/></label><label>摘要<input value={draft.excerpt} onChange={e => setDraft({...draft, excerpt:e.target.value})}/></label><label>
  文章分类
  <select
    value={draft.category}
    onChange={e => setDraft({ ...draft, category: e.target.value })}
  >
    <option value="成员变更">成员变更</option>
    <option value="废物投稿">废物投稿</option>
    <option value="事件记录">事件记录</option>
  </select>
</label><label>封面图片<input type="file" accept="image/*" onChange={e => uploadCover(e.target.files?.[0])}/></label>{draft.cover_url && <img className="editor-cover" src={draft.cover_url} alt="封面预览"/>}<label>正文<textarea required rows="16" value={draft.content} onChange={e => setDraft({...draft, content:e.target.value})} placeholder="开始编辑……（当前版本支持纯文本换行）"/></label><button className="primary" disabled={loading}>{loading ? "保存中…" : "保存并发布"}</button></form></main>}
    <footer><span>© {new Date().getFullYear()} 燎原维基百科</span><span>2026新的征程 新的起点</span></footer>
  </div>;
}

function Setup() {
  return <div className="setup"><div className="setup-card"><div className="brand-mark">写</div><p className="eyebrow">YOUR PERSONAL SPACE</p><h1>博客项目已准备好。</h1><p>接下来需要连接 Supabase 数据库，填入项目 URL 和公开 anon key，再运行项目。</p><ol><li>复制 <code>.env.example</code> 为 <code>.env</code></li><li>填入 Supabase 项目 URL 与 anon key</li><li>在 Supabase SQL Editor 执行 <code>supabase/schema.sql</code></li><li>创建管理员用户，并按 README 将用户 ID 加入 admin_users</li></ol><p className="muted">安全提示：不要把 service_role key 放进前端环境变量。</p></div></div>;
}
function Root() {
  const [showIntro, setShowIntro] = useState(true);

  const finishIntro = React.useCallback(() => {
    setShowIntro(false);
  }, []);

  return (
    <>
      <App />
      {showIntro && <Intro onFinish={finishIntro} />}
    </>
  );
}

createRoot(document.getElementById("root")).render(<Root />);