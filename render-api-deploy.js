/**
 * سكريبت لاستخدام Render API للنشر التلقائي
 * استخدام: node render-api-deploy.js
 * 
 * متطلبات:
 * - متغير البيئة RENDER_API_KEY: مفتاح API من Render.com
 * - متغير البيئة RENDER_SERVICE_ID: معرّف الخدمة على Render.com
 */

// استيراد المكتبات المطلوبة
const https = require('https');
const readline = require('readline');

// التحقق من متغيرات البيئة المطلوبة
const RENDER_API_KEY = process.env.RENDER_API_KEY;
const SERVICE_ID = process.env.RENDER_SERVICE_ID;

// التحقق من توفر المتغيرات المطلوبة
if (!RENDER_API_KEY || !SERVICE_ID) {
  console.error('❌ الرجاء تعيين متغيرات البيئة المطلوبة:');
  console.error('  RENDER_API_KEY: مفتاح API من Render.com');
  console.error('  RENDER_SERVICE_ID: معرّف الخدمة على Render.com');
  console.error('\nمثال:');
  console.error('  RENDER_API_KEY=your_api_key RENDER_SERVICE_ID=srv-your_service_id node render-api-deploy.js');
  process.exit(1);
}

// دالة لإرسال طلب HTTP إلى Render API
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.render.com',
      port: 443,
      path: `/v1/${path}`,
      method: method,
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${RENDER_API_KEY}`
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
        try {
          const parsedData = JSON.parse(responseData);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsedData);
          } else {
            reject({
              statusCode: res.statusCode,
              message: parsedData.message || 'حدث خطأ غير متوقع',
              data: parsedData
            });
          }
        } catch (e) {
          reject({
            statusCode: res.statusCode,
            message: 'فشل في تحليل الاستجابة',
            error: e.message,
            data: responseData
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject({
        message: 'خطأ في الاتصال',
        error: error.message
      });
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// دالة للحصول على معلومات الخدمة
async function getServiceInfo() {
  console.log(`🔍 جاري الحصول على معلومات الخدمة (${SERVICE_ID})...`);
  
  try {
    const serviceInfo = await makeRequest('GET', `services/${SERVICE_ID}`);
    console.log(`✅ تم العثور على الخدمة: ${serviceInfo.name}`);
    console.log(`  - النوع: ${serviceInfo.type}`);
    console.log(`  - الحالة: ${serviceInfo.state}`);
    console.log(`  - URL: ${serviceInfo.url}`);
    return serviceInfo;
  } catch (error) {
    console.error('❌ فشل في الحصول على معلومات الخدمة:');
    console.error(error);
    process.exit(1);
  }
}

// دالة لبدء عملية نشر جديدة
async function startDeploy(clearCache = true) {
  console.log('🚀 جاري بدء عملية نشر جديدة...');
  
  try {
    const deployOptions = { clearCache: clearCache ? 'clear' : 'no_clear' };
    const deployResponse = await makeRequest('POST', `services/${SERVICE_ID}/deploys`, deployOptions);
    
    console.log(`✅ تم بدء النشر بنجاح (معرّف: ${deployResponse.id})`);
    return deployResponse;
  } catch (error) {
    console.error('❌ فشل في بدء النشر:');
    console.error(error);
    process.exit(1);
  }
}

// دالة للحصول على حالة النشر
async function getDeployStatus(deployId) {
  try {
    return await makeRequest('GET', `services/${SERVICE_ID}/deploys/${deployId}`);
  } catch (error) {
    console.error(`❌ فشل في الحصول على حالة النشر (${deployId}):`);
    console.error(error);
    throw error;
  }
}

// دالة لمراقبة حالة النشر
async function monitorDeploy(deployId) {
  console.log('⏳ جاري مراقبة حالة النشر...');
  
  let deployStatus = 'in_progress';
  let lastMessage = '';
  
  while (deployStatus === 'in_progress' || deployStatus === 'pending') {
    await new Promise(resolve => setTimeout(resolve, 5000)); // انتظار 5 ثوانٍ
    
    try {
      const deployInfo = await getDeployStatus(deployId);
      deployStatus = deployInfo.status;
      
      // عرض آخر رسالة من السجل إذا كانت متوفرة
      if (deployInfo.deploy_log && deployInfo.deploy_log.length > 0) {
        const latestMessage = deployInfo.deploy_log[deployInfo.deploy_log.length - 1].message;
        if (latestMessage !== lastMessage) {
          lastMessage = latestMessage;
          console.log(`📝 ${latestMessage}`);
        }
      }
      
      console.log(`📊 حالة النشر: ${deployStatus}`);
    } catch (error) {
      console.error('❌ فشل في الحصول على تحديث حالة النشر، جاري المحاولة مرة أخرى...');
    }
  }
  
  // عرض نتيجة النشر النهائية
  if (deployStatus === 'live') {
    console.log('✅ تم النشر بنجاح!');
    return true;
  } else {
    console.error(`❌ فشل النشر! الحالة النهائية: ${deployStatus}`);
    console.error('للمزيد من المعلومات، تحقق من سجلات النشر في لوحة تحكم Render.');
    return false;
  }
}

// دالة لإعادة تشغيل الخدمة
async function restartService() {
  console.log('🔄 جاري إعادة تشغيل الخدمة...');
  
  try {
    await makeRequest('POST', `services/${SERVICE_ID}/restart`);
    console.log('✅ تم إرسال طلب إعادة التشغيل بنجاح');
    return true;
  } catch (error) {
    console.error('❌ فشل في إعادة تشغيل الخدمة:');
    console.error(error);
    return false;
  }
}

// دالة لتحديث متغيرات البيئة
async function updateEnvironmentVariables(envVars) {
  console.log('🔧 جاري تحديث متغيرات البيئة...');
  
  try {
    const envVarsList = Object.entries(envVars).map(([key, value]) => ({ key, value }));
    await makeRequest('PUT', `services/${SERVICE_ID}/env-vars`, { envVars: envVarsList });
    console.log('✅ تم تحديث متغيرات البيئة بنجاح');
    return true;
  } catch (error) {
    console.error('❌ فشل في تحديث متغيرات البيئة:');
    console.error(error);
    return false;
  }
}

// دالة لإنشاء واجهة تفاعلية بسيطة
function createInterface() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  console.log('\n🛠️  أداة نشر ButterBakery على Render.com 🛠️\n');
  
  const showMenu = () => {
    console.log('\nالرجاء اختيار إحدى العمليات التالية:');
    console.log('1. عرض معلومات الخدمة');
    console.log('2. بدء عملية نشر جديدة');
    console.log('3. إعادة تشغيل الخدمة');
    console.log('4. تحديث متغير بيئة DATABASE_URL');
    console.log('0. خروج');
    
    rl.question('\nاختيارك: ', async (answer) => {
      switch (answer.trim()) {
        case '1':
          await getServiceInfo();
          showMenu();
          break;
        
        case '2':
          rl.question('هل تريد مسح ذاكرة التخزين المؤقت؟ (y/n): ', async (clearCacheAnswer) => {
            const clearCache = clearCacheAnswer.toLowerCase() === 'y';
            const deploy = await startDeploy(clearCache);
            await monitorDeploy(deploy.id);
            showMenu();
          });
          break;
        
        case '3':
          await restartService();
          showMenu();
          break;
        
        case '4':
          rl.question('أدخل رابط قاعدة البيانات الجديد (DATABASE_URL): ', async (dbUrl) => {
            if (dbUrl.trim()) {
              await updateEnvironmentVariables({ DATABASE_URL: dbUrl.trim() });
              rl.question('هل تريد إعادة تشغيل الخدمة الآن؟ (y/n): ', async (restartAnswer) => {
                if (restartAnswer.toLowerCase() === 'y') {
                  await restartService();
                }
                showMenu();
              });
            } else {
              console.log('❌ رابط قاعدة البيانات غير صالح');
              showMenu();
            }
          });
          break;
        
        case '0':
          console.log('👋 شكراً لاستخدام أداة نشر ButterBakery!');
          rl.close();
          break;
        
        default:
          console.log('❌ اختيار غير صالح، الرجاء المحاولة مرة أخرى');
          showMenu();
          break;
      }
    });
  };
  
  showMenu();
}

// الدالة الرئيسية
async function main() {
  try {
    // التحقق من صلاحية مفتاح API
    await getServiceInfo();
    
    // بدء الواجهة التفاعلية
    createInterface();
  } catch (error) {
    console.error('❌ حدث خطأ غير متوقع:');
    console.error(error);
    process.exit(1);
  }
}

// تنفيذ البرنامج
main();