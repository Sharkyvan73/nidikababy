/* Nidikababy — simple client-side rendering for a static site (GitHub Pages friendly) */
(() => {
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));

  const yearEl = document.querySelector("[data-year]");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const qInput = document.querySelector("[data-search]");


  // Home search: redirect to /guias.html with the query
  function wireHomeSearchInput(){
    if(!qInput) return;
    const go = ()=>{
      const q = (qInput.value || "").trim();
      const url = q ? `/guias.html?q=${encodeURIComponent(q)}` : "/guias.html";
      window.location.href = url;
    };
    qInput.addEventListener("keydown", (e)=>{
      if(e.key === "Enter"){
        e.preventDefault();
        go();
      }
    });
    // iOS/Android "search" / "go"
    qInput.addEventListener("search", (e)=>{
      e.preventDefault();
      go();
    });
  }

  wireHomeSearchInput();


  async function loadPosts() {
    const res = await fetch("/posts.json", { cache: "no-store" });
    if (!res.ok) throw new Error("No se pudo cargar posts.json");
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  }

  function normalize(s) {
    return (s || "")
      .toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .trim();
  }

  
  function levenshtein(a,b){
    a = a || ""; b = b || "";
    const al=a.length, bl=b.length;
    if(al===0) return bl;
    if(bl===0) return al;
    const dp = Array.from({length: al+1}, ()=>Array(bl+1).fill(0));
    for(let i=0;i<=al;i++) dp[i][0]=i;
    for(let j=0;j<=bl;j++) dp[0][j]=j;
    for(let i=1;i<=al;i++){
      for(let j=1;j<=bl;j++){
        const cost = a[i-1]===b[j-1] ? 0 : 1;
        dp[i][j]=Math.min(
          dp[i-1][j]+1,
          dp[i][j-1]+1,
          dp[i-1][j-1]+cost
        );
      }
    }
    return dp[al][bl];
  }

  function fuzzyMatch(query, haystack){
    const q = normalize(query);
    const h = normalize(haystack);
    if(!q) return true;
    if(h.includes(q)) return true;

    const qWords = q.split(" ").filter(Boolean);
    const hWords = h.split(" ").filter(Boolean);
    if(qWords.length===0 || hWords.length===0) return false;

    // allow small typos per word
    return qWords.every(qw=>{
      const maxDist = qw.length <= 4 ? 1 : (qw.length <= 7 ? 2 : 3);
      return hWords.some(hw => levenshtein(qw, hw) <= maxDist);
    });
  }

  function topGuides(posts){
    return posts
      .filter(p => (p.type || "guia")==="guia")
      .slice()
      .sort((a,b)=> (b.date||"").localeCompare(a.date||""))
      .slice(0,3);
  }

  function wireTopGuidesCarousel(posts){
    const el = document.querySelector("[data-top-guides]");
    if(!el) return;

    const guides = topGuides(posts);
    if(!guides.length){
      el.innerHTML = '<div class="muted small">Aún no hay guías destacadas.</div>';
      return;
    }

    let idx = 0;

    const render = ()=>{
      const g = guides[idx];
      const img = g.image || "/assets/img/posts/placeholder.svg";
      el.innerHTML = `
        <div class="carousel-card">
          <a class="card-link" href="${g.url}">
            <div class="thumb">
              <img src="${img}" alt="" loading="lazy" decoding="async" width="640" height="360"/>
            </div>
            <div class="content">
              <div class="meta">Guía${g.category ? ` · ${g.category}` : ""}${g.minutes ? ` · ${g.minutes} min` : ""}</div>
              <h3>${g.title}</h3>
              <p class="small">${g.desc || ""}</p>
              <span class="btn small-btn">Abrir</span>
            </div>
          </a>
        </div>
        <div class="carousel-dots" aria-label="Cambiar guía destacada">
          ${guides.map((_,i)=>`<button class="dot ${i===idx?"active":""}" type="button" data-dot="${i}" aria-label="Guía ${i+1}"></button>`).join("")}
        </div>
      `;

      el.querySelectorAll("[data-dot]").forEach(btn=>{
        btn.addEventListener("click", ()=>{
          idx = Number(btn.getAttribute("data-dot")) || 0;
          render();
        });
      });
    };

    render();
    setInterval(()=>{
      if(!document.body.contains(el)) return;
      idx = (idx+1) % guides.length;
      render();
    }, 4500);
  }

function renderList(container, posts, query) {
    const type = container.getAttribute("data-post-type"); // "guia" | "comparativa" | null
    const q = normalize(query);

    const filtered = posts
      .filter(p => !type || (p.type || "guia") === type)
      .filter(p => {
        if (!q) return true;
        const hay = [
          p.title, p.desc, p.category, p.type, (p.tags || []).join(" ")
        ].join(" ");
        return fuzzyMatch(query, hay);
      })
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

    container.innerHTML = filtered.map((p) => {
      const minutes = p.minutes ?? "";
      const kicker = p.type === "comparativa" ? "Comparativa" : "Guía";
      const category = p.category ? ` · ${p.category}` : "";
      const img = p.image || "/assets/img/posts/placeholder.svg";
      const excerpt = p.desc || "";
      return `
<article class="post-card" tabindex="0" role="link" aria-label="${p.title}">
  <a class="card-link" href="${p.url}">
    <div class="thumb" aria-hidden="true">
      <img src="${img}" alt="" loading="lazy" decoding="async" width="640" height="360"/>
    </div>
    <div class="content">
      <div class="meta">${kicker}${category}${minutes ? ` · ${minutes} min` : ""}</div>
      <h3>${p.title}</h3>
      <p class="small">${excerpt}</p>
      <span class="btn small-btn">Abrir</span>
    </div>
  </a>
</article>`;
    }).join("");

    // Make whole card clickable with keyboard
    $$(".post-card", container).forEach((card) => {
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          const a = card.querySelector("a");
          if (a) a.click();
        }
      });
    });
  }

  function wireSearch(posts) {
    const lists = $$("[data-post-list]");
    const qInput = $("#q");

    // Prefill from URL: /guias.html?q=...
    if (qInput) {
      const params = new URLSearchParams(window.location.search);
      const initial = params.get("q") || params.get("s") || params.get("search") || "";
      if (initial && !qInput.value) qInput.value = initial;
    }

    const renderAll = (q) => lists.forEach((c) => renderList(c, posts, q));
    renderAll(qInput ? qInput.value : "");

    // Home carousel (si existe el contenedor)
    wireTopGuidesCarousel(posts);

    if (qInput) {
      qInput.addEventListener("input", () => renderAll(qInput.value));
    }
  }

  // Subtle brand animation (if exists)
  const logo = $(".brand .logo");
  if (logo) {
    logo.classList.add("float");
  }

  loadPosts()
    .then(wireSearch)
    .catch((err) => {
      console.warn(err);
    });
})();


/* Mobile nav toggle */
(function(){
  const btn = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".nav-links");
  if(!btn || !nav) return;

  function openNav(){
    nav.classList.add("is-open");
    btn.setAttribute("aria-expanded","true");
    document.documentElement.classList.add("nav-open");
  }
  function closeNav(){
    nav.classList.remove("is-open");
    btn.setAttribute("aria-expanded","false");
    document.documentElement.classList.remove("nav-open");
  }

  btn.addEventListener("click", ()=>{
    const expanded = btn.getAttribute("aria-expanded")==="true";
    expanded ? closeNav() : openNav();
  });

  nav.querySelectorAll("a").forEach(a=>{
    a.addEventListener("click", closeNav);
  });

  document.addEventListener("click",(e)=>{
    if(!nav.classList.contains("is-open")) return;
    const t = e.target;
    if(t===btn || nav.contains(t)) return;
    closeNav();
  });

  document.addEventListener("keydown", (e)=>{
    if(e.key === "Escape") closeNav();
  });
})();
