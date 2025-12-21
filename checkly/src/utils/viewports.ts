// Device viewport definitions
export const VIEWPORTS = {
  // Desktop
  desktop: { width: 1280, height: 720 },
  desktopLarge: { width: 1920, height: 1080 },

  // Mobile - User specified both
  iphone14: { width: 390, height: 844 },
  galaxyS21: { width: 360, height: 800 },

  // Tablet (optional)
  ipadMini: { width: 768, height: 1024 },
}

// Helper to check if viewport is mobile
export function isMobileViewport(viewport: { width: number; height: number }): boolean {
  return viewport.width < 768
}

// Helper to check if viewport supports hover
export function supportsHover(viewport: { width: number; height: number }): boolean {
  return viewport.width >= 768
}
