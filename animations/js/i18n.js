// Bilingual (AR/EN) dictionary + helpers. Arabic is the authored source of
// truth for animation names (347 hand-reviewed entries); English mode shows
// a clean title derived from the animation's own id instead of a parallel
// hand-translated name for every single one - everything else (chrome,
// categories, param labels, trigger hints) is fully translated below.
(function () {
  'use strict';

  var STORAGE_KEY = 'animlib-lang';

  var UI = {
    ar: {
      brand: 'مكتبة استوري لاين',
      navLibrary: 'المكتبة',
      navCategories: 'التصنيفات',
      heroEyebrow: 'for-storyline-only',
      heroTitlePrefix: 'مكتبة ',
      heroTitleAccent: 'استوري لاين',
      heroTitleSuffix: ' للأنيميشن',
      heroDesc: 'أنيميشنز جاهزة، معايرة ومختبرة خصيصًا لتعمل داخل Articulate Storyline — جرّبها هنا، عدّل المدة والتأخير ومنحنى الحركة، وخد الكود جاهز.',
      statTotal: 'أنيميشن', statOnce: 'مرة واحدة', statLoop: 'حلقة مستمرة', statHover: 'عند التمرير',
      filterAll: 'الكل',
      footer: 'مكتبة أنيميشن داخلية — مبنية للعمل حصريًا مع Articulate Storyline',
      modalSettings: 'الإعدادات',
      modalReplay: '↻ إعادة تشغيل المعاينة',
      modalCode: 'الكود الجاهز',
      modalCopy: 'نسخ الكود',
      modalCopied: '✓ تم النسخ',
      modalCopyFailed: 'تعذّر النسخ - انسخ يدويًا',
      modalClose: 'إغلاق',
      installStep1: 'انسخ الكود بالزر تحت.',
      installStep2: 'الصقه في Storyline داخل Trigger من نوع "Execute JavaScript".',
      installStep3Pre: 'استبدل ',
      installStep3Post: ' بمعرّف الكائن (data-model-id) من Developer Console.',
      themeToggleToLight: 'التبديل للوضع الفاتح',
      themeToggleToDark: 'التبديل للوضع الغامق',
      langToggleLabel: 'English',
      backToTop: 'الرجوع لأعلى الصفحة',
      contactLinkedin: 'تواصل معايا على لينكدإن',
      contactWhatsapp: 'تواصل معايا على واتساب',
      contactPortfolio: 'شوف البورتفوليو بتاعي'
    },
    en: {
      brand: 'Storyline Library',
      navLibrary: 'Library',
      navCategories: 'Categories',
      heroEyebrow: 'for-storyline-only',
      heroTitlePrefix: '',
      heroTitleAccent: 'Storyline',
      heroTitleSuffix: ' Animation Library',
      heroDesc: 'Ready-made animations, tuned and tested specifically for Articulate Storyline — preview here, tweak duration, delay and easing, then grab the code.',
      statTotal: 'Animations', statOnce: 'One-shot', statLoop: 'Looping', statHover: 'On hover',
      filterAll: 'All',
      footer: 'An internal animation library — built to work exclusively with Articulate Storyline',
      modalSettings: 'Settings',
      modalReplay: '↻ Replay preview',
      modalCode: 'Ready-to-use code',
      modalCopy: 'Copy code',
      modalCopied: '✓ Copied',
      modalCopyFailed: 'Could not copy - select and copy manually',
      modalClose: 'Close',
      installStep1: 'Copy the code with the button below.',
      installStep2: 'Paste it into an "Execute JavaScript" trigger in Storyline.',
      installStep3Pre: 'Replace ',
      installStep3Post: ' with the object\'s id (data-model-id) from the Developer Console.',
      themeToggleToLight: 'Switch to light mode',
      themeToggleToDark: 'Switch to dark mode',
      langToggleLabel: 'العربية',
      backToTop: 'Back to top',
      contactLinkedin: 'Connect with me on LinkedIn',
      contactWhatsapp: 'Message me on WhatsApp',
      contactPortfolio: 'View my portfolio'
    }
  };

  var CATEGORY_EN = {
    'أساسي': 'Basic', 'ظهور': 'Entrance', 'اختفاء': 'Exit', 'نصوص': 'Text',
    'لفت انتباه': 'Attention', 'خلفية': 'Background', 'لودر': 'Loader',
    'عند التمرير': 'Hover', 'تقدّم': 'Progress'
  };

  var TYPE_EN = { once: 'One-shot', loop: 'Loop', hover: 'Hover' };

  var PARAM_LABEL_EN = {
    'اتساع التوهج (px)': 'Glow spread (px)',
    'ارتفاع الرفع (px)': 'Lift height (px)',
    'ارتفاع النطة (px)': 'Bounce height (px)',
    'التأخير قبل البدء (Delay)': 'Delay before start',
    'التوهج الأول': 'Glow color 1',
    'التوهج الثالث': 'Glow color 3',
    'التوهج الثاني': 'Glow color 2',
    'التوهج الرابع': 'Glow color 4',
    'الفاصل بين الخطوات (مللي ثانية)': 'Gap between steps (ms)',
    'الفاصل بين العناصر (مللي ثانية)': 'Gap between elements (ms)',
    'الفاصل بين النقاط (مللي ثانية)': 'Gap between dots (ms)',
    'اللون الأول': 'Color 1', 'اللون الثالث': 'Color 3', 'اللون الثاني': 'Color 2',
    'المدة (مللي ثانية)': 'Duration (ms)',
    'تكرار مستمر': 'Loop forever',
    'زاوية الخط (درجة)': 'Line angle (deg)',
    'لون التوهج': 'Glow color',
    'لون التوهج/الاكتمال': 'Glow / complete color',
    'لون الخط': 'Line color',
    'لون الظل': 'Shadow color',
    'لون النبضة': 'Pulse color',
    'لون ظل النص': 'Text shadow color',
    'لون ومضة الالتصاق': 'Snap flash color',
    'مدة التوهج (مللي ثانية)': 'Glow duration (ms)',
    'مدة الحركة (مللي ثانية)': 'Motion duration (ms)',
    'مدة المرور (مللي ثانية)': 'Sweep duration (ms)',
    'منحنى التوقيت (Easing)': 'Easing'
  };

  var HINT_EN = {
    'اضغط ↻ لإعادة التشغيل': 'Click ↻ to replay',
    'اضغط ⏸ للإيقاف': 'Click ⏸ to stop',
    'يحتاج fill صورة أعرض من 100%': 'Needs a fill image wider than 100%',
    'مرّر الماوس فوق الشكل': 'Hover over the shape'
  };

  var TRIGGER_EN = {
    'ضعه على Trigger عند "Timeline Start" أو عند ضغط زر.': 'Use it on a Trigger at "Timeline Start" or on a button click.',
    'يظهر جيدًا عند دخول السلايد أو عند تفاعل المستخدم.': 'Reads well on slide entry or on user interaction.',
    'الأنسب على "Timeline Start" لعناصر تظهر أول ما السلايد يفتح.': 'Best on "Timeline Start" for objects that appear as soon as the slide opens.',
    'مناسب لعنصر يدخل من الشمال بحركة لافتة.': 'Good for an object entering from the left with a bold motion.',
    'مناسب لعناصر تظهر فجأة (نتيجة، تنبيه، بطاقة مكافأة).': 'Good for objects that appear suddenly (a result, an alert, a reward card).',
    'ضعه على Trigger عند ضغط زر "متابعة" قبل الانتقال للسلايد التالي.': 'Use it on a Trigger when a "Continue" button is pressed, before moving to the next slide.',
    'مناسب لإخفاء عنصر بحركة لافتة قبل إزالته.': 'Good for hiding an object with a bold motion before removing it.',
    'مناسب لإخفاء بطاقة أو نافذة منبثقة قبل إزالتها.': 'Good for hiding a card or popup before removing it.',
    'حركة انقلاب مميزة لبطاقة أو أيقونة.': 'A distinctive flip motion for a card or icon.',
    'استخدمه على كائن نصي فقط (عنوان أو جملة مهمة).': 'Use it on a text object only (a title or an important sentence).',
    'للعناوين القصيرة تحديدًا — يعتمد على letter-spacing (يظهر بوضوح مع حروف إنجليزية منفصلة، الحروف العربية المتصلة تخفي التأثير).': 'Best for short titles - relies on letter-spacing (clear with separate English letters; connected Arabic script hides the effect).',
    'مثالي لأيقونة تحتاج تلفت الانتباه باستمرار.': 'Ideal for an icon that needs to keep drawing attention.',
    'ضعه على Trigger عند إجابة خاطئة لتنبيه بسيط غير مزعج.': 'Use it on a Trigger for a wrong answer, as a gentle, non-intrusive alert.',
    'يعمل فقط على كائن له صورة تعبئة أعرض من حجمه الظاهر.': 'Only works on an object with a fill image wider than its visible size.',
    'مثالي كمؤشر تحميل (Loading) أو خلف أيقونة رئيسية.': 'Ideal as a loading indicator or behind a key icon.',
    'ضعه على "Timeline Start" مرة واحدة — يشتغل تلقائيًا مع أي تمرير بالماوس.': 'Add it on "Timeline Start" once - it fires automatically on every mouse hover.',
    'مناسب لبطاقات أو أزرار تبان تفاعلية عند اقتراب الماوس.': 'Good for cards or buttons that should feel interactive on mouse hover.',
    'ضعه على "Timeline Start" مرة واحدة — كل تمريرة ماوس تشغّل الخط من جديد.': 'Add it on "Timeline Start" once - every hover replays the sweep.',
    'مثالي لمؤشر "انتظار/تحميل" بشكل مختلف عن اللودر الدوّار.': 'Ideal as a "waiting/loading" indicator, different from the spinning loader.',
    'مثالي كمؤشر تحميل كلاسيكي قبل ظهور محتوى.': 'Ideal as a classic loading indicator before content appears.',
    'مناسب لإظهار إن كائن اتضغط أو اتفعّل.': 'Good for showing that an object was pressed or activated.',
    'مثالي لتنبيه إجابة خاطئة أو خطأ في الإدخال.': 'Ideal for flagging a wrong answer or an input error.',
    'حركة دخول مرحة لعنصر مكافأة أو نتيجة.': 'A playful entrance for a reward or result object.',
    'دخول درامي لعنصر مهم في بداية السلايد.': 'A dramatic entrance for an important object at the start of the slide.',
    'خروج سريع ولافت لعنصر قبل الانتقال.': 'A quick, bold exit for an object before transitioning.',
    'عكس تباعد الحروف — الحروف تتقارب من بعيد لحد مكانها (يظهر بوضوح مع حروف إنجليزية منفصلة، الحروف العربية المتصلة تخفي التأثير).': 'The reverse of letter spread - letters converge from afar into place (clear with separate English letters; connected Arabic script hides the effect).',
    'خروج نصي بالتمدد والتشويش قبل الاختفاء.': 'A text exit that stretches and blurs before disappearing.',
    'يبرز عنوان بظل خفيف بدل الحركة.': 'Makes a title stand out with a subtle shadow instead of motion.',
    'تأثير "بروز" كلاسيكي لعنوان مهم.': 'A classic "pop" effect for an important title.',
    'نقل بسيط لعنصر لموضع جديد دون اختفاء.': 'A simple move of an object to a new position without disappearing.',
    'أسلوب تصميم جريء لبطاقة أو زر.': 'A bold design style for a card or button.',
    'خلفية متغيرة الألوان لعنصر تنبيه أو بانر.': 'A color-shifting background for an alert element or banner.',
    'دخول لافت بدوران وتكبير معًا.': 'A striking entrance combining rotation and scale-up.',
    'خروج بنفس أسلوب الدخول الدوّامي.': 'An exit matching the swirl entrance style.',
    'حلقة تنبيه متمدّدة حول أيقونة إشعار أو زر مباشر.': 'An expanding alert ring around a notification icon or live button.',
    'انقلاب ثلاثي الأبعاد مع تعتيم واقعي في المنتصف.': 'A 3D flip with realistic dimming at the midpoint.',
    'دخول لافت بدوران كامل حول نفسه.': 'A striking entrance with a full self-rotation.',
    'دخول بانقلاب ثلاثي الأبعاد حول المحور الأفقي.': 'An entrance with a 3D flip around the horizontal axis.',
    'دخول درامي بعمق ثلاثي الأبعاد.': 'A dramatic entrance with 3D depth.',
    'دخول مرح بارتدادات متتالية قبل الاستقرار.': 'A playful entrance with successive bounces before settling.',
    'اختفاء بالتكبير والتشويش قبل الإزالة.': 'A disappearance that scales up and blurs before removal.',
    'خروج بانقلاب ثلاثي الأبعاد سريع.': 'A quick exit with a 3D flip.',
    'خروج بارتدادات متصاعدة قبل الطيران خارج السلايد.': 'An exit with escalating bounces before flying off the slide.',
    'عكس دخول الشق الرأسي — نفس العمق الثلاثي.': 'The reverse of the vertical slit entrance - same 3D depth.',
    'تأثير ظل متدرج مختلف عن تأثير البروز الأول.': 'A gradient shadow effect, different from the first pop effect.',
    'خروج نصي بتقارب الحروف قبل الاختفاء (يظهر بوضوح مع حروف إنجليزية منفصلة، الحروف العربية المتصلة تخفي التأثير).': 'A text exit where the letters converge before disappearing (clear with separate English letters; connected Arabic script hides the effect).',
    'اهتزاز جانبي مع ميلان — بديل حركي لجيلو.': 'A sideways wobble with a tilt - a motion alternative to jello.',
    'اهتزاز سريع مستمر — مناسب لحالة "جاري التحميل" أو خطأ.': 'A fast, continuous shake - good for a "loading" or error state.',
    'حركة زوم سينمائية بطيئة لصورة خلفية أو غلاف.': 'A slow, cinematic zoom for a background or cover image.',
    'دخول بارتداد خفيف وومضة توهج لحظة الاستقرار — يوحي بالجذب المغناطيسي.': 'An entrance with a light bounce and a glow flash on settling - suggesting a magnetic pull.',
    'مثالي لعرض تقدّم خطوات درس أو أسئلة Quiz بالتتابع.': 'Ideal for showing sequential progress through lesson steps or quiz questions.',
    'ينتهي بالنص مختفيًا - استخدمه على كائن نصي فقط، وضعه قبل الانتقال للسلايد التالي.': 'Ends with the text gone - use it on a text object only, and place it before the next slide.',
    'ضعه على Trigger عند إجابة خاطئة أو لجذب الانتباه لعنصر.': 'Use it on a Trigger for a wrong answer or to draw attention to an object.',
    'ينتهي بالعنصر مختفيًا (تنبيه ثم اختفاء) - مناسب قبل إزالة العنصر.': 'Ends with the object gone (alert then vanish) - good right before removing the object.',
    'يعمل على أي كائن له خلفية أو صورة تعبئة.': 'Works on any object with a background or fill image.',
    'ضعه على Trigger عند Timeline Start أو عند تفاعل المستخدم.': 'Use it on a Trigger at Timeline Start or on user interaction.',
    'ضعه على Trigger عند ضغط زر أو قبل الانتقال للسلايد التالي.': 'Use it on a Trigger on a button click or before moving to the next slide.',
    'ينتهي بالعنصر مختفيًا - ضعه على Trigger قبل إزالة العنصر أو الانتقال للسلايد التالي.': 'Ends with the object gone - use it on a Trigger before removing the object or moving to the next slide.'
  };

  function idToTitle(id) {
    var s = id.indexOf('ac-') === 0 ? id.slice(3) : id;
    var words = s.split('-').map(function (w) {
      return w.charAt(0).toUpperCase() + w.slice(1);
    }).join(' ');
    return id.indexOf('ac-') === 0 ? words + ' (Animate.css)' : words;
  }

  function metaToEn(meta) {
    return meta
      .replace(/ثانية/g, 's')
      .replace(/نص فقط/g, 'text only')
      .replace(/يحتاج fill صورة أعرض من 100%/g, 'needs a fill image wider than 100%');
  }

  function get() {
    try { return localStorage.getItem(STORAGE_KEY) || 'ar'; } catch (e) { return 'ar'; }
  }
  function set(lang) {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* ignore */ }
  }

  function t(key) { return UI[get()][key]; }

  function itemName(item) { return get() === 'en' ? idToTitle(item.id) : item.name; }
  function itemCategory(item) { return get() === 'en' ? (CATEGORY_EN[item.category] || item.category) : item.category; }
  function itemMeta(item) { return get() === 'en' ? metaToEn(item.meta) : item.meta; }
  function itemHint(item) { return get() === 'en' ? (HINT_EN[item.hint] || item.hint) : item.hint; }
  function itemTrigger(item) { return get() === 'en' ? (TRIGGER_EN[item.trigger] || item.trigger) : item.trigger; }
  function typeLabel(type) { return get() === 'en' ? TYPE_EN[type] : { once: 'مرة واحدة', loop: 'حلقة مستمرة', hover: 'عند التمرير' }[type]; }
  function paramLabel(label) { return get() === 'en' ? (PARAM_LABEL_EN[label] || label) : label; }

  window.AnimLibI18n = {
    get: get, set: set, t: t,
    itemName: itemName, itemCategory: itemCategory, itemMeta: itemMeta,
    itemHint: itemHint, itemTrigger: itemTrigger, typeLabel: typeLabel, paramLabel: paramLabel
  };
})();
