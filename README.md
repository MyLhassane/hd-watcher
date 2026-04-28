Watcher: The Living Dashboard 🛰️
بوابة مركزية لإدارة المشاريع وتوثيق الإنجازات (Reverse-Calendar Approach)

1. الرؤية (The Vision)
بناء لوحة تحكم "Mobile-First" تعمل كمرآة لما يتم إنجازه في Obsidian. النظام لا يحتاج إلى إدخال بيانات يدوي في الموقع، بل يستمد تحديثاته من ملفات الماركداون التي يتم رفعها لـ GitHub، مع الحفاظ على خصوصية البيانات (Private/Public Filtering).

2. الهيكل التقني (Architecture)
Data Source: ملفات Markdown داخل مجلد logs/ بفروعها.

Input Method: استخدام Obsidian Properties (YAML) لتعريف الحالة والتقدم.

Host: GitHub Pages (Static Hosting).

Engine: Vanilla JavaScript + Markdown-it للرندرة الحية.

3. خارطة الطريق (Roadmap)
المرحلة الأولى: المزامنة والربط (مكتملة ✅)
تم حل المشكلة: الواجهة تعرض تفاصيل جميع الملفات بشكل صحيح.
التشخيص: تم برمجة "المحلل" (Parser) لربط مفاتيح YAML بالعناصر المرئية.

[✓] تفعيل Fetch API لمسح مجلد logs عبر manifest.json.

[✓] برمجة Regex لاستخراج البيانات بين --- و ---.

[✓] ربط قيمة progress: 45 بشريط التقدم في بطاقة Dev.

المرحلة الثانية: الواجهة المتعددة (Multi-Path UI) (مكتملة ✅)
[✓] Home Cards: عرض 3 بطاقات (Dev, Creative, HomeLab) تظهر "آخر نشاط" لكل منها.

[✓] Sidebar Accordion: بناء شجرة الـ 6 مستويات ديناميكياً بناءً على مسارات المجلدات.

[✓] The Log Feed: عرض سجل التاريخ (Timeline) في أسفل الصفحة.

[✓] تحسينات إضافية: إضافة فلترة بالتاريخ، بحث في المحتوى، عرض تفاصيل الملفات.

المرحلة الثالثة: الفلترة والأمن (مكتملة ✅)
[✓] تفعيل فلتر public: true لمنع تسريب الملاحظات الخاصة.

[✓] إضافة محرك بحث سري للوصول للملفات عبر الوسوم (Tags).

4. تعليمات برمجية للوكيل (Critical Fixes)
لحل مشكلة عدم ظهور التحديثات، يجب توجيه الوكيل للآتي:

أولاً: منطق تحليل الخصائص (YAML Parsing)
يجب أن يحتوي script.js على وظيفة تفكيك الـ Frontmatter. مثال:

JavaScript
function parseFrontmatter(text) {
    const regex = /^---\s*([\s\S]*?)\s*---/;
    const match = text.match(regex);
    if (!match) return { data: {}, content: text };
    
    const yaml = match[1];
    const data = {};
    yaml.split('\n').forEach(line => {
        const [key, value] = line.split(':').map(s => s.trim());
        if (key && value) data[key] = value;
    });
    return { data, content: text.replace(regex, '') };
}
ثانياً: منطق تحديث البطاقات (UI Mapping)
يجب توجيه الوكيل لربط الكاتيجوري بالبطاقة:

إذا كان category == "Dev/Home":

ابحث عن العنصر #dev-card-progress.

حدث العرض ليصبح 45%.

ضع عنوان النوت كـ "Last Update".

5. ملاحظات التطوير المستمر
Mobile-First: لا تضف أي عنصر يتطلب عرضاً أكثر من 400px.

No Praise/No Tokens Waste: التركيز فقط على الكود الوظيفي (Functional Code).

Hierarchy: الحفاظ على إزاحة المستويات الستة في الأكورديون (10px لكل مستوى).

## 🚀 كيفية الاستخدام

1. **إضافة ملفات جديدة**: أضف ملفات Markdown في مجلد `logs/` مع frontmatter مناسب
2. **تحديث البيانات**: شغّل `node generate-manifest.js` لإعادة بناء `manifest.json`
3. **النشر**: ارفع الملفات إلى GitHub Pages للنشر العام

## 📁 هيكل المشروع
```
watsher/
├── index.html          # الواجهة الرئيسية
├── style.css           # التصميم (Dark Mode)
├── script.js           # المحرك الرئيسي
├── manifest.json       # بيانات الملفات (مولد تلقائياً)
├── generate-manifest.js # مولد البيانات
└── logs/               # ملفات Markdown المصدر
    ├── Dev/
    ├── Creative/
    └── HomeLab/
```

## 🔧 التقنيات المستخدمة
- **Frontend**: Vanilla JavaScript + HTML5 + CSS3
- **Markdown Processing**: markdown-it library
- **Data Storage**: JSON manifest (static)
- **Hosting**: GitHub Pages
- **Styling**: CSS Grid/Flexbox + CSS Variables
