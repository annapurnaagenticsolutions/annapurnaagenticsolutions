/* ==========================================================================
   Payment Gateway Client Integration — Official Razorpay Flow
   Self-paced STEM Platform for Classes 1–10:
   - Band 1 (Classes 1–4): ₹999/6M, ₹1,999/1Y (+18% GST)
   - Band 2 (Classes 5–7): ₹1,499.50/6M, ₹2,999/1Y (+18% GST)
   - Band 3 (Classes 8–10): ₹2,000/6M, ₹4,000/1Y (+18% GST)

   Prices show 18% GST breakdown and final payable amount.
   Future offerings (Live cohorts) marked as coming soon.
   ========================================================================== */

const AVYAAN_BANDS = Object.freeze({
  band_1_4: {
    id: 'band_1_4',
    name: 'Classes 1–4 (Foundational STEM)',
    classes: 'Classes 1, 2, 3, 4',
    minGrade: 1,
    maxGrade: 4,
    description: 'Visual logic, spatial reasoning, tactile experiments, and foundational maths.',
    prices: {
      '6m': { base: 999, gst: 179.82, total: 1178.82, monthly: 166.5 },
      '1y': { base: 1999, gst: 359.82, total: 2358.82, monthly: 166.58, savings: '5.0% annual savings' },
    },
  },
  band_5_7: {
    id: 'band_5_7',
    name: 'Classes 5–7 (Preparatory STEM)',
    classes: 'Classes 5, 6, 7',
    minGrade: 5,
    maxGrade: 7,
    description: 'Algorithmic thinking, foundational physics & chemistry, earth science, and applied math.',
    prices: {
      '6m': { base: 1499.5, gst: 269.91, total: 1769.41, monthly: 249.92 },
      '1y': { base: 2999, gst: 539.82, total: 3538.82, monthly: 249.92, savings: '0% annual savings' },
    },
  },
  band_8_10: {
    id: 'band_8_10',
    name: 'Classes 8–10 (Secondary & Board Prep)',
    classes: 'Classes 8, 9, 10',
    minGrade: 8,
    maxGrade: 10,
    description: 'Curriculum-informed study support, exam preparation, and Python & AI fundamentals.',
    prices: {
      '6m': { base: 2000, gst: 360, total: 2360, monthly: 333.33 },
      '1y': { base: 4000, gst: 720, total: 4720, monthly: 333.33, savings: '0% annual savings' },
    },
  },
});

function getBandKeyForGrade(grade) {
  const g = parseInt(grade, 10) || 1;
  if (g <= 4) return 'band_1_4';
  if (g <= 7) return 'band_5_7';
  return 'band_8_10';
}

const AvyaanPayments = {
  selectedBandKey: 'band_5_7',
  selectedDuration: '1y',
  selectedTopic: null,
 checkoutIdempotencyKey: null,
 planCatalogLoaded: false,
  planCatalogError: false,

  async syncPlansFromServer() {
    if (this.planCatalogLoaded) return true;
    if (typeof AvyaanAPI === 'undefined') {
      this.planCatalogError = true;
      return false;
    }
    const data = await Promise.race([
      AvyaanAPI.getPlans(),
      new Promise(resolve => setTimeout(() => resolve({ plans: [], error: 'Pricing request timed out' }), 8000))
    ]);
    if (!data || !Array.isArray(data.plans) || data.plans.length === 0) {
      this.planCatalogError = true;
      return false;
    }
    for (const plan of data.plans) {
      const bandKey = plan.band_id || plan.band;
      const band = AVYAAN_BANDS[bandKey];
      if (!band) continue;
      if (plan.options) {
        for (const duration of ['6m', '1y']) {
          const quote = plan.options[duration];
          if (!quote) continue;
          band.prices[duration] = {
            base: quote.base_inr, gst: quote.gst_inr, total: quote.total_inr,
            monthly: quote.effective_monthly_inr != null
              ? quote.effective_monthly_inr
              : Number((Number(quote.total_inr) / (duration === '1y' ? 12 : 6)).toFixed(2)),
            savings: quote.savings_vs_two_6m || ''
          };
        }
      } else if (plan.duration && plan.base_inr != null) {
        band.prices[plan.duration] = {
          base: plan.base_inr,
          gst: plan.gst_inr || 0,
          total: plan.total_inr,
          monthly: plan.effective_monthly_inr != null
            ? plan.effective_monthly_inr
            : Number((Number(plan.total_inr) / (plan.duration === '1y' ? 12 : 6)).toFixed(2)),
          savings: plan.savings_vs_two_6m || ''
        };
      }
    }
    this.planCatalogLoaded = true;
    return true;
  },

  loadRazorpaySdk() {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => {
        console.warn('Razorpay SDK failed to load from CDN.');
        resolve(false);
      };
      document.head.appendChild(script);
    });
  },

  setDuration(duration) {
    this.selectedDuration = duration;
    this.renderPaywallContent();
  },

  renderPaywall(topic) {
    this.selectedTopic = topic || null;
    let user = null;
    try { user = JSON.parse(avyaanStorage.getItem('avyaan_user') || 'null'); } catch (e) {}

    const grade = (user && user.enrolled_class) || (topic && topic.class_level) || 7;
   this.selectedBandKey = getBandKeyForGrade(grade);
   this.selectedDuration = '1y';
    this.planCatalogLoaded = false;
    this.planCatalogError = false;

   this.renderPaywallContent();
   openModal('paywallModal');
    this.syncPlansFromServer().then(() => this.renderPaywallContent()).catch(() => { this.planCatalogError = true; this.renderPaywallContent(); });
  },

  renderPaywallContent() {
   const modalContent = document.getElementById('paywallModalContent');
   if (!modalContent) return;

    if (!this.planCatalogLoaded) {
      modalContent.innerHTML = this.planCatalogError ? `
        <div style="text-align:center; padding:1.5rem 1rem;">
          <span style="font-size:2.3rem;">⚠️</span>
          <h2 style="font-size:1.15rem; font-weight:800; color:#0f172a; margin:0.5rem 0 0.3rem;">Current pricing is unavailable</h2>
          <p style="color:#64748b; font-size:0.84rem; margin:0 auto 1rem; max-width:360px;">We could not retrieve the live plan quote. Please retry before starting checkout.</p>
          <button class="btn btn-primary" onclick="AvyaanPayments.planCatalogError=false; AvyaanPayments.syncPlansFromServer().then(() => AvyaanPayments.renderPaywallContent()).catch(() => { AvyaanPayments.planCatalogError=true; AvyaanPayments.renderPaywallContent(); })">Retry live pricing</button>
        </div>
      ` : `
        <div style="text-align:center; padding:1.5rem 1rem;">
          <span style="font-size:2.3rem;">💳</span>
          <h2 style="font-size:1.15rem; font-weight:800; color:#0f172a; margin:0.5rem 0 0.3rem;">Loading current plan pricing…</h2>
          <p style="color:#64748b; font-size:0.84rem; margin:0;">Avyaan is fetching the latest GST-inclusive quote securely.</p>
        </div>
      `;
      return;
    }

   const band = AVYAAN_BANDS[this.selectedBandKey] || AVYAAN_BANDS.band_5_7;
    const dur = this.selectedDuration || '1y';
    const priceData = band.prices[dur];

    modalContent.innerHTML = `
      <div style="text-align: center; margin-bottom: 1.1rem;">
        <span style="font-size: 2.6rem;">🎓</span>
        <h2 style="font-size: 1.35rem; font-weight: 800; color: #0f172a; margin: 0.3rem 0 0.15rem;">
          Enroll in ${band.name}
        </h2>
        <p style="color: var(--text-muted); font-size: 0.83rem; margin: 0;">
          Full self-paced access to all 6 STEM subjects across ${band.classes}.
        </p>
      </div>

      <!-- DURATION TOGGLE SWITCHER -->
      <div role="tablist" style="display: flex; gap: 0.4rem; background: #f1f5f9; padding: 0.28rem; border-radius: 12px; margin-bottom: 1.1rem;">
        <button type="button" class="btn btn-sm" style="flex: 1; justify-content: center; font-weight: 700; ${dur === '6m' ? 'background:#ffffff; border-color:#cbd5e1; box-shadow:0 1px 3px rgba(0,0,0,0.06);' : 'background:transparent; border:none;'}" onclick="AvyaanPayments.setDuration('6m')">
          6 Months
        </button>
        <button type="button" class="btn btn-sm" style="flex: 1; justify-content: center; font-weight: 700; ${dur === '1y' ? 'background:#ffffff; border-color:#cbd5e1; box-shadow:0 1px 3px rgba(0,0,0,0.06); color:#1d4ed8;' : 'background:transparent; border:none;'}" onclick="AvyaanPayments.setDuration('1y')">
          1 Year <span style="font-size: 0.68rem; background: #dbeafe; color: #1e40af; padding: 0.1rem 0.4rem; border-radius: 6px; margin-left: 0.3rem;">Best Value</span>
        </button>
      </div>

      <!-- PRICE CARD & 18% GST BREAKDOWN -->
      <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 1.1rem; margin-bottom: 1.1rem;">
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.6rem;">
          <div>
            <div style="font-size: 1.05rem; font-weight: 800; color: #0f172a;">${dur === '1y' ? 'Annual Self-Paced Plan' : '6-Month Self-Paced Plan'}</div>
            <div style="font-size: 0.74rem; color: #64748b;">${band.description}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 1.45rem; font-weight: 900; color: #2563eb;">₹${priceData.total.toLocaleString('en-IN')}</div>
            <div style="font-size: 0.7rem; color: #64748b;">₹${Number(priceData.monthly).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mo effective${priceData.savings ? ' · ' + priceData.savings : ''}</div>
          </div>
        </div>

        <div style="border-top: 1px dashed #cbd5e1; padding-top: 0.6rem; font-size: 0.78rem; color: #475569;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.2rem;">
            <span>Plan fee (${dur === '1y' ? '12 months' : '6 months'})</span>
            <span>₹${priceData.base.toLocaleString('en-IN')}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.35rem;">
            <span>GST (18% applicable)</span>
            <span>₹${priceData.gst.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-weight: 800; color: #0f172a; border-top: 1px solid #e2e8f0; padding-top: 0.4rem;">
            <span>Total Payable Amount</span>
            <span>₹${priceData.total.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      <!-- CHECKOUT BUTTON -->
      <button id="checkoutBtn" class="btn btn-primary" style="width: 100%; padding: 0.85rem; font-size: 1rem; font-weight: 800; justify-content: center; box-shadow: 0 4px 12px rgba(37,99,235,0.25);" onclick="AvyaanPayments.initiateCheckout()">
        Proceed to Secure Payment →
      </button>
      <div style="font-size: 0.72rem; text-align: center; color: var(--text-dim); margin-top: 0.6rem;">
        🔒 Secure checkout via Razorpay · Activation after payment verification
      </div>

      <!-- FUTURE OFFERINGS NOTICE -->
      <div style="background: #fdf8f6; border: 1px solid #fed7aa; border-radius: 10px; padding: 0.7rem 0.85rem; margin-top: 1rem; font-size: 0.74rem; color: #9a3412;">
        <div style="font-weight: 700; margin-bottom: 0.2rem;">✨ Future Offerings (Coming Soon)</div>
        <div>• <b>Live Mentor Cohorts:</b> Small groups (1:6) with weekly educator feedback.</div>
      </div>
    `;
  },

  async initiateCheckout() {
    let user = null;
    try { user = JSON.parse(avyaanStorage.getItem('avyaan_user') || 'null'); } catch (e) {}

    if (!user || user.id === 'guest' || !user.id) {
      closeModal('paywallModal');
      openLoginModal();
      if (typeof toast === 'function') {
        toast('Please log in or register before completing enrollment.');
      }
      return;
    }

    const checkoutBtn = document.getElementById('checkoutBtn');
    this.checkoutIdempotencyKey = this.checkoutIdempotencyKey || (window.crypto?.randomUUID ? crypto.randomUUID() : 'av-' + Date.now() + '-' + Math.random().toString(36).slice(2));
    if (checkoutBtn) {
      checkoutBtn.disabled = true;
      checkoutBtn.innerText = 'Initializing secure payment...';
    }

    // 1. Create order on backend
    const orderData = await AvyaanAPI.createOrder(this.selectedDuration, this.selectedBandKey, this.checkoutIdempotencyKey);
    if (!orderData || orderData.status !== 'success' || !orderData.order_id) {
      alert(orderData && orderData.detail ? orderData.detail : 'Payment gateway initialization failed. Please try again.');
      if (checkoutBtn) {
        checkoutBtn.disabled = false;
        checkoutBtn.innerText = 'Proceed to Secure Payment →';
      }
      return;
    }

    // 2. Load Razorpay Checkout SDK
    const sdkReady = await this.loadRazorpaySdk();
    if (!sdkReady || !window.Razorpay) {
      alert('Unable to connect to the secure payment gateway. Please verify your internet connection and ensure no content blockers are restricting payments.');
      if (checkoutBtn) {
        checkoutBtn.disabled = false;
        checkoutBtn.innerText = 'Proceed to Secure Payment →';
      }
      return;
    }

    // 3. Open official Razorpay modal
    const options = {
      key: orderData.key_id,
      amount: orderData.amount,
      currency: 'INR',
      name: 'Avyaan STEM Platform',
      description: `${orderData.band_name} (${orderData.duration_label})`,
      image: 'favicon.svg',
      order_id: orderData.order_id,
      prefill: {
        name: user.name || '',
        email: user.email || '',
      },
      theme: {
        color: '#2563eb',
      },
      handler: async function (response) {
        if (checkoutBtn) checkoutBtn.innerText = 'Verifying payment with bank...';
        const verifyRes = await AvyaanAPI.verifyPayment(
          response.razorpay_order_id || orderData.order_id,
          response.razorpay_payment_id,
          response.razorpay_signature
        );
        if (verifyRes && verifyRes.status === 'success') {
          alert('🎉 Payment successfully verified! You are now enrolled in ' + (verifyRes.band_name || 'Avyaan STEM') + '.');
          closeModal('paywallModal');
          if (typeof updateNavbarUserUI === 'function') updateNavbarUserUI();
          if (typeof renderGrid === 'function') renderGrid();
          if (typeof confetti === 'function') {
            try { confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } }); } catch (e) {}
          }
        } else {
          alert('Payment verification failed: ' + (verifyRes && verifyRes.detail ? verifyRes.detail : 'Invalid signature. Please contact support.'));
          if (checkoutBtn) {
            checkoutBtn.disabled = false;
            checkoutBtn.innerText = 'Proceed to Secure Payment →';
          }
        }
      },
      modal: {
        ondismiss: function () {
          if (checkoutBtn) {
            checkoutBtn.disabled = false;
            checkoutBtn.innerText = 'Proceed to Secure Payment →';
          }
        },
      },
    };

    try {
      const rzpInstance = new window.Razorpay(options);
      rzpInstance.open();
    } catch (e) {
      console.error('Razorpay invocation error:', e);
      if (checkoutBtn) {
        checkoutBtn.disabled = false;
        checkoutBtn.innerText = 'Proceed to Secure Payment →';
      }
    }
  },
};

// Expose the payment facade for cross-page CTAs and safe inline integrations.
window.AvyaanPayments = AvyaanPayments;
