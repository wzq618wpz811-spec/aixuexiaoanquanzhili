$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$configPath = Join-Path $PSScriptRoot '.env'
$values = [ordered]@{}
if (Test-Path -LiteralPath $configPath) {
    foreach ($line in Get-Content -LiteralPath $configPath -Encoding UTF8) {
        if ($line -match '^([A-Z_]+)=(.*)$') { $values[$matches[1]] = $matches[2] }
    }
}
Write-Host 'Configure local APIs. Keys are hidden while typing and saved only in .env.'
Write-Host 'Paste the new key after revoking the one shared in chat.'
$secureKey = Read-Host 'New Alibaba Cloud Bailian API key' -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
try {
    $plainKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    if ($plainKey -notmatch '^sk-[A-Za-z0-9._-]+$') { throw 'Unexpected key format; no changes saved.' }
    $values['DASHSCOPE_API_KEY'] = $plainKey
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    $plainKey = $null
    $secureKey.Dispose()
}
Write-Host 'For Beijing, paste your workspace ID (ws-...) directly. Other regions: paste the full HTTPS images/generations URL.'
$imageEndpoint = (Read-Host 'Beijing workspace ID OR full HTTPS image endpoint').Trim()
if ($imageEndpoint -match '^ws-[A-Za-z0-9-]+$') {
    $imageEndpoint = 'https://' + $imageEndpoint + '.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/images/generations'
    Write-Host ('Beijing endpoint: ' + $imageEndpoint)
}
$parsedEndpoint = $null
if (-not [Uri]::TryCreate($imageEndpoint, [UriKind]::Absolute, [ref]$parsedEndpoint) -or $parsedEndpoint.Scheme -ne 'https' -or $parsedEndpoint.Host -notmatch '(^|\.)aliyuncs\.com$' -or $parsedEndpoint.AbsolutePath -notmatch '/images/generations$' -or $parsedEndpoint.UserInfo -or $parsedEndpoint.Query) {
    throw 'Expected an official aliyuncs.com HTTPS images/generations URL; no changes saved.'
}
$values['DASHSCOPE_IMAGE_URL'] = $imageEndpoint
$values['DASHSCOPE_IMAGE_MODEL'] = 'qwen-image-2.1-turbo'
$values['PORT'] = '4186'
$values['ENABLE_LIVE_GENERATION'] = '0'
$deepseekKey = Read-Host 'DeepSeek API key (optional; Enter to keep existing)' -AsSecureString
if ($deepseekKey.Length -gt 0) {
    $deepseekPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($deepseekKey)
    try {
        $deepseekPlain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($deepseekPointer)
        if ($deepseekPlain -notmatch '^sk-[A-Za-z0-9._-]+$') { throw 'Unexpected DeepSeek key format; no changes saved.' }
        $values['DEEPSEEK_API_KEY'] = $deepseekPlain
    } finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($deepseekPointer)
        $deepseekPlain = $null
    }
}
$deepseekKey.Dispose()
$values['DEEPSEEK_MODEL'] = 'deepseek-flash'
$lines = foreach ($item in $values.GetEnumerator()) { '{0}={1}' -f $item.Key, $item.Value }
[IO.File]::WriteAllLines($configPath, [string[]]$lines, (New-Object Text.UTF8Encoding($false)))
$values.Clear()
$lines = $null
Write-Host 'Saved locally. Restart the app, then open http://127.0.0.1:4186/student .'
Write-Host 'No API was called and no image-generation fee was incurred by this setup script.'
