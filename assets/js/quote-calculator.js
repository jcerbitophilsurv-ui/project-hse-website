(() => {
  const form = document.getElementById('quoteForm');
  if (!form) return;

  const formFieldsEl = document.getElementById('quoteFormFields');
  const editAnswersBtn = document.getElementById('quoteEditAnswers');
  const billInput = document.getElementById('billInput');
  const billError = document.getElementById('billError');
  const kwhInput = document.getElementById('kwhInput');
  const nameInput = document.getElementById('nameInput');
  const nameError = document.getElementById('nameError');
  const emailInput = document.getElementById('emailInput');
  const emailError = document.getElementById('emailError');
  const phoneInput = document.getElementById('phoneInput');
  const netMeteringToggle = document.getElementById('netMeteringToggle');
  const netMeteringInput = document.getElementById('netMeteringInput');
  const batteryRow = document.getElementById('batteryRow');
  const batteryToggle = document.getElementById('batteryToggle');
  const batteryInput = document.getElementById('batteryInput');
  const dataConsentInput = document.getElementById('dataConsent');
  const consentError = document.getElementById('consentError');
  const loadingEl = document.getElementById('quoteLoading');
  const sendErrorEl = document.getElementById('quoteSendError');
  const resultsEl = document.getElementById('quoteResults');
  const quoteSentEmail = document.getElementById('quoteSentEmail');
  const quoteCta = document.getElementById('quoteCta');

  const PRODUCT_LABELS = {
    hybrid: 'Hybrid System — Battery Backup',
    ongrid: 'Grid-Tied System — No Export',
    ongrid_nm: 'Grid-Tied System — Net Metering',
  };

  let settings = null; // content/quote-settings.yml — just the solar-cost comparison figure now
  let pricing = null; // content/pricing-tables.yml — the real system/price lookup

  async function fetchYaml(path) {
    const res = await fetch(path);
    const text = await res.text();
    return jsyaml.load(text);
  }

  function loadData() {
    return Promise.all([
      fetchYaml('content/quote-settings.yml'),
      fetchYaml('content/pricing-tables.yml'),
    ]).then(([s, p]) => { settings = s; pricing = p; });
  }
  loadData().catch((err) => console.error(err));

  // No net-metering option is pre-selected in the markup, so batteryRow stays
  // hidden (its default HTML state) until the visitor actually picks "No" or
  // "Not sure yet" below.
  netMeteringToggle.querySelectorAll('.toggle-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      netMeteringToggle.querySelectorAll('.toggle-btn').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      netMeteringInput.value = btn.dataset.value;
      // A battery only matters as an alternative to net metering — if they've said
      // yes to net metering there's no hybrid/battery product for that combination
      // in the pricing reference, so the question doesn't apply.
      batteryRow.hidden = btn.dataset.value === 'yes';
    });
  });

  batteryToggle.querySelectorAll('.toggle-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      batteryToggle.querySelectorAll('.toggle-btn').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      batteryInput.value = btn.dataset.value;
    });
  });

  function pesoFormat(num) {
    return '₱' + Math.round(num).toLocaleString('en-US');
  }

  function pesoRateFormat(num) {
    return '₱' + num.toFixed(2);
  }

  // Picks the first tier whose kwh is >= the customer's usage (never undersizes);
  // clamps to the smallest/largest tier outside the reference sheet's 300-2000 kWh range.
  function findTier(monthlyKwh) {
    const tiers = pricing.tiers;
    if (monthlyKwh <= tiers[0].kwh) return tiers[0];
    for (const tier of tiers) {
      if (tier.kwh >= monthlyKwh) return tier;
    }
    return tiers[tiers.length - 1];
  }

  function pickProductKey(inputs) {
    if (inputs.netMetering === 'yes') return 'ongrid_nm';
    return inputs.batteryBackup === 'yes' ? 'hybrid' : 'ongrid';
  }

  function computeEstimate(inputs) {
    const rate = pricing.electricity_rate_php_per_kwh;
    const currentMonthlyKwh = inputs.kwh > 0 ? inputs.kwh : inputs.bill / rate;
    const tier = findTier(currentMonthlyKwh);
    const productKey = pickProductKey(inputs);
    const product = tier[productKey];

    const currentMonthlyBill = currentMonthlyKwh * rate;
    const annualSavings = product.savings_per_year;
    const monthlySavings = annualSavings / 12;
    const newMonthlyBill = Math.max(0, currentMonthlyBill - monthlySavings);
    const roiYears = product.price / annualSavings;

    return {
      productKey,
      productLabel: PRODUCT_LABELS[productKey],
      tierKwh: tier.kwh,
      pvKwp: product.pv_kwp,
      batteryKwh: product.battery_kwh || 0,
      coverage: product.coverage,
      price: product.price,
      annualSavings,
      monthlySavings,
      roiYears,
      currentMonthlyKwh,
      currentMonthlyBill,
      newMonthlyBill,
      exceedsReferenceRange: currentMonthlyKwh > pricing.tiers[pricing.tiers.length - 1].kwh,
    };
  }

  function buildAssumptionsList(result) {
    const rateLine = `Electricity at ${pesoRateFormat(pricing.electricity_rate_php_per_kwh)}/kWh, the Meralco residential rate for September 2026. Your rate will differ if another utility supplies you.`;
    const fixedChargesLine = 'Fixed charges stay on your bill whatever you generate.';
    const yieldLine = `Sized on ${pricing.peak_sun_hours} kWh per kWp per day (peak sun hours), a full-year average rather than a clear day.`;

    let productSpecific;
    if (result.productKey === 'hybrid') {
      productSpecific = 'Your battery is sized to your nighttime usage, and your panels are sized to fully recharge it every day — this system is designed to cover close to all of your usage.';
    } else if (result.productKey === 'ongrid_nm') {
      productSpecific = `This system is sized to cover your full monthly usage. Any surplus you export is credited at ${pesoRateFormat(pricing.export_credit_php_per_kwh)}/kWh — the generation charge, not the full retail rate.`;
    } else {
      productSpecific = "This system is sized to what your home uses during the day, without exporting power back to the grid — typically covering around 40% of your total usage, with the rest still drawn from the grid as usual.";
    }

    return [rateLine, productSpecific, fixedChargesLine, yieldLine];
  }

  function buildCoverageNote(result, inputs) {
    const notes = [];
    if (inputs.netMetering === 'yes') {
      notes.push('Since net metering is required, this estimate assumes a grid-tied system with a formal utility application (facility inspection + bi-directional meter), typically taking 2–4 months to complete.');
    }
    if (result.exceedsReferenceRange) {
      notes.push('Your usage is above our standard reference range — this uses our largest reference tier as a starting point; your final system will need a custom site assessment.');
    }
    return notes.join(' ');
  }

  function buildEmailPayload(result, inputs) {
    return {
      name: inputs.name,
      email: inputs.email,
      consent: inputs.dataConsent,
      kwh: Math.round(result.currentMonthlyKwh).toLocaleString('en-US'),
      gridCost: pesoRateFormat(pricing.electricity_rate_php_per_kwh),
      solarCost: pesoRateFormat(settings.solar_cost_php_per_kwh),
      productLabel: result.productLabel,
      systemKwp: result.pvKwp.toFixed(1),
      batteryKwh: result.batteryKwh > 0 ? result.batteryKwh.toFixed(1) : '',
      price: pesoFormat(result.price),
      monthlySavings: pesoFormat(result.monthlySavings),
      annualSavings: pesoFormat(result.annualSavings),
      roiYears: `~${result.roiYears.toFixed(1)} years`,
      coverageNote: buildCoverageNote(result, inputs),
      assumptions: buildAssumptionsList(result),
    };
  }

  function submitLead(inputs) {
    const body = new URLSearchParams({
      'form-name': 'quote',
      name: inputs.name,
      email: inputs.email,
      phone: inputs.phone,
      bill: String(inputs.bill),
      kwh: inputs.kwh ? String(inputs.kwh) : '',
      'net-metering': inputs.netMetering,
      'battery-backup': inputs.batteryBackup,
      'data-consent': inputs.dataConsent ? 'yes' : 'no',
    }).toString();

    fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    }).catch((err) => {
      console.error('Lead capture submission failed:', err);
    });
  }

  async function sendEstimateEmail(inputs) {
    formFieldsEl.hidden = true;
    sendErrorEl.hidden = true;
    loadingEl.hidden = false;

    const result = computeEstimate(inputs);
    const payload = buildEmailPayload(result, inputs);

    try {
      const res = await fetch('/.netlify/functions/send-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('send-quote responded with status ' + res.status);

      loadingEl.hidden = true;
      quoteSentEmail.textContent = inputs.email;

      const summary = `Solar estimate request: ~₱${Math.round(inputs.bill)}/mo bill, net metering: ${inputs.netMetering}, battery backup: ${inputs.batteryBackup}. Recommended ${result.productLabel} (~${result.pvKwp.toFixed(1)}kWp), estimated cost ${pesoFormat(result.price)}.`;
      quoteCta.href = 'contact.html?prefill=' + encodeURIComponent(summary)
        + '&name=' + encodeURIComponent(inputs.name)
        + '&email=' + encodeURIComponent(inputs.email)
        + '&phone=' + encodeURIComponent(inputs.phone);

      resultsEl.hidden = false;
      requestAnimationFrame(() => {
        resultsEl.classList.add('is-visible');
        resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } catch (err) {
      console.error('Failed to send estimate email:', err);
      loadingEl.hidden = true;
      formFieldsEl.hidden = false;
      sendErrorEl.hidden = false;
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const bill = parseFloat(billInput.value);
    let firstInvalid = null;

    if (!bill || bill <= 0) {
      billError.hidden = false;
      firstInvalid = firstInvalid || billInput;
    } else {
      billError.hidden = true;
    }

    if (!nameInput.value.trim()) {
      nameError.hidden = false;
      firstInvalid = firstInvalid || nameInput;
    } else {
      nameError.hidden = true;
    }

    if (!emailInput.checkValidity()) {
      emailError.hidden = false;
      firstInvalid = firstInvalid || emailInput;
    } else {
      emailError.hidden = true;
    }

    if (!dataConsentInput.checked) {
      consentError.hidden = false;
      firstInvalid = firstInvalid || dataConsentInput;
    } else {
      consentError.hidden = true;
    }

    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    if (!settings || !pricing) {
      loadData().then(submitEstimate).catch((err) => console.error(err));
      return;
    }
    submitEstimate();

    function submitEstimate() {
      const inputs = {
        bill,
        kwh: parseFloat(kwhInput.value) || 0,
        netMetering: netMeteringInput.value,
        batteryBackup: netMeteringInput.value === 'yes' ? 'no' : batteryInput.value,
        name: nameInput.value.trim(),
        email: emailInput.value.trim(),
        phone: phoneInput.value.trim(),
        dataConsent: dataConsentInput.checked,
      };

      submitLead(inputs);
      sendEstimateEmail(inputs);
    }
  });

  editAnswersBtn.addEventListener('click', () => {
    resultsEl.hidden = true;
    resultsEl.classList.remove('is-visible');
    formFieldsEl.hidden = false;
    formFieldsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
})();
