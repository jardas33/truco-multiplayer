# PowerShell script to remove emoji characters from game files
$files = @(
    "public/js/crazy-eights.js",
    "public/js/go-fish.js", 
    "public/js/hearts.js",
    "public/js/war.js"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "Processing $file..."
        
        # Read file content
        $content = Get-Content $file -Raw -Encoding UTF8
        
        # Replace common emoji patterns
        $content = $content -replace '🎯', ''
        $content = $content -replace '🃏', ''
        $content = $content -replace '🏆', ''
        $content = $content -replace '🎮', ''
        $content = $content -replace '🔍', ''
        $content = $content -replace '✅', 'SUCCESS:'
        $content = $content -replace '❌', 'ERROR:'
        $content = $content -replace '⏳', 'WAITING:'
        $content = $content -replace '🔄', 'RETRY:'
        $content = $content -replace '🏠', ''
        $content = $content -replace '🎨', ''
        $content = $content -replace '🐟', ''
        $content = $content -replace '♥️', ''
        $content = $content -replace '⚔️', ''
        
        # Write back to file
        $content | Out-File -FilePath $file -Encoding UTF8 -NoNewline
        
        Write-Host "Fixed $file"
    } else {
        Write-Host "File not found: $file"
    }
}

Write-Host "Emoji removal complete!"

