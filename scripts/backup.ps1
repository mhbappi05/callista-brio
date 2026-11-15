# Usage:  .\scripts\backup.ps1 -DbUrl "postgresql://postgres.<ref>:<password>@<host>:5432/postgres"
# Get the connection string in Supabase: Project > Connect. Needs Docker Desktop running.
# Never commit backups or the connection string.
param([Parameter(Mandatory = $true)][string]$DbUrl)

$stamp = Get-Date -Format "yyyyMMdd-HHmm"
$dir = "backups/$stamp"
New-Item -ItemType Directory -Force -Path $dir | Out-Null

npx supabase db dump --db-url $DbUrl -f "$dir/roles.sql" --role-only
npx supabase db dump --db-url $DbUrl -f "$dir/schema.sql"
npx supabase db dump --db-url $DbUrl -f "$dir/data.sql" --data-only --use-copy

Write-Host "Database dump saved to $dir. Product images (Storage) are NOT included: download them separately."