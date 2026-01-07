/* Nidikababy — simple client-side rendering for a static site (GitHub Pages friendly) */
(() => {
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));

  const yearEl = document.querySelector("[data-year]");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const qInput = document.querySelector("[data-search]");

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
        return normalize(hay).includes(q);
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
    const renderAll = (q) => lists.forEach((c) => renderList(c, posts, q));
    renderAll("");

    if (!qInput) return;
    qInput.addEventListener("input", () => renderAll(qInput.value));
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
