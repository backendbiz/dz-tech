# PayPal JavaScript SDK — Complete Knowledge Base

> **SDK Version:** v5 (CardFields)  
> **Last updated:** Feb 4th  
> ⚠️ Covers **v5 with CardFields**. For legacy HostedFields (v1), see PayPal's archived reference.

---

## Table of Contents

1. [Overview & Quick Start](#overview)
2. [Setup & Loading](#setup--loading-the-sdk)
3. [Query Parameters](#query-parameters-reference)
4. [Script Parameters](#script-parameters-reference)
5. [Buttons](#buttons)
6. [Card Fields](#card-fields)
7. [Marks](#marks)
8. [Funding Eligibility & Sources](#funding-eligibility--funding-sources)
9. [Messages (Pay Later)](#messages-pay-later)
10. [Performance Optimization](#performance-optimization)
11. [Security: CSP & COOP](#security-csp--coop)
12. [Quick Reference Cheatsheet](#quick-reference-cheatsheet)

---

# PayPal JavaScript SDK — Knowledge Base

> **Version:** SDK v5 (CardFields component)
> **Last updated:** Feb 4th
> ⚠️ This documentation covers **v5 with CardFields**. For the legacy HostedFields (v1), see PayPal's archived reference.

---

## What is the JavaScript SDK?

The PayPal JavaScript SDK renders PayPal-supported payment methods on your page, giving buyers a personalized and streamlined checkout experience. It handles:

- PayPal wallet button (including Pay Later, Venmo, and alternative payment methods)
- Payment method icons (`marks`) for radio-button style selection
- Hosted credit/debit card fields (`card-fields`) — PCI-compliant, PayPal-hosted inputs
- Funding eligibility checks

---

## Documentation Index

| File | Contents |
|------|----------|
| [01-setup-and-loading.md](./01-setup-and-loading.md) | Adding the SDK, script tag vs module, performance |
| [02-query-parameters.md](./02-query-parameters.md) | All URL query parameters with examples |
| [03-script-parameters.md](./03-script-parameters.md) | All `data-*` script tag attributes |
| [04-buttons.md](./04-buttons.md) | PayPal Buttons — full API, style, callbacks |
| [05-card-fields.md](./05-card-fields.md) | Card Fields — hosted card inputs, methods, events |
| [06-marks.md](./06-marks.md) | Marks — radio-button style payment icons |
| [07-funding.md](./07-funding.md) | Funding sources, eligibility, constants |
| [08-messages.md](./08-messages.md) | Pay Later messaging component |
| [09-performance.md](./09-performance.md) | Loading optimization, instant vs delayed render |
| [10-security-csp.md](./10-security-csp.md) | Content Security Policy + COOP headers |

---

## Quick Start (Next.js / React)

```bash
npm install @paypal/react-paypal-js
```

```tsx
// Wrap your app or checkout page
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

<PayPalScriptProvider options={{ clientId: "YOUR_CLIENT_ID", currency: "USD" }}>
  <PayPalButtons
    createOrder={async () => {
      const res = await fetch("/api/paypal/create-order", { method: "POST" });
      const { id } = await res.json();
      return id;
    }}
    onApprove={async (data) => {
      await fetch("/api/paypal/capture", {
        method: "POST",
        body: JSON.stringify({ orderID: data.orderID }),
      });
    }}
  />
</PayPalScriptProvider>
```

---

## Key Rules to Remember

- ✅ Always load the SDK from `https://www.paypal.com/sdk/js` — never self-host or bundle it
- ✅ Match `intent` in both the SDK script URL and your Orders API call
- ✅ Match `commit` in both the SDK script URL and your Orders API call
- ✅ Always capture payments server-side — never trust only the frontend callback
- ✅ Verify webhook signatures before updating your database
- ⚠️ `buyer-country` is sandbox only — never pass it in production
- ⚠️ `disable-funding` should not be used to disable card fields

---

# 01 — Setup & Loading the SDK

---

## Two Ways to Add the SDK

### Option A: Script Tag (Vanilla JS / SSR pages)

```html
<script src="https://www.paypal.com/sdk/js?client-id=YOUR_CLIENT_ID"></script>
```

This loads the global `paypal` object into `window`. Replace `YOUR_CLIENT_ID` with your actual client ID from the Developer Dashboard.

> ⚠️ **Critical:** Always load from `https://www.paypal.com/sdk/js`. Never bundle, copy, or self-host the script. See [09-performance.md](./09-performance.md) for why.

---

### Option B: Module (Recommended for React / Next.js)

**Using `paypal-js` (framework-agnostic):**

```bash
npm install @paypal/paypal-js
```

```js
import { loadScript } from "@paypal/paypal-js";

loadScript({ "client-id": "YOUR_CLIENT_ID" })
  .then((paypal) => {
    // SDK is ready — render buttons, card fields, etc.
  })
  .catch((err) => {
    console.error("Failed to load PayPal SDK:", err);
  });
```

**Using `react-paypal-js` (React / Next.js — recommended):**

```bash
npm install @paypal/react-paypal-js
```

```tsx
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

export default function Checkout() {
  return (
    <PayPalScriptProvider options={{ clientId: "YOUR_CLIENT_ID" }}>
      <PayPalButtons />
    </PayPalScriptProvider>
  );
}
```

> The React package wraps `paypal-js` and provides `PayPalScriptProvider`, `PayPalButtons`, `PayPalMarks`, `PayPalMessages`, and `PayPalCardFieldsProvider` as ready-to-use components.

---

## Selecting Components

Pass a `components` query parameter to load only what you need. This keeps the script lean.

```html
<!-- Buttons only (default — no need to pass) -->
<script src="https://www.paypal.com/sdk/js?client-id=YOUR_CLIENT_ID"></script>

<!-- Buttons + Card Fields -->
<script src="https://www.paypal.com/sdk/js?client-id=YOUR_CLIENT_ID&components=buttons,card-fields"></script>

<!-- Buttons + Marks + Messages -->
<script src="https://www.paypal.com/sdk/js?client-id=YOUR_CLIENT_ID&components=buttons,marks,messages"></script>
```

| Component | Description |
|-----------|-------------|
| `buttons` | All eligible PayPal checkout buttons (default) |
| `marks` | Payment method icons for radio-button UI |
| `card-fields` | Hosted credit/debit card input fields |
| `funding-eligibility` | Check if a payment method is available |
| `messages` | Pay Later messaging |

---

## Script Tag with Multiple Parameters

```html
<script
  src="https://www.paypal.com/sdk/js?client-id=YOUR_CLIENT_ID&currency=USD&components=buttons,card-fields"
  data-client-token="abc123xyz=="
  data-page-type="checkout"
></script>
```

Parameters split into two types:
- **Query parameters** — go in the `src` URL (`?key=value&key=value`)
- **Script parameters** — go as `data-*` attributes on the `<script>` tag

See [02-query-parameters.md](./02-query-parameters.md) and [03-script-parameters.md](./03-script-parameters.md) for the full list.

---

# 02 — Query Parameters Reference

Query parameters go in the `src` URL of the SDK script tag:

```html
<script src="https://www.paypal.com/sdk/js?client-id=YOUR_CLIENT_ID&currency=USD&intent=capture"></script>
```

---

## `client-id` ✅ Required

Identifies your PayPal account. All transactions are settled into this account by default.

```html
<script src="https://www.paypal.com/sdk/js?client-id=YOUR_CLIENT_ID"></script>
```

- In sandbox, you can use `client-id=sb` as a shortcut for testing
- For partner/marketplace integrations, also pass `merchant-id`

---

## `currency`

The transaction currency. Funds are captured in this currency.

```html
<script src="https://www.paypal.com/sdk/js?client-id=YOUR_CLIENT_ID&currency=EUR"></script>
```

**Default:** `USD`

| Currency | Code | Currency | Code |
|----------|------|----------|------|
| US Dollar | `USD` | Euro | `EUR` |
| British Pound | `GBP` | Canadian Dollar | `CAD` |
| Australian Dollar | `AUD` | Japanese Yen | `JPY` |
| Swiss Franc | `CHF` | Hong Kong Dollar | `HKD` |
| Singapore Dollar | `SGD` | Brazilian Real | `BRL` |
| Mexican Peso | `MXN` | Norwegian Krone | `NOK` |
| Swedish Krona | `SEK` | Danish Krone | `DKK` |
| New Zealand Dollar | `NZD` | Philippine Peso | `PHP` |
| Thai Baht | `THB` | Polish Złoty | `PLN` |

---

## `intent`

Controls when funds are captured. **Must match the `intent` in your Orders API call.**

```html
<script src="https://www.paypal.com/sdk/js?client-id=YOUR_CLIENT_ID&intent=capture"></script>
```

**Default:** `capture`

| Value | Description |
|-------|-------------|
| `capture` | Funds captured immediately while buyer is on the page |
| `authorize` | Funds authorized now, captured separately later (up to 29 days) |
| `subscription` | Used with `vault=true` for subscription transactions |
| `tokenize` | Used with `vault=true` and `createBillingAgreement` for billing without purchase |

> ⚠️ `authorize` is not supported when you have more than 1 `purchase_unit` in your order.

---

## `commit`

Controls the button label in the PayPal checkout flow. **Must match the `commit` value in your API call.**

```html
<script src="https://www.paypal.com/sdk/js?client-id=YOUR_CLIENT_ID&commit=false"></script>
```

**Default:** `true`

| Value | Button shown | Use when |
|-------|-------------|----------|
| `true` | **Pay Now** | Amount is final — no changes after buyer returns |
| `false` | **Continue** | Amount may change (shipping, tax) after buyer returns |

---

## `components`

Comma-separated list of SDK components to load. Omitting this loads only `buttons`.

```html
<script src="https://www.paypal.com/sdk/js?client-id=YOUR_CLIENT_ID&components=buttons,card-fields,messages"></script>
```

| Value | Loads |
|-------|-------|
| `buttons` | PayPal checkout buttons |
| `marks` | Payment method radio icons |
| `card-fields` | Hosted card input fields |
| `funding-eligibility` | Funding eligibility check API |
| `messages` | Pay Later messaging |
| `hosted-fields` | Legacy hosted fields (deprecated — use `card-fields`) |
| `applepay` | Apple Pay button |

---

## `enable-funding`

Force specific funding sources to show, even if they wouldn't show by default.

```html
<script src="https://www.paypal.com/sdk/js?client-id=YOUR_CLIENT_ID&enable-funding=venmo,paylater"></script>
```

| Value | Payment Method |
|-------|---------------|
| `venmo` | Venmo (US mobile) |
| `paylater` | Pay Later / Pay in 4 |
| `card` | Credit or debit cards |
| `credit` | PayPal Credit (US, UK) |
| `ideal` | iDEAL |
| `bancontact` | Bancontact |
| `sepa` | SEPA-Lastschrift |
| `p24` | Przelewy24 |
| `blik` | BLIK |
| `eps` | eps |
| `mybank` | MyBank |
| `mercadopago` | Mercado Pago |

---

## `disable-funding`

Prevent specific funding sources from showing.

```html
<script src="https://www.paypal.com/sdk/js?client-id=YOUR_CLIENT_ID&disable-funding=credit,venmo"></script>
```

> ⚠️ Do **not** use `disable-funding=card` to disable card fields. Card Fields are managed separately via the `card-fields` component.

> Pass `credit` in `disable-funding` for real-money gaming merchants or non-US merchants without proper licensing.

---

## `vault`

Show only payment methods that support saving for future use (subscriptions, recurring billing).

```html
<script src="https://www.paypal.com/sdk/js?client-id=YOUR_CLIENT_ID&vault=true"></script>
```

**Default:** `false`

| Value | Behaviour |
|-------|-----------|
| `true` | Show only vaultable payment methods |
| `false` | Show all eligible payment methods |

---

## `buyer-country`

Override the buyer's detected country for testing in sandbox.

```html
<!-- Sandbox only -->
<script src="https://www.paypal.com/sdk/js?client-id=YOUR_CLIENT_ID&buyer-country=US"></script>
```

> ⚠️ **Never pass `buyer-country` in production.** Sandbox only.

---

## `locale`

Force a specific language for the PayPal UI. PayPal auto-detects the correct locale by default — only override if you need the buttons to match your site's language.

```html
<script src="https://www.paypal.com/sdk/js?client-id=YOUR_CLIENT_ID&locale=fr_FR"></script>
```

**Examples:** `en_US`, `fr_FR`, `de_DE`, `es_ES`, `ja_JP`, `pt_BR`, `zh_CN`

---

## `debug`

Enable verbose logging. Only for development — increases script size and hurts performance.

```html
<script src="https://www.paypal.com/sdk/js?client-id=YOUR_CLIENT_ID&debug=true"></script>
```

**Default:** `false`

---

## `merchant-id`

For partner, marketplace, or cart integrations where you're facilitating payments on behalf of another merchant.

```html
<script src="https://www.paypal.com/sdk/js?client-id=YOUR_CLIENT_ID&merchant-id=MERCHANT_PAYPAL_ID"></script>
```

> ⚠️ PayPal **email addresses** are deprecated as merchant IDs. Use the **PayPal Merchant ID** found under Account → Business Information.

| Integration Type | client-id | merchant-id |
|-----------------|-----------|-------------|
| Standalone (your own account) | Your client ID | Omit — auto-derived |
| Partner / Marketplace | Your platform client ID | Merchant's PayPal ID |
| Cart (merchant's own client ID) | Merchant's client ID | Omit — pass `integration-date` instead |

---

## `integration-date`

Pins your integration to a specific date for backwards compatibility. Required if `client-id` changes dynamically (e.g. cart platforms where each merchant has their own client ID).

```html
<script src="https://www.paypal.com/sdk/js?client-id=YOUR_CLIENT_ID&integration-date=2024-01-15"></script>
```

**Format:** `YYYY-MM-DD`

- Your site gets all backward-compatible updates automatically
- Your site is protected from breaking changes made after this date
- You don't need to update this date to get new features

---

# 03 — Script Parameters Reference

Script parameters are `data-*` attributes added directly to the `<script>` tag (not in the URL).

```html
<script
  src="https://www.paypal.com/sdk/js?client-id=YOUR_CLIENT_ID"
  data-client-token="abc123xyz=="
  data-page-type="checkout"
  data-csp-nonce="YOUR_NONCE"
></script>
```

---

## `data-client-token`

Identifies your buyer. Used for vaulting and buyer-specific personalization.

```html
<script
  src="https://sandbox.paypal.com/sdk/js?client-id=YOUR_CLIENT_ID"
  data-client-token="abc123xyz=="
></script>
```

Generate a client token server-side via the PayPal Identity API and pass it here.

---

## `data-csp-nonce`

Pass your Content Security Policy single-use nonce if your site uses CSP headers.

```html
<script
  src="https://www.paypal.com/sdk/js?client-id=YOUR_CLIENT_ID"
  data-csp-nonce="YOUR_NONCE"
  nonce="YOUR_NONCE"
></script>
```

> The `nonce` attribute must also be added to the `<script>` tag itself alongside `data-csp-nonce`. See [10-security-csp.md](./10-security-csp.md) for full CSP setup.

---

## `data-page-type`

Logs the type of page where the SDK loads, used for analytics and interaction tracking.

```html
<script
  src="https://www.paypal.com/sdk/js?client-id=YOUR_CLIENT_ID"
  data-page-type="checkout"
></script>
```

| Value | Page |
|-------|------|
| `product-listing` | Product list / catalog page |
| `search-results` | Search results page |
| `product-details` | Individual product page |
| `mini-cart` | Mini cart / cart preview |
| `cart` | Full cart page |
| `checkout` | Checkout page |

---

## `data-partner-attribution-id`

Your BN (Build Notation) code for partner revenue attribution. Issued during the PayPal partner onboarding process.

```html
<script
  src="https://www.paypal.com/sdk/js?client-id=YOUR_CLIENT_ID"
  data-partner-attribution-id="YOUR_BN_CODE"
></script>
```

Find your BN code in: Developer Dashboard → My Apps & Credentials → your app → App Settings.

---

## `data-user-id-token`

Pass an OAuth 2.0 `id_token` from your server into the SDK. Used for buyer identification in advanced flows.

```html
<script
  src="https://sandbox.paypal.com/sdk/js?client-id=YOUR_CLIENT_ID"
  data-user-id-token="YOUR_ID_TOKEN"
></script>
```

Obtain the `id_token` by calling `/v1/oauth2/token` with `response_type=id_token` on your server.

---

# 04 — Buttons

The `buttons` component renders all eligible PayPal payment buttons in one place. It handles the entire checkout flow — opening the PayPal window, buyer login, and approval.

```html
<script src="https://www.paypal.com/sdk/js?client-id=YOUR_CLIENT_ID&components=buttons"></script>
```

---

## Basic Usage

```html
<div id="paypal-button-container"></div>

<script>
  paypal.Buttons({
    async createOrder() {
      const res = await fetch("/api/paypal/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: "49.99" }),
      });
      const order = await res.json();
      return order.id; // Return order ID to the SDK
    },
    async onApprove(data) {
      const res = await fetch("/api/paypal/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderID: data.orderID }),
      });
      const details = await res.json();
      alert(`Payment complete! Hi ${details.payer.name.given_name}`);
    },
  }).render("#paypal-button-container");
</script>
```

---

## `paypal.Buttons(options)`

### Full Options Reference

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `createOrder` | `async function` | Yes (for purchases) | Sets up the order. Return the order ID. |
| `createSubscription` | `function` | Yes (for subscriptions) | Creates a subscription. Return subscription ID. |
| `onApprove` | `async function` | Yes | Called after buyer approves. Capture funds here. |
| `onCancel` | `function` | No | Called when buyer cancels. |
| `onError` | `function` | No | Called on unrecoverable errors. |
| `onInit` | `function` | No | Called when button first renders. Use for validation. |
| `onClick` | `function` | No | Called when button is clicked. |
| `onShippingAddressChange` | `function` | No | Called when buyer changes shipping address. |
| `onShippingOptionsChange` | `function` | No | Called when buyer changes shipping method. |
| `style` | `object` | No | Visual customization. |
| `message` | `object` | No | Pay Later message config. |
| `displayOnly` | `array` | No | Filter which payment methods are shown. |
| `fundingSource` | `string` | No | For standalone single-button rendering. |

---

## `style` Options

```js
paypal.Buttons({
  style: {
    layout: "vertical",
    color: "gold",
    shape: "rect",
    label: "pay",
    height: 45,
    tagline: false,
  },
}).render("#paypal-button-container");
```

### `layout`

| Value | Description |
|-------|-------------|
| `vertical` | **Default.** Stacked vertically, max 6 buttons. Best for checkout pages. |
| `horizontal` | Side by side, max 2 buttons. Best for product pages with limited space. |

### `color`

| Value | Notes |
|-------|-------|
| `gold` | **Recommended.** Highest conversion. |
| `blue` | First alternative. |
| `silver` | Second alternative. |
| `white` | Second alternative. |
| `black` | Second alternative. |

### `shape`

| Value | Description |
|-------|-------------|
| `rect` | **Default.** Standard rounded rectangle. |
| `pill` | Fully rounded sides. |
| `sharp` | Sharp square corners. |

### `borderRadius`

Custom border radius as a number (≥ 0). Overrides `shape` when both are set.

```js
style: { borderRadius: 8 }
```

### `label`

| Value | Button shows |
|-------|-------------|
| `paypal` | **Default.** PayPal logo only. |
| `checkout` | "Checkout" text |
| `buynow` | "Buy Now" |
| `pay` | "Pay with PayPal" |
| `installment` | Installment button (MX and BR only) |

### `height`

Number from `25` to `55`. Default max is 55px. To exceed this limit:

```js
style: {
  disableMaxHeight: true, // Remove the 55px cap
  // Do NOT set height when using disableMaxHeight
}
// Then control height via the container element CSS
```

### `tagline`

```js
style: { tagline: false } // Hide the "Two easy ways to pay" tagline
// Note: tagline only works with layout: "horizontal"
```

---

## `createOrder`

Called when buyer clicks the button. Must return a Promise that resolves to the order ID.

```js
async createOrder() {
  const res = await fetch("/api/paypal/create-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cart: [{ sku: "PRODUCT_SKU", quantity: "1" }],
    }),
  });
  const order = await res.json();
  return order.id;
}
```

**Server-side order creation (Node.js):**

```js
// POST /api/paypal/create-order
const order = await fetch("https://api-m.sandbox.paypal.com/v2/checkout/orders", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  },
  body: JSON.stringify({
    intent: "CAPTURE",
    purchase_units: [{
      amount: { currency_code: "USD", value: "49.99" },
    }],
    payment_source: {
      paypal: {
        experience_context: {
          brand_name: "My Store",
          user_action: "PAY_NOW",
          shipping_preference: "NO_SHIPPING",
          return_url: "https://example.com/success",
          cancel_url: "https://example.com/cancel",
        },
      },
    },
  }),
});
```

**`intent` values for Orders v2:**

| Value | Description |
|-------|-------------|
| `CAPTURE` | Capture immediately (default) |
| `AUTHORIZE` | Authorize now, capture later (up to 29 days) |

---

## `onApprove`

Called after the buyer approves the transaction on PayPal. **Always capture server-side.**

```js
async onApprove(data) {
  // data.orderID — the approved order ID
  const res = await fetch("/api/paypal/capture", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderID: data.orderID }),
  });
  const details = await res.json();
  // details.payer.name.given_name, details.status, etc.
  alert(`Payment complete! Thank you ${details.payer.name.given_name}`);
}
```

---

## `onCancel`

```js
onCancel(data) {
  // data.orderID
  window.location.assign("/cart"); // Return to cart
}
```

---

## `onError`

Catch-all for unrecoverable errors. Don't try to handle specific cases here — just show a generic message.

```js
onError(err) {
  console.error("PayPal error:", err);
  window.location.assign("/error");
}
```

---

## `onInit` and `onClick`

Use `onInit` to enable/disable the button based on form state. Use `onClick` to validate before launching checkout.

```js
paypal.Buttons({
  onInit(data, actions) {
    actions.disable(); // Start disabled

    document.querySelector("#terms-checkbox").addEventListener("change", (e) => {
      if (e.target.checked) {
        actions.enable();
      } else {
        actions.disable();
      }
    });
  },
  onClick() {
    if (!document.querySelector("#terms-checkbox").checked) {
      document.querySelector("#terms-error").style.display = "block";
    }
  },
}).render("#paypal-button-container");
```

---

## `onShippingAddressChange`

Called when the buyer changes their shipping address inside the PayPal popup.

```js
onShippingAddressChange(data, actions) {
  // data.shippingAddress: { city, state, countryCode, postalCode }
  // data.orderID

  if (data.shippingAddress.countryCode !== "US") {
    return actions.reject(data.errors.COUNTRY_ERROR);
  }
  // Otherwise, PATCH the order with updated shipping costs
}
```

**Error constants:**

| Value | Message shown to buyer |
|-------|----------------------|
| `data.errors.ADDRESS_ERROR` | "Your order can't be shipped to this address." |
| `data.errors.COUNTRY_ERROR` | "Your order can't be shipped to this country." |
| `data.errors.STATE_ERROR` | "Your order can't be shipped to this state." |
| `data.errors.ZIP_ERROR` | "Your order can't be shipped to this zip." |

> Not compatible with Subscriptions.

---

## `onShippingOptionsChange`

Called when the buyer selects a different shipping method.

```js
onShippingOptionsChange(data, actions) {
  // data.selectedShippingOption: { id, label, type, amount: { currencyCode, value } }

  if (data.selectedShippingOption.type === "PICKUP") {
    return actions.reject(data.errors.STORE_UNAVAILABLE);
  }
  // Otherwise, PATCH the order with updated total
}
```

**Error constants:**

| Value | Message shown to buyer |
|-------|----------------------|
| `data.errors.METHOD_UNAVAILABLE` | "The shipping method you selected is unavailable..." |
| `data.errors.STORE_UNAVAILABLE` | "Part of your order isn't available at this store." |

---

## `createSubscription`

For subscription / recurring billing flows. Requires `vault=true&intent=subscription` in the script URL.

```html
<script src="https://www.paypal.com/sdk/js?client-id=YOUR_CLIENT_ID&vault=true&intent=subscription"></script>
```

```js
paypal.Buttons({
  createSubscription(data, actions) {
    return actions.subscription.create({
      plan_id: "YOUR_PLAN_ID",
    });
  },
  onApprove(data) {
    alert(`Subscription created: ${data.subscriptionID}`);
  },
}).render("#paypal-button-container");
```

---

## `message` Option (Pay Later)

Show Pay Later messaging inline with the buttons. US merchants only.

```js
paypal.Buttons({
  message: {
    amount: 199,       // Current cart/product amount
    align: "center",   // "center" | "left" | "right"
    color: "black",    // "black" | "white"
    position: "bottom", // "top" | "bottom"
  },
}).render("#paypal-button-container");
```

---

## `displayOnly`

Filter which payment methods appear.

```js
paypal.Buttons({
  displayOnly: ["vaultable"], // Only show payment methods that can be saved
}).render("#paypal-button-container");
```

---

## Standalone Buttons (Single Funding Source)

Render individual buttons for specific payment methods.

```js
paypal.getFundingSources().forEach((fundingSource) => {
  const button = paypal.Buttons({ fundingSource });
  if (button.isEligible()) {
    button.render("#paypal-button-container");
  }
});
```

---

## Instance Methods

### `.render(container)`

Renders buttons into a CSS selector or DOM element.

```js
paypal.Buttons().render("#paypal-button-container");
```

### `.isEligible()`

Returns `true` if the button can render for the current buyer. Used with standalone buttons.

```js
const button = paypal.Buttons({ fundingSource: paypal.FUNDING.VENMO });
if (button.isEligible()) {
  button.render("#venmo-container");
}
```

---

# 05 — Card Fields

Card Fields renders PayPal-hosted credit and debit card inputs inside iframes on your page. PayPal handles all PCI compliance — you never touch raw card data.

```html
<script src="https://www.paypal.com/sdk/js?client-id=YOUR_CLIENT_ID&components=card-fields"></script>
```

---

## Overview

Card Fields gives you 4 individual hosted input fields:

| Field | Required | What it captures |
|-------|----------|-----------------|
| `NumberField` | ✅ Yes | Card number |
| `ExpiryField` | ✅ Yes | Expiration date |
| `CVVField` | ✅ Yes | CVV / CID / CVC |
| `NameField` | No | Cardholder name |

Each field renders inside its own iframe hosted by PayPal. You control the container and CSS on the outside; PayPal controls what's inside.

---

## Basic Setup

```html
<div id="card-name-field-container"></div>
<div id="card-number-field-container"></div>
<div id="card-expiry-field-container"></div>
<div id="card-cvv-field-container"></div>
<button id="pay-button">Pay Now</button>

<script>
  const cardField = paypal.CardFields({
    createOrder() {
      return fetch("/api/paypal/create-order", { method: "POST" })
        .then((res) => res.json())
        .then((data) => data.id); // Return order ID
    },
    onApprove(data) {
      return fetch("/api/paypal/capture", {
        method: "POST",
        body: JSON.stringify({ orderID: data.orderID }),
      })
        .then((res) => res.json())
        .then(() => {
          // Redirect to success page
          window.location.href = "/success";
        });
    },
    onError(err) {
      console.error("Card Fields error:", err);
    },
  });

  if (cardField.isEligible()) {
    cardField.NameField().render("#card-name-field-container");
    cardField.NumberField().render("#card-number-field-container");
    cardField.ExpiryField().render("#card-expiry-field-container");
    cardField.CVVField().render("#card-cvv-field-container");

    document.getElementById("pay-button").addEventListener("click", () => {
      cardField.submit().catch((err) => console.error(err));
    });
  }
</script>
```

---

## `paypal.CardFields(options)`

### Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `createOrder` | `function` | ✅ Yes | Called on submit. Return a Promise resolving to the order ID. |
| `onApprove` | `function` | ✅ Yes | Called when card is approved. Capture the order here. |
| `onError` | `function` | ✅ Yes | Called on errors during checkout. |
| `onCancel` | `function` | No | Called when buyer cancels 3D Secure verification. |
| `style` | `object` | No | CSS styles applied to all fields. |
| `inputEvents` | `object` | No | Event callbacks applied to all fields. |

---

## Styling Card Fields

Pass a `style` object to the parent `CardFields` instance to apply styles to all fields. Styles apply inside the iframe (to the input element).

```js
const cardField = paypal.CardFields({
  style: {
    input: {
      "font-size": "16px",
      "font-family": "system-ui, sans-serif",
      color: "#1e293b",
    },
    ".invalid": {
      color: "#ef4444",
    },
    ":focus": {
      outline: "none",
    },
    ":hover": {
      color: "#0070f3",
    },
    ".purple": {
      color: "purple", // Custom class you can add via addClass()
    },
  },
});
```

### Supported CSS Properties

Only these properties work inside card field iframes:

`appearance`, `color`, `direction`, `font`, `font-family`, `font-size`, `font-size-adjust`, `font-stretch`, `font-style`, `font-variant`, `font-variant-alternates`, `font-variant-caps`, `font-variant-east-asian`, `font-variant-ligatures`, `font-variant-numeric`, `font-weight`, `letter-spacing`, `line-height`, `opacity`, `outline`, `padding`, `padding-bottom`, `padding-left`, `padding-right`, `padding-top`, `text-shadow`, `transition`, `-moz-appearance`, `-moz-osx-font-smoothing`, `-moz-tap-highlight-color`, `-moz-transition`, `-webkit-appearance`, `-webkit-osx-font-smoothing`, `-webkit-tap-highlight-color`, `-webkit-transition`

> Any unsupported CSS property logs a warning in the browser console.

### Style Individual Fields

Override the parent style for a specific field:

```js
const nameField = cardField.NameField({
  style: {
    input: { color: "blue" },
    ".invalid": { color: "red" },
  },
});
```

---

## `inputEvents`

Callbacks for input events. Can be set on the parent (applies to all fields) or on individual fields (overrides parent).

```js
const cardField = paypal.CardFields({
  inputEvents: {
    onChange(data) {
      // data is a stateObject — see State Object section below
      console.log("Form valid:", data.isFormValid);
    },
    onFocus(data) {
      // A field gained focus
    },
    onBlur(data) {
      // A field lost focus
    },
    onInputSubmitRequest(data) {
      // Buyer pressed Enter/Return in a field
      if (data.isFormValid) {
        cardField.submit();
      }
    },
  },
});
```

---

## Parent Methods

### `cardField.isEligible()` → `boolean`

Check if Card Fields can render for the current buyer. Always check before rendering.

```js
if (cardField.isEligible()) {
  cardField.NumberField().render("#card-number-field-container");
  // ...
}
```

### `cardField.getState()` → `Promise<stateObject>`

Returns the current state of all fields, including validation status and card type.

```js
cardField.getState().then((state) => {
  if (state.isFormValid) {
    cardField.submit();
  } else {
    console.log("Errors:", state.errors);
  }
});
```

### `cardField.submit()` → `Promise`

Submits the card form. Triggers `createOrder` then `onApprove`.

```js
document.getElementById("pay-button").addEventListener("click", () => {
  cardField
    .submit()
    .then(() => console.log("Submitted successfully"))
    .catch((err) => console.error("Submit failed:", err));
});
```

---

## Individual Field Methods

Each field (`NumberField`, `ExpiryField`, `CVVField`, `NameField`) supports these methods:

| Method | Description |
|--------|-------------|
| `render(container)` | Render the field into a DOM element or CSS selector |
| `addClass(className)` | Add a CSS class to the field |
| `removeClass(className)` | Remove a CSS class from the field |
| `focus()` | Focus the field programmatically |
| `clear()` | Clear the field value |
| `setAttribute(attr, value)` | Set a supported attribute (`aria-invalid`, `aria-required`, `disabled`, `placeholder`) |
| `removeAttribute(attr)` | Remove a supported attribute |
| `setMessage(message)` | Set an accessibility message for screen readers |
| `close()` | Close/unmount the field |

```js
const numberField = cardField.NumberField();
numberField.render("#card-number-field-container");

// Later — add error styling
numberField.addClass("error");

// Or clear it
numberField.clear();
```

---

## State Object

All `inputEvents` callbacks and `getState()` return a state object:

```js
{
  cards: [
    {
      type: "visa",           // Machine-readable card type
      niceType: "Visa",       // Human-readable
      code: {
        name: "CVV",          // Security code name
        size: 3,              // Security code length
      },
    }
  ],
  emittedBy: "number",        // Which field triggered the event (not in getState())
  isFormValid: false,         // Is the entire form valid?
  errors: ["INVALID_CVV"],    // Array of current validation errors
  fields: {
    cardNumberField: {
      isFocused: true,
      isEmpty: false,
      isValid: false,
      isPotentiallyValid: true,
    },
    cardCvvField: {
      isFocused: false,
      isEmpty: true,
      isValid: false,
      isPotentiallyValid: true,
    },
    cardExpiryField: {
      isFocused: false,
      isEmpty: true,
      isValid: false,
      isPotentiallyValid: true,
    },
    cardNameField: {
      isFocused: false,
      isEmpty: true,
      isValid: false,
      isPotentiallyValid: true,
    },
  },
}
```

### Possible `errors` values

| Error | Meaning |
|-------|---------|
| `INELIGIBLE_CARD_VENDOR` | Card brand not accepted |
| `INVALID_NAME` | Name field invalid |
| `INVALID_NUMBER` | Card number invalid |
| `INVALID_EXPIRY` | Expiry date invalid |
| `INVALID_CVV` | CVV invalid |

---

## Validation Patterns

### Validate entire form on change

```js
const cardField = paypal.CardFields({
  inputEvents: {
    onChange(data) {
      const submitBtn = document.getElementById("pay-button");
      submitBtn.disabled = !data.isFormValid;
    },
  },
});
```

### Validate individual field

```js
const numberField = cardField.NumberField({
  inputEvents: {
    onChange(data) {
      const container = document.getElementById("card-number-field-container");
      container.className = data.fields.cardNumberField.isValid ? "valid" : "invalid";
    },
  },
});
```

### Validate before submit (getState pattern)

```js
document.getElementById("pay-button").addEventListener("click", async () => {
  const state = await cardField.getState();
  if (!state.isFormValid) {
    alert("Please fill in all card details correctly.");
    return;
  }
  cardField.submit().catch(console.error);
});
```

---

## `onCancel` (3D Secure)

If your integration uses 3D Secure verification, `onCancel` fires when the buyer closes the verification modal.

```js
const cardField = paypal.CardFields({
  onCancel() {
    console.log("Buyer cancelled 3D Secure verification");
    // Show a message or reset the form
  },
});
```

---

## Full HTML Example

```html
<html>
<head><title>Card Payment</title></head>
<body>
  <div id="checkout-form">
    <div id="card-name-field-container"></div>
    <div id="card-number-field-container"></div>
    <div id="card-expiry-field-container"></div>
    <div id="card-cvv-field-container"></div>
    <button id="pay-button" type="button">Pay Now</button>
  </div>

  <script src="https://www.paypal.com/sdk/js?client-id=YOUR_CLIENT_ID&components=card-fields"></script>
  <script>
    const cardField = paypal.CardFields({
      style: {
        input: { "font-size": "16px", color: "#333" },
        ".invalid": { color: "red" },
      },
      createOrder() {
        return fetch("/api/paypal/create-order", { method: "POST" })
          .then(r => r.json()).then(d => d.id);
      },
      onApprove(data) {
        return fetch("/api/paypal/capture", {
          method: "POST",
          body: JSON.stringify({ orderID: data.orderID }),
        }).then(() => { window.location.href = "/success"; });
      },
      onError(err) { console.error(err); },
    });

    if (cardField.isEligible()) {
      cardField.NameField().render("#card-name-field-container");
      cardField.NumberField().render("#card-number-field-container");
      cardField.ExpiryField().render("#card-expiry-field-container");
      cardField.CVVField().render("#card-cvv-field-container");

      document.getElementById("pay-button").addEventListener("click", () => {
        cardField.submit().catch(console.error);
      });
    }
  </script>
</body>
</html>
```

---

# 06 — Marks

Marks renders payment method icons (logos) alongside radio buttons, letting buyers choose their preferred payment method before seeing the relevant button.

```html
<script src="https://www.paypal.com/sdk/js?client-id=YOUR_CLIENT_ID&components=buttons,marks"></script>
```

---

## When to use Marks

Use Marks when:
- You're presenting multiple payment options on the page (PayPal + cards + other methods)
- Buttons are shown conditionally after the buyer selects a radio option
- You want a "Choose payment method" UI pattern

---

## Full Example

```html
<!-- Radio options with Marks -->
<label>
  <input type="radio" name="payment" value="paypal" checked>
  <div id="paypal-mark-container"></div>
</label>

<label>
  <input type="radio" name="payment" value="card">
  Credit / Debit Card
</label>

<!-- PayPal buttons (shown when PayPal radio selected) -->
<div id="paypal-button-container"></div>

<!-- Your custom card form (shown when card radio selected) -->
<div id="card-form" style="display:none">
  <!-- Your card form here -->
</div>

<script>
  // Render the PayPal mark (logo)
  paypal.Marks().render("#paypal-mark-container");

  // Render the PayPal button
  paypal.Buttons({
    createOrder() { /* ... */ },
    onApprove(data) { /* ... */ },
  }).render("#paypal-button-container");

  // Toggle visible section based on radio selection
  document.querySelectorAll("input[name=payment]").forEach((radio) => {
    radio.addEventListener("change", (e) => {
      document.getElementById("paypal-button-container").style.display =
        e.target.value === "paypal" ? "block" : "none";
      document.getElementById("card-form").style.display =
        e.target.value === "card" ? "block" : "none";
    });
  });
</script>
```

---

## `paypal.Marks(options)`

### `paypal.Marks().isEligible()` → `boolean`

Check if a mark can render for the current buyer and funding source.

```js
// With funding-eligibility component loaded
paypal.getFundingSources().forEach((fundingSource) => {
  const mark = paypal.Marks({ fundingSource });
  if (mark.isEligible()) {
    mark.render(`#${fundingSource}-mark-container`);
  }
});
```

### `paypal.Marks().render(container)`

Renders the mark into the specified container.

```js
paypal.Marks().render("#paypal-marks-container");
```

---

# 07 — Funding Eligibility & Funding Sources

---

## Funding Sources Reference

All available funding source constants:

| Constant | Payment Method |
|----------|---------------|
| `paypal.FUNDING.PAYPAL` | PayPal wallet |
| `paypal.FUNDING.CARD` | Credit or debit cards |
| `paypal.FUNDING.CREDIT` | PayPal Credit (US, UK) |
| `paypal.FUNDING.VENMO` | Venmo (US) |
| `paypal.FUNDING.SEPA` | SEPA-Lastschrift |
| `paypal.FUNDING.BANCONTACT` | Bancontact |
| `paypal.FUNDING.EPS` | eps |
| `paypal.FUNDING.IDEAL` | iDEAL |
| `paypal.FUNDING.MERCADOPAGO` | Mercado Pago |
| `paypal.FUNDING.MYBANK` | MyBank |
| `paypal.FUNDING.P24` | Przelewy24 |
| `paypal.FUNDING.BLIK` | BLIK |

> ⚠️ `GIROPAY` was sunset June 30, 2024. `SOFORT` was sunset April 18, 2024. Do not use either.

---

## `paypal.getFundingSources()`

Returns an array of all available funding source strings for the current buyer. Use this to loop over and render standalone buttons or marks.

```html
<script src="https://www.paypal.com/sdk/js?client-id=YOUR_CLIENT_ID&components=buttons,funding-eligibility"></script>

<script>
  paypal.getFundingSources().forEach((fundingSource) => {
    const button = paypal.Buttons({ fundingSource });
    if (button.isEligible()) {
      const container = document.createElement("div");
      document.getElementById("payment-methods").appendChild(container);
      button.render(container);
    }
  });
</script>
```

---

## `paypal.isFundingEligible(fundingSource)` → `boolean`

Check if a specific funding source is available for the current buyer.

```js
if (paypal.isFundingEligible(paypal.FUNDING.VENMO)) {
  // Show Venmo option
}
```

---

## `paypal.rememberFunding(fundingSources)`

When a buyer saves a funding source, store it so it's available for future visits.

```js
paypal.rememberFunding([paypal.FUNDING.VENMO]);
```

---

## Standalone Buttons Pattern

Render individual buttons for each funding source, each in a different part of the page:

```js
// Render PayPal button in the header
const paypalBtn = paypal.Buttons({ fundingSource: paypal.FUNDING.PAYPAL });
if (paypalBtn.isEligible()) paypalBtn.render("#header-paypal");

// Render Venmo button in the mobile section
const venmoBtn = paypal.Buttons({ fundingSource: paypal.FUNDING.VENMO });
if (venmoBtn.isEligible()) venmoBtn.render("#mobile-venmo");
```

Each standalone button still uses the same eligibility logic — it simply won't render if the funding source isn't available for the current buyer.

---

# 08 — Messages (Pay Later)

The `messages` component shows Pay Later offers (Pay in 4, Pay Monthly, etc.) on product and cart pages to inform buyers before they reach checkout.

> **US merchants only.** Pay Later offers vary by country. Merchants must be eligible for Pay Later. Other PayPal value propositions may appear even if ineligible.

```html
<script src="https://www.paypal.com/sdk/js?client-id=YOUR_CLIENT_ID&components=messages"></script>
```

---

## Inline with Buttons (message option)

Show a message below/above the buttons directly via the `message` option on `paypal.Buttons()`:

```js
paypal.Buttons({
  message: {
    amount: 199,        // Current cart/product value
    align: "center",    // "center" | "left" | "right"
    color: "black",     // "black" | "white"
    position: "bottom", // "top" | "bottom"
  },
}).render("#paypal-button-container");
```

> Note: When the Debit/Credit Card button is present in your button stack, only `position: "top"` is supported.

### `amount` examples

| Amount | Message shown |
|--------|--------------|
| `undefined` | Generic message (no price breakdown) |
| `100` | Pay in 4 offer with weekly breakdown |
| `2000` | Pay Monthly offer with monthly breakdown |

---

## Standalone Messages Component

For showing Pay Later messaging on product pages, cart pages, etc. — separate from the checkout buttons.

```html
<div id="paypal-message-container"></div>

<script src="https://www.paypal.com/sdk/js?client-id=YOUR_CLIENT_ID&components=messages"></script>
<script>
  paypal.Messages({
    amount: 299,
    placement: "product",  // "product" | "cart" | "payment" | "home"
    style: {
      layout: "text",
      color: "black",
      ratio: "8x1",
    },
  }).render("#paypal-message-container");
</script>
```

For full Pay Later messaging options and country-specific examples, see PayPal's Pay Later Reference documentation.

---

# 09 — Performance Optimization

---

## Always Load from PayPal's Server

**Load the SDK only from `https://www.paypal.com/sdk/js`. Never self-host or bundle it.**

Reasons:
- The script is **dynamically bundled** per client ID and buyer — it includes only the code needed, not the entire SDK
- The same script loads inside PayPal's iframe and popup window — loading from paypal.com means browsers **cache it once** for both
- Security patches and bug fixes are **instantly live** — no deployment needed on your side
- Conversion improvements are applied **automatically**
- Backwards compatibility is maintained

---

## Instant Render (buttons visible immediately on page load)

Load the SDK **before** the container element, then call `.render()` immediately after the container:

```html
<!-- 1. SDK loads first -->
<script src="https://www.paypal.com/sdk/js?client-id=YOUR_CLIENT_ID"></script>

<!-- 2. Container -->
<div id="paypal-button-container"></div>

<!-- 3. Render immediately -->
<script>
  paypal.Buttons().render("#paypal-button-container");
</script>
```

**Bonus — pre-cache on a preceding page:**

Place this on your landing page or product page to pre-cache the script so checkout loads instantly:

```html
<!-- On a page BEFORE checkout -->
<script src="https://www.paypal.com/sdk/js?client-id=YOUR_CLIENT_ID" async></script>
```

---

## Delayed Render (buttons shown on user action)

When buttons appear after a user interaction (e.g. opening a cart drawer, selecting a radio button), load the SDK asynchronously in `<head>`, then call `.render()` on the trigger event.

```html
<head>
  <!-- Load asynchronously — doesn't block the page -->
  <script src="https://www.paypal.com/sdk/js?client-id=YOUR_CLIENT_ID" async></script>
</head>

<body>
  <div id="paypal-button-container"></div>

  <script>
    // Render when a user opens the cart drawer
    document.querySelector("#open-cart").addEventListener("click", () => {
      paypal.Buttons().render("#paypal-button-container");
    });
  </script>
</body>
```

**Or load the script dynamically via JS:**

```js
const script = document.createElement("script");
script.src = "https://www.paypal.com/sdk/js?client-id=YOUR_CLIENT_ID";
document.head.appendChild(script);
```

---

## Pre-render Hidden Buttons (Best for Delayed UX)

Render the buttons in a hidden container when the page loads, then show them on the user action. This ensures they're fully loaded before appearing:

```html
<div id="paypal-button-container" style="display:none;"></div>

<script>
  // Render immediately but hidden
  paypal.Buttons().render("#paypal-button-container");

  // Show them when the user opens the checkout panel
  document.querySelector("#open-checkout").addEventListener("click", () => {
    document.querySelector("#paypal-button-container").style.display = "block";
  });
</script>
```

---

## Loading as a Module (React / Next.js)

For React and Next.js, using `@paypal/react-paypal-js` is the recommended approach.

```bash
npm install @paypal/react-paypal-js
```

**Benefits of the module approach:**
- Control loading in JavaScript rather than HTML
- Encapsulates data and reduces bugs
- Works with React lifecycle (loads on mount, cleans up on unmount)
- No global `window.paypal` pollution

```tsx
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

// PayPalScriptProvider handles loading automatically
export default function CheckoutPage() {
  return (
    <PayPalScriptProvider
      options={{
        clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!,
        currency: "USD",
        components: "buttons,card-fields",
      }}
    >
      <PayPalButtons
        createOrder={async () => {
          const res = await fetch("/api/paypal/create-order", { method: "POST" });
          const { id } = await res.json();
          return id;
        }}
        onApprove={async (data) => {
          await fetch("/api/paypal/capture", {
            method: "POST",
            body: JSON.stringify({ orderID: data.orderID }),
          });
        }}
      />
    </PayPalScriptProvider>
  );
}
```

---

## Debug Mode

Enable verbose logging during development. **Disable before going to production** — it increases script size and hurts performance.

```html
<script src="https://www.paypal.com/sdk/js?client-id=YOUR_CLIENT_ID&debug=true"></script>
```

---

# 10 — Security: CSP & COOP

---

## Content Security Policy (CSP)

CSP is an HTTP header that tells the browser which sources are trusted for scripts, styles, images, and frames. Without it, malicious injected scripts could run in your page. Without proper PayPal CSP entries, the PayPal SDK will be blocked.

You must add PayPal's domains to your CSP approved list.

### Required domains

Add all three to every relevant CSP directive:

```
*.paypal.com
*.paypalobjects.com
*.venmo.com
```

---

## Option 1: `unsafe-inline` (Simpler)

```
default-src 'self';
script-src  'self' *.paypal.com *.paypalobjects.com *.venmo.com 'unsafe-inline';
connect-src 'self' *.paypal.com *.paypalobjects.com *.venmo.com;
child-src   'self' *.paypal.com *.paypalobjects.com *.venmo.com;
frame-src   'self' *.paypal.com *.paypalobjects.com *.venmo.com;
img-src     'self' *.paypal.com *.paypalobjects.com *.venmo.com data:;
style-src   'self' *.paypal.com *.paypalobjects.com *.venmo.com 'unsafe-inline';
```

**As a single line:**
```
default-src 'self'; script-src 'self' *.paypal.com *.paypalobjects.com *.venmo.com 'unsafe-inline'; connect-src 'self' *.paypal.com *.paypalobjects.com *.venmo.com; child-src 'self' *.paypal.com *.paypalobjects.com *.venmo.com; frame-src 'self' *.paypal.com *.paypalobjects.com *.venmo.com; img-src 'self' *.paypal.com *.paypalobjects.com *.venmo.com data:; style-src 'self' *.paypal.com *.paypalobjects.com *.venmo.com 'unsafe-inline';
```

---

## Option 2: Nonce (More Secure — Recommended)

A nonce is a random string generated per request. It lets specific inline scripts run while blocking all others — safer than blanket `unsafe-inline`.

### Step 1 — Pass the nonce to the SDK script tag

```html
<script
  nonce="YOUR_NONCE"
  data-csp-nonce="YOUR_NONCE"
  src="https://www.paypal.com/sdk/js?client-id=YOUR_CLIENT_ID"
></script>

<script nonce="YOUR_NONCE">
  paypal.Buttons().render("#paypal-button-container");
</script>
```

> Both `nonce` (standard HTML) and `data-csp-nonce` (for PayPal's internal iframes) are required.

### Step 2 — Include the nonce in your CSP header

```
default-src 'self';
script-src  'self' *.paypal.com *.paypalobjects.com *.venmo.com nonce-YOUR_NONCE;
connect-src 'self' *.paypal.com *.paypalobjects.com *.venmo.com;
child-src   'self' *.paypal.com *.paypalobjects.com *.venmo.com;
frame-src   'self' *.paypal.com *.paypalobjects.com *.venmo.com;
img-src     'self' *.paypal.com *.paypalobjects.com *.venmo.com data:;
style-src   'self' *.paypal.com *.paypalobjects.com *.venmo.com nonce-YOUR_NONCE;
```

---

## Next.js Implementation

Set headers in `next.config.ts`:

```ts
// next.config.ts
import type { NextConfig } from "next";

// Generate a nonce per request in middleware instead for true per-request nonces
// This static version works for most integrations
const cspHeader = `
  default-src 'self';
  script-src 'self' *.paypal.com *.paypalobjects.com *.venmo.com 'unsafe-inline';
  connect-src 'self' *.paypal.com *.paypalobjects.com *.venmo.com;
  child-src 'self' *.paypal.com *.paypalobjects.com *.venmo.com;
  frame-src 'self' *.paypal.com *.paypalobjects.com *.venmo.com;
  img-src 'self' *.paypal.com *.paypalobjects.com *.venmo.com data:;
  style-src 'self' *.paypal.com *.paypalobjects.com *.venmo.com 'unsafe-inline';
`.replace(/\n/g, " ").trim();

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: cspHeader,
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

---

## Cross-Origin-Opener-Policy (COOP)

COOP prevents cross-origin documents (like the PayPal popup window) from accessing your page's `window` object directly.

**Required setting for PayPal:**

```
Cross-Origin-Opener-Policy: same-origin-allow-popups
```

This allows the PayPal checkout popup to communicate back to your page after the buyer approves payment, while still protecting your page from other cross-origin content.

> Using `same-origin` (without `-allow-popups`) will break the PayPal checkout popup flow.

---

## CSP Directives Summary

| Directive | Why needed |
|-----------|-----------|
| `script-src` | Allows PayPal SDK scripts to load and run |
| `connect-src` | Allows `fetch` and XHR calls to PayPal APIs |
| `frame-src` | Allows PayPal's iframe components (card fields, buttons) |
| `child-src` | Allows PayPal workers and nested contexts |
| `img-src` | Allows PayPal button images and logos |
| `style-src` | Allows PayPal's inline styles inside iframes |

---

# Quick Reference Cheatsheet

A single-page reference for the most commonly needed PayPal JS SDK patterns.

---

## Script Tag (All Options)

```html
<script
  src="https://www.paypal.com/sdk/js
    ?client-id=YOUR_CLIENT_ID
    &currency=USD
    &intent=capture
    &commit=true
    &components=buttons,card-fields,messages
    &enable-funding=venmo,paylater
    &disable-funding=credit
    &vault=false
    &debug=false"
  data-client-token="TOKEN_FROM_SERVER"
  data-page-type="checkout"
  data-csp-nonce="YOUR_NONCE"
  data-partner-attribution-id="YOUR_BN_CODE"
></script>
```

---

## PayPal Buttons — Minimal

```js
paypal.Buttons({
  async createOrder() {
    const { id } = await fetch("/api/paypal/create-order", { method: "POST" }).then(r => r.json());
    return id;
  },
  async onApprove(data) {
    await fetch("/api/paypal/capture", {
      method: "POST",
      body: JSON.stringify({ orderID: data.orderID }),
    });
    window.location.href = "/success";
  },
}).render("#paypal-button-container");
```

---

## PayPal Buttons — Styled

```js
paypal.Buttons({
  style: {
    layout: "vertical",   // "vertical" | "horizontal"
    color: "gold",        // "gold" | "blue" | "silver" | "white" | "black"
    shape: "rect",        // "rect" | "pill" | "sharp"
    label: "pay",         // "paypal" | "checkout" | "buynow" | "pay"
    height: 45,           // 25–55
    tagline: false,
  },
  // ... createOrder, onApprove
}).render("#paypal-button-container");
```

---

## Card Fields — Minimal

```js
const cardField = paypal.CardFields({
  createOrder() {
    return fetch("/api/paypal/create-order", { method: "POST" })
      .then(r => r.json()).then(d => d.id);
  },
  onApprove(data) {
    return fetch("/api/paypal/capture", {
      method: "POST",
      body: JSON.stringify({ orderID: data.orderID }),
    }).then(() => { window.location.href = "/success"; });
  },
  onError(err) { console.error(err); },
});

if (cardField.isEligible()) {
  cardField.NameField().render("#card-name-field-container");
  cardField.NumberField().render("#card-number-field-container");
  cardField.ExpiryField().render("#card-expiry-field-container");
  cardField.CVVField().render("#card-cvv-field-container");

  document.getElementById("pay-button").addEventListener("click", () => {
    cardField.submit().catch(console.error);
  });
}
```

---

## React / Next.js (react-paypal-js)

```tsx
import {
  PayPalScriptProvider,
  PayPalButtons,
  PayPalCardFieldsProvider,
  PayPalNameField,
  PayPalNumberField,
  PayPalExpiryField,
  PayPalCVVField,
} from "@paypal/react-paypal-js";

<PayPalScriptProvider options={{
  clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!,
  currency: "USD",
  components: "buttons,card-fields",
}}>
  {/* PayPal Button */}
  <PayPalButtons
    createOrder={async () => {
      const { id } = await fetch("/api/paypal/create-order", { method: "POST" }).then(r => r.json());
      return id;
    }}
    onApprove={async (data) => {
      await fetch("/api/paypal/capture", {
        method: "POST",
        body: JSON.stringify({ orderID: data.orderID }),
      });
    }}
  />

  {/* Card Fields */}
  <PayPalCardFieldsProvider
    createOrder={async () => {
      const { id } = await fetch("/api/paypal/create-order", { method: "POST" }).then(r => r.json());
      return id;
    }}
    onApprove={async (data) => {
      await fetch("/api/paypal/capture", {
        method: "POST",
        body: JSON.stringify({ orderID: data.orderID }),
      });
    }}
    onError={console.error}
  >
    <PayPalNameField />
    <PayPalNumberField />
    <PayPalExpiryField />
    <PayPalCVVField />
  </PayPalCardFieldsProvider>
</PayPalScriptProvider>
```

---

## Server: Create Order (Node.js)

```ts
const res = await fetch("https://api-m.sandbox.paypal.com/v2/checkout/orders", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    intent: "CAPTURE",
    purchase_units: [{ amount: { currency_code: "USD", value: "49.99" } }],
  }),
});
const order = await res.json();
return order.id;
```

---

## Server: Capture Order (Node.js)

```ts
const res = await fetch(
  `https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderId}/capture`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  }
);
const capture = await res.json();
// capture.status === "COMPLETED"
```

---

## Common Gotchas

| ❌ Wrong | ✅ Right |
|---------|---------|
| Bundle or self-host the SDK | Load only from `https://www.paypal.com/sdk/js` |
| Use `intent=capture` in SDK but `AUTHORIZE` in API | Match `intent` in both |
| Use `commit=true` in SDK but change amount after | Match `commit` to whether amount is final |
| Pass `buyer-country` in production | Only use `buyer-country` in sandbox |
| Trust only the frontend `onApprove` callback | Always capture server-side and verify webhook |
| Use `disable-funding=card` to hide card fields | Use `card-fields` component separately |
| Use `merchant-id` with your own account | Only use `merchant-id` for partner/marketplace flows |
| Use PayPal email as `merchant-id` | Use the PayPal **Merchant ID** from account settings |

---

## Environment URLs

| Environment | Base URL |
|-------------|----------|
| Sandbox | `https://api-m.sandbox.paypal.com` |
| Production | `https://api-m.paypal.com` |
| SDK (both) | `https://www.paypal.com/sdk/js` |