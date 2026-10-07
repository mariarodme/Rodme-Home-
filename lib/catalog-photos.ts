import photos from './catalog-photos.json';
import type {Home} from './model';
type Photo = {name: string; image: string; credit: string};
export const PHOTO_CATALOG_VERSION = 1;
export function addCatalogPhotos(home: Home) {
  if ((home.photoCatalogVersion || 0) >= PHOTO_CATALOG_VERSION) return false;
  for (const product of home.products) {
    const photo = (photos as Record<string,Photo>)[product.id];
    if (!product.image && !product.imageAutoDisabled && photo && product.name.trim() === photo.name.trim()) {
      product.image = photo.image;
      product.imageSource = 'representative';
      product.imageCredit = photo.credit;
    }
  }
  home.photoCatalogVersion = PHOTO_CATALOG_VERSION;
  return true;
}
