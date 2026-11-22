/**
 * Orders UI (design-orders.md): one card, one catalog, one forecast, used by the desk, the map
 * menu, the dossier and staff picks. See OrderCard.tsx and OrderCatalog.tsx for the contracts.
 */
export { OrderCard, OrderSlot, type OrderCardHandle, type OrderCardProps } from './OrderCard';
export { OrderCatalog, type OrderCatalogProps } from './OrderCatalog';
export { OrderPreview } from './OrderPreview';
export { previewOf, type PreviewSource } from './preview';
export { ConfirmFace, HOLD_MS } from './ConfirmFace';
export { clearMenus, loadMenu, useMonthView, useOrderMenu, useOrderState } from './useOrders';
