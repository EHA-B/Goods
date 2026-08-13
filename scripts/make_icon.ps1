param(
    [string]$src = "C:\Users\Ehab\.gemini\antigravity-ide\brain\168b0e85-e48c-4761-9d85-356b7ab79490\stocklite_icon_1786513541011.png",
    [string]$dst = "C:\Users\Ehab\Desktop\Code\goods app\Goods\public\icon.ico"
)

Add-Type -AssemblyName System.Drawing

$img = [System.Drawing.Image]::FromFile($src)

$bmp256 = New-Object System.Drawing.Bitmap(256, 256)
$g = [System.Drawing.Graphics]::FromImage($bmp256)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($img, 0, 0, 256, 256)
$g.Dispose()

$ms = New-Object System.IO.MemoryStream
$bmp256.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
$pngBytes = $ms.ToArray()
$ms.Dispose()

$icoStream = New-Object System.IO.FileStream($dst, [System.IO.FileMode]::Create)
$writer = New-Object System.IO.BinaryWriter($icoStream)

$writer.Write([uint16]0)
$writer.Write([uint16]1)
$writer.Write([uint16]1)

$writer.Write([byte]0)
$writer.Write([byte]0)
$writer.Write([byte]0)
$writer.Write([byte]0)
$writer.Write([uint16]1)
$writer.Write([uint16]32)
$writer.Write([uint32]$pngBytes.Length)
$writer.Write([uint32]22)

$writer.Write($pngBytes)
$writer.Close()
$icoStream.Close()
$img.Dispose()
$bmp256.Dispose()

Write-Host "ICO created at: $dst"
