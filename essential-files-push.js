/**
 * سكريبت رفع الملفات الأساسية فقط من مشروع ButterBakery إلى GitHub
 */

import https from 'https';
import fs from 'fs';
import path from 'path';

// الحصول على توكن GitHub من متغيرات البيئة
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
if (!GITHUB_TOKEN) {
  console.error('❌ يرجى تعيين متغير البيئة GITHUB_TOKEN');
  process.exit(1);
}

// استيراد معلومات المستودع من متغيرات البيئة أو استخدام القيم الافتراضية
let repoInfo = {
  owner: 'BUTTERBAKERY2025',
  repo: 'butterbakery-app',
  branch: 'main'
};

// وظيفة لإرسال طلب إلى واجهة برمجة تطبيقات GitHub
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      port: 443,
      path,
      method,
      headers: {
        'User-Agent': 'ButterBakery-Deploy',
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    };

    if (data) {
      options.headers['Content-Type'] = 'application/json';
    }

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const jsonData = responseData ? JSON.parse(responseData) : {};
            resolve({ statusCode: res.statusCode, data: jsonData });
          } catch (e) {
            resolve({ statusCode: res.statusCode, data: responseData });
          }
        } else {
          try {
            const errorData = JSON.parse(responseData);
            reject({
              statusCode: res.statusCode,
              message: errorData.message || 'فشل الطلب',
              data: errorData
            });
          } catch (e) {
            reject({
              statusCode: res.statusCode,
              message: 'فشل الطلب',
              data: responseData
            });
          }
        }
      });
    });
    
    req.on('error', (error) => {
      reject({ message: error.message });
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// التحقق من وجود المستودع
async function checkRepository() {
  console.log(`🔍 التحقق من وجود المستودع ${repoInfo.owner}/${repoInfo.repo}...`);
  
  try {
    const response = await makeRequest('GET', `/repos/${repoInfo.owner}/${repoInfo.repo}`);
    console.log(`✅ المستودع موجود: ${response.data.html_url}`);
    return { exists: true, repoUrl: response.data.html_url };
  } catch (error) {
    if (error.statusCode === 404) {
      console.log(`❓ المستودع غير موجود: ${repoInfo.owner}/${repoInfo.repo}`);
      return { exists: false };
    }
    throw error;
  }
}

// إنشاء فرع جديد
async function createBranch(newBranch, baseBranch = repoInfo.branch) {
  console.log(`🔄 إنشاء فرع جديد: ${newBranch} من ${baseBranch}...`);
  
  try {
    // الحصول على SHA للفرع الأساسي
    const branchResponse = await makeRequest('GET', `/repos/${repoInfo.owner}/${repoInfo.repo}/git/ref/heads/${baseBranch}`);
    const sha = branchResponse.data.object.sha;
    
    // إنشاء الفرع الجديد
    await makeRequest('POST', `/repos/${repoInfo.owner}/${repoInfo.repo}/git/refs`, {
      ref: `refs/heads/${newBranch}`,
      sha
    });
    
    console.log(`✅ تم إنشاء الفرع ${newBranch}`);
    return true;
  } catch (error) {
    if (error.statusCode === 422 && error.message.includes('already exists')) {
      console.log(`⚠️ الفرع ${newBranch} موجود بالفعل، سيتم استخدامه`);
      return true;
    }
    
    console.error(`❌ فشل في إنشاء الفرع: ${error.message}`);
    return false;
  }
}

// جمع الملفات الأساسية
function collectEssentialFiles() {
  console.log('📂 جاري جمع الملفات الأساسية للمشروع...');
  const files = [];
  
  // قائمة الملفات الأساسية
  const essentialFiles = [
    'start.js',
    'render.yaml',
    'Procfile',
    'RENDER_FIXED_DEPLOYMENT.md',
    'RENDER_ERROR_FIX.md',
    'RENDER_DEPLOYMENT_FIX.md',
    'RENDER_FINAL_SOLUTION.md',
    'package.json',
    'server/server.js',
    'server/routes.js',
    'server/vite.ts',
    'vite.config.ts',
    'db-connect.js',
    'render-db-check.js',
    'drizzle.config.ts'
  ];
  
  // دالة قراءة المجلد بشكل متكرر للعثور على الملفات الأساسية
  function readDirRecursively(currentDir, basePath) {
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        const relativePath = path.join(basePath, entry.name).replace(/\\/g, '/');
        
        if (entry.isDirectory()) {
          // نتحقق إذا كان هناك ملف أساسي في المجلد الحالي
          const hasEssentialFile = essentialFiles.some(file => {
            const parts = file.split('/');
            return parts.length > 1 && parts[0] === entry.name;
          });
          
          if (hasEssentialFile) {
            readDirRecursively(fullPath, relativePath);
          }
        } else if (essentialFiles.includes(relativePath)) {
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            files.push({
              path: relativePath,
              content: content
            });
            console.log(`📄 تم العثور على الملف الأساسي: ${relativePath}`);
          } catch (error) {
            console.log(`⚠️ تم تجاهل الملف ${relativePath}: ${error.message}`);
          }
        }
      }
    } catch (error) {
      console.error(`❌ خطأ في قراءة المجلد ${currentDir}: ${error.message}`);
    }
  }
  
  // البحث عن الملفات الأساسية في المجلد الحالي
  readDirRecursively('.', '');
  
  // التحقق من الملفات المفقودة
  const foundPaths = files.map(file => file.path);
  const missingFiles = essentialFiles.filter(file => !foundPaths.includes(file));
  
  if (missingFiles.length > 0) {
    console.log(`⚠️ الملفات التالية غير موجودة: ${missingFiles.join(', ')}`);
  }
  
  console.log(`✅ تم جمع ${files.length} ملف أساسي من المشروع`);
  return files;
}

// رفع الملفات على دفعات
async function pushFilesInBatches(branchName, files) {
  console.log(`📤 جاري رفع ${files.length} ملف إلى الفرع ${branchName}...`);
  
  for (const file of files) {
    try {
      console.log(`📝 رفع الملف: ${file.path}...`);
      
      // تحويل المحتوى إلى Base64
      const contentBase64 = Buffer.from(file.content).toString('base64');
      
      // التحقق من وجود الملف
      let existingFile = null;
      try {
        const existingResponse = await makeRequest('GET', `/repos/${repoInfo.owner}/${repoInfo.repo}/contents/${file.path}?ref=${branchName}`);
        existingFile = existingResponse.data;
      } catch (error) {
        // الملف غير موجود، وهذا طبيعي
      }
      
      // تحديث أو إنشاء الملف
      const updateData = {
        message: `تحديث/إضافة ${file.path}`,
        content: contentBase64,
        branch: branchName
      };
      
      if (existingFile && existingFile.sha) {
        updateData.sha = existingFile.sha;
      }
      
      await makeRequest('PUT', `/repos/${repoInfo.owner}/${repoInfo.repo}/contents/${file.path}`, updateData);
      console.log(`✅ تم رفع الملف ${file.path}`);
      
      // انتظار قليلاً بين الملفات لتجنب تقييد معدل الطلبات
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`❌ فشل في رفع الملف ${file.path}: ${error.message}`);
    }
  }
  
  console.log(`✅ تم رفع ${files.length} ملف إلى الفرع ${branchName}`);
  return true;
}

// إنشاء طلب سحب
async function createPullRequest(title, body, head, base = repoInfo.branch) {
  console.log(`🔄 إنشاء طلب سحب من ${head} إلى ${base}...`);
  
  try {
    const response = await makeRequest('POST', `/repos/${repoInfo.owner}/${repoInfo.repo}/pulls`, {
      title,
      body,
      head,
      base
    });
    
    console.log(`✅ تم إنشاء طلب السحب: ${response.data.html_url}`);
    return response.data;
  } catch (error) {
    console.error(`❌ فشل في إنشاء طلب السحب: ${error.message}`);
    return null;
  }
}

// الوظيفة الرئيسية لنشر الملفات الأساسية
async function deployEssentialFiles() {
  try {
    console.log('\n🚀 بدء عملية نشر الملفات الأساسية على GitHub...\n');
    
    // التحقق من وجود المستودع
    const { exists, repoUrl } = await checkRepository();
    if (!exists) {
      console.error('❌ المستودع غير موجود، يرجى إنشائه أولاً');
      return { success: false, error: 'المستودع غير موجود' };
    }
    
    // إنشاء فرع جديد للتحديثات
    const newBranch = `render-fix-${Date.now().toString().substring(7)}-${Math.random().toString(36).substring(2, 8)}`;
    const branchCreated = await createBranch(newBranch);
    if (!branchCreated) {
      return { success: false, error: 'فشل في إنشاء الفرع الجديد' };
    }
    
    // جمع الملفات الأساسية
    const files = collectEssentialFiles();
    if (files.length === 0) {
      return { success: false, error: 'لم يتم العثور على أي ملفات أساسية' };
    }
    
    // رفع الملفات إلى الفرع الجديد
    const filesUploaded = await pushFilesInBatches(newBranch, files);
    if (!filesUploaded) {
      return { success: false, error: 'فشل في رفع الملفات' };
    }
    
    // إنشاء طلب سحب
    const pullRequest = await createPullRequest(
      'إصلاح ملفات Render.com وتحديث التوثيق',
      'هذا الطلب يضيف الملفات اللازمة لإصلاح مشكلة النشر على Render.com ويحدث وثائق المشروع.',
      newBranch
    );
    
    if (!pullRequest) {
      return { success: false, error: 'فشل في إنشاء طلب السحب' };
    }
    
    console.log('\n✅ تمت عملية نشر الملفات الأساسية على GitHub بنجاح!');
    console.log(`📊 تفاصيل النشر:`);
    console.log(`  - رابط المستودع: ${repoUrl}`);
    console.log(`  - الفرع الجديد: ${newBranch}`);
    console.log(`  - عدد الملفات المرفوعة: ${files.length}`);
    console.log(`  - رابط طلب السحب: ${pullRequest.html_url}`);
    console.log('\n⚠️ ملاحظة: يجب مراجعة طلب السحب ودمجه يدوياً في الفرع الرئيسي');
    
    return {
      success: true,
      repository: repoUrl,
      branch: newBranch,
      pullRequest: pullRequest.html_url,
      fileCount: files.length
    };
  } catch (error) {
    console.error('❌ فشل في عملية النشر على GitHub:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// تنفيذ وظيفة النشر
deployEssentialFiles().catch(error => {
  console.error('❌ فشل في تنفيذ البرنامج:', error);
  process.exit(1);
});