// import express from "express";
// import bcrypt from "bcrypt";
// import jwt from "jsonwebtoken";
// import cors from "cors";
// import multer from "multer";
// import dotenv from "dotenv";
// import admin from "firebase-admin";
// import { v4 as uuidv4 } from "uuid";

// // Environment dəyişənlərini yüklə
// dotenv.config();

// // Firebase Təyin olunması
// try {
//   // FIREBASE_SERVICE_ACCOUNT JSON string-ini parse edir
//   const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

//   admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount),
//     storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
//   });
// } catch (e) {
//   console.error("❌ Firebase Konfiqurasiya Xətası:", e.message);
//   console.error("FIREBASE_SERVICE_ACCOUNT dəyişənini yoxlayın.");
// }

// const db = admin.firestore();
// const bucket = admin.storage().bucket();
// const usersRef = db.collection("users");
// const postsRef = db.collection("posts");
// const notificationsRef = db.collection("notifications"); // 💡 YENİ: Bildirişlər Kolleksiyası

// const app = express();
// const PORT = process.env.PORT || 3000;
// const SECRET = process.env.JWT_SECRET || "super_secret_key";

// // Middleware
// app.use(cors());
// app.use(express.json());

// const upload = multer({ storage: multer.memoryStorage() });

// // Köməkçi funksiya: İstifadəçiləri oxumaq
// async function readUsers() {
//   const snapshot = await usersRef.get();
//   return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
// }

// // Köməkçi funksiya: Bütün Postları oxumaq
// async function readAllPosts() {
//   const snapshot = await postsRef.get();
//   return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
// }

// // Köməkçi funksiya: Təhlükəsizlik üçün JWT autentifikasiyası
// function auth(req, res, next) {
//   const header = req.headers["authorization"];
//   const token = header && header.split(" ")[1];
//   if (!token) return res.status(401).json({ message: "Token yoxdur" });

//   try {
//     // Token-də istifadəçi ID-sinin olması vacibdir
//     const user = jwt.verify(token, SECRET);
//     req.user = user;
//     next();
//   } catch {
//     return res.status(403).json({ message: "Token səhvdir və ya vaxtı bitib" });
//   }
// }

// // Köməkçi funksiya: Məzmunu təmizləmək
// const cleanText = (str) => {
//   if (typeof str !== 'string') return '';
//   return str.replace(/&[a-z]+;|&#\d+;|<[^>]*>/gi, '').trim();
// };

// // Köməkçi funksiya: Faylı Firebase Storage-ə yükləmək
// async function uploadToFirebase(file) {
//   const uniqueName = `${Date.now()}-${uuidv4()}-${file.originalname}`;
//   const fileRef = bucket.file(uniqueName);

//   await fileRef.save(file.buffer, { metadata: { contentType: file.mimetype } });

//   const [url] = await fileRef.getSignedUrl({
//     action: "read",
//     expires: "03-01-2035",
//   });
//   return url;
// }

// // Köməkçi funksiya: Faylı Firebase Storage-dən silmək
// async function deleteFromFirebase(url) {
//   if (!url) return;
//   try {
//     const pathMatch = url.match(/o\/(.*?)\?alt=media/);
//     if (pathMatch && pathMatch[1]) {
//       const filePath = decodeURIComponent(pathMatch[1]);
//       await bucket.file(filePath).delete();
//       console.log(`✅ Fayl Storage-dən silindi: ${filePath}`);
//     }
//   } catch (error) {
//     console.warn("⚠️ Fayl silinərkən xəta baş verdi:", error.message);
//   }
// }

// // 💡 Köməkçi funksiya: Yeni bildiriş yaratmaq
// async function createNotification(userId, message, courseId) {
//   // Əgər istifadəçi ID-si yoxdursa, bildiriş yaratma
//   if (!userId) {
//     console.warn("⚠️ Bildiriş yaratmaq üçün istifadəçi ID-si tapılmadı.");
//     return { success: false, error: "UserID yoxdur" };
//   }
//   try {
//     const newNotification = {
//       userId: userId,
//       message: message,
//       courseId: courseId,
//       read: false,
//       createdAt: admin.firestore.FieldValue.serverTimestamp(),
//     };

//     await notificationsRef.add(newNotification);
//     console.log(`✅ Bildiriş uğurla yaradıldı: ${message}`);
//     return { success: true };
//   } catch (error) {
//     console.error("❌ Bildiriş yaratma xətası:", error.message);
//     return { success: false, error: error.message };
//   }
// }


// // --- MARŞRUTLAR (ROUTES) ---

// // Qeydiyyat
// app.post("/register", async (req, res) => {
//   const { username, email, password } = req.body;
//   if (!username || !email || !password)
//     return res.status(400).json({ message: "Boş ola bilməz" });

//   try {
//     const users = await readUsers();

//     if (users.find((u) => u.username === username))
//       return res.status(409).json({ message: "Bu istifadəçi artıq mövcuddur" });
//     if (users.find((u) => u.email === email))
//       return res.status(409).json({ message: "Bu email artıq istifadə olunur" });

//     const hashed = await bcrypt.hash(password, 10);
//     const newUserRef = usersRef.doc(); // Firestore ID-ni avtomatik generasiya et
//     const initialRole = users.length === 0 ? "admin" : "user";

//     await newUserRef.set({ username, email, password: hashed, role: initialRole });

//     res.json({ message: "Qeydiyyat uğurla tamamlandı" });
//   } catch (error) {
//     console.error("REGISTER ERROR:", error);
//     res.status(500).json({ message: "Server xətası" });
//   }
// });

// // Login
// app.post("/login", async (req, res) => {
//   const { username, password } = req.body;
//   const users = await readUsers();

//   const user = users.find((u) => u.username === username);
//   if (!user) return res.status(401).json({ message: "İstifadəçi tapılmadı" });

//   const match = await bcrypt.compare(password, user.password);
//   if (!match) return res.status(401).json({ message: "Şifrə səhvdir" });

//   // 💡 VACİB: İstifadəçi ID-si tokendə saxlanılır
//   const token = jwt.sign(
//     { id: user.id, username: user.username, role: user.role },
//     SECRET,
//     { expiresIn: "30d" }
//   );
//   res.json({ token, role: user.role });
// });

// // Profil
// app.get("/profile", auth, (req, res) => {
//   res.json({ message: `Xoş gəldin ${req.user.username}!`, role: req.user.role, id: req.user.id });
// });

// // İstifadəçilər siyahısı (Admin only)
// app.get("/users", auth, async (req, res) => {
//   if (req.user.role !== "admin") {
//     return res.status(403).json({ message: "Bu əməliyyat üçün yalnız Administrator icazəsi tələb olunur." });
//   }
//   try {
//     const users = await readUsers();
//     const safeUsers = users.map(({ password, ...rest }) => rest);
//     res.json(safeUsers);
//   } catch (error) {
//     console.error("USERS ERROR:", error);
//     res.status(500).json({ message: "Server xətası: istifadəçilər tapılmadı." });
//   }
// });

// // İstifadəçi silmək (Admin only)
// app.delete("/users/:id", auth, async (req, res) => {
//   try {
//     if (req.user.role !== "admin") {
//       return res.status(403).json({ message: "Bu əməliyyat üçün yalnız Administrator icazəsi tələb olunur." });
//     }

//     const userId = req.params.id;
//     const userDocRef = usersRef.doc(userId);
//     const userDoc = await userDocRef.get();

//     if (!userDoc.exists) {
//       return res.status(404).json({ message: "Silinəcək istifadəçi tapılmadı." });
//     }

//     await userDocRef.delete();

//     res.json({ message: "İstifadəçi uğurla silindi." });

//   } catch (error) {
//     console.error("DELETE /users/:id error:", error);
//     res.status(500).json({ message: "Server xətası: istifadəçi silinmədi.", error: error.message });
//   }
// });


// // KURS ƏLAVƏ ETMƏK (Moderasiya Məntiqi və submittedByUserId)
// app.post("/posts", auth, upload.any(), async (req, res) => {
//   try {
//     const cleanedText = cleanText(req.body.text);
//     const cleanedCategory = cleanText(req.body.category);
//     const price = parseFloat(req.body.price) || 0.00;

//     const username = req.user?.username || "Anonim";
//     const isCurrentUserAdmin = req.user?.role === "admin";
//     const isApproved = isCurrentUserAdmin; // Admin paylaşıbsa dərhal təsdiqlə

//     let videoTitles = [];
//     if (req.body.videoTitles) {
//       try {
//         const parsedTitles = JSON.parse(req.body.videoTitles);
//         if (Array.isArray(parsedTitles)) {
//           videoTitles = parsedTitles.map(t => cleanText(t));
//         } else {
//           videoTitles = [cleanText(parsedTitles)];
//         }
//       } catch (err) {
//         videoTitles = [cleanText(req.body.videoTitles)];
//       }
//     }

//     const courseCoverFile = req.files.find(f => f.fieldname === "courseCover");
//     const videosFiles = req.files.filter(f => f.fieldname === "videos");
//     const videoCoversFiles = req.files.filter(f => f.fieldname === "videoCovers");

//     const courseCover = courseCoverFile ? await uploadToFirebase(courseCoverFile) : "";
//     const videos = await Promise.all(videosFiles.map(uploadToFirebase));
//     const videoCovers = await Promise.all(videoCoversFiles.map(uploadToFirebase));

//     const postId = uuidv4(); // Kurs üçün unikal ID

//     const newPost = {
//       id: postId,
//       username,
//       text: cleanedText,
//       category: cleanedCategory,
//       price: price,
//       courseCover,
//       videos,
//       videoCovers,
//       videoTitles,
//       createdAt: new Date().toISOString(),
//       isApproved: isApproved,
//       submittedByUserId: req.user.id // Kursu paylaşan istifadəçi ID-si
//     };

//     await postsRef.doc(postId).set(newPost);

//     if (isCurrentUserAdmin) {
//       res.json({ message: "Kurs uğurla əlavə olundu" });
//     } else {
//       res.json({
//         message: "Kurs baxışa göndərildi. Administrator icazə verdikdən sonra yayımlanacaq.",
//         pending: true
//       });
//     }
//   } catch (err) {
//     console.error("❌ POST /posts error:", err);
//     res.status(500).json({ message: "Server xətası", error: err.message });
//   }
// });

// // Təsdiqlənmiş kursları gətirmək
// app.get("/posts", async (req, res) => {
//   try {
//     const snapshot = await postsRef.where('isApproved', '==', true).get();
//     const posts = snapshot.docs
//       .map((doc) => ({ id: doc.id, ...doc.data() }));
//     res.json(posts);
//   } catch (error) {
//     console.error("GET /posts error:", error);
//     res.status(500).json({ message: "Server xətası: postlar gətirilə bilmədi." });
//   }
// });

// // Baxışda olan kursları gətirmək (Admin only)
// app.get("/admin/pending-posts", auth, async (req, res) => {
//   try {
//     if (req.user.role !== "admin") {
//       return res.status(403).json({ message: "Yalnız Administratorlar bu səhifəyə baxa bilər." });
//     }
//     const snapshot = await postsRef.where('isApproved', '==', false).get();

//     const pendingPosts = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

//     res.json(pendingPosts);
//   } catch (error) {
//     console.error("GET /admin/pending-posts error:", error);
//     res.status(500).json({ message: "Server xətası: baxışda olan postlar gətirilə bilmədi." });
//   }
// });


// // KURS TƏSDİQLƏMƏ (Bildiriş Məntiqi Əlavə Edildi)
// app.patch("/posts/:id/approve", auth, async (req, res) => {
//   try {
//     if (req.user.role !== "admin") {
//       return res.status(403).json({ message: "Yalnız Administratorlar kursları təsdiqləyə bilər." });
//     }

//     const postId = req.params.id;
//     const postDocRef = postsRef.doc(postId);
//     const postDoc = await postDocRef.get();

//     if (!postDoc.exists) {
//       return res.status(404).json({ message: "Kurs tapılmadı." });
//     }

//     // Kursu təsdiqlə (isApproved = true)
//     await postDocRef.update({
//       isApproved: true,
//       approvedAt: new Date().toISOString()
//     });

//     const postData = postDoc.data();

//     // 💡 BİLDİRİŞ YARAT: Kursu paylaşan istifadəçiyə mesaj göndərir
//     if (postData.submittedByUserId) {
//       await createNotification(
//         postData.submittedByUserId,
//         `Təbrik edirik! Sizin **${postData.text}** adlı kursunuz uğurla təsdiqləndi və yayımlandı.`,
//         postId
//       );
//     }

//     res.json({ message: "Kurs uğurla təsdiqləndi və yayımlandı." });

//   } catch (error) {
//     console.error("PATCH /posts/:id/approve error:", error);
//     res.status(500).json({ message: "Server xətası: kurs təsdiqlənmədi." });
//   }
// });

// // KURS SİLMƏK (Sahib və ya Admin tərəfindən)
// app.delete("/posts/:id", auth, async (req, res) => {
//   try {
//     const postId = req.params.id;
//     const postDoc = await postsRef.doc(postId).get();
//     const post = postDoc.data();

//     if (!post) return res.status(404).json({ message: "Kurs tapılmadı" });

//     // Silmə icazəsi yoxlanışı: ya postun sahibi, ya da Admin olmalıdır
//     // Qeyd: Firestoredan gələn submittedByUserId ilə req.user.id-ni də yoxlamaq olar
//     if (post.username !== req.user.username && req.user.role !== "admin")
//       return res.status(403).json({ message: "Silmə icazən yoxdur" });

//     // Faylları sil
//     if (post.courseCover) await deleteFromFirebase(post.courseCover);
//     if (post.videos && post.videos.length) {
//       await Promise.all(post.videos.map(deleteFromFirebase));
//     }
//     if (post.videoCovers && post.videoCovers.length) {
//       await Promise.all(post.videoCovers.map(deleteFromFirebase));
//     }

//     await postsRef.doc(postId).delete();
//     res.json({ message: "Kurs uğurla silindi" });
//   } catch (error) {
//     console.error("DELETE /posts/:id error:", error);
//     res.status(500).json({ message: "Server xətası", error: error.message });
//   }
// });
// // Node.js Server Kodunda /notifications marşrutu
// app.get("/notifications", auth, async (req, res) => {
//   try {
//     const userId = req.user.id;

//     const snapshot = await notificationsRef
//       .where("userId", "==", userId)
//       .orderBy("createdAt", "desc")
//       .get();

//     // Timestamp-ları rəqəmlərə (millisaniyə) çevirir
//     const notifications = snapshot.docs.map(doc => {
//       const data = doc.data();
//       
//       // Yalnız obyekt mövcud olduqda və toMillis funksiyası varsa çevrilir
//       const createdAtMillis = data.createdAt && typeof data.createdAt.toMillis === 'function' 
//         ? data.createdAt.toMillis() 
//         : null;

//       const readAtMillis = data.readAt && typeof data.readAt.toMillis === 'function' 
//         ? data.readAt.toMillis() 
//         : null;

//       return {
//         id: doc.id,
//         ...data,
//         createdAt: createdAtMillis, 
//         readAt: readAtMillis,      
//       };
//     });

//     res.json(notifications);

//   } catch (error) {
//     console.error("GET /notifications error:", error);
//     res.status(500).json({ message: "Server xətası: bildirişlər gətirilə bilmədi.", detailedError: error.message });
//   }
// });

// // Bildirişi oxunmuş kimi qeyd etmək
// app.patch("/notifications/:id/read", auth, async (req, res) => {
//   try {
//     const notificationId = req.params.id;
//     const userId = req.user.id;

//     const docRef = notificationsRef.doc(notificationId);
//     const doc = await docRef.get();

//     if (!doc.exists) {
//       return res.status(404).json({ message: "Bildiriş tapılmadı." });
//     }

//     // Təhlükəsizlik yoxlaması
//     if (doc.data().userId !== userId) {
//       return res.status(403).json({ message: "Bu bildirişi yeniləməyə icazəniz yoxdur." });
//     }

//     await docRef.update({
//       read: true,
//       readAt: admin.firestore.FieldValue.serverTimestamp(),
//     });

//     res.json({ message: "Bildiriş oxunmuş kimi qeyd edildi." });
//   } catch (error) {
//     console.error("PATCH /notifications/:id/read error:", error);
//     res.status(500).json({ message: "Server xətası: status yenilənmədi." });
//   }
// });

// // --- DİGƏR MARŞRUTLAR (Wishlist, Contact, Comments) ---

// app.post("/wishlist/:postId", auth, async (req, res) => {
//   try {
//     const username = req.user.username;
//     const postId = req.params.postId;

//     const snapshot = await db
//       .collection("wishlist")
//       .where("username", "==", username)
//       .where("postId", "==", postId)
//       .get();

//     if (!snapshot.empty) {
//       return res.status(400).json({ message: "Bu kurs artıq wishlistdə var" });
//     }

//     await db.collection("wishlist").add({
//       username,
//       postId,
//       addedAt: admin.firestore.FieldValue.serverTimestamp(),
//     });

//     res.json({ message: "Kurs wishlistə əlavə olundu" });
//   } catch (error) {
//     console.error("POST /wishlist error:", error);
//     res.status(500).json({ message: "Server xətası", error: error.message });
//   }
// });

// app.get("/wishlist", auth, async (req, res) => {
//   try {
//     const username = req.user.username;

//     const snapshot = await db
//       .collection("wishlist")
//       .where("username", "==", username)
//       .get();

//     const wishlistItems = snapshot.docs.map((doc) => ({
//       id: doc.id,
//       ...doc.data(),
//     }));

//     const posts = await readAllPosts();
//     const userWishlist = wishlistItems.map((w) => {
//       const post = posts.find((p) => p.id === w.postId);
//       return { ...w, post };
//     }).filter(w => w.post); // Yalnız postu tapılanları göstər

//     res.json(userWishlist);
//   } catch (error) {
//     console.error("GET /wishlist error:", error);
//     res.status(500).json({ message: "Server xətası", error: error.message });
//   }
// });

// app.delete("/wishlist/:postId", auth, async (req, res) => {
//   try {
//     const username = req.user.username;
//     const postId = req.params.postId;

//     const snapshot = await db
//       .collection("wishlist")
//       .where("username", "==", username)
//       .where("postId", "==", postId)
//       .get();

//     if (snapshot.empty)
//       return res.status(404).json({ message: "Wishlistdə tapılmadı" });

//     const docId = snapshot.docs[0].id;
//     await db.collection("wishlist").doc(docId).delete();

//     res.json({ message: "Wishlistdən silindi" });
//   } catch (error) {
//     console.error("DELETE /wishlist error:", error);
//     res.status(500).json({ message: "Server xətası", error: error.message });
//   }
// });

// app.post("/api/contact", async (req, res) => {
//   try {
//     const { name, surname, email, phone, message } = req.body;

//     if (!name || !surname || !email || !message) {
//       return res.status(400).json({ message: "Zəhmət olmasa bütün xanaları doldurun." });
//     }

//     await db.collection("contacts").add({
//       name,
//       surname,
//       email,
//       phone,
//       message,
//       isRead: false,
//       createdAt: new Date().toISOString(),
//     });

//     res.status(200).json({ message: "Mesaj uğurla göndərildi!" });
//   } catch (error) {
//     console.error("Contact error:", error);
//     res.status(500).json({ message: "Server xətası baş verdi." });
//   }
// });

// app.get("/api/contact", async (req, res) => {
//   try {
//     const snapshot = await db.collection("contacts").orderBy("createdAt", "desc").get();
//     const contacts = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
//     res.json(contacts);
//   } catch (error) {
//     console.error("GET /contacts error:", error);
//     res.status(500).json({ message: "Kontaktları oxuyarkən server xətası baş verdi." });
//   }
// });

// app.delete("/api/contact/:id", auth, async (req, res) => {
//   try {
//     const contactId = req.params.id;

//     const docRef = db.collection("contacts").doc(contactId);
//     const doc = await docRef.get();

//     if (!doc.exists) {
//       return res.status(404).json({ message: "Kontakt tapılmadı." });
//     }

//     await docRef.delete();

//     res.json({ message: "Kontakt uğurla silindi." });
//   } catch (error) {
//     console.error("DELETE /api/contact/:id error:", error);
//     res.status(500).json({ message: "Server xətası: silinmə uğursuz oldu." });
//   }
// });

// app.patch("/api/contact/:id/status", auth, async (req, res) => {
//   try {
//     const contactId = req.params.id;
//     const { isRead } = req.body;

//     if (typeof isRead !== 'boolean') {
//       return res.status(400).json({ message: "Yanlış məlumat formatı." });
//     }

//     const docRef = db.collection("contacts").doc(contactId);

//     await docRef.update({
//       isRead: isRead,
//       updatedAt: admin.firestore.FieldValue.serverTimestamp()
//     });

//     res.json({ message: `Kontaktın statusu uğurla yeniləndi.` });
//   } catch (error) {
//     console.error("PATCH /api/contact/:id/status error:", error);
//     res.status(500).json({ message: "Server xətası: status yenilənmədi." });
//   }
// });


// app.post("/comments", auth, async (req, res) => {
//   try {
//     const { postId, videoIndex, text } = req.body;
//     const username = req.user.username;

//     if (!postId || typeof videoIndex === 'undefined' || !text) {
//       return res.status(400).json({ message: "Post ID, video indeksi və mətn boş ola bilməz" });
//     }

//     const cleanedText = cleanText(text);

//     const newComment = {
//       postId: String(postId),
//       videoIndex: Number(videoIndex),
//       username,
//       text: cleanedText,
//       createdAt: admin.firestore.FieldValue.serverTimestamp(),
//     };

//     await db.collection("comments").add(newComment);

//     res.status(201).json({ message: "Şərh uğurla əlavə edildi" });
//   } catch (error) {
//     console.error("POST /comments error:", error);
//     res.status(500).json({ message: "Server xətası: Şərh əlavə edilmədi.", error: error.message });
//   }
// });

// app.get("/comments/:postId/:videoIndex", async (req, res) => {
//   try {
//     const postId = req.params.postId;
//     const videoIndex = Number(req.params.videoIndex);

//     const snapshot = await db
//       .collection("comments")
//       .where("postId", "==", postId)
//       .where("videoIndex", "==", videoIndex)
//       .orderBy("createdAt", "asc")
//       .get();

//     const comments = snapshot.docs.map(doc => ({
//       id: doc.id,
//       ...doc.data(),
//     }));

//     res.json(comments);
//   } catch (error) {
//     console.error("GET /comments error:", error);
//     res.status(500).json({ message: "Server xətası: Şərhlər gətirilə bilmədi. Firebase-də 'comments' kolleksiyası üçün kompozit indeksi yaratdığınızdan əmin olun.", error: error.message });
//   }
// });

// app.listen(PORT, () => {
//   console.log(`✅ Server işləyir: http://localhost:${PORT}`);
// });


import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cors from "cors";
import multer from "multer";
import dotenv from "dotenv";
import admin from "firebase-admin";
import { v4 as uuidv4 } from "uuid";

// Environment dəyişənlərini yüklə
dotenv.config();

// Firebase Təyin olunması
try {
  // FIREBASE_SERVICE_ACCOUNT JSON string-ini parse edir
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
} catch (e) {
  console.error("❌ Firebase Konfiqurasiya Xətası:", e.message);
  console.error("FIREBASE_SERVICE_ACCOUNT dəyişənini yoxlayın.");
}

const db = admin.firestore();
const bucket = admin.storage().bucket();
const usersRef = db.collection("users");
const postsRef = db.collection("posts");
const notificationsRef = db.collection("notifications");
// 💡 YENİ: Reytinqlər Kolleksiyası
const ratingsRef = db.collection("ratings");

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET = process.env.JWT_SECRET || "super_secret_key";

// Middleware
app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

// Köməkçi funksiya: İstifadəçiləri oxumaq
async function readUsers() {
  const snapshot = await usersRef.get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

// Köməkçi funksiya: Bütün Postları oxumaq
async function readAllPosts() {
  const snapshot = await postsRef.get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

// Köməkçi funksiya: Təhlükəsizlik üçün JWT autentifikasiyası
function auth(req, res, next) {
  const header = req.headers["authorization"];
  const token = header && header.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Token yoxdur" });

  try {
    // Token-də istifadəçi ID-sinin olması vacibdir (login zamanı əlavə edilir)
    const user = jwt.verify(token, SECRET);
    req.user = user;
    next();
  } catch (e) {
    console.error("Auth Error:", e.message);
    return res.status(403).json({ message: "Token səhvdir və ya vaxtı bitib" });
  }
}

// Köməkçi funksiya: Məzmunu təmizləmək
const cleanText = (str) => {
  if (typeof str !== 'string') return '';
  return str.replace(/&[a-z]+;|&#\d+;|<[^>]*>/gi, '').trim();
};

// Köməkçi funksiya: Faylı Firebase Storage-ə yükləmək
async function uploadToFirebase(file) {
  const uniqueName = `${Date.now()}-${uuidv4()}-${file.originalname}`;
  const fileRef = bucket.file(uniqueName);

  await fileRef.save(file.buffer, { metadata: { contentType: file.mimetype } });

  const [url] = await fileRef.getSignedUrl({
    action: "read",
    expires: "03-01-2035",
  });
  return url;
}

// Köməkçi funksiya: Faylı Firebase Storage-dən silmək
async function deleteFromFirebase(url) {
  if (!url) return;
  try {
    const pathMatch = url.match(/o\/(.*?)\?alt=media/);
    if (pathMatch && pathMatch[1]) {
      const filePath = decodeURIComponent(pathMatch[1]);
      await bucket.file(filePath).delete();
      console.log(`✅ Fayl Storage-dən silindi: ${filePath}`);
    }
  } catch (error) {
    console.warn("⚠️ Fayl silinərkən xəta baş verdi:", error.message);
  }
}

// Köməkçi funksiya: Yeni bildiriş yaratmaq
async function createNotification(userId, message, courseId) {
  // Əgər istifadəçi ID-si yoxdursa, bildiriş yaratma
  if (!userId) {
    console.warn("⚠️ Bildiriş yaratmaq üçün istifadəçi ID-si tapılmadı.");
    return { success: false, error: "UserID yoxdur" };
  }
  try {
    const newNotification = {
      userId: userId,
      message: message,
      courseId: courseId,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await notificationsRef.add(newNotification);
    console.log(`✅ Bildiriş uğurla yaradıldı: ${message}`);
    return { success: true };
  } catch (error) {
    console.error("❌ Bildiriş yaratma xətası:", error.message);
    return { success: false, error: error.message };
  }
}


// --- MARŞRUTLAR (ROUTES) ---

// Qeydiyyat
app.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ message: "Boş ola bilməz" });

  try {
    const users = await readUsers();

    if (users.find((u) => u.username === username))
      return res.status(409).json({ message: "Bu istifadəçi artıq mövcuddur" });
    if (users.find((u) => u.email === email))
      return res.status(409).json({ message: "Bu email artıq istifadə olunur" });

    const hashed = await bcrypt.hash(password, 10);
    const newUserRef = usersRef.doc(); // Firestore ID-ni avtomatik generasiya et
    const initialRole = users.length === 0 ? "admin" : "user";

    await newUserRef.set({ username, email, password: hashed, role: initialRole });

    res.json({ message: "Qeydiyyat uğurla tamamlandı" });
  } catch (error) {
    console.error("REGISTER ERROR:", error);
    res.status(500).json({ message: "Server xətası" });
  }
});

// Login
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const users = await readUsers();

  const user = users.find((u) => u.username === username);
  if (!user) return res.status(401).json({ message: "İstifadəçi tapılmadı" });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ message: "Şifrə səhvdir" });

  // 💡 VACİB: İstifadəçi ID-si tokendə saxlanılır
  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    SECRET,
    { expiresIn: "30d" }
  );
  res.json({ token, role: user.role });
});

// Profil
app.get("/profile", auth, (req, res) => {
  res.json({ message: `Xoş gəldin ${req.user.username}!`, role: req.user.role, id: req.user.id });
});

// İstifadəçilər siyahısı (Admin only)
app.get("/users", auth, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Bu əməliyyat üçün yalnız Administrator icazəsi tələb olunur." });
  }
  try {
    const users = await readUsers();
    const safeUsers = users.map(({ password, ...rest }) => rest);
    res.json(safeUsers);
  } catch (error) {
    console.error("USERS ERROR:", error);
    res.status(500).json({ message: "Server xətası: istifadəçilər tapılmadı." });
  }
});

// İstifadəçi silmək (Admin only)
app.delete("/users/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Bu əməliyyat üçün yalnız Administrator icazəsi tələb olunur." });
    }

    const userId = req.params.id;
    const userDocRef = usersRef.doc(userId);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ message: "Silinəcək istifadəçi tapılmadı." });
    }

    await userDocRef.delete();

    res.json({ message: "İstifadəçi uğurla silindi." });

  } catch (error) {
    console.error("DELETE /users/:id error:", error);
    res.status(500).json({ message: "Server xətası: istifadəçi silinmədi.", error: error.message });
  }
});


// KURS ƏLAVƏ ETMƏK 
app.post("/posts", auth, upload.any(), async (req, res) => {
  try {
    const cleanedText = cleanText(req.body.text);
    const cleanedCategory = cleanText(req.body.category);
    const price = parseFloat(req.body.price) || 0.00;

    const username = req.user?.username || "Anonim";
    const isCurrentUserAdmin = req.user?.role === "admin";
    const isApproved = isCurrentUserAdmin;

    let videoTitles = [];
    if (req.body.videoTitles) {
      try {
        const parsedTitles = JSON.parse(req.body.videoTitles);
        if (Array.isArray(parsedTitles)) {
          videoTitles = parsedTitles.map(t => cleanText(t));
        } else {
          videoTitles = [cleanText(parsedTitles)];
        }
      } catch (err) {
        videoTitles = [cleanText(req.body.videoTitles)];
      }
    }

    const courseCoverFile = req.files.find(f => f.fieldname === "courseCover");
    const videosFiles = req.files.filter(f => f.fieldname === "videos");
    const videoCoversFiles = req.files.filter(f => f.fieldname === "videoCovers");

    const courseCover = courseCoverFile ? await uploadToFirebase(courseCoverFile) : "";
    const videos = await Promise.all(videosFiles.map(uploadToFirebase));
    const videoCovers = await Promise.all(videoCoversFiles.map(uploadToFirebase));

    const postId = uuidv4();

    const newPost = {
      id: postId,
      username,
      text: cleanedText,
      category: cleanedCategory,
      price: price,
      courseCover,
      videos,
      videoCovers,
      videoTitles,
      createdAt: new Date().toISOString(),
      isApproved: isApproved,
      submittedByUserId: req.user.id
    };

    await postsRef.doc(postId).set(newPost);

    if (isCurrentUserAdmin) {
      res.json({ message: "Kurs uğurla əlavə olundu" });
    } else {
      res.json({
        message: "Kurs baxışa göndərildi. Administrator icazə verdikdən sonra yayımlanacaq.",
        pending: true
      });
    }
  } catch (err) {
    console.error("❌ POST /posts error:", err);
    res.status(500).json({ message: "Server xətası", error: err.message });
  }
});

// Təsdiqlənmiş kursları gətirmək
app.get("/posts", async (req, res) => {
  try {
    const snapshot = await postsRef.where('isApproved', '==', true).get();
    const posts = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(posts);
  } catch (error) {
    console.error("GET /posts error:", error);
    res.status(500).json({ message: "Server xətası: postlar gətirilə bilmədi." });
  }
});

// Baxışda olan kursları gətirmək (Admin only)
app.get("/admin/pending-posts", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Yalnız Administratorlar bu səhifəyə baxa bilər." });
    }
    const snapshot = await postsRef.where('isApproved', '==', false).get();

    const pendingPosts = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    res.json(pendingPosts);
  } catch (error) {
    console.error("GET /admin/pending-posts error:", error);
    res.status(500).json({ message: "Server xətası: baxışda olan postlar gətirilə bilmədi." });
  }
});


// KURS TƏSDİQLƏMƏ (Bildiriş Məntiqi Əlavə Edildi)
app.patch("/posts/:id/approve", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Yalnız Administratorlar kursları təsdiqləyə bilər." });
    }

    const postId = req.params.id;
    const postDocRef = postsRef.doc(postId);
    const postDoc = await postDocRef.get();

    if (!postDoc.exists) {
      return res.status(404).json({ message: "Kurs tapılmadı." });
    }

    // Kursu təsdiqlə (isApproved = true)
    await postDocRef.update({
      isApproved: true,
      approvedAt: new Date().toISOString()
    });

    const postData = postDoc.data();

    // BİLDİRİŞ YARAT: Kursu paylaşan istifadəçiyə mesaj göndərir
    if (postData.submittedByUserId) {
      await createNotification(
        postData.submittedByUserId,
        `Təbrik edirik! Sizin **${postData.text}** adlı kursunuz uğurla təsdiqləndi və yayımlandı.`,
        postId
      );
    }

    res.json({ message: "Kurs uğurla təsdiqləndi və yayımlandı." });

  } catch (error) {
    console.error("PATCH /posts/:id/approve error:", error);
    res.status(500).json({ message: "Server xətası: kurs təsdiqlənmədi." });
  }
});

// KURS SİLMƏK (Sahib və ya Admin tərəfindən)
app.delete("/posts/:id", auth, async (req, res) => {
  try {
    const postId = req.params.id;
    const postDoc = await postsRef.doc(postId).get();
    const post = postDoc.data();

    if (!post) return res.status(404).json({ message: "Kurs tapılmadı" });

    // Silmə icazəsi yoxlanışı
    if (post.username !== req.user.username && req.user.role !== "admin")
      return res.status(403).json({ message: "Silmə icazən yoxdur" });

    // Faylları sil
    if (post.courseCover) await deleteFromFirebase(post.courseCover);
    if (post.videos && post.videos.length) {
      await Promise.all(post.videos.map(deleteFromFirebase));
    }
    if (post.videoCovers && post.videoCovers.length) {
      await Promise.all(post.videoCovers.map(deleteFromFirebase));
    }

    await postsRef.doc(postId).delete();
    res.json({ message: "Kurs uğurla silindi" });
  } catch (error) {
    console.error("DELETE /posts/:id error:", error);
    res.status(500).json({ message: "Server xətası", error: error.message });
  }
});

// --- YENİ REYTİNQ MARŞRUTLARI (RATE COURSE) ---

// Kursa Reytinq Vermək
app.post("/rate-course", auth, async (req, res) => {
  const courseId = req.body.courseId;
  const score = parseInt(req.body.score); // Ulduz balı (1-5)
  const userId = req.user.id; // JWT token-dən gələn istifadəçi ID-si

  // Giriş yoxlaması
  if (!courseId || !score || score < 1 || score > 5 || isNaN(score)) {
    return res.status(400).json({ message: "Yanlış kurs ID-si və ya 1-dən 5-ə qədər bal daxil edilməlidir." });
  }

  try {
    // 1. İstifadəçinin bu kursa əvvəllər reytinq verib-vermədiyini yoxlayın
    const existingRating = await ratingsRef
      .where('courseId', '==', courseId)
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (!existingRating.empty) {
      // Qayda: Hər istifadəçi yalnız bir dəfə reytinq verə bilər.
      return res.status(403).json({ message: "Bu kursa artıq reytinq vermisiniz." });
    }

    // 2. Kursun mövcudluğunu yoxlamaq (İsteğe bağlı, lakin təhlükəsizlik üçün yaxşıdır)
    const postDoc = await postsRef.doc(courseId).get();
    if (!postDoc.exists) {
      return res.status(404).json({ message: "Reytinq veriləcək kurs tapılmadı." });
    }

    // 3. Yeni reytinqi əlavə edin
    await ratingsRef.add({
      courseId,
      userId,
      score,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(201).json({ message: 'Reytinqiniz uğurla əlavə edildi.' });

  } catch (error) {
    console.error("❌ Reytinq əlavə edilərkən xəta:", error);
    res.status(500).json({ message: 'Server xətası baş verdi.' });
  }
});


// Kursun Orta Reytinqini və Səs Sayını Gətirmək
app.get("/course-rating/:courseId", async (req, res) => {
  const courseId = req.params.courseId;

  if (!courseId) {
    return res.status(400).json({ message: 'Kurs ID-si lazımdır.' });
  }

  try {
    const ratingsSnapshot = await ratingsRef
      .where('courseId', '==', courseId)
      .get();

    // Əgər heç reytinq yoxdursa
    if (ratingsSnapshot.empty) {
      return res.status(200).json({ averageRating: 0, count: 0 });
    }

    let totalScore = 0;
    const count = ratingsSnapshot.docs.length;

    // Bütün reytinqlərin cəmini hesablayın
    ratingsSnapshot.forEach(doc => {
      totalScore += doc.data().score;
    });

    // Orta balı hesablayın
    const averageRating = (totalScore / count);

    // Nəticəni bir onluq ədəd dəqiqliyi ilə qaytarın (məsələn: 4.3)
    res.status(200).json({
      averageRating: parseFloat(averageRating.toFixed(1)),
      count
    });

  } catch (error) {
    console.error("❌ Reytinq alınarkən xəta:", error);
    res.status(500).json({ message: 'Server xətası baş verdi.' });
  }
});


app.get("/user-rating/:courseId", auth, async (req, res) => {
  const courseId = req.params.courseId;
  const userId = req.user.id;

  if (!courseId) {
    return res.status(400).json({ message: "Kurs ID-si tələb olunur." });
  }

  try {
    const ratingsRef = db.collection('ratings'); // Düzgün kolleksiya adı ilə əvəz edin

    const userRatingSnapshot = await ratingsRef
      .where('courseId', '==', courseId)
      .where('userId', '==', userId)
      .limit(1) // Bir istifadəçi yalnız bir reytinq verə bilər
      .get();

    if (userRatingSnapshot.empty) {
      return res.status(200).json({ hasRated: false, score: 0 });
    } else {
      const score = userRatingSnapshot.docs[0].data().score;
      return res.status(200).json({ hasRated: true, score: score });
    }
  } catch (error) {
    console.error("❌ İstifadəçi reytinqi yüklənmə xətası:", error);
    res.status(500).json({ message: 'Server xətası baş verdi.' });
  }
});


app.get("/notifications", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const snapshot = await notificationsRef
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .get();

    // Timestamp-ları rəqəmlərə (millisaniyə) çevirir
    const notifications = snapshot.docs.map(doc => {
      const data = doc.data();

      // Yalnız obyekt mövcud olduqda və toMillis funksiyası varsa çevrilir
      const createdAtMillis = data.createdAt && typeof data.createdAt.toMillis === 'function'
        ? data.createdAt.toMillis()
        : null;

      const readAtMillis = data.readAt && typeof data.readAt.toMillis === 'function'
        ? data.readAt.toMillis()
        : null;

      return {
        id: doc.id,
        ...data,
        createdAt: createdAtMillis,
        readAt: readAtMillis,
      };
    });

    res.json(notifications);

  } catch (error) {
    console.error("GET /notifications error:", error);
    res.status(500).json({ message: "Server xətası: bildirişlər gətirilə bilmədi.", detailedError: error.message });
  }
});

// Bildirişi oxunmuş kimi qeyd etmək
app.patch("/notifications/:id/read", auth, async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user.id;

    const docRef = notificationsRef.doc(notificationId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Bildiriş tapılmadı." });
    }

    // Təhlükəsizlik yoxlaması
    if (doc.data().userId !== userId) {
      return res.status(403).json({ message: "Bu bildirişi yeniləməyə icazəniz yoxdur." });
    }

    await docRef.update({
      read: true,
      readAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ message: "Bildiriş oxunmuş kimi qeyd edildi." });
  } catch (error) {
    console.error("PATCH /notifications/:id/read error:", error);
    res.status(500).json({ message: "Server xətası: status yenilənmədi." });
  }
});

// Wishlist
app.post("/wishlist/:postId", auth, async (req, res) => {
  try {
    const username = req.user.username;
    const postId = req.params.postId;

    const snapshot = await db
      .collection("wishlist")
      .where("username", "==", username)
      .where("postId", "==", postId)
      .get();

    if (!snapshot.empty) {
      return res.status(400).json({ message: "Bu kurs artıq wishlistdə var" });
    }

    await db.collection("wishlist").add({
      username,
      postId,
      addedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ message: "Kurs wishlistə əlavə olundu" });
  } catch (error) {
    console.error("POST /wishlist error:", error);
    res.status(500).json({ message: "Server xətası", error: error.message });
  }
});

app.get("/wishlist", auth, async (req, res) => {
  try {
    const username = req.user.username;

    const snapshot = await db
      .collection("wishlist")
      .where("username", "==", username)
      .get();

    const wishlistItems = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const posts = await readAllPosts();
    const userWishlist = wishlistItems.map((w) => {
      const post = posts.find((p) => p.id === w.postId);
      return { ...w, post };
    }).filter(w => w.post); // Yalnız postu tapılanları göstər

    res.json(userWishlist);
  } catch (error) {
    console.error("GET /wishlist error:", error);
    res.status(500).json({ message: "Server xətası", error: error.message });
  }
});

app.delete("/wishlist/:postId", auth, async (req, res) => {
  try {
    const username = req.user.username;
    const postId = req.params.postId;

    const snapshot = await db
      .collection("wishlist")
      .where("username", "==", username)
      .where("postId", "==", postId)
      .get();

    if (snapshot.empty)
      return res.status(404).json({ message: "Wishlistdə tapılmadı" });

    const docId = snapshot.docs[0].id;
    await db.collection("wishlist").doc(docId).delete();

    res.json({ message: "Wishlistdən silindi" });
  } catch (error) {
    console.error("DELETE /wishlist error:", error);
    res.status(500).json({ message: "Server xətası", error: error.message });
  }
});

// Contact
app.post("/api/contact", async (req, res) => {
  try {
    const { name, surname, email, phone, message } = req.body;

    if (!name || !surname || !email || !message) {
      return res.status(400).json({ message: "Zəhmət olmasa bütün xanaları doldurun." });
    }

    await db.collection("contacts").add({
      name,
      surname,
      email,
      phone,
      message,
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    res.status(200).json({ message: "Mesaj uğurla göndərildi!" });
  } catch (error) {
    console.error("Contact error:", error);
    res.status(500).json({ message: "Server xətası baş verdi." });
  }
});

app.get("/api/contact", async (req, res) => {
  try {
    const snapshot = await db.collection("contacts").orderBy("createdAt", "desc").get();
    const contacts = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(contacts);
  } catch (error) {
    console.error("GET /contacts error:", error);
    res.status(500).json({ message: "Kontaktları oxuyarkən server xətası baş verdi." });
  }
});

app.delete("/api/contact/:id", auth, async (req, res) => {
  try {
    const contactId = req.params.id;

    const docRef = db.collection("contacts").doc(contactId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Kontakt tapılmadı." });
    }

    await docRef.delete();

    res.json({ message: "Kontakt uğurla silindi." });
  } catch (error) {
    console.error("DELETE /api/contact/:id error:", error);
    res.status(500).json({ message: "Server xətası: silinmə uğursuz oldu." });
  }
});

app.patch("/api/contact/:id/status", auth, async (req, res) => {
  try {
    const contactId = req.params.id;
    const { isRead } = req.body;

    if (typeof isRead !== 'boolean') {
      return res.status(400).json({ message: "Yanlış məlumat formatı." });
    }

    const docRef = db.collection("contacts").doc(contactId);

    await docRef.update({
      isRead: isRead,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ message: `Kontaktın statusu uğurla yeniləndi.` });
  } catch (error) {
    console.error("PATCH /api/contact/:id/status error:", error);
    res.status(500).json({ message: "Server xətası: status yenilənmədi." });
  }
});


// Comments
app.post("/comments", auth, async (req, res) => {
  try {
    const { postId, videoIndex, text } = req.body;
    const username = req.user.username;

    if (!postId || typeof videoIndex === 'undefined' || !text) {
      return res.status(400).json({ message: "Post ID, video indeksi və mətn boş ola bilməz" });
    }

    const cleanedText = cleanText(text);

    const newComment = {
      postId: String(postId),
      videoIndex: Number(videoIndex),
      username,
      text: cleanedText,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection("comments").add(newComment);

    res.status(201).json({ message: "Şərh uğurla əlavə edildi" });
  } catch (error) {
    console.error("POST /comments error:", error);
    res.status(500).json({ message: "Server xətası: Şərh əlavə edilmədi.", error: error.message });
  }
});

app.get("/comments/:postId/:videoIndex", async (req, res) => {
  try {
    const postId = req.params.postId;
    const videoIndex = Number(req.params.videoIndex);

    const snapshot = await db
      .collection("comments")
      .where("postId", "==", postId)
      .where("videoIndex", "==", videoIndex)
      .orderBy("createdAt", "asc")
      .get();

    const comments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(comments);
  } catch (error) {
    console.error("GET /comments error:", error);
    res.status(500).json({ message: "Server xətası: Şərhlər gətirilə bilmədi. Firebase-də 'comments' kolleksiyası üçün kompozit indeksi yaratdığınızdan əmin olun.", error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server işləyir: http://localhost:${PORT}`);
});