import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export const SUPPORTED_LANGUAGES = [
  { code: "de", label: "Deutsch", nativeLabel: "Deutsch" },
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "es", label: "Spanish", nativeLabel: "Espanol" },
  { code: "it", label: "Italian", nativeLabel: "Italiano" },
  { code: "fr", label: "French", nativeLabel: "Francais" },
];

const LANGUAGE_KEY = "yardline-language";
const LANGUAGE_MODE_KEY = "yardline-language-mode";

const TRANSLATIONS = {
  en: {
    "Sprache": "Language",
    "Automatisch": "Automatic",
    "Handy-Sprache übernehmen": "Use phone language",
    "Einstellungen": "Settings",
    "Benachrichtigungen": "Notifications",
    "App Updates": "App Updates",
    "Neue Funktionen und Änderungen ansehen": "View new features and changes",
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
    "Vorschau": "Preview",
    "Speichern": "Save",
    "Erstellen": "Create",
    "Abbrechen": "Cancel",
    "Bearbeiten": "Edit",
    "Aktiv": "Active",
  },
  es: {
    "Sprache": "Idioma",
    "Automatisch": "Automatico",
    "Handy-Sprache übernehmen": "Usar idioma del movil",
    "Einstellungen": "Ajustes",
    "Benachrichtigungen": "Notificaciones",
    "App Updates": "Actualizaciones",
    "Updates": "Actualizaciones",
    "Keine Updates verfügbar": "No hay actualizaciones disponibles",
    "Neues Update": "Nueva actualizacion",
    "Update bearbeiten": "Editar actualizacion",
    "Version": "Version",
    "Titel": "Titulo",
    "Text": "Texto",
    "Typ": "Tipo",
    "Fix": "Correccion",
    "Update": "Actualizacion",
    "Performance": "Rendimiento",
    "Vorschau": "Vista previa",
    "Speichern": "Guardar",
    "Erstellen": "Crear",
    "Abbrechen": "Cancelar",
    "Bearbeiten": "Editar",
    "Aktiv": "Activo",
  },
  it: {
    "Sprache": "Lingua",
    "Automatisch": "Automatico",
    "Handy-Sprache übernehmen": "Usa lingua del telefono",
    "Einstellungen": "Impostazioni",
    "Benachrichtigungen": "Notifiche",
    "App Updates": "Aggiornamenti app",
    "Updates": "Aggiornamenti",
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
    "Vorschau": "Anteprima",
    "Speichern": "Salva",
    "Erstellen": "Crea",
    "Abbrechen": "Annulla",
    "Bearbeiten": "Modifica",
    "Aktiv": "Attivo",
  },
  fr: {
    "Sprache": "Langue",
    "Automatisch": "Automatique",
    "Handy-Sprache übernehmen": "Utiliser la langue du telephone",
    "Einstellungen": "Parametres",
    "Benachrichtigungen": "Notifications",
    "App Updates": "Mises a jour",
    "Updates": "Mises a jour",
    "Keine Updates verfügbar": "Aucune mise à jour disponible",
    "Neues Update": "Nouvelle mise à jour",
    "Update bearbeiten": "Modifier la mise à jour",
    "Version": "Version",
    "Titel": "Titre",
    "Text": "Texte",
    "Typ": "Type",
    "Fix": "Correctif",
    "Update": "Mise a jour",
    "Performance": "Performance",
    "Vorschau": "Apercu",
    "Speichern": "Enregistrer",
    "Erstellen": "Creer",
    "Abbrechen": "Annuler",
    "Bearbeiten": "Modifier",
    "Aktiv": "Actif",
  },
};

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

  return TRANSLATIONS[language]?.[text] || text;
}

export function I18nProvider({ children }) {
  const initial = useMemo(getInitialLanguage, []);
  const [language, setLanguageState] = useState(initial.language);
  const [mode, setModeState] = useState(initial.mode);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
    }
  }, [language]);

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
