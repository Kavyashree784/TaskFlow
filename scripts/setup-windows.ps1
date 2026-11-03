$ErrorActionPreference = 'Stop'

Write-Host 'TaskFlow Windows setup' -ForegroundColor Cyan

$node = node --version 2>$null
if (-not $node) { throw 'Node.js is not installed. Install Node.js 22 LTS, reopen PowerShell, and run this script again.' }
$npm = npm --version 2>$null
if (-not $npm) { throw 'npm is not available. Reinstall Node.js 22 LTS and reopen PowerShell.' }

$backendEnv = Join-Path $PSScriptRoot '..\backend\.env'
$backendExample = Join-Path $PSScriptRoot '..\backend\.env.example'
if (-not (Test-Path $backendEnv)) {
  $bytes = New-Object byte[] 48
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  $rng.GetBytes($bytes)
  $rng.Dispose()
  $secret = [Convert]::ToBase64String($bytes)
  $content = Get-Content $backendExample -Raw
  $content = $content -replace '(?m)^JWT_SECRET=.*$', "JWT_SECRET=$secret"
  Set-Content -Path $backendEnv -Value $content -Encoding ascii
  Write-Host 'Created backend/.env with a generated JWT secret.' -ForegroundColor Green
} else {
  Write-Host 'backend/.env already exists; leaving it unchanged.' -ForegroundColor Yellow
}

$rootEnv = Join-Path $PSScriptRoot '..\.env'
$rootExample = Join-Path $PSScriptRoot '..\.env.example'
if (-not (Test-Path $rootEnv)) {
  $rootBytes = New-Object byte[] 48
  $rootRng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  $rootRng.GetBytes($rootBytes)
  $rootRng.Dispose()
  $rootSecret = [Convert]::ToBase64String($rootBytes)
  $rootContent = Get-Content $rootExample -Raw
  $rootContent = $rootContent -replace '(?m)^JWT_SECRET=.*$', "JWT_SECRET=$rootSecret"
  Set-Content -Path $rootEnv -Value $rootContent -Encoding ascii
  Write-Host 'Created root .env for Docker Compose with a separate random secret.' -ForegroundColor Green
} else {
  Write-Host 'Root .env already exists; leaving it unchanged.' -ForegroundColor Yellow
}

Write-Host "Node: $node | npm: $npm"
Write-Host 'Installing root tooling and application dependencies...' -ForegroundColor Cyan
npm install
npm run install:all

Write-Host ''
Write-Host 'Setup complete.' -ForegroundColor Green
Write-Host 'Next: make sure MongoDB is available at the MONGODB_URI in backend/.env.'
Write-Host 'Then run: npm run dev'
Write-Host 'Frontend: http://localhost:5173 | API health: http://localhost:5000/api/health'
