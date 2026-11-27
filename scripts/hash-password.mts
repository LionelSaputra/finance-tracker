import { createInterface } from "node:readline/promises";
import { hashPassword } from "../lib/auth/password";

const rl = createInterface({ input: process.stdin, output: process.stdout });
const pw = await rl.question("Password baru (minimal 12 karakter): ");
rl.close();
if (pw.length < 12) {
  console.error("Password terlalu pendek.");
  process.exit(1);
}
console.log(`\nAPP_PASSWORD_HASH=${await hashPassword(pw)}`);
