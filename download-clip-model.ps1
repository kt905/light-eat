# ============================================================================
#  LightEat 本地 AI 模型下载脚本
#  作用：把 CLIP 模型权重下载到 assets/models/ 实现本地自托管
#        下载完成后前端优先加载本地模型，不依赖外网/后端代理
#
#  用法：
#     powershell -ExecutionPolicy Bypass -File download-clip-model.ps1
#     可选参数：
#       -Source hf-mirror | huggingface | auto   （默认 auto：自动探测可达镜像）
#       -Force                                    （强制重新下载已存在的文件）
#       -MaxRetries 5                             （每个文件失败重试次数，默认 4）
#
#  文件清单（transformers.js 加载该模型实际需要的 9 个文件）
# ============================================================================

param(
  [ValidateSet('auto', 'hf-mirror', 'huggingface')][string]$Source = 'auto',
  [switch]$Force,
  [int]$MaxRetries = 4
)

$ErrorActionPreference = 'Stop'

$Repo      = 'Xenova/clip-vit-base-patch32'
$Revision  = 'main'
$OutDir    = Join-Path $PSScriptRoot 'assets\models\Xenova\clip-vit-base-patch32'

$Manifest = @(
  'config.json'
  'preprocessor_config.json'
  'tokenizer.json'
  'tokenizer_config.json'
  'vocab.json'
  'merges.txt'
  'special_tokens_map.json'
  'onnx/model_quantized.onnx'
)

$Bases = @{
  'hf-mirror'    = 'https://hf-mirror.com'
  'huggingface'  = 'https://huggingface.co'
}

function Test-Reachable([string]$Base) {
  try {
    $r = Invoke-WebRequest -Uri "$Base/$Repo/resolve/$Revision/config.json" -UseBasicParsing -TimeoutSec 15
    return $r.StatusCode -eq 200
  } catch { return $false }
}

function Resolve-Base([string]$Pref) {
  if ($Pref -eq 'hf-mirror') { if (Test-Reachable $Bases['hf-mirror']) { return $Bases['hf-mirror'] } }
  elseif ($Pref -eq 'huggingface') { if (Test-Reachable $Bases['huggingface']) { return $Bases['huggingface'] } }
  else {
    if (Test-Reachable $Bases['hf-mirror']) { return $Bases['hf-mirror'] }
    if (Test-Reachable $Bases['huggingface']) { return $Bases['huggingface'] }
  }
  throw '两个镜像当前都不可达。请检查网络，稍后重试（大陆环境一般可访问 hf-mirror.com）。'
}

function Download-File([string]$Url, [string]$Target, [int]$Retries) {
  $tmp = "$Target.part"
  $attempt = 0
  while ($true) {
    $attempt++
    try {
      # --fail: 4xx/5xx 时不保存；--location 跟随重定向；--retry 断线退避
      & curl.exe -sS --fail --location --retry 2 --connect-timeout 20 --max-time 1800 `
        -o $tmp $Url 2>$null
      if ($LASTEXITCODE -ne 0 -or !(Test-Path -LiteralPath $tmp) -or (Get-Item -LiteralPath $tmp).Length -eq 0) {
        throw "curl exit=$LASTEXITCODE"
      }
      Move-Item -LiteralPath $tmp -Destination $Target -Force
      return
    } catch {
      if (Test-Path -LiteralPath $tmp) { Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue }
      if ($attempt -gt $Retries) { throw "下载失败(已重试$($attempt-1)次): $Url" }
      Write-Host ("  重试 {0}/{1} ..." -f $attempt, $Retries)
      Start-Sleep -Seconds ([Math]::Min(15, 3 * $attempt))
    }
  }
}

# ─────────────────────────── 主体 ───────────────────────────
Write-Host '=== LightEat CLIP 模型下载 ===' -ForegroundColor Cyan
Write-Host ("模型: {0} (revision: {1})" -f $Repo, $Revision)
Write-Host ("目标: {0}" -f $OutDir)

if ($Source -eq 'auto') { Write-Host '正在探测可达镜像 ...' }
$Base = Resolve-Base $Source
Write-Host ("使用镜像: {0}" -f $Base) -ForegroundColor Green

New-Item -ItemType Directory -Path (Join-Path $OutDir 'onnx') -Force | Out-Null

$ok = 0; $skip = 0; $failed = @()
foreach ($rel in $Manifest) {
  $target = Join-Path $OutDir $rel
  $size = if (Test-Path -LiteralPath $target) { (Get-Item -LiteralPath $target).Length } else { 0 }
  if ($size -gt 0 -and !$Force) {
    Write-Host ("[跳过] {0}  (已存在 {1} KB)" -f $rel, [Math]::Round($size/1KB))
    $skip++
    continue
  }
  $url = "$Base/$Repo/resolve/$Revision/$rel"
  Write-Host ("[下载] {0}  ({1} ...)" -f $rel, $Base)
  try {
    Download-File $url $target $MaxRetries
    $got = (Get-Item -LiteralPath $target).Length
    # 小 JSON 文件做基础校验（仅检查首尾花括号/非空。
    # CLIP 词表含 "A"/"a" 等大小写敏感键，不能用 PowerShell ConvertFrom-Json 校验）
    if ($rel -match '\.(json)$' -and $got -lt 2MB) {
      $raw = Get-Content -LiteralPath $target -Raw -Encoding UTF8
      if (!($raw.StartsWith('{') -and $raw.TrimEnd().EndsWith('}'))) {
        throw 'JSON 首尾不完整'
      }
    }
    Write-Host ("  完成  {0} KB" -f [Math]::Round($got/1KB)) -ForegroundColor Green
    $ok++
  } catch {
    Write-Host ("  失败: {0}" -f $_.Exception.Message) -ForegroundColor Red
    $failed += $rel
  }
}

Write-Host ''
Write-Host ("完成: 下载 {0} 个, 跳过 {1} 个, 失败 {2} 个" -f $ok, $skip, $failed.Count)
if ($failed.Count -eq 0) {
  Write-Host '模型已就绪！访问页面时前端将优先从本地 assets/models/ 加载。' -ForegroundColor Green
  Write-Host ('提示: 重新生成一次也无需联网；若仍失败请换网络后重跑本脚本。')
} else {
  Write-Host '以下文件下载失败（可换网络/换镜像后重跑）：' -ForegroundColor Yellow
  $failed | ForEach-Object { Write-Host ("  - $_") }
}