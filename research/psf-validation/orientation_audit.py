#!/usr/bin/env python3
"""Research-only full-angle orientation audit. No image convolution or axis alignment."""
import argparse,csv,hashlib,io,json,platform,zipfile
from pathlib import Path
import numpy as np
from PIL import Image
import scipy
from scipy.signal import find_peaks
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

SCALE=.00504/20
ANGLES=np.arange(0,180,5,dtype=float)
DEFOCUS=np.arange(37)*.25-4.5
FREQS=(50,100)
BORDER=50

def bilinear(a,y,x):
    y=np.asarray(y); x=np.asarray(x)
    iy=np.floor(y).astype(int); ix=np.floor(x).astype(int)
    assert np.all(iy>=0) and np.all(ix>=0) and np.all(iy+1<a.shape[0]) and np.all(ix+1<a.shape[1])
    wy=y-iy; wx=x-ix
    return (a[iy,ix]*(1-wy)*(1-wx)+a[iy+1,ix]*wy*(1-wx)+
            a[iy,ix+1]*(1-wy)*wx+a[iy+1,ix+1]*wy*wx)

def ring(a,freq,angles=ANGLES):
    theta=np.deg2rad(angles); h,w=a.shape
    fx=freq*np.cos(theta); fy=freq*np.sin(theta)
    y=h//2+fy*h*SCALE; x=w//2+fx*w*SCALE
    return bilinear(a,y,x),fx,fy,y,x

def mtf_dc(psf):
    a=np.abs(np.fft.fftshift(np.fft.fft2(psf)))
    dc=float(a[a.shape[0]//2,a.shape[1]//2])
    if not np.isfinite(dc) or dc<=0: raise ValueError("No valid positive DC; stop, no filled values")
    result=a/dc
    assert result[result.shape[0]//2,result.shape[1]//2]==1
    return result,dc

def preprocess(raw,dark):
    signed=raw.astype(np.float64)-dark.astype(np.float64)
    # A: author PSF preprocessing semantics ONLY. Rotation 0 degrees is identity.
    A=np.maximum(raw.astype(np.int32)-dark.astype(np.int32),0).astype(np.uint16)
    mask=np.ones(raw.shape,dtype=bool); mask[BORDER:-BORDER,BORDER:-BORDER]=False
    # B: residual estimate uses signed residuals BEFORE clipping, never clipped A.
    residual=float(np.median(signed[mask]))
    B=np.maximum(signed-residual,0)
    return A,B,signed,residual,mask

def read_tiff(z,name):
    data=z.read(name)
    with Image.open(io.BytesIO(data)) as im:
        a=np.asarray(im).copy()
        assert im.n_frames==1 and a.shape==(1080,1920) and a.dtype==np.uint16
    return a,hashlib.sha256(data).hexdigest()

def csvout(path,rows):
    with path.open("w",newline="",encoding="utf-8") as f:
        w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)

def self_test():
    plane=np.fromfunction(lambda y,x:3*y+2*x+1,(5,6))
    y=np.array([.25,1.,2.5]); x=np.array([.75,2.,3.25])
    np.testing.assert_allclose(bilinear(plane,y,x),3*y+2*x+1)
    np.testing.assert_array_equal(bilinear(plane,np.array([1.,2.]),np.array([2.,3.])),plane[[1,2],[2,3]])
    impulse=np.zeros((32,64));impulse[12,18]=10
    mtf,dc=mtf_dc(impulse)
    for freq in FREQS: np.testing.assert_allclose(ring(mtf,freq)[0],1,atol=1e-14)
    raw=np.full((120,120),100,dtype=np.uint16);dark=np.full_like(raw,80);raw[60,60]=110
    A,B,signed,bg,_=preprocess(raw,dark)
    assert bg==20 and B.sum()==10 and A[60,60]==30 and B[60,60]==10
    assert np.array_equal(DEFOCUS[[0,18,36]],[-4.5,0,4.5])
    print("Synthetic interpolation/DC/background tests passed",flush=True)

def make_plots(out,stats,angular):
    for freq in FREQS:
        selected=[r for r in angular if r["frequency_cyc_mm"]==freq]
        vmax=max(r["mtf"] for r in selected)
        fig,axs=plt.subplots(5,2,figsize=(11,15),sharex=True,sharey=True)
        for m in range(1,6):
            for col,method in enumerate(("A","B")):
                q=np.array([[r["mtf"] for r in selected if r["measurement"]==m and r["method"]==method and r["image_index"]==i] for i in range(1,38)])
                assert q.shape==(37,36)
                ax=axs[m-1,col]
                im=ax.imshow(q.T,origin="lower",aspect="auto",interpolation="nearest",
                    extent=(-4.625,4.625,-2.5,177.5),vmin=0,vmax=vmax,cmap="viridis")
                ax.set_title(f"M{m} / {method}");ax.set_ylabel("Angle (degrees)")
                ax.set_xticks([-4,-2,0,2,3,4]); ax.set_yticks([0,45,90,135,175])
        for ax in axs[-1]: ax.set_xlabel("Unchanged nominal defocus (D)")
        fig.suptitle(f"{freq} cyc/mm: angular MTF / DC\nShared color scale across methods and measurements; no angle alignment")
        fig.subplots_adjust(left=.09,right=.84,hspace=.32,bottom=.06,top=.93)
        fig.colorbar(im,cax=fig.add_axes([.89,.15,.018,.67]),label="Unfiltered MTF / DC")
        fig.savefig(out/f"heatmaps_{freq}cycmm.png",dpi=150);plt.close(fig)
        for metric in ("angular_mean","angular_median"):
            fig,ax=plt.subplots(figsize=(10,5))
            for m in range(1,6):
                for method,style in (("A","-"),("B","--")):
                    q=[r for r in stats if r["measurement"]==m and r["method"]==method and r["frequency_cyc_mm"]==freq]
                    ax.plot(DEFOCUS,[r[metric] for r in q],style,marker=".",ms=3,color=f"C{m-1}",label=f"M{m} {method}")
            ax.set_title(f"{freq} cyc/mm / {metric}; A solid, B dashed")
            ax.set_xlabel("Nominal defocus (D)");ax.set_ylabel("MTF / DC");ax.grid(alpha=.2)
            ax.legend(ncol=5,fontsize=8);fig.tight_layout()
            fig.savefig(out/f"{metric}_{freq}cycmm_overlay.png",dpi=150);plt.close(fig)
    for m in range(1,6):
        fig,axs=plt.subplots(2,2,figsize=(11,7),sharex=True)
        for row,freq in enumerate(FREQS):
            for col,metric in enumerate(("angular_mean","angular_median")):
                ax=axs[row,col]
                for method in ("A","B"):
                    q=[r for r in stats if r["measurement"]==m and r["method"]==method and r["frequency_cyc_mm"]==freq]
                    ax.plot(DEFOCUS,[r[metric] for r in q],".-",label=method,ms=4)
                ax.set_title(f"{freq} cyc/mm / {metric}");ax.set_xlabel("Nominal D");ax.set_ylabel("MTF / DC")
                ax.grid(alpha=.2);ax.legend()
        fig.suptitle(f"Measurement {m}; no defocus interpolation/smoothing")
        fig.tight_layout();fig.savefig(out/f"M{m}_radial_curves.png",dpi=150);plt.close(fig)

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--dataset",type=Path)
    p.add_argument("--output",type=Path,default=Path("research/psf-validation/generated/orientation"))
    p.add_argument("--self-test",action="store_true")
    a=p.parse_args();self_test()
    if a.self_test:return
    if a.dataset is None:p.error("--dataset is required")
    out=a.output;out.mkdir(parents=True,exist_ok=True)
    angular=[];stats=[];background=[];manifest=[];symmetry=0.
    with zipfile.ZipFile(a.dataset) as outer:
        author_hash=hashlib.sha256(outer.read("ThroughFocusMTF.m")).hexdigest()
        with zipfile.ZipFile(io.BytesIO(outer.read("IOL Data.zip"))) as z:
            for m in range(1,6):
                suffix=f"Multifocal/Measurement {m}/dark.tif"
                names=[n for n in z.namelist() if n==suffix or n.endswith("/"+suffix)]
                assert len(names)==1;prefix=names[0][:-8]
                expected={f"Image_{i:02}.tif" for i in range(1,38)}
                actual={n[len(prefix):] for n in z.namelist() if n.startswith(prefix) and n[len(prefix):].startswith("Image")}
                assert actual==expected
                dark,sha=read_tiff(z,prefix+"dark.tif")
                manifest.append(dict(path=prefix+"dark.tif",sha256=sha))
                for i in range(1,38):
                    name=prefix+f"Image_{i:02}.tif";raw,sha=read_tiff(z,name)
                    manifest.append(dict(path=name,sha256=sha))
                    A,B,signed,bg,mask=preprocess(raw,dark)
                    background.append(dict(measurement=m,image_index=i,nominal_defocus_D=float(DEFOCUS[i-1]),
                        border_width_px=BORDER,border_pixels=int(mask.sum()),signed_border_median=bg,
                        signed_border_mean=float(signed[mask].mean()),signed_border_SD=float(signed[mask].std(ddof=0)),
                        signed_negative_fraction=float(np.mean(signed<0)),
                        A_energy=float(A.sum()),B_energy=float(B.sum()),
                        A_border_energy_fraction=float(A[mask].sum()/A.sum()),
                        B_border_energy_fraction=float(B[mask].sum()/B.sum())))
                    for method,psf in (("A",A),("B",B)):
                        mtf,dc=mtf_dc(psf)
                        for freq in FREQS:
                            values,fx,fy,y,x=ring(mtf,freq)
                            antipodal=ring(mtf,freq,ANGLES+180)[0]
                            symmetry=max(symmetry,float(np.max(abs(values-antipodal))))
                            q25,q75=np.quantile(values,[.25,.75],method="linear")
                            base=dict(method=method,measurement=m,image_index=i,
                                nominal_defocus_D=float(DEFOCUS[i-1]),frequency_cyc_mm=freq)
                            row=dict(**base,angular_mean=float(values.mean()),angular_median=float(np.median(values)),
                                angular_SD=float(values.std(ddof=0)),angular_IQR=float(q75-q25),
                                minimum=float(values.min()),maximum=float(values.max()),
                                angle_of_maximum_deg=float(ANGLES[values.argmax()]),
                                angle_of_minimum_deg=float(ANGLES[values.argmin()]),
                                all_tied_max_angles=";".join(str(v) for v in ANGLES[values==values.max()]),
                                all_tied_min_angles=";".join(str(v) for v in ANGLES[values==values.min()]),
                                angular_range=float(np.ptp(values)),horizontal_mtf=float(values[0]),
                                vertical_mtf=float(values[18]),DC=dc,normalized_DC=float(mtf[540,960]))
                            stats.append(row)
                            for j,angle in enumerate(ANGLES):
                                angular.append(dict(**base,angle_deg=float(angle),fx_cyc_mm=float(fx[j]),
                                    fy_cyc_mm=float(fy[j]),fft_row_coordinate=float(y[j]),
                                    fft_column_coordinate=float(x[j]),mtf=float(values[j])))
                    if i%10==0:print(f"M{m}: {i}/37",flush=True)
                print(f"M{m} complete",flush=True)
    assert symmetry<1e-12
    peaks=[]
    for m in range(1,6):
        for method in ("A","B"):
            for freq in FREQS:
                q=[r for r in stats if r["measurement"]==m and r["method"]==method and r["frequency_cyc_mm"]==freq]
                for metric in ("angular_mean","angular_median"):
                    v=np.array([r[metric] for r in q])
                    ix,props=find_peaks(v,prominence=0,plateau_size=True)
                    order=sorted(range(len(ix)),key=lambda j:(-props["prominences"][j],ix[j]))
                    for j,k in enumerate(ix):
                        peaks.append(dict(method=method,measurement=m,frequency_cyc_mm=freq,metric=metric,
                            image_index=int(k+1),nominal_defocus_D=float(DEFOCUS[k]),mtf=float(v[k]),
                            prominence=float(props["prominences"][j]),rank_by_prominence=order.index(j)+1,
                            plateau_start_D=float(DEFOCUS[props["left_edges"][j]]),
                            plateau_end_D=float(DEFOCUS[props["right_edges"][j]])))
    csvout(out/"complete_angular.csv",angular);csvout(out/"angular_statistics.csv",stats)
    csvout(out/"background_diagnostics.csv",background);csvout(out/"peak_summary.csv",peaks)
    make_plots(out,stats,angular)
    metadata=dict(dataset_doi="10.25422/azu.data.32080626",author_code_sha256=author_hash,
        frame_count=185,measurements=[1,2,3,4,5],excluded_measurements=[6],simulation_data_used=False,
        angles_deg=ANGLES.tolist(),angle_period_deg=180,
        angle_convention="0 = positive column-frequency (horizontal); 90 = positive row-frequency (vertical). Not confirmed physical sagittal/tangential.",
        half_circle_reason="Real-valued PSFs give antipodal Fourier-magnitude symmetry; numerical bilinear check recorded.",
        max_antipodal_difference=symmetry,pixel_scale_mm=SCALE,
        spatial_scale_status="derived from author MATLAB calibration; not independently validated",
        defocus_status="nominal mapping from author code; not yet mapped to clinical viewing-distance convention",
        method_A="uint16 saturated dark subtraction; 0-degree identity rotation; no crop or sharpening",
        method_B="float signed dark subtraction; subtract median of outer 50px border; clip negatives to zero",
        background_border_note="Fixed before observing results; inherited diagnostic width, not tuned; may contain PSF wings.",
        mtf_definition="abs(fftshift(fft2(processed_PSF))) / unfiltered DC",
        distinction="This requested MTF definition does NOT apply author's post-FFT median filter or filtered-maximum normalization. Original author branch unchanged.",
        interpolation="Bilinear spatial-frequency sampling only; no defocus interpolation, angle smoothing, or image rotation.",
        angular_SD_ddof=0,quartile_method="numpy quantile linear (statistical definition only)",
        peak_method="All interior local maxima; no height/prominence/distance threshold; no forced count. Endpoints excluded; plateaus reported.",
        peak_angles="5-degree sampled maxima/minima; smallest angle selected for ties, all exact ties retained. Not sub-angle estimates.",
        native_MATLAB_equivalence_verified=False,
        illumination_source="white light",nominal_filter_nm=560,filter_bandwidth_nm=None,
        illumination_provenance="User supplied paper schematic; no per-frame spectral validation",
        versions=dict(python=platform.python_version(),numpy=np.__version__,scipy=scipy.__version__,matplotlib=matplotlib.__version__))
    (out/"metadata.json").write_text(json.dumps(metadata,indent=2,allow_nan=False)+"\n")
    (out/"input_manifest.json").write_text(json.dumps(manifest,indent=2)+"\n")
    print(json.dumps(dict(angular_rows=len(angular),statistic_rows=len(stats),peaks=len(peaks),
        max_antipodal_difference=symmetry),indent=2))

if __name__=="__main__":main()
