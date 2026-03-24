export type Language = 'English' | 'Hindi' | 'Nepali' | 'Spanish';

export interface TranslationSchema {
  nav: {
    home: string;
    feed: string;
    projects: string;
    profile: string;
    settings: string;
    logout: string;
    castingCalls: string;
    actors: string;
    searchPlaceholder: string;
    search: string;
  };
  settings: {
    title: string;
    titlePart1: string;
    titlePart2: string;
    subtitle: string;
    tabs: {
      profile: string;
      privacy: string;
      security: string;
      comms: string;
    };
    profile: {
      identity: string;
      upload: string;
      remove: string;
      displayName: string;
      role: string;
      location: string;
      bio: string;
      availability: string;
      availabilitySubtitle: string;
      willingness: string;
      preferredRoles: string;
      updateBtn: string;
      processing: string;
    };
    privacy: {
      visibility: string;
      permissions: string;
      whoSee: string;
      whoMessage: string;
      showContact: string;
      manageBlockedAccounts: string;
      protection: {
        title: string;
        watermark: string;
        watermarkDesc: string;
        preventDownload: string;
        preventDownloadDesc: string;
      };
    };
    security: {
      password: string;
      sessions: string;
      currentPass: string;
      newPass: string;
      updatePass: string;
      logoutOthers: string;
    };
    comms: {
      engagement: string;
      preferences: string;
      autoResponse: string;
      emailNotif: string;
      language: string;
      theme: string;
    };
  };
}

export const translations: Record<Language, TranslationSchema> = {
  English: {
    nav: {
      home: "Home",
      feed: "Feed",
      projects: "Projects",
      profile: "Profile",
      settings: "Settings",
      logout: "Logout",
      castingCalls: "Casting Calls",
      actors: "Actors",
      searchPlaceholder: "Search projects...",
      search: "Search",
    },
    settings: {
        title: "Executive Settings",
        titlePart1: "Executive",
        titlePart2: "Settings",
        subtitle: "Manage your digital identity, security and platform preferences",
        tabs: {
            profile: "Profile",
            privacy: "Privacy",
            security: "Security",
            comms: "Comms",
        },
        profile: {
            identity: "Basic Identity",
            upload: "Upload New Visual",
            remove: "Remove Photo",
            displayName: "DISPLAY NAME",
            role: "ROLE",
            location: "LOCATION",
            bio: "PROFESSIONAL BIO",
            availability: "Availability Status",
            availabilitySubtitle: "Current workload visibility",
            willingness: "Willingness & Filters",
            preferredRoles: "Preferred Roles",
            updateBtn: "Update Master Profile",
            processing: "Processing...",
        },
        privacy: {
            visibility: "Visibility Controls",
            permissions: "Permission & Security",
            whoSee: "Who can see profile?",
            whoMessage: "Who can message you?",
            showContact: "Hide contact details until accepted",
            manageBlockedAccounts: "Manage Blocked Accounts",
            protection: {
                title: "Content Protection",
                watermark: "Watermark Images",
                watermarkDesc: "Auto-add transparent watermark to your portfolio photos",
                preventDownload: "Download Protection",
                preventDownloadDesc: "Prevent users from saving or downloading your media",
            }
        },
        security: {
            password: "Change Password",
            sessions: "Login Activity & Sessions",
            currentPass: "CURRENT PASSWORD",
            newPass: "NEW PASSWORD",
            updatePass: "Update Security Key",
            logoutOthers: "Termination of all other sessions",
        },
        comms: {
            engagement: "Automated Engagement",
            preferences: "Platform Preferences",
            autoResponse: "AUTO-RESPONSE MESSAGE",
            emailNotif: "Email notifications for new messages",
            language: "LANGUAGE",
            theme: "INTERFACE THEME",
        }
    }
  },
  Hindi: {
    nav: {
      home: "मुख्य",
      feed: "फीड",
      projects: "परियोजनाएं",
      profile: "प्रोफ़ाइल",
      settings: "सेटिंग्स",
      logout: "लॉगआउट",
      castingCalls: "कास्टिंग कॉल",
      actors: "अभिनेता",
      searchPlaceholder: "परियोजनाएं खोजें...",
      search: "खोजें",
    },
    settings: {
        title: "कार्यकारी सेटिंग्स",
        titlePart1: "कार्यकारी",
        titlePart2: "सेटिंग्स",
        subtitle: "अपनी डिजिटल पहचान, सुरक्षा और प्लेटफॉर्म प्राथमिकताओं का प्रबंधन करें",
        tabs: {
            profile: "प्रोफ़ाइल",
            privacy: "गोपनीयता",
            security: "सुरक्षा",
            comms: "संचार",
        },
        profile: {
            identity: "बुनियादी पहचान",
            upload: "नया चित्र अपलोड करें",
            remove: "चित्र हटाएं",
            displayName: "प्रदर्शित नाम",
            role: "भूमिका",
            location: "स्थान",
            bio: "पेशेवर जैव",
            availability: "उपलब्धता स्थिति",
            availabilitySubtitle: "वर्तमान कार्यभार दृश्यता",
            willingness: "इच्छा और फिल्टर",
            preferredRoles: "पसंदीदा भूमिकाएं",
            updateBtn: "मास्टर प्रोफ़ाइल अपडेट करें",
            processing: "प्रसंस्करण...",
        },
        privacy: {
            visibility: "दृश्यता नियंत्रण",
            permissions: "अनुमति और सुरक्षा",
            whoSee: "प्रोफ़ाइल कौन देख सकता है?",
            whoMessage: "आपको कौन संदेश भेज सकता है?",
            showContact: "स्वीकार किए जाने तक संपर्क विवरण छिपाएं",
            manageBlockedAccounts: "अवरुद्ध खातों का प्रबंधन करें",
            protection: {
                title: "सामग्री सुरक्षा",
                watermark: "चित्रों पर वॉटरमार्क",
                watermarkDesc: "आपकी पोर्टफोलियो तस्वीरों में पारदर्शी वॉटरमार्क स्वतः जोड़ें",
                preventDownload: "डाउनलोड सुरक्षा",
                preventDownloadDesc: "उपयोगकर्ताओं को आपका मीडिया सहेजने या डाउनलोड करने से रोकें",
            }
        },
        security: {
            password: "पासवर्ड बदलें",
            sessions: "लॉगिन गतिविधि और सत्र",
            currentPass: "वर्तमान पासवर्ड",
            newPass: "नया पासवर्ड",
            updatePass: "सुरक्षा कुंजी अपडेट करें",
            logoutOthers: "अन्य सभी सत्रों की समाप्ति",
        },
        comms: {
            engagement: "स्वचालित जुड़ाव",
            preferences: "प्लेटफॉर्म प्राथमिकताएं",
            autoResponse: "स्वचालित उत्तर संदेश",
            emailNotif: "नए संदेशों के लिए ईमेल सूचनाएं",
            language: "भाषा",
            theme: "इंटरफ़ेस थीम",
        }
    }
  },
  Nepali: {
    nav: {
      home: "गृह",
      feed: "फिड",
      projects: "आयोजनाहरू",
      profile: "प्रोफाइल",
      settings: "सेटिङहरू",
      logout: "लगआउट",
      castingCalls: "कास्टिंग कलहरू",
      actors: "कलाकारहरू",
      searchPlaceholder: "आयोजनाहरू खोज्नुहोस्...",
      search: "खोज्नुहोस्",
    },
    settings: {
        title: "कार्यकारी सेटिङहरू",
        titlePart1: "कार्यकारी",
        titlePart2: "सेटिङहरू",
        subtitle: "आफ्नो डिजिटल पहिचान, सुरक्षा र प्लेटफर्म प्राथमिकताहरू व्यवस्थापन गर्नुहोस्",
        tabs: {
            profile: "प्रोफाइल",
            privacy: "गोपनीयता",
            security: "सुरक्षा",
            comms: "सञ्चार",
        },
        profile: {
            identity: "आधारभूत पहिचान",
            upload: "नयाँ तस्विर अपलोड गर्नुहोस्",
            remove: "तस्विर हटाउनुहोस्",
            displayName: "नाम",
            role: "भूमिका",
            location: "ठेगाना",
            bio: "व्यावसायिक विवरण",
            availability: "उपलब्धता स्थिति",
            availabilitySubtitle: "वर्तमान कार्यभार दृश्यता",
            willingness: "इच्छा र फिल्टरहरू",
            preferredRoles: "रुचाइएका भूमिकाहरू",
            updateBtn: "प्रोफाइल अपडेट गर्नुहोस्",
            processing: "प्रक्रियामा छ...",
        },
        privacy: {
            visibility: "दृश्यता नियन्त्रण",
            permissions: "अनुमति र सुरक्षा",
            whoSee: "प्रोफाइल कसले हेर्न सक्छ?",
            whoMessage: "तपाईंलाई कसले सन्देश पठाउन सक्छ?",
            showContact: "स्वीकृत नभएसम्म सम्पर्क विवरण लुकाउनुहोस्",
            manageBlockedAccounts: "अवरुद्ध खाताहरू व्यवस्थापन गर्नुहोस्",
            protection: {
                title: "सामग्री सुरक्षा",
                watermark: "तस्विरहरूमा वाटरमार्क",
                watermarkDesc: "तपाईंको प्रोफाइल तस्विरहरूमा पारदर्शी वाटरमार्क स्वतः थप्नुहोस्",
                preventDownload: "डाउनलोड सुरक्षा",
                preventDownloadDesc: "प्रयोगकर्ताहरूलाई तपाईंको मिडिया बचत गर्न वा डाउनलोड गर्नबाट रोक्नुहोस्",
            }
        },
        security: {
            password: "पासवर्ड परिवर्तन गर्नुहोस्",
            sessions: "लगइन गतिविधि र सत्रहरू",
            currentPass: "हालको पासवर्ड",
            newPass: "नयाँ पासवर्ड",
            updatePass: "सुरक्षा कुञ्जी अपडेट गर्नुहोस्",
            logoutOthers: "अन्य सबै सत्रहरू अन्त्य गर्नुहोस्",
        },
        comms: {
            engagement: "स्वचालित संलग्नता",
            preferences: "प्लेटफर्म प्राथमिकताहरू",
            autoResponse: "स्वचालित जवाफ सन्देश",
            emailNotif: "नयाँ सन्देशहरूको लागि इमेल सूचनाहरू",
            language: "भाषा",
            theme: "इन्टरफेस थिम",
        }
    }
  },
  Spanish: {
    nav: {
      home: "Inicio",
      feed: "Novedades",
      projects: "Proyectos",
      profile: "Perfil",
      settings: "Ajustes",
      logout: "Cerrar sesión",
      castingCalls: "Llamados de casting",
      actors: "Actores",
      searchPlaceholder: "Buscar proyectos...",
      search: "Buscar",
    },
    settings: {
        title: "Ajustes Ejecutivos",
        titlePart1: "Ajustes",
        titlePart2: "Ejecutivos",
        subtitle: "Gestione su identidad digital, seguridad y preferencias de la plataforma",
        tabs: {
            profile: "Perfil",
            privacy: "Privacidad",
            security: "Seguridad",
            comms: "Comunicaciones",
        },
        profile: {
            identity: "Identidad Básica",
            upload: "Subir Nueva Imagen",
            remove: "Eliminar Foto",
            displayName: "NOMBRE PARA MOSTRAR",
            role: "ROL",
            location: "UBICACIÓN",
            bio: "BIO PROFESIONAL",
            availability: "Estado de Disponibilidad",
            availabilitySubtitle: "Visibilidad de carga de trabajo actual",
            willingness: "Disponibilidad y Filtros",
            preferredRoles: "Roles Preferidos",
            updateBtn: "Actualizar Perfil Maestro",
            processing: "Procesando...",
        },
        privacy: {
            visibility: "Controles de Visibilidad",
            permissions: "Permisos y Seguridad",
            whoSee: "¿Quién puede ver el perfil?",
            whoMessage: "¿Quién puede enviarte mensajes?",
            showContact: "Ocultar detalles de contacto hasta aceptado",
            manageBlockedAccounts: "Gestionar cuentas bloqueadas",
            protection: {
                title: "Protección de Contenido",
                watermark: "Marcar Imágenes",
                watermarkDesc: "Añadir automáticamente marca de agua transparente a tus fotos",
                preventDownload: "Protección de Descarga",
                preventDownloadDesc: "Evitar que los usuarios guarden o descarguen tu contenido",
            }
        },
        security: {
            password: "Cambiar Contraseña",
            sessions: "Actividad de Sesión",
            currentPass: "CONTRASEÑA ACTUAL",
            newPass: "NUEVA CONTRASEÑA",
            updatePass: "Actualizar Llave de Seguridad",
            logoutOthers: "Terminación de todas las demás sesiones",
        },
        comms: {
            engagement: "Compromiso Automatizado",
            preferences: "Preferencias de la Plataforma",
            autoResponse: "MENSAJE DE AUTO-RESPUESTA",
            emailNotif: "Notificaciones por correo",
            language: "IDIOMA",
            theme: "TEMA DE INTERFAZ",
        }
    }
  }
};
