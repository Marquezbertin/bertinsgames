// ============================================================
// BERTIN'S GAMES - Main Application (v2)
// ============================================================

(function () {
  "use strict";

  const GAMES_PER_PAGE = 60;

  const state = {
    activeConsole: "all",
    activeGenre: "all",
    sortBy: "title",
    searchQuery: "",
    showFavoritesOnly: false,
    favorites: JSON.parse(localStorage.getItem("bertins_favs") || "[]"),
    recentlyPlayed: JSON.parse(localStorage.getItem("bertins_recent") || "[]"),
    visibleCount: GAMES_PER_PAGE,
  };

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const searchInput = $("#searchInput");
  const searchClear = $("#searchClear");
  const consoleTabs = $("#consoleTabs");
  const genreFilter = $("#genreFilter");
  const sortFilter = $("#sortFilter");
  const gamesGrid = $("#gamesGrid");
  const resultsCount = $("#resultsCount");
  const favBtn = $("#favToggle");
  const randomBtn = $("#randomBtn");
  const modal = $("#gameModal");
  const toast = $("#toast");
  const heroGames = $("#heroGames");
  const heroConsoles = $("#heroConsoles");
  const heroFavs = $("#heroFavs");
  const heroGenres = $("#heroGenres");
  const playerOverlay = $("#playerOverlay");
  const recentSection = $("#recentSection");
  const recentScroll = $("#recentScroll");
  const loadMoreWrapper = $("#loadMoreWrapper");
  const loadMoreBtn = $("#loadMoreBtn");
  const loadMoreCount = $("#loadMoreCount");
  const backToTop = $("#backToTop");

  // Console icons
  const CONSOLE_ICONS = {
    nes: "\u{1F3AE}", snes: "\u{1F579}", genesis: "\u{1F3AE}", gba: "\u{1F4F1}", gb: "\u{1F4F1}",
    gbc: "\u{1F4F1}", n64: "\u{1F579}", nds: "\u{1F4F1}", psx: "\u{1F3AE}", arcade: "\u{1F579}",
    mastersys: "\u{1F3AE}",
  };

  // Console tab icons (distinct per console)
  const CONSOLE_TAB_ICONS = {
    nes: "\u{1F534}", snes: "\u{1F7E3}", genesis: "\u{1F535}", gba: "\u{1F7E2}",
    gb: "\u{2B1C}", gbc: "\u{1F7E1}", n64: "\u{1F7E0}", nds: "\u{1F7E4}",
    psx: "\u{26AA}", arcade: "\u{1F534}", mastersys: "\u{1F535}",
  };

  function init() {
    renderHeroStats();
    renderConsoleTabs();
    renderGenreFilter();
    renderRecentlyPlayed();
    bindEvents();
    renderGames();
  }

  // ---- Hero Stats with counter animation ----
  function animateCounter(el, target) {
    const duration = 800;
    const start = performance.now();
    const from = 0;
    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(from + (target - from) * eased);
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function renderHeroStats() {
    animateCounter(heroGames, GAMES_DB.length);
    animateCounter(heroConsoles, CONSOLES.length);
    heroFavs.textContent = state.favorites.length;
    if (heroGenres) animateCounter(heroGenres, GENRES.length);
    $(".stats-badge .count").textContent = GAMES_DB.length;
  }

  // ---- Console Tabs ----
  function renderConsoleTabs() {
    let html = `<button class="console-tab active" data-console="all">
      <span class="tab-icon">\u{1F30D}</span> Todos <span class="tab-count">${GAMES_DB.length}</span>
    </button>`;
    CONSOLES.forEach((c) => {
      const count = GAMES_DB.filter((g) => g.console === c.id).length;
      if (count === 0) return;
      const icon = CONSOLE_TAB_ICONS[c.id] || "\u{1F3AE}";
      html += `<button class="console-tab" data-console="${c.id}">
        <span class="tab-icon">${icon}</span> ${c.name} <span class="tab-count">${count}</span>
      </button>`;
    });
    consoleTabs.innerHTML = html;
  }

  // ---- Genre Filter ----
  function renderGenreFilter() {
    let html = `<option value="all">Todos os generos</option>`;
    GENRES.forEach((g) => { html += `<option value="${g}">${g}</option>`; });
    genreFilter.innerHTML = html;
  }

  // ---- Recently Played ----
  function renderRecentlyPlayed() {
    const recent = state.recentlyPlayed
      .map((id) => GAMES_DB.find((g) => g.id === id))
      .filter(Boolean)
      .slice(0, 12);

    if (recent.length === 0) {
      recentSection.style.display = "none";
      return;
    }
    recentSection.style.display = "";
    recentScroll.innerHTML = recent.map((game) => {
      const consoleName = CONSOLES.find((c) => c.id === game.console)?.name || game.console;
      const icon = CONSOLE_ICONS[game.console] || "\u{1F3AE}";
      const coverUrl = typeof getCoverUrl === "function" ? getCoverUrl(game) : null;
      const thumbInner = coverUrl
        ? `<img src="${coverUrl}" alt="${game.title}" loading="lazy" onerror="this.style.display='none';this.parentElement.textContent='${icon}'">`
        : icon;
      return `
        <div class="recent-card" data-game-id="${game.id}">
          <div class="recent-thumb">${thumbInner}</div>
          <div class="recent-info">
            <div class="recent-title" title="${game.title}">${game.title}</div>
            <div class="recent-console">${consoleName}</div>
          </div>
        </div>`;
    }).join("");
  }

  // ---- Filtered + Paginated Games ----
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
      case "rating": games.sort((a, b) => b.rating - a.rating || a.title.localeCompare(b.title)); break;
      case "console": games.sort((a, b) => a.console.localeCompare(b.console) || a.title.localeCompare(b.title)); break;
    }
    return games;
  }

  function renderGames() {
    const allGames = getFilteredGames();
    const total = allGames.length;
    const games = allGames.slice(0, state.visibleCount);
    const remaining = total - games.length;

    resultsCount.innerHTML = `<strong>${total}</strong> jogo${total !== 1 ? "s" : ""} encontrado${total !== 1 ? "s" : ""}`;

    if (total === 0) {
      gamesGrid.innerHTML = `<div class="empty-state"><div class="empty-icon">\u{1F50D}</div><h3>Nenhum jogo encontrado</h3><p>Tente mudar os filtros ou buscar por outro termo</p></div>`;
      loadMoreWrapper.style.display = "none";
      return;
    }

    gamesGrid.innerHTML = games.map((game) => {
      const isFav = state.favorites.includes(game.id);
      const consoleName = CONSOLES.find((c) => c.id === game.console)?.name || game.console;
      const stars = "\u2605".repeat(game.rating) + "\u2606".repeat(5 - game.rating);
      const icon = CONSOLE_ICONS[game.console] || "\u{1F3AE}";
      const sourceDots = game.sources.map((s) =>
        `<span class="source-dot" data-platform="${s.platform}" title="${PLATFORMS[s.platform]?.name || s.platform}"></span>`
      ).join("");
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

    // Load more button
    if (remaining > 0) {
      loadMoreWrapper.style.display = "";
      loadMoreCount.textContent = `+${remaining}`;
    } else {
      loadMoreWrapper.style.display = "none";
    }
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
    const searchQuery = encodeURIComponent(game.title);
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
      <div class="modal-sources"><h4>Escolha onde jogar</h4>${sourcesHtml}</div>
      <div class="modal-search-note">
        Jogo nao carregou? Busque em:
        <a href="https://emulatorgamer.com/pt/search?q=${searchQuery}" target="_blank">Emulator Gamer</a> &bull;
        <a href="https://www.retrogames.cc" target="_blank">RetroGames.cc</a> &bull;
        <a href="https://classicgamezone.com/pt/search?q=${searchQuery}" target="_blank">Classic Game Zone</a>
      </div>`;
    modal.classList.add("show");
    $("#modalClose").addEventListener("click", closeModal);
  }

  function closeModal() { modal.classList.remove("show"); }

  // ---- PLAYER ----
  let playerUrl = "";
  let playerLoadTimer = null;

  function openPlayer(url, title) {
    playerUrl = url;
    const playerLoading = $("#playerLoading");
    const playerError = $("#playerError");
    const playerFrame = $("#playerFrame");

    $("#playerTitle").textContent = title;
    playerLoading.classList.remove("hidden");
    playerLoading.style.display = "";
    playerError.style.display = "none";
    playerFrame.src = url;
    playerOverlay.classList.add("show");
    document.body.style.overflow = "hidden";
    closeModal();

    // Hide loading when iframe loads and give focus for gamepad support
    playerFrame.onload = function () {
      playerLoading.style.display = "none";
      playerFrame.focus();
    };

    // After 5s, force-hide loading (cross-origin may block onload) and focus iframe
    clearTimeout(playerLoadTimer);
    playerLoadTimer = setTimeout(() => {
      playerLoading.style.display = "none";
      playerFrame.focus();
    }, 5000);
  }

  function showPlayerError() {
    const playerLoading = $("#playerLoading");
    const playerError = $("#playerError");
    playerLoading.style.display = "none";
    playerError.style.display = "";
  }

  function closePlayer() {
    const playerFrame = $("#playerFrame");
    playerFrame.onload = null;
    playerFrame.src = "about:blank";
    clearTimeout(playerLoadTimer);
    playerOverlay.classList.remove("show");
    document.body.style.overflow = "";
    // Reset loading/error states for next game
    const loading = $("#playerLoading");
    loading.classList.remove("hidden");
    loading.style.display = "";
    $("#playerError").style.display = "none";
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
    renderRecentlyPlayed();
  }

  // ---- RANDOM GAME ----
  function openRandomGame() {
    const game = GAMES_DB[Math.floor(Math.random() * GAMES_DB.length)];
    showToast("\u{1F3B2} " + game.title);
    openModal(game.id);
  }

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove("show"), 2500);
  }

  // ---- EVENTS ----
  function bindEvents() {
    let searchTimer;
    searchInput.addEventListener("input", () => {
      clearTimeout(searchTimer);
      searchClear.classList.toggle("visible", searchInput.value.length > 0);
      searchTimer = setTimeout(() => {
        state.searchQuery = searchInput.value.trim();
        state.visibleCount = GAMES_PER_PAGE;
        renderGames();
      }, 200);
    });

    searchClear.addEventListener("click", () => {
      searchInput.value = "";
      searchClear.classList.remove("visible");
      state.searchQuery = "";
      state.visibleCount = GAMES_PER_PAGE;
      renderGames();
      searchInput.focus();
    });

    consoleTabs.addEventListener("click", (e) => {
      const tab = e.target.closest(".console-tab");
      if (!tab) return;
      $$(".console-tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      state.activeConsole = tab.dataset.console;
      state.visibleCount = GAMES_PER_PAGE;
      renderGames();
    });

    genreFilter.addEventListener("change", () => {
      state.activeGenre = genreFilter.value;
      state.visibleCount = GAMES_PER_PAGE;
      renderGames();
    });

    sortFilter.addEventListener("change", () => {
      state.sortBy = sortFilter.value;
      state.visibleCount = GAMES_PER_PAGE;
      renderGames();
    });

    favBtn.addEventListener("click", () => {
      state.showFavoritesOnly = !state.showFavoritesOnly;
      favBtn.classList.toggle("active", state.showFavoritesOnly);
      state.visibleCount = GAMES_PER_PAGE;
      renderGames();
    });

    randomBtn.addEventListener("click", openRandomGame);

    // Load more
    loadMoreBtn.addEventListener("click", () => {
      state.visibleCount += GAMES_PER_PAGE;
      renderGames();
    });

    // Card clicks
    gamesGrid.addEventListener("click", (e) => {
      const favBtnEl = e.target.closest(".card-fav-btn");
      if (favBtnEl) { toggleFavorite(favBtnEl.dataset.favId, e); return; }
      const card = e.target.closest(".game-card");
      if (card) openModal(card.dataset.gameId);
    });

    // Recent cards
    recentScroll.addEventListener("click", (e) => {
      const card = e.target.closest(".recent-card");
      if (card) openModal(card.dataset.gameId);
    });

    // Modal source buttons
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
      if (playerUrl) window.open(playerUrl, "_blank");
    });
    $("#playerFullscreen").addEventListener("click", () => {
      const frame = $("#playerFrame");
      if (frame.requestFullscreen) frame.requestFullscreen();
      else if (frame.webkitRequestFullscreen) frame.webkitRequestFullscreen();
    });

    // Click on player area -> focus iframe (needed for gamepad/controller input)
    playerOverlay.addEventListener("click", (e) => {
      if (e.target === $("#playerFrame") || e.target.closest(".player-frame")) {
        $("#playerFrame").focus();
      }
    });

    // Player error buttons
    $("#playerOpenExternal").addEventListener("click", () => {
      if (playerUrl) window.open(playerUrl, "_blank");
    });
    $("#playerTrySearch").addEventListener("click", () => {
      const title = $("#playerTitle").textContent;
      window.open("https://emulatorgamer.com/pt/search?q=" + encodeURIComponent(title), "_blank");
    });
    $("#playerErrorClose").addEventListener("click", closePlayer);

    // Keyboard
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

    // Back to top
    window.addEventListener("scroll", () => {
      backToTop.classList.toggle("visible", window.scrollY > 400);
    }, { passive: true });

    backToTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    // Brand click - reset all
    $(".navbar-brand").addEventListener("click", () => {
      state.activeConsole = "all";
      state.activeGenre = "all";
      state.searchQuery = "";
      state.showFavoritesOnly = false;
      state.visibleCount = GAMES_PER_PAGE;
      searchInput.value = "";
      searchClear.classList.remove("visible");
      genreFilter.value = "all";
      sortFilter.value = "title";
      favBtn.classList.remove("active");
      $$(".console-tab").forEach((t) => t.classList.remove("active"));
      $$(".console-tab")[0]?.classList.add("active");
      renderGames();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
