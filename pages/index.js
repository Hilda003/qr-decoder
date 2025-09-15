import { useState } from "react";
import jsQR from "jsqr";
import { BrowserQRCodeReader } from "@zxing/browser";
import { BrowserMultiFormatReader } from "@zxing/library";

function parseTLV(str) {
  let i = 0;
  const result = {};
  while (i < str.length) {
    const tag = str.substring(i, i + 2);
    const len = parseInt(str.substring(i + 2, i + 4), 10);
    const value = str.substring(i + 4, i + 4 + len);
    result[tag] = value;
    i += 4 + len;
  }
  return result;
}

function parsePayNowQR(raw) {
  const tlv = parseTLV(raw);
// Qr Type
  let qrType = "UNKNOWN";
  if (/SG\.PAYNOW/i.test(raw)) {
    qrType = "PAYNOW";
  } else if (/SGQR/i.test(raw)) {
    qrType = "SGQR";
  }

  const tag01 = tlv["01"] || "-";
  const qrMode =
    tag01 === "12" ? "DYNAMIC" :
    tag01 === "11" ? "STATIC"  : "UNKNOWN";

  // Account Merchant Info 
  let payNowId = "-";
  let proxyType = "-";
  let proxyNumber = "-";
  let expiredDate = "-";

  for (let t = 26; t <= 51; t++) {
    const key = t.toString().padStart(2, "0");
    if (tlv[key]) {
      const merchantInfo = parseTLV(tlv[key]);
      if ((merchantInfo["00"] || "").toUpperCase() === "SG.PAYNOW") {
        payNowId = merchantInfo["00"];
        // Proxy type
        if (merchantInfo["01"]) {
          switch (merchantInfo["01"]) {
            case "0": proxyType = "Mobile"; break;
            case "1": proxyType = "NRIC"; break;
            case "2": proxyType = "UEN"; break;
            case "3": proxyType = "VPA"; break;
            default: proxyType = "Unknown";
          }
        }
    }
        // Proxy number
    if (merchantInfo["02"]) {
        proxyNumber = merchantInfo["02"];
    }

    // Expired Date
    if (merchantInfo["04"]) {
      const rawDate = merchantInfo["04"];
      if (rawDate.length >= 14) {
        const year = rawDate.substring(0, 4);
        const month = rawDate.substring(4, 6);
        const day = rawDate.substring(6, 8);
        const hour = rawDate.substring(8, 10);
        const min = rawDate.substring(10, 12);
        const sec = rawDate.substring(12, 14);
        expiredDate = `${year}-${month}-${day} ${hour}:${min}:${sec}`;
      }
    }
  }

  // Merchant name (tag 59)
  const casLookup = tlv["59"] || "-";

  // QR Status (Expired or Valid)
  let qrStatus = "VALID";
  if (expiredDate !== "-") {
    const today = new Date();
    const exp = new Date(expiredDate);
    if (today > exp) qrStatus = "EXPIRED";
  }

  // Transaction amount
  const amount = tlv["54"] || "-";

  // Reference number (tag 62 -> sub 01)
  let reference = "-";
  if (tlv["62"]) {
    const refInfo = parseTLV(tlv["62"]);
    if (refInfo["01"]) reference = refInfo["01"];
  }

  return {
    raw,
    qrType,
    qrMode,
    payNowId,
    proxyType,
    proxyNumber,
    expiredDate,
    casLookup,
    qrStatus,
    amount,
    reference
  };
}
}



export default function Home() {
  const [result, setResult] = useState(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    img.src = URL.createObjectURL(file);

    img.onload = async () => {
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const scale = 2;
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let code = jsQR(imageData.data, canvas.width, canvas.height, {
        inversionAttempts: "attemptBoth",
      });
        if (!code) {
          const reader = new BrowserMultiFormatReader();
          const zxingResult = await reader.decodeFromImage(img);
          code = { data: zxingResult.getText() };
      }

      if (code?.data) {
        const parsed = parsePayNowQR(code.data);
        setResult(parsed);
      } else {
        setResult({ error: "QR tidak terbaca, coba foto lebih jelas/tegak lurus" });
      }
    } catch (error) {
      console.error("Error saat proses QR:", error);
      setResult({ error: "Terjadi kesalahan saat membaca QR" });
    }
  };
};


  return (
    <div className="p-6">
      <input type="file" accept="image/*" onChange={handleFile} className="mb-4" />

      {result && (
        <div className="mt-6">
          {result.error ? (
            <p className="text-red-500">{result.error}</p>
          ) : (
            <>
              <p className="mb-2 break-all">
                <strong>Raw String:</strong> {result.raw}
              </p>
              <div className="mt-4 p-4 border rounded-lg bg-gray-100">
              <p><strong>QR Type:</strong> {result.qrType}</p>
              <p><strong>QR Mode:</strong> {result.qrMode}</p>
              <p><strong>PayNow Identifier:</strong> {result.payNowId}</p>
              <p><strong>Proxy Type:</strong> {result.proxyType}</p>
              <p><strong>Proxy Number:</strong> {result.proxyNumber}</p>
              <p><strong>Expiry Date:</strong> {result.expiredDate}</p>
              <p><strong>CAS Lookup:</strong> {result.casLookup}</p>
              <p><strong>QR Status:</strong> {result.qrStatus}</p>
              <p><strong>Transaction Amount:</strong> {result.amount}</p>
              <p><strong>Reference Number:</strong> {result.reference}</p>
            </div>

            </>
          )}
        </div>
      )}
    </div>
  );
}
