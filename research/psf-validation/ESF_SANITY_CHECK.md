# ESF sanity-check analysis

## Source and method
Source: Sawyers & Sawyer (2026), dataset DOI https://doi.org/10.25422/azu.data.32080626; CC BY 4.0. Derived analysis; original workbook unchanged.
Input: ESFSystemData.xlsx / Multifocal!A1:N52. Workbook SHA256: 85e816e92a7fdc9ff2c1e732b60898a5c55efa2b2ac55940badf066f44ec20fd.
Three measurements: 50 S = C:E; 50 T = F:H; 100 S = I:K; 100 T = L:N. Rows 3–52: 50 samples each.
Original axis: B[row] = A[row] − $A$29; A29 = 18.2625535271281 D. Cached formulas independently checked against subtraction.
Range -4.480115542185 to 4.550901884219 D; nonuniform intervals 0.160642001738–0.210541278410 D.
Positive defocus means Position > A29 in this workbook. Clinical sign convention, lens-plane conversion and physical zero are not established by that formula.
Three measurements share this exact axis and reference. No extra nonzero common offset is evident from their common 0-D peaks; shared reference alone does not prove absolute calibration.
All interior local maxima are retained (scipy find_peaks; no smoothing/interpolation/threshold/minimum distance). Endpoints cannot be two-sided maxima. Plateau boundaries retained; no invented sub-sample location.
Primary three candidates = highest local-maximum heights; prominence rank also retained. Ranking is within each ESF channel only, with no use of optical-add labels or PSF magnitude.
S/T averages = (S+T)/2 at the same row within each measurement. Original S and T remain in the sample CSV.

## Top three candidates per measurement and channel (D)

| Measurement | Channel | By height (in defocus order) | By prominence (in defocus order) |
|---|---|---|---|
| 1 | 50 S | +0.000000, +1.905527, +2.899795 | +0.000000, +1.905527, +2.899795 |
| 1 | 50 T | +0.000000, +1.905527, +2.899795 | -2.321258, +0.000000, +2.899795 |
| 1 | 100 S | +0.000000, +0.560324, +2.899795 | +0.000000, +1.710055, +2.899795 |
| 1 | 100 T | +0.000000, +2.299832, +2.899795 | -0.912968, +0.000000, +2.899795 |
| 1 | 50 ST average | +0.000000, +1.905527, +2.899795 | +0.000000, +1.905527, +2.899795 |
| 1 | 100 ST average | +0.000000, +2.299832, +2.899795 | +0.000000, +2.299832, +2.899795 |
| 2 | 50 S | +0.000000, +2.102117, +2.899795 | +0.000000, +0.939213, +2.899795 |
| 2 | 50 T | +0.000000, +1.905527, +2.899795 | +0.000000, +1.905527, +2.899795 |
| 2 | 100 S | +0.000000, +0.560324, +2.899795 | +0.000000, +0.560324, +2.899795 |
| 2 | 100 T | +0.000000, +2.102117, +2.899795 | +0.000000, +2.102117, +2.899795 |
| 2 | 50 ST average | +0.000000, +2.102117, +2.899795 | +0.000000, +0.939213, +2.899795 |
| 2 | 100 ST average | +0.000000, +2.102117, +2.899795 | +0.000000, +2.102117, +2.899795 |
| 3 | 50 S | +0.000000, +1.905527, +2.899795 | +0.000000, +1.905527, +2.899795 |
| 3 | 50 T | +0.000000, +1.905527, +2.899795 | +0.000000, +1.905527, +2.899795 |
| 3 | 100 S | +0.000000, +2.102117, +2.899795 | -1.092487, +0.000000, +2.899795 |
| 3 | 100 T | +0.000000, +2.102117, +2.899795 | +0.000000, +2.899795, +3.510129 |
| 3 | 50 ST average | +0.000000, +1.905527, +2.899795 | +0.000000, +1.905527, +2.899795 |
| 3 | 100 ST average | +0.000000, +2.102117, +2.899795 | -1.092487, +0.000000, +2.899795 |

## Peak spacing in S/T averages

| Measurement | Frequency | zero to intermediate candidate | intermediate to third | zero to third |
|---|---|---|---|---|
| 1 | 50 lp/mm | 1.905527 D | 0.994268 D | 2.899795 D |
| 1 | 100 lp/mm | 2.299832 D | 0.599963 D | 2.899795 D |
| 2 | 50 lp/mm | 2.102117 D | 0.797678 D | 2.899795 D |
| 2 | 100 lp/mm | 2.102117 D | 0.797678 D | 2.899795 D |
| 3 | 50 lp/mm | 1.905527 D | 0.994268 D | 2.899795 D |
| 3 | 100 lp/mm | 2.102117 D | 0.797678 D | 2.899795 D |

## Interpretation and PSF comparison
50 lp/mm: all raw S/T channels and S/T averages have top-by-height peaks at 0, +1.905527 to +2.102117, and +2.899795 D. The middle peak is weaker; prominence ranking sometimes selects a different local bump.
100 lp/mm: two strongest focal regions (0 and +2.899795 D) are stable. Middle-side structure remains visible in S/T averages (+2.102117 to +2.299832 D), but individual channels/selection rules are less consistent. 100 S M1/M2 rank +0.560324 D among the highest three; do not relabel it as an intermediate optical focus.
The three 50-lp/mm average peak sets are 0/1.905527/2.899795, 0/2.102117/2.899795, 0/1.905527/2.899795 D. Middle variation is one original grid interval (0.196590 D). The 100-lp/mm average middle candidate spans one interval (0.197715 D).
Relative to the user-supplied nominal optical adds 2.2/3.2 D, 50-lp/mm middle positions differ by −0.294473 to −0.097883 D and the third by −0.300205 D. Their spacing is compatible with a roughly 2/3-D structure, but exact optical-add equivalence is unverified. This is not evidence to apply a +0.3-D correction: the zero peak already lies at 0 D.
ESF and PSF measurements are NOT paired repetitions and PSF x/y are not established as equivalent to ESF S/T. Only original-axis positions are compared; no cross-system MTF magnitude comparison or average is made.
PSF author 50x: zero peak = 0 D for M1–M5. Dominant positive lobe = +2.75, +2.50, +2.50, +2.00, +1.75 D respectively. Versus ESF middle range, signed differences span −0.352117 to +0.844473 D; versus ESF third +2.899795 D they span −1.149795 to −0.149795 D. Neither proves which optical focus that broad PSF lobe represents.
PSF mean 50x curve has a broad positive maximum at +2.25 D: +0.147883 to +0.344473 D relative to ESF middle, or −0.649795 D relative to ESF third. It cannot be counted as a successful match to both ESF peaks. The prior PSF −3.50-D weak candidate has no supported correspondence to ESF third; no sign reversal is applied.
Full pairwise location differences for both PSF branches and all four directional samples are in ESF_PSF_peak_position_comparison.csv. Original PSF values/results remain unchanged.

## Priority for investigation
First audit actual bench position → defocus mapping and per-measurement alignment. ESF uses a nonuniform position-derived axis; PSF uses a nominal uniform 0.25-D index mapping. They cannot be equated without calibration. Stable ESF peaks but a 1-D shift of the PSF positive lobe warrant checking stage position, magnification/calibration and acquisition alignment—not shifting data to fit ESF.
Background processing remains an independent priority for PSF energy/MTF reliability, given the previous negative-pixel and border-energy diagnostics. Peak positions alone cannot establish that background is the cause. A shared constant offset cannot by itself explain a stable zero peak and a moving positive lobe.
No production files, evidence JSON, PSF data, defocus signs or convolution pipeline were changed.

## Reproduce
Dependencies: existing PSF analysis requirements plus openpyxl (read-only import).
python3 research/psf-validation/esf_sanity_check.py --dataset /path/to/32080626.zip --psf-results research/psf-validation/generated/outputs/through_focus_mtf.csv --output research/psf-validation/generated/esf

## Full local-maxima locations
All locations below are original sampled coordinates; full precision, source row, height and prominence are in ESF_raw_peak_table.csv.

- M1 50 S: -3.995546, -3.668048, -2.148657, +0.000000, +0.749230, +1.905527, +2.899795
- M1 50 T: -3.995546, -2.321258, -1.092487, +0.000000, +0.939213, +1.905527, +2.899795
- M1 100 S: -3.995546, -3.668048, -2.492899, -1.092487, +0.000000, +0.560324, +0.939213, +1.710055, +2.102117, +2.899795, +3.715911
- M1 100 T: -3.832247, -3.336925, -2.833324, -2.148657, -1.800545, -1.270998, -0.912968, +0.000000, +0.939213, +1.515695, +2.299832, +2.899795, +3.715911, +4.131020
- M1 50 ST average: -3.995546, -2.321258, +0.000000, +1.905527, +2.899795
- M1 100 ST average: -3.995546, -3.668048, -2.833324, -2.148657, -1.800545, -0.912968, +0.000000, +0.939213, +2.299832, +2.899795, +3.715911
- M2 50 S: -4.157953, -3.502943, -2.492899, -1.448506, +0.000000, +0.939213, +2.102117, +2.899795
- M2 50 T: -4.319474, -3.995546, -3.336925, -2.321258, -1.625020, -0.912968, +0.000000, +0.939213, +1.905527, +2.899795
- M2 100 S: -4.319474, -3.502943, -3.169987, -2.663585, -2.148657, -1.448506, -0.912968, +0.000000, +0.560324, +0.939213, +1.322439, +2.102117, +2.899795, +3.715911, +4.131020
- M2 100 T: -3.995546, -3.502943, -3.002122, -2.321258, -1.625020, -1.092487, +0.000000, +1.130281, +2.102117, +2.899795, +3.510129, +3.922872, +4.340361
- M2 50 ST average: -4.157953, -3.502943, -2.492899, -1.625020, +0.000000, +0.939213, +2.102117, +2.899795
- M2 100 ST average: -3.502943, -3.169987, -2.663585, -2.321258, -1.092487, +0.000000, +0.560324, +0.939213, +2.102117, +2.899795, +4.340361
- M3 50 S: -4.157953, -3.336925, -2.148657, +0.000000, +0.749230, +1.905527, +2.899795
- M3 50 T: -4.157953, -3.336925, -2.833324, -2.148657, -1.625020, -1.092487, +0.000000, +0.749230, +1.905527, +2.899795
- M3 100 S: -4.319474, -3.832247, -3.502943, -3.002122, -2.148657, -1.800545, -1.092487, +0.000000, +1.322439, +2.102117, +2.899795, +3.715911, +4.131020
- M3 100 T: -4.319474, -3.668048, -3.169987, -2.321258, -1.625020, -1.092487, +0.000000, +2.102117, +2.899795, +3.510129, +3.922872
- M3 50 ST average: -4.157953, -3.336925, -2.148657, +0.000000, +0.749230, +1.905527, +2.899795
- M3 100 ST average: -4.319474, -3.668048, -3.002122, -2.492899, -2.148657, -1.092487, +0.000000, +2.102117, +2.899795, +4.131020
