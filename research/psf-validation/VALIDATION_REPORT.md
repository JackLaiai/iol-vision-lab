# PSF validation：本次實測結果

本次只分析 Multifocal / Measurement 1–5 的 185 張 PSF 與五張 dark。
Measurement 6、Simulation Data 均未使用。沒有修改網站、clinical evidence 或 calculator。

## 核心結論

尚不能宣稱穩定重現「三個主要光學焦點」。零附近及正 defocus 的兩個主要峰群可見，
但正側峰的位置隨 measurement 明顯移動。排序第三的局部峰較弱，不能當作第三焦點的驗證。
程式的 mean_curve_peaks 是演算法選出的局部峰候選，並非已確認的光學焦點。

以下以作者 50x 取樣（實際 51.440329 cyc/mm）說明。
所有 D 都是作者 nominal bench mapping，不能解讀為臨床觀看距離。

| Mean curve 局部峰候選 (D) | 作者分支 MTF mean ± sample SD (n=5) | 解讀 |
|---|---|---|
| −3.50 | 0.070079 ± 0.027896 | 弱局部峰；各 measurement 位置不一致，不確認為第三光學焦點 |
| 0.00 | 0.381151 ± 0.023851 | 50x 每次 measurement 均在 0 D 出現主要峰 |
| +2.25 | 0.275806 ± 0.027523 | 平均曲線峰；各 measurement 正側峰存在明顯位置差異 |

各 measurement 的正側主要峰（作者 50x）：
M1 +2.75 D、M2 +2.50 D、M3 +2.50 D、M4 +2.00 D、M5 +1.75 D。
跨度為 1.00 D。未做 curve registration、移位、插值或重定義零點。

## 重複性

| 作者分支 | 最低 pairwise Pearson r | 最大逐點 sample SD |
|---|---:|---:|
| 50x | 0.548045 | 0.110881 |
| 50y | 0.420845 | 0.116717 |
| 100x | 0.529849 | 0.080607 |
| 100y | 0.365117 | 0.084182 |

因此只能說有部分共同形狀，不能說五次測量高度一致。
各方向完整 peak candidates、均值與 SD 見 summary.json / mean_sd.csv。
此處驗證了 Python 語意移植與測量間重複性；尚未在 MATLAB R2024b
執行原程式逐值比對，也沒有作者參考數值陣列可證明重現其 published curve。

## PSF 品質診斷

- 所有 raw TIFF 在 uint16 上限 65535 的 saturation fraction 都是 0。
  未知 sensor 實際 ADC/full-well 上限，因此不等於已排除所有飽和或非線性。
- dark subtraction 後負像素比例：39.03%–74.77%。
- 外側 50 px 的 signed background mean：−16.8253 至 +2.9567 intensity units；
  SD：18.4650–50.2969。這只是邊緣背景代理，可能混有真正 PSF wings。
- 截零後外側 10 px 能量占比：1.78%–2.41%；外側 50 px：8.71%–11.62%。
- r90 上界：865–901 px；r99 上界：1020–1037 px。
  centroid 到最近邊界僅 520.44–539.49 px，這些大半徑圓已超出完整圓形覆蓋區。
- full-frame sum-normalized kernel 的 sum：0.9999999999999998–1.0；
  convolution MTF 的 DC 均為 1。

上述結果提示背景/截零後的正值噪聲底對總能量可能有重要影響。
不能由本資料證明 PSF 光學能量完整包含在 frame 中，也不能將所有邊界能量都認定為真實 halo。
目前不選固定 crop、不再扣額外背景、不改作者分支。

## 分支差異

A：依作者流程，uint16 飽和式 dark subtraction、0° rotation、FFT magnitude、
3×3 median filter、filtered global-peak normalization。

B：float dark subtraction、負值截零、全 frame energy normalization for convolution，
再計算未濾波的 FFT magnitude / DC。沒有 sharpening、resize 或額外 filtering。

同一 50x bin 的示例：

| nominal D | A mean ± SD | B mean ± SD |
|---|---|---|
| 0.00 | 0.381151 ± 0.023851 | 0.095005 ± 0.014458 |
| +2.25 | 0.275806 ± 0.027523 | 0.063087 ± 0.008997 |

這是不同 FFT filtering / normalization 流程的結果，不是兩套不同的原始實測值。
本次 A 的最終 DC 也恰為 1，但其分母是濾波後最大值，並非 B 的未濾波 DC。

## 是否進入 single-image convolution prototype

目前僅足以做數學運算/檔案流程的 research smoke test；
尚不建議把這組 full-frame kernel 當成已驗證的 optical convolution prototype。

先確認：
1. dark/background 的穩定性與截零噪聲對能量、MTF 的影響；
2. measurement 間正側峰移動的原因與 bench position registration；
3. detector linearity / saturation 與 PSF frame containment；
4. 像面 pixel scale、pupil、wavelength、model eye 及影像角尺度的校準；
5. 原 MATLAB 的逐值對照。

目前 pixel scale 僅依作者 calibration，nominal defocus 的臨床符號仍未確認。
沒有將 PSF 轉為 RGB、病人術後畫面或網站 simulator parameter。
