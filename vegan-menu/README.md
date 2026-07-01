<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/30dfe162-48a6-458b-80ab-bc85f4e0fec1

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`


## Prompt
"Act as an expert frontend developer and UI/UX designer. Build a React, TypeScript, and Tailwind CSS application called 'Lector de Menús Herbívor' (Herbivore Menu Reader). The app allows users to upload images or PDFs of restaurant menus, uses the Gemini AI API to analyze them, and displays the menu categorized by diet (Vegan, Vegetarian, Carnivore) with a focus on plant-based options.

ALL UI text and AI output MUST be in Catalan.

Here are the detailed requirements for the application:
1. Tech Stack

    React 18, TypeScript, Vite

    Tailwind CSS for styling

    lucide-react for icons

    motion/react for animations (page transitions, loading states, list staggering)

    @google/genai for the AI integration

2. Design & Aesthetics

    Color Palette: Off-white backgrounds (#fcfbf9, #f0efe9), dark gray text (#2c2c2a, #5a5a55), Emerald for Vegan/Primary, Amber for Vegetarian, Rose for Carnivore.

    Typography: Use a Serif font for headings and a clean Sans-serif for body text.

    Background Decorations: Add a soft emerald gradient at the top. Scatter exactly 10 Leaf icons across the background for all screen sizes (varying sizes, opacities, and rotations to look like falling leaves), plus 6 additional Leaf icons that only appear on larger screens (md, lg, xl, 2xl).

    Main Logo: A large circular emerald background (bg-emerald-100) containing a dark green UtensilsCrossed icon, with a small green Leaf icon sprouting out of the top-right edge (rotated 24 degrees).

3. Landing Page & File Upload

    Display the main logo, the title 'Lector de Menús Herbívor', and a short subtitle explaining the app.

    Implement a drag-and-drop file upload zone (supporting images and PDFs).

    Below the upload zone, show a list of selected files with a 'Remove' (X) button for each.

    Show a 'Processar Menú' button that triggers the AI analysis when files are selected.

4. Loading State

    When processing, show a full-screen overlay with a spinning Loader2 icon.

    Below the spinner, display rotating loading quotes that fade in and out every 5 seconds using AnimatePresence.

    Quotes Logic: The first 4 quotes MUST appear in this exact order:

        "Llegint el menú..."

        "Buscant plats vegans..."

        "Buscant maneres de veganitzar els plats..."

        "Els animals t'ho agraeixen 💚"
        After these 4, randomly cycle through 16 other fun quotes (e.g., "Analitzant els ingredients...", "Desxifrant la lletra petita...", "Buscant el tofu amagat...", "Negociant amb el xef virtual...", etc.).

5. AI Integration (geminiService.ts)

    Use the gemini-3-flash-preview model.

    Performance: Read all uploaded files in parallel using Promise.all and FileReader to convert them to base64 before sending to Gemini.

    Prompt Instructions:

        Extract all food items and group them by sections (e.g., Entrants, Plats Principals).

        Extract name, description, and price. Skip all drinks/beverages entirely.

        Strictly categorize every item as "vegan", "vegetarian", or "carnivore".

        If an item is carnivore/vegetarian but easily modifiable to be vegan/vegetarian, provide a modificationNote (e.g., "Sense formatge") and a modifiableTo value.

        Translate everything to Catalan.

        Return strictly as a JSON object matching a specific schema (sections array containing items array).

6. Results Page (MenuDisplay.tsx)

    Include a "Analitzar un altre menú" (Back) button at the top to reset the app.

    Layout: A main content area for the menu and a Sidebar for filters.

    Sidebar / Filters:

        On desktop, it should be sticky on the left/right. On mobile, it should be a slide-in drawer triggered by a floating hamburger menu button positioned at the bottom-right of the screen.

        Diet Filters: "Tots els plats", "Vegà" (with Leaf icon), "Vegetarià" (with Egg icon), "Carnívor" (with PawPrint icon).

        Default State: The "Vegà" filter should be active by default.

        Modifications Toggle: A switch/checkbox to "Incloure plats modificables" (Include modifiable dishes). This should be ON by default.

        Sorting: A dropdown to sort by Default, Price (Low to High), Price (High to Low), and Name (A-Z).

    Menu Display:

        Render sections and their items. Filter out empty sections.

        Each item card should display the name, price, and description.

        Show a category badge for each item: Emerald Leaf for Vegà, Amber Egg for Vegetarià, Rose PawPrint for Carnívor.

        If an item has a modificationNote and the modifications toggle is on, display a highlighted info box below the item description showing the note and what it becomes (e.g., "Vegà amb modificació").

        Animate the list items as they appear or are filtered using Framer Motion."
