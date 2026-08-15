/* PartFit Ghana — policy & business content pages.
   Content is static, trusted HTML (no user input) so section bodies are
   inlined directly; the CSP forbids inline scripts, not inline markup. */
(() => {
  const P = window.PFV3;

  const C = {
    privacy: {
      title: 'Privacy Policy',
      intro: 'PartFit Ghana collects only what it needs to find the right part for your car, manage your order and support you through pickup. This page explains what we hold and how it is used.',
      sections: [
        ['What we collect', `<ul>
          <li><b>Account details</b> — your name, email and phone / WhatsApp number.</li>
          <li><b>Vehicle details</b> — make, model, year, engine and any OE / VIN reference you share, so we can confirm fitment.</li>
          <li><b>Order information</b> — the parts you request, your order history and pickup status.</li>
          <li><b>Technical data</b> — basic device and app information needed to run the service and keep it secure.</li>
        </ul>`],
        ['How we use it', `<p>We use your information to identify the correct part, check exact fitment and stock, prepare and approve your order, contact you about it, and provide support. We do not use it for unrelated advertising.</p>`],
        ['Messaging', `<p>Order approvals and questions are confirmed over WhatsApp and phone. Any details you include in a message to us — for example a photo of the old part — are shared by you at that point and used only to help fulfil your request.</p>`],
        ['Storage & security', `<p>Account and order data is held in a secured cloud backend protected by row-level security, so each customer can see only their own records. You can ask us to correct or delete your information at any time.</p>`],
        ['Sharing', `<p>We do not sell your data. It is shared only with the suppliers or logistics partners needed to source and hand over your order, and only to the extent required to do so.</p>`],
        ['Your choices', `<p>You may request access to, correction of, or deletion of your account and order data. Contact us through the in-app Contact page or WhatsApp and quote the email on your account.</p>`],
      ],
    },

    terms: {
      title: 'Terms & Conditions',
      intro: 'These terms explain how ordering works on PartFit Ghana. The model is fitment-first and pay-on-pickup: nothing is charged until we have confirmed the exact part and you collect it.',
      sections: [
        ['Provisional pricing', `<p>Prices and basket totals shown in the app are <b>provisional</b>. They become final only after PartFit checks the exact fitment and stock for your vehicle and confirms the approved amount.</p>`],
        ['How an order is approved', `<p>Submitting an order is a <b>request</b>, not a completed sale. PartFit reviews the request, confirms which items fit and are in stock, sets the final price, and marks the order approved. A contract of sale is formed only at that approval step.</p>`],
        ['Pay on pickup', `<p>There is no online payment. You pay for the approved items when you collect them at our Spintex pickup point. If part of an order cannot be fulfilled, only the approved items are prepared and priced.</p>`],
        ['Changes & cancellation', `<p>You may cancel or change an order any time before collection — just let us know. PartFit may also decline or cancel a request if an item turns out to be unavailable or cannot be confirmed to fit your vehicle.</p>`],
        ['Your account', `<p>Keep your sign-in details secure and give accurate vehicle and contact information. You are responsible for activity on your account. Do not use the service unlawfully or to place orders you do not intend to collect.</p>`],
        ['Liability', `<p>PartFit takes care to confirm fitment, but you are responsible for verifying the part number and application before installation (see the Fitment Disclaimer). To the extent permitted by law, PartFit is not liable for losses arising from parts installed without that confirmation.</p>`],
        ['Governing law', `<p>These terms are governed by the laws of the Republic of Ghana.</p>`],
      ],
    },

    returns: {
      title: 'Returns & Refunds',
      intro: 'Because you inspect and pay for parts at pickup, most issues are caught before you leave. This page covers what happens if something is still wrong.',
      sections: [
        ['Check before you install', `<p>Always verify the part number and confirm the part matches your vehicle <b>before fitting it</b>. Once a part has been installed or attempted to be installed, it may no longer be returnable for hygiene, safety and supplier reasons.</p>`],
        ['If a part is wrong or faulty', `<p>If an approved item is the wrong part or is defective, report it with your <b>order reference</b>, clear photos and the original packaging. Where the issue is confirmed, PartFit will replace the item or arrange a refund of what you paid for it.</p>`],
        ['How to report', `<ul>
          <li>Contact us through the in-app Contact page or WhatsApp.</li>
          <li>Quote your order reference (for example <span class="mono">PF-…</span>).</li>
          <li>Include photos of the item, the box label and, if relevant, the fitment issue.</li>
        </ul>`],
        ['Items that may not be returnable', `<p>Electrical parts, special-order items and anything fitted or modified may be non-returnable. We will always tell you before you collect if an item is sold on a no-return basis.</p>`],
        ['Refunds', `<p>Because payment is made at pickup, there is nothing to refund for orders cancelled beforehand. For a confirmed issue after collection, refunds are made by the same method you paid with.</p>`],
      ],
    },

    delivery: {
      title: 'Pickup & Fulfilment',
      intro: 'PartFit Ghana is built around confirmed pickup at Spintex. Here is how an order moves from request to collection.',
      sections: [
        ['Where to collect', `<p><b>${P.esc(CFG.pickup)}</b><br>${P.esc(CFG.addr)}<br>${P.esc(CFG.hours)}</p>`],
        ['How fulfilment works', `<ul>
          <li><b>Submit</b> — you send your order request from the app. No payment yet.</li>
          <li><b>Verify</b> — PartFit checks exact fitment and stock for your vehicle.</li>
          <li><b>Approve</b> — we confirm the items that fit and set the final price.</li>
          <li><b>Ready for collection</b> — your order is prepared and held for you.</li>
          <li><b>Collect & pay</b> — you inspect and pay for the approved items at pickup.</li>
        </ul>`],
        ['Holding your order', `<p>Approved orders are held for collection for a short reservation period. If you need more time, message us and we will do our best to keep the items aside.</p>`],
        ['Delivery option', `<p>Delivery within Accra / Tema can be arranged on request. Any delivery fee is quoted and confirmed over WhatsApp before dispatch; it is separate from the price of the parts.</p>`],
        ['What to bring', `<p>Please bring your <b>order reference</b> and be ready to confirm the vehicle the parts are for.</p>`],
      ],
    },

    fitment: {
      title: 'Fitment Disclaimer',
      intro: 'Fitment comes first at PartFit: we would rather confirm a part fits than sell you one that does not. This page explains how far each listing has been checked.',
      sections: [
        ['Certainty, not guesswork', `<p>Every part shows how confident we are about the fit, so you are never guessing:</p>
        <ul>
          <li><b>Manufacturer application match</b> — the maker lists this part for vehicles like yours; we still confirm against your exact engine / OE reference.</li>
          <li><b>Confirm OE / VIN</b> — likely to fit, but we verify with your OE or VIN before approving.</li>
          <li><b>No fitment claim</b> — listed for reference only until we have checked it for your vehicle.</li>
        </ul>`],
        ['OE / VIN confirmation', `<p>Some vehicle-specific parts require the OE (original-equipment) part number, VIN / chassis number or a photo of the old part before we can approve the order. Providing these up front speeds up approval and avoids wrong parts.</p>`],
        ['About the images', `<p>Product images are reference photos for the category unless the listing explicitly states it is the exact SKU photo. Always rely on the part number and our fitment confirmation, not the picture alone.</p>`],
        ['Final responsibility', `<p>Because engines and variants differ, final fitment is confirmed before your order is approved. Please do not install a part until you have verified it matches your vehicle.</p>`],
      ],
    },
  };

  function page(k) {
    const c = C[k];
    const body = c.sections.map(s => `<section class="card policyBody"><h2>${P.esc(s[0])}</h2>${s[1]}</section>`).join('');
    app.innerHTML = appHeader(c.title, 'PartFit Ghana') + `<main class="page policyPage">
      <section class="policyHero"><h1>${P.esc(c.title)}</h1><p>${P.esc(c.intro)}</p><span class="draftBadge">Demo · pre-launch draft</span></section>
      ${body}
      <section class="card policyNote"><p>PartFit Ghana is currently a demo. The final business identity, exact time limits and legally reviewed wording will be confirmed before commercial orders are accepted.</p></section>
      ${P.footer()}</main>${nav('account')}`;
  }

  Object.keys(C).forEach(k => P.register(k, () => page(k)));
})();
