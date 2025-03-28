# إصلاح مشكلة نشر تطبيق ButterBakery على Render.com

هذا الدليل يوضح كيفية إصلاح مشكلة `Cannot find module '/opt/render/project/src/start.js'` التي تظهر عند نشر تطبيق ButterBakery على منصة Render.com.

## ملخص المشكلة

يحاول Render.com تشغيل ملف `start.js` في جذر المشروع، ولكن هذا الملف غير موجود في النسخة الحالية من المشروع.

## الحل

قمنا بإضافة الملفات التالية لحل المشكلة:

1. **start.js**: نقطة دخول أساسية للتطبيق على Render.com
2. **render.yaml**: ملف تكوين يحدد كيفية بناء وتشغيل التطبيق
3. **Procfile**: ملف يحدد أوامر التشغيل للتطبيق
4. **render-fix-uploader.js**: سكريبت لرفع ملفات الإصلاح إلى GitHub
5. **render-db-check.js**: أداة للتحقق من اتصال قاعدة البيانات في Render.com

## خطوات الإصلاح

### 1. تثبيت السكريبت على المستودع المحلي

تأكد من وجود الملفات التالية في جذر المشروع:

- `start.js`
- `render.yaml`
- `Procfile`
- `render-fix-uploader.js`
- `render-db-check.js`

### 2. رفع ملفات الإصلاح إلى GitHub

هناك ثلاث طرق لرفع الملفات إلى المستودع:

#### الطريقة 1: استخدام سكريبت الإصلاح المخصص

```bash
# تأكد من وجود متغير GITHUB_TOKEN في البيئة
export GITHUB_TOKEN="your_github_token"

# تنفيذ سكريبت الإصلاح
node render-fix-uploader.js
```

#### الطريقة 2: استخدام سكريبت النشر المباشر

```bash
# تأكد من وجود متغير GITHUB_TOKEN في البيئة
export GITHUB_TOKEN="your_github_token"

# يمكن أيضاً تحديد معلومات المستودع
export GITHUB_REPO_INFO='{"owner":"BUTTERBAKERY2025","repo":"butterbakery-app","branch":"main"}'

# تنفيذ سكريبت النشر
node direct-github-push.js
```

#### الطريقة 3: استخدام سكريبت الملفات الأساسية

```bash
# تأكد من وجود متغير GITHUB_TOKEN في البيئة
export GITHUB_TOKEN="your_github_token"

# تنفيذ سكريبت الملفات الأساسية
node essential-files-push.js
```

### 3. دمج التغييرات في الفرع الرئيسي

بعد رفع الملفات، يمكنك دمج طلب السحب يدوياً عبر واجهة GitHub أو استخدام السكريبت التالي:

```bash
# تأكد من وجود متغير GITHUB_TOKEN في البيئة
export GITHUB_TOKEN="your_github_token"

# تنفيذ سكريبت الدمج المباشر
node direct-publish.js
```

### 4. إعادة نشر التطبيق على Render.com

بعد دمج التغييرات، انتقل إلى لوحة تحكم Render.com وأعد نشر التطبيق:

1. انتقل إلى صفحة خدمة ButterBakery على Render.com
2. انقر على زر "Manual Deploy" ثم اختر "Deploy latest commit"
3. انتظر حتى يكتمل النشر (قد يستغرق بضع دقائق)

### 5. التحقق من نجاح الإصلاح

بعد اكتمال النشر، تحقق من سجلات التطبيق في Render.com. يجب أن ترى رسائل بدء التشغيل من ملف `start.js`:

```
🚀 خادم ButterBakery يعمل على المنفذ ...
📂 المسار: /opt/render/project/src
...
```

## التحقق من قاعدة البيانات

يمكنك استخدام سكريبت `render-db-check.js` للتحقق من صحة اتصال قاعدة البيانات:

```bash
# تأكد من وجود متغير DATABASE_URL في البيئة
export DATABASE_URL="postgresql://..."

# تنفيذ سكريبت التحقق
node render-db-check.js
```

## وثائق إضافية

للحصول على مزيد من المعلومات حول النشر على Render.com، راجع الملفات التالية:

- [RENDER_FIXED_DEPLOYMENT.md](./RENDER_FIXED_DEPLOYMENT.md): دليل مفصل للنشر بعد الإصلاح
- [RENDER_ERROR_FIX.md](./RENDER_ERROR_FIX.md): معلومات فنية حول الخطأ وطريقة إصلاحه

## ملاحظة هامة

تأكد من تكوين متغير `DATABASE_URL` في Render.com للإشارة إلى قاعدة بيانات PostgreSQL الخاصة بك. يمكنك استخدام خدمة قاعدة البيانات المدارة من Render.com أو أي خدمة PostgreSQL أخرى.