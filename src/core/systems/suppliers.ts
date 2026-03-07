import { CountryState, UnitType } from '../types.js';

export interface ArmsSupplier {
  id: string;
  name: string;
  countryId: string;
  relationshipThreshold: number;  // Minimum relation to purchase
  humanRightsSensitivity: number; // 0-100, higher = stricter
  equipmentTiers: number[];       // Available tiers (1-3)
  discount: number;               // Base discount percentage
}

export const ARMS_SUPPLIERS: ArmsSupplier[] = [
  {
    id: 'USA',
    name: 'United States',
    countryId: 'USA',
    relationshipThreshold: 20,
    humanRightsSensitivity: 60,
    equipmentTiers: [1, 2, 3],
    discount: 0,
  },
  {
    id: 'UK',
    name: 'United Kingdom',
    countryId: 'GBR',
    relationshipThreshold: 10,
    humanRightsSensitivity: 50,
    equipmentTiers: [1, 2],
    discount: 5,
  },
  {
    id: 'FRANCE',
    name: 'France',
    countryId: 'FRA',
    relationshipThreshold: 0,
    humanRightsSensitivity: 40,
    equipmentTiers: [1, 2, 3],
    discount: 10,
  },
  {
    id: 'RUSSIA',
    name: 'Russia',
    countryId: 'RUS',
    relationshipThreshold: -20,
    humanRightsSensitivity: 10,
    equipmentTiers: [1, 2, 3],
    discount: 15,
  },
  {
    id: 'PRIVATE',
    name: 'Private Dealer',
    countryId: '',
    relationshipThreshold: -100, // Anyone can buy
    humanRightsSensitivity: 0,
    equipmentTiers: [1],
    discount: -20, // Actually more expensive
  },
];

export interface PurchaseResult {
  success: boolean;
  reason?: string;
  cost: number;
  units: Partial<Record<keyof typeof UNIT_BASE_COSTS, number>>;
}

export const UNIT_BASE_COSTS: Record<string, number> = {
  tanks: 50,
  helicopters: 30,
  sams: 25,
  fighters: 80,
  infantry: 5,
};

export function canPurchaseFrom(
  buyer: CountryState,
  supplier: ArmsSupplier,
  supplierCountry: CountryState | undefined
): { canPurchase: boolean; reason?: string } {
  // Private dealer always available
  if (supplier.id === 'PRIVATE') {
    return { canPurchase: true };
  }

  if (!supplierCountry) {
    return { canPurchase: false, reason: 'Supplier country not found' };
  }

  // Check relationship threshold
  const relation = buyer.relations[supplier.countryId] ?? 0;
  if (relation < supplier.relationshipThreshold) {
    return {
      canPurchase: false,
      reason: `Relations with ${supplier.name} too low (${relation} < ${supplier.relationshipThreshold})`
    };
  }

  // Check human rights (stability as proxy)
  if (supplier.humanRightsSensitivity > 0) {
    // Low stability or insurgency = human rights concerns
    const hasHumanRightsConcerns = 
      buyer.stability < 30 || 
      (buyer.insurgencyLevel && buyer.insurgencyLevel !== 'NONE');
    
    if (hasHumanRightsConcerns && supplier.humanRightsSensitivity > 50) {
      return {
        canPurchase: false,
        reason: `${supplier.name} refuses sale due to human rights concerns`
      };
    }
  }

  // Check if buyer is at war with supplier's allies
  for (const allyId of supplierCountry.alliances) {
    if (buyer.atWarWith.includes(allyId)) {
      return {
        canPurchase: false,
        reason: `${supplier.name} refuses sale - you are at war with their ally`
      };
    }
  }

  return { canPurchase: true };
}

export function calculatePurchaseCost(
  supplier: ArmsSupplier,
  unitType: string,
  quantity: number,
  tier: number = 1
): number {
  const baseCost = UNIT_BASE_COSTS[unitType] ?? 50;
  const tierMultiplier = 1 + (tier - 1) * 0.5; // Tier 2 = 1.5x, Tier 3 = 2x
  const discountMultiplier = 1 - (supplier.discount / 100);
  
  return Math.floor(baseCost * quantity * tierMultiplier * discountMultiplier);
}

export function getAvailableSuppliers(
  buyer: CountryState,
  countries: CountryState[]
): Array<{ supplier: ArmsSupplier; available: boolean; reason?: string }> {
  return ARMS_SUPPLIERS.map(supplier => {
    const supplierCountry = countries.find(c => c.id === supplier.countryId);
    const { canPurchase, reason } = canPurchaseFrom(buyer, supplier, supplierCountry);
    return {
      supplier,
      available: canPurchase,
      reason
    };
  });
}

export interface EmbargoStatus {
  isEmbargoed: boolean;
  reason?: string;
  embargoedBy: string[];
}

export function checkEmbargo(
  buyer: CountryState,
  suppliers: ArmsSupplier[],
  countries: CountryState[]
): EmbargoStatus {
  const embargoedBy: string[] = [];
  
  for (const supplier of suppliers) {
    if (supplier.id === 'PRIVATE') continue;
    
    const supplierCountry = countries.find(c => c.id === supplier.countryId);
    if (!supplierCountry) continue;
    
    const { canPurchase, reason } = canPurchaseFrom(buyer, supplier, supplierCountry);
    if (!canPurchase && reason?.includes('human rights')) {
      embargoedBy.push(supplier.name);
    }
  }
  
  return {
    isEmbargoed: embargoedBy.length > 0,
    reason: embargoedBy.length > 0 
      ? `Arms embargo by: ${embargoedBy.join(', ')}`
      : undefined,
    embargoedBy
  };
}
