const Quagga = require('quagga2');

/**
 * Decodes a barcode from an image file (Buffer or base64 string).
 * @param {Buffer|string} imageData - Image buffer or base64 string (PNG/JPEG).
 * @returns {Promise<Object>} - Decoded barcode result.
 */
function scanBarcodeFromImage(imageData) {
    return new Promise((resolve) => {
        Quagga.decodeSingle({
            src: imageData, // Can be a base64 string or file path
            numOfWorkers: 0, // Needs to be 0 when used in Node
            inputStream: {
                size: 800 // restrict input-size for faster tests
            },
            decoder: {
                readers: [
                    'ean_reader',
                    'ean_8_reader',
                    'code_128_reader',
                    'upc_reader',
                    'upc_e_reader',
                    'code_39_reader',
                    'code_39_vin_reader',
                    'codabar_reader',
                    'i2of5_reader',
                    'code_93_reader'
                ]
            }
        }, function(result) {
            if (result && result.codeResult) {
                resolve({
                    code: result.codeResult.code,
                    format: result.codeResult.format,
                    success: true
                });
            } else {
                resolve({
                    code: null,
                    format: null,
                    success: false,
                    error: 'No barcode detected'
                });
            }
        });
    });
}

module.exports = { scanBarcodeFromImage };