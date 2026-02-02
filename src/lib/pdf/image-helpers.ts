/**
 * Shared Image Helpers for PDF Generation
 *
 * This module provides utilities for loading and processing images
 * in the context of PDF generation. These are client-side only functions
 * as they use browser APIs (Image, Canvas).
 */

// Image data with dimensions for proper aspect ratio handling
export interface ImageData {
  base64: string;
  width: number;
  height: number;
}

/**
 * Convert image URL to base64 and get dimensions
 *
 * This function fetches an image, loads it into a canvas to get dimensions,
 * and converts it to a base64 JPEG with 85% quality for optimal file size.
 *
 * @param url - The URL of the image to load
 * @returns ImageData with base64 string and dimensions, or null on error
 */
export async function loadImageWithDimensions(url: string): Promise<ImageData | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();

    return new Promise((resolve) => {
      const img = new window.Image();

      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0);
        const base64 = canvas.toDataURL("image/jpeg", 0.85);

        resolve({
          base64,
          width: img.width,
          height: img.height,
        });
      };

      img.onerror = () => resolve(null);
      img.src = URL.createObjectURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Calculate dimensions that fit within max bounds while preserving aspect ratio
 *
 * This ensures images are scaled down to fit within a bounding box without
 * distortion. The image will be as large as possible while fitting entirely
 * within the specified maximum width and height.
 *
 * @param imgWidth - Original image width
 * @param imgHeight - Original image height
 * @param maxWidth - Maximum allowed width
 * @param maxHeight - Maximum allowed height
 * @returns Calculated width and height that fit within bounds
 */
export function calculateFitDimensions(
  imgWidth: number,
  imgHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  const aspectRatio = imgWidth / imgHeight;

  let width = maxWidth;
  let height = width / aspectRatio;

  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }

  return { width, height };
}
