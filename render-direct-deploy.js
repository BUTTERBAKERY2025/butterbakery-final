/**
 * سكريبت النشر المباشر على Render.com
 * يستخدم واجهة API الرسمية لـ Render.com للقيام بالنشر والتحكم في الخدمة
 * 
 * لاستخدام هذا السكريبت، يجب أن يكون لديك:
 * 1. مفتاح API من Render.com
 * 2. معرف الخدمة الخاصة بك (serviceId)
 * 
 * يجب تعيين مفتاح API في المتغير البيئي RENDER_API_KEY
 */

const fetch = require('node-fetch');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// الثوابت
const RENDER_API_BASE_URL = 'https://api.render.com/v1';
const API_KEY = process.env.RENDER_API_KEY;
let serviceId = null;

// إنشاء واجهة للقراءة والكتابة
function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

// وظيفة لإرسال طلبات HTTP إلى واجهة برمجة تطبيقات Render
function makeRequest(method, path, data = null) {
  const url = `${RENDER_API_BASE_URL}${path}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    }
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  return fetch(url, options)
    .then(response => {
      if (!response.ok) {
        return response.text().then(text => {
          throw new Error(`API error (${response.status}): ${text}`);
        });
      }
      return response.json();
    });
}

// الحصول على معلومات الخدمة
async function getServiceInfo() {
  if (!serviceId) {
    // محاولة العثور على الخدمات القائمة
    const services = await makeRequest('GET', '/services');
    console.log('📋 الخدمات المتاحة:');
    
    services.forEach((service, index) => {
      console.log(`${index + 1}. ${service.name} (${service.id}) - ${service.type}`);
    });

    const rl = createInterface();
    
    if (services.length > 0) {
      // اطلب من المستخدم اختيار الخدمة
      const answer = await new Promise(resolve => {
        rl.question('\n👉 اختر رقم الخدمة: ', resolve);
      });
      
      const serviceIndex = parseInt(answer, 10) - 1;
      if (serviceIndex >= 0 && serviceIndex < services.length) {
        serviceId = services[serviceIndex].id;
      } else {
        rl.close();
        throw new Error('اختيار غير صالح!');
      }
    } else {
      // إذا لم يتم العثور على خدمات، اطلب من المستخدم إدخال معرف الخدمة يدويًا
      serviceId = await new Promise(resolve => {
        rl.question('\n⚠️ لم يتم العثور على خدمات. الرجاء إدخال معرف الخدمة يدويًا: ', resolve);
      });
    }
    
    rl.close();
  }

  // الآن احصل على معلومات الخدمة المحددة
  console.log(`🔍 جاري الحصول على معلومات الخدمة ${serviceId}...`);
  return makeRequest('GET', `/services/${serviceId}`);
}

// بدء نشر جديد
async function startDeploy(clearCache = true) {
  console.log('🚀 جاري بدء عملية النشر...');
  return makeRequest('POST', `/services/${serviceId}/deploys`, {
    clearCache
  });
}

// الحصول على حالة النشر
async function getDeployStatus(deployId) {
  return makeRequest('GET', `/services/${serviceId}/deploys/${deployId}`);
}

// مراقبة عملية النشر
async function monitorDeploy(deployId) {
  console.log('⏳ جاري مراقبة حالة النشر...');
  
  return new Promise((resolve, reject) => {
    const checkInterval = setInterval(async () => {
      try {
        const status = await getDeployStatus(deployId);
        
        // طباعة الحالة الحالية
        const statusEmoji = status.status === 'live' ? '✅' : 
                           status.status === 'build_failed' ? '❌' : 
                           status.status === 'deactivated' ? '⛔' : '⏳';
        
        console.log(`${statusEmoji} حالة النشر: ${status.status}`);
        
        // التحقق مما إذا كانت عملية النشر قد اكتملت أو فشلت
        if (['live', 'build_failed', 'deactivated', 'canceled'].includes(status.status)) {
          clearInterval(checkInterval);
          
          if (status.status === 'live') {
            console.log('✨ تم النشر بنجاح!');
            resolve(status);
          } else {
            console.error(`❌ فشل النشر: ${status.status}`);
            reject(new Error(`فشل النشر: ${status.status}`));
          }
        }
      } catch (error) {
        console.error('خطأ أثناء التحقق من حالة النشر:', error);
        clearInterval(checkInterval);
        reject(error);
      }
    }, 10000); // التحقق كل 10 ثوانٍ
  });
}

// إعادة تشغيل الخدمة
async function restartService() {
  console.log('🔄 جاري إعادة تشغيل الخدمة...');
  return makeRequest('POST', `/services/${serviceId}/restart`);
}

// تحديث المتغيرات البيئية
async function updateEnvironmentVariables(envVars) {
  console.log('🔧 جاري تحديث المتغيرات البيئية...');
  return makeRequest('PUT', `/services/${serviceId}/env-vars`, {
    envVars
  });
}

// الوظيفة الرئيسية
async function main() {
  try {
    console.log('🔑 التحقق من مفتاح API...');
    
    if (!API_KEY) {
      console.error('❌ مفتاح API غير موجود. قم بتعيين متغير البيئة RENDER_API_KEY.');
      process.exit(1);
    }
    
    const rl = createInterface();
    
    // الحصول على معلومات الخدمة
    const service = await getServiceInfo();
    console.log(`✅ تم العثور على الخدمة: ${service.name} (${service.id})`);
    console.log(`   🔗 رابط الخدمة: ${service.serviceDetails.url}`);
    console.log(`   📊 حالة الخدمة: ${service.suspended ? '⛔ معلق' : '✅ نشط'}`);
    
    // عرض القائمة
    console.log('\n📋 القائمة:');
    console.log('1. بدء نشر جديد');
    console.log('2. إعادة تشغيل الخدمة');
    console.log('3. تحديث المتغيرات البيئية');
    console.log('4. خروج');
    
    const choice = await new Promise(resolve => {
      rl.question('\n👉 اختر إجراءً: ', resolve);
    });
    
    switch (choice) {
      case '1': {
        const clearCacheAnswer = await new Promise(resolve => {
          rl.question('هل تريد مسح ذاكرة التخزين المؤقت؟ (y/n): ', resolve);
        });
        const clearCache = clearCacheAnswer.toLowerCase() === 'y';
        
        rl.close();
        
        // بدء النشر
        const deploy = await startDeploy(clearCache);
        console.log(`✅ تم بدء عملية النشر. معرف النشر: ${deploy.id}`);
        
        // مراقبة حالة النشر
        await monitorDeploy(deploy.id);
        break;
      }
      
      case '2':
        rl.close();
        await restartService();
        console.log('✅ تمت إعادة تشغيل الخدمة بنجاح.');
        break;
      
      case '3': {
        console.log('إدخال المتغيرات البيئية بتنسيق KEY=VALUE (أدخل سطرًا فارغًا للانتهاء):');
        const envVars = [];
        
        // استخدم حلقة لطلب المتغيرات البيئية
        let line;
        do {
          line = await new Promise(resolve => {
            rl.question('> ', resolve);
          });
          
          if (line.trim() !== '') {
            const [key, ...valueParts] = line.split('=');
            const value = valueParts.join('=');
            
            if (key && value) {
              envVars.push({ key, value });
              console.log(`✅ تمت إضافة ${key}`);
            } else {
              console.error('❌ تنسيق غير صالح. يجب أن يكون KEY=VALUE.');
            }
          }
        } while (line.trim() !== '');
        
        rl.close();
        
        if (envVars.length > 0) {
          await updateEnvironmentVariables(envVars);
          console.log('✅ تم تحديث المتغيرات البيئية بنجاح.');
        } else {
          console.log('⚠️ لم يتم تحديث أي متغيرات بيئية.');
        }
        break;
      }
      
      case '4':
      default:
        rl.close();
        console.log('👋 تم الخروج.');
        break;
    }
    
  } catch (error) {
    console.error('❌ حدث خطأ:', error.message);
    process.exit(1);
  }
}

// تشغيل السكريبت
main();