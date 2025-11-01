// // // import express from "express";
// // // import fs from "fs";
// // // import bcrypt from "bcrypt";
// // // import jwt from "jsonwebtoken";
// // // import path from "path";
// // // import cors from "cors";

// // // const app = express();
// // // const PORT = 3000;
// // // const SECRET = "super_secret_key"; // istəsən dəyişdir

// // // const __dirname = path.resolve();
// // // const USERS_FILE = path.join(__dirname, "users.json");


// // // app.use(cors());
// // // app.use(express.json());

// // // // ✅ Helper: users.json oxu/yaz
// // // function readUsers() {
// // //   if (!fs.existsSync(USERS_FILE)) return [];
// // //   const data = fs.readFileSync(USERS_FILE);
// // //   return JSON.parse(data);
// // // }

// // // function writeUsers(users) {
// // //   fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
// // // }

// // // // ✅ Qeydiyyat
// // // app.post("/register", async (req, res) => {
// // //   const { username, password } = req.body;
// // //   if (!username || !password) return res.status(400).json({ message: "Boş ola bilməz" });

// // //   const users = readUsers();
// // //   if (users.find(u => u.username === username))
// // //     return res.status(409).json({ message: "Bu istifadəçi artıq mövcuddur" });

// // //   const hashed = await bcrypt.hash(password, 10);
// // //   users.push({ username, password: hashed, role: "user" });
// // //   writeUsers(users);
// // //   res.json({ message: "Qeydiyyat uğurla tamamlandı" });
// // // });

// // // // ✅ Giriş
// // // app.post("/login", async (req, res) => {
// // //   const { username, password } = req.body;
// // //   const users = readUsers();
// // //   const user = users.find(u => u.username === username);
// // //   if (!user) return res.status(401).json({ message: "İstifadəçi tapılmadı" });

// // //   const match = await bcrypt.compare(password, user.password);
// // //   if (!match) return res.status(401).json({ message: "Şifrə səhvdir" });

// // //   const token = jwt.sign({ username: user.username, role: user.role }, SECRET, { expiresIn: "15m" });
// // //   res.json({ token });
// // // });

// // // // ✅ Mühafizə olunmuş məlumat (login tələb edir)
// // // app.get("/profile", (req, res) => {
// // //   const authHeader = req.headers["authorization"];
// // //   const token = authHeader && authHeader.split(" ")[1];
// // //   if (!token) return res.status(401).json({ message: "Token yoxdur" });

// // //   jwt.verify(token, SECRET, (err, user) => {
// // //     if (err) return res.status(403).json({ message: "Token səhvdir və ya vaxtı bitib" });
// // //     res.json({ message: `Xoş gəldin ${user.username}!`, role: user.role });
// // //   });
// // // });

// // // app.listen(PORT, () => console.log(`Server işləyir: http://localhost:${PORT}`));


// import express from "express";
// import fs from "fs";
// import bcrypt from "bcrypt";
// import jwt from "jsonwebtoken";
// import path from "path";
// import cors from "cors";
// import multer from "multer";
// import { fileURLToPath } from "url";  // 🔹 ESM üçün lazım

// // ---------- ESM üçün __dirname və __filename ----------
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// // ---------- Fayl yolları ----------
// const USERS_FILE = path.join(__dirname, "users.json");
// const POSTS_FILE = path.join(__dirname, "posts.json");
// const uploadDir = path.join(__dirname, "uploads");

// // Upload qovluğu yoxdursa yarat
// if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// // ---------- Multer konfiqurasiyası ----------
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => cb(null, uploadDir),
//   filename: (req, file, cb) => {
//     const unique = Date.now() + "-" + file.originalname;
//     cb(null, unique);
//   }
// });
// const upload = multer({ storage });

// // ---------- Express qurulması ----------
// const app = express();
// const PORT = 3000;
// const SECRET = "super_secret_key"; // istəsən dəyişdir

// app.use(cors());
// app.use(express.json());
// app.use("/uploads", express.static(uploadDir)); // şəkilləri göstərmək üçün

// // ---------- Helper funksiyalar ----------
// function readUsers() {
//   if (!fs.existsSync(USERS_FILE)) return [];
//   return JSON.parse(fs.readFileSync(USERS_FILE));
// }
// function writeUsers(users) {
//   fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
// }
// function readPosts() {
//   if (!fs.existsSync(POSTS_FILE)) return [];
//   return JSON.parse(fs.readFileSync(POSTS_FILE));
// }
// function writePosts(posts) {
//   fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2));
// }

// // ---------- Auth middleware ----------
// function auth(req, res, next) {
//   const header = req.headers["authorization"];
//   const token = header && header.split(" ")[1];
//   if (!token) return res.status(401).json({ message: "Token yoxdur" });
//   jwt.verify(token, SECRET, (err, user) => {
//     if (err) return res.status(403).json({ message: "Token səhvdir və ya vaxtı bitib" });
//     req.user = user;
//     next();
//   });
// }

// // ---------- Qeydiyyat ----------
// app.post("/register", async (req, res) => {
//   const { username, password } = req.body;
//   if (!username || !password)
//     return res.status(400).json({ message: "Boş ola bilməz" });

//   const users = readUsers();
//   if (users.find(u => u.username === username))
//     return res.status(409).json({ message: "Bu istifadəçi artıq mövcuddur" });

//   const hashed = await bcrypt.hash(password, 10);
//   users.push({ username, password: hashed, role: "user" });
//   writeUsers(users);
//   res.json({ message: "Qeydiyyat uğurla tamamlandı" });
// });

// // ---------- Giriş ----------
// app.post("/login", async (req, res) => {
//   const { username, password } = req.body;
//   const users = readUsers();
//   const user = users.find(u => u.username === username);
//   if (!user) return res.status(401).json({ message: "İstifadəçi tapılmadı" });

//   const match = await bcrypt.compare(password, user.password);
//   if (!match) return res.status(401).json({ message: "Şifrə səhvdir" });

//   const token = jwt.sign(
//     { username: user.username, role: user.role },
//     SECRET,
//     { expiresIn: "15m" }
//   );
//   res.json({ token });
// });

// // ---------- Profil (login tələb edir) ----------
// app.get("/profile", auth, (req, res) => {
//   res.json({ message: `Xoş gəldin ${req.user.username}!`, role: req.user.role });
// });

// // ---------- Post yarat (şəkil yüklə) ----------
// app.post("/posts", auth, upload.single("image"), (req, res) => {
//   const posts = readPosts();
//   const newPost = {
//     id: Date.now().toString(),
//     username: req.user.username,
//     filename: req.file.filename
//   };
//   posts.push(newPost);
//   writePosts(posts);
//   res.json(newPost);
// });

// // ---------- Bütün postları göstər (hamıya açıq) ----------
// app.get("/posts", (req, res) => {
//   const posts = readPosts();
//   res.json(posts);
// });

// // ---------- Öz postunu sil ----------
// app.delete("/posts/:id", auth, (req, res) => {
//   const posts = readPosts();
//   const post = posts.find(p => p.id === req.params.id);
//   if (!post) return res.status(404).json({ message: "Tapılmadı" });
//   if (post.username !== req.user.username)
//     return res.status(403).json({ message: "Silmə icazən yoxdur" });

//   fs.unlinkSync(path.join(uploadDir, post.filename));
//   writePosts(posts.filter(p => p.id !== req.params.id));
//   res.json({ message: "Silindi" });
// });

// // ---------- Serveri işə sal ----------
// app.listen(PORT, () =>
//   console.log(`✅ Server işləyir: http://localhost:${PORT}`)
// );

import express from "express";
import fs from "fs";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import path from "path";
import cors from "cors";
import multer from "multer";
import { fileURLToPath } from "url";
import dotenv from "dotenv"

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USERS_FILE = path.join(__dirname, "users.json");
const POSTS_FILE = path.join(__dirname, "posts.json");
const uploadDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + file.originalname;
    cb(null, unique);
  }
});
const upload = multer({ storage });

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET = "super_secret_key";

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(uploadDir));

function readUsers() {
  if (!fs.existsSync(USERS_FILE)) return [];
  return JSON.parse(fs.readFileSync(USERS_FILE));
}
function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}
function readPosts() {
  if (!fs.existsSync(POSTS_FILE)) return [];
  return JSON.parse(fs.readFileSync(POSTS_FILE));
}
function writePosts(posts) {
  fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2));
}

function auth(req, res, next) {
  const header = req.headers["authorization"];
  const token = header && header.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Token yoxdur" });
  jwt.verify(token, SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "Token səhvdir və ya vaxtı bitib" });
    req.user = user;
    next();
  });
}

// ---------- REGISTER (email əlavə edildi) ----------
app.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ message: "Boş ola bilməz" });

  const users = readUsers();
  if (users.find(u => u.username === username))
    return res.status(409).json({ message: "Bu istifadəçi artıq mövcuddur" });

  if (users.find(u => u.email === email))
    return res.status(409).json({ message: "Bu email artıq istifadə olunur" });

  const hashed = await bcrypt.hash(password, 10);
  users.push({ username, email, password: hashed, role: "user" });
  writeUsers(users);
  res.json({ message: "Qeydiyyat uğurla tamamlandı" });
});

// ---------- LOGIN (hələ username + password qalır) ----------
app.post("/login", async (req, res) => {
  const { username, password, } = req.body;
  const users = readUsers();
  const user = users.find(u => u.username === username);
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

app.get("/profile", auth, (req, res) => {
  res.json({ message: `Xoş gəldin ${req.user.username}!`, role: req.user.role });
});


app.post(
  "/posts",
  auth,
  upload.fields([
    { name: "courseCover", maxCount: 1 },
    { name: "videos", maxCount: 20 },
    { name: "videoCovers", maxCount: 20 }
  ]),
  (req, res) => {
    const posts = readPosts();
    const { text, category } = req.body;
    const username = req.user.username;

    const courseCover = req.files["courseCover"]?.[0]?.filename;
    const videos = req.files["videos"]?.map(f => f.filename) || [];
    const videoCovers = req.files["videoCovers"]?.map(f => f.filename) || [];

    const newPost = {
      id: Date.now().toString(),
      username,
      text,
      category,
      courseCover,
      videos,
      videoCovers,
    };

    posts.push(newPost);
    writePosts(posts);
    res.json({ message: "Kurs əlavə olundu", newPost });
  }
);



app.get("/posts", (req, res) => {
  res.json(readPosts());
});
app.delete("/posts/:id", auth, (req, res) => {
  const posts = readPosts();
  const post = posts.find(p => p.id.toString() === req.params.id);
  if (!post) return res.status(404).json({ message: "Tapılmadı" });
  if (post.username !== req.user.username)
    return res.status(403).json({ message: "Silmə icazən yoxdur" });

  try {
    if (post.courseCover) fs.unlinkSync(path.join(uploadDir, post.courseCover));
    if (post.videos) post.videos.forEach(v => fs.unlinkSync(path.join(uploadDir, v)));
    if (post.videoCovers) post.videoCovers.forEach(c => fs.unlinkSync(path.join(uploadDir, c)));
  } catch (err) {
    console.warn("Silinərkən xəta:", err.message);
  }

  writePosts(posts.filter(p => p.id.toString() !== req.params.id));
  res.json({ message: "Silindi" });
});


app.get("/users", (req, res) => {
  try {
    const usersPath = path.join(__dirname, "users.json");

    const data = fs.readFileSync(usersPath, "utf-8");

    res.json(JSON.parse(data));

  } catch (error) {
    console.error("USERS ERROR:", error);
    res.status(500).json({ message: "Server xətası: İstifadəçi məlumatları tapılmadı." });
  }
});



app.listen(PORT, () =>
  console.log(`✅ Server işləyir: http://localhost:${PORT}`)
);