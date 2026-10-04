import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Minimal i18n — English, Hindi (हिन्दी) and Marathi (मराठी).
 *
 * Scope: the shared chrome every screen shows — sidebar, topbar, common
 * buttons, the login page and the settings centre. Pages adopt it
 * incrementally; until a string is translated the English fallback is used,
 * so a partial rollout never blanks the UI.
 *
 * The language is persisted in localStorage and mirrored to the backend
 * settings (`language` field) when the settings page saves, so the choice
 * survives reloads and is visible to the server.
 */

const STORAGE_KEY = 'sesa.language';

const dictionaries = {
  en: {
    nav: {
      dashboard: 'Dashboard',
      students: 'Students',
      halls: 'Halls & Rooms',
      exams: 'Exams',
      generate: 'Generate Seating',
      hallPlan: 'Hall Plan Viewer',
      reports: 'Reports',
      analytics: 'Analytics',
      audit: 'Audit Trail',
      faculty: 'Faculty Management',
      settings: 'Settings',
      myDuties: 'My Duties',
      myHallPlan: 'Hall Plan',
      attendance: 'Attendance Sheet',
      notifications: 'Notifications',
      profile: 'Profile',
      examinationCell: 'Examination Cell',
      invigilatorPortal: 'Invigilator Portal',
      collapse: 'Collapse',
      signOut: 'Sign out',
    },
    common: {
      save: 'Save',
      cancel: 'Cancel',
      search: 'Search',
      refresh: 'Refresh',
      loading: 'Loading…',
      retry: 'Retry',
      back: 'Back',
      next: 'Next',
      close: 'Close',
      viewAll: 'View all',
      download: 'Download',
      print: 'Print',
      publish: 'Publish',
      published: 'Published',
      delete: 'Delete',
      edit: 'Edit',
      add: 'Add',
      actions: 'Actions',
      status: 'Status',
      date: 'Date',
      all: 'All',
      none: 'None',
      yes: 'Yes',
      no: 'No',
    },
    login: {
      title: 'Sign in',
      subtitle: 'Examination seating, invigilation and reports — all in one place.',
      signingInAs: 'Signing in as',
      email: 'Email address',
      password: 'Password',
      signIn: 'Sign in',
      signingIn: 'Signing in…',
      admin: 'Examination Cell',
      faculty: 'Faculty',
      adminHint: 'Full access to students, halls, exams, seating and duties.',
      facultyHint: 'Your duties, hall plans and attendance sheets.',
      demoAccounts: 'Demo accounts',
      fill: 'Fill',
      invalid: 'Invalid email or password',
      sessionExpired: 'Your session has expired. Please sign in again.',
    },
    settings: {
      title: 'Settings',
      profile: 'Profile',
      appearance: 'Appearance',
      notifications: 'Notifications',
      institution: 'Institution',
      theme: 'Theme',
      light: 'Light',
      dark: 'Dark',
      language: 'Language',
      saveProfile: 'Save profile',
      saved: 'Saved',
      unsaved: 'You have unsaved changes',
    },
    states: {
      loading: 'Loading…',
      error: 'Something went wrong',
      empty: 'Nothing here yet',
      noResults: 'No results found',
      networkDown: 'Cannot reach the backend. Is it running?',
    },
  },

  hi: {
    nav: {
      dashboard: 'डैशबोर्ड',
      students: 'विद्यार्थी',
      halls: 'हॉल और कक्ष',
      exams: 'परीक्षा',
      generate: 'सीटिंग बनाएं',
      hallPlan: 'हॉल प्लान देखें',
      reports: 'रिपोर्ट',
      analytics: 'विश्लेषण',
      audit: 'ऑडिट ट्रेल',
      faculty: 'शिक्षक प्रबंधन',
      settings: 'सेटिंग्स',
      myDuties: 'मेरे कर्तव्य',
      myHallPlan: 'हॉल प्लान',
      attendance: 'उपस्थिति पत्रक',
      notifications: 'सूचनाएं',
      profile: 'प्रोफ़ाइल',
      examinationCell: 'परीक्षा प्रकोष्ठ',
      invigilatorPortal: 'निरीक्षक पोर्टल',
      collapse: 'समेटें',
      signOut: 'साइन आउट',
    },
    common: {
      save: 'सहेजें',
      cancel: 'रद्द करें',
      search: 'खोजें',
      refresh: 'रीफ़्रेश',
      loading: 'लोड हो रहा है…',
      retry: 'पुनः प्रयास',
      back: 'पीछे',
      next: 'आगे',
      close: 'बंद करें',
      viewAll: 'सभी देखें',
      download: 'डाउनलोड',
      print: 'प्रिंट',
      publish: 'प्रकाशित करें',
      published: 'प्रकाशित',
      delete: 'हटाएं',
      edit: 'संपादित करें',
      add: 'जोड़ें',
      actions: 'कार्रवाई',
      status: 'स्थिति',
      date: 'तारीख',
      all: 'सभी',
      none: 'कोई नहीं',
      yes: 'हाँ',
      no: 'नहीं',
    },
    login: {
      title: 'साइन इन',
      subtitle: 'परीक्षा सीटिंग, निरीक्षण और रिपोर्ट — सब एक ही जगह।',
      signingInAs: 'के रूप में साइन इन कर रहे हैं',
      email: 'ईमेल पता',
      password: 'पासवर्ड',
      signIn: 'साइन इन',
      signingIn: 'साइन इन हो रहा है…',
      admin: 'परीक्षा प्रकोष्ठ',
      faculty: 'शिक्षक',
      adminHint: 'विद्यार्थी, हॉल, परीक्षा, सीटिंग और कर्तव्यों तक पूर्ण पहुंच।',
      facultyHint: 'आपके कर्तव्य, हॉल प्लान और उपस्थिति पत्रक।',
      demoAccounts: 'डेमो खाते',
      fill: 'भरें',
      invalid: 'अमान्य ईमेल या पासवर्ड',
      sessionExpired: 'आपका सत्र समाप्त हो गया। कृपया फिर साइन इन करें।',
    },
    settings: {
      title: 'सेटिंग्स',
      profile: 'प्रोफ़ाइल',
      appearance: 'दिखावट',
      notifications: 'सूचनाएं',
      institution: 'संस्था',
      theme: 'थीम',
      light: 'लाइट',
      dark: 'डार्क',
      language: 'भाषा',
      saveProfile: 'प्रोफ़ाइल सहेजें',
      saved: 'सहेजा गया',
      unsaved: 'आपके परिवर्तन सहेजे नहीं गए',
    },
    states: {
      loading: 'लोड हो रहा है…',
      error: 'कुछ गलत हो गया',
      empty: 'अभी कुछ नहीं है',
      noResults: 'कोई परिणाम नहीं मिला',
      networkDown: 'बैकएंड से कनेक्ट नहीं हो सका। क्या यह चल रहा है?',
    },
  },

  mr: {
    nav: {
      dashboard: 'डॅशबोर्ड',
      students: 'विद्यार्थी',
      halls: 'हॉल आणि खोल्या',
      exams: 'परीक्षा',
      generate: 'सीटिंग तयार करा',
      hallPlan: 'हॉल प्लॅन पाहा',
      reports: 'अहवाल',
      analytics: 'विश्लेषण',
      audit: 'ऑडिट ट्रेल',
      faculty: 'शिक्षक व्यवस्थापन',
      settings: 'सेटिंग्ज',
      myDuties: 'माझे कर्तव्य',
      myHallPlan: 'हॉल प्लॅन',
      attendance: 'उपस्थिती पत्रक',
      notifications: 'सूचना',
      profile: 'प्रोफाइल',
      examinationCell: 'परीक्षा विभाग',
      invigilatorPortal: 'निरीक्षक पोर्टल',
      collapse: 'संकुचित करा',
      signOut: 'साइन आउट',
    },
    common: {
      save: 'जतन करा',
      cancel: 'रद्द करा',
      search: 'शोधा',
      refresh: 'रीफ्रेश',
      loading: 'लोड होत आहे…',
      retry: 'पुन्हा प्रयत्न',
      back: 'मागे',
      next: 'पुढे',
      close: 'बंद करा',
      viewAll: 'सर्व पहा',
      download: 'डाउनलोड',
      print: 'प्रिंट',
      publish: 'प्रकाशित करा',
      published: 'प्रकाशित',
      delete: 'हटवा',
      edit: 'संपादित करा',
      add: 'जोडा',
      actions: 'क्रिया',
      status: 'स्थिती',
      date: 'तारीख',
      all: 'सर्व',
      none: 'काहीही नाही',
      yes: 'होय',
      no: 'नाही',
    },
    login: {
      title: 'साइन इन',
      subtitle: 'परीक्षा सीटिंग, निरीक्षण आणि अहवाल — सर्व एकाच ठिकाणी.',
      signingInAs: 'म्हणून साइन इन होत आहे',
      email: 'ईमेल पत्ता',
      password: 'पासवर्ड',
      signIn: 'साइन इन',
      signingIn: 'साइन इन होत आहे…',
      admin: 'परीक्षा विभाग',
      faculty: 'शिक्षक',
      adminHint: 'विद्यार्थी, हॉल, परीक्षा, सीटिंग आणि कर्तव्यांपर्यंत पूर्ण प्रवेश.',
      facultyHint: 'तुमची कर्तव्ये, हॉल प्लॅन आणि उपस्थिती पत्रके.',
      demoAccounts: 'डेमो खाती',
      fill: 'भरा',
      invalid: 'अवैध ईमेल किंवा पासवर्ड',
      sessionExpired: 'तुमचा सत्र संपला. कृपया पुन्हा साइन इन करा.',
    },
    settings: {
      title: 'सेटिंग्ज',
      profile: 'प्रोफाइल',
      appearance: 'देखावट',
      notifications: 'सूचना',
      institution: 'संस्था',
      theme: 'थीम',
      light: 'लाइट',
      dark: 'डार्क',
      language: 'भाषा',
      saveProfile: 'प्रोफाइल जतन करा',
      saved: 'जतन झाले',
      unsaved: 'तुमचे बदल जतन झाले नाहीत',
    },
    states: {
      loading: 'लोड होत आहे…',
      error: 'काहीतरी चूक झाली',
      empty: 'अजून काहीही नाही',
      noResults: 'निकाल सापडले नाहीत',
      networkDown: 'बॅकएंडशी कनेक्ट होत नाही. ते चालू आहे का?',
    },
  },
};

export const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'mr', label: 'Marathi', native: 'मराठी' },
];

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || 'en';
    } catch {
      return 'en';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch {
      /* private mode — the choice just won't persist */
    }
  }, [language]);

  const setLanguage = useCallback((code) => {
    if (dictionaries[code]) setLanguageState(code);
  }, []);

  const t = useCallback(
    (key) => {
      const dict = dictionaries[language] ?? dictionaries.en;
      const fallback = dictionaries.en;
      const lookup = (d) => key.split('.').reduce((acc, part) => acc?.[part], d);
      return lookup(dict) ?? lookup(fallback) ?? key;
    },
    [language]
  );

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}

export default I18nProvider;
