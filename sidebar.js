// === Encuesta en sidebar ===
document.addEventListener("DOMContentLoaded", () => {
  const pollForm = document.querySelector("#poll-form");

  if (pollForm) {
    pollForm.addEventListener("submit", function (e) {
      e.preventDefault(); // evita recarga

      // Detectar idioma actual desde localStorage (no del <html lang>)
      const STORAGE_KEY = "filoling_lang";
      const lang = localStorage.getItem(STORAGE_KEY) || "es";

      // Definir mensajes en ambos idiomas
      const msgEs = "✅ ¡Gracias por tu opinión!";
      const msgEn = "✅ Thank you for your opinion!";

      // Reemplazar formulario con el mensaje traducido correcto
      pollForm.outerHTML = `
        <p class="poll-thanks"
           data-es="${msgEs}"
           data-en="${msgEn}">
           ${lang === "en" ? msgEn : msgEs}
        </p>
      `;

    });
  }
});
