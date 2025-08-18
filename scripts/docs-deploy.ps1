Param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('commit','build','publish','setup-actions')]
    [string]$Action,
    [string]$Message = "docs: update"
)

function Invoke-Commit {
    git add -A
    git commit -m $Message
    git push origin main
}

function Invoke-Build {
    npm ci
    npm run build
}

function Invoke-Publish {
    if (-not (Test-Path "build")) { Invoke-Build }
    npx --yes gh-pages -d build -b gh-pages -f
}

function Invoke-SetupActions {
    if (-not (Test-Path ".github/workflows/deploy.yml")) {
        Write-Host "Workflow file missing; ensure repo contains .github/workflows/deploy.yml" -ForegroundColor Yellow
    }
    Write-Host "Enable GitHub Actions in repo settings and set Pages to gh-pages/(root)." -ForegroundColor Green
}

switch ($Action) {
    'commit' { Invoke-Commit }
    'build' { Invoke-Build }
    'publish' { Invoke-Publish }
    'setup-actions' { Invoke-SetupActions }
}


