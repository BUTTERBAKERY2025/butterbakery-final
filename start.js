/**
 * ملف بدء تشغيل تطبيق ButterBakery لمنصة Render.com
 */

// استيراد المكتبات اللازمة
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// تهيئة إكسبرس
const app = express();
const PORT = process.env.PORT || 3000;

// تعيين المجلد العام
app.use(express.static(join(__dirname, 'public')));

// توجيه الطلبات إلى ملف index.html
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

// بدء الاستماع على المنفذ المحدد
app.listen(PORT, () => {
  console.log(`🚀 خادم ButterBakery يعمل على المنفذ ${PORT}`);
  console.log(`📂 المسار: ${__dirname}`);
  
  // التحقق من وجود المجلدات الرئيسية
  const mainFolders = ['client', 'server', 'shared', 'public'];
  console.log('\n📁 التحقق من المجلدات الرئيسية:');
  
  mainFolders.forEach(folder => {
    const exists = fs.existsSync(join(__dirname, folder));
    console.log(`${exists ? '✅' : '❌'} ${folder}`);
  });
  
  // التحقق من وجود الملفات الرئيسية
  const mainFiles = ['package.json', '.env.example', 'vite.config.ts'];
  console.log('\n📄 التحقق من الملفات الرئيسية:');
  
  mainFiles.forEach(file => {
    const exists = fs.existsSync(join(__dirname, file));
    console.log(`${exists ? '✅' : '❌'} ${file}`);
  });
  
  console.log('\n📣 ملاحظة: هذا خادم بسيط للتحقق من صحة النشر. للتشغيل الكامل، قم بتنفيذ الأمر npm run dev');
});