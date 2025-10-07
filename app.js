// app.js - FiloLing (mejorado y más tolerante)
// ------------------------------------------
// Soporta:
//  - botones dentro de .lang (texto "ES"/"EN" o data-lang="es|en")
//  - botones con data-lang="es"/"en"
//  - botones con onclick="setLanguage('es')" (seguros para compatibilidad)
// Traduce elementos que contengan data-es / data-en
// Guarda la preferencia en localStorage ("filoling_lang")
// ------------------------------------------

(function () {
  const STORAGE_KEY = "filoling_lang";

  // Detectar idioma por defecto (si no hay uno guardado)
  let currentLang = localStorage.getItem(STORAGE_KEY)
    || (navigator.language && navigator.language.toLowerCase().startsWith("en") ? "en" : "es");

  // Actualiza estado visual de botones (class is-active, aria-pressed)
  function updateLangButtonsUI(lang) {
    // botones dentro de .lang
    const langBtns = document.querySelectorAll(".lang button, button[data-lang]");
    langBtns.forEach(btn => {
      // Determina idioma del botón: data-lang o texto (ES/EN)
      let btnLang = btn.getAttribute("data-lang");
      if (!btnLang) {
        const txt = (btn.textContent || "").trim().toLowerCase();
        if (txt.startsWith("es")) btnLang = "es";
        else if (txt.startsWith("en")) btnLang = "en";
      }
      if (btnLang === lang) {
        btn.classList.add("is-active");
        btn.setAttribute("aria-pressed", "true");
      } else {
        btn.classList.remove("is-active");
        btn.setAttribute("aria-pressed", "false");
      }
    });
  }

  // Traducción de atributos auxiliares como data-en-title / data-es-title
  function transferAuxAttributes(el, lang) {
    const auxAttrs = ["title", "alt", "aria-label", "placeholder"];
    auxAttrs.forEach(attr => {
      // formats: data-en-title  OR data-title-en
      const v1 = el.getAttribute(`data-${lang}-${attr}`);
      const v2 = el.getAttribute(`data-${attr}-${lang}`);
      const value = v1 ?? v2;
      if (value !== null && value !== undefined) {
        try { el.setAttribute(attr, value); } catch (e) { /* ignore */ }
      }
    });
  }

  // Función que cambia el idioma y actualiza todo el DOM
  function setLanguage(lang) {
    if (!lang) return;
    lang = lang.toLowerCase();
    currentLang = lang;
    localStorage.setItem(STORAGE_KEY, lang);

    // Todos los elementos que tienen alguno de los atributos data-es/data-en
    const els = document.querySelectorAll("[data-es], [data-en]");
    els.forEach(el => {
      // Prioriza data-{lang}, si no existe hace fallback al otro idioma
      const desired = el.getAttribute(`data-${lang}`);
      let text = desired;
      if (text === null) {
        // fallback al otro idioma si existe
        const other = (lang === "es") ? el.getAttribute("data-en") : el.getAttribute("data-es");
        text = other ?? "";
      }
      // Si es input/textarea -> placeholder/value
      const tag = el.tagName.toLowerCase();
      if (tag === "input" || tag === "textarea") {
        // si tiene placeholder original o atributo data-*-placeholder, úsalo como placeholder
        if (el.hasAttribute("placeholder") || el.getAttribute(`data-${lang}-placeholder`) !== null || el.getAttribute(`data-placeholder-${lang}`) !== null) {
          el.placeholder = text;
        } else {
          el.value = text;
        }
      } else {
        // Usamos innerHTML para permitir pequeñas marcas (<em>, <strong>, etc.)
        el.innerHTML = text;
      }

      // Transfiere atributos auxiliares si existen (title, alt, aria-label, placeholder)
      transferAuxAttributes(el, lang);
    });

    // Actualiza UI de botones
    updateLangButtonsUI(lang);
    // posible hook: disparar evento para que otros scripts reaccionen
    document.dispatchEvent(new CustomEvent("filoling:langChanged", { detail: { lang } }));
    // debug
    // console.log("Idioma aplicado:", lang);
  }

  // Make available globally for inline onclick="setLanguage('en')"
  window.setLanguage = setLanguage;

  // Listener para inicializar y enganchar botones
  document.addEventListener("DOMContentLoaded", () => {
    // 1) Botones dentro de .lang
    const langContainerBtns = document.querySelectorAll(".lang button");
    langContainerBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const dataLang = btn.getAttribute("data-lang");
        if (dataLang) setLanguage(dataLang);
        else {
          const txt = (btn.textContent || "").trim().toLowerCase();
          if (txt.startsWith("es")) setLanguage("es");
          else if (txt.startsWith("en")) setLanguage("en");
        }
      });
    });

    // 2) Botones con data-lang fuera de .lang
    const anyDataLangBtns = document.querySelectorAll("button[data-lang]");
    anyDataLangBtns.forEach(btn => {
      // si ya está en .lang lo ignora (evita doble bind)
      if (!btn.closest(".lang")) {
        btn.addEventListener("click", () => setLanguage(btn.getAttribute("data-lang")));
      }
    });

    // 3) Botones con onclick="setLanguage('xx')" (compatibilidad con HTML antiguo)
    const inlineBtns = Array.from(document.querySelectorAll("button[onclick]")).filter(b => {
      const c = b.getAttribute("onclick") || "";
      return /setLanguage\s*\(\s*['"]?(es|en)['"]?\s*\)/i.test(c);
    });
    inlineBtns.forEach(btn => {
      // add listener in addition to inline onclick (defensive)
      btn.addEventListener("click", () => {
        const c = btn.getAttribute("onclick") || "";
        const m = c.match(/setLanguage\s*\(\s*['"]?(es|en)['"]?\s*\)/i);
        if (m) setLanguage(m[1].toLowerCase());
      });
    });

    // Aplicar idioma almacenado al cargar
    setLanguage(currentLang);
  });

})();


// ====================
// BUSCADOR
// ====================
const searchInput = document.getElementById("search-input");
const searchBtn = document.querySelector(".search-btn");
const resultsBox = document.getElementById("search-results");

// Función: busca coincidencias y muestra panel
function doSearch() {
  const query = searchInput.value.trim().toLowerCase();
  resultsBox.innerHTML = ""; // limpiar resultados

  if (!query) {
    resultsBox.style.display = "none";
    return;
  }

  const elements = document.querySelectorAll("main h2, main p, main li, aside p, aside li");
  let results = [];

  elements.forEach(el => {
    if (el.textContent.toLowerCase().includes(query)) {
      results.push({ element: el, text: el.textContent.trim().slice(0, 120) + "..." });
    }
  });

  if (results.length > 0) {
    resultsBox.style.display = "block";
    results.slice(0, 8).forEach(res => {
      const p = document.createElement("p");
      p.textContent = res.text;

      //  al hacer clic, desplazamos hasta el elemento original
      p.addEventListener("click", () => {
        res.element.scrollIntoView({ behavior: "smooth", block: "center" });
        res.element.style.backgroundColor = "yellow";
        setTimeout(() => (res.element.style.backgroundColor = ""), 2000);
        resultsBox.style.display = "none"; // cerrar panel
      });

      resultsBox.appendChild(p);
    });
  } else {
    resultsBox.style.display = "block";
    resultsBox.innerHTML = `<p>Sin resultados</p>`;
  }
}

// Eventos
searchBtn.addEventListener("click", doSearch);
searchInput.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    e.preventDefault();
    doSearch();
  }
});

// Cerrar panel si haces click fuera
document.addEventListener("click", e => {
  if (!resultsBox.contains(e.target) && e.target !== searchInput) {
    resultsBox.style.display = "none";
  }
});


// ====================
// MODO OSCURO / CLARO
// ====================
const themeToggle = document.querySelector(".theme-toggle");
const rootElement = document.documentElement;

// Cargar tema guardado
const savedTheme = localStorage.getItem("theme");
if (savedTheme) {
  rootElement.setAttribute("data-theme", savedTheme);
  themeToggle.textContent = savedTheme === "dark" ? "☀️" : "🌙";
}

// Cambiar tema al pulsar botón
themeToggle.addEventListener("click", () => {
  const currentTheme = rootElement.getAttribute("data-theme");
  const newTheme = currentTheme === "dark" ? "light" : "dark";

  rootElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);

  // Cambia icono
  themeToggle.textContent = newTheme === "dark" ? "☀️" : "🌙";
});


// ====================================
// FRASE DINAMICA EN EL HERO DEL INDEX
// ====================================
  document.addEventListener("DOMContentLoaded", function () {
    const quotes = [
  // Nietzsche
  { es: "«Dios ha muerto. Y nosotros lo hemos matado.» — Nietzsche", en: "«God is dead. And we have killed him.» — Nietzsche" },
  { es: "«Quien con monstruos lucha cuide de no convertirse a su vez en monstruo.» — Nietzsche", en: "«He who fights with monsters should look to it that he himself does not become a monster.» — Nietzsche" },

  // Simone de Beauvoir
  { es: "«No se nace mujer: se llega a serlo.» — Simone de Beauvoir", en: "«One is not born, but rather becomes, a woman.» — Simone de Beauvoir" },
  { es: "«El opresor no sería tan fuerte si no tuviese cómplices entre los propios oprimidos.» — Simone de Beauvoir", en: "«The oppressor would not be so strong if he did not have accomplices among the oppressed themselves.» — Simone de Beauvoir" },

  // Frantz Fanon
  { es: "«Cada generación debe descubrir su misión.» — Frantz Fanon", en: "«Each generation must discover its mission.» — Frantz Fanon" },
  { es: "«El racismo no es un accidente, es un sistema.» — Frantz Fanon", en: "«Racism is not an accident, it is a system.» — Frantz Fanon" },

  // Amartya Sen
  { es: "«El desarrollo es libertad.» — Amartya Sen", en: "«Development is freedom.» — Amartya Sen" },
  { es: "«La igualdad en la libertad es esencial para la justicia social.» — Amartya Sen", en: "«Equality in freedom is essential for social justice.» — Amartya Sen" },

  // Platón
  { es: "«La filosofía es el arte de vivir.» — Platón", en: "«Philosophy is the art of living.» — Plato" },
  { es: "«El mayor castigo para quienes no se interesan por la política es ser gobernados por los peores.» — Platón", en: "«The heaviest penalty for not caring about politics is to be governed by the worst.» — Plato" },

  // Aristóteles
  { es: "«El hombre es un animal político.» — Aristóteles", en: "«Man is a political animal.» — Aristotle" },
  { es: "«La amistad es un alma que habita en dos cuerpos.» — Aristóteles", en: "«Friendship is a single soul dwelling in two bodies.» — Aristotle" },

  // Karl Marx
  { es: "«Los filósofos no han hecho más que interpretar el mundo de diversos modos; de lo que se trata es de transformarlo.» — Karl Marx", en: "«The philosophers have only interpreted the world in various ways; the point, however, is to change it.» — Karl Marx" },

  // Hannah Arendt
  { es: "«El mal es la ausencia de pensamiento.» — Hannah Arendt", en: "«Evil is the absence of thought.» — Hannah Arendt" },
  { es: "«El poder corresponde a la capacidad humana de actuar en concierto.» — Hannah Arendt", en: "«Power corresponds to the human ability not just to act but to act in concert.» — Hannah Arendt" },
  
  // Sócrates
  { es: "«Solo sé que no sé nada.» — Sócrates", en: "«The only true wisdom is in knowing you know nothing.» — Socrates" },
  { es: "«Una vida sin examen no merece ser vivida.» — Sócrates", en: "«The unexamined life is not worth living.» — Socrates" },

  // René Descartes
  { es: "«Pienso, luego existo.» — René Descartes", en: "«I think, therefore I am.» — René Descartes" },
  { es: "«Para investigar la verdad es preciso dudar, en cuanto sea posible, de todas las cosas.» — René Descartes", en: "«If you would be a real seeker after truth, it is necessary that at least once in your life you doubt, as far as possible, all things.» — René Descartes" },

  // Jean-Jacques Rousseau
  { es: "«El hombre nace libre, pero en todos lados está encadenado.» — Jean-Jacques Rousseau", en: "«Man is born free, and everywhere he is in chains.» — Jean-Jacques Rousseau" },
  { es: "«La libertad no consiste en hacer lo que uno quiere, sino en no estar sometido a la voluntad de otro.» — Jean-Jacques Rousseau", en: "«Freedom is not doing what you want, but not being subject to the will of another.» — Jean-Jacques Rousseau" },

  // Michel Foucault
  { es: "«Donde hay poder, hay resistencia.» — Michel Foucault", en: "«Where there is power, there is resistance.» — Michel Foucault" },
  { es: "«El conocimiento no es para comprender: el conocimiento es para cortar.» — Michel Foucault", en: "«Knowledge is not made for understanding; it is made for cutting.» — Michel Foucault" },

  // John Stuart Mill
  { es: "«La libertad de cada uno termina donde empieza la de los demás.» — John Stuart Mill", en: "«The liberty of the individual must be thus far limited; he must not make himself a nuisance to other people.» — John Stuart Mill" },
  { es: "«Genuina justicia significa igualdad de consideración hacia todos.» — John Stuart Mill", en: "«Genuine justice means equal consideration to all.» — John Stuart Mill" },

  // Immanuel Kant
  { es: "«Obra solo según aquella máxima por la cual puedas querer que al mismo tiempo se convierta en ley universal.» — Immanuel Kant", en: "«Act only according to that maxim whereby you can, at the same time, will that it should become a universal law.» — Immanuel Kant" },
  { es: "«La libertad es la capacidad de obedecer la ley que uno mismo se ha dado.» — Immanuel Kant", en: "«Freedom is the ability to obey the law that one has prescribed for oneself.» — Immanuel Kant" }
];


    const quoteElement = document.getElementById("hero-quote");
  if (!quoteElement) return;

  let index = 0;
  const intervalMs = 7000; // cada 7s (puedes ajustar)

  // Devuelve el idioma actual consultando localStorage (fuente de verdad)
  function getCurrentLang() {
    return localStorage.getItem("filoling_lang") || "es";
  }

  // Muestra la cita actual (con fade)
  function showQuote() {
    const q = quotes[index];
    const lang = getCurrentLang();

    // Fade out
    quoteElement.style.transition = "opacity 0.35s ease";
    quoteElement.style.opacity = 0;

    setTimeout(() => {
      // Actualizamos atributos bilingües (útiles para setLanguage también)
      quoteElement.setAttribute("data-es", q.es);
      quoteElement.setAttribute("data-en", q.en);

      // Insertamos en el idioma correcto
      quoteElement.innerHTML = lang === "en" ? q.en : q.es;

      // Fade in
      quoteElement.style.opacity = 1;

      // avanzar índice
      index = (index + 1) % quotes.length;
    }, 350); // debe coincidir con el fade out
  }

  // Mostrar la primera cita inmediatamente
  showQuote();

  // Intervalo para rotar citas
  const rot = setInterval(showQuote, intervalMs);

  // Cuando el idioma cambia (evento despachado por app.js), actualizamos la cita visible.
  // Esto evita que el usuario tenga que volver a pulsar EN/ES
  document.addEventListener("filoling:langChanged", (e) => {
    // Tomamos el idioma nuevo del detalle del evento si viene, si no del localStorage
    const newLang = (e && e.detail && e.detail.lang) ? e.detail.lang : getCurrentLang();

    // Actualizar el texto actual (no tocar el index)
    const currentEs = quoteElement.getAttribute("data-es");
    const currentEn = quoteElement.getAttribute("data-en");

    if (currentEs || currentEn) {
      // hacemos un pequeño fade para que sea suave
      quoteElement.style.opacity = 0;
      setTimeout(() => {
        quoteElement.innerHTML = newLang === "en" ? (currentEn || currentEs) : (currentEs || currentEn);
        quoteElement.style.opacity = 1;
      }, 250);
    } else {
      // Si por alguna razón no existían atributos, forzamos un showQuote inmediato
      showQuote();
    }
  });

  // Si necesitas detener la rotación cuando el usuario abandona la pestaña
  window.addEventListener("blur", () => clearInterval(rot));
});