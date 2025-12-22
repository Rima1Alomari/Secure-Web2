# MongoDB Setup Guide

## المشكلة: المستخدمين والرسائل لا يتم حفظها

### الحلول الممكنة:

#### 1. التحقق من أن MongoDB يعمل:
```bash
# على macOS
brew services list | grep mongodb

# أو تحقق من العملية
ps aux | grep mongod
```

#### 2. تشغيل MongoDB:
```bash
# على macOS مع Homebrew
brew services start mongodb-community

# أو يدوياً
mongod --config /usr/local/etc/mongod.conf
```

#### 3. التحقق من الاتصال:
```bash
# الاتصال بقاعدة البيانات
mongosh mongodb://localhost:27017/cybrany

# أو
mongo mongodb://localhost:27017/cybrany
```

#### 4. التحقق من قاعدة البيانات:
```javascript
// في MongoDB shell
use cybrany
show collections
db.users.find()
db.chatmessages.find()
```

#### 5. إعداد متغيرات البيئة:
أنشئ ملف `.env` في مجلد `server/`:
```
MONGODB_URI=mongodb://localhost:27017/cybrany
PORT=5001
JWT_SECRET=your-secret-key
```

#### 6. تثبيت MongoDB (إذا لم يكن مثبتاً):
```bash
# على macOS
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

### التحقق من الأخطاء:

1. **افتح terminal في مجلد server**
2. **شغّل السيرفر**: `npm start` أو `node index.js`
3. **ابحث عن رسائل**:
   - ✅ `MongoDB connected successfully` = يعمل
   - ❌ `MongoDB connection error` = لا يعمل

### إذا استمرت المشكلة:

1. تأكد من أن MongoDB يعمل على المنفذ 27017
2. تحقق من أن قاعدة البيانات `cybrany` موجودة
3. راجع console logs في السيرفر للأخطاء
4. تأكد من أن المستخدم لديه صلاحيات الكتابة في قاعدة البيانات


