# PowerShell script to remove ALL emoji characters from game-framework.js
$file = "public/js/game-framework.js"

if (Test-Path $file) {
    Write-Host "Processing $file..."
    
    # Read file content
    $content = Get-Content $file -Raw -Encoding UTF8
    
    # Replace ALL emoji characters with plain text equivalents
    $content = $content -replace '🎮', ''
    $content = $content -replace '🃏', ''
    $content = $content -replace '🎯', ''
    $content = $content -replace '🌐', ''
    $content = $content -replace '🔗', ''
    $content = $content -replace '❌', 'ERROR:'
    $content = $content -replace '🚨', 'WARNING:'
    $content = $content -replace '🏠', ''
    $content = $content -replace '🤖', 'BOT:'
    $content = $content -replace '🎨', ''
    $content = $content -replace '✅', 'SUCCESS:'
    $content = $content -replace '🔍', 'DEBUG:'
    $content = $content -replace '📖', ''
    $content = $content -replace '⚔️', ''
    $content = $content -replace '🔥', ''
    $content = $content -replace '🎲', ''
    $content = $content -replace '🚫', ''
    $content = $content -replace '🏆', ''
    $content = $content -replace '🎉', ''
    $content = $content -replace '🖼️', ''
    $content = $content -replace '🌐', ''
    $content = $content -replace '📊', ''
    $content = $content -replace '←', ''
    
    # Write back to file
    $content | Out-File -FilePath $file -Encoding UTF8 -NoNewline
    
    Write-Host "Fixed $file"
} else {
    Write-Host "File not found: $file"
}

Write-Host "All emoji removal complete!"

