/**
 * Roboto Font Loader for jsPDF
 *
 * Loads Roboto font with Turkish character support for PDF generation.
 * Uses complete font files from Google Fonts GitHub repository that include
 * Latin Extended characters (Turkish: ş, ğ, ı, ö, ü, ç, İ, Ş, Ğ, etc.)
 *
 * Falls back to Helvetica if font loading fails.
 */

import { jsPDF } from "jspdf";

// Cache for loaded fonts
let fontLoadAttempted = false;
let fontLoadSuccess = false;
let robotoRegular: string | null = null;
let robotoBold: string | null = null;
let robotoMedium: string | null = null;

// Roboto font files from Google Fonts CDN with latin-ext charset (includes Turkish: ş, ğ, ı, ö, ü, ç)
// Source: https://gwfh.mranftl.com/fonts/roboto?subsets=latin-ext
const ROBOTO_REGULAR_URL = "https://fonts.gstatic.com/s/roboto/v50/KFOMCnqEu92Fr1ME7kSn66aGLdTylUAMQXC89YmC2DPNWubEbVmaiA8.ttf";
const ROBOTO_MEDIUM_URL = "https://fonts.gstatic.com/s/roboto/v50/KFOMCnqEu92Fr1ME7kSn66aGLdTylUAMQXC89YmC2DPNWub2bVmaiA8.ttf";
const ROBOTO_BOLD_URL = "https://fonts.gstatic.com/s/roboto/v50/KFOMCnqEu92Fr1ME7kSn66aGLdTylUAMQXC89YmC2DPNWuYjalmaiA8.ttf";

// Font family to use (Roboto if loaded, Helvetica as fallback)
export let activeFontFamily = "helvetica";

/**
 * Convert ArrayBuffer to Base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Fetch font from URL and convert to base64
 */
async function fetchFontAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch font: ${response.statusText}`);
  }
  const buffer = await response.arrayBuffer();
  return arrayBufferToBase64(buffer);
}

/**
 * Load Roboto fonts and register them with jsPDF
 * Call this before generating any PDF that needs Turkish characters
 * Returns the font family to use ("Roboto" if loaded, "helvetica" as fallback)
 */
export async function loadRobotoFonts(doc: jsPDF): Promise<string> {
  // Only attempt to load fonts once
  if (!fontLoadAttempted) {
    fontLoadAttempted = true;
    try {
      console.log("[Font Loader] Fetching Roboto fonts from jsDelivr...");
      [robotoRegular, robotoMedium, robotoBold] = await Promise.all([
        fetchFontAsBase64(ROBOTO_REGULAR_URL),
        fetchFontAsBase64(ROBOTO_MEDIUM_URL),
        fetchFontAsBase64(ROBOTO_BOLD_URL),
      ]);
      fontLoadSuccess = true;
      activeFontFamily = "Roboto";
      console.log("[Font Loader] Roboto fonts loaded successfully");
    } catch (error) {
      console.error("[Font Loader] Failed to load Roboto fonts, using Helvetica fallback:", error);
      fontLoadSuccess = false;
      activeFontFamily = "helvetica";
    }
  }

  // Register fonts with jsPDF if successfully loaded
  if (fontLoadSuccess && robotoRegular && robotoMedium && robotoBold) {
    doc.addFileToVFS("Roboto-Regular.ttf", robotoRegular);
    doc.addFileToVFS("Roboto-Medium.ttf", robotoMedium);
    doc.addFileToVFS("Roboto-Bold.ttf", robotoBold);
    doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
    doc.addFont("Roboto-Medium.ttf", "Roboto", "medium");
    doc.addFont("Roboto-Bold.ttf", "Roboto", "bold");
  }

  return activeFontFamily;
}

/**
 * Check if Roboto fonts were loaded successfully
 */
export function areFontsLoaded(): boolean {
  return fontLoadSuccess;
}

/**
 * Get the active font family (Roboto if loaded, helvetica as fallback)
 */
export function getActiveFontFamily(): string {
  return activeFontFamily;
}
