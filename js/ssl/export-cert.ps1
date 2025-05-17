# Step 1: Find your certificate by Friendly Name
 
# Find all matching certs and pick the newest one
$certs = Get-ChildItem -Path cert:\LocalMachine\My | Where-Object { $_.FriendlyName -eq "Shopy Development Certificate" } | Sort-Object NotAfter -Descending

if (-not $certs) {
    Write-Error "No certificate found with FriendlyName 'Shopy Development Certificate'"
    exit
}

$cert = $certs[0]  # Pick the newest one
if (-not $cert) {
    Write-Error "Certificate not found. Make sure it exists in LocalMachine\My store."
    exit
}

if (-not $cert.HasPrivateKey) {
    Write-Error "Certificate does not have a private key."
    exit
}

if (-not $cert.PrivateKey.CspKeyContainerInfo.Exportable) {
    Write-Error "Private key is not exportable. Recreate the certificate with exportable key."
    exit
}

# Step 2: Create ssl directory if needed
$sslDir = "ssl"
if (-not (Test-Path $sslDir)) {
    New-Item -ItemType Directory -Path $sslDir
}

# Step 3: Export public certificate
$cert | Export-Certificate -FilePath "$sslDir\cert.pem" -Type CERT
Write-Host "Public certificate exported to ssl\cert.pem"

# Step 4: Export PFX file
$plainPassword = Read-Host "Enter password for PFX export"
$securePassword = ConvertTo-SecureString -String $plainPassword -Force -AsPlainText
$cert | Export-PfxCertificate -FilePath "$sslDir\temp.pfx" -Password $securePassword
Write-Host "PFX file created at ssl\temp.pfx"

# Step 5: Convert PFX to PEM using OpenSSL
$opensslPath = "C:\Program Files\OpenSSL-Win64\bin\openssl.exe"

if (Test-Path $opensslPath) {
    Write-Host "Extracting private key with OpenSSL..."
    & $opensslPath pkcs12 -in "$sslDir\temp.pfx" -out "$sslDir\key.pem" -nocerts -nodes -password pass:password
    Remove-Item "$sslDir\temp.pfx"
    Write-Host "Private key saved to ssl\key.pem"
} else {
    Write-Warning "OpenSSL not found at: $opensslPath"
    Write-Host "Please install OpenSSL from https://slproweb.com/products/Win32OpenSSL.html "
    Write-Host "Then run this command manually:"
    Write-Host "openssl pkcs12 -in ssl\temp.pfx -out ssl\key.pem -nocerts -nodes -password pass:password"
}

Write-Host "✅ Export completed successfully!"