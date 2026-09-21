"""Summarize completed fidelity experiments; no raw reprocessing or input changes."""
import csv,json
from pathlib import Path
import numpy as np
from scipy.signal import find_peaks
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

ROOT=Path(__file__).resolve().parent
OUT=ROOT/"generated/fidelity"
CH=("horizontal_50","vertical_50","horizontal_100","vertical_100")
def read(name):
    return list(csv.DictReader((OUT/name).open()))
def write(name,rows):
    with (OUT/name).open("w",newline="") as f:
        w=csv.DictWriter(f,fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)
def pos(rows,rank="prominence_rank"):
    return ", ".join(f'{float(r["nominal_defocus_D"]):+.2f}' for r in rows if int(r[rank])<=3)

def main():
    rows=read("panoptix_processing_comparison.csv")
    controls=read("controls_processing_comparison.csv")
    peaks=read("panoptix_all_local_maxima.csv")
    angular=read("panoptix_angular_samples.csv")
    old=list(csv.DictReader((ROOT/"generated/outputs/through_focus_mtf.csv").open()))
    mapping={"horizontal_50":"50y","vertical_50":"50x","horizontal_100":"100y","vertical_100":"100x"}
    baseline={(r["measurement"],r["image_filename"]):r for r in old if r["branch"]=="author"}
    max_previous_difference=0
    for r in rows:
        if r["variant"]=="A":
            oldr=baseline[r["measurement"],r["filename"]]
            max_previous_difference=max(max_previous_difference,max(abs(float(r[c])-float(oldr[k])) for c,k in mapping.items()))
    assert max_previous_difference==0
    for m in range(1,6):
        fig,axs=plt.subplots(2,2,figsize=(11,7),sharex=True)
        for ax,ch in zip(axs.flat,CH):
            for var,style in [("A","-"),("B","--"),("C",":")]:
                rr=[r for r in rows if r["measurement"]==str(m) and r["variant"]==var]
                ax.plot([float(r["nominal_defocus_D"]) for r in rr],[float(r[ch]) for r in rr],
                        style,label=var)
            ax.set_title(ch); ax.set_ylabel("Author downstream MTF"); ax.set_xlabel("Nominal D"); ax.grid(alpha=.2); ax.legend()
        fig.suptitle(f"M{m} subtraction sensitivity (A and C coincide)")
        fig.tight_layout(); fig.savefig(OUT/f"panoptix_M{m}_subtraction_curves.png",dpi=140); plt.close(fig)
    anglepeaks=[]
    for freq in (50,100):
        fig,axs=plt.subplots(3,2,figsize=(12,11),sharex=True,sharey=True)
        for m,ax in enumerate(axs.flat,1):
            if m==6: ax.axis("off"); break
            for j,angle in enumerate(range(0,180,15)):
                rr=[r for r in angular if r["measurement"]==str(m) and r["target_cyc_mm"]==str(freq) and r["angle_from_horizontal_degrees"]==str(angle)]
                x=np.array([float(r["nominal_defocus_D"]) for r in rr])
                y=np.array([float(r["mtf"]) for r in rr])
                ix,pr=find_peaks(y,prominence=0)
                for k,i in enumerate(ix):
                    anglepeaks.append(dict(measurement=m,target_cyc_mm=freq,angle_degrees=angle,
                        nominal_defocus_D=float(x[i]),mtf=float(y[i]),prominence=float(pr["prominences"][k]),
                        actual_fx_cyc_mm=rr[i]["actual_fx_cyc_mm"],actual_fy_cyc_mm=rr[i]["actual_fy_cyc_mm"]))
                ax.plot(x,y,".-",lw=.8,ms=2,color=plt.cm.tab20(j),label=f"{angle} degrees")
            ax.set_title(f"Measurement {m}"); ax.set_xlabel("Nominal D"); ax.set_ylabel("A author-method MTF"); ax.grid(alpha=.2)
        handles,labels=axs[0,0].get_legend_handles_labels()
        axs[2,1].legend(handles,labels,loc="center",ncol=2)
        fig.suptitle(f"Angular diagnostics: target {freq} cyc/mm\nNearest actual FFT bins; no angular/defocus interpolation")
        fig.tight_layout(); fig.savefig(OUT/f"angular_{freq}_curves.png",dpi=140); plt.close(fig)
    write("angular_all_local_maxima.csv",anglepeaks)

    lines=["","## Completed experiments and results","","### Verification status",
      "337 raw image frames were processed: Monofocal 111, system control 41, PanOptix 185. PanOptix has A/B/C records (555 rows); controls have A records (152 rows).",
      "All inspected TIFFs were uint16, single-page 1080×1920. Existing author extraction values and newly recomputed A values match exactly (maximum absolute difference 0 across all 740 PanOptix directional samples).",
      "A and C processed PSFs are elementwise identical on all 185 PanOptix frames. Their MTFs were independently recomputed for 15 representative frames and exactly matched. Remaining C MTF records reuse A after the identical-array check; this is not a native MATLAB comparison.",
      "Python explicit 3×3 zero-padded median fixture and integer saturation fixture pass. The literal-axis reconstruction differs from fftfreq by at most 4.55e−13 cyc/mm; extraction indices are unchanged.",
      "MATLAB native execution remains unavailable. The supplied fidelity_matlab_probe.m has NOT been executed; it records classes, rotation identity, sampled stages, fixtures and axes for a later MATLAB R2024b check. Such checkpoints are necessary but would not by themselves prove full-array bitwise equivalence.",
      "Original script path assembly ends in a Windows-style backslash. ZIP reading/native probe paths are deliberate I/O adaptations, not literal execution of that platform-dependent path code.",
      "", "### Monofocal positive control", "",
      "| Measurement | horizontal 50 | vertical 50 | horizontal 100 | vertical 100 |","|---|---|---|---|---|"]
    for m in range(1,4):
        rr=[r for r in controls if r["group"]=="monofocal" and r["measurement"]==str(m)]
        ds=[float(max(rr,key=lambda r:float(r[c]))["nominal_defocus_D"]) for c in CH]
        lines.append(f"| M{m} | "+" | ".join(f"{x:+.2f} D" for x in ds)+" |")
    lines+=["","Each curve has one dominant focal region near −0.25/0 D, with weaker sidelobes. Main-peak variation is no greater than one 0.25-D sample; no zero-point correction is applied. This control passed the qualitative single-dominant-focus check before PanOptix was rerun."]
    for ch in CH:
        v=np.array([[float(r[ch]) for r in controls if r["group"]=="monofocal" and r["measurement"]==str(m)] for m in range(1,4)])
        lines.append(f"- {ch}: minimum pairwise full-curve Pearson r = {np.corrcoef(v)[np.triu_indices(3,1)].min():.6f}.")
    lines+=["","### System control", "",
      "system validation data; NOT PanOptix evidence. One Biconvex Spherical Sim series, 41 frames. A single dominant region appears at Image_20–21: horizontal 100 peaks at Image_20; the other three samples at Image_21. We cannot assess repeat-measurement consistency from one series. Physical defocus remains null; no 37-frame axis is imposed.",
      "", "### Dark subtraction sensitivity",
      "A: expected MATLAB uint16 saturation. B: float subtraction retaining signed residuals. C: float subtraction clipped at zero. All use the same FFT → magnitude → 3×3 median → filtered-global-max normalization. No energy normalization or convolution is performed.",
      "A/C negative fractions after processing are zero. B retains 39.03%–74.77% negative pixels. A/C total sums range 5,309,814–23,113,791; B signed sums range −28,436,265–11,355,474, with 30 of 185 sums negative. B's signed sum must not be called nonnegative PSF energy.",
      "Morphology: A and C are identical; B preserves negative background/residuals that A/C remove. The full-frame morphology figure uses a shared signed display scale; the display transform is not processing.",
      "", "| M1 nominal D | Variant | Negative fraction | Sum (B: signed) | H50 | V50 | H100 | V100 |",
      "|---|---|---|---|---|---|---|---|"]
    for r in rows:
        if r["measurement"]=="1" and r["image_index"] in ("19","27","31"):
            lines.append(f'| {float(r["nominal_defocus_D"]):+.2f} | {r["variant"]} | {float(r["negative_fraction_after_processing"]):.6f} | {float(r["total_energy_or_signed_sum"]):.0f} | '+
                " | ".join(f"{float(r[c]):.6f}" for c in CH)+" |")
    lines+=["","Largest absolute B−A MTF differences across all 185 frames:"]
    aa=[r for r in rows if r["variant"]=="A"]; bb=[r for r in rows if r["variant"]=="B"]
    for c in CH: lines.append(f"- {c}: {max(abs(float(a[c])-float(b[c])) for a,b in zip(aa,bb)):.6f}.")
    lines+=["","The retained-negative branch changes energy strongly and normalized MTF measurably. It does not reliably restore a common three-focus pattern. A/C equality means floating conversion itself is not the issue; retaining versus removing negative residuals is the substantive difference.",
      "", "### All-direction peak comparison",
      "Below are up to three local maxima by prominence, without a minimum-distance constraint; these are not automatically three optical foci. C equals A. Every other local maximum is retained in CSV.",
      "", "| M | Channel | A candidates (nominal D) | B candidates (nominal D) |","|---|---|---|---|"]
    for m in range(1,6):
        for ch in CH:
            rr=[r for r in peaks if r["measurement"]==str(m) and r["channel"]==ch]
            lines.append(f'| {m} | {ch} | {pos([r for r in rr if r["variant"]=="A"])} | {pos([r for r in rr if r["variant"]=="B"])} |')
    lines+=["","### 2D MTF and angular finding",
      "Five representative 2D figures show each measurement at 0, +2, +3 D. Both full frequency maps and central views are provided; no PSF crop is used. A nonzero 2D MTF at +3 D alone does not establish a through-focus maximum.",
      "Additional diagnostics sample 12 angles (0–165°, 15° steps) at nearest actual FFT bins near 50/100 cyc/mm for every frame. There is no interpolation; actual fx/fy and radius are retained, so these are not falsely treated as identical radii. These angular checks are NOT part of the author's four-point extraction.",
      "**Measurement 3 has an important directional feature:** near 100 cyc/mm, 15–60° curves have local maxima at 0, +2.25 and +3.25 D. At 30°, the +2.25/+3.25 D prominences are 0.042782/0.155984 (rounded); the third-side feature is much less prominent in the horizontal cut. This shows that a single directional summary can understate the structure. The peak locations and prominence should be read from angular_all_local_maxima.csv at full precision.",
      "This is a measurement-specific observation, NOT proof of a stable three-peak result across all five measurements. At 50 cyc/mm the same M3 diagonal curves principally show 0 and +3.25 D, not three clearly separated peaks. M1/M2, M4 and M5 retain different positive-lobe locations. We do not select an angle, frequency or subtraction variant merely because it resembles the expected optical adds.",
      "", "### Interpretation / next investigation",
      "The documented arithmetic, kernel, padding, normalization and original indices show no identified semantic mismatch for these zero-rotation TIFFs, and both positive controls recover a dominant single focus. Native MATLAB equivalence remains unproven.",
      "A consistent third peak is still not reproduced across measurements; however, M3 diagonal 100-cyc/mm data do contain a third-side local peak. Therefore a blanket conclusion that the raw data contain no third feature would be wrong.",
      "After obtaining native MATLAB checkpoints, prioritize Multifocal acquisition alignment/orientation and actual stage-position/defocus calibration. Direction-dependent features plus measurement-dependent positive-focus positions warrant that investigation. Background handling is demonstrably influential, but A/B/C sensitivity alone does not establish it as the cause. Present data cannot separate calibration error from raw acquisition/setup effects; no data are shifted or corrected to match ESF.",
      "", "### Reproduce / outputs",
      "Run from repository root with the existing research requirements; raw archives remain external:",
      "1. python3 research/psf-validation/generated/fidelity_experiments.py --dataset /path/to/32080626.zip --phase controls",
      "2. Inspect controls; only then run the same command with --phase panoptix.",
      "3. python3 research/psf-validation/generated/fidelity_summary.py",
      "Optional display-only regeneration: python3 research/psf-validation/generated/fidelity_figures.py --dataset /path/to/32080626.zip",
      "Native probe (MATLAB, not run here): fidelity_matlab_probe(imagePath, darkPath, outputFile). Write the compact reference file outside Git; raw TIFFs are never exported by the probe.",
      "All new CSV/JSON/PNG outputs are under generated/fidelity/. Existing analyze.py, ESF results, earlier PSF outputs, production files and evidence JSON remain unchanged.",
      "New research metadata records white light, nominal_filter_nm=560, filter_bandwidth_nm=null (user-supplied paper schematic); it does not claim monochromatic illumination or assign this to simulation data.",
      ""]
    # Replace only this generated section on reruns, preserving the source audit table.
    p=ROOT/"MATLAB_FIDELITY_AUDIT.md"
    intro=p.read_text().split("\n## Completed experiments and results")[0]
    p.write_text(intro+"\n"+"\n".join(lines))
    print("Summary, sensitivity curves and all-angle diagnostics complete.")

if __name__=="__main__": main()
