# Literary Lounge — App Walkthrough

Since I currently cannot launch the Android emulator due to system image and build environment constraints, I've put together this visual and structural walkthrough of the **Literary Lounge** app based on the source code and assets.

## The Visual Identity
The app uses an elegant, "Classical Lounge" aesthetic.

- **Color Palette:**
  - **Ink:** A deep, sophisticated navy/charcoal used for text and primary buttons.
  - **Gold (`#B78A3D`):** Used for highlights, accents, and icons, giving it a premium feel.
  - **Paper:** A warm, off-white background that mimics the feel of an actual book page.
- **Typography:** Uses **Playfair Display** (a classic serif font) for headings and **Inter** (a clean sans-serif) for body text.

![Literary Lounge Logo](file:///C:/Users/Kwame-Peprah/OneDrive/Desktop/literary-lounge/literary-lounge/public/WhatsApp%20Image%202026-09-02%20at%2016.47.35.jpeg)

---

## Screen-by-Screen Breakdown

````carousel
### 1. The Landing Page
**The Hero Section**
- Large circular logo at the top.
- Bold serif heading: "The Literary Lounge".
- Gold tagline: "Read. Discuss. Connect."
- Main CTA: "Join the Lounge".

**Community Highlights**
- A smooth carousel showing people reading and connecting in warm, cozy settings.
<!-- slide -->
### 2. The Library
**Book Collection**
- Grid of book covers with a clean, minimal layout.
- Featured book section (currently *White Fang*).
- Filtering by genre or "Currently Reading" status.

**Book Detail**
- Large cover art.
- Synopsis, author info, and a "Start Reading" button.
<!-- slide -->
### 3. The Reader
**E-Reading Experience**
- Full-screen distraction-free reading.
- Font size and theme customization (Light, Dark, Sepia).
- Progress tracking (saves exactly where you left off).
<!-- slide -->
### 4. Member Dashboard
**Your Lounge Journey**
- "Welcome back" personalized header.
- Current reading progress bars.
- Shortcuts to upcoming WhatsApp discussion groups.
- Recent notes and highlights.
<!-- slide -->
### 5. Events & Membership
**Community Connections**
- Timeline of upcoming live discussions.
- Membership status cards showing tier information and benefits.
````

## Technical Architecture
The app is built as a **Hybrid Android App**:
- **Frontend:** React + Tailwind CSS + Vite.
- **Backend:** Supabase (Auth, Database, Storage).
- **Mobile Bridge:** Capacitor (wraps the web app in a native Android shell).

## How to see it running?
If you'd like to see the app running live on the emulator, we need to:
1. **Fix Java Version:** Install Java 17 or 21 (Java 25 is currently too new for the Android build tools in this project).
2. **Setup Emulator:** Successfully download the system image (which timed out earlier).

> [!NOTE]
> I can help you with these fixes if you'd like to proceed with a live demo!
