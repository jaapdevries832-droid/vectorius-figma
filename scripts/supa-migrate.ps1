param(
    [Parameter(Mandatory = $true)]
    [string]$Name
)

$ErrorActionPreference = "Stop"

function Invoke-Step {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Label,
        [Parameter(Mandatory = $true)]
        [ScriptBlock]$Command
    )

    Write-Host "==> $Label"
    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw "Step failed: $Label (exit code $LASTEXITCODE)"
    }
}

Invoke-Step "supabase migration new $Name" { supabase migration new $Name }
Invoke-Step "supabase db push" { supabase db push }
Invoke-Step "supabase db pull" { supabase db pull }
Invoke-Step "supabase migration list" { supabase migration list }
Invoke-Step "git status" { git status }
