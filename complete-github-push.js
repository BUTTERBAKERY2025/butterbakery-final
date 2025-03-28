/**
 * سكريبت الرفع الكامل والمباشر لمشروع ButterBakery إلى GitHub
 * يستخدم لرفع جميع ملفات المشروع دفعة واحدة
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

// الحصول على قائمة الفروع
async function listBranches() {
  try {
    const response = await makeRequest('GET', `/repos/${repoInfo.owner}/${repoInfo.repo}/branches`);
    return response.data.map(branch => branch.name);
  } catch (error) {
    console.error(`❌ فشل في الحصول على قائمة الفروع: ${error.message}`);
    return [];
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

// جمع جميع الملفات
function collectAllFiles() {
  console.log('📂 جاري جمع ملفات المشروع...');
  const files = [];
  
  // قائمة المجلدات التي يجب تجاهلها
  const ignoreDirectories = [
    'node_modules', '.git', '.github', '.replit', 'db-backups', 'backups', 
    'github-temp', 'github-deploy', 'render_deploy', 'data', 'temp_extract'
  ];
  
  // قائمة امتدادات الملفات التي يجب تجاهلها
  const ignoreExtensions = [
    '.zip', '.tgz', '.tar.gz', '.log', '.DS_Store'
  ];
  
  // دالة لتحديد ما إذا كان يجب تجاهل الملف أو لا
  function shouldIgnore(filePath) {
    // فحص المجلدات المتجاهلة
    const normalizedPath = filePath.replace(/\\/g, '/');
    if (ignoreDirectories.some(dir => normalizedPath.includes(`/${dir}/`) || normalizedPath === dir)) {
      return true;
    }
    
    // فحص امتدادات الملفات المتجاهلة
    if (ignoreExtensions.some(ext => normalizedPath.endsWith(ext))) {
      return true;
    }
    
    // تجاهل الملفات المخفية (تبدأ بنقطة)
    const fileName = path.basename(normalizedPath);
    if (fileName.startsWith('.') && fileName !== '.env.example') {
      return true;
    }
    
    return false;
  }
  
  // دالة قراءة المجلد بشكل متكرر
  function readDirRecursively(currentDir, basePath = '') {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relativePath = path.join(basePath, entry.name);
      
      if (shouldIgnore(relativePath)) {
        continue;
      }
      
      if (entry.isDirectory()) {
        readDirRecursively(fullPath, relativePath);
      } else {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          files.push({
            path: relativePath.replace(/\\/g, '/'),
            content: content
          });
        } catch (error) {
          // بعض الملفات الثنائية قد تسبب مشاكل عند القراءة كنص
          console.log(`⚠️ تم تجاهل الملف ${relativePath}: ${error.message}`);
        }
      }
    }
  }
  
  // قراءة المجلد الحالي
  readDirRecursively('.', '');
  
  console.log(`✅ تم جمع ${files.length} ملف من المشروع`);
  return files;
}

// رفع الملفات مباشرة
async function pushFilesDirectly(branchName, files) {
  console.log(`📤 جاري رفع ${files.length} ملف إلى الفرع ${branchName}...`);
  
  // رفع الملفات على دفعات لتجنب مشاكل الحجم الكبير
  const batchSize = 5;
  const batches = [];
  
  for (let i = 0; i < files.length; i += batchSize) {
    batches.push(files.slice(i, i + batchSize));
  }
  
  console.log(`🔄 سيتم رفع الملفات على ${batches.length} دفعة...`);
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`📦 جاري رفع الدفعة ${i + 1}/${batches.length} (${batch.length} ملف)...`);
    
    for (const file of batch) {
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
      } catch (error) {
        console.error(`❌ فشل في رفع الملف ${file.path}: ${error.message}`);
      }
    }
    
    // انتظار قليلاً بين الدفعات لتجنب تقييد معدل الطلبات
    if (i < batches.length - 1) {
      console.log('⏳ انتظار قبل رفع الدفعة التالية...');
      await new Promise(resolve => setTimeout(resolve, 2000));
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

// الوظيفة الرئيسية للنشر على GitHub
async function deployToGitHub() {
  try {
    console.log('\n🚀 بدء عملية نشر المشروع على GitHub...\n');
    
    // التحقق من وجود المستودع
    const { exists, repoUrl } = await checkRepository();
    if (!exists) {
      console.error('❌ المستودع غير موجود، يرجى إنشائه أولاً');
      return { success: false, error: 'المستودع غير موجود' };
    }
    
    // إنشاء فرع جديد للتحديثات
    const newBranch = `update-${Date.now().toString().substring(7)}-${Math.random().toString(36).substring(2, 8)}`;
    const branchCreated = await createBranch(newBranch);
    if (!branchCreated) {
      return { success: false, error: 'فشل في إنشاء الفرع الجديد' };
    }
    
    // جمع جميع الملفات
    const files = collectAllFiles();
    
    // رفع الملفات إلى الفرع الجديد
    const filesUploaded = await pushFilesDirectly(newBranch, files);
    if (!filesUploaded) {
      return { success: false, error: 'فشل في رفع الملفات' };
    }
    
    // إنشاء طلب سحب
    const pullRequest = await createPullRequest(
      'تحديث شامل لتطبيق ButterBakery',
      'هذا الطلب يحتوي على تحديث شامل لجميع ملفات المشروع، بما في ذلك إصلاحات Render.com وتحسينات التوثيق.',
      newBranch
    );
    
    if (!pullRequest) {
      return { success: false, error: 'فشل في إنشاء طلب السحب' };
    }
    
    console.log('\n✅ تمت عملية نشر المشروع على GitHub بنجاح!');
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
deployToGitHub().catch(error => {
  console.error('❌ فشل في تنفيذ البرنامج:', error);
  process.exit(1);
});