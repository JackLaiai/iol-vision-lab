"""Diagnostic displays only; numerical PSF/MTF arrays are never resampled."""
import argparse,io,zipfile
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.colors import LogNorm,SymLogNorm
from analyze import SCALE,SAMPLES

def plot_maps(out,m,maps):
    fig,axs=plt.subplots(2,3,figsize=(13,8))
    for col,i in enumerate((19,27,31)):
        mtf=maps[i]; nyq=1/(2*SCALE); dfx=1/(1920*SCALE); dfy=1/(1080*SCALE)
        top=axs[0,col].imshow(np.ma.masked_less_equal(mtf,0),origin="lower",
            extent=(-nyq-dfx/2,nyq-dfx/2,-nyq-dfy/2,nyq-dfy/2),
            norm=LogNorm(vmin=1e-4,vmax=1),cmap="viridis",aspect="equal")
        axs[0,col].set_title(f"M{m}: {(i-19)*.25:+.2f} D (Image_{i:02})\nFull frequency map, log display",fontsize=10)
        dy=40; dx=75
        bottom=axs[1,col].imshow(mtf[540-dy:541+dy,960-dx:961+dx],
            origin="lower",extent=((-dx-.5)*dfx,(dx+.5)*dfx,(-dy-.5)*dfy,(dy+.5)*dfy),
            vmin=0,vmax=1,cmap="viridis",aspect="equal")
        axs[1,col].set_title("Central frequency view\nNo processing crop",fontsize=10)
        for ax in axs[:,col]:
            ax.set_xlabel("Horizontal cyc/mm"); ax.set_ylabel("Vertical cyc/mm")
        for key in SAMPLES:
            yy,xx=SAMPLES[key]; axs[1,col].plot((xx-960)*dfx,(yy-540)*dfy,"rx",ms=5)
    fig.subplots_adjust(left=.07,bottom=.09,top=.92,hspace=.48,wspace=.4,right=.84)
    fig.colorbar(top,cax=fig.add_axes([.89,.59,.014,.27]),label="Author MTF (log display)")
    fig.colorbar(bottom,cax=fig.add_axes([.89,.15,.014,.27]),label="Author MTF (linear display)")
    fig.savefig(out/f"panoptix_M{m}_2d_mtf.png",dpi=150); plt.close(fig)

def plot_morph(out,morph):
    fig,axs=plt.subplots(3,3,figsize=(13,8))
    limit=max(float(np.max(abs(p))) for triple in morph.values() for p in triple)
    for col,i in enumerate((19,27,31)):
        for row,(var,psf) in enumerate(zip(("A uint16","B signed float","C float clipped"),morph[i])):
            im=axs[row,col].imshow(psf,origin="upper",cmap="coolwarm",
                norm=SymLogNorm(linthresh=10,vmin=-limit,vmax=limit))
            axs[row,col].set_title(f"{var}, {(i-19)*.25:+.2f} D",fontsize=10)
    fig.suptitle("M1 full-frame morphology; common signed display scale (display only)",fontsize=12)
    fig.subplots_adjust(hspace=.4,wspace=.25,right=.84)
    fig.colorbar(im,cax=fig.add_axes([.89,.16,.014,.65]),label="Dark-subtracted intensity")
    fig.savefig(out/"dark_subtraction_morphology.png",dpi=150); plt.close(fig)

if __name__=="__main__":
    from fidelity_experiments import read,find_prefix,process
    p=argparse.ArgumentParser(); p.add_argument("--dataset",type=Path,required=True)
    p.add_argument("--output",type=Path,default=Path("research/psf-validation/generated/fidelity"))
    a=p.parse_args()
    with zipfile.ZipFile(a.dataset) as outer:
        with zipfile.ZipFile(io.BytesIO(outer.read("IOL Data.zip"))) as z:
            for m in range(1,6):
                prefix=find_prefix(z,f"Multifocal/Measurement {m}")
                dark,_=read(z,prefix+"dark.tif"); maps={}; morph={}
                for i in (19,27,31):
                    raw,_=read(z,prefix+f"Image_{i:02}.tif")
                    signed=raw.astype(float)-dark.astype(float); C=np.maximum(signed,0)
                    A=C.astype(np.uint16); maps[i]=process(A)[0]
                    if m==1: morph[i]=(A,signed,C)
                plot_maps(a.output,m,maps)
                if m==1: plot_morph(a.output,morph)
    print("Representative figures regenerated; numerical outputs unchanged.")
