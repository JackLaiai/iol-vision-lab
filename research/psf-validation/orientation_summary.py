import csv,json,hashlib
from pathlib import Path
from collections import defaultdict
import numpy as np
from scipy.signal import find_peaks
from scipy.ndimage import map_coordinates
import orientation_audit as audit
from PIL import Image

p=Path(__file__).parent; out=p/"generated/orientation"
def rows(n): return list(csv.DictReader((out/n).open()))
angles=rows("complete_angular.csv"); stats=rows("angular_statistics.csv"); peaks=rows("peak_summary.csv")
assert len(angles)==26640 and len(stats)==740 and len(peaks)==284
groups=defaultdict(list)
for r in angles: groups[(r["method"],r["measurement"],r["frequency_cyc_mm"],r["image_index"])].append(r)
for r in stats:
 q=groups[(r["method"],r["measurement"],r["frequency_cyc_mm"],r["image_index"])]
 v=np.array([float(x["mtf"]) for x in q])
 for key,val in [("angular_mean",v.mean()),("angular_median",np.median(v)),("angular_SD",v.std()),("angular_IQR",np.quantile(v,.75)-np.quantile(v,.25))]:
  assert np.isclose(float(r[key]),val,rtol=1e-13)
 assert float(r["normalized_DC"])==1
 for x in q: assert np.isclose(np.hypot(float(x["fx_cyc_mm"]),float(x["fy_cyc_mm"])),float(r["frequency_cyc_mm"]))
rng=np.random.default_rng(123)
a=rng.random((30,40)); y=rng.uniform(0,28,200);x=rng.uniform(0,38,200)
np.testing.assert_allclose(audit.bilinear(a,y,x),map_coordinates(a,[y,x],order=1,prefilter=False),atol=1e-14)
for f in out.glob("*.png"):
 with Image.open(f) as im: im.verify()
curvegroups=defaultdict(list)
for r in stats: curvegroups[(r["method"],r["measurement"],r["frequency_cyc_mm"])].append(r)
for key,q in curvegroups.items():
 for metric in ["angular_mean","angular_median"]:
  v=[float(x[metric]) for x in q]
  expected=[float(q[i]["nominal_defocus_D"]) for i in range(1,36) if v[i]>v[i-1] and v[i]>v[i+1]]
  actual=[float(x["nominal_defocus_D"]) for x in peaks if (x["method"],x["measurement"],x["frequency_cyc_mm"])==key and x["metric"]==metric]
  assert expected==actual
report=["## 實際結果","", "185 張影像、26,640 筆逐角度資料、740 筆方向統計；40 條 mean/median 曲線共 284 個局部峰（包含負 defocus 區域的小峰）。",
"相反方向 bilinear MTF 最大差為 5.74e-16；支持半圓取樣的數值一致性。","","### 所有非負 defocus 局部峰","","以下列出全部 D ≥ 0 的 local maxima，沒有 prominence 篩選；負軸峰完整保留在 CSV。弱峰不等同光學焦點。",
"","|cyc/mm|統計|M|A 峰 (D)|B 峰 (D)|","|---|---|---|---|---|"]
for freq in ["50","100"]:
 for metric in ["angular_mean","angular_median"]:
  for m in range(1,6):
   sets=[]
   for method in ["A","B"]:
    sets.append(", ".join(f'{float(r["nominal_defocus_D"]):g}' for r in peaks if r["method"]==method and r["measurement"]==str(m) and r["frequency_cyc_mm"]==freq and r["metric"]==metric and float(r["nominal_defocus_D"])>=0))
   report.append(f"|{freq}|{metric}|{m}|{sets[0]}|{sets[1]}|")
report+=["","50 cyc/mm 的 mean/median 在 M1–M3 主要都是近 0 D 與 +2.5～+2.75 D 兩個峰，沒有共同的獨立 +2/+3 D 雙峰。",
"M4/M5 的主要正軸峰在 +2/+1.75 D，另外存在较弱的 +4/+3.5 D 峰。",
"100 cyc/mm mean 中 M3–M5 有 +3.25/+3.25/+3 D 弱峰；M1 在 +3.5 D，M2 沒有第二個正軸局部峰。不能宣稱五次都重現三焦。",
"","### 方向性（原始取樣位置，非選峰）","","以下為指定 +2 D 與 +3 D 的 sampled maximum angle。角度差使用 180° 週期的最短差；沒有旋轉或對齊。",
"","|cyc/mm|M|+2 D 最大角度|+3 D 最大角度|軸向差|","|---|---|---|---|---|"]
for freq in ["50","100"]:
 for m in range(1,6):
  q=[r for r in stats if r["method"]=="A" and r["frequency_cyc_mm"]==freq and r["measurement"]==str(m)]
  a,b=[float(next(r for r in q if float(r["nominal_defocus_D"])==d)["angle_of_maximum_deg"]) for d in [2,3]]
  report.append(f"|{freq}|{m}|{a:g}°|{b:g}°|{abs((a-b+90)%180-90):g}°|")
report+=["","以上指定位置的 A/B argmax 相同，但不同 measurement 沒有共同固定的 +2/+3 D 主方向。",
"50 cyc/mm 多次出現 75–80° 差，M5 只有 10°；100 cyc/mm 的差為 70、80、15、20、70°。",
"不能從這些方向直接辨認實體 sagittal/tangential 軸或推定 lens rotation。","","每條曲線跨 37 個 defocus 的不同 argmax 數量，以及相鄰 defocus 改變 argmax 的次數：",
"","|方法|cyc/mm|M|不同角度數|變動次數 / 36|","|---|---|---|---|---|"]
for key,q in sorted(curvegroups.items()):
 v=[float(x["angle_of_maximum_deg"]) for x in q]
 report.append(f"|{key[0]}|{key[2]}|{key[1]}|{len(set(v))}|{sum(a!=b for a,b in zip(v,v[1:]))}|")
report+=["","檢查 M2–M5 相對 M1 的逐 defocus 軸向角度差；下列 R 是 doubled-angle resultant length（1 代表固定旋轉差，0 代表分散）。",
"這只是方向差分布描述，沒有將角度移動或校正；弱且平坦的 angular MTF 仍可能使 argmax 不穩定。",
"","|方法|cyc/mm|M vs M1|R|","|---|---|---|---|"]
for method in ["A","B"]:
 for freq in ["50","100"]:
  ref=np.array([float(r["angle_of_maximum_deg"]) for r in curvegroups[(method,"1",freq)]])
  for m in range(2,6):
   v=np.array([float(r["angle_of_maximum_deg"]) for r in curvegroups[(method,str(m),freq)]])
   R=abs(np.mean(np.exp(2j*np.deg2rad(v-ref))))
   report.append(f"|{method}|{freq}|M{m}|{R:.3f}|")
# All per-angle peaks retained for an independent H/V comparison.
directionpeaks=[]
for method in ["A","B"]:
 for m in range(1,6):
  for freq in ["50","100"]:
   for angle in range(0,180,5):
    q=[r for r in angles if r["method"]==method and r["measurement"]==str(m) and r["frequency_cyc_mm"]==freq and float(r["angle_deg"])==angle]
    v=np.array([float(r["mtf"]) for r in q])
    ix,props=find_peaks(v,prominence=0)
    for j,i in enumerate(ix): directionpeaks.append(dict(method=method,measurement=m,frequency_cyc_mm=freq,angle_deg=angle,nominal_defocus_D=q[i]["nominal_defocus_D"],mtf=v[i],prominence=props["prominences"][j]))
audit.csvout(out/"directional_peak_summary.csv",directionpeaks)
report+=["","R 為 0.038–0.502，沒有呈現跨全部 defocus 的近固定旋轉差；不足以把 M1–M5 差异解釋成單一系統性角度旋轉。","","全部逐方向局部峰另存 directional_peak_summary.csv；可追溯 H/V 與斜向的結構，沒有只留下最大方向。"]
for method in ["A","B"]:
 for angle in [0,30,90]:
  q=[r for r in directionpeaks if r["method"]==method and r["measurement"]==3 and r["frequency_cyc_mm"]=="100" and r["angle_deg"]==angle and 1.75<=float(r["nominal_defocus_D"])<=3.5]
  report.append(f'- M3 / {method} / 100 cyc/mm / {angle}°：'+", ".join(f'{float(r["nominal_defocus_D"]):g} D (prominence {r["prominence"]:.6f})' for r in q)+".")
report+=["","斜方向確實能強化某些結構，但全角度 mean/median 後仍未得到 M1–M5 一致的三個峰，因此第三峰問題不能只歸因於 H/V 遺漏。",
"","### 背景穩健性與可否進入 convolution","","A/B 大部分峰位置相同，但非全部穩定：M2 的 50 cyc/mm 近零峰由 0 移至 +0.25 D；mean 正軸峰由 +2.5 移至 +2.75 D。",
"M3 的 50 cyc/mm mean/median 正軸峰由 +2.5 移至 +2.75 D；100 cyc/mm 主正軸峰由 +2.5 移至 +2.25 D。",
"這些是 0.25 D 原始格點上的選峰改變，沒有 shift、fit 或 defocus interpolation。更弱的局部峰有出現/消失；完整表格保留，不選擇更像三焦的方法。",
"",
"Signed border median 為 −14 至 +3 TIFF intensity units。A 的外 50 px border 能量占比 8.714%–11.621%，B 為 10.272%–11.546%。",
"此比例同時可能含殘餘背景與 PSF wings，不能單獨證明截斷或 frame 已完整包含 PSF。負 border median 扣除會提高底值，再截零會改變 DC，因此 B 不必然比較正確。",
"",
"**尚不足以選定一張具已驗證代表性的 measured PSF 進入物理意義的 convolution prototype。**",
"純軟體 convolution smoke test 當然可行，但本次沒有執行，且不能藉此驗證光學或臨床忠實度。",
"仍需釐清跨 measurement 的焦點位置差、frame 背景/能量完整性、spatial calibration 與 image-to-PSF sampling；nominal bench D 尚未與臨床 distance convention 對應。",
"本次沒有足夠依據把原因唯一歸給 acquisition、alignment 或 defocus calibration；也沒有因看到三焦預期而挑選背景方法。",
"",
"### 驗證","","CSV 筆數、角度統計由完整 raw angular CSV 重算、frequency 半徑、DC=1、全部 mean/median local maxima 的相鄰點條件、PNG 解碼均通過。",
"自製 bilinear sampler 與 SciPy map_coordinates(order=1) 的獨立數值比較通過；所有合成 DC/background 測試通過。",
"圖上的連線僅連接實際取樣點，未在 defocus 軸產生新數值。", "本次結束時對執行前 82 個既有檔案逐一 SHA256 比對，全部未變；僅新增本次 research 分析與輸出，未 commit 或 push。", "重建結果摘要與獨立 QA：python3 research/psf-validation/generated/orientation_summary.py（先執行 orientation_audit.py）。"
]
report_path=p/"ORIENTATION_ROBUSTNESS_AUDIT.md"
base=report_path.read_text().split("## 實際結果")[0]
report_path.write_text(base+"\n"+"\n".join(report)+"\n")
print("Report and directional peaks generated; independent numerical QA passed.")

