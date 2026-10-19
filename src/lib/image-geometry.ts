export interface ImageRect { left: number; top: number; width: number; height: number }

// Preserve aspect ratio while leaving an accessible dismissal area on every side.
export function fitImage(width: number, height: number, viewportWidth: number, viewportHeight: number): ImageRect {
  const padding = Math.min(28, Math.max(8, Math.min(viewportWidth, viewportHeight) * 0.04));
  const scale = Math.min(1, Math.max(1, viewportWidth - padding * 2) / Math.max(1, width), Math.max(1, viewportHeight - padding * 2) / Math.max(1, height));
  const fittedWidth = Math.max(1, width) * scale;
  const fittedHeight = Math.max(1, height) * scale;
  return { left: (viewportWidth - fittedWidth) / 2, top: (viewportHeight - fittedHeight) / 2, width: fittedWidth, height: fittedHeight };
}

export function imageContentRect(box: ImageRect, width: number, height: number, fit: string): ImageRect {
  if (fit !== 'contain') return { left: box.left, top: box.top, width: box.width, height: box.height };
  const scale = Math.min(box.width / Math.max(1, width), box.height / Math.max(1, height));
  const renderedWidth = width * scale;
  const renderedHeight = height * scale;
  return { left: box.left + (box.width - renderedWidth) / 2, top: box.top + (box.height - renderedHeight) / 2, width: renderedWidth, height: renderedHeight };
}
