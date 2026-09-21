# Research-only PSF validation

This folder is independent of the website. It does not import or change the simulator,
calculator, evidence JSON, or production assets. It never converts bench defocus to
viewing distance, creates a patient-view image, or exports RGB PSFs.

## Run

Python 3.12 with NumPy, SciPy, Pillow, and Matplotlib:

```sh
python3 -m pip install -r research/psf-validation/requirements.txt
python3 research/psf-validation/analyze.py --self-test
python3 research/psf-validation/analyze.py --dataset /path/to/32080626.zip --output research/psf-validation/generated/outputs
```

The dataset location is a command-line argument. Raw data remain in the original
archive. The nested IOL archive is read into memory (allow several GB of RAM).
Only Multifocal/Measurement 1–5, dark.tif and Image_01…Image_37 are read.
Unexpected frame sets/formats stop the run. Measurement 6 and Simulation Data are excluded.
No missing data are filled. No crop size is selected; all calculations use 1920 × 1080 pixels.

## Provenance and interpretation

Dataset: Sawyers, Paige; Sawyer, Travis, *Through focus point spread function and
modulation transfer function of intraocular lenses* (2026).
Data DOI: https://doi.org/10.25422/azu.data.32080626.
Paper DOI: https://doi.org/10.1364/AO.599583.
The user-selected Multifocal series is the scope of this analysis.
Data license: CC BY 4.0 (archive License_data.txt); computed tables and diagnostic figures
are derived adaptations, not the original raw data. Author MATLAB code is MIT licensed;
its license is reproduced in THIRD_PARTY_LICENSE.txt.

Every run records source-image SHA256 hashes and the author-script SHA256.
Acquisition wavelength, pupil, and model-eye condition are left null in this run's metadata:
they have not been independently verified against the individual acquisitions.

Nominal mapping is Image_01 = −4.5 D, Image_19 = 0 D, Image_37 = +4.5 D, step 0.25 D.
Metadata explicitly records:
- defocus_status: "nominal mapping from author code; not yet mapped to clinical viewing-distance convention"
- spatial_scale_status: "derived from author MATLAB calibration; not independently validated"

Pixel scale = 0.00504 / 20 mm/pixel. This is the MATLAB calibration, not TIFF DPI.
It is not connected to the website's −1/distance formula.

## Branch A — author-method reproduction

Each processing step in analyze.py is labeled **author-method reproduction**:
1. Read uint16 grayscale TIFF and corresponding dark.
2. Reproduce MATLAB saturated uint16 subtraction (negative differences become zero).
   NumPy uint16 wraparound is deliberately avoided.
3. Rotation 0 degrees, equivalent to the author's bilinear/crop identity operation for Multifocal.
4. fft2, fftshift, magnitude.
5. Default medfilt2: 3 × 3 median with zero padding.
6. Normalize the filtered magnitude by its global maximum.
7. Extract the exact MATLAB one-based indices (555,961), (568,961), (541,985), (541,1009).

The x/y labels preserve the author's naming; x samples vary the matrix row.
Approximate 50 samples differ by axis (51.4403 and 49.6032 cyc/mm); 100 samples are 99.2063.
Exact frequencies are in summary.json. No frequency interpolation is performed.

MathWorks behavior references:
- https://www.mathworks.com/help/images/image-arithmetic-saturation-rules.html
- https://www.mathworks.com/help/images/ref/medfilt2.html

This is a Python semantic port, not a claim of bit-for-bit validation against MATLAB R2024b.
MATLAB and author reference numeric output were unavailable. The author algorithm's
filtering/normalization is retained even when it differs from the convolution branch.

## Branch B — convolution candidate

Float TIFF → signed dark subtraction → clip negatives → compute total energy →
divide by total energy (**energy normalization for convolution**).
No artificial sharpening, spatial filtering, rotation, crop, resampling, or background fit.
Compute full 2D |FFT(kernel)| and divide by its zero-frequency value: MTF(0) = 1.
Extract the same four frequency bins. No kernel is connected to the website.

For these uint16 frames the two branches have the same clipped intensity array before
normalization. Their MTF results differ because A median-filters the FFT magnitude and
normalizes its filtered peak; B uses unfiltered magnitude and DC normalization.
PSF peak normalization is never used for convolution.

## Diagnostics and output interpretation

- diagnostics.csv: every frame, raw maximum, signed dark-subtracted sum and maximum,
  clipped energy, uint16-ceiling saturation fraction, negative fraction, edge-background
  proxy statistics, centroid/peak (zero-based x=column, y=row), kernel sum, branch DC values.
- Border energy uses 10/25/50 px bands, as diagnostics only. These are not crop prescriptions.
- Saturation means exactly 65535; unknown sensor ADC clipping/full-well levels are not inferred.
- Background = signed values in the outer 50 px. It may contain real PSF wings;
  it is not assumed signal-free or subtracted a second time.
- radial_encircled_energy.csv: full-frame centroid-centered annuli [r,r+1), pixel counts,
  annular mean intensity/energy and encircled energy. r50/r80/r90/r95/r99 are upper bin edges.
  Circles beyond the nearest frame boundary are incompletely sampled.
- through_focus_mtf.csv: both branches, four independently retained directional samples.
- mean_sd.csv: n=5 mean and sample SD (ddof=1) at each measured nominal defocus.
- Per-measurement plots, five-measurement overlay, and mean ± SD plots for each branch.
- summary.json: correlation, variability, peaks, calibration, limitations and software versions.
- input_manifest.json: hashes of exactly 185 selected PSFs and five dark images.
- representative_full_frame_psfs.png: Measurement 1 at the three most prominent local
  maxima of the mean author 50x curve; full-frame log10 energy display only. Figure rasterization
  is not a resized numerical convolution kernel.

Peak selection is an analysis convention outside the author's algorithm: select up to three
highest-prominence local maxima, at least four measured samples (1 D) apart, without fitting.
Each axis/frequency/branch retains its own peak locations. Fewer than three are not invented.
Correlation is pairwise Pearson correlation of the full through-focus curves.
Repeatability among measurements is not validation against the paper's published curve.

Finite-frame edge energy and encircled-energy diagnostics cannot prove no energy exists
outside the frame. A normalized kernel can still include clipped-noise pedestal or truncated
wings. Calibration, background stability, registration, detector linearity/saturation, and
MATLAB-reference agreement must be assessed before interpreting convolution scientifically.
No final visual simulation is produced here.

## Repository layout and reproducibility

The dataset is **not included in this repository**. Supply your own local archive
for Data DOI https://doi.org/10.25422/azu.data.32080626 via `--dataset`.
Do not copy the archive or raw TIFFs into the repository.

Git retains the Python/MATLAB analysis scripts, this README, requirements.txt,
THIRD_PARTY_LICENSE.txt, and these reviewed research reports:
VALIDATION_REPORT.md, MATLAB_FIDELITY_AUDIT.md, ESF_SANITY_CHECK.md,
and ORIENTATION_ROBUSTNESS_AUDIT.md.

All reproducible figures, CSV tables, JSON diagnostics and run manifests belong in
`generated/`, which is ignored by Git. Existing results were moved without changing
file contents; no analysis was rerun during this organization.

| Workflow | Local generated outputs |
| --- | --- |
| Initial PSF validation | generated/outputs/ |
| ESF independent comparison | generated/esf/ |
| MATLAB fidelity experiments and controls | generated/fidelity/ |
| Orientation/background robustness audit | generated/orientation/ |

Paths in reports without a directory refer to the corresponding workflow above.
Generated JSON metadata and input hashes remain local and are regenerated by the
scripts; no separate hand-maintained config is required. The generated directory
is created by the scripts on a fresh clone. If overriding `--output`, keep it inside
`research/psf-validation/generated/` (or outside the repository).

Run from the repository root, in this dependency order when regenerating all results:

```sh
python3 -m pip install -r research/psf-validation/requirements.txt
python3 research/psf-validation/analyze.py --dataset /path/to/32080626.zip
python3 research/psf-validation/esf_sanity_check.py --dataset /path/to/32080626.zip --psf-results research/psf-validation/generated/outputs/through_focus_mtf.csv
python3 research/psf-validation/fidelity_experiments.py --dataset /path/to/32080626.zip --phase controls
python3 research/psf-validation/fidelity_experiments.py --dataset /path/to/32080626.zip --phase panoptix
python3 research/psf-validation/fidelity_summary.py
python3 research/psf-validation/orientation_audit.py --dataset /path/to/32080626.zip
python3 research/psf-validation/orientation_summary.py
```

`fidelity_figures.py` optionally regenerates representative figures from the dataset.
The MATLAB probe takes explicit input/output paths; put its output in `generated/`
or outside the repository. Native MATLAB validation has not been completed.
The ESF and summary scripts also regenerate sections of the retained Markdown
reports; review those changes before committing. VALIDATION_REPORT.md and the
introductory audit text are reviewed narrative records, not fully automatic outputs.
Some summaries contain dataset-specific assertions and interpretation; they must
not be reused as conclusions for a different dataset without review.

## Readiness and scientific limits

**PSF validation has not reached production-simulation readiness.** Measurement 6
remains excluded from all PanOptix analyses. Monofocal and Simulation Data in the
fidelity workflow are separately labelled validation controls, not PanOptix evidence.
ESF comparison data remain independent of PSF measurements.

The original results cannot be described as a patient's actual postoperative vision.
Nominal bench defocus is not clinical viewing distance. Background, finite-frame
energy, acquisition consistency and spatial calibration still require validation.
No research output is connected to the production website, calculator or simulator.
