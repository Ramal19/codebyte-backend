import express from "express";
import fs from "fs";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import path from "path";
import cors from "cors";
import multer from "multer";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import admin from "firebase-admin";
import { v4 as uuidv4 } from "uuid";

dotenv.config();

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET, // ✅ Firebase Storage aktivləşdirilib
});

const db = admin.firestore();
const bucket = admin.storage().bucket(); // ✅ Storage bucket yaradıldı
const usersRef = db.collection("users");
const postsRef = db.collection("posts");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USERS_FILE = path.join(__dirname, "users.json");
const POSTS_FILE = path.join(__dirname, "posts.json");

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET = process.env.JWT_SECRET || "super_secret_key";

app.use(cors());
app.options("*", cors()); // <--- bunu əlavə et
app.use(express.json());

// Multer yaddaşı RAM-da saxlayacaq (diskdə deyil)
const upload = multer({ storage: multer.memoryStorage() });

// --- Firestore oxuma funksiyaları ---
async function readUsers() {
  const snapshot = await usersRef.get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function readPosts() {
  const snapshot = await postsRef.get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

// --- Auth Middleware ---
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

// --- Qeydiyyat ---
app.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ message: "Boş ola bilməz" });

  const users = await readUsers();

  if (users.find((u) => u.username === username))
    return res.status(409).json({ message: "Bu istifadəçi artıq mövcuddur" });
  if (users.find((u) => u.email === email))
    return res.status(409).json({ message: "Bu email artıq istifadə olunur" });

  const hashed = await bcrypt.hash(password, 10);
  await usersRef.add({ username, email, password: hashed, role: "user" });

  res.json({ message: "Qeydiyyat uğurla tamamlandı" });
});

// --- Login ---
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const users = await readUsers();

  const user = users.find((u) => u.username === username);
  if (!user) return res.status(401).json({ message: "İstifadəçi tapılmadı" });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ message: "Şifrə səhvdir" });

  const token = jwt.sign(
    { username: user.username, role: user.role },
    SECRET,
    { expiresIn: "30d" }
  );
  res.json({ token });
});

// --- Profil ---
app.get("/profile", auth, (req, res) => {
  res.json({ message: `Xoş gəldin ${req.user.username}!`, role: req.user.role });
});

// --- İstifadəçi siyahısı ---
app.get("/users", async (req, res) => {
  try {
    const users = await readUsers();
    res.json(users);
  } catch (error) {
    console.error("USERS ERROR:", error);
    res.status(500).json({ message: "Server xətası: istifadəçilər tapılmadı." });
  }
});

// --- Fayl yükləmə funksiyası (Firebase Storage üçün) ---
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

app.post("/posts", auth, upload.any(), async (req, res) => {

  try {
    console.log("✅ POST /posts route işə düşdü");

    console.log("req.body:", req.body);

    const { text, category } = req.body;
    const username = req.user?.username || "Anonim";

    let videoTitles = [];
    if (req.body.videoTitles) {
      try {
        videoTitles = JSON.parse(req.body.videoTitles);
      } catch (err) {
        console.log("⚠️ videoTitles parse xətası:", err);
        videoTitles = [req.body.videoTitles];
      }
    }

    console.log("videoTitles nəticə:", videoTitles);

    const courseCoverFile = req.files.find(f => f.fieldname === "courseCover");
    const videosFiles = req.files.filter(f => f.fieldname === "videos");
    const videoCoversFiles = req.files.filter(f => f.fieldname === "videoCovers");

    const courseCover = courseCoverFile ? await uploadToFirebase(courseCoverFile) : "";
    const videos = await Promise.all(videosFiles.map(uploadToFirebase));
    const videoCovers = await Promise.all(videoCoversFiles.map(uploadToFirebase));

    const newPost = {
      id: Date.now().toString(),
      username,
      text,
      category,
      courseCover,
      videos,
      videoCovers,
      videoTitles,
      createdAt: new Date().toISOString(),
    };

    console.log("🔥 Firebase-ə göndərilən obyekt:", newPost);

    await postsRef.doc(newPost.id).set(newPost);

    res.json({ message: "Kurs əlavə olundu", newPost });
  } catch (err) {
    console.error("❌ POST /posts error:", err);
    res.status(500).json({ message: "Server xətası", error: err.message });
  }
}
);


app.get("/posts", async (req, res) => {
  const posts = await readPosts();
  res.json(posts);
});

app.delete("/posts/:id", auth, async (req, res) => {
  try {
    const postId = req.params.id;
    const posts = await readPosts();
    const post = posts.find((p) => p.id.toString() === postId);

    if (!post) return res.status(404).json({ message: "Tapılmadı" });
    if (post.username !== req.user.username)
      return res.status(403).json({ message: "Silmə icazən yoxdur" });

    await postsRef.doc(postId).delete();
    res.json({ message: "Silindi" });
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

app.post("/contact", async (req, res) => {
  try {
    console.log("POST /contact body:", req.body);

    const { name, surname, email, phone, message } = req.body;

    if (!name || !surname || !email || !message) {
      return res.status(400).json({ message: "Zəhmət olmasa bütün xanaları doldurun." });
    }

    const docRef = await db.collection("contacts").add({
      name,
      surname,
      email,
      phone: phone || "",
      message,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log("Mesaj Firestore-a yazıldı, ID:", docRef.id);

    res.json({ message: "Mesaj uğurla göndərildi." });
  } catch (error) {
    console.error("POST /contact error:", error);
    res.status(500).json({ message: "Server xətası", error: error.message });
  }
});




app.listen(PORT, () => {
  console.log(`✅ Server işləyir: http://localhost:${PORT}`);
});
