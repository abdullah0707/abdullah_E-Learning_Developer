/* Portfolio-wide EN/AR toggle. Separate from the embedded animation
   library's own AnimLibI18n (that one only knows the library's own strings);
   this one drives every static string outside it, and keeps AnimLibI18n in
   sync (when it's loaded) so a single toggle covers the whole page. */
window.PortfolioI18N = (function () {
  "use strict";

  var STORAGE_KEY = "portfolio-lang";

  var DICT = {
    en: {
      navHome: "Home", navWork: "Work", navLibrary: "Library", navAbout: "About", navContact: "Contact",
      statusPill: "Cairo, Egypt · GMT+2",
      langToggleLabel: "AR",
      openMenuAria: "Open menu", closeMenuAria: "Close menu",
      themeToggleAria: "Switch to light mode", themeToggleAriaLight: "Switch to dark mode",

      heroEyebrow: "Technical consultant for educational content",
      heroLede: "I help teams design, build and scale interactive learning experiences — from hands-on development in Articulate Storyline 360 and Adobe Animate to technical consulting on architecture, tooling and production pipelines for educational content.",
      heroTaglineDefault: "E-Learning Developer",
      heroWelcomeDefault: "Welcome to Portfolio",
      aboutBioDefault: "Driven by a passion for creating transformative online learning experiences, I specialize as an eLearning developer in crafting engaging and effective solutions tailored to the unique needs of each client. With extensive expertise in multimedia development, learning management systems, educational games, and custom training packages, I am dedicated to delivering high-quality, interactive eLearning that drives measurable outcomes.",
      ctaViewWork: "View the work",
      ctaGetInTouch: "Get in touch",
      photoCaption: "Cairo, Egypt — remote-friendly",
      shareLabel: "Share",

      workEyebrow: "Selected work",
      workCount: "Interactive Storyline & Animate builds",
      scrollDownAria: "Scroll down for more",
      scrollUpAria: "Scroll back to top",
      openTemplateArrow: "Open template ↗",

      libEyebrow: "for-storyline-only",
      libTitlePrefix: "", libTitleAccent: "Storyline", libTitleSuffix: " Animation Library",
      libDesc: "Ready-made animations, tuned and tested specifically for Articulate Storyline — preview here, tweak duration, delay and easing, then grab the code.",
      libLoading: "Loading the animation library…",
      libFunctionActivity: "Function Activity",
      libComingSoon: "Coming soon — new function-activity animations land here shortly.",

      chipConsulting: "Technical Consulting",

      aboutEyebrow: "About",
      aboutHeadline: "From building courses myself to helping teams build them right.",
      cvLink: "Download latest CV",
      ctaGetInTouch2: "Contact with me",
      step1Title: "Understand the learner",
      step1Body: "Who they are, what they already know, and where they actually get stuck.",
      step2Title: "Design the interaction",
      step2Body: "Not decoration — a mechanic that makes the concept stick, built in Storyline or Animate.",
      step3Title: "Build & ship",
      step3Body: "Wired into your LMS with custom JavaScript, tested end to end before handoff.",

      contactEyebrow: "Let's talk",
      contactHeadline: "Have a course that needs to feel alive?",
      contactLede: "Whether you're interested in working with me or just want to say hello, I'd love to hear from you.",
      formName: "Name", formEmail: "Email", formPhone: "Phone number", formMessage: "Message", formSubmit: "Send message",
      socialEmail: "Email", socialCall: "Call",
      toastSent: "Your message has been sent",

      modalSettings: "Settings",
      modalReplay: "↻ Replay preview",
      modalCode: "Ready-to-use code",
      modalCopy: "Copy code",
      modalCloseAria: "Close"
    },
    ar: {
      navHome: "الرئيسية", navWork: "الأعمال", navLibrary: "المكتبة", navAbout: "نبذة عني", navContact: "تواصل",
      statusPill: "القاهرة، مصر · GMT+2",
      langToggleLabel: "EN",
      openMenuAria: "فتح القائمة", closeMenuAria: "إغلاق القائمة",
      themeToggleAria: "التبديل للوضع الفاتح", themeToggleAriaLight: "التبديل للوضع الغامق",

      heroEyebrow: "استشاري تقني للمحتوى التعليمي",
      heroLede: "بساعد الفرق تصمم وتبني وتوسّع تجارب تعليمية تفاعلية — من التنفيذ العملي بـ Articulate Storyline 360 وAdobe Animate، لحد الاستشارات التقنية في البنية والأدوات وخطوط إنتاج المحتوى التعليمي.",
      heroTaglineDefault: "مطوّر تعليم إلكتروني",
      heroWelcomeDefault: "أهلاً بيك في البورتفوليو",
      aboutBioDefault: "شغفي إني أصمم تجارب تعليمية إلكترونية تفرق فعلاً في حياة المتعلم، وده اللي خلاني أتخصص كمطوّر تعليم إلكتروني في تصميم حلول جذابة وفعّالة تناسب احتياجات كل عميل. عندي خبرة واسعة في تطوير الوسائط المتعددة، وأنظمة إدارة التعلّم (LMS)، والألعاب التعليمية، وحزم التدريب المخصصة، وهدفي الدايم إني أقدّم محتوى تعليمي تفاعلي عالي الجودة يحقق نتائج ملموسة.",
      ctaViewWork: "شوف الأعمال",
      ctaGetInTouch: "تواصل معايا",
      photoCaption: "القاهرة، مصر — العمل عن بُعد",
      shareLabel: "شارك",

      workEyebrow: "أعمال مختارة",
      workCount: "أعمال تفاعلية بـ Storyline وAnimate",
      scrollDownAria: "مرّر لأسفل لمزيد من المشاريع",
      scrollUpAria: "ارجع لأعلى",
      openTemplateArrow: "افتح القالب ↗",

      libEyebrow: "for-storyline-only",
      libTitlePrefix: "مكتبة ", libTitleAccent: "استوري لاين", libTitleSuffix: " للأنيميشن",
      libDesc: "أنيميشنز جاهزة، معايرة ومختبرة خصيصًا لتعمل داخل Articulate Storyline — جرّبها هنا، عدّل المدة والتأخير ومنحنى الحركة، وخد الكود جاهز.",
      libLoading: "جاري تحميل مكتبة الأنيميشن…",
      libFunctionActivity: "فانكشن اكتيفتي",
      libComingSoon: "قريبًا — هضيف هنا أنيميشنز فانكشن اكتيفتي جديدة.",

      chipConsulting: "استشارات تقنية",

      aboutEyebrow: "نبذة عني",
      aboutHeadline: "من إني أبني الكورسات بنفسي، لحد إني أساعد الفرق تبنيها صح.",
      cvLink: "تحميل آخر نسخة CV",
      ctaGetInTouch2: "تواصل معايا",
      step1Title: "افهم المتعلم",
      step1Body: "هو مين، عارف إيه قبل كده، وبيتعثر فين بالظبط.",
      step2Title: "صمّم التفاعل",
      step2Body: "مش ديكور — آلية بتخلي الفكرة تعلق في دماغ المتعلم، مبنية بـ Storyline أو Animate.",
      step3Title: "ابني ونفّذ",
      step3Body: "متوصّل بنظام الـ LMS بتاعك بكود JavaScript مخصص، ومُختبر بالكامل قبل التسليم.",

      contactEyebrow: "لنتحدث",
      contactHeadline: "عندك كورس محتاج يبقى فيه حياة؟",
      contactLede: "سواء عايز تشتغل معايا أو بس عايز تسلّم، يسعدني اسمع منك.",
      formName: "الاسم", formEmail: "البريد الإلكتروني", formPhone: "رقم الهاتف", formMessage: "الرسالة", formSubmit: "إرسال الرسالة",
      socialEmail: "البريد", socialCall: "اتصال",
      toastSent: "تم إرسال رسالتك بنجاح",

      modalSettings: "الإعدادات",
      modalReplay: "↻ إعادة تشغيل المعاينة",
      modalCode: "الكود الجاهز",
      modalCopy: "نسخ الكود",
      modalCloseAria: "إغلاق"
    }
  };

  function getStored() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }
  function setStored(v) {
    try { localStorage.setItem(STORAGE_KEY, v); } catch (e) { /* ignore */ }
  }

  var current = getStored() || "en";

  function t(key) {
    // Plain "||" chaining would treat a legitimately empty string (e.g. the
    // unused prefix half of a split title) as missing and fall through to
    // the key name itself — check for undefined instead so "" is respected.
    var cur = DICT[current] && DICT[current][key];
    if (cur !== undefined) return cur;
    var en = DICT.en[key];
    if (en !== undefined) return en;
    return key;
  }

  function applyStaticText() {
    var html = document.documentElement;
    html.setAttribute("lang", current);
    html.setAttribute("dir", current === "ar" ? "rtl" : "ltr");

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    document.querySelectorAll("[data-i18n-aria]").forEach(function (el) {
      el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria")));
    });

    document.title = current === "ar"
      ? "عبدالله | استشاري تقني للمحتوى التعليمي"
      : "Abdallah | E-Learning Technical Consultant";
  }

  function set(lang) {
    if (lang !== "en" && lang !== "ar") return;
    current = lang;
    setStored(lang);
    applyStaticText();
    if (window.AnimLibI18n) {
      window.AnimLibI18n.set(lang);
      document.dispatchEvent(new CustomEvent("animlib:langchange"));
      if (window.AnimLibRender && window.__libEngineReady) window.__libRefreshAfterLangChange && window.__libRefreshAfterLangChange();
    }
    // Lets anything driven by CMS content (not a static [data-i18n] string —
    // e.g. the About bio, fetched once from the API) re-render itself in the
    // newly selected language too.
    document.dispatchEvent(new CustomEvent("portfolio:langchange", { detail: { lang: current } }));
  }

  function get() { return current; }

  function init() {
    applyStaticText();
    var toggles = document.querySelectorAll("#langToggle, #langToggleMobile");
    toggles.forEach(function (btn) {
      btn.addEventListener("click", function () {
        set(current === "en" ? "ar" : "en");
      });
    });
  }

  document.addEventListener("DOMContentLoaded", init);

  return { t: t, get: get, set: set };
})();
