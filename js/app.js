// ============================================================
// BERTIN'S GAMES - Main Application
// ============================================================

(function () {
  "use strict";

  const state = {
    activeConsole: "all",
    activeGenre: "all",
    sortBy: "title",
    searchQuery: "",
    showFavoritesOnly: false,
    favorites: JSON.parse(localStorage.getItem("bertins_favs") || "[]"),
    recentlyPlayed: JSON.parse(localStorage.getItem("bertins_recent") || "[]"),
  };

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const searchInput = $("#searchInput");
  const consoleTabs = $("#consoleTabs");
  const genreFilter = $("#genreFilter");
  const sortFilter = $("#sortFilter");
  const gamesGrid = $("#gamesGrid");
  const resultsCount = $("#resultsCount");
  const favBtn = $("#favToggle");
  const modal = $("#gameModal");
  const toast = $("#toast");
  const heroGames = $("#heroGames");
  const heroConsoles = $("#heroConsoles");
  const heroFavs = $("#heroFavs");
  const playerOverlay = $("#playerOverlay");

  function init() {
    renderHeroStats();
    renderConsoleTabs();
    renderGenreFilter();
    bindEvents();
    renderGames();
  }

  function renderHeroStats() {
    heroGames.textContent = GAMES_DB.length;
    heroConsoles.textContent = CONSOLES.length;
    heroFavs.textContent = state.favorites.length;
    $(".stats-badge .count").textContent = GAMES_DB.length;
  }

  function renderConsoleTabs() {
    let html = `<button class="console-tab active" data-console="all">
      Todos <span class="tab-count">${GAMES_DB.length}</span>
    </button>`;
    CONSOLES.forEach((c) => {
      const count = GAMES_DB.filter((g) => g.console === c.id).length;
      if (count === 0) return;
      html += `<button class="console-tab" data-console="${c.id}">
        ${c.name} <span class="tab-count">${count}</span>
      </button>`;
    });
    consoleTabs.innerHTML = html;
  }

  function renderGenreFilter() {
    let html = `<option value="all">Todos os generos</option>`;
    GENRES.forEach((g) => { html += `<option value="${g}">${g}</option>`; });
    genreFilter.innerHTML = html;
  }

  function getFilteredGames() {
    let games = [...GAMES_DB];
    if (state.activeConsole !== "all") games = games.filter((g) => g.console === state.activeConsole);
    if (state.activeGenre !== "all") games = games.filter((g) => g.genre === state.activeGenre);
    if (state.showFavoritesOnly) games = games.filter((g) => state.favorites.includes(g.id));
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      games = games.filter((g) =>
        g.title.toLowerCase().includes(q) || g.genre.toLowerCase().includes(q) || g.console.toLowerCase().includes(q)
      );
    }
    switch (state.sortBy) {
      case "title": games.sort((a, b) => a.title.localeCompare(b.title)); break;
      case "year": games.sort((a, b) => a.year - b.year); break;
      case "year-desc": games.sort((a, b) => b.year - a.year); break;
      case "rating": games.sort((a, b) => b.rating - a.rating); break;
      case "console": games.sort((a, b) => a.console.localeCompare(b.console) || a.title.localeCompare(b.title)); break;
    }
    return games;
  }

  const CONSOLE_ICONS = {
    nes:"\u{1F3AE}", snes:"\u{1F579}", genesis:"\u{1F3AE}", gba:"\u{1F4F1}", gb:"\u{1F4F1}",
    gbc:"\u{1F4F1}", n64:"\u{1F579}", nds:"\u{1F4F1}", psx:"\u{1F3AE}", arcade:"\u{1F579}",
    mastersys:"\u{1F3AE}", atari2600:"\u{1F579}",
  };

  function renderGames() {
    const games = getFilteredGames();
    resultsCount.innerHTML = `<strong>${games.length}</strong> jogo${games.length !== 1 ? "s" : ""} encontrado${games.length !== 1 ? "s" : ""}`;
    if (games.length === 0) {
      gamesGrid.innerHTML = `<div class="empty-state"><div class="empty-icon">\u{1F50D}</div><h3>Nenhum jogo encontrado</h3><p>Tente mudar os filtros ou buscar por outro termo</p></div>`;
      return;
    }
    gamesGrid.innerHTML = games.map((game) => {
      const isFav = state.favorites.includes(game.id);
      const consoleName = CONSOLES.find((c) => c.id === game.console)?.name || game.console;
      const stars = "\u2605".repeat(game.rating) + "\u2606".repeat(5 - game.rating);
      const icon = CONSOLE_ICONS[game.console] || "\u{1F3AE}";
      const sourceDots = game.sources.map((s) => `<span class="source-dot" data-platform="${s.platform}" title="${PLATFORMS[s.platform]?.name || s.platform}"></span>`).join("");
      const coverUrl = typeof getCoverUrl === "function" ? getCoverUrl(game) : null;
      const thumbContent = coverUrl
        ? `<img class="card-thumb-img" src="${coverUrl}" alt="${game.title}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
          + `<div class="card-thumb-placeholder" style="display:none">${icon}</div>`
        : `<div class="card-thumb-placeholder">${icon}</div>`;
      return `
        <div class="game-card" data-game-id="${game.id}">
          <div class="card-thumb">
            ${thumbContent}
            <span class="card-console-badge">${consoleName}</span>
            <button class="card-fav-btn ${isFav ? "is-fav" : ""}" data-fav-id="${game.id}" title="Favoritar">${isFav ? "\u2665" : "\u2661"}</button>
            <div class="card-play-overlay"><div class="play-btn-circle">\u25B6</div></div>
          </div>
          <div class="card-body">
            <div class="card-title" title="${game.title}">${game.title}</div>
            <div class="card-meta">
              <span class="card-genre">${game.genre}</span>
              <span class="card-year">${game.year}</span>
              <span class="card-rating">${stars}</span>
            </div>
            <div class="card-sources">${sourceDots}</div>
          </div>
        </div>`;
    }).join("");
  }

  // ---- MODAL ----
  function openModal(gameId) {
    const game = GAMES_DB.find((g) => g.id === gameId);
    if (!game) return;
    const consoleName = CONSOLES.find((c) => c.id === game.console)?.name || game.console;
    const stars = "\u2605".repeat(game.rating) + "\u2606".repeat(5 - game.rating);
    const sourcesHtml = game.sources.map((s) => {
      const platform = PLATFORMS[s.platform];
      if (!platform) return "";
      const url = platform.playUrl(s.slug, game.console);
      return `
        <button class="source-btn" data-url="${url}" data-game-id="${game.id}" data-game-title="${game.title}">
          <span class="source-dot-lg" style="background:${platform.color}"></span>
          <span class="source-platform">${platform.name}</span>
          <span class="source-arrow">\u25B6 Jogar</span>
        </button>`;
    }).join("");
    $(".modal").innerHTML = `
      <button class="modal-close" id="modalClose">\u2715</button>
      <div class="modal-header">
        <div class="modal-title">${game.title}</div>
        <div class="modal-subtitle">${consoleName}</div>
      </div>
      <div class="modal-details">
        <div class="modal-detail"><span class="detail-val">${game.year}</span><span class="detail-label">Ano</span></div>
        <div class="modal-detail"><span class="detail-val">${game.genre}</span><span class="detail-label">Genero</span></div>
        <div class="modal-detail"><span class="detail-val">${game.players}</span><span class="detail-label">Jogadores</span></div>
        <div class="modal-detail"><span class="detail-val">${stars}</span><span class="detail-label">Rating</span></div>
      </div>
      <div class="modal-sources"><h4>Escolha onde jogar</h4>${sourcesHtml}</div>`;
    modal.classList.add("show");
    $("#modalClose").addEventListener("click", closeModal);
  }

  function closeModal() { modal.classList.remove("show"); }

  // ---- PLAYER (iframe dentro do hub) ----
  function openPlayer(url, title) {
    const playerTitle = $("#playerTitle");
    const playerFrame = $("#playerFrame");
    playerTitle.textContent = title;
    playerFrame.src = url;
    playerOverlay.classList.add("show");
    document.body.style.overflow = "hidden";
    closeModal();
  }

  function closePlayer() {
    const playerFrame = $("#playerFrame");
    playerFrame.src = "about:blank";
    playerOverlay.classList.remove("show");
    document.body.style.overflow = "";
  }

  // ---- FAVORITES ----
  function toggleFavorite(gameId, e) {
    if (e) e.stopPropagation();
    const idx = state.favorites.indexOf(gameId);
    if (idx > -1) { state.favorites.splice(idx, 1); showToast("Removido dos favoritos"); }
    else { state.favorites.push(gameId); showToast("\u2665 Adicionado aos favoritos!"); }
    localStorage.setItem("bertins_favs", JSON.stringify(state.favorites));
    heroFavs.textContent = state.favorites.length;
    renderGames();
  }

  function addToRecent(gameId) {
    state.recentlyPlayed = state.recentlyPlayed.filter((id) => id !== gameId);
    state.recentlyPlayed.unshift(gameId);
    if (state.recentlyPlayed.length > 20) state.recentlyPlayed.pop();
    localStorage.setItem("bertins_recent", JSON.stringify(state.recentlyPlayed));
  }

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove("show"), 2200);
  }

  // ---- EVENTS ----
  function bindEvents() {
    let searchTimer;
    searchInput.addEventListener("input", () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => { state.searchQuery = searchInput.value.trim(); renderGames(); }, 200);
    });

    consoleTabs.addEventListener("click", (e) => {
      const tab = e.target.closest(".console-tab");
      if (!tab) return;
      $$(".console-tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      state.activeConsole = tab.dataset.console;
      renderGames();
    });

    genreFilter.addEventListener("change", () => { state.activeGenre = genreFilter.value; renderGames(); });
    sortFilter.addEventListener("change", () => { state.sortBy = sortFilter.value; renderGames(); });

    favBtn.addEventListener("click", () => {
      state.showFavoritesOnly = !state.showFavoritesOnly;
      favBtn.classList.toggle("active", state.showFavoritesOnly);
      renderGames();
    });

    gamesGrid.addEventListener("click", (e) => {
      const favBtnEl = e.target.closest(".card-fav-btn");
      if (favBtnEl) { toggleFavorite(favBtnEl.dataset.favId, e); return; }
      const card = e.target.closest(".game-card");
      if (card) openModal(card.dataset.gameId);
    });

    // Clique nos botoes de source no modal -> abrir player
    modal.addEventListener("click", (e) => {
      const sourceBtn = e.target.closest(".source-btn");
      if (sourceBtn) {
        const url = sourceBtn.dataset.url;
        const title = sourceBtn.dataset.gameTitle;
        const gameId = sourceBtn.dataset.gameId;
        addToRecent(gameId);
        openPlayer(url, title);
      }
    });

    modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

    // Player controls
    $("#playerClose").addEventListener("click", closePlayer);
    $("#playerNewTab").addEventListener("click", () => {
      const src = $("#playerFrame").src;
      if (src && src !== "about:blank") window.open(src, "_blank");
    });
    $("#playerFullscreen").addEventListener("click", () => {
      const frame = $("#playerFrame");
      if (frame.requestFullscreen) frame.requestFullscreen();
      else if (frame.webkitRequestFullscreen) frame.webkitRequestFullscreen();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (playerOverlay.classList.contains("show")) closePlayer();
        else closeModal();
      }
      if (e.key === "/" && document.activeElement !== searchInput && !playerOverlay.classList.contains("show")) {
        e.preventDefault();
        searchInput.focus();
      }
    });

    $(".navbar-brand").addEventListener("click", () => {
      state.activeConsole = "all"; state.activeGenre = "all"; state.searchQuery = "";
      state.showFavoritesOnly = false; searchInput.value = "";
      genreFilter.value = "all"; sortFilter.value = "title";
      favBtn.classList.remove("active");
      $$(".console-tab").forEach((t) => t.classList.remove("active"));
      $$(".console-tab")[0]?.classList.add("active");
      renderGames();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
