// ETHEREAL Pricing Configuration - Stripe Price IDs
export const ETHEREAL_PRICING = {
  // Solo Plans
  solo_free: {
    priceId: null,
    productId: null,
    name: 'Solo Free',
    price: 0,
    type: 'solo' as const,
  },
  solo_pro: {
    priceId: 'price_1SlOxfCwDxrP8HLxoHs7bui3',
    productId: 'prod_Tiqe9znV1MdNCB',
    name: 'Solo Pro',
    price: 29,
    type: 'solo' as const,
  },
  solo_ultimate: {
    priceId: 'price_1SlOxhCwDxrP8HLxuuLdXFWe',
    productId: 'prod_TiqfFo6TscA7ag',
    name: 'Solo Ultimate',
    price: 59,
    type: 'solo' as const,
  },
  
  // Studio Plans
  studio_basic: {
    priceId: 'price_1SlOxjCwDxrP8HLxDFr0l1iE',
    productId: 'prod_TiqfDhztQBaBIE',
    name: 'Studio Basic',
    price: 49,
    includedSeats: 3,
    pricePerSeat: 15,
    type: 'studio' as const,
  },
  studio_pro: {
    priceId: 'price_1SlOxkCwDxrP8HLxdx1Sxure',
    productId: 'prod_Tiqff2dusVTLVw',
    name: 'Studio Pro',
    price: 99,
    includedSeats: 5,
    pricePerSeat: 12,
    type: 'studio' as const,
  },
  studio_ultimate: {
    priceId: 'price_1SlOxmCwDxrP8HLxBcDL7dr9',
    productId: 'prod_Tiqf28AUJiq3eg',
    name: 'Studio Ultimate',
    price: 199,
    includedSeats: 10,
    pricePerSeat: 10,
    type: 'studio' as const,
  },
  
  // Add-ons
  extra_seat: {
    priceId: 'price_1SlOxoCwDxrP8HLxHoNVHAJf',
    productId: 'prod_TiqfA57pjPcSqz',
    name: 'Extra Seat',
    price: 15,
  },
  growth_addon: {
    priceId: 'price_1SlOxqCwDxrP8HLxABf50aRg',
    productId: 'prod_Tiqf0tHk3sXS1M',
    name: 'Growth Suite',
    price: 39,
  },
  ai_center_addon: {
    priceId: 'price_1SlOxrCwDxrP8HLxhQ9bxBTc',
    productId: 'prod_TiqfCj1Typabx5',
    name: 'AI Center',
    price: 49,
  },
} as const;

export type PlanKey = keyof typeof ETHEREAL_PRICING;

export const getPlanByProductId = (productId: string) => {
  return Object.entries(ETHEREAL_PRICING).find(
    ([, plan]) => plan.productId === productId
  );
};
