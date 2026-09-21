#!/usr/bin/env python3
"""Research only: Sawyers dataset, Multifocal Measurement 1-5, full-frame PSF."""
import argparse
import csv
import hashlib
import io
import json
import platform
import zipfile
from pathlib import Path

import numpy as np
import scipy
from scipy.ndimage import median_filter
from scipy.signal import find_peaks
from PIL import Image
from PIL import __version__ as pillow_version

SCALE = .00504 / 20
DEFOCUS_STATUS = "nominal mapping from author code; not yet mapped to clinical viewing-distance convention"
SCALE_STATUS = "derived from author MATLAB calibration; not independently validated"
# MATLAB one-based (row, column), converted exactly once here.
SAMPLES = {"50x": (554, 960), "100x": (567, 960),
           "50y": (540, 984), "100y": (540, 1008)}
AXES = ("50x", "50y", "100x", "100y")
BRANCHES = ("author", "convolution")
D = np.arange(37) * .25 - 4.5


def read_tiff(z, name):
    with Image.open(io.BytesIO(z.read(name))) as im:
        a = np.asarray(im).copy()
        if im.n_frames != 1 or a.shape != (1080, 1920) or a.dtype != np.uint16:
            raise ValueError(f"Unexpected TIFF format: {name}, {a.shape}, {a.dtype}")
        return a


def author_method(raw, dark):
    # author-method reproduction: uint16 imread; MATLAB saturated integer subtraction.
    psf = np.maximum(raw.astype(np.int32) - dark.astype(np.int32), 0).astype(np.uint16)
    # author-method reproduction: imrotate(angle=0, bilinear, crop) is identity.
    # author-method reproduction: fftshift, fft2, magnitude.
    magnitude = np.abs(np.fft.fftshift(np.fft.fft2(psf)))
    # author-method reproduction: medfilt2 defaults = 3x3, zero padding.
    filtered = median_filter(magnitude, size=3, mode="constant", cval=0)
    peak = float(filtered.max())
    if peak <= 0:
        raise ValueError("Author normalization undefined for zero-energy frame")
    # author-method reproduction: global peak normalization (NOT energy normalization).
    return filtered / peak


def convolution_candidate(raw, dark):
    signed = raw.astype(np.float64) - dark.astype(np.float64)
    clipped = np.maximum(signed, 0)
    energy = float(clipped.sum())
    if energy <= 0:
        raise ValueError("Convolution normalization undefined for zero-energy frame")
    # energy normalization for convolution; no rotation/crop/sharpening/resampling.
    kernel = clipped / energy
    magnitude = np.abs(np.fft.fftshift(np.fft.fft2(kernel)))
    cy, cx = np.array(kernel.shape) // 2
    mtf = magnitude / magnitude[cy, cx]
    assert np.isclose(kernel.sum(), 1, atol=1e-12)
    assert mtf[cy, cx] == 1
    return signed, clipped, kernel, mtf


def write_csv(path, rows):
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)


def diagnostics(raw, dark, signed, clipped, measurement, index):
    h, w = raw.shape
    energy = float(clipped.sum())
    cx = float(np.dot(clipped.sum(axis=0), np.arange(w)) / energy)
    cy = float(np.dot(clipped.sum(axis=1), np.arange(h)) / energy)
    py, px = np.unravel_index(clipped.argmax(), clipped.shape)
    mask = np.ones(raw.shape, dtype=bool)
    mask[50:-50, 50:-50] = False
    background = signed[mask]  # edge proxy only: may contain real PSF wings
    row = dict(measurement=measurement, image_filename=f"Image_{index:02}.tif",
               nominal_defocus_D=float(D[index-1]), width=w, height=h,
               total_intensity_after_dark_subtraction=float(signed.sum()),
               total_intensity_after_clipping=energy,
               maximum_raw_pixel=int(raw.max()), maximum_pixel_after_dark_subtraction=float(signed.max()),
               maximum_dark_pixel=int(dark.max()),
               saturation_fraction=float(np.mean(raw == np.iinfo(raw.dtype).max)),
               dark_saturation_fraction=float(np.mean(dark == np.iinfo(dark.dtype).max)),
               negative_pixel_fraction_before_clipping=float(np.mean(signed < 0)),
               background_outer_50px_mean=float(background.mean()),
               background_outer_50px_sd=float(background.std(ddof=1)),
               background_outer_50px_median=float(np.median(background)),
               background_outer_50px_p05=float(np.percentile(background, 5)),
               background_outer_50px_p95=float(np.percentile(background, 95)),
               centroid_x=cx, centroid_y=cy, peak_x=int(px), peak_y=int(py),
               kernel_sum=float(clipped.sum()/energy))
    for b in (10, 25, 50):
        row[f"border_{b}px_energy_fraction"] = float((energy-clipped[b:-b,b:-b].sum())/energy)
    # Full-frame centroid-centered radial bins: [r,r+1), no frame crop.
    yy, xx = np.ogrid[:h,:w]
    radius = np.sqrt((xx-cx)**2+(yy-cy)**2).astype(np.int32)
    bins = np.bincount(radius.ravel(), weights=clipped.ravel())
    counts = np.bincount(radius.ravel())
    ee = np.cumsum(bins)/energy
    nearest_edge = min(cx, cy, w-1-cx, h-1-cy)
    row["centroid_nearest_edge_px"] = float(nearest_edge)
    row["energy_inside_largest_centroid_circle_fraction"] = float(clipped[radius < int(nearest_edge)].sum()/energy)
    for q in (.5,.8,.9,.95,.99):
        # Upper bin edge, 1px quantization; not an interpolated optical measurement.
        row[f"r{int(q*100)}_upper_bin_px"] = int(np.searchsorted(ee,q)+1)
    profile = [dict(measurement=measurement, image_filename=row["image_filename"],
                    nominal_defocus_D=row["nominal_defocus_D"], radius_bin_lower_px=r,
                    radius_bin_upper_px=r+1, pixel_count=int(counts[r]),
                    annular_energy_fraction=float(bins[r]/energy),
                    encircled_energy_fraction=float(ee[r]),
                    annular_mean_intensity=float(bins[r]/counts[r]) if counts[r] else None)
               for r in range(len(bins))]
    return row, profile


def peaks(y):
    # Analysis convention, not author processing: highest-prominence three observed
    # local maxima, at least 1 D apart. Never invent missing maxima.
    ix, props = find_peaks(y, distance=4, prominence=0)
    take = np.argsort(props["prominences"])[-3:]
    return sorted(int(ix[t]) for t in take)


def self_test():
    raw = np.array([[0,10],[5,2]],dtype=np.uint16)
    dark = np.array([[1,2],[1,9]],dtype=np.uint16)
    signed, clipped, kernel, mtf = convolution_candidate(raw,dark)
    np.testing.assert_array_equal(clipped,[[0,8],[4,0]])
    assert signed[0,0] == -1 and np.isclose(kernel.sum(),1)
    # Explicit reference median, including zero-padded boundaries.
    a = np.arange(20,dtype=float).reshape(4,5)
    padded = np.pad(a,1)
    expected = np.array([[np.median(padded[y:y+3,x:x+3]) for x in range(5)] for y in range(4)])
    np.testing.assert_array_equal(median_filter(a,size=3,mode="constant"),expected)
    impulse = np.zeros((8,8),dtype=np.uint16); impulse[4,4] = 10
    _,_,k,m = convolution_candidate(impulse,np.zeros_like(impulse))
    np.testing.assert_allclose(m,1)
    a = author_method(impulse,np.zeros_like(impulse))
    np.testing.assert_allclose(a[1:-1,1:-1],1)
    assert a[0,0] == 0  # zero-padded median at a corner
    assert (D[0],D[18],D[36]) == (-4.5,0,4.5)
    assert SAMPLES["50x"] == (555-1,961-1)
    print("Self tests passed",flush=True)


def figures(out, values):
    global matplotlib, plt
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    for branch in BRANCHES:
        for m in range(5):
            fig, axs = plt.subplots(2,1,figsize=(8,6),sharex=True)
            for fi,freq in enumerate((50,100)):
                for axis in ("x","y"):
                    axs[fi].plot(D,values[branch][f"{freq}{axis}"][m],label=axis)
                axs[fi].set_ylabel(f"MTF ~{freq} cyc/mm"); axs[fi].legend(); axs[fi].grid(alpha=.25)
            axs[-1].set_xlabel("Nominal bench defocus (D); not clinical viewing distance")
            fig.suptitle(f"{branch} | Measurement {m+1}")
            fig.tight_layout(); fig.savefig(out/f"{branch}_measurement_{m+1}.png",dpi=140); plt.close(fig)
        for mode in ("overlay","mean_sd"):
            fig, axs = plt.subplots(2,2,figsize=(11,7),sharex=True)
            for ax,key in zip(axs.flat,AXES):
                v=values[branch][key]
                if mode=="overlay":
                    for m in range(5): ax.plot(D,v[m],label=f"M{m+1}")
                else:
                    mean=v.mean(axis=0); sd=v.std(axis=0,ddof=1)
                    ax.plot(D,mean,label="mean"); ax.fill_between(D,mean-sd,mean+sd,alpha=.25,label="sample SD")
                ax.set_title(key+" (~cyc/mm, author axis naming)")
                ax.set_xlabel("Nominal defocus (D)"); ax.set_ylabel("MTF"); ax.grid(alpha=.25); ax.legend(fontsize=8)
            fig.suptitle(f"{branch} | {mode} | full-frame; no clinical sign conversion")
            fig.tight_layout(); fig.savefig(out/f"{branch}_{mode}.png",dpi=140); plt.close(fig)


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--dataset",type=Path)
    p.add_argument("--output",type=Path,default=Path("research/psf-validation/generated/outputs"))
    p.add_argument("--self-test",action="store_true")
    args=p.parse_args()
    self_test()
    if args.self_test: return
    if args.dataset is None: p.error("--dataset is required")
    out=args.output; out.mkdir(parents=True,exist_ok=True)
    rows=[]; profiles=[]; curve_rows=[]
    values={b:{k:np.empty((5,37)) for k in AXES} for b in BRANCHES}
    manifests=[]
    with zipfile.ZipFile(args.dataset) as outer:
        author_code=outer.read("ThroughFocusMTF.m")
        # Nested ZIP in memory. Raw images are never extracted to disk or repository.
        print("Reading IOL Data.zip into memory; Simulation Data is not opened",flush=True)
        with zipfile.ZipFile(io.BytesIO(outer.read("IOL Data.zip"))) as z:
            names=z.namelist()
            for m in range(1,6):
                suffix=f"Multifocal/Measurement {m}/dark.tif"
                candidates=[n for n in names if n==suffix or n.endswith("/"+suffix)]
                if len(candidates)!=1: raise ValueError(f"Ambiguous or missing {suffix}")
                prefix=candidates[0][:-len("dark.tif")]
                expected={f"Image_{i:02}.tif" for i in range(1,38)}
                actual={n[len(prefix):] for n in names if n.startswith(prefix) and n[len(prefix):].startswith("Image")}
                if actual!=expected: raise ValueError(f"Unexpected frame set for Measurement {m}")
                dark=read_tiff(z,prefix+"dark.tif")
                manifests.append({"path":prefix+"dark.tif","sha256":hashlib.sha256(z.read(prefix+"dark.tif")).hexdigest()})
                for i in range(1,38):
                    name=prefix+f"Image_{i:02}.tif"
                    raw=read_tiff(z,name)
                    manifests.append({"path":name,"sha256":hashlib.sha256(z.read(name)).hexdigest()})
                    a=author_method(raw,dark)
                    signed,clipped,kernel,b=convolution_candidate(raw,dark)
                    row,profile=diagnostics(raw,dark,signed,clipped,m,i)
                    row["author_mtf_DC"]=float(a[540,960])
                    row["convolution_mtf_DC"]=float(b[540,960])
                    row["kernel_sum"]=float(kernel.sum())
                    rows.append(row); profiles.extend(profile)
                    for branch,mtf in (("author",a),("convolution",b)):
                        r=dict(branch=branch,measurement=m,image_filename=f"Image_{i:02}.tif",nominal_defocus_D=float(D[i-1]))
                        for key,(y,x) in SAMPLES.items():
                            v=float(mtf[y,x]); values[branch][key][m-1,i-1]=v; r[key]=v
                        curve_rows.append(r)
                    if i%10==0: print(f"Measurement {m}: {i}/37 frames",flush=True)
                print(f"Measurement {m} complete",flush=True)
            write_csv(out/"diagnostics.csv",rows)
            write_csv(out/"radial_encircled_energy.csv",profiles)
            write_csv(out/"through_focus_mtf.csv",curve_rows)
            summary={}
            stats=[]
            for branch in BRANCHES:
                summary[branch]={}
                for key in AXES:
                    v=values[branch][key]; mean=v.mean(axis=0); sd=v.std(axis=0,ddof=1)
                    peak_indices=peaks(mean)
                    summary[branch][key]={
                        "mean_curve_peaks":[{"nominal_defocus_D":float(D[i]),"mean_mtf":float(mean[i]),
                                            "sample_sd_mtf":float(sd[i])} for i in peak_indices],
                        "measurement_peaks_D":[[float(D[i]) for i in peaks(v[m])] for m in range(5)],
                        "minimum_pairwise_pearson_r":float(np.corrcoef(v)[np.triu_indices(5,1)].min()),
                        "mean_pointwise_sample_sd":float(sd.mean()),
                        "maximum_pointwise_sample_sd":float(sd.max())}
                    for i in range(37):
                        stats.append(dict(branch=branch,axis=key,nominal_defocus_D=float(D[i]),mean=float(mean[i]),sample_SD=float(sd[i]),n=5))
            write_csv(out/"mean_sd.csv",stats)
            figures(out,values)
            # Representative full-frame PSFs at the author 50x mean-curve peaks.
            # M1 is explicit, not selected for best appearance. Display log scale only.
            rep=peaks(values["author"]["50x"].mean(axis=0))
            suffix="Multifocal/Measurement 1/dark.tif"
            prefix=next(n[:-len("dark.tif")] for n in names if n==suffix or n.endswith("/"+suffix))
            dark=read_tiff(z,prefix+"dark.tif")
            fig,axs=plt.subplots(1,len(rep),figsize=(6*len(rep),4),squeeze=False)
            for ax,i in zip(axs.flat,rep):
                raw=read_tiff(z,prefix+f"Image_{i+1:02}.tif")
                _,_,kernel,_=convolution_candidate(raw,dark)
                shown=np.ma.masked_less_equal(kernel,0)
                im=ax.imshow(np.ma.log10(shown),origin="upper",cmap="magma",interpolation="nearest")
                ax.set_title(f"M1 Image_{i+1:02} | nominal {D[i]:+.2f} D")
                ax.set_xlabel("Full-frame x pixel"); ax.set_ylabel("y pixel")
                fig.colorbar(im,ax=ax,label="log10 normalized energy/pixel (display only)")
            fig.tight_layout(); fig.savefig(out/"representative_full_frame_psfs.png",dpi=180); plt.close(fig)
    frequencies={k:{"matlab_row":y+1,"matlab_column":x+1,
                    "row_frequency_cyc_mm":float(np.fft.fftshift(np.fft.fftfreq(1080,SCALE))[y]),
                    "column_frequency_cyc_mm":float(np.fft.fftshift(np.fft.fftfreq(1920,SCALE))[x])}
                 for k,(y,x) in SAMPLES.items()}
    ranges={k:{"min":min(r[k] for r in rows),"max":max(r[k] for r in rows)}
            for k in ("saturation_fraction","negative_pixel_fraction_before_clipping",
                      "background_outer_50px_mean","background_outer_50px_sd",
                      "border_10px_energy_fraction","border_50px_energy_fraction",
                      "r90_upper_bin_px","r99_upper_bin_px","author_mtf_DC","kernel_sum")}
    metadata=dict(research_only=True,dataset_doi="10.25422/azu.data.32080626",
                  dataset_filename=args.dataset.name,
                  author_script_sha256=hashlib.sha256(author_code).hexdigest(),
                  selected_measurements=[1,2,3,4,5],excluded_measurements=[6],
                  simulation_data_used=False,frame_count=len(rows),frame_shape_yx=[1080,1920],
                  defocus_status=DEFOCUS_STATUS,spatial_scale_status=SCALE_STATUS,
                  pixel_scale_mm=SCALE,wavelength_nm=None,pupil_mm=None,model_eye_condition=None,
                  metadata_note="Unverified acquisition conditions intentionally null; not inferred from TIFF or MTF.",
                  branches={"author":"author-method reproduction; uint16 saturated subtraction; rotation 0; FFT magnitude; 3x3 zero-padded median; global peak normalization",
                            "convolution":"energy normalization for convolution; float subtraction; clip negatives; full-frame sum=1; FFT magnitude / DC; no filtering"},
                  exact_frequency_samples=frequencies,
                  peak_selection="Analysis only: scipy find_peaks, >=4 samples (1 D) spacing; top three prominences; no defocus interpolation.",
                  representative_psfs="Measurement 1 at peaks of author 50x mean curve; log display; no cropped/resized numerical PSF saved.",
                  diagnostics_note="Background is outer 50px proxy, not assumed signal-free. Saturation tests uint16 ceiling 65535 only. Border bands are diagnostics, not crop choices. Radial bins are centroid-centered, 1px upper edges.",
                  reproduction_limit="Python semantic port; MATLAB R2024b execution and numerical equivalence against author reference arrays not available.",
                  versions={"python":platform.python_version(),"numpy":np.__version__,"scipy":scipy.__version__,"matplotlib":matplotlib.__version__,"Pillow":pillow_version},
                  diagnostics_ranges=ranges,curves=summary)
    (out/"summary.json").write_text(json.dumps(metadata,indent=2,allow_nan=False)+"\n")
    (out/"input_manifest.json").write_text(json.dumps(manifests,indent=2)+"\n")
    print(json.dumps({"frames":len(rows),"diagnostics_ranges":ranges,"curves":summary},indent=2))
    print(f"Finished: {out}",flush=True)


if __name__=="__main__":
    main()
