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
  const loadingEl = document.getElementById('quoteLoading');
  const resultsEl = document.getElementById('quoteResults');
  const netMeteringNote = document.getElementById('netMeteringNote');
  const statementNameEl = document.getElementById('quoteStatementName');
  const statementKwhEl = document.getElementById('quoteStatementKwh');
  const resultGridCost = document.getElementById('resultGridCost');
  const resultSolarCost = document.getElementById('resultSolarCost');
  const recommendationEl = document.getElementById('quoteRecommendation');
  const assumptionsList = document.getElementById('quoteAssumptionsList');
  const quoteCta = document.getElementById('quoteCta');
  const loadingVideo = document.getElementById('quoteLoadingVideo');
  const loadingSpinner = document.getElementById('quoteLoadingSpinner');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const PROJECTION_HORIZON_YEARS = 10;

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

  function animateValue(el, start, end, duration, formatter) {
    const startTime = performance.now();
    function tick(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * eased;
      el.textContent = formatter(current);
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // Isolated so a real loading animation (video/Lottie) can be swapped in later
  // without touching the calculation/render logic below.
  function playLoadingTransition(callback) {
    formFieldsEl.hidden = true;
    loadingEl.hidden = false;

    let finished = false;
    function finish() {
      if (finished) return;
      finished = true;
      loadingEl.hidden = true;
      callback();
    }

    const canPlayVideo = loadingVideo && !prefersReducedMotion;
    if (!canPlayVideo) {
      setTimeout(finish, prefersReducedMotion ? 300 : 1200);
      return;
    }

    if (loadingSpinner) loadingSpinner.hidden = true;
    loadingVideo.hidden = false;
    loadingVideo.currentTime = 0;
    loadingVideo.addEventListener('ended', finish, { once: true });
    loadingVideo.addEventListener('error', () => {
      loadingVideo.hidden = true;
      if (loadingSpinner) loadingSpinner.hidden = false;
      setTimeout(finish, 1200);
    }, { once: true });

    const playPromise = loadingVideo.play();
    if (playPromise && playPromise.catch) {
      playPromise.catch(() => {
        loadingVideo.hidden = true;
        if (loadingSpinner) loadingSpinner.hidden = false;
        setTimeout(finish, 1200);
      });
    }

    // Hard fallback in case 'ended' never fires (longer than the video's own length).
    setTimeout(finish, 15000);
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

  function computeProjection(result) {
    const cumulativeAtHorizon = result.annualSavings * PROJECTION_HORIZON_YEARS;
    const remaining = Math.max(0, result.price - cumulativeAtHorizon);
    const netBenefitAtHorizon = cumulativeAtHorizon - result.price;
    const isPaidBackWithinHorizon = result.roiYears <= PROJECTION_HORIZON_YEARS;
    const savingsByYear = Array.from({ length: PROJECTION_HORIZON_YEARS + 1 }, (_, year) => result.annualSavings * year);
    return { cumulativeAtHorizon, remaining, netBenefitAtHorizon, isPaidBackWithinHorizon, savingsByYear };
  }

  // Small inline chart: cumulative savings (accent line) against the investment
  // cost (a dashed gray threshold, direct-labeled — not a second "series").
  function buildProjectionChart(result, projection) {
    const W = 320, H = 150;
    const padL = 8, padR = 8, padT = 16, padB = 26;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;
    const horizon = PROJECTION_HORIZON_YEARS;
    const maxY = Math.max(result.price, projection.savingsByYear[horizon], 1) * 1.15;

    const x = (year) => padL + (year / horizon) * plotW;
    const y = (value) => padT + plotH - (value / maxY) * plotH;

    const thresholdY = y(result.price);
    const linePoints = projection.savingsByYear.map((v, year) => `${x(year).toFixed(1)},${y(v).toFixed(1)}`).join(' ');

    const endYear = horizon;
    const endValue = projection.savingsByYear[endYear];
    const endX = x(endYear);
    const endY = y(endValue);
    const endLabelY = endY < thresholdY ? endY - 10 : endY + 16;

    let paybackMarkup = '';
    if (projection.isPaidBackWithinHorizon) {
      const py = result.roiYears;
      const px = x(py);
      const paybackAnchor = px < 50 ? 'start' : px > (W - 50) ? 'end' : 'middle';
      paybackMarkup = `
        <circle class="quote-chart-payback-dot" cx="${px.toFixed(1)}" cy="${thresholdY.toFixed(1)}" r="5"><title>Paid back in ${py.toFixed(1)} years</title></circle>
        <text class="quote-chart-payback-label" x="${px.toFixed(1)}" y="${(thresholdY - 12).toFixed(1)}" text-anchor="${paybackAnchor}">Paid back ~${py.toFixed(1)}yr</text>
      `;
    }

    // Every 2 years, not every year — 11 data points is too dense to label individually.
    const axisYears = [];
    for (let yr = 0; yr <= horizon; yr += 2) axisYears.push(yr);
    const axisLabels = axisYears.map((yr) => {
      const anchor = yr === 0 ? 'start' : yr === horizon ? 'end' : 'middle';
      return `<text class="quote-chart-axis-label" x="${x(yr).toFixed(1)}" y="${H - 6}" text-anchor="${anchor}">Yr ${yr}</text>`;
    }).join('');

    return `
      <svg class="quote-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${horizon}-year cumulative savings versus investment cost">
        <line class="quote-chart-threshold" x1="${x(0).toFixed(1)}" y1="${thresholdY.toFixed(1)}" x2="${x(horizon).toFixed(1)}" y2="${thresholdY.toFixed(1)}" />
        <text class="quote-chart-threshold-label" x="${x(0).toFixed(1)}" y="${(thresholdY - 6).toFixed(1)}">Investment: ${pesoFormat(result.price)}</text>
        <polyline class="quote-chart-savings-line" points="${linePoints}" />
        <circle class="quote-chart-dot" cx="${x(0).toFixed(1)}" cy="${y(0).toFixed(1)}" r="4" />
        <circle class="quote-chart-dot" cx="${endX.toFixed(1)}" cy="${endY.toFixed(1)}" r="4"><title>Year ${horizon} cumulative savings: ${pesoFormat(endValue)}</title></circle>
        <text class="quote-chart-end-label" x="${endX.toFixed(1)}" y="${endLabelY.toFixed(1)}" text-anchor="end">${pesoFormat(endValue)}</text>
        ${paybackMarkup}
        ${axisLabels}
      </svg>
    `;
  }

  function renderRecommendation(result, projection) {
    const coveragePct = Math.round(result.coverage * 100);
    const energyChargeLine = result.newMonthlyBill <= 0
      ? '<strong>Energy charge covered in full</strong>'
      : `Estimated energy charge: <strong>${pesoFormat(result.newMonthlyBill)}</strong> <span class="quote-scenario-was">(from ${pesoFormat(result.currentMonthlyBill)})</span>`;

    const projectionLine = projection.isPaidBackWithinHorizon
      ? `Paid back in <strong>~${result.roiYears.toFixed(1)} years</strong> — <strong>${pesoFormat(projection.netBenefitAtHorizon)}</strong> net benefit by year ${PROJECTION_HORIZON_YEARS}`
      : `Not yet paid back within ${PROJECTION_HORIZON_YEARS} years — <strong>${pesoFormat(projection.remaining)}</strong> of installed cost remaining`;

    const batteryLine = result.batteryKwh > 0
      ? `<li>Includes a <strong>${result.batteryKwh.toFixed(1)} kWh</strong> battery bank for power during outages</li>`
      : '';

    const rangeNote = result.exceedsReferenceRange
      ? '<p class="quote-scenario-was">Your usage is above our standard reference range — this uses our largest reference tier as a starting point; your final system will need a custom site assessment.</p>'
      : '';

    recommendationEl.innerHTML = `
      <div class="quote-scenario-card">
        <div class="quote-scenario-head">
          <span class="quote-scenario-badge">${result.productLabel}</span>
          <span class="quote-scenario-size" data-kwp="${result.pvKwp}">0 kWp</span>
        </div>
        <ul class="quote-scenario-facts">
          <li>Covers approximately <strong>${coveragePct}%</strong> of your usage</li>
          ${batteryLine}
          <li>Estimated installed cost: <strong>${pesoFormat(result.price)}</strong></li>
          <li>${energyChargeLine}</li>
          <li>Monthly savings: <strong>${pesoFormat(result.monthlySavings)}</strong> &middot; Annual savings: <strong>${pesoFormat(result.annualSavings)}</strong></li>
        </ul>
        ${rangeNote}
        <div class="quote-scenario-projection">
          <p class="quote-scenario-projection-label">${PROJECTION_HORIZON_YEARS}-Year Projection</p>
          ${buildProjectionChart(result, projection)}
          <p class="quote-scenario-projection-result">${projectionLine}</p>
        </div>
      </div>
    `;

    const sizeEl = recommendationEl.querySelector('.quote-scenario-size');
    animateValue(sizeEl, 0, result.pvKwp, 1200, (v) => v.toFixed(1) + ' kWp');
  }

  function buildAssumptions(result) {
    const common = [
      `Electricity at ${pesoRateFormat(pricing.electricity_rate_php_per_kwh)}/kWh, the Meralco residential rate for September 2026. Your rate will differ if another utility supplies you.`,
      'Fixed charges stay on your bill whatever you generate.',
      `Sized on ${pricing.peak_sun_hours} kWh per kWp per day (peak sun hours), a full-year average rather than a clear day.`,
    ];

    let productSpecific;
    if (result.productKey === 'hybrid') {
      productSpecific = 'Your battery is sized to your nighttime usage, and your panels are sized to fully recharge it every day — this system is designed to cover close to all of your usage.';
    } else if (result.productKey === 'ongrid_nm') {
      productSpecific = `This system is sized to cover your full monthly usage. Any surplus you export is credited at ${pesoRateFormat(pricing.export_credit_php_per_kwh)}/kWh — the generation charge, not the full retail rate.`;
    } else {
      productSpecific = "This system is sized to what your home uses during the day, without exporting power back to the grid — typically covering around 40% of your total usage, with the rest still drawn from the grid as usual.";
    }

    const items = [common[0], productSpecific, common[1], common[2]];
    assumptionsList.innerHTML = items.map((item) => `<li>${item}</li>`).join('');
  }

  function renderResults(result, projection, inputs) {
    statementNameEl.textContent = inputs.name ? `Estimate for ${inputs.name}` : 'Your Estimate';
    animateValue(statementKwhEl, 0, result.currentMonthlyKwh, 1200, (v) => Math.round(v).toLocaleString('en-US'));

    resultGridCost.textContent = pesoRateFormat(pricing.electricity_rate_php_per_kwh);
    resultSolarCost.textContent = pesoRateFormat(settings.solar_cost_php_per_kwh);

    renderRecommendation(result, projection);
    buildAssumptions(result);

    netMeteringNote.hidden = inputs.netMetering !== 'yes';

    const summary = `Solar estimate request: ~₱${Math.round(inputs.bill)}/mo bill, net metering: ${inputs.netMetering}, battery backup: ${inputs.batteryBackup}. Recommended ${result.productLabel} (~${result.pvKwp.toFixed(1)}kWp), estimated cost ${pesoFormat(result.price)}, new monthly bill ~${pesoFormat(result.newMonthlyBill)}.`;
    quoteCta.href = 'contact.html?prefill=' + encodeURIComponent(summary)
      + '&name=' + encodeURIComponent(inputs.name)
      + '&email=' + encodeURIComponent(inputs.email)
      + '&phone=' + encodeURIComponent(inputs.phone);

    resultsEl.hidden = false;
    requestAnimationFrame(() => {
      resultsEl.classList.add('is-visible');
      resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
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
    }).toString();

    fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    }).catch((err) => {
      console.error('Lead capture submission failed:', err);
    });
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
      };

      submitLead(inputs);

      playLoadingTransition(() => {
        const result = computeEstimate(inputs);
        const projection = computeProjection(result);
        renderResults(result, projection, inputs);
      });
    }
  });

  editAnswersBtn.addEventListener('click', () => {
    resultsEl.hidden = true;
    resultsEl.classList.remove('is-visible');
    formFieldsEl.hidden = false;
    formFieldsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
})();
