/**
 * أداة التحقق من اتصال قاعدة البيانات في Render.com
 * تستخدم للتأكد من أن قاعدة البيانات متصلة بشكل صحيح قبل بدء التطبيق
 */

const { Client } = require('pg');

/**
 * التحقق من الاتصال بقاعدة البيانات
 */
async function checkConnection() {
  console.log('🔍 جاري التحقق من الاتصال بقاعدة البيانات...');
  
  // التحقق من توفر رابط قاعدة البيانات
  if (!process.env.DATABASE_URL) {
    console.error('❌ خطأ: متغير DATABASE_URL غير معرف.');
    return false;
  }
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  try {
    await client.connect();
    console.log('✅ تم الاتصال بقاعدة البيانات بنجاح.');
    
    // التحقق من إصدار PostgreSQL
    const versionResult = await client.query('SELECT version();');
    console.log(`📊 إصدار PostgreSQL: ${versionResult.rows[0].version}`);
    
    // الحصول على قائمة الجداول
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    if (tablesResult.rows.length > 0) {
      console.log(`📋 الجداول الموجودة (${tablesResult.rows.length}):`);
      tablesResult.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.table_name}`);
      });
    } else {
      console.log('⚠️ لا توجد جداول في قاعدة البيانات.');
    }
    
    await client.end();
    return true;
  } catch (error) {
    console.error(`❌ خطأ في الاتصال بقاعدة البيانات: ${error.message}`);
    try {
      await client.end();
    } catch (e) {
      // تجاهل أخطاء إغلاق الاتصال
    }
    return false;
  }
}

/**
 * الوظيفة الرئيسية
 */
async function main() {
  try {
    const connected = await checkConnection();
    if (connected) {
      console.log('✅ فحص قاعدة البيانات ناجح.');
    } else {
      console.log('⚠️ فشل فحص قاعدة البيانات.');
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(`❌ خطأ غير متوقع: ${error.message}`);
    process.exitCode = 1;
  }
}

// تنفيذ البرنامج
main();