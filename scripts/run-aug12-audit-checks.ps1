$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$checks = @(
  "security-pii-no-leak",
  "security-xss-allowlist-sanitize",
  "security-recaptcha-fail-closed",
  "seo-canonical-unified-origin",
  "db-prod-no-local",
  "db-fk-check-constraints",
  "perf-hero-hydration-office-map"
)

$failed = @()
foreach ($c in $checks) {
  Write-Host "=== $c ===" -ForegroundColor Cyan
  & npx.cmd --no-install tsx "scripts/$c.selfcheck.ts"
  if ($LASTEXITCODE -ne 0) { $failed += $c }
}

if ($failed.Count -gt 0) {
  Write-Host "FAILED: $($failed -join ', ')" -ForegroundColor Red
  exit 1
}
Write-Host "ALL $($checks.Count) SELFCHECKS PASSED" -ForegroundColor Green
