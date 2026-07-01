<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/cde7a660-4347-4e3b-a2c5-1c3c47c662ba

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Prompt
Build a mobile-first, highly robust Vegan Barcode Scanner web application using React, Tailwind CSS, lucide-react for icons, and motion/react for smooth view transitions. The app must be entirely in Catalan.
1. Advanced Barcode Scanner Component

Create a highly optimized camera scanner component with a 3-tier fallback strategy:

    Tier 1 (Best): Use a Web Worker with the native BarcodeDetector API. If not available natively, polyfill it using @undecaf/barcode-detector-polyfill. Apply multi-pass image filtering (normal contrast boost and inverted colors) to improve detection.

    Tier 2 (Good): If the worker fails to initialize within 3 seconds, fall back to running the same polyfill and filters on the main thread.

    Tier 3 (Last Resort): If the polyfill fails completely, fall back to the html5-qrcode library.
    The scanner UI should have a dark background, a clear central scanning box (280x160) with corner brackets, a pulsing green laser line, and a button to toggle the device flashlight if available. Do not show any debug badges.

2. Search Strategy & Race Condition

When a barcode is detected or manually typed in, show a loading screen where the user can still see and edit the scanned barcode. If they edit the barcode while loading, cancel the current search and return to the scanner view.
Implement a race condition between two data sources:

    OpenFoodFacts API: Fetch data from https://world.openfoodfacts.org/api/v2/product/{barcode}.json. Parse the ingredients and vegan/vegetarian status.

    Gemini Fast Search: Use the @google/genai SDK with the gemini-3.1-flash-lite-preview model. Enable the googleSearch tool (grounding) to search the web for the barcode and determine if it's vegan, vegetarian, or non-vegetarian.
    The first source to return a valid result wins. Wrap this race in a 10-second timeout.

3. Deep Search & Image Fallback

If the initial race fails or times out, show an "Unknown" result screen with two fallback options:

    Cerca profunda (Deep Search): A button that triggers a more thorough search using the gemini-3-flash-preview model with Google Search grounding. Wrap this in a 30-second timeout.

    Escanejar Ingredients (Scan Ingredients): A button that opens a camera view to take a picture of the ingredients list. Send this image to the gemini-3.1-flash-lite-preview model to analyze the text and determine the vegan status. Wrap this in a 30-second timeout.

4. UI/UX & State Management

    Views: Manage states for scanner, loading, result, fallback-capture, analyzing-image, and deep-searching. Use AnimatePresence and motion.div to smoothly fade and scale between these views.

    Result Screen: Display a clear icon (Leaf for vegan/vegetarian, Beef for non-vegetarian, HelpCircle for unknown). Use specific color themes: Emerald for Vegan, Amber for Vegetarian, Red for Non-Vegetarian, and Stone/Gray for Unknown. Show the product name, image (if available), and a brief explanation (reason) in Catalan.

    Manual Entry: Provide a text input below the scanner to manually type a barcode and a "Cercar" button.

Ensure all AI prompts explicitly request JSON output with status (vegan, vegetarian, non-vegetarian, unknown) and reason (in Catalan), and use responseSchema where appropriate. Ensure all error handling is silent to the user, gracefully falling back to the next available option.
