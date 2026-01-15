/**
 * Roboto Font Loader for jsPDF
 *
 * Loads Roboto font with Turkish character support for PDF generation.
 * Fonts are fetched from Google Fonts CDN and cached in memory.
 */

import { jsPDF } from "jspdf";

// Cache for loaded fonts
let fontsLoaded = false;
let robotoRegular: string | null = null;
let robotoBold: string | null = null;

// Google Fonts CDN URLs for Roboto (Latin Extended - includes Turkish)
const ROBOTO_REGULAR_URL = "https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxP.ttf";
const ROBOTO_BOLD_URL = "https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlfBBc9.ttf";

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
      [robotoRegular, robotoBold] = await Promise.all([
        fetchFontAsBase64(ROBOTO_REGULAR_URL),
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
  if (robotoRegular && robotoBold) {
    doc.addFileToVFS("Roboto-Regular.ttf", robotoRegular);
    doc.addFileToVFS("Roboto-Bold.ttf", robotoBold);
    doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
    doc.addFont("Roboto-Bold.ttf", "Roboto", "bold");
  }
}

/**
 * Check if Roboto fonts are available
 */
export function areFontsLoaded(): boolean {
  return fontsLoaded;
}
