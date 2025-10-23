# Checkout/Cart Response Types Documentation

This document explains the comprehensive TypeScript types for the Blinkit cart/checkout response structure.

## Overview

The `checkout.ts` file contains all TypeScript interfaces and types for the complete Blinkit cart checkout flow, including:
- Product data
- Serviceability and ETA calculations
- Bill details and pricing
- Shipment information
- Widget configurations
- User and cart metadata

## Main Type

### `CheckoutCartResponse`

The root type that represents the entire cart checkout response from Blinkit API.

```typescript
import { CheckoutCartResponse } from '@/types/checkout';

const cartResponse: CheckoutCartResponse = {
  cart_type: 'product',
  cart_id: 1849892164,
  cart_state: 'valid',
  objects: [...], // UI widgets
  cart_data: {...}, // Main cart data
  // ...
};
```

## Key Type Categories

### 1. **Common Types**
Base types used throughout the response:
- `ColorData` - Color specifications (type, tint)
- `FontData` - Font specifications (size, weight)
- `TextData` - Text with styling
- `ImageData` - Image specifications
- `IdentityData` - Unique identifiers
- `LayoutConfig` - UI layout configurations

### 2. **Product Types**
Types related to products in the cart:
- `CartProduct` - Complete product information
- `ShipmentItem` - Extended product data for shipments
- `ProductCategory` - Product category information
- `RelatedBrand` - Brand details
- `ReturnProductConfig` - Return/exchange eligibility

### 3. **Serviceability Types**
ETA and delivery serviceability:
- `Serviceability` - Complete serviceability data
- `SlotDetails` - Delivery slot information
- `ETAComponent` - ETA calculation components
- `SurgeChargeV2` - Surge pricing details
- `FleetServiceability` - Fleet availability
- `EntityServiceability` - Service type availability

### 4. **Bill & Pricing Types**
Billing and price breakdown:
- `BillDetails` - Complete bill summary
- `FlatDeliveryChargeAttributes` - Delivery charge rules
- `AdditionalCharge` - Extra charges (tips, donations, etc.)

### 5. **Shipment Types**
Shipment and delivery information:
- `Shipment` - Complete shipment details
- `ServiceabilityStatus` - Shipment status

### 6. **Widget Types**
UI components for the checkout page:
- `ShipmentWidget` - Shipment display widget
- `ProductWidget` - Product card widget
- `CouponWidget` - Coupon selection widget
- `BillDetailsWidget` - Bill breakdown widget
- `FeedingIndiaWidget` - Donation widget
- `TipWidget` - Delivery tip widget
- `CancellationPolicyWidget` - Cancellation terms
- `AddressCheckoutWidget` - Address and checkout CTA
- `CartWidget` - Union type of all widgets

### 7. **Cart Data Types**
Core cart information:
- `CartData` - Complete cart state
- `MerchantStatus` - Merchant serviceability
- `KarmaInfo` - User karma/priority
- `UserDetails` - User information
- `WalletDetails` - Wallet balance
- `GiftingDetails` - Gift wrapping options
- `DeliveryInstructions` - Delivery preferences

### 8. **Template Types**
UI template configurations:
- `ProductTemplate` - Product card templates
- `PillTemplate` - Pill button templates
- `TemplateMap` - All template configurations

### 9. **Metadata Types**
Additional metadata:
- `PageMeta` - Page tracking and analytics
- `PromoData` - Promotion/coupon data
- `Subscribers` - Event subscribers for cart updates

### 10. **Utility Types**
Simplified types for OneCart internal use:
- `CheckoutItem` - Simplified product item
- `CheckoutSummary` - Simplified checkout summary

## Usage Examples

### Example 1: Parse Complete Response

```typescript
import { CheckoutCartResponse } from '@/types';

async function fetchCheckoutData(): Promise<CheckoutCartResponse> {
  const response = await fetch('/api/cart/checkout');
  const data: CheckoutCartResponse = await response.json();
  return data;
}
```

### Example 2: Extract Bill Details

```typescript
import { BillDetails } from '@/types';

function calculateTotal(cartResponse: CheckoutCartResponse): BillDetails {
  return cartResponse.cart_data.bill_details;
}

// Usage
const billDetails = calculateTotal(cartResponse);
console.log(`Total: ₹${billDetails.bill_total}`);
console.log(`Delivery: ₹${billDetails.delivery_charge}`);
console.log(`Discount: ₹${billDetails.product_discount}`);
```

### Example 3: Get Product List

```typescript
import { CartProduct } from '@/types';

function getCartProducts(cartResponse: CheckoutCartResponse): CartProduct[] {
  return cartResponse.cart_data.items;
}

// Usage
const products = getCartProducts(cartResponse);
products.forEach(product => {
  console.log(`${product.name} - Qty: ${product.quantity} - ₹${product.price}`);
});
```

### Example 4: Extract Delivery ETA

```typescript
import { SlotDetails } from '@/types';

function getDeliveryETA(cartResponse: CheckoutCartResponse): number {
  const shipment = cartResponse.cart_data.shipments[0];
  return shipment?.slot_details?.serviceability?.eta || 0;
}

// Usage
const etaMinutes = getDeliveryETA(cartResponse);
console.log(`Delivery in ${etaMinutes} minutes`);
```

### Example 5: Create Simplified Summary

```typescript
import { CheckoutSummary, CheckoutItem } from '@/types';

function createCheckoutSummary(
  cartResponse: CheckoutCartResponse
): CheckoutSummary {
  const { bill_details, items, shipments } = cartResponse.cart_data;
  
  const checkoutItems: CheckoutItem[] = items.map(item => ({
    product_id: item.product_id,
    name: item.name,
    quantity: item.quantity,
    price: item.price,
    mrp: item.mrp,
    image_url: item.image_url,
    brand: item.brand,
    unit: item.unit,
  }));

  return {
    items: checkoutItems,
    total_items: bill_details.total_items,
    subtotal: bill_details.total_cost,
    delivery_charge: bill_details.delivery_charge || 0,
    surge_charge: bill_details.surge_charge_v2?.surge_amount || 0,
    handling_charge: bill_details.additional_charge || 0,
    total_discount: bill_details.product_discount,
    grand_total: bill_details.bill_total,
    eta_minutes: shipments[0]?.slot_details?.serviceability?.eta || 0,
    delivery_address: 'Address from cart', // Extract from address data
  };
}
```

### Example 6: Handle Widget Rendering

```typescript
import { CartWidget } from '@/types';

function renderWidgets(cartResponse: CheckoutCartResponse) {
  cartResponse.objects.forEach((widget: CartWidget) => {
    switch (widget.type) {
      case 114: // Shipment Widget
        console.log('Render shipment widget');
        break;
      case 123: // Product Widget
        console.log('Render product widget');
        break;
      case 118: // Bill Details Widget
        console.log('Render bill details widget');
        break;
      case 115: // Address Checkout Widget
        console.log('Render checkout button');
        break;
      // Handle other widget types
    }
  });
}
```

## Type Safety Benefits

1. **Autocomplete**: Get intelligent code completion in your IDE
2. **Type Checking**: Catch errors at compile time
3. **Documentation**: Types serve as inline documentation
4. **Refactoring**: Safe refactoring with TypeScript compiler help
5. **API Contract**: Ensures frontend matches backend response structure

## Widget Type Numbers

For reference, here are the widget type numbers:
- `114` - Shipment Widget (delivery time, items count)
- `123` - Product Widget (individual product card)
- `168` - Coupon Widget (apply coupons)
- `118` - Bill Details Widget (price breakdown)
- `275` - Feeding India Widget (donation)
- `121` - Tip Widget (delivery partner tip)
- `214` - Cancellation Policy Widget
- `115` - Address Checkout Widget (proceed to checkout)

## Notes

1. **Any Types**: Some fields use `any` where the exact structure varies or isn't critical. Update these as needed.

2. **Optional Fields**: Many fields are optional (`?`) as they may not be present in all responses.

3. **Union Types**: Some types like `CartWidget` are unions to represent different widget variants.

4. **Backwards Compatibility**: Types are designed to match the exact Blinkit API response structure.

## Integration with OneCart

Use `CheckoutItem` and `CheckoutSummary` utility types to simplify the complex Blinkit response for OneCart's internal use:

```typescript
// Convert complex Blinkit response to simplified OneCart format
const summary = createCheckoutSummary(blinkitResponse);

// Use in your checkout page
<CheckoutPage summary={summary} />
```

## Future Enhancements

- Add validation schemas (Zod/Yup) for runtime validation
- Create type guards for widget type discrimination
- Add helper functions for common data transformations
- Document all widget types with examples

