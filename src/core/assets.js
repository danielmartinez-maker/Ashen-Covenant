// Public files live beside the bundled index. Leading slashes are harmless on
// Vite's development server but escape the application directory when the
// Windows build runs from file://, so every runtime asset goes through here.
export const resolveAssetUrl = (src, base = globalThis.document?.baseURI ?? globalThis.location?.href ?? 'http://localhost/') => {
  const relative = String(src ?? '').replace(/^\/+/, '');
  try {
    return new URL(relative, base).href;
  } catch {
    return relative;
  }
};

export const assetCssUrl = (src, base) => `url('${resolveAssetUrl(src, base).replaceAll("'", '%27')}')`;
