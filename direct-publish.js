/**
 * سكريبت النشر المباشر على المستودع المحدد
 * يستخدم لدمج الفرع في الفرع الرئيسي مباشرة
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

// التحقق من المستودع والفروع
async function checkRepositoryAndBranches() {
  console.log(`🔍 جاري التحقق من المستودع ${repoInfo.owner}/${repoInfo.repo}...`);
  
  try {
    // التحقق من وجود المستودع
    const repoResponse = await makeRequest('GET', `/repos/${repoInfo.owner}/${repoInfo.repo}`);
    console.log(`✅ المستودع موجود: ${repoResponse.data.html_url}`);
    
    // إنشاء فرع جديد
    const branchName = `update-${Date.now().toString().substring(7)}-${Math.random().toString(36).substring(2, 8)}`;
    console.log(`🔄 إنشاء فرع جديد: ${branchName}...`);
    
    // الحصول على SHA للفرع الرئيسي
    const branchResponse = await makeRequest('GET', `/repos/${repoInfo.owner}/${repoInfo.repo}/git/ref/heads/${repoInfo.branch}`);
    const sha = branchResponse.data.object.sha;
    
    // إنشاء الفرع الجديد
    await makeRequest('POST', `/repos/${repoInfo.owner}/${repoInfo.repo}/git/refs`, {
      ref: `refs/heads/${branchName}`,
      sha
    });
    
    console.log(`✅ تم إنشاء الفرع ${branchName}`);
    
    return { success: true, branchName, repoUrl: repoResponse.data.html_url };
  } catch (error) {
    console.error(`❌ فشل في التحقق من المستودع أو إنشاء الفرع: ${error.message}`);
    throw error;
  }
}

// إنشاء طلب سحب
async function createPullRequest(branchName) {
  console.log(`🔄 إنشاء طلب سحب من ${branchName} إلى ${repoInfo.branch}...`);
  
  try {
    const response = await makeRequest('POST', `/repos/${repoInfo.owner}/${repoInfo.repo}/pulls`, {
      title: 'إضافة دليل الحل النهائي لمشكلة Render.com',
      body: 'هذا الطلب يضيف وثيقة RENDER_FINAL_SOLUTION.md التي توضح الحل النهائي لمشكلة النشر على Render.com وخطوات استخدام المستودع المحدث.',
      head: branchName,
      base: repoInfo.branch
    });
    
    console.log(`✅ تم إنشاء طلب السحب: ${response.data.html_url}`);
    return response.data;
  } catch (error) {
    console.error(`❌ فشل في إنشاء طلب السحب: ${error.message}`);
    throw error;
  }
}

// دمج طلب السحب
async function mergePullRequest(pullRequest) {
  console.log(`🔄 جاري دمج طلب السحب #${pullRequest.number}...`);
  
  try {
    const response = await makeRequest('PUT', `/repos/${repoInfo.owner}/${repoInfo.repo}/pulls/${pullRequest.number}/merge`, {
      merge_method: 'merge',
      commit_title: 'إضافة دليل الحل النهائي لمشكلة Render.com',
      commit_message: 'تم إضافة وثيقة RENDER_FINAL_SOLUTION.md التي توضح الحل النهائي لمشكلة النشر على Render.com وخطوات استخدام المستودع المحدث.'
    });
    
    console.log(`✅ تم دمج طلب السحب بنجاح!`);
    return response.data;
  } catch (error) {
    console.error(`❌ فشل في دمج طلب السحب: ${error.message}`);
    throw error;
  }
}

// رفع ملف مباشرة
async function uploadFileDirectly(branchName) {
  console.log(`📝 جاري رفع ملف RENDER_FINAL_SOLUTION.md إلى الفرع ${branchName}...`);
  
  try {
    // قراءة محتوى الملف
    const filePath = './RENDER_FINAL_SOLUTION.md';
    const content = fs.readFileSync(filePath, 'utf8');
    
    // تحويل المحتوى إلى Base64
    const contentBase64 = Buffer.from(content).toString('base64');
    
    // رفع الملف
    const response = await makeRequest('PUT', `/repos/${repoInfo.owner}/${repoInfo.repo}/contents/RENDER_FINAL_SOLUTION.md`, {
      message: 'إضافة دليل الحل النهائي لمشكلة Render.com',
      content: contentBase64,
      branch: branchName
    });
    
    console.log(`✅ تم رفع الملف RENDER_FINAL_SOLUTION.md بنجاح`);
    return response.data;
  } catch (error) {
    console.error(`❌ فشل في رفع الملف: ${error.message}`);
    throw error;
  }
}

// وظيفة النشر المباشر
async function publishDirectly() {
  try {
    console.log('\n🚀 بدء عملية النشر المباشر لملف RENDER_FINAL_SOLUTION.md...\n');
    
    // التحقق من المستودع وإنشاء فرع جديد
    const { branchName, repoUrl } = await checkRepositoryAndBranches();
    
    // رفع الملف إلى الفرع الجديد
    await uploadFileDirectly(branchName);
    
    // إنشاء طلب سحب
    const pullRequest = await createPullRequest(branchName);
    
    // دمج طلب السحب
    const mergeResult = await mergePullRequest(pullRequest);
    
    console.log('\n✅ تمت عملية النشر المباشر بنجاح!');
    console.log(`📊 تفاصيل النشر:`);
    console.log(`  - رابط المستودع: ${repoUrl}`);
    console.log(`  - رابط طلب السحب: ${pullRequest.html_url}`);
    console.log(`  - تم الدمج في الفرع: ${repoInfo.branch}`);
    console.log(`  - رسالة الدمج: ${mergeResult.message || 'تم الدمج بنجاح'}`);
    
    return {
      success: true,
      repository: repoUrl,
      pullRequest: pullRequest.html_url,
      message: mergeResult.message
    };
  } catch (error) {
    console.error('❌ فشل في عملية النشر المباشر:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// تنفيذ وظيفة النشر المباشر
publishDirectly().catch(error => {
  console.error('❌ فشل في تنفيذ البرنامج:', error);
  process.exit(1);
});