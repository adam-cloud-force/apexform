# Run from apexform folder after: gh auth login -h github.com -p https -w
$ErrorActionPreference = "Stop"
$repo = "apexform"

gh auth status | Out-Null

if (-not (git remote get-url origin 2>$null)) {
  gh repo create $repo --public --source=. --remote=origin --description "Science-backed looksmaxxing research & routine tracker"
} else {
  Write-Host "Remote already set: $(git remote get-url origin)"
}

git push -u origin main

gh api -X PUT "/repos/{owner}/$repo/pages" -f build_type=workflow | Out-Null

$owner = (gh api user -q .login)
Write-Host ""
Write-Host "Pushed to https://github.com/$owner/$repo"
Write-Host "Pages will deploy in ~1 min at: https://$owner.github.io/$repo/"
Write-Host "Check: gh run list --repo $owner/$repo"
