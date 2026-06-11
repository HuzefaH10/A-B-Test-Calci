# 📊 A/B Testing Calculator (A-B-Test-Calci)

A high-fidelity, interactive, and statistically rigorous A/B Testing Calculator built with pure HTML, CSS, and JavaScript. Designed for product managers, growth hackers, and data analysts to quickly assess test results and plan experimental requirements with a premium dark-mode interface.

## 🚀 Live Demo & Features

- **📊 Tab 1: Significance Calculator (Post-Test Analysis)**
  - Computes conversion rates, standard error of difference, and absolute/relative lift.
  - Computes exact **p-values** and **Z-scores** using standard normal distribution models.
  - Evaluates statistical significance based on selected confidence thresholds (90%, 95%, or 99%).
  - Renders dynamic **Confidence Interval Range Bars** (using standard error ranges) to visualize overlap.
  - Provides natural language interpretation and clear recommendations on what action to take next.
  - Stores up to 5 previous calculations locally in your browser (`localStorage`) for quick comparisons.

- **📅 Tab 2: Sample Size & Duration Planner (Pre-Test Planning)**
  - Computes the minimum sample size required per variant to detect desired changes.
  - Dynamically updates based on baseline conversion rate and Minimum Detectable Effect (MDE).
  - Estimates the total run-time duration in days based on your daily traffic volume.
  - Supports custom Statistical Power configuration (80%, 90%, 95%) and Significance Level ($\alpha$).
  - Built-in reminder of experimentation best practices (avoiding early stopping, maintaining balanced traffic, and full-week scheduling).

## 🛠️ Tech Stack

- **Structure**: Semantic HTML5
- **Styling**: Modern, premium CSS (featuring CSS Variables, flexbox/grid layouts, glassmorphism backdrop filters, custom slider tracks, and glowing state indicators)
- **Scripting**: Native ES6+ JavaScript (including statistical approximation algorithms for the Normal Cumulative Distribution Function $\Phi(x)$)

## 📖 Statistical Methods Used

### 1. Conversion Rate (CR)
$$\text{Conversion Rate} = \frac{\text{Conversions}}{\text{Visitors}}$$

### 2. Standard Error (SE) for Proportions
$$\text{SE} = \sqrt{\frac{p(1 - p)}{N}}$$

### 3. Z-Score (Standard Score)
$$Z = \frac{p_B - p_A}{\sqrt{\text{SE}_A^2 + \text{SE}_B^2}}$$

### 4. P-Value (Two-Tailed)
$$p = 2 \times (1 - \Phi(|Z|))$$
*Calculated using a high-accuracy polynomial approximation of the error function ($erf$).*

### 5. Required Sample Size per Variant
$$n \approx \frac{2 \cdot (Z_{\alpha/2} + Z_{\beta})^2 \cdot \bar{p}(1 - \bar{p})}{(p_B - p_A)^2}$$
Where:
- $\bar{p}$ is the average conversion rate between the two variants.
- $Z_{\alpha/2}$ is the significance boundary (e.g., $1.96$ for $\alpha = 0.05$).
- $Z_{\beta}$ is the power boundary (e.g., $0.84$ for power $= 0.80$).

## 💻 Local Setup & Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/HuzefaH10/A-B-Test-Calci.git
   ```
2. **Navigate into the folder:**
   ```bash
   cd A-B-Test-Calci
   ```
3. **Open `index.html`** in any web browser to run the application instantly.
