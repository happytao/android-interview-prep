param(
  [Parameter(Mandatory = $true)]
  [string]$Server,
  [string]$RemotePath = "/var/www/interview-prep"
)

$ErrorActionPreference = "Stop"

Write-Host "1/3 Running typecheck, tests, and production build..." -ForegroundColor Cyan
pnpm typecheck
pnpm test
pnpm build

Write-Host "2/3 Uploading static assets (preserving previous hashed chunks for active tabs)..." -ForegroundColor Cyan
if (Get-Command rsync -ErrorAction SilentlyContinue) {
  rsync -avz dist/assets/ "$Server`:$RemotePath/assets/"
  rsync -avz --exclude="assets/" dist/ "$Server`:$RemotePath/"
} else {
  ssh $Server "mkdir -p $RemotePath/assets"
  scp -r dist/assets/* "$Server`:$RemotePath/assets/"
  Get-ChildItem dist -File | ForEach-Object {
    scp $_.FullName "$Server`:$RemotePath/"
  }
}

Write-Host "3/3 Deployment complete: $Server -> $RemotePath" -ForegroundColor Green
