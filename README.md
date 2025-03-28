# ButterBakery OPS - نظام إدارة المبيعات والمخزون

![ButterBakery Logo](./public/logo.png)

نظام متكامل لإدارة المبيعات، والنقد، والمخزون لشبكة مخابز "باتر بيكري" مع دعم ثنائي اللغة (العربية والإنجليزية).

## الميزات الرئيسية

- ✓ إدارة المبيعات اليومية مع تتبع المبيعات النقدية والشبكية
- ✓ إدارة صندوق النقد مع عمليات الإيداع والسحب والتحويل للمقر الرئيسي
- ✓ نظام للمكافآت والحوافز مع لوحات المتصدرين
- ✓ تحليلات المبيعات والأداء
- ✓ نظام المصادقة مع أدوار مختلفة (مدير، مدير فرع، أمين صندوق)
- ✓ دعم كامل للغة العربية والإنجليزية
- ✓ نسخ احتياطي واستعادة قاعدة البيانات

## المتطلبات الفنية

- Node.js v16 أو أعلى (متوافق مع Node.js v22)
- قاعدة بيانات PostgreSQL
- متغير بيئة `DATABASE_URL` يحتوي على رابط اتصال قاعدة البيانات

## البدء السريع

```bash
# تثبيت الاعتماديات
npm install

# تشغيل التطبيق في وضع التطوير
npm run dev

# البناء للإنتاج
npm run build

# تشغيل الإصدار المبني
npm start
```

## خيارات النشر

يمكن نشر هذا التطبيق على:

1. **Render.com** - متوافق تمامًا مع جميع الإصلاحات اللازمة
2. **AWS Elastic Beanstalk** - للاستضافة المؤسساتية
3. **GitHub Pages** - كواجهة أمامية فقط (يتطلب خدمة خلفية منفصلة)

للحصول على تعليمات مفصلة حول النشر، راجع:
- [دليل النشر](./DEPLOYMENT_INSTRUCTIONS.md) (العربية)
- [Deployment Instructions](./DEPLOYMENT_INSTRUCTIONS_EN.md) (English)

## الترخيص

جميع الحقوق محفوظة © ButterBakery 2025