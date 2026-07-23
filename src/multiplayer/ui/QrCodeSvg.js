import QRCode from "qrcode";

export function createQrCodeSvg(text, {
    scale = 6,
    quietZone = 4,
    errorCorrectionLevel = "M"
} = {}) {
    const qr = QRCode.create(String(text || ""), {
        errorCorrectionLevel
    });
    const size = qr.modules.size;
    const data = qr.modules.data;
    const totalSize = (size + quietZone * 2) * scale;
    const rects = [];

    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            if (!data[row * size + col]) continue;
            rects.push(`<rect x="${(col + quietZone) * scale}" y="${(row + quietZone) * scale}" width="${scale}" height="${scale}"/>`);
        }
    }

    return [
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSize} ${totalSize}" role="img" aria-label="Join room QR code">`,
        `<rect width="${totalSize}" height="${totalSize}" fill="#fff"/>`,
        `<g fill="#111">`,
        rects.join(""),
        `</g>`,
        `</svg>`
    ].join("");
}
