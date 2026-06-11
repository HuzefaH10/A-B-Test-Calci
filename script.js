// Statistical calculations and UI logic for A/B Testing Calculator

// Tab Switching logic
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    document.getElementById(tabId).classList.add('active');
    
    if (tabId === 'sig-calc') {
        document.getElementById('tab-sig-calc').classList.add('active');
        calculateAByB();
    } else if (tabId === 'duration-calc') {
        document.getElementById('tab-duration-calc').classList.add('active');
        runPlanning();
    }
}

// Error Function Approximation (for Normal CDF)
function erf(x) {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = (x < 0) ? -1 : 1;
    const absX = Math.abs(x);

    const t = 1.0 / (1.0 + p * absX);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);

    return sign * y;
}

// Normal Cumulative Distribution Function
function normalCDF(x) {
    return 0.5 * (1 + erf(x / Math.sqrt(2)));
}

// Get Z-critical value based on confidence level
function getZCritical(confidence) {
    if (confidence === 0.90) return 1.64485;
    if (confidence === 0.95) return 1.95996;
    if (confidence === 0.99) return 2.57583;
    return 1.95996; // default 95%
}

// Get Z-power value based on power
function getZPower(power) {
    if (power === 0.80) return 0.84162;
    if (power === 0.90) return 1.28155;
    if (power === 0.95) return 1.64485;
    return 0.84162; // default 80%
}

// Primary significance calculation function
function calculateAByB() {
    const visitorsA = parseInt(document.getElementById('control-visitors').value) || 0;
    const conversionsA = parseInt(document.getElementById('control-conversions').value) || 0;
    const visitorsB = parseInt(document.getElementById('variant-visitors').value) || 0;
    const conversionsB = parseInt(document.getElementById('variant-conversions').value) || 0;
    const confThreshold = parseFloat(document.getElementById('confidence-level').value) || 0.95;

    // Validate inputs
    if (visitorsA <= 0 || visitorsB <= 0 || conversionsA < 0 || conversionsB < 0 || conversionsA > visitorsA || conversionsB > visitorsB) {
        updateResultsError();
        return;
    }

    // Conversion Rates
    const crA = conversionsA / visitorsA;
    const crB = conversionsB / visitorsB;

    // Standard Errors
    const seA = Math.sqrt((crA * (1 - crA)) / visitorsA);
    const seB = Math.sqrt((crB * (1 - crB)) / visitorsB);

    // Z-Score and p-value
    const seDiff = Math.sqrt((seA * seA) + (seB * seB));
    
    let zScore = 0;
    let pValue = 1.0;
    if (seDiff > 0) {
        zScore = (crB - crA) / seDiff;
        // Two-tailed p-value
        pValue = 2 * (1 - normalCDF(Math.abs(zScore)));
    }

    const confidence = 1 - pValue;
    const relativeLift = crA > 0 ? ((crB - crA) / crA) * 100 : 0;
    const isSignificant = confidence >= confThreshold;

    // Confidence Intervals (ranges)
    const zCrit = getZCritical(confThreshold);
    const marginA = zCrit * seA;
    const marginB = zCrit * seB;

    const lowerA = Math.max(0, crA - marginA);
    const upperA = Math.min(1, crA + marginA);
    const lowerB = Math.max(0, crB - marginB);
    const upperB = Math.min(1, crB + marginB);

    // Update UI Stats
    document.getElementById('control-rate').textContent = (crA * 100).toFixed(2) + '%';
    document.getElementById('control-bounds').textContent = `±${(marginA * 100).toFixed(2)}% range`;

    document.getElementById('variant-rate').textContent = (crB * 100).toFixed(2) + '%';
    document.getElementById('variant-bounds').textContent = `±${(marginB * 100).toFixed(2)}% range`;

    const liftSign = relativeLift >= 0 ? '+' : '';
    const liftElement = document.getElementById('relative-lift');
    liftElement.textContent = liftSign + relativeLift.toFixed(2) + '%';
    liftElement.style.color = relativeLift >= 0 ? 'var(--color-success)' : 'var(--color-danger)';

    document.getElementById('p-value-val').textContent = `p-value: ${pValue.toFixed(4)}`;

    // Update Badges & Verdict UI
    const badge = document.getElementById('sig-badge');
    const verdictCard = document.getElementById('verdict-card');
    const verdictHeading = document.getElementById('verdict-heading');
    const verdictTitleText = document.getElementById('verdict-title-text');
    const verdictBody = document.getElementById('verdict-body');
    const verdictIcon = document.getElementById('verdict-icon');

    // Reset styles
    badge.className = 'status-badge';
    verdictCard.className = 'verdict-box';

    if (isSignificant) {
        if (crB > crA) {
            // Variation B is winner
            badge.classList.add('significant');
            badge.textContent = 'Significant Winner';
            
            verdictCard.classList.add('winner-variation');
            verdictTitleText.textContent = 'Variation B is a Winner!';
            verdictBody.innerHTML = `Variation (B) conversion rate of <strong>${(crB * 100).toFixed(2)}%</strong> is statistically significantly higher than Control (A) rate of <strong>${(crA * 100).toFixed(2)}%</strong>. You can implement this change with <strong>${(confidence * 100).toFixed(1)}% confidence</strong>. The observed lift is <strong>${relativeLift.toFixed(1)}%</strong>.`;
            verdictIcon.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        } else {
            // Control A is winner
            badge.classList.add('not-significant');
            badge.textContent = 'Significant Control';
            
            verdictCard.classList.add('winner-control');
            verdictTitleText.textContent = 'Control A is Outperforming!';
            verdictBody.innerHTML = `Control (A) conversion rate of <strong>${(crA * 100).toFixed(2)}%</strong> is statistically significantly higher than Variation (B) rate of <strong>${(crB * 100).toFixed(2)}%</strong>. The Variation performed worse by <strong>${Math.abs(relativeLift).toFixed(1)}%</strong>. It is advised to keep the Control variant.`;
            verdictIcon.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
        }
    } else {
        // Not statistically significant
        badge.classList.add('neutral');
        badge.textContent = 'No Significance';
        
        verdictCard.classList.add('no-winner');
        verdictTitleText.textContent = 'No Statistical Significance Yet';
        verdictBody.innerHTML = `There is not enough evidence to conclude that one variant outperforms the other at the <strong>${(confThreshold * 100).toFixed(0)}% confidence level</strong>. The current confidence level is <strong>${(confidence * 100).toFixed(1)}%</strong> (p-value: ${pValue.toFixed(4)}). We recommend continuing the test to gather more data.`;
        verdictIcon.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }

    // Update progress bar visuals
    const maxVal = Math.max(crA, crB) * 1.5 || 0.1; // scale factor
    const pctA = (crA / maxVal) * 100;
    const pctB = (crB / maxVal) * 100;

    document.getElementById('control-bar-fill').style.width = Math.min(100, pctA) + '%';
    document.getElementById('variant-bar-fill').style.width = Math.min(100, pctB) + '%';
    document.getElementById('control-percentage-lbl').textContent = (crA * 100).toFixed(2) + '%';
    document.getElementById('variant-percentage-lbl').textContent = (crB * 100).toFixed(2) + '%';

    // Render Confidence Intervals in the axis container
    // We map [0, maxVal] to [5%, 95%] horizontal space of the container
    const minPlotVal = 0;
    const maxPlotVal = Math.max(upperA, upperB) * 1.2;
    const mapValToPercent = (val) => {
        const pct = ((val - minPlotVal) / (maxPlotVal - minPlotVal)) * 90 + 5;
        return Math.max(5, Math.min(95, pct));
    };

    const leftA = mapValToPercent(lowerA);
    const rightA = mapValToPercent(upperA);
    const centerA = mapValToPercent(crA);

    const leftB = mapValToPercent(lowerB);
    const rightB = mapValToPercent(upperB);
    const centerB = mapValToPercent(crB);

    const cMarker = document.getElementById('c-int-marker');
    cMarker.style.left = leftA + '%';
    cMarker.style.width = (rightA - leftA) + '%';

    const vMarker = document.getElementById('v-int-marker');
    vMarker.style.left = leftB + '%';
    vMarker.style.width = (rightB - leftB) + '%';
}

function updateResultsError() {
    document.getElementById('control-rate').textContent = '0.00%';
    document.getElementById('control-bounds').textContent = '±0.00% range';
    document.getElementById('variant-rate').textContent = '0.00%';
    document.getElementById('variant-bounds').textContent = '±0.00% range';
    document.getElementById('relative-lift').textContent = '0.00%';
    document.getElementById('relative-lift').style.color = 'var(--text-muted)';
    document.getElementById('p-value-val').textContent = 'p-value: 1.0000';
    
    const badge = document.getElementById('sig-badge');
    badge.className = 'status-badge neutral';
    badge.textContent = 'Invalid Inputs';

    const verdictCard = document.getElementById('verdict-card');
    verdictCard.className = 'verdict-box no-winner';
    document.getElementById('verdict-title-text').textContent = 'Invalid Input Values';
    document.getElementById('verdict-body').textContent = 'Conversions cannot exceed visitors, and all inputs must be positive numbers.';
}

// History Management
function getHistory() {
    try {
        return JSON.parse(localStorage.getItem('ab_test_history')) || [];
    } catch (e) {
        return [];
    }
}

function saveToHistory() {
    const visitorsA = parseInt(document.getElementById('control-visitors').value) || 0;
    const conversionsA = parseInt(document.getElementById('control-conversions').value) || 0;
    const visitorsB = parseInt(document.getElementById('variant-visitors').value) || 0;
    const conversionsB = parseInt(document.getElementById('variant-conversions').value) || 0;
    
    if (visitorsA <= 0 || visitorsB <= 0 || conversionsA < 0 || conversionsB < 0 || conversionsA > visitorsA || conversionsB > visitorsB) {
        return;
    }

    const crA = conversionsA / visitorsA;
    const crB = conversionsB / visitorsB;
    const lift = crA > 0 ? ((crB - crA) / crA) * 100 : 0;
    
    const item = {
        id: Date.now(),
        date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        visitorsA,
        conversionsA,
        visitorsB,
        conversionsB,
        crA: (crA * 100).toFixed(2),
        crB: (crB * 100).toFixed(2),
        lift: lift.toFixed(1)
    };

    let history = getHistory();
    // Keep max 5 items
    history.unshift(item);
    history = history.slice(0, 5);
    localStorage.setItem('ab_test_history', JSON.stringify(history));
    renderHistory();
}

function renderHistory() {
    const historyList = document.getElementById('history-list-box');
    const history = getHistory();

    if (history.length === 0) {
        historyList.innerHTML = `<div style="color: var(--text-muted); text-align: center; padding: 1.5rem; font-size: 0.85rem;">No saved calculations yet.</div>`;
        return;
    }

    historyList.innerHTML = '';
    history.forEach(item => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.onclick = () => loadHistoryItem(item);

        const isPositive = parseFloat(item.lift) >= 0;
        const badgeClass = isPositive ? 'status-badge significant' : 'status-badge not-significant';
        const badgeSign = isPositive ? '+' : '';

        div.innerHTML = `
            <div class="history-item-meta">
                <span class="history-item-title">A: ${item.crA}% (${item.visitorsA}) vs B: ${item.crB}% (${item.visitorsB})</span>
                <span class="history-item-date">${item.date}</span>
            </div>
            <span class="history-item-badge ${isPositive ? 'winner-variation' : 'winner-control'}" style="background: ${isPositive ? 'var(--color-success-glow)' : 'rgba(244, 63, 94, 0.15)'}; color: ${isPositive ? '#6ee7b7' : '#fda4af'}; padding: 0.25rem 0.5rem; border-radius: 6px; font-weight: 700;">
                ${badgeSign}${item.lift}% Lift
            </span>
        `;
        historyList.appendChild(div);
    });
}

function loadHistoryItem(item) {
    document.getElementById('control-visitors').value = item.visitorsA;
    document.getElementById('control-conversions').value = item.conversionsA;
    document.getElementById('variant-visitors').value = item.visitorsB;
    document.getElementById('variant-conversions').value = item.conversionsB;
    calculateAByB();
}

function clearHistory() {
    localStorage.removeItem('ab_test_history');
    renderHistory();
}

// Pre-test Sample Size and Duration Planner logic
function runPlanning() {
    const baselinePct = parseFloat(document.getElementById('baseline-rate').value) || 5.0;
    const mdePct = parseFloat(document.getElementById('mde-rate').value) || 10.0;
    const dailyTraffic = parseInt(document.getElementById('daily-visitors').value) || 1500;
    const power = parseFloat(document.getElementById('stats-power').value) || 0.80;
    const sigLevel = parseFloat(document.getElementById('planner-sig').value) || 0.05;

    // Update slider readouts
    document.getElementById('baseline-val-lbl').textContent = baselinePct.toFixed(1) + '%';
    document.getElementById('mde-val-lbl').textContent = mdePct.toFixed(1) + '%';
    document.getElementById('daily-traffic-lbl').textContent = `at ${dailyTraffic.toLocaleString()} visitors/day`;

    if (baselinePct <= 0 || mdePct <= 0 || dailyTraffic <= 0) {
        return;
    }

    const p1 = baselinePct / 100;
    // MDE is relative: p2 = p1 * (1 + relative_mde)
    const relativeMDE = mdePct / 100;
    const p2 = p1 * (1 + relativeMDE);
    const absDiff = Math.abs(p2 - p1);

    if (absDiff === 0) return;

    // Critical values
    const zAlpha = getZCritical(1 - sigLevel); // e.g. 1.96 for 5% sig level (two-tailed)
    const zBeta = getZPower(power);            // e.g. 0.84 for 80% power (one-tailed)

    // Standard Sample Size formula for comparison of two proportions:
    // n = [Z_alpha/2 * sqrt(2*p_avg*(1-p_avg)) + Z_beta * sqrt(p1*(1-p1) + p2*(1-p2))]^2 / (p1 - p2)^2
    // A common simplified formula used is:
    // n = 2 * (Z_alpha/2 + Z_beta)^2 * p_avg * (1 - p_avg) / (p1 - p2)^2
    const pAvg = (p1 + p2) / 2;
    const num = 2 * Math.pow(zAlpha + zBeta, 2) * pAvg * (1 - pAvg);
    const den = Math.pow(p1 - p2, 2);
    
    let sampleSize = Math.ceil(num / den);

    // Safeguard minimum sample size
    if (sampleSize < 10) sampleSize = 10;

    const totalSize = sampleSize * 2;
    const durationDays = Math.ceil(totalSize / dailyTraffic);

    // Update UI
    document.getElementById('sample-size-per-var').textContent = sampleSize.toLocaleString();
    document.getElementById('sample-size-total').textContent = totalSize.toLocaleString();
    document.getElementById('projected-days').textContent = durationDays + (durationDays === 1 ? ' day' : ' days');
    document.getElementById('span-sample-size').textContent = sampleSize.toLocaleString();
}

// Initialization on DOM content load
document.addEventListener('DOMContentLoaded', () => {
    // Initial runs
    calculateAByB();
    runPlanning();
    renderHistory();
});
