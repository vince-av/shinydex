const pokedex = document.getElementById("pokemon-grid");
const toggleShinyBtn = document.getElementById("toggle-shiny");

const quickMenu = document.getElementById("quick-menu");
const quickMenuSheet = quickMenu.querySelector(".sheet");
quickMenuSheet.addEventListener("click", e => {
    e.stopPropagation();
});
const menuTitle = document.getElementById("menu-title");
const btnWishlist = document.getElementById("btn-wishlist");
const toggleWishlistBtn = document.getElementById("toggle-wishlist");
const btnShiny = document.getElementById("btn-shiny");
const btnClose = document.getElementById("btn-close");
const selectGame = document.getElementById("select-game");
const detailView = document.getElementById("detail-view");
const detailClose = document.getElementById("detail-close");
const detailTitle = document.getElementById("detail-title");
const detailImg = document.getElementById("detail-img");
const detailTypes = document.getElementById("detail-types");
const detailStats = document.getElementById("detail-stats");
const detailShiny = document.getElementById("detail-shiny");
const detailWishlist = document.getElementById("detail-wishlist");
const detailGame = document.getElementById("detail-game");
const detailNote = document.getElementById("detail-note");
const filterMenu = document.getElementById("filter-menu");
const filterGame = document.getElementById("filter-game");
const filterShiny = document.getElementById("filter-shiny");
const scrollSentinel = document.getElementById("scroll-sentinel");
const filterClose = document.getElementById("filter-close");
const filterBtn = document.querySelector(".bottom-bar button:nth-child(3)");
const countTotal = document.getElementById("count-total");
const countShiny = document.getElementById("count-shiny");
const countWishlist = document.getElementById("count-wishlist");
const searchInput = document.getElementById("search-name");
const loadMoreBtn = document.getElementById("load-more");
const LIMITE_TOTAL = 1025;   // Pokédex actual
const BLOQUE = 50;

let offsetActual = 0;
let cargando = false;
let scrollObserver = null;






selectGame.addEventListener("change", () => {
  if (!pokemonActivo) return;
  pokemonActivo.juego = selectGame.value;
  guardarDatos();
});


let modoShiny = false;
let vistaWishlist = false;
let pokemonGuardados = [];
let pokemonActivo = null;
let filtroJuego = "";
let filtroShiny = false;
let textoBusqueda = "";
let touchStartX = 0;
let touchStartY = 0;
let touchMoved = false;
let cancelarClick = false;
const TOUCH_MOVE_THRESHOLD = 8; // px






function guardarDatos() {
  localStorage.setItem("pokedexShiny", JSON.stringify(pokemonGuardados));
}

function cargarDatosGuardados() {
  const datos = localStorage.getItem("pokedexShiny");
  return datos ? JSON.parse(datos) : null;
}
async function completarDatosPokemon(pokemon) {
    // Si ya tiene datos, no hacemos nada
    if (pokemon.tipos && pokemon.tipos.length > 0 && pokemon.stats && pokemon.stats.length > 0) {
        return pokemon;
    }

    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemon.id}`);
    const data = await res.json();

    pokemon.tipos = data.types.map(t => t.type.name);
    pokemon.stats = data.stats.map(s => ({
        nombre: s.stat.name,
        valor: s.base_stat
    }));

    guardarDatos();
    return pokemon;
}
function iniciarScrollInfinito() {
    if (scrollObserver) return; // 👈 evitar crear dos

    scrollObserver = new IntersectionObserver(entries => {
        const entry = entries[0];

        if (entry.isIntersecting && !cargando) {
            cargarBloquePokemon();
        }
    }, {
        rootMargin: "200px"
    });

    scrollObserver.observe(scrollSentinel);
}

function renderPokedex() {
    pokedex.innerHTML = "";

    pokemonGuardados.forEach(pokemon => {
        if (vistaWishlist && !pokemon.wishlist) return;
        if (filtroJuego && pokemon.juego !== filtroJuego) return;
        if (filtroShiny && !pokemon.shinyConseguido) return;
        if (textoBusqueda && !pokemon.nombre.includes(textoBusqueda)) return;

        crearCartaPokemon(pokemon);
        actualizarCarta(pokemon);
    });

    actualizarSprites();
    actualizarContadores();
}
function actualizarContadores() {
    const total = pokemonGuardados.length;
    const shiny = pokemonGuardados.filter(p => p.shinyConseguido).length;
    const wishlist = pokemonGuardados.filter(p => p.wishlist).length;

    countTotal.textContent = `📦 ${total}`;
    countShiny.textContent = `✨ ${shiny}`;
    countWishlist.textContent = `⭐ ${wishlist}`;
}

async function cargarPokemon() {
    const datosGuardados = cargarDatosGuardados();

    if (datosGuardados && datosGuardados.length > 0) {
        pokemonGuardados = datosGuardados.map(p => ({
            ...p,
            tipos: p.tipos || [],
            stats: p.stats || [],
            nota: p.nota || ""
        }));

        offsetActual = pokemonGuardados.length;
        renderPokedex();
        return;
    }

    // 🔴 AQUÍ ESTABA EL PROBLEMA
    // No cargamos NINGÚN Pokémon aquí
    pokemonGuardados = [];
    offsetActual = 0;
    renderPokedex();
}
async function cargarBloquePokemon() {
    if (cargando) return;
    if (offsetActual >= LIMITE_TOTAL) return;

    cargando = true;

    // 🔒 detener observer mientras cargamos
    if (scrollObserver) scrollObserver.unobserve(scrollSentinel);

    // Blindaje extra por si venimos con datos
    if (offsetActual === 0 && pokemonGuardados.length > 0) {
        offsetActual = pokemonGuardados.length;
    }

    const inicio = offsetActual + 1;
    const fin = Math.min(inicio + BLOQUE - 1, LIMITE_TOTAL);

    for (let id = inicio; id <= fin; id++) {
        // Evitar duplicados
        if (pokemonGuardados.some(p => p.id === id)) continue;

        const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
        const data = await res.json();

        const pokemon = {
            id: data.id,
            nombre: data.name,
            normal: data.sprites.front_default,
            shiny: data.sprites.front_shiny,
            wishlist: false,
            shinyConseguido: false,
            juego: "",
            nota: "",
            tipos: data.types.map(t => t.type.name),
            stats: data.stats.map(s => ({
                nombre: s.stat.name,
                valor: s.base_stat
            }))
        };

        pokemonGuardados.push(pokemon);
    }

offsetActual = fin;

// 🔒 DEDUPLICADO DEFINITIVO POR ID
pokemonGuardados = Object.values(
    pokemonGuardados.reduce((acc, p) => {
        acc[p.id] = p;
        return acc;
    }, {})
);

guardarDatos();
renderPokedex();

    // 🔓 reactivar observer al terminar
    if (scrollObserver && offsetActual < LIMITE_TOTAL) {
        scrollObserver.observe(scrollSentinel);
    }

    cargando = false;

    if (offsetActual >= LIMITE_TOTAL) {
        loadMoreBtn.style.display = "none";
    }
}

function crearCartaPokemon(pokemon) {
  const div = document.createElement("div");
  div.className = "pokemon";
  div.dataset.id = pokemon.id;

  div.innerHTML = `
    <span class="wishlist" style="display:none;">⭐</span>
    <span class="shiny-mark" style="display:none;">✨</span>
    <img src="${pokemon.normal}" alt="${pokemon.nombre}">
    <div>#${pokemon.id}</div>
  `;

  let pressTimer;
  let longPress = false;

  // 🖱️ Ratón (FIX DEFINITIVO)
  div.addEventListener("mousedown", () => {
    longPress = false;
    pressTimer = setTimeout(() => {
      longPress = true;
      abrirMenu(pokemon.id);
      }, 500);
  });

    div.addEventListener("mouseup", () => {
        clearTimeout(pressTimer);
    });

    div.addEventListener("mouseleave", () => {
        clearTimeout(pressTimer);
    });


div.addEventListener("click", () => {
  if ("ontouchstart" in window) return;
  abrirFicha(pokemon.id);
});

// 📱 TÁCTIL (tap vs scroll FIX DEFINITIVO)

div.addEventListener("touchstart", (e) => {
  const t = e.touches[0];
  touchStartX = t.clientX;
  touchStartY = t.clientY;
  touchMoved = false;
  cancelarClick = false;
  longPress = false;

  pressTimer = setTimeout(() => {
    longPress = true;
    abrirMenu(pokemon.id);
  }, 500);
}, { passive: true });

div.addEventListener("touchmove", (e) => {
  const t = e.touches[0];
  const dx = Math.abs(t.clientX - touchStartX);
  const dy = Math.abs(t.clientY - touchStartY);

  if (dx > TOUCH_MOVE_THRESHOLD || dy > TOUCH_MOVE_THRESHOLD) {
    touchMoved = true;
    cancelarClick = true;      // 👈 CLAVE
    clearTimeout(pressTimer);
  }
}, { passive: true });
div.addEventListener("touchend", (e) => {
  clearTimeout(pressTimer);

  if (touchMoved) return;

  if (longPress) {
    // Ya se abrió el menú, no hacemos nada más
    return;
  }

  // Tap corto
  abrirFicha(pokemon.id);
});

  pokedex.appendChild(div);
}


function abrirMenu(id) {
  pokemonActivo = pokemonGuardados.find(p => p.id === id);
  menuTitle.textContent = `#${pokemonActivo.id} ${pokemonActivo.nombre}`;
  selectGame.value = pokemonActivo.juego;
  quickMenu.classList.remove("hidden");
}

async function abrirFicha(id) {
  pokemonActivo = pokemonGuardados.find(p => p.id === id);
  await completarDatosPokemon(pokemonActivo);

  detailTitle.textContent = `#${pokemonActivo.id} ${pokemonActivo.nombre}`;
  detailImg.src = modoShiny ? pokemonActivo.shiny : pokemonActivo.normal;

  detailShiny.checked = pokemonActivo.shinyConseguido;
  detailWishlist.checked = pokemonActivo.wishlist;
  detailGame.value = pokemonActivo.juego || "";
  detailNote.value = pokemonActivo.nota || "";

  // Tipos
if (detailTypes) {
    detailTypes.innerHTML = "";

    pokemonActivo.tipos.forEach(tipo => {
        const badge = document.createElement("span");
        badge.className = "type-badge";
        badge.textContent = tipo.toUpperCase();
        detailTypes.appendChild(badge);
    });
  }

  // Stats
if (detailStats) {
    detailStats.innerHTML = "";

    pokemonActivo.stats.forEach(stat => {
        const wrapper = document.createElement("div");
        wrapper.className = "stat-row";

        const label = document.createElement("span");
        label.className = "stat-name";
        label.textContent = stat.nombre.toUpperCase();

        const value = document.createElement("span");
        value.className = "stat-value";
        value.textContent = stat.valor;

        const barContainer = document.createElement("div");
        barContainer.className = "stat-bar";

        const bar = document.createElement("div");
        bar.className = "stat-bar-fill";
        bar.style.width = `${Math.min(stat.valor / 255 * 100, 100)}%`;

        barContainer.appendChild(bar);
        wrapper.append(label, value, barContainer);
        detailStats.appendChild(wrapper);
    });
  }

  detailView.classList.remove("hidden");
}
// 🔒 Cerrar ficha (botón)
detailClose.addEventListener("click", (e) => {
    e.stopPropagation();
    detailView.classList.add("hidden");
    pokemonActivo = null;
});
// 🔒 Cerrar ficha tocando el fondo
detailView.addEventListener("mousedown", (e) => {
    if (e.target === detailView) {
        detailView.classList.add("hidden");
        pokemonActivo = null;
    }
});

detailShiny.addEventListener("change", () => {
  if (!pokemonActivo) return;

  pokemonActivo.shinyConseguido = detailShiny.checked;

  // Cambiar sprite al instante
  detailImg.src = detailShiny.checked
    ? pokemonActivo.shiny
    : pokemonActivo.normal;

  actualizarCarta(pokemonActivo);
  guardarDatos();
  actualizarContadores();
});



btnWishlist.addEventListener("click", () => {
    pokemonActivo.wishlist = !pokemonActivo.wishlist;
    actualizarCarta(pokemonActivo);
    guardarDatos();
    renderPokedex();          // ← ya lo tienes
    actualizarContadores();   // ← AÑADE ESTO
});

btnShiny.addEventListener("click", () => {
    pokemonActivo.shinyConseguido = !pokemonActivo.shinyConseguido;
    actualizarCarta(pokemonActivo);
    guardarDatos();
    renderPokedex();          // ← ya lo tienes
    actualizarContadores();   // ← AÑADE ESTO
});

btnClose.addEventListener("click", (e) => {
    e.stopPropagation();
    cerrarMenu();
});

btnClose.addEventListener("mousedown", (e) => {
    e.stopPropagation();
    cerrarMenu();
});

btnClose.addEventListener("touchstart", (e) => {
    e.stopPropagation();
    cerrarMenu();
});

quickMenu.addEventListener("mousedown", (e) => {
    if (e.target === quickMenu) cerrarMenu();
});

function cerrarMenu() {
  quickMenu.classList.add("hidden");
  pokemonActivo = null;
}

function actualizarCarta(pokemon) {
  const carta = document.querySelector(`.pokemon[data-id="${pokemon.id}"]`);
  carta.querySelector(".wishlist").style.display =
    pokemon.wishlist ? "block" : "none";

  carta.querySelector(".shiny-mark").style.display =
    pokemon.shinyConseguido ? "block" : "none";
}

toggleShinyBtn.addEventListener("click", () => {
  modoShiny = !modoShiny;
  actualizarSprites();
});
toggleWishlistBtn.addEventListener("click", () => {
    vistaWishlist = !vistaWishlist;
    renderPokedex();
});
// 🔍 Abrir / cerrar panel de filtros
filterBtn.addEventListener("click", () => {
    filterMenu.classList.remove("hidden");
});

filterClose.addEventListener("click", () => {
    filterMenu.classList.add("hidden");
});
// 🎯 Cambios de filtros
filterGame.addEventListener("change", () => {
    filtroJuego = filterGame.value;
    renderPokedex();
});

filterShiny.addEventListener("change", () => {
    filtroShiny = filterShiny.checked;
    renderPokedex();
});
searchInput.addEventListener("input", () => {
    textoBusqueda = searchInput.value.toLowerCase().trim();
    renderPokedex();
});
loadMoreBtn.addEventListener("click", cargarBloquePokemon);


function actualizarSprites() {
  document.querySelectorAll(".pokemon").forEach(carta => {
    const id = carta.dataset.id;
    const pokemon = pokemonGuardados.find(p => p.id == id);
    const img = carta.querySelector("img");

    img.src = modoShiny ? pokemon.shiny : pokemon.normal;
  });
}

cargarPokemon();

// Activar scroll infinito después de la carga inicial
setTimeout(() => {
    iniciarScrollInfinito();
}, 0);
