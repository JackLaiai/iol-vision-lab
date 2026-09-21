#!/usr/bin/env python3
"""Independent ESF sanity check; reads XLSX/outer dataset ZIP, never rewrites inputs."""
import argparse, csv, hashlib, io, json, zipfile
from pathlib import Path
import numpy as np
import openpyxl
from scipy.signal import find_peaks
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

def write_csv(path, rows):
    with path.open("w",newline="",encoding="utf-8") as f:
        w=csv.DictWriter(f,fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)

def fmt(a):
    return ", ".join(f"{x:+.6f}" for x in a)

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--dataset",type=Path,required=True)
    p.add_argument("--psf-results",type=Path,required=True)
    p.add_argument("--output",type=Path,default=Path("research/psf-validation/generated/esf"))
    args=p.parse_args()
    if args.dataset.suffix.lower()==".xlsx": raw=args.dataset.read_bytes()
    else:
        with zipfile.ZipFile(args.dataset) as z: raw=z.read("ESFSystemData.xlsx")
    # Interpretive report below is specific to this verified workbook version.
    # Stop rather than silently reusing conclusions for a revised dataset.
    if hashlib.sha256(raw).hexdigest() != "85e816e92a7fdc9ff2c1e732b60898a5c55efa2b2ac55940badf066f44ec20fd":
        raise ValueError("Workbook changed: review the analysis and interpretation before rerunning")
    wf=openpyxl.load_workbook(io.BytesIO(raw),data_only=False,read_only=True)
    wv=openpyxl.load_workbook(io.BytesIO(raw),data_only=True,read_only=True)
    f=wf["Multifocal"]; v=wv["Multifocal"]
    a=np.array(list(v.values)[2:],dtype=float)
    assert a.shape==(50,14) and np.isfinite(a).all()
    origin=v["A29"].value
    for r in range(3,53): assert f[f"B{r}"].value==f"=A{r}-$A$29"
    np.testing.assert_allclose(a[:,1],a[:,0]-origin,rtol=0,atol=1e-12)
    d=a[:,1]; assert np.all(np.diff(d)>0)
    out=args.output; out.mkdir(parents=True,exist_ok=True)
    peakrows=[]; rawrows=[]; tops={}; signals={}
    for m in range(1,4):
        sig={k:a[:,c+m-1] for k,c in [("50 S",2),("50 T",5),("100 S",8),("100 T",11)]}
        for freq in (50,100): sig[f"{freq} ST average"]=(sig[f"{freq} S"]+sig[f"{freq} T"])/2
        signals[m]=sig
        for i in range(50):
            rawrows.append(dict(measurement=m,worksheet_row=i+3,position_D=float(a[i,0]),
                                defocus_D=float(d[i]),**{k:float(y[i]) for k,y in sig.items()}))
        for channel,y in sig.items():
            # No distance, height or prominence threshold; all interior local maxima.
            ix,props=find_peaks(y,prominence=0,plateau_size=True)
            rank_h=sorted(range(len(ix)),key=lambda j:(-y[ix[j]],ix[j]))
            rank_p=sorted(range(len(ix)),key=lambda j:(-props["prominences"][j],ix[j]))
            tops[m,channel]=[float(d[ix[j]]) for j in sorted(rank_h[:3],key=lambda j:ix[j])]
            for j,i in enumerate(ix):
                left=int(props["left_edges"][j]); right=int(props["right_edges"][j])
                peakrows.append(dict(measurement=m,channel=channel,worksheet_row=int(i+3),
                    defocus_D=float(d[i]),mtf=float(y[i]),prominence=float(props["prominences"][j]),
                    rank_by_height=rank_h.index(j)+1,rank_by_prominence=rank_p.index(j)+1,
                    top3_by_height=rank_h.index(j)<3,top3_by_prominence=rank_p.index(j)<3,
                    plateau_left_D=float(d[left]),plateau_right_D=float(d[right])))
    write_csv(out/"ESF_raw_peak_table.csv",peakrows)
    write_csv(out/"ESF_samples_and_ST_averages.csv",rawrows)
    for freq in (50,100):
        fig,axs=plt.subplots(3,1,figsize=(10,10),sharex=True)
        for ax,ch in zip(axs,[f"{freq} S",f"{freq} T",f"{freq} ST average"]):
            for m in range(1,4):
                # Points only: no smoothing, interpolation or connecting lines.
                ax.plot(d,signals[m][ch],linestyle="none",marker=("o","x","+")[m-1],
                        markersize=5,label=f"M{m}")
                pk=[r for r in peakrows if r["measurement"]==m and r["channel"]==ch and r["top3_by_height"]]
                ax.scatter([r["defocus_D"] for r in pk],[r["mtf"] for r in pk],
                           facecolors="none",edgecolors=f"C{m-1}",s=100,linewidths=.8)
            ax.set_title(ch); ax.set_ylabel("ESF MTF"); ax.grid(alpha=.2); ax.legend()
        axs[-1].set_xlabel("Original worksheet Defocus (D); Position minus A29")
        fig.suptitle(f"ESF {freq} lp/mm: three measurements\nPoints only; rings = top three local maxima by height")
        fig.tight_layout(); fig.savefig(out/f"ESF_{freq}lpmm_overlay.png",dpi=160); plt.close(fig)

    # Compare locations only. No PSF magnitudes written, averaged with ESF, or plotted.
    psf=list(csv.DictReader(args.psf_results.open()))
    compare=[]
    for branch in ("author","convolution"):
        for m in range(1,6):
            rr=[r for r in psf if r["branch"]==branch and int(r["measurement"])==m]
            x=np.array([float(r["nominal_defocus_D"]) for r in rr])
            for ch in ("50x","50y","100x","100y"):
                y=np.array([float(r[ch]) for r in rr])
                ix,_=find_peaks(y)
                two=sorted(sorted(ix,key=lambda i:-y[i])[:2],key=lambda i:x[i])
                assert len(two)==2
                for esm in range(1,4):
                    ec=f"{ch[:2] if ch.startswith('50') else '100'} ST average"
                    ep=tops[esm,ec]
                    for j,i in enumerate(two):
                        # Positive PSF lobe compared to BOTH ESF positive candidates;
                        # no assumption it is an intermediate or third optical focus.
                        targets=[(0,"zero-region")] if j==0 else [(1,"intermediate-side candidate"),(2,"third positive candidate")]
                        for k,label in targets:
                            compare.append(dict(psf_branch=branch,psf_measurement=m,psf_channel=ch,
                                esf_measurement=esm,esf_channel=ec,comparison=label,
                                psf_nominal_D=float(x[i]),esf_original_D=ep[k],
                                delta_PSF_minus_ESF_D=float(x[i]-ep[k]),
                                correspondence="descriptive only; optical identity and axis equivalence unverified"))
    write_csv(out/"ESF_PSF_peak_position_comparison.csv",compare)
    lines=["# ESF sanity-check analysis","","## Source and method",
      "Source: Sawyers & Sawyer (2026), dataset DOI https://doi.org/10.25422/azu.data.32080626; CC BY 4.0. Derived analysis; original workbook unchanged.",
      f"Input: ESFSystemData.xlsx / Multifocal!A1:N52. Workbook SHA256: {hashlib.sha256(raw).hexdigest()}.",
      "Three measurements: 50 S = C:E; 50 T = F:H; 100 S = I:K; 100 T = L:N. Rows 3–52: 50 samples each.",
      f"Original axis: B[row] = A[row] − $A$29; A29 = {origin} D. Cached formulas independently checked against subtraction.",
      f"Range {d[0]:.12f} to {d[-1]:.12f} D; nonuniform intervals {np.diff(d).min():.12f}–{np.diff(d).max():.12f} D.",
      "Positive defocus means Position > A29 in this workbook. Clinical sign convention, lens-plane conversion and physical zero are not established by that formula.",
      "Three measurements share this exact axis and reference. No extra nonzero common offset is evident from their common 0-D peaks; shared reference alone does not prove absolute calibration.",
      "All interior local maxima are retained (scipy find_peaks; no smoothing/interpolation/threshold/minimum distance). Endpoints cannot be two-sided maxima. Plateau boundaries retained; no invented sub-sample location.",
      "Primary three candidates = highest local-maximum heights; prominence rank also retained. Ranking is within each ESF channel only, with no use of optical-add labels or PSF magnitude.",
      "S/T averages = (S+T)/2 at the same row within each measurement. Original S and T remain in the sample CSV.",
      "", "## Top three candidates per measurement and channel (D)", "",
      "| Measurement | Channel | By height (in defocus order) | By prominence (in defocus order) |",
      "|---|---|---|---|"]
    for m in range(1,4):
        for ch in signals[m]:
            pp=sorted(r["defocus_D"] for r in peakrows if r["measurement"]==m and r["channel"]==ch and r["top3_by_prominence"])
            lines.append(f"| {m} | {ch} | {fmt(tops[m,ch])} | {fmt(pp)} |")
    lines+=["","## Peak spacing in S/T averages","","| Measurement | Frequency | zero to intermediate candidate | intermediate to third | zero to third |","|---|---|---|---|---|"]
    for m in range(1,4):
        for freq in (50,100):
            ep=tops[m,f"{freq} ST average"]
            lines.append(f"| {m} | {freq} lp/mm | {ep[1]-ep[0]:.6f} D | {ep[2]-ep[1]:.6f} D | {ep[2]-ep[0]:.6f} D |")
    lines+=["","## Interpretation and PSF comparison",
      "50 lp/mm: all raw S/T channels and S/T averages have top-by-height peaks at 0, +1.905527 to +2.102117, and +2.899795 D. The middle peak is weaker; prominence ranking sometimes selects a different local bump.",
      "100 lp/mm: two strongest focal regions (0 and +2.899795 D) are stable. Middle-side structure remains visible in S/T averages (+2.102117 to +2.299832 D), but individual channels/selection rules are less consistent. 100 S M1/M2 rank +0.560324 D among the highest three; do not relabel it as an intermediate optical focus.",
      "The three 50-lp/mm average peak sets are 0/1.905527/2.899795, 0/2.102117/2.899795, 0/1.905527/2.899795 D. Middle variation is one original grid interval (0.196590 D). The 100-lp/mm average middle candidate spans one interval (0.197715 D).",
      "Relative to the user-supplied nominal optical adds 2.2/3.2 D, 50-lp/mm middle positions differ by −0.294473 to −0.097883 D and the third by −0.300205 D. Their spacing is compatible with a roughly 2/3-D structure, but exact optical-add equivalence is unverified. This is not evidence to apply a +0.3-D correction: the zero peak already lies at 0 D.",
      "ESF and PSF measurements are NOT paired repetitions and PSF x/y are not established as equivalent to ESF S/T. Only original-axis positions are compared; no cross-system MTF magnitude comparison or average is made.",
      "PSF author 50x: zero peak = 0 D for M1–M5. Dominant positive lobe = +2.75, +2.50, +2.50, +2.00, +1.75 D respectively. Versus ESF middle range, signed differences span −0.352117 to +0.844473 D; versus ESF third +2.899795 D they span −1.149795 to −0.149795 D. Neither proves which optical focus that broad PSF lobe represents.",
      "PSF mean 50x curve has a broad positive maximum at +2.25 D: +0.147883 to +0.344473 D relative to ESF middle, or −0.649795 D relative to ESF third. It cannot be counted as a successful match to both ESF peaks. The prior PSF −3.50-D weak candidate has no supported correspondence to ESF third; no sign reversal is applied.",
      "Full pairwise location differences for both PSF branches and all four directional samples are in ESF_PSF_peak_position_comparison.csv. Original PSF values/results remain unchanged.",
      "", "## Priority for investigation",
      "First audit actual bench position → defocus mapping and per-measurement alignment. ESF uses a nonuniform position-derived axis; PSF uses a nominal uniform 0.25-D index mapping. They cannot be equated without calibration. Stable ESF peaks but a 1-D shift of the PSF positive lobe warrant checking stage position, magnification/calibration and acquisition alignment—not shifting data to fit ESF.",
      "Background processing remains an independent priority for PSF energy/MTF reliability, given the previous negative-pixel and border-energy diagnostics. Peak positions alone cannot establish that background is the cause. A shared constant offset cannot by itself explain a stable zero peak and a moving positive lobe.",
      "No production files, evidence JSON, PSF data, defocus signs or convolution pipeline were changed.",
      "", "## Reproduce",
      "Dependencies: existing PSF analysis requirements plus openpyxl (read-only import).",
      "python3 research/psf-validation/esf_sanity_check.py --dataset /path/to/32080626.zip --psf-results research/psf-validation/generated/outputs/through_focus_mtf.csv --output research/psf-validation/generated/esf",
      "", "## Full local-maxima locations",
      "All locations below are original sampled coordinates; full precision, source row, height and prominence are in ESF_raw_peak_table.csv.",""]
    for m in range(1,4):
        for ch in signals[m]:
            lines.append(f"- M{m} {ch}: "+fmt([r["defocus_D"] for r in peakrows if r["measurement"]==m and r["channel"]==ch]))
    (Path(__file__).resolve().parent/"ESF_SANITY_CHECK.md").write_text("\n".join(lines)+"\n",encoding="utf-8")
    print(json.dumps({"samples":len(rawrows),"all_local_maxima":len(peakrows),
        "comparison_rows":len(compare),"xlsx_sha256":hashlib.sha256(raw).hexdigest()},indent=2))

if __name__=="__main__": main()
