// current year + home search (posts.json)
document.addEventListener("DOMContentLoaded", async () => {
  const y = document.querySelector("[data-year]");
  if (y) y.textContent = new Date().getFullYear();

  const list = document.querySelector("[data-post-list]");
  const input = document.querySelector("[data-search]");

  if (!list || !input) return;

  let posts = [];
  try {
    const res = await fetch("/posts.json", { cache: "no-store" });
    if (!res.ok) throw new Error("posts.json not found");
    posts = await res.json();
  } catch (e) {
    return; // local open without server may fail
  }

  const render = (q) => {
    const query = (q || "").trim().toLowerCase();
    const filtered = posts.filter(p =>
      (p.title + " " + p.type + " " + p.desc).toLowerCase().includes(query)
    );
    list.innerHTML = filtered.map(p => `
      <article class="card">
        <div class="meta">${p.type} · ${p.read}</div>
        <h3><a href="${p.url}">${p.title}</a></h3>
        <p>${p.desc}</p>
        <a class="btn" href="${p.url}">Abrir</a>
      </article>
    `).join("");
  };

  render("");
  input.addEventListener("input", (e) => render(e.target.value));
});
// Highlight current nav link (accessibility + UX)
(function(){
  try{
    var path = location.pathname.replace(/\/$/, "");
    var links = document.querySelectorAll(".nav-links a");
    links.forEach(function(a){
      var href = a.getAttribute("href");
      if(!href) return;
      var clean = href.replace(/https?:\/\/[^/]+/, "").replace(/\/$/, "");
      if(clean === "") clean = "/";
      if(path === "" ) path = "/";
      if(clean === path || (clean !== "/" && path.startsWith(clean) && clean.endsWith(".html"))){
        a.setAttribute("aria-current","page");
      }
    });
  }catch(e){}
})();
