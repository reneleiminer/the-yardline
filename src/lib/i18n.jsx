import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export const SUPPORTED_LANGUAGES = [
  { code: "de", label: "Deutsch", nativeLabel: "Deutsch" },
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "es", label: "Spanish", nativeLabel: "Español" },
  { code: "it", label: "Italian", nativeLabel: "Italiano" },
  { code: "fr", label: "French", nativeLabel: "Français" },
];

const LANGUAGE_KEY = "yardline-language";
const LANGUAGE_MODE_KEY = "yardline-language-mode";

const BASE_TRANSLATIONS = {
  en: {
    "Sprache": "Language",
    "Automatisch": "Automatic",
    "Handy-Sprache übernehmen": "Use phone language",
    "Deutsch": "German",
    "Einstellungen": "Settings",
    "Benachrichtigungen": "Notifications",
    "App Updates": "App Updates",
    "Neue Funktionen und Änderungen ansehen": "View new features and changes",
    "The Yardline": "The Yardline",
    "Updates": "Updates",
    "Neue Funktionen, Verbesserungen und wichtige Änderungen.": "New features, improvements and important changes.",
    "Keine Updates verfügbar": "No updates available",
    "Keine Updates erstellt": "No updates created",
    "Neues Update": "New update",
    "Update bearbeiten": "Edit update",
    "Version": "Version",
    "Titel": "Title",
    "Text": "Text",
    "Typ": "Type",
    "Fix": "Fix",
    "Update": "Update",
    "Performance": "Performance",
    "Admin": "Admin",
    "Content": "Content",
    "Veröffentlicht": "Published",
    "Auf der Updates-Seite anzeigen": "Show on the updates page",
    "Vorschau": "Preview",
    "Speichern": "Save",
    "Erstellen": "Create",
    "Abbrechen": "Cancel",
    "Bearbeiten": "Edit",
    "Aktiv": "Active",
    "Live Games": "Live Games",
    "Game Highlights": "Game Highlights",
    "GameDay Shots": "GameDay Shots",
    "Kommende Spiele": "Upcoming Games",
    "Siegesserien": "Win Streaks",
    "News": "News",
    "Spiele": "Games",
    "Tabellen": "Standings",
    "Wettbewerbe": "Competitions",
    "Profil": "Profile",
    "Support": "Support",
    "Rechtliches": "Legal",
    "Einloggen": "Log in",
    "Benutzername": "Username",
    "Passwort": "Password",
    "Geplant": "Scheduled",
    "Live": "Live",
    "Final": "Final",
    "Abgesagt": "Cancelled",
    "Heute": "Today",
    "Kommend": "Upcoming",
    "Vergangen": "Past",
    "Alle": "All",
    "Keine Live Games": "No live games",
    "Keine Highlights": "No highlights",
    "Keine kommenden Spiele": "No upcoming games",
    "Noch keine GameDay Shots": "No GameDay Shots yet",
    "Noch keine Daten": "No data yet",
    "Besucher": "Visitors",
    "Sessions": "Sessions",
    "Pageviews": "Pageviews",
    "Seiten": "Pages",
    "Geräte": "Devices",
    "Traffic Quellen": "Traffic Sources",
    "Top Seiten": "Top Pages",
    "Reichweite": "Reach",
    "Werbewert": "Ad Value",
  },
  es: {
    "Sprache": "Idioma",
    "Automatisch": "Automático",
    "Handy-Sprache übernehmen": "Usar idioma del móvil",
    "Deutsch": "Alemán",
    "Einstellungen": "Ajustes",
    "Benachrichtigungen": "Notificaciones",
    "App Updates": "Actualizaciones",
    "Neue Funktionen und Änderungen ansehen": "Ver nuevas funciones y cambios",
    "Updates": "Actualizaciones",
    "Neue Funktionen, Verbesserungen und wichtige Änderungen.": "Nuevas funciones, mejoras y cambios importantes.",
    "Keine Updates verfügbar": "No hay actualizaciones disponibles",
    "Keine Updates erstellt": "No se han creado actualizaciones",
    "Neues Update": "Nueva actualización",
    "Update bearbeiten": "Editar actualización",
    "Version": "Versión",
    "Titel": "Título",
    "Text": "Texto",
    "Typ": "Tipo",
    "Fix": "Corrección",
    "Update": "Actualización",
    "Performance": "Rendimiento",
    "Admin": "Admin",
    "Content": "Contenido",
    "Veröffentlicht": "Publicado",
    "Auf der Updates-Seite anzeigen": "Mostrar en la página de actualizaciones",
    "Vorschau": "Vista previa",
    "Speichern": "Guardar",
    "Erstellen": "Crear",
    "Abbrechen": "Cancelar",
    "Bearbeiten": "Editar",
    "Aktiv": "Activo",
    "Live Games": "Partidos en vivo",
    "Game Highlights": "Highlights",
    "GameDay Shots": "Fotos del partido",
    "Kommende Spiele": "Próximos partidos",
    "Siegesserien": "Rachas ganadoras",
    "News": "Noticias",
    "Spiele": "Partidos",
    "Tabellen": "Clasificaciones",
    "Wettbewerbe": "Competiciones",
    "Profil": "Perfil",
    "Support": "Soporte",
    "Rechtliches": "Legal",
    "Einloggen": "Iniciar sesión",
    "Benutzername": "Usuario",
    "Passwort": "Contraseña",
    "Geplant": "Programado",
    "Live": "En vivo",
    "Final": "Final",
    "Abgesagt": "Cancelado",
    "Heute": "Hoy",
    "Kommend": "Próximos",
    "Vergangen": "Pasados",
    "Alle": "Todos",
    "Keine Live Games": "No hay partidos en vivo",
    "Keine Highlights": "No hay highlights",
    "Keine kommenden Spiele": "No hay próximos partidos",
    "Noch keine Daten": "Sin datos todavía",
    "Besucher": "Visitantes",
    "Sessions": "Sesiones",
    "Pageviews": "Vistas",
    "Geräte": "Dispositivos",
    "Traffic Quellen": "Fuentes de tráfico",
    "Top Seiten": "Páginas principales",
  },
  it: {
    "Sprache": "Lingua",
    "Automatisch": "Automatico",
    "Handy-Sprache übernehmen": "Usa lingua del telefono",
    "Deutsch": "Tedesco",
    "Einstellungen": "Impostazioni",
    "Benachrichtigungen": "Notifiche",
    "App Updates": "Aggiornamenti app",
    "Updates": "Aggiornamenti",
    "Neue Funktionen, Verbesserungen und wichtige Änderungen.": "Nuove funzioni, miglioramenti e modifiche importanti.",
    "Keine Updates verfügbar": "Nessun aggiornamento disponibile",
    "Neues Update": "Nuovo aggiornamento",
    "Update bearbeiten": "Modifica aggiornamento",
    "Version": "Versione",
    "Titel": "Titolo",
    "Text": "Testo",
    "Typ": "Tipo",
    "Fix": "Correzione",
    "Update": "Aggiornamento",
    "Performance": "Prestazioni",
    "Veröffentlicht": "Pubblicato",
    "Vorschau": "Anteprima",
    "Speichern": "Salva",
    "Erstellen": "Crea",
    "Abbrechen": "Annulla",
    "Bearbeiten": "Modifica",
    "Aktiv": "Attivo",
    "Live Games": "Partite live",
    "Game Highlights": "Highlights",
    "GameDay Shots": "Scatti partita",
    "Kommende Spiele": "Prossime partite",
    "Siegesserien": "Serie vincenti",
    "News": "Notizie",
    "Spiele": "Partite",
    "Tabellen": "Classifiche",
    "Wettbewerbe": "Competizioni",
    "Profil": "Profilo",
    "Support": "Supporto",
    "Rechtliches": "Legale",
    "Einloggen": "Accedi",
    "Benutzername": "Nome utente",
    "Passwort": "Password",
    "Geplant": "Programmato",
    "Live": "Live",
    "Final": "Finale",
    "Abgesagt": "Annullato",
    "Heute": "Oggi",
    "Kommend": "In arrivo",
    "Vergangen": "Passate",
    "Alle": "Tutti",
  },
  fr: {
    "Sprache": "Langue",
    "Automatisch": "Automatique",
    "Handy-Sprache übernehmen": "Utiliser la langue du téléphone",
    "Deutsch": "Allemand",
    "Einstellungen": "Paramètres",
    "Benachrichtigungen": "Notifications",
    "App Updates": "Mises à jour",
    "Updates": "Mises à jour",
    "Neue Funktionen, Verbesserungen und wichtige Änderungen.": "Nouvelles fonctions, améliorations et changements importants.",
    "Keine Updates verfügbar": "Aucune mise à jour disponible",
    "Neues Update": "Nouvelle mise à jour",
    "Update bearbeiten": "Modifier la mise à jour",
    "Version": "Version",
    "Titel": "Titre",
    "Text": "Texte",
    "Typ": "Type",
    "Fix": "Correctif",
    "Update": "Mise à jour",
    "Performance": "Performance",
    "Veröffentlicht": "Publié",
    "Vorschau": "Aperçu",
    "Speichern": "Enregistrer",
    "Erstellen": "Créer",
    "Abbrechen": "Annuler",
    "Bearbeiten": "Modifier",
    "Aktiv": "Actif",
    "Live Games": "Matchs en direct",
    "Game Highlights": "Temps forts",
    "GameDay Shots": "Photos de match",
    "Kommende Spiele": "Prochains matchs",
    "Siegesserien": "Séries de victoires",
    "News": "Actualités",
    "Spiele": "Matchs",
    "Tabellen": "Classements",
    "Wettbewerbe": "Compétitions",
    "Profil": "Profil",
    "Support": "Support",
    "Rechtliches": "Mentions légales",
    "Einloggen": "Connexion",
    "Benutzername": "Nom d'utilisateur",
    "Passwort": "Mot de passe",
    "Geplant": "Planifié",
    "Live": "En direct",
    "Final": "Terminé",
    "Abgesagt": "Annulé",
    "Heute": "Aujourd'hui",
    "Kommend": "À venir",
    "Vergangen": "Passés",
    "Alle": "Tous",
  },
};

const TRANSLATABLE_ATTRS = ["placeholder", "aria-label", "title", "alt"];
const SKIP_SELECTOR = "script,style,svg,canvas,video,input,textarea,[data-i18n-skip='true']";
const I18nContext = createContext(null);

function normalizeLang(value) {
  const code = String(value || "").slice(0, 2).toLowerCase();
  return SUPPORTED_LANGUAGES.some(item => item.code === code) ? code : "de";
}

function getDeviceLanguage() {
  if (typeof navigator === "undefined") return "de";
  return normalizeLang(navigator.language || navigator.languages?.[0] || "de");
}

function getInitialLanguage() {
  if (typeof window === "undefined") return { language: "de", mode: "auto" };

  const mode = window.localStorage.getItem(LANGUAGE_MODE_KEY) || "auto";
  const stored = window.localStorage.getItem(LANGUAGE_KEY);

  return {
    language: mode === "auto" ? getDeviceLanguage() : normalizeLang(stored || "de"),
    mode,
  };
}

function translateValue(value, language) {
  const text = String(value || "");
  if (!text || language === "de") return text;

  const dictionary = BASE_TRANSLATIONS[language] || {};
  const trimmed = text.trim();
  const direct = dictionary[trimmed];

  if (direct) {
    return text.replace(trimmed, direct);
  }

  let next = text;

  Object.entries(dictionary)
    .sort((a, b) => b[0].length - a[0].length)
    .forEach(([source, target]) => {
      next = next.replaceAll(source, target);
    });

  return next;
}

function shouldTranslateTextNode(node) {
  const parent = node.parentElement;
  if (!parent || parent.closest(SKIP_SELECTOR)) return false;
  const text = node.nodeValue || "";
  if (!text.trim()) return false;
  if (text.trim().length > 90) return false;
  return /[A-Za-zÄÖÜäöüß]/.test(text);
}

function applyTranslations(root, language) {
  if (typeof document === "undefined") return;

  if (language === "de") {
    document.querySelectorAll("[data-i18n-original]").forEach(element => {
      element.textContent = element.getAttribute("data-i18n-original") || element.textContent;
      element.removeAttribute("data-i18n-original");
    });

    document.querySelectorAll("[data-i18n-attrs]").forEach(element => {
      try {
        const originalAttrs = JSON.parse(element.getAttribute("data-i18n-attrs") || "{}");
        Object.entries(originalAttrs).forEach(([attr, value]) => element.setAttribute(attr, value));
      } catch {
        // noop
      }
      element.removeAttribute("data-i18n-attrs");
    });
    return;
  }

  const walker = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT);
  const textNodes = [];

  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (shouldTranslateTextNode(node)) textNodes.push(node);
  }

  textNodes.forEach(node => {
    const parent = node.parentElement;
    if (!parent) return;

    const original = parent.getAttribute("data-i18n-original") || node.nodeValue;
    parent.setAttribute("data-i18n-original", original);
    const translated = translateValue(original, language);
    if (node.nodeValue !== translated) {
      node.nodeValue = translated;
    }
  });

  document.querySelectorAll("input,textarea,button,img,[aria-label],[title]").forEach(element => {
    if (element.closest("[data-i18n-skip='true']")) return;

    const originals = element.getAttribute("data-i18n-attrs");
    const originalAttrs = originals ? JSON.parse(originals) : {};
    let changed = false;

    TRANSLATABLE_ATTRS.forEach(attr => {
      const value = element.getAttribute(attr);
      if (!value || value.length > 90) return;

      if (!originalAttrs[attr]) originalAttrs[attr] = value;
      const translated = translateValue(originalAttrs[attr], language);

      if (translated !== value) {
        element.setAttribute(attr, translated);
        changed = true;
      }
    });

    if (changed) {
      element.setAttribute("data-i18n-attrs", JSON.stringify(originalAttrs));
    }
  });
}

export function I18nProvider({ children }) {
  const initial = useMemo(getInitialLanguage, []);
  const [language, setLanguageState] = useState(initial.language);
  const [mode, setModeState] = useState(initial.mode);
  const observerRef = useRef(null);
  const translateScheduledRef = useRef(false);

  const runTranslator = useCallback(() => {
    if (translateScheduledRef.current) return;

    translateScheduledRef.current = true;
    window.requestAnimationFrame(() => {
      translateScheduledRef.current = false;
      applyTranslations(document.body, language);
    });
  }, [language]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    document.documentElement.lang = language;
    runTranslator();

    observerRef.current?.disconnect();
    observerRef.current = new MutationObserver(runTranslator);
    observerRef.current.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observerRef.current?.disconnect();
  }, [language, runTranslator]);

  const setLanguage = useCallback((nextLanguage, nextMode = "manual") => {
    const normalized = normalizeLang(nextLanguage);
    window.localStorage.setItem(LANGUAGE_KEY, normalized);
    window.localStorage.setItem(LANGUAGE_MODE_KEY, nextMode);
    setModeState(nextMode);
    setLanguageState(nextMode === "auto" ? getDeviceLanguage() : normalized);
  }, []);

  const value = useMemo(() => ({
    language,
    mode,
    languages: SUPPORTED_LANGUAGES,
    setLanguage,
    t: valueToTranslate => translateValue(valueToTranslate, language),
  }), [language, mode, setLanguage]);

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside I18nProvider");
  return context;
}
