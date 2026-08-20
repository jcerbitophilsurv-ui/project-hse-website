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
  const phoneError = document.getElementById('phoneError');
  const netMeteringToggle = document.getElementById('netMeteringToggle');
  const netMeteringInput = document.getElementById('netMeteringInput');
  const loadingEl = document.getElementById('quoteLoading');
  const resultsEl = document.getElementById('quoteResults');
  const netMeteringNote = document.getElementById('netMeteringNote');
  const statementNameEl = document.getElementById('quoteStatementName');
  const statementKwhEl = document.getElementById('quoteStatementKwh');
  const resultGridCost = document.getElementById('resultGridCost');
  const resultSolarCost = document.getElementById('resultSolarCost');
  const scenariosEl = document.getElementById('quoteScenarios');
  const quoteCta = document.getElementById('quoteCta');
  const loadingVideo = document.getElementById('quoteLoadingVideo');
  const loadingSpinner = document.getElementById('quoteLoadingSpinner');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const SCENARIOS = [50, 70, 100];

  let settings = null;

  async function loadSettings() {
    const res = await fetch('content/quote-settings.yml');
    const text = await res.text();
    return jsyaml.load(text);
  }
  loadSettings().then((data) => { settings = data; }).catch((err) => console.error(err));

  netMeteringToggle.querySelectorAll('.toggle-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      netMeteringToggle.querySelectorAll('.toggle-btn').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      netMeteringInput.value = btn.dataset.value;
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

  function computeEstimate(inputs) {
    const {
      electricity_rate_php_per_kwh: rate,
      yield_kwh_per_kwp_per_day: yieldPerDay,
      panel_wattage_w: panelWattage,
      cost_per_kwp_ongrid_low: ongridLow,
      cost_per_kwp_ongrid_high: ongridHigh,
      cost_per_kwp_hybrid_low: hybridLow,
      cost_per_kwp_hybrid_high: hybridHigh,
      inverter_sizes_kw: inverterSizes,
    } = settings;

    const currentMonthlyKwh = inputs.kwh > 0 ? inputs.kwh : inputs.bill / rate;
    const targetOffsetKwhPerMonth = currentMonthlyKwh * (inputs.reduction / 100);
    const requiredKwp = (targetOffsetKwhPerMonth / 30) / yieldPerDay;
    const panelCount = Math.max(1, Math.ceil((requiredKwp * 1000) / panelWattage));
    const actualSystemKwp = (panelCount * panelWattage) / 1000;

    const sortedSizes = inverterSizes.map((s) => s.size).sort((a, b) => a - b);
    const recommendedInverterKw = sortedSizes.find((s) => s >= actualSystemKwp) || sortedSizes[sortedSizes.length - 1];

    const [costLow, costHigh] = inputs.netMetering === 'yes'
      ? [actualSystemKwp * ongridLow, actualSystemKwp * ongridHigh]
      : [actualSystemKwp * hybridLow, actualSystemKwp * hybridHigh];

    const estimatedMonthlyProductionKwh = actualSystemKwp * yieldPerDay * 30;
    const newMonthlyKwh = Math.max(0, currentMonthlyKwh - estimatedMonthlyProductionKwh);
    const currentMonthlyBill = currentMonthlyKwh * rate;
    const newMonthlyBill = newMonthlyKwh * rate;
    const monthlySavings = currentMonthlyBill - newMonthlyBill;
    const avgCost = (costLow + costHigh) / 2;
    const paybackYears = monthlySavings > 0 ? avgCost / (monthlySavings * 12) : null;

    return {
      actualSystemKwp,
      panelCount,
      panelWattage,
      recommendedInverterKw,
      costLow,
      costHigh,
      avgCost,
      currentMonthlyKwh,
      newMonthlyBill,
      currentMonthlyBill,
      monthlySavings,
      paybackYears,
      inverterType: inputs.netMetering === 'yes' ? 'grid-tied inverter' : 'hybrid inverter',
    };
  }

  function computeProjection(result) {
    const annualSavings = result.monthlySavings * 12;
    const cumulative5yr = annualSavings * 5;
    const remaining = Math.max(0, result.avgCost - cumulative5yr);
    const netBenefit5yr = cumulative5yr - result.avgCost;
    const isPaidBackWithin5yr = result.paybackYears !== null && result.paybackYears <= 5;
    const savingsByYear = [0, 1, 2, 3, 4, 5].map((year) => result.monthlySavings * 12 * year);
    return { annualSavings, cumulative5yr, remaining, netBenefit5yr, isPaidBackWithin5yr, savingsByYear };
  }

  // Small inline chart: cumulative savings (accent line) against the investment
  // cost (a dashed gray threshold, direct-labeled — not a second "series").
  function buildProjectionChart(result, projection) {
    const W = 320, H = 150;
    const padL = 8, padR = 8, padT = 16, padB = 26;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;
    const maxY = Math.max(result.avgCost, projection.savingsByYear[5], 1) * 1.15;

    const x = (year) => padL + (year / 5) * plotW;
    const y = (value) => padT + plotH - (value / maxY) * plotH;

    const thresholdY = y(result.avgCost);
    const linePoints = projection.savingsByYear.map((v, year) => `${x(year).toFixed(1)},${y(v).toFixed(1)}`).join(' ');

    const endYear = 5;
    const endValue = projection.savingsByYear[endYear];
    const endX = x(endYear);
    const endY = y(endValue);
    const endLabelY = endY < thresholdY ? endY - 10 : endY + 16;

    let paybackMarkup = '';
    if (projection.isPaidBackWithin5yr) {
      const py = result.paybackYears;
      const px = x(py);
      const paybackAnchor = px < 50 ? 'start' : px > (W - 50) ? 'end' : 'middle';
      paybackMarkup = `
        <circle class="quote-chart-payback-dot" cx="${px.toFixed(1)}" cy="${thresholdY.toFixed(1)}" r="5"><title>Paid back in ${py.toFixed(1)} years</title></circle>
        <text class="quote-chart-payback-label" x="${px.toFixed(1)}" y="${(thresholdY - 12).toFixed(1)}" text-anchor="${paybackAnchor}">Paid back ~${py.toFixed(1)}yr</text>
      `;
    }

    const axisLabels = [0, 1, 2, 3, 4, 5].map((yr) => {
      const anchor = yr === 0 ? 'start' : yr === 5 ? 'end' : 'middle';
      return `<text class="quote-chart-axis-label" x="${x(yr).toFixed(1)}" y="${H - 6}" text-anchor="${anchor}">Yr ${yr}</text>`;
    }).join('');

    return `
      <svg class="quote-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="5-year cumulative savings versus investment cost">
        <line class="quote-chart-threshold" x1="${x(0).toFixed(1)}" y1="${thresholdY.toFixed(1)}" x2="${x(5).toFixed(1)}" y2="${thresholdY.toFixed(1)}" />
        <text class="quote-chart-threshold-label" x="${x(0).toFixed(1)}" y="${(thresholdY - 6).toFixed(1)}">Investment: ${pesoFormat(result.avgCost)}</text>
        <polyline class="quote-chart-savings-line" points="${linePoints}" />
        <circle class="quote-chart-dot" cx="${x(0).toFixed(1)}" cy="${y(0).toFixed(1)}" r="4" />
        <circle class="quote-chart-dot" cx="${endX.toFixed(1)}" cy="${endY.toFixed(1)}" r="4"><title>Year 5 cumulative savings: ${pesoFormat(endValue)}</title></circle>
        <text class="quote-chart-end-label" x="${endX.toFixed(1)}" y="${endLabelY.toFixed(1)}" text-anchor="end">${pesoFormat(endValue)}</text>
        ${paybackMarkup}
        ${axisLabels}
      </svg>
    `;
  }

  function runScenarios(inputs) {
    return SCENARIOS.map((reduction) => {
      const result = computeEstimate({ ...inputs, reduction });
      const projection = computeProjection(result);
      return { reduction, result, projection };
    });
  }

  function renderScenarioCard({ reduction, result, projection }) {
    const projectionLine = projection.isPaidBackWithin5yr
      ? `Paid back in <strong>~${result.paybackYears.toFixed(1)} years</strong> — <strong>${pesoFormat(projection.netBenefit5yr)}</strong> net benefit by year 5`
      : `Not yet paid back within 5 years — <strong>${pesoFormat(projection.remaining)}</strong> of installed cost remaining`;

    return `
      <div class="quote-scenario-card">
        <div class="quote-scenario-head">
          <span class="quote-scenario-badge">${reduction}% Bill Reduction</span>
          <span class="quote-scenario-size" data-kwp="${result.actualSystemKwp}">0 kWp</span>
        </div>
        <ul class="quote-scenario-facts">
          <li><strong>${result.panelCount} &times; ${result.panelWattage}W</strong> solar panels</li>
          <li>Recommended <strong>~${result.recommendedInverterKw}kW ${result.inverterType}</strong></li>
          <li>Estimated installed cost: <strong>${pesoFormat(result.costLow)} &ndash; ${pesoFormat(result.costHigh)}</strong></li>
          <li>New monthly bill: <strong>${pesoFormat(result.newMonthlyBill)}</strong> <span class="quote-scenario-was">(from ${pesoFormat(result.currentMonthlyBill)})</span></li>
          <li>Monthly savings: <strong>${pesoFormat(result.monthlySavings)}</strong> &middot; Annual savings: <strong>${pesoFormat(projection.annualSavings)}</strong></li>
        </ul>
        <div class="quote-scenario-projection">
          <p class="quote-scenario-projection-label">5-Year Projection</p>
          ${buildProjectionChart(result, projection)}
          <p class="quote-scenario-projection-result">${projectionLine}</p>
        </div>
      </div>
    `;
  }

  function renderResults(scenarios, inputs) {
    statementNameEl.textContent = inputs.name ? `Estimate for ${inputs.name}` : 'Your Estimate';
    animateValue(statementKwhEl, 0, scenarios[0].result.currentMonthlyKwh, 1200, (v) => Math.round(v).toLocaleString('en-US'));

    resultGridCost.textContent = pesoRateFormat(settings.electricity_rate_php_per_kwh);
    resultSolarCost.textContent = pesoRateFormat(settings.solar_cost_php_per_kwh);

    scenariosEl.innerHTML = scenarios.map(renderScenarioCard).join('');
    scenariosEl.querySelectorAll('.quote-scenario-size').forEach((el) => {
      const kwp = parseFloat(el.dataset.kwp);
      animateValue(el, 0, kwp, 1200, (v) => v.toFixed(1) + ' kWp');
    });

    netMeteringNote.hidden = inputs.netMetering !== 'yes';

    const scenarioSummary = scenarios.map(({ reduction, result }) =>
      `${reduction}% reduction → ~${result.actualSystemKwp.toFixed(1)}kWp (${result.panelCount}x ${result.panelWattage}W, ~${result.recommendedInverterKw}kW ${result.inverterType}), est. cost ${pesoFormat(result.costLow)}-${pesoFormat(result.costHigh)}, new bill ~${pesoFormat(result.newMonthlyBill)}/mo.`
    ).join(' ');
    const summary = `Solar estimate request: ~₱${Math.round(inputs.bill)}/mo bill, net metering: ${inputs.netMetering}. ${scenarioSummary}`;
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

    if (!phoneInput.value.trim()) {
      phoneError.hidden = false;
      firstInvalid = firstInvalid || phoneInput;
    } else {
      phoneError.hidden = true;
    }

    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    if (!settings) {
      loadSettings().then((data) => { settings = data; submitEstimate(); }).catch((err) => console.error(err));
      return;
    }
    submitEstimate();

    function submitEstimate() {
      const inputs = {
        bill,
        kwh: parseFloat(kwhInput.value) || 0,
        netMetering: netMeteringInput.value,
        name: nameInput.value.trim(),
        email: emailInput.value.trim(),
        phone: phoneInput.value.trim(),
      };

      submitLead(inputs);

      playLoadingTransition(() => {
        const scenarios = runScenarios(inputs);
        renderResults(scenarios, inputs);
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
