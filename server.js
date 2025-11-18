// import express from "express";
// import bcrypt from "bcrypt";
// import jwt from "jsonwebtoken";
// import cors from "cors";
// import multer from "multer";
// import dotenv from "dotenv";
// import admin from "firebase-admin";
// import { v4 as uuidv4 } from "uuid";


// dotenv.config();

// try {
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

// const app = express();
// const PORT = process.env.PORT || 3000;
// const SECRET = process.env.JWT_SECRET || "super_secret_key";

// app.use(cors());
// app.use(express.json());

// const upload = multer({ storage: multer.memoryStorage() });


// async function readUsers() {
//   const snapshot = await usersRef.get();
//   return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
// }

// async function readPosts() {
//   const snapshot = await postsRef.get();
//   return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
// }

// function auth(req, res, next) {
//   const header = req.headers["authorization"];
//   const token = header && header.split(" ")[1];
//   if (!token) return res.status(401).json({ message: "Token yoxdur" });

//   try {
//     const user = jwt.verify(token, SECRET);
//     req.user = user;
//     next();
//   } catch {
//     return res.status(403).json({ message: "Token səhvdir və ya vaxtı bitib" });
//   }
// }

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
//     console.warn("⚠️ Fayl silinərkən xəta baş verdi (yəqin ki, artıq silinib):", error.message);
//   }
// }


// // --- MARŞRUTLAR (ROUTES) ---

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
//     await usersRef.add({ username, email, password: hashed, role: "user" });

//     res.json({ message: "Qeydiyyat uğurla tamamlandı" });
//   } catch (error) {
//     console.error("REGISTER ERROR:", error);
//     res.status(500).json({ message: "Server xətası" });
//   }
// });

// app.post("/login", async (req, res) => {
//   const { username, password } = req.body;
//   const users = await readUsers();

//   const user = users.find((u) => u.username === username);
//   if (!user) return res.status(401).json({ message: "İstifadəçi tapılmadı" });

//   const match = await bcrypt.compare(password, user.password);
//   if (!match) return res.status(401).json({ message: "Şifrə səhvdir" });

//   const token = jwt.sign(
//     { username: user.username, role: user.role },
//     SECRET,
//     { expiresIn: "30d" }
//   );
//   res.json({ token });
// });

// app.get("/profile", auth, (req, res) => {
//   res.json({ message: `Xoş gəldin ${req.user.username}!`, role: req.user.role });
// });

// app.get("/users", async (req, res) => {
//   try {
//     const users = await readUsers();
//     res.json(users);
//   } catch (error) {
//     console.error("USERS ERROR:", error);
//     res.status(500).json({ message: "Server xətası: istifadəçilər tapılmadı." });
//   }
// });

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

// const cleanText = (str) => {
//   if (typeof str !== 'string') return '';

//   return str.replace(/&[a-z]+;|&#\d+;|<[^>]*>/gi, '').trim();
// };

// app.post("/posts", auth, upload.any(), async (req, res) => {
//   try {
//     const cleanedText = cleanText(req.body.text);
//     const cleanedCategory = cleanText(req.body.category);

//     const priceString = req.body.price;
//     const price = parseFloat(priceString) || 0.00;

//     const username = req.user?.username || "Anonim";

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

//     const newPost = {
//       id: Date.now().toString(),
//       username,
//       text: cleanedText,
//       category: cleanedCategory,
//       price: price,
//       courseCover,
//       videos,
//       videoCovers,
//       videoTitles,
//       createdAt: new Date().toISOString(),
//     };

//     await postsRef.doc(newPost.id).set(newPost);

//     res.json({ message: "Kurs əlavə olundu", newPost });
//   } catch (err) {
//     console.error("❌ POST /posts error:", err);
//     res.status(500).json({ message: "Server xətası", error: err.message });
//   }
// });

// app.get("/posts", async (req, res) => {
//   const posts = await readPosts();
//   res.json(posts);
// });

// app.delete("/posts/:id", auth, async (req, res) => {
//   try {
//     const postId = req.params.id;
//     const posts = await readPosts();
//     const post = posts.find((p) => p.id.toString() === postId);

//     if (!post) return res.status(404).json({ message: "Tapılmadı" });
//     if (post.username !== req.user.username)
//       return res.status(403).json({ message: "Silmə icazən yoxdur" });

//     if (post.courseCover) await deleteFromFirebase(post.courseCover);
//     if (post.videos && post.videos.length) {
//       await Promise.all(post.videos.map(deleteFromFirebase));
//     }
//     if (post.videoCovers && post.videoCovers.length) {
//       await Promise.all(post.videoCovers.map(deleteFromFirebase));
//     }

//     await postsRef.doc(postId).delete();
//     res.json({ message: "Silindi" });
//   } catch (error) {
//     console.error("DELETE /posts/:id error:", error);
//     res.status(500).json({ message: "Server xətası", error: error.message });
//   }
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
const postsRef = db.collection("posts"); // Kurslar kolleksiyası

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

// Köməkçi funksiya: Postları oxumaq (Hamısını gətirir)
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
    const user = jwt.verify(token, SECRET);
    req.user = user;
    next();
  } catch {
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
    // İlk qeydiyyatdan keçən admin olaraq qeyd edilsin (İsteğe bağlı, lakin Admin rolunu yaratmaq üçün vacibdir)
    const initialRole = users.length === 0 ? "admin" : "user";
    await usersRef.add({ username, email, password: hashed, role: initialRole });

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

  // Təhlükəsizlik üçün istifadəçi ID-sini də tokendə saxlayın
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

// Bütün İstifadəçiləri Gətir
app.get("/users", auth, async (req, res) => {
  // Təhlükəsizlik: Yalnız Adminlərə icazə verilsin
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Bu əməliyyat üçün yalnız Administrator icazəsi tələb olunur." });
  }
  try {
    const users = await readUsers();
    // Şifrə hash-lərini cavabdan çıxar
    const safeUsers = users.map(({ password, ...rest }) => rest);
    res.json(safeUsers);
  } catch (error) {
    console.error("USERS ERROR:", error);
    res.status(500).json({ message: "Server xətası: istifadəçilər tapılmadı." });
  }
});

// İSTİFADƏÇİNİ SİLMƏK (Admin üçün)
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


// KURS ƏLAVƏ ETMƏK (Moderasiya Məntiqi Əlavə Edildi)
app.post("/posts", auth, upload.any(), async (req, res) => {
  try {
    const cleanedText = cleanText(req.body.text);
    const cleanedCategory = cleanText(req.body.category);
    const price = parseFloat(req.body.price) || 0.00;

    const username = req.user?.username || "Anonim";
    const isCurrentUserAdmin = req.user?.role === "admin";
    const isApproved = isCurrentUserAdmin; // Admin-dirsə true, user-dirsə false (baxışa gedir)

    // Video başlıqlarını emal etmək
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

    // Faylları yükləmək
    const courseCoverFile = req.files.find(f => f.fieldname === "courseCover");
    const videosFiles = req.files.filter(f => f.fieldname === "videos");
    const videoCoversFiles = req.files.filter(f => f.fieldname === "videoCovers");

    const courseCover = courseCoverFile ? await uploadToFirebase(courseCoverFile) : "";
    const videos = await Promise.all(videosFiles.map(uploadToFirebase));
    const videoCovers = await Promise.all(videoCoversFiles.map(uploadToFirebase));

    const newPost = {
      id: Date.now().toString(),
      username,
      text: cleanedText,
      category: cleanedCategory,
      price: price,
      courseCover,
      videos,
      videoCovers,
      videoTitles,
      createdAt: new Date().toISOString(),
      isApproved: isApproved, // Moderasiya məntiqi
      submittedByUserId: req.user.id // Kimin əlavə etdiyini izləmək üçün
    };

    await postsRef.doc(newPost.id).set(newPost);

    if (isCurrentUserAdmin) {
      res.json({ message: "Kurs uğurla əlavə olundu" });
    } else {
      // İstifadəçi (user) rolunda olanlar üçün
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

// YALNIZ TƏSDİQLƏNMİŞ KURSLAI GƏTİRMƏK (Əsas səhifə üçün)
app.get("/posts", async (req, res) => {
  try {
    const snapshot = await postsRef.get();
    // Yalnız isApproved: true olan postları gətir
    const posts = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter(post => post.isApproved === true);
    res.json(posts);
  } catch (error) {
    console.error("GET /posts error:", error);
    res.status(500).json({ message: "Server xətası: postlar gətirilə bilmədi." });
  }
});

// YENİ MARŞRUT: ADMIN BAXIŞI ÜÇÜN TƏSDİQLƏNMƏMİŞ KURSLAI GƏTİRMƏK
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


// YENİ MARŞRUT: KURSU TƏSDİQLƏMƏK (ADMIN)
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

    // Silmə icazəsi yoxlanışı: ya postun sahibi, ya da Admin olmalıdır
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

    const posts = await readPosts();
    const userWishlist = wishlistItems.map((w) => {
      const post = posts.find((p) => p.id === w.postId);
      return { ...w, post };
    });

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
    const snapshot = await db.collection("contacts").get();
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