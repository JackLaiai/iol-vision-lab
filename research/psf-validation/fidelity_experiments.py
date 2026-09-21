#!/usr/bin/env python3
"""Independent fidelity audit experiments. No convolution and no input mutation."""
import argparse, csv, hashlib, io, json, zipfile
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import median_filter
from scipy.signal import find_peaks
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.colors import SymLogNorm, LogNorm
from analyze import author_method, SAMPLES, SCALE

CHANNELS={"vertical_50":"50x","horizontal_50":"50y","vertical_100":"100x","horizontal_100":"100y"}
OUTLABEL="system validation data; NOT PanOptix evidence"

def csvout(p,rows):
    with p.open("w",newline="") as f:
        w=csv.DictWriter(f,fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)

def read(z,name):
    b=z.read(name)
    with Image.open(io.BytesIO(b)) as im:
        a=np.asarray(im).copy()
        assert im.n_frames==1 and a.dtype==np.uint16 and a.shape==(1080,1920)
    return a,hashlib.sha256(b).hexdigest()

def process(p):
    otf=np.fft.fftshift(np.fft.fft2(p))
    mag=np.abs(otf)
    filt=median_filter(mag,size=3,mode="constant",cval=0)
    maximum=float(filt.max())
    assert maximum>0
    return filt/maximum,dict(fft_dtype=str(otf.dtype),magnitude_dtype=str(mag.dtype),
            filtered_dtype=str(filt.dtype),unfiltered_DC=float(mag[540,960]),
            filtered_maximum=maximum,filtered_DC=float(filt[540,960]))

def find_prefix(z,suffix):
    candidates=[n[:-8] for n in z.namelist() if n==suffix+"/dark.tif" or n.endswith("/"+suffix+"/dark.tif")]
    assert len(candidates)==1
    return candidates[0]

def tests():
    a=np.array([[0,65535,25],[1,50,0]],dtype=np.uint16)
    d=np.array([[1,0,50],[65535,25,0]],dtype=np.uint16)
    signed=a.astype(float)-d.astype(float)
    A=np.maximum(a.astype(np.int32)-d.astype(np.int32),0).astype(np.uint16)
    C=np.maximum(signed,0)
    np.testing.assert_array_equal(A,C)
    np.testing.assert_array_equal(A,[[0,65535,0],[0,25,0]])
    a=np.arange(20.).reshape(4,5)
    q=np.pad(a,1)
    expected=np.array([[np.median(q[y:y+3,x:x+3]) for x in range(5)] for y in range(4)])
    np.testing.assert_array_equal(median_filter(a,size=3,mode="constant",cval=0),expected)
    frequency={}
    for size in (1080,1920):
        positions=SCALE*np.linspace(1,size,size)
        step=positions[1]-positions[0]
        literal=np.linspace(-1/(2*step),1/(2*step),size+1)[:-1]
        equivalent=np.fft.fftshift(np.fft.fftfreq(size,SCALE))
        frequency[str(size)]={"literal_step_mm":float(step),"max_axis_absolute_difference":float(abs(literal-equivalent).max())}
        np.testing.assert_allclose(literal,equivalent,rtol=0,atol=1e-10)
    return frequency

def plots(out,rows,group):
    rr=[r for r in rows if r["group"]==group and r["variant"]=="A"]
    fig,axs=plt.subplots(2,2,figsize=(11,7),sharex=True)
    for ax,ch in zip(axs.flat,CHANNELS):
        for m in sorted({r["measurement"] for r in rr}):
            a=[r for r in rr if r["measurement"]==m]
            x=[r["image_index"] if group=="system" else r["nominal_defocus_D"] for r in a]
            ax.plot(x,[r[ch] for r in a],".-",label=f"M{m}")
        ax.set_title(ch); ax.set_ylabel("Author-method MTF"); ax.grid(alpha=.2); ax.legend()
        ax.set_xlabel("Image index (defocus unverified)" if group=="system" else "Unshifted nominal defocus (D)")
    fig.suptitle(OUTLABEL if group=="system" else group+" | A: uint16 semantics")
    fig.tight_layout(); fig.savefig(out/f"{group}_validation_curves.png",dpi=160); plt.close(fig)

def peak_table(rows):
    output=[]
    keys=sorted({(r["group"],r["measurement"],r["variant"]) for r in rows})
    for group,m,variant in keys:
        rr=[r for r in rows if (r["group"],r["measurement"],r["variant"])==(group,m,variant)]
        for ch in CHANNELS:
            y=np.array([r[ch] for r in rr]); ix,p=find_peaks(y,prominence=0)
            rank_h=sorted(range(len(ix)),key=lambda j:-y[ix[j]])
            rank_p=sorted(range(len(ix)),key=lambda j:-p["prominences"][j])
            for j,i in enumerate(ix):
                output.append(dict(group=group,measurement=m,variant=variant,channel=ch,
                    image_index=rr[i]["image_index"],nominal_defocus_D=rr[i]["nominal_defocus_D"],
                    mtf=float(y[i]),prominence=float(p["prominences"][j]),
                    height_rank=rank_h.index(j)+1,prominence_rank=rank_p.index(j)+1))
    return output

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--dataset",type=Path,required=True)
    p.add_argument("--phase",choices=["controls","panoptix"],required=True)
    p.add_argument("--output",type=Path,default=Path("research/psf-validation/generated/fidelity"))
    a=p.parse_args(); out=a.output; out.mkdir(parents=True,exist_ok=True)
    frequency=tests(); rows=[]; manifest=[]; angular=[]; native_diff=0.; acdiff=0.
    if a.phase=="panoptix":
        assert (out/"controls_summary.json").exists(),"Run and inspect controls first"
    with zipfile.ZipFile(a.dataset) as outer:
        script=outer.read("ThroughFocusMTF.m")
        groups=[("IOL Data.zip","monofocal","Monofocal",range(1,4),37),
                ("Simulation Data.zip","system","Biconvex Spherical Sim",[1],41)] if a.phase=="controls" else [
                ("IOL Data.zip","panoptix","Multifocal",range(1,6),37)]
        for inner,group,folder,measurements,count in groups:
            with zipfile.ZipFile(io.BytesIO(outer.read(inner))) as z:
                for m in measurements:
                    suffix=folder if group=="system" else folder+f"/Measurement {m}"
                    prefix=find_prefix(z,suffix)
                    expected={f"Image_{i:02}.tif" for i in range(1,count+1)}
                    actual={n[len(prefix):] for n in z.namelist() if n.startswith(prefix) and n[len(prefix):].startswith("Image")}
                    assert actual==expected
                    dark,dhash=read(z,prefix+"dark.tif")
                    manifest.append(dict(archive=inner,path=prefix+"dark.tif",sha256=dhash))
                    maps={}; morph={}
                    for i in range(1,count+1):
                        raw,rhash=read(z,prefix+f"Image_{i:02}.tif")
                        manifest.append(dict(archive=inner,path=prefix+f"Image_{i:02}.tif",sha256=rhash))
                        signed=raw.astype(np.float64)-dark.astype(np.float64)
                        A=np.maximum(raw.astype(np.int32)-dark.astype(np.int32),0).astype(np.uint16)
                        C=np.maximum(signed,0)
                        assert np.array_equal(A,C)
                        mtfa,stages=process(A)
                        if i in (19,27,31):
                            # Independent comparison to existing implementation and C dtype.
                            old=author_method(raw,dark)
                            native_diff=max(native_diff,float(abs(old-mtfa).max()))
                            mtfc,_=process(C); acdiff=max(acdiff,float(abs(mtfc-mtfa).max()))
                            assert np.array_equal(mtfa,mtfc)
                        variants=[("A",A,mtfa,stages)]
                        if group=="panoptix":
                            mtfb,sb=process(signed)
                            variants += [("B",signed,mtfb,sb),("C",C,mtfa,stages)]
                        for var,psf,mtf,st in variants:
                            r=dict(group=group,measurement=m,variant=var,image_index=i,
                                filename=f"Image_{i:02}.tif",
                                nominal_defocus_D=None if group=="system" else (i-19)*.25,
                                negative_fraction_before_processing=float(np.mean(signed<0)),
                                negative_fraction_after_processing=float(np.mean(psf<0)),
                                total_energy_or_signed_sum=float(psf.sum()),
                                minimum_pixel=float(psf.min()),maximum_pixel=float(psf.max()),
                                psf_dtype=str(psf.dtype),mtf_DC=float(mtf[540,960]),**st)
                            for ch,key in CHANNELS.items(): r[ch]=float(mtf[SAMPLES[key]])
                            rows.append(r)
                        if group=="panoptix":
                            for freq in (50,100):
                                for angle in range(0,180,15):
                                    theta=np.deg2rad(angle)
                                    dx=int(np.rint(freq*np.cos(theta)*(1920*SCALE)))
                                    dy=int(np.rint(freq*np.sin(theta)*(1080*SCALE)))
                                    fx=dx/(1920*SCALE); fy=dy/(1080*SCALE)
                                    angular.append(dict(measurement=m,image_index=i,
                                        nominal_defocus_D=(i-19)*.25,target_cyc_mm=freq,
                                        angle_from_horizontal_degrees=angle,
                                        actual_fx_cyc_mm=fx,actual_fy_cyc_mm=fy,
                                        actual_radius_cyc_mm=float(np.hypot(fx,fy)),
                                        array_row=540+dy,array_column=960+dx,mtf=float(mtfa[540+dy,960+dx])))
                            if i in (19,27,31):
                                maps[i]=mtfa.copy()
                                if m==1: morph[i]=(A.copy(),signed.copy(),C.copy())
                        if i%10==0: print(f"{group} M{m}: {i}/{count}",flush=True)
                    if group=="panoptix":
                        from fidelity_figures import plot_maps, plot_morph
                        plot_maps(out,m,maps)
                        if m==1: plot_morph(out,morph)
                    print(f"{group} M{m} complete",flush=True)
            plots(out,rows,group)
    csvout(out/f"{a.phase}_processing_comparison.csv",rows)
    pk=peak_table(rows); csvout(out/f"{a.phase}_all_local_maxima.csv",pk)
    if angular: csvout(out/"panoptix_angular_samples.csv",angular)
    principals=[]
    for group,m,var,ch in sorted({(r["group"],r["measurement"],r["variant"],c) for r in rows for c in CHANNELS}):
        rr=[r for r in rows if (r["group"],r["measurement"],r["variant"])==(group,m,var)]
        r=max(rr,key=lambda r:r[ch])
        principals.append(dict(group=group,measurement=m,variant=var,channel=ch,
            image_index=r["image_index"],nominal_defocus_D=r["nominal_defocus_D"],maximum=r[ch]))
    metadata=dict(phase=a.phase,matlab_native_execution=False,author_script_sha256=hashlib.sha256(script).hexdigest(),
        frequency_axis_check=frequency,old_python_max_absolute_difference=native_diff,
        A_C_representative_mtf_max_absolute_difference=acdiff,principals=principals,
        defocus_status="nominal mapping from author code; not yet mapped to clinical viewing-distance convention",
        spatial_scale_status="derived from author MATLAB calibration; not independently validated",
        illumination_source="white light",nominal_filter_nm=560,filter_bandwidth_nm=None,
        illumination_provenance="user-supplied paper system schematic; not independently confirmed per acquisition",
        simulation_illumination=None,simulation_label=OUTLABEL,
        simulation_defocus_status="41 frames: physical mapping unknown; image-index axis retained",
        simulation_author_linspace_step_if_applied=9/40,
        sensitivity="A uint16 saturation; B float signed; C float clipped; SAME FFT/median/global-max normalization for all",
        peak_method="all interior local maxima; no minimum separation, smoothing or interpolation")
    (out/f"{a.phase}_summary.json").write_text(json.dumps(metadata,indent=2,allow_nan=False)+"\n")
    (out/f"{a.phase}_input_manifest.json").write_text(json.dumps(manifest,indent=2)+"\n")
    print(json.dumps(metadata,indent=2),flush=True)

if __name__=="__main__": main()
