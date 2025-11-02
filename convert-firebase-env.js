import fs from "fs";

const filePath = "./serviceAccountKey.json";

const content = fs.readFileSync(filePath, "utf-8");

const jsonString = JSON.stringify(JSON.parse(content));

const envLine = `FIREBASE_SERVICE_ACCOUNT=${jsonString}\n`;

fs.writeFileSync(".env", envLine, { flag: "a" });

console.log(".env faylına FIREBASE_SERVICE_ACCOUNT əlavə olundu!");
