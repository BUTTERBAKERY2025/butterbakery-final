/**
 * ملف ترحيل بيانات Render.com
 * يستخدم في أمر البناء لضمان عدم فقدان البيانات عند التحديث
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// متغيرات البيئة
const DATABASE_URL = process.env.DATABASE_URL;
const BACKUP_DIR = './db-backups';

// التأكد من وجود مجلد النسخ الاحتياطي
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * الاتصال بقاعدة البيانات
 */
async function connectToDatabase() {
  try {
    console.log('🔄 جاري الاتصال بقاعدة البيانات...');
    
    const client = new Client({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    
    await client.connect();
    console.log('✅ تم الاتصال بقاعدة البيانات بنجاح');
    return client;
  } catch (error) {
    console.error('❌ خطأ في الاتصال بقاعدة البيانات:', error.message);
    throw error;
  }
}

/**
 * عمل نسخة احتياطية من قاعدة البيانات الحالية
 */
async function backupCurrentDatabase(client) {
  try {
    console.log('🔄 جاري عمل نسخة احتياطية من قاعدة البيانات الحالية...');
    
    // الحصول على قائمة الجداول
    const tablesResult = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    
    const tables = tablesResult.rows.map(row => row.table_name);
    
    if (tables.length === 0) {
      console.log('⚠️ لا توجد جداول في قاعدة البيانات للنسخ الاحتياطي');
      return false;
    }
    
    console.log(`📋 تم العثور على ${tables.length} جدول`);
    
    // جمع البيانات من كل جدول
    const backup = {};
    
    for (const table of tables) {
      const dataResult = await client.query(`SELECT * FROM "${table}"`);
      backup[table] = dataResult.rows;
      console.log(`📦 تم نسخ ${dataResult.rows.length} سجل من جدول "${table}"`);
    }
    
    // حفظ البيانات في ملف
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(BACKUP_DIR, `backup-${timestamp}.json`);
    
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
    console.log(`✅ تم حفظ النسخة الاحتياطية في: ${backupFile}`);
    
    return backupFile;
  } catch (error) {
    console.error('❌ خطأ في عمل النسخة الاحتياطية:', error.message);
    return false;
  }
}

/**
 * التحقق من وجود الجداول وإنشاؤها إذا لم تكن موجودة
 */
async function ensureTablesExist(client) {
  try {
    console.log('🔄 جاري التحقق من وجود الجداول...');
    
    // إنشاء جدول المستخدمين إذا لم يكن موجوداً
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        branchId INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // إنشاء جدول الفروع إذا لم يكن موجوداً
    await client.query(`
      CREATE TABLE IF NOT EXISTS branches (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        location VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // إنشاء جدول المبيعات اليومية إذا لم يكن موجوداً
    await client.query(`
      CREATE TABLE IF NOT EXISTS daily_sales (
        id SERIAL PRIMARY KEY,
        branchId INTEGER NOT NULL,
        cashierId INTEGER NOT NULL,
        date DATE NOT NULL,
        total DECIMAL(10, 2) NOT NULL,
        cash DECIMAL(10, 2) NOT NULL,
        card DECIMAL(10, 2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        transactions INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        consolidatedId INTEGER
      )
    `);
    
    // إضافة المزيد من الجداول حسب الحاجة...
    
    console.log('✅ تم التحقق من وجود الجداول بنجاح');
    return true;
  } catch (error) {
    console.error('❌ خطأ في إنشاء الجداول:', error.message);
    throw error;
  }
}

/**
 * استعادة البيانات من النسخة الاحتياطية إذا كانت الجداول فارغة
 */
async function restoreDataIfEmpty(client, backupFile) {
  try {
    console.log('🔄 جاري التحقق من البيانات الحالية...');
    
    // التحقق مما إذا كانت الجداول فارغة
    const tablesResult = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    
    const tables = tablesResult.rows.map(row => row.table_name);
    let allTablesEmpty = true;
    
    for (const table of tables) {
      const countResult = await client.query(`SELECT COUNT(*) FROM "${table}"`);
      const count = parseInt(countResult.rows[0].count);
      
      if (count > 0) {
        allTablesEmpty = false;
        console.log(`📊 جدول "${table}" يحتوي على ${count} سجل`);
      }
    }
    
    // إذا كانت الجداول تحتوي على بيانات، لا نقوم بالاستعادة
    if (!allTablesEmpty) {
      console.log('✅ قاعدة البيانات تحتوي على بيانات، لا حاجة للاستعادة');
      return true;
    }
    
    // البحث عن أحدث نسخة احتياطية إذا لم يتم تحديد ملف
    if (!backupFile) {
      const backupFiles = fs.readdirSync(BACKUP_DIR)
        .filter(file => file.startsWith('backup-') && file.endsWith('.json'))
        .sort()
        .reverse();
      
      if (backupFiles.length === 0) {
        console.log('⚠️ لا توجد نسخ احتياطية للاستعادة');
        return false;
      }
      
      backupFile = path.join(BACKUP_DIR, backupFiles[0]);
    }
    
    console.log(`🔄 جاري استعادة البيانات من: ${backupFile}`);
    
    // قراءة ملف النسخة الاحتياطية
    const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
    
    // استعادة البيانات لكل جدول
    for (const table in backupData) {
      if (backupData[table].length > 0) {
        for (const row of backupData[table]) {
          // استخراج أسماء الأعمدة وقيمها
          const columns = Object.keys(row).map(col => `"${col}"`).join(', ');
          const values = Object.keys(row).map(col => {
            const value = row[col];
            if (value === null) return 'NULL';
            return typeof value === 'string' ? `'${value.replace(/'/g, "''")}'` : value;
          }).join(', ');
          
          // إدراج البيانات
          await client.query(`INSERT INTO "${table}" (${columns}) VALUES (${values})`);
        }
        
        console.log(`📥 تم استعادة ${backupData[table].length} سجل إلى جدول "${table}"`);
      }
    }
    
    console.log('✅ تم استعادة البيانات بنجاح');
    return true;
  } catch (error) {
    console.error('❌ خطأ في استعادة البيانات:', error.message);
    return false;
  }
}

/**
 * الدالة الرئيسية لترحيل قاعدة البيانات
 */
async function migrateDatabase() {
  let client;
  
  try {
    console.log('🚀 بدء عملية ترحيل قاعدة البيانات...');
    
    // الاتصال بقاعدة البيانات
    client = await connectToDatabase();
    
    // عمل نسخة احتياطية من قاعدة البيانات الحالية
    const backupFile = await backupCurrentDatabase(client);
    
    // التحقق من وجود الجداول وإنشاؤها إذا لم تكن موجودة
    await ensureTablesExist(client);
    
    // استعادة البيانات إذا كانت الجداول فارغة
    await restoreDataIfEmpty(client, backupFile);
    
    console.log('✅ تمت عملية ترحيل قاعدة البيانات بنجاح');
  } catch (error) {
    console.error('❌ خطأ في عملية ترحيل قاعدة البيانات:', error.message);
    process.exit(1);
  } finally {
    if (client) {
      await client.end();
      console.log('🔄 تم إغلاق الاتصال بقاعدة البيانات');
    }
  }
}

// تنفيذ العملية
migrateDatabase();