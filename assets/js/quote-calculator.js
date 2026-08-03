(() => {
  const form = document.getElementById('quoteForm');
  if (!form) return;

  const formFieldsEl = document.getElementById('quoteFormFields');
  const editAnswersBtn = document.getElementById('quoteEditAnswers');
  const billInput = document.getElementById('billInput');
  const billError = document.getElementById('billError');
  const kwhInput = document.getElementById('kwhInput');
  const reductionSlider = document.getElementById('reductionSlider');
  const reductionValue = document.getElementById('reductionValue');
  const netMeteringToggle = document.getElementById('netMeteringToggle');
  const netMeteringInput = document.getElementById('netMeteringInput');
  const loadingEl = document.getElementById('quoteLoading');
  const resultsEl = document.getElementById('quoteResults');
  const breakdownEl = document.getElementById('quoteBreakdown');
  const netMeteringNote = document.getElementById('netMeteringNote');
  const resultSystemSize = document.getElementById('resultSystemSize');
  const resultSavings = document.getElementById('resultSavings');
  const quoteCta = document.getElementById('quoteCta');
  const loadingVideo = document.getElementById('quoteLoadingVideo');
  const loadingSpinner = document.getElementById('quoteLoadingSpinner');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let settings = null;

  async function loadSettings() {
    const res = await fetch('content/quote-settings.yml');
    const text = await res.text();
    return jsyaml.load(text);
  }
  loadSettings().then((data) => { settings = data; }).catch((err) => console.error(err));

  reductionSlider.addEventListener('input', () => {
    reductionValue.textContent = reductionSlider.value + '%';
  });

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
      newMonthlyBill,
      currentMonthlyBill,
      monthlySavings,
      paybackYears,
      inverterType: inputs.netMetering === 'yes' ? 'grid-tied inverter' : 'hybrid inverter',
    };
  }

  function renderResults(result, inputs) {
    animateValue(resultSystemSize, 0, result.actualSystemKwp, 1200, (v) => v.toFixed(1) + ' kWp');
    animateValue(resultSavings, 0, result.monthlySavings, 1200, (v) => pesoFormat(v));

    const items = [
      `<strong>${result.panelCount} &times; ${result.panelWattage}W</strong> solar panels`,
      `Recommended <strong>~${result.recommendedInverterKw}kW ${result.inverterType}</strong>`,
      `Estimated installed cost: <strong>${pesoFormat(result.costLow)} &ndash; ${pesoFormat(result.costHigh)}</strong>`,
      `Estimated new monthly bill: <strong>${pesoFormat(result.newMonthlyBill)}</strong> (down from ${pesoFormat(result.currentMonthlyBill)})`,
    ];
    if (result.paybackYears) {
      items.push(`Estimated payback period: <strong>~${result.paybackYears.toFixed(1)} years</strong>`);
    }
    breakdownEl.innerHTML = items.map((item) => `<li>${item}</li>`).join('');

    netMeteringNote.hidden = inputs.netMetering !== 'yes';

    const summary = `Solar estimate request: ~₱${Math.round(inputs.bill)}/mo bill, ${inputs.reduction}% reduction target, net metering: ${inputs.netMetering}. Recommended ~${result.actualSystemKwp.toFixed(1)}kWp system (${result.panelCount}x ${result.panelWattage}W panels, ~${result.recommendedInverterKw}kW ${result.inverterType}), estimated cost ${pesoFormat(result.costLow)}-${pesoFormat(result.costHigh)}.`;
    quoteCta.href = 'contact.html?prefill=' + encodeURIComponent(summary);

    resultsEl.hidden = false;
    requestAnimationFrame(() => {
      resultsEl.classList.add('is-visible');
      resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const bill = parseFloat(billInput.value);
    if (!bill || bill <= 0) {
      billError.hidden = false;
      billInput.focus();
      return;
    }
    billError.hidden = true;

    if (!settings) {
      loadSettings().then((data) => { settings = data; submitEstimate(); }).catch((err) => console.error(err));
      return;
    }
    submitEstimate();

    function submitEstimate() {
      const inputs = {
        bill,
        kwh: parseFloat(kwhInput.value) || 0,
        reduction: parseFloat(reductionSlider.value),
        netMetering: netMeteringInput.value,
      };
      playLoadingTransition(() => {
        const result = computeEstimate(inputs);
        renderResults(result, inputs);
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
