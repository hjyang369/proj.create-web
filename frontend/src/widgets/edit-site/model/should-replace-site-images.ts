export function shouldReplaceSiteImages(
  current: { logoUrl: string | null; photoUrls: string[] },
  next: {
    hasNewLogo: boolean;
    keepExistingLogo: boolean;
    newPhotoCount: number;
    keptPhotoUrls: string[];
  },
): boolean {
  if (next.hasNewLogo || next.newPhotoCount > 0) {
    return true;
  }

  const hadLogo = current.logoUrl != null;
  if (hadLogo !== next.keepExistingLogo) {
    return true;
  }

  if (current.photoUrls.length !== next.keptPhotoUrls.length) {
    return true;
  }

  return current.photoUrls.some(
    (url, index) => url !== next.keptPhotoUrls[index],
  );
}
