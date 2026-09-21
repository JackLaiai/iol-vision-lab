# 2D MTF orientation + robustness audit

## 範圍與可驗證程度

僅使用 `IOL Data.zip/Multifocal/Measurement 1–5`，185 張 uint16 TIFF 及各 measurement 的 dark。
排除 Measurement 6、Simulation Data；未接入 production、calculator、evidence JSON 或 simulator。
沒有 image convolution、ESF 對齊、defocus shift/warp、Gaussian fitting 或缺值補入。

先前 author-reproduction branch 是 Python 語義重現，尚未經 MATLAB R2024b 原生逐值驗證；
本次不把它重新標記為 native-verified。

來源：Sawyers & Sawyer (2026)，https://doi.org/10.25422/azu.data.32080626。
原始資料 CC BY 4.0；本報告、CSV 與圖表是新增研究分析，原始 ZIP/TIFF 不複製進 repo。
輸入檔案 SHA256 保存在 `generated/orientation/input_manifest.json`。

## 預先固定的方法

### PSF 背景處理

- A：沿用作者影像前處理語義，uint16 飽和式 dark subtraction（負值為 0），0° rotation 為 identity。
- B：先轉 float 做 signed dark subtraction，取 **outer 50 px border** 的 median 為 residual constant-background，
  從整張 signed image 扣除，再 clip 負值為 0。估計不是從已截零的 A 取得。
- 50 px 沿用此前 diagnostics 的 border 定義，在本次結果出現前固定；沒有比較其他寬度或選最佳方法。
- Border 是背景代理，可能含真實 PSF wings，不等於經實驗確認的 signal-free background。
- 全 frame 計算，沒有 crop、PSF resize、sharpening 或影像旋轉對齊。

### MTF 的重要區別

本次依使用者明示公式：

`MTF = abs(fftshift(fft2(processed_PSF))) / abs(FFT(PSF))[DC]`

即未經 MTF median filter 的 magnitude，以未濾波 DC 正規化至 1。
**這不同於作者原 MATLAB 的 post-FFT 3×3 median filter + filtered-global-maximum normalization。**
A 沿用的是 PSF 前處理，不是宣稱本次完整 MTF estimator 與作者 post-FFT estimator 相同。
原作者分支、之前的 fidelity / ESF outputs 均未修改；不把兩套 estimator 數值混合。

### 空間頻率與角度

- Pixel scale：`0.00504 / 20 = 0.000252 mm/pixel`，來源為作者 MATLAB calibration，未獨立校準。
- 在半徑 50 與 100 cyc/mm 的連續 FFT 座標上取樣；兩者分開分析。
- 0°, 5°, …, 175°，每圈 36 個方向。實值 PSF 的 Fourier magnitude 具相反方向對稱，
  因此只取不重複的半圓；另計算 180° 對向 samples 驗證數值一致。
- 0°：正 column-frequency（水平）；90°：正 row-frequency（垂直）。不等同已確認的實體 sagittal/tangential 軸。
- **只在 2D spatial-frequency grid 做 bilinear interpolation**。沒有 angle smoothing、角度對齊或 defocus interpolation。
- 原始 defocus：Image_01 = −4.5 D、Image_19 = 0 D、Image_37 = +4.5 D，每步 0.25 D。
  不映射至臨床觀看距離，不變更正負號。
- White light + nominal 560 nm filter 是使用者提供的論文 schematic metadata；bandwidth 保持 null，
  不稱為 monochromatic light。

### 統計與選峰

每個 measurement / method / defocus / frequency 分別保存 mean、median、population SD（ddof=0）、
IQR、min/max、argmin/argmax。SD 是方向間離散程度，不是研究樣本誤差或 confidence interval。
IQR 使用 NumPy linear quantile 定義，僅屬統計分位數定義，不是在 defocus 軸補點。

Max/min angle 為 5° sampled-grid 結果；如有 exact ties，主欄位取最小角度，同時保存所有並列角度。
方向差很小時 argmax 可能不穩定；不能把每個 argmax 變動都當成 lens rotation。

Through-focus mean 與 median 各自尋找**全部內部 local maxima**，
不設 prominence、height 或 distance 門檻，不要求三個峰。端點不當作雙側局部峰；
平台起訖保存於 peak CSV。Prominence rank 是描述，不能直接當成三個光學焦點。
任何額外峰區描述均保留原始位置，不為了 2.2/3.2 D optical add 而選峰。

## 檔案與重現

- `generated/orientation/complete_angular.csv`：完整逐角度值、FFT 座標與實際 fx/fy。
- `generated/orientation/angular_statistics.csv`：所有方向統計、H/V 值及原始 DC。
- `generated/orientation/background_diagnostics.csv`：固定 border residual、A/B energy 與邊界能量。
- `generated/orientation/peak_summary.csv`：mean/median 每條曲線的全部局部峰。
- `generated/orientation/heatmaps_50cycmm.png`、`heatmaps_100cycmm.png`：五次測量、兩背景法，沒有對齊角度。
- `generated/orientation/angular_mean_*_overlay.png`、`angular_median_*_overlay.png`：A/B 與五次測量。
- `generated/orientation/M1_radial_curves.png` … `M5_radial_curves.png`：每次測量的四條 mean/median × frequency 曲線，A/B 各自保留。
- `generated/orientation/metadata.json`：公式、假設、版本與限制。

使用既有 research requirements（NumPy / SciPy / Pillow / Matplotlib）：
```sh
python3 research/psf-validation/generated/orientation_audit.py --self-test
python3 research/psf-validation/generated/orientation_audit.py --dataset /path/to/32080626.zip
```

腳本接受 dataset path；沒有把個人 Mac 路徑寫死。


## 實際結果

185 張影像、26,640 筆逐角度資料、740 筆方向統計；40 條 mean/median 曲線共 284 個局部峰（包含負 defocus 區域的小峰）。
相反方向 bilinear MTF 最大差為 5.74e-16；支持半圓取樣的數值一致性。

### 所有非負 defocus 局部峰

以下列出全部 D ≥ 0 的 local maxima，沒有 prominence 篩選；負軸峰完整保留在 CSV。弱峰不等同光學焦點。

|cyc/mm|統計|M|A 峰 (D)|B 峰 (D)|
|---|---|---|---|---|
|50|angular_mean|1|0, 2.5|0, 2.5|
|50|angular_mean|2|0, 2.5|0.25, 2.75|
|50|angular_mean|3|0, 2.5|0, 2.75|
|50|angular_mean|4|0.25, 2, 4|0.25, 2, 4|
|50|angular_mean|5|0, 1.75, 3.5|0, 1.75, 3.5|
|50|angular_median|1|0, 2.5|0, 2.5|
|50|angular_median|2|0, 2.5|0.25, 2.5|
|50|angular_median|3|0, 2.5|0, 2.75|
|50|angular_median|4|0.25, 2, 4|0.25, 2, 4|
|50|angular_median|5|0, 1.75, 3.5|0, 1.75, 3.5|
|100|angular_mean|1|0, 1, 1.5, 2.75, 3.5|0, 1, 1.5, 2.75, 3.5|
|100|angular_mean|2|0, 2.75|0, 2.75|
|100|angular_mean|3|0, 1.5, 2.5, 3.25, 4.25|0, 1.5, 2.25, 3.25, 4.25|
|100|angular_mean|4|0, 2, 3.25|0, 2, 3.25|
|100|angular_mean|5|0, 1.75, 3, 4|0, 1.75, 3, 4|
|100|angular_median|1|0, 1, 1.5, 2.75, 3.5, 4.25|0, 1, 1.5, 2.75, 3.5, 4.25|
|100|angular_median|2|0, 2.75, 4.25|0, 2.75|
|100|angular_median|3|0, 1.5, 2.5, 3.25, 4.25|0, 1.5, 2.25, 3.25, 4.25|
|100|angular_median|4|0, 2, 3.25|0, 2, 3.25|
|100|angular_median|5|0, 1.75, 3, 3.5, 4|0, 1.75, 3, 3.5, 4|

50 cyc/mm 的 mean/median 在 M1–M3 主要都是近 0 D 與 +2.5～+2.75 D 兩個峰，沒有共同的獨立 +2/+3 D 雙峰。
M4/M5 的主要正軸峰在 +2/+1.75 D，另外存在较弱的 +4/+3.5 D 峰。
100 cyc/mm mean 中 M3–M5 有 +3.25/+3.25/+3 D 弱峰；M1 在 +3.5 D，M2 沒有第二個正軸局部峰。不能宣稱五次都重現三焦。

### 方向性（原始取樣位置，非選峰）

以下為指定 +2 D 與 +3 D 的 sampled maximum angle。角度差使用 180° 週期的最短差；沒有旋轉或對齊。

|cyc/mm|M|+2 D 最大角度|+3 D 最大角度|軸向差|
|---|---|---|---|---|
|50|1|5°|80°|75°|
|50|2|120°|15°|75°|
|50|3|130°|25°|75°|
|50|4|155°|55°|80°|
|50|5|65°|75°|10°|
|100|1|15°|125°|70°|
|100|2|100°|20°|80°|
|100|3|5°|20°|15°|
|100|4|125°|105°|20°|
|100|5|95°|165°|70°|

以上指定位置的 A/B argmax 相同，但不同 measurement 沒有共同固定的 +2/+3 D 主方向。
50 cyc/mm 多次出現 75–80° 差，M5 只有 10°；100 cyc/mm 的差為 70、80、15、20、70°。
不能從這些方向直接辨認實體 sagittal/tangential 軸或推定 lens rotation。

每條曲線跨 37 個 defocus 的不同 argmax 數量，以及相鄰 defocus 改變 argmax 的次數：

|方法|cyc/mm|M|不同角度數|變動次數 / 36|
|---|---|---|---|---|
|A|100|1|23|35|
|A|50|1|26|32|
|A|100|2|18|32|
|A|50|2|21|29|
|A|100|3|22|33|
|A|50|3|22|34|
|A|100|4|21|33|
|A|50|4|16|31|
|A|100|5|26|33|
|A|50|5|22|29|
|B|100|1|24|35|
|B|50|1|26|32|
|B|100|2|18|32|
|B|50|2|21|27|
|B|100|3|22|33|
|B|50|3|22|34|
|B|100|4|20|34|
|B|50|4|16|31|
|B|100|5|26|34|
|B|50|5|22|29|

檢查 M2–M5 相對 M1 的逐 defocus 軸向角度差；下列 R 是 doubled-angle resultant length（1 代表固定旋轉差，0 代表分散）。
這只是方向差分布描述，沒有將角度移動或校正；弱且平坦的 angular MTF 仍可能使 argmax 不穩定。

|方法|cyc/mm|M vs M1|R|
|---|---|---|---|
|A|50|M2|0.418|
|A|50|M3|0.502|
|A|50|M4|0.226|
|A|50|M5|0.038|
|A|100|M2|0.351|
|A|100|M3|0.246|
|A|100|M4|0.156|
|A|100|M5|0.042|
|B|50|M2|0.436|
|B|50|M3|0.502|
|B|50|M4|0.203|
|B|50|M5|0.041|
|B|100|M2|0.354|
|B|100|M3|0.261|
|B|100|M4|0.051|
|B|100|M5|0.080|

R 為 0.038–0.502，沒有呈現跨全部 defocus 的近固定旋轉差；不足以把 M1–M5 差异解釋成單一系統性角度旋轉。

全部逐方向局部峰另存 directional_peak_summary.csv；可追溯 H/V 與斜向的結構，沒有只留下最大方向。
- M3 / A / 100 cyc/mm / 0°：2.25 D (prominence 0.026550), 3.25 D (prominence 0.001253).
- M3 / A / 100 cyc/mm / 30°：2.25 D (prominence 0.010623), 3.25 D (prominence 0.033144).
- M3 / A / 100 cyc/mm / 90°：2.5 D (prominence 0.032531), 3.25 D (prominence 0.003843).
- M3 / B / 100 cyc/mm / 0°：2.25 D (prominence 0.029471), 3 D (prominence 0.000622).
- M3 / B / 100 cyc/mm / 30°：2.25 D (prominence 0.011860), 3.25 D (prominence 0.034810).
- M3 / B / 100 cyc/mm / 90°：2.5 D (prominence 0.034002), 3.25 D (prominence 0.002672).

斜方向確實能強化某些結構，但全角度 mean/median 後仍未得到 M1–M5 一致的三個峰，因此第三峰問題不能只歸因於 H/V 遺漏。

### 背景穩健性與可否進入 convolution

A/B 大部分峰位置相同，但非全部穩定：M2 的 50 cyc/mm 近零峰由 0 移至 +0.25 D；mean 正軸峰由 +2.5 移至 +2.75 D。
M3 的 50 cyc/mm mean/median 正軸峰由 +2.5 移至 +2.75 D；100 cyc/mm 主正軸峰由 +2.5 移至 +2.25 D。
這些是 0.25 D 原始格點上的選峰改變，沒有 shift、fit 或 defocus interpolation。更弱的局部峰有出現/消失；完整表格保留，不選擇更像三焦的方法。

Signed border median 為 −14 至 +3 TIFF intensity units。A 的外 50 px border 能量占比 8.714%–11.621%，B 為 10.272%–11.546%。
此比例同時可能含殘餘背景與 PSF wings，不能單獨證明截斷或 frame 已完整包含 PSF。負 border median 扣除會提高底值，再截零會改變 DC，因此 B 不必然比較正確。

**尚不足以選定一張具已驗證代表性的 measured PSF 進入物理意義的 convolution prototype。**
純軟體 convolution smoke test 當然可行，但本次沒有執行，且不能藉此驗證光學或臨床忠實度。
仍需釐清跨 measurement 的焦點位置差、frame 背景/能量完整性、spatial calibration 與 image-to-PSF sampling；nominal bench D 尚未與臨床 distance convention 對應。
本次沒有足夠依據把原因唯一歸給 acquisition、alignment 或 defocus calibration；也沒有因看到三焦預期而挑選背景方法。

### 驗證

CSV 筆數、角度統計由完整 raw angular CSV 重算、frequency 半徑、DC=1、全部 mean/median local maxima 的相鄰點條件、PNG 解碼均通過。
自製 bilinear sampler 與 SciPy map_coordinates(order=1) 的獨立數值比較通過；所有合成 DC/background 測試通過。
圖上的連線僅連接實際取樣點，未在 defocus 軸產生新數值。
本次結束時對執行前 82 個既有檔案逐一 SHA256 比對，全部未變；僅新增本次 research 分析與輸出，未 commit 或 push。
重建結果摘要與獨立 QA：python3 research/psf-validation/generated/orientation_summary.py（先執行 orientation_audit.py）。
