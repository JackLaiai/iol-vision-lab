# MATLAB-method fidelity audit

## Status and scope

This is a source/documentation audit plus Python controls and sensitivity experiments.
**Native MATLAB equivalence is NOT verified**: MATLAB/Octave is unavailable on this host.
A matching Python reimplementation does not prove matching MATLAB R2024b outputs.
No convolution, ESF alignment, production changes or evidence JSON changes are permitted.
All original research outputs are retained unchanged.

The original `ThroughFocusMTF.m` is read from the supplied archive. Its start is
`clear all`; it does not preallocate double stacks or call `double`/ `im2double`
before subtraction. The MATLAB class chain below is the expected clean-workspace
semantics, not an observed MATLAB execution. A native probe is supplied for that missing check.

## Line-by-line processing audit

“Semantic match” means the documented operation matches for this dataset.
It does NOT mean bitwise/native MATLAB verification.

| MATLAB original code | Input datatype | Output datatype | MATLAB behavior | Current Python implementation | Fidelity verdict |
|---|---|---|---|---|---|
| `clear all` | workspace | empty workspace | Removes prior variables, including double preallocations | New local arrays on each function call | Equivalent isolation for processing; MATLAB class chain still needs probe |
| `dir([fileDir 'Image*.tif'])`; `l=length(PSFfileName)` | filenames | struct list, double scalar | File discovery; zero-padded names give expected order | Explicit Image_01…37, exact set validation | Same selected files for approved groups; not a generic port of dir |
| `imgdark=imread(...)`; `readpsf=imread(...)` | 16-bit grayscale TIFF bytes | uint16 expected | Reads first image; 9–16-bit grayscale TIFF stored as uint16 | PIL uint16, verifies one frame and 1080×1920 | Actual Python format checked; MATLAB decoder not run |
| `img_stack(:,:,i)=readpsf(:,:,1)` | uint16 RHS; initially undefined stack | uint16 expected | First assignment establishes stack; later indexed assignments retain class | One uint16 array, no stack conversion | Expected equivalent; native indexed-allocation class check pending |
| `img(:,:,i)=img_stack(:,:,i)-imgdark` | uint16 − uint16 | uint16 expected | Integer results saturate to representable range: negatives become zero, not wraparound | int32 subtraction → maximum(0) → uint16 | Exact integer arithmetic semantics; native probe pending |
| `angle=0` | double literal | double | Zero rotation for Monofocal/Multifocal | Zero-angle identity shortcut | Scope-specific, not a general imrotate implementation |
| `imrotate(img(:,:,i),angle,'bilinear','crop')` | uint16 expected | same class and 1080×1920 | Bilinear uses 2×2 neighbors, crop preserves size; zero rotation should be identity | No resampling at 0° | Expected numerical identity only at 0°; native identity assertion pending; nonzero angles unsupported |
| `OTF=fftshift(fft2(img_rot(:,:,i)))` | uint16 expected | complex double expected | 2D FFT first, then centered frequency ordering; no FFT scaling | np.fft.fft2 → np.fft.fftshift, complex128 | Same transform/order/dimensions; FFT library rounding not verified across engines |
| `MTF(:,:,i)=abs(OTF)` | complex double | real double | Complex modulus, not squared magnitude | np.abs, float64 | Semantic match; floating error unverified |
| `MTF(:,:,i)=medfilt2(MTF(:,:,i))` | double magnitude | double | Default 3×3 median; zero padding on all edges | scipy.ndimage.median_filter(size=3, mode=constant, cval=0) | Kernel and boundary rule match; Python explicit-neighborhood tests pass |
| `max_val=max(max(MTF(:,:,i)))` | double filtered magnitude | double scalar | Global maximum AFTER median filtering | filtered.max() | Semantic match; Python raises on zero denominator, MATLAB would yield invalid normalized values |
| `MTF(:,:,i)=MTF(:,:,i)./max_val` | double | double | Divide whole filtered map by filtered global maximum | filtered / peak | Semantic match; not energy normalization and not unfiltered DC normalization |
| `dimx=size(img_stack,1); dimy=size(img_stack,2)` | image stack | double sizes | dimx counts rows (1080); dimy columns (1920) | Fixed TIFF shape checks | Correct for inspected datasets; naming x/y is NOT Cartesian image x/y |
| `x_um=.00504/20*linspace(1,dimx,dimx)` | double | double row vector | Unit actually mm despite variable name; scale 0.000252 mm/px | SCALE=.00504/20; fftfreq axis | Mathematically equivalent for even sizes; literal arithmetic sequence differs |
| `delx=x_um(2)-x_um(1)` (and y/dely) | double | double scalar | First spacing from that coordinate vector | Direct SCALE used | Exact spacing checked numerically in audit outputs |
| `xi=linspace(-1/(2*delx),1/(2*delx),dimx+1); xi=xi(1:end-1)` | double | 1080 double values | Includes negative Nyquist, omits positive Nyquist | fftshift(fftfreq(1080,SCALE)) | Same mathematical grid; last-bit differences measured, not called bitwise identical |
| `eta=linspace(-1/(2*dely),1/(2*dely),dimy+1); eta=eta(1:end-1)` | double | 1920 double values | Corresponding column-frequency grid | fftshift(fftfreq(1920,SCALE)) | Same caveat; literal formula also reconstructed in audit |
| `MTF_50x(i,:)=MTF(555,961,i)` | double | double | Varies row frequency, fixes column DC: **vertical** frequency sample | [554,960] | Exact index conversion; 51.440329 cyc/mm, not exactly 50 |
| `MTF_100x(i,:)=MTF(568,961,i)` | double | double | Vertical sample | [567,960] | Exact index; 99.206349 cyc/mm |
| `MTF_50y(i,:)=MTF(541,985,i)` | double | double | Varies column frequency, fixes row DC: **horizontal** frequency sample | [540,984] | Exact index; 49.603175 cyc/mm |
| `MTF_100y(i,:)=MTF(541,1009,i)` | double | double | Horizontal sample | [540,1008] | Exact index; 99.206349 cyc/mm |
| `defocus=linspace(-4.5,4.5,l)` | double endpoints, frame count | double vector | Axis assigned from image count, not TIFF physical stage metadata | arange(37)*.25−4.5 | Same 37-point axis. Never shifted to ESF |
| `plot(defocus,MTF_50x)`, etc. | sampled coordinates | display | Plots two directions separately; does NOT identify peaks | Previous figures preserve channels; extra peak selection added | Plot/peak analysis is downstream, NOT part of author-method reproduction |

## Important distinctions found

- Existing Python `peaks()` imposed a four-sample separation and selected three by
  prominence. The MATLAB script has **no peak-finding step**. This audit records
  every local maximum with **no minimum separation, no smoothing, no fitting**.
  A prior third candidate is not proof of a third optical focus.
- Existing author x is matrix-row/vertical frequency; author y is column/horizontal
  frequency. This is a labeling issue, not swapped numerical extraction.
- Frequency bins are hardcoded exactly as in MATLAB; using fftfreq did not change
  which pixels were extracted.
- No evidence of double conversion before dark subtraction appears in the original
  source. Integer-clipped A and float-then-clipped C should be identical for these TIFFs.
- Branch B below keeps negative residuals. It is a sensitivity experiment, not an
  automatically preferred optical PSF. Its signed sum is not a nonnegative PSF energy.
- For A/B/C, all downstream operations remain the SAME author median/global-max
  pipeline. None uses the previous convolution-candidate DC normalization.

## Controls and axis policy

Monofocal M1–M3 and Multifocal M1–M5: Image_01=−4.5 D, Image_19=0 D,
Image_37=+4.5 D. Measurement 6 excluded.
System control: `Simulation Data.zip/Biconvex Spherical Sim` contains **41** frames.
It is labeled **system validation data; NOT PanOptix evidence**. Its primary axis is
image index; no physical defocus mapping is invented. For transparency only, metadata
records what the author's count-based linspace would produce (step 0.225 D); that
is not substituted for the approved 37-image nominal mapping.

Research illumination metadata supplied by the user from the paper schematic:
`illumination_source="white light"`, `nominal_filter_nm=560`,
`filter_bandwidth_nm=null`. This is not described as monochromatic 560-nm light,
and is not independently verified per TIFF or automatically assigned to simulation data.

## References

- Author source: archive ThroughFocusMTF.m, dataset https://doi.org/10.25422/azu.data.32080626 (code MIT; data CC BY 4.0; existing THIRD_PARTY_LICENSE.txt retained).
- TIFF class: https://www.mathworks.com/help/matlab/ref/imread.html
- Indexed assignment: https://www.mathworks.com/help/matlab/math/indexed-assignment.html
- Integer clipping: https://www.mathworks.com/help/images/image-arithmetic-saturation-rules.html
- Rotation: https://www.mathworks.com/help/images/ref/imrotate.html
- FFT: https://www.mathworks.com/help/matlab/ref/fft2.html
- Shift: https://www.mathworks.com/help/matlab/ref/fftshift.html
- Median kernel/padding: https://www.mathworks.com/help/images/ref/medfilt2.html

Native runtime/version-specific outputs remain a required validation step.



## Completed experiments and results

### Verification status
337 raw image frames were processed: Monofocal 111, system control 41, PanOptix 185. PanOptix has A/B/C records (555 rows); controls have A records (152 rows).
All inspected TIFFs were uint16, single-page 1080×1920. Existing author extraction values and newly recomputed A values match exactly (maximum absolute difference 0 across all 740 PanOptix directional samples).
A and C processed PSFs are elementwise identical on all 185 PanOptix frames. Their MTFs were independently recomputed for 15 representative frames and exactly matched. Remaining C MTF records reuse A after the identical-array check; this is not a native MATLAB comparison.
Python explicit 3×3 zero-padded median fixture and integer saturation fixture pass. The literal-axis reconstruction differs from fftfreq by at most 4.55e−13 cyc/mm; extraction indices are unchanged.
MATLAB native execution remains unavailable. The supplied fidelity_matlab_probe.m has NOT been executed; it records classes, rotation identity, sampled stages, fixtures and axes for a later MATLAB R2024b check. Such checkpoints are necessary but would not by themselves prove full-array bitwise equivalence.
Original script path assembly ends in a Windows-style backslash. ZIP reading/native probe paths are deliberate I/O adaptations, not literal execution of that platform-dependent path code.

### Monofocal positive control

| Measurement | horizontal 50 | vertical 50 | horizontal 100 | vertical 100 |
|---|---|---|---|---|
| M1 | +0.00 D | -0.25 D | -0.25 D | -0.25 D |
| M2 | +0.00 D | +0.00 D | -0.25 D | -0.25 D |
| M3 | +0.00 D | +0.00 D | -0.25 D | +0.00 D |

Each curve has one dominant focal region near −0.25/0 D, with weaker sidelobes. Main-peak variation is no greater than one 0.25-D sample; no zero-point correction is applied. This control passed the qualitative single-dominant-focus check before PanOptix was rerun.
- horizontal_50: minimum pairwise full-curve Pearson r = 0.980923.
- vertical_50: minimum pairwise full-curve Pearson r = 0.921259.
- horizontal_100: minimum pairwise full-curve Pearson r = 0.987796.
- vertical_100: minimum pairwise full-curve Pearson r = 0.917518.

### System control

system validation data; NOT PanOptix evidence. One Biconvex Spherical Sim series, 41 frames. A single dominant region appears at Image_20–21: horizontal 100 peaks at Image_20; the other three samples at Image_21. We cannot assess repeat-measurement consistency from one series. Physical defocus remains null; no 37-frame axis is imposed.

### Dark subtraction sensitivity
A: expected MATLAB uint16 saturation. B: float subtraction retaining signed residuals. C: float subtraction clipped at zero. All use the same FFT → magnitude → 3×3 median → filtered-global-max normalization. No energy normalization or convolution is performed.
A/C negative fractions after processing are zero. B retains 39.03%–74.77% negative pixels. A/C total sums range 5,309,814–23,113,791; B signed sums range −28,436,265–11,355,474, with 30 of 185 sums negative. B's signed sum must not be called nonnegative PSF energy.
Morphology: A and C are identical; B preserves negative background/residuals that A/C remove. The full-frame morphology figure uses a shared signed display scale; the display transform is not processing.

| M1 nominal D | Variant | Negative fraction | Sum (B: signed) | H50 | V50 | H100 | V100 |
|---|---|---|---|---|---|---|---|
| +0.00 | A | 0.000000 | 18267303 | 0.411967 | 0.404225 | 0.275170 | 0.285944 |
| +0.00 | B | 0.510672 | 1665902 | 0.368962 | 0.364847 | 0.246882 | 0.257095 |
| +0.00 | C | 0.000000 | 18267303 | 0.411967 | 0.404225 | 0.275170 | 0.285944 |
| +2.00 | A | 0.000000 | 19685456 | 0.236363 | 0.187331 | 0.051385 | 0.049954 |
| +2.00 | B | 0.479266 | 4787551 | 0.221907 | 0.170662 | 0.048191 | 0.042935 |
| +2.00 | C | 0.000000 | 19685456 | 0.236363 | 0.187331 | 0.051385 | 0.049954 |
| +3.00 | A | 0.000000 | 19801486 | 0.217001 | 0.268278 | 0.098113 | 0.138557 |
| +3.00 | B | 0.468980 | 5309692 | 0.188201 | 0.236347 | 0.089451 | 0.117819 |
| +3.00 | C | 0.000000 | 19801486 | 0.217001 | 0.268278 | 0.098113 | 0.138557 |

Largest absolute B−A MTF differences across all 185 frames:
- horizontal_50: 0.043005.
- vertical_50: 0.045285.
- horizontal_100: 0.030014.
- vertical_100: 0.028849.

The retained-negative branch changes energy strongly and normalized MTF measurably. It does not reliably restore a common three-focus pattern. A/C equality means floating conversion itself is not the issue; retaining versus removing negative residuals is the substantive difference.

### All-direction peak comparison
Below are up to three local maxima by prominence, without a minimum-distance constraint; these are not automatically three optical foci. C equals A. Every other local maximum is retained in CSV.

| M | Channel | A candidates (nominal D) | B candidates (nominal D) |
|---|---|---|---|
| 1 | horizontal_50 | -2.25, +0.00, +2.50 | -2.25, +0.00, +2.50 |
| 1 | vertical_50 | -3.50, +0.00, +2.75 | -3.50, +0.00, +2.75 |
| 1 | horizontal_100 | +0.00, +2.50, +3.50 | +0.00, +2.50, +3.50 |
| 1 | vertical_100 | -0.75, +0.00, +2.75 | -0.75, +0.00, +2.75 |
| 2 | horizontal_50 | -3.25, +0.25, +2.75 | -3.25, +0.25, +2.75 |
| 2 | vertical_50 | -3.50, +0.00, +2.50 | -3.50, +0.00, +2.50 |
| 2 | horizontal_100 | -0.75, +0.00, +2.75 | -0.75, +0.25, +2.75 |
| 2 | vertical_100 | -0.75, +0.00, +2.50 | -0.75, +0.00, +2.50 |
| 3 | horizontal_50 | -3.50, +0.00, +2.75 | -3.50, +0.00, +2.75 |
| 3 | vertical_50 | -3.00, +0.00, +2.50 | -3.00, +0.00, +2.25 |
| 3 | horizontal_100 | -3.25, +0.00, +2.25 | -0.75, +0.00, +2.25 |
| 3 | vertical_100 | -3.00, +0.00, +2.50 | -3.00, +0.00, +2.50 |
| 4 | horizontal_50 | -1.50, +0.25, +2.00 | -2.25, +0.25, +2.00 |
| 4 | vertical_50 | +0.00, +2.00, +4.00 | +0.00, +2.00, +4.00 |
| 4 | horizontal_100 | +0.25, +2.25, +3.25 | +0.25, +2.25, +3.25 |
| 4 | vertical_100 | -1.00, +0.00, +2.00 | -1.00, +0.00, +2.00 |
| 5 | horizontal_50 | +0.00, +1.75, +3.50 | +0.00, +1.50, +3.50 |
| 5 | vertical_50 | +0.00, +1.75, +3.50 | +0.00, +1.75, +3.50 |
| 5 | horizontal_100 | -2.50, +0.00, +1.75 | +0.00, +1.75, +3.00 |
| 5 | vertical_100 | -2.50, +0.00, +1.75 | -2.50, +0.00, +1.75 |

### 2D MTF and angular finding
Five representative 2D figures show each measurement at 0, +2, +3 D. Both full frequency maps and central views are provided; no PSF crop is used. A nonzero 2D MTF at +3 D alone does not establish a through-focus maximum.
Additional diagnostics sample 12 angles (0–165°, 15° steps) at nearest actual FFT bins near 50/100 cyc/mm for every frame. There is no interpolation; actual fx/fy and radius are retained, so these are not falsely treated as identical radii. These angular checks are NOT part of the author's four-point extraction.
**Measurement 3 has an important directional feature:** near 100 cyc/mm, 15–60° curves have local maxima at 0, +2.25 and +3.25 D. At 30°, the +2.25/+3.25 D prominences are 0.042782/0.155984 (rounded); the third-side feature is much less prominent in the horizontal cut. This shows that a single directional summary can understate the structure. The peak locations and prominence should be read from angular_all_local_maxima.csv at full precision.
This is a measurement-specific observation, NOT proof of a stable three-peak result across all five measurements. At 50 cyc/mm the same M3 diagonal curves principally show 0 and +3.25 D, not three clearly separated peaks. M1/M2, M4 and M5 retain different positive-lobe locations. We do not select an angle, frequency or subtraction variant merely because it resembles the expected optical adds.

### Interpretation / next investigation
The documented arithmetic, kernel, padding, normalization and original indices show no identified semantic mismatch for these zero-rotation TIFFs, and both positive controls recover a dominant single focus. Native MATLAB equivalence remains unproven.
A consistent third peak is still not reproduced across measurements; however, M3 diagonal 100-cyc/mm data do contain a third-side local peak. Therefore a blanket conclusion that the raw data contain no third feature would be wrong.
After obtaining native MATLAB checkpoints, prioritize Multifocal acquisition alignment/orientation and actual stage-position/defocus calibration. Direction-dependent features plus measurement-dependent positive-focus positions warrant that investigation. Background handling is demonstrably influential, but A/B/C sensitivity alone does not establish it as the cause. Present data cannot separate calibration error from raw acquisition/setup effects; no data are shifted or corrected to match ESF.

### Reproduce / outputs
Run from repository root with the existing research requirements; raw archives remain external:
1. python3 research/psf-validation/generated/fidelity_experiments.py --dataset /path/to/32080626.zip --phase controls
2. Inspect controls; only then run the same command with --phase panoptix.
3. python3 research/psf-validation/generated/fidelity_summary.py
Optional display-only regeneration: python3 research/psf-validation/generated/fidelity_figures.py --dataset /path/to/32080626.zip
Native probe (MATLAB, not run here): fidelity_matlab_probe(imagePath, darkPath, outputFile). Write the compact reference file outside Git; raw TIFFs are never exported by the probe.
All new CSV/JSON/PNG outputs are under generated/fidelity/. Existing analyze.py, ESF results, earlier PSF outputs, production files and evidence JSON remain unchanged.
New research metadata records white light, nominal_filter_nm=560, filter_bandwidth_nm=null (user-supplied paper schematic); it does not claim monochromatic illumination or assign this to simulation data.
