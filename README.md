# bynk

A minimalist, high-aesthetic photography and visual portfolio built with Next.js, Three.js / React Three Fiber, Framer Motion, and Tailwind CSS.

---

## 📸 Managing Photos & Collections

### 1. Adding Photos to an Existing Collection
1. Drop your new photo files (`.jpg`, `.jpeg`, `.png`, `.webp`) directly into the project folder:
   ```
   public/projects/01-genesis/
   ```
2. **(Optional) Set Cover Image**: Open `category.txt` in that folder:
   - **Line 1**: Category title (e.g., `The Beginning`)
   - **Line 2**: File name of your chosen main cover photo (e.g., `___NK3628@2026.jpg`)

### 2. Creating a New Project / Category
1. Create a new directory inside `public/projects/`:
   ```
   public/projects/02-moments/
   ```
2. Add your photo files (`.jpg`, `.png`, etc.) into that folder.
3. Create a `category.txt` file inside the new project folder:
   ```txt
   Moments in Time
   cover-image.jpg
   ```
   *(Line 1 is the display title; Line 2 is the optional cover photo filename)*.

### 3. Deploying Updates Live
Whenever you add or update photos, commit and push to GitHub to trigger automatic Vercel deployment:

```bash
git add .
git commit -m "add new portfolio photos"
git push origin main
```

### 💡 Image Optimization Best Practice
- Use `.jpg` or `.webp` formats at **80%–90% quality** (~1MB to 3MB per photo).
- Delivers crisp visual clarity on 4K retina displays while maintaining fast page load speeds and smooth 3D animations.

---

## 🛠️ Local Development

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Building for Production

```bash
npm run build
npm run start
```
