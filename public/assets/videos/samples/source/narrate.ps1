$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$sampleManifest = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'manifest.json') -Raw | ConvertFrom-Json
$sampleAudioDirectory = Join-Path $PSScriptRoot 'narration'
New-Item -ItemType Directory -Path $sampleAudioDirectory -Force | Out-Null
$sampleSpeaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
$sampleSpeaker.SelectVoice('Microsoft Zira Desktop')
$sampleSpeaker.Rate = 2
$sampleSpeaker.Volume = 100
foreach ($sampleItem in $sampleManifest.samples) {
    for ($sampleLine = 0; $sampleLine -lt $sampleItem.voice.Count; $sampleLine++) {
        $sampleWavePath = Join-Path $sampleAudioDirectory ($sampleItem.key + '-' + $sampleLine + '.wav')
        $sampleSpeaker.SetOutputToWaveFile($sampleWavePath)
        $sampleSpeaker.Speak($sampleItem.voice[$sampleLine])
        $sampleSpeaker.SetOutputToNull()
    }
}
$sampleSpeaker.Dispose()
'Narration Saved'
