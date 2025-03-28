/**
 * سكريبت الحصول على معلومات المستودع المحدث
 * يستخدم لعرض رابط المستودع والتغييرات التي تم رفعها
 */

import https from 'https';

// الحصول على توكن GitHub من متغيرات البيئة
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
if (!GITHUB_TOKEN) {
  console.error('❌ يرجى تعيين متغير البيئة GITHUB_TOKEN');
  process.exit(1);
}

// معلومات المستودع
const repoInfo = {
  owner: 'BUTTERBAKERY2025',
  repo: 'butterbakery-final',
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
            reject({
              statusCode: res.statusCode,
              message: JSON.parse(responseData).message || 'فشل الطلب',
              data: responseData
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

// الحصول على معلومات المستودع
async function getRepositoryInfo() {
  console.log(`🔍 جاري الحصول على معلومات المستودع ${repoInfo.owner}/${repoInfo.repo}...`);
  
  try {
    const response = await makeRequest('GET', `/repos/${repoInfo.owner}/${repoInfo.repo}`);
    console.log(`✅ تم العثور على المستودع: ${response.data.html_url}`);
    return response.data;
  } catch (error) {
    console.error(`❌ فشل في العثور على المستودع: ${error.message}`);
    throw error;
  }
}

// الحصول على آخر الالتزامات في المستودع
async function getLatestCommits() {
  console.log(`🔄 جاري الحصول على آخر الالتزامات في فرع ${repoInfo.branch}...`);
  
  try {
    const response = await makeRequest('GET', `/repos/${repoInfo.owner}/${repoInfo.repo}/commits?sha=${repoInfo.branch}&per_page=5`);
    console.log(`✅ تم العثور على ${response.data.length} التزامات أخيرة`);
    return response.data;
  } catch (error) {
    console.error(`❌ فشل في الحصول على الالتزامات: ${error.message}`);
    throw error;
  }
}

// الحصول على قائمة الملفات في الفرع
async function getFilesInBranch() {
  console.log(`📁 جاري الحصول على قائمة الملفات في الفرع ${repoInfo.branch}...`);
  
  try {
    const response = await makeRequest('GET', `/repos/${repoInfo.owner}/${repoInfo.repo}/contents?ref=${repoInfo.branch}`);
    
    // البحث عن ملفات الإصلاح المحددة
    const fixFiles = ['start.js', 'render.yaml', 'Procfile', 'RENDER_FIXED_DEPLOYMENT.md', 'RENDER_ERROR_FIX.md', 'RENDER_DEPLOYMENT_FIX.md'];
    const foundFiles = response.data.filter(file => fixFiles.includes(file.name));
    
    console.log(`✅ تم العثور على ${foundFiles.length} ملفات إصلاح من أصل ${fixFiles.length}`);
    return foundFiles;
  } catch (error) {
    console.error(`❌ فشل في الحصول على قائمة الملفات: ${error.message}`);
    throw error;
  }
}

// الوظيفة الرئيسية
async function main() {
  try {
    console.log('\n🚀 عرض معلومات المستودع المحدث...\n');
    
    // الحصول على معلومات المستودع
    const repo = await getRepositoryInfo();
    
    // الحصول على آخر الالتزامات
    const commits = await getLatestCommits();
    
    // الحصول على قائمة الملفات
    const files = await getFilesInBranch();
    
    // طباعة المعلومات
    console.log('\n📊 معلومات المستودع:');
    console.log(`  - اسم المستودع: ${repo.name}`);
    console.log(`  - الوصف: ${repo.description || 'لا يوجد وصف'}`);
    console.log(`  - رابط المستودع: ${repo.html_url}`);
    console.log(`  - عدد النجوم: ${repo.stargazers_count}`);
    console.log(`  - الفرع الرئيسي: ${repo.default_branch}`);
    console.log(`  - تاريخ آخر تحديث: ${new Date(repo.updated_at).toLocaleString()}`);
    
    console.log('\n📝 آخر الالتزامات:');
    commits.forEach((commit, index) => {
      console.log(`  ${index + 1}. ${commit.commit.message}`);
      console.log(`     تاريخ: ${new Date(commit.commit.author.date).toLocaleString()}`);
      console.log(`     الرابط: ${commit.html_url}`);
    });
    
    console.log('\n📁 ملفات الإصلاح التي تم رفعها:');
    files.forEach((file, index) => {
      console.log(`  ${index + 1}. ${file.name}`);
      console.log(`     النوع: ${file.type}`);
      console.log(`     الرابط: ${file.html_url}`);
    });
    
    console.log('\n✅ تم تحديث المستودع بنجاح!');
    console.log('يمكنك الآن إعادة نشر التطبيق على Render.com للتحقق من الإصلاح.');
    console.log(`📌 رابط المستودع: ${repo.html_url}`);
    
    return {
      success: true,
      repository: repo.html_url,
      files: files.length
    };
  } catch (error) {
    console.error('❌ فشل في الحصول على معلومات المستودع:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// تنفيذ الوظيفة الرئيسية
main().catch(error => {
  console.error('❌ فشل في تنفيذ البرنامج:', error);
  process.exit(1);
});