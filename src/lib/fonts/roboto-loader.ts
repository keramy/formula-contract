/**
 * Roboto Font Loader for jsPDF
 *
 * Loads Roboto font with Turkish character support for PDF generation.
 * Uses complete font files from Google Fonts GitHub repository that include
 * Latin Extended characters (Turkish: ş, ğ, ı, ö, ü, ç, İ, Ş, Ğ, etc.)
 */

import { jsPDF } from "jspdf";

// Cache for loaded fonts
let fontsLoaded = false;
let robotoRegular: string | null = null;
let robotoBold: string | null = null;
let robotoMedium: string | null = null;

// Complete Roboto font files via jsDelivr CDN (includes all character sets)
// These are full TTF files, not subsetted versions - includes Turkish characters
const ROBOTO_REGULAR_URL = "https://cdn.jsdelivr.net/gh/google/fonts@main/apache/roboto/Roboto-Regular.ttf";
const ROBOTO_MEDIUM_URL = "https://cdn.jsdelivr.net/gh/google/fonts@main/apache/roboto/Roboto-Medium.ttf";
const ROBOTO_BOLD_URL = "https://cdn.jsdelivr.net/gh/google/fonts@main/apache/roboto/Roboto-Bold.ttf";

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
 */
export async function loadRobotoFonts(doc: jsPDF): Promise<void> {
  // Load fonts if not already cached
  if (!fontsLoaded) {
    try {
      [robotoRegular, robotoMedium, robotoBold] = await Promise.all([
        fetchFontAsBase64(ROBOTO_REGULAR_URL),
        fetchFontAsBase64(ROBOTO_MEDIUM_URL),
        fetchFontAsBase64(ROBOTO_BOLD_URL),
      ]);
      fontsLoaded = true;
    } catch (error) {
      console.error("Failed to load Roboto fonts:", error);
      // Fall back to Helvetica if fonts fail to load
      return;
    }
  }

  // Register fonts with jsPDF
  if (robotoRegular && robotoMedium && robotoBold) {
    doc.addFileToVFS("Roboto-Regular.ttf", robotoRegular);
    doc.addFileToVFS("Roboto-Medium.ttf", robotoMedium);
    doc.addFileToVFS("Roboto-Bold.ttf", robotoBold);
    doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
    doc.addFont("Roboto-Medium.ttf", "Roboto", "medium");
    doc.addFont("Roboto-Bold.ttf", "Roboto", "bold");
  }
}

/**
 * Check if Roboto fonts are available
 */
export function areFontsLoaded(): boolean {
  return fontsLoaded;
}
