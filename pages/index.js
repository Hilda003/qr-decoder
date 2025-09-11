import { useState } from "react";
import jsQR from "jsqr";

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

  // Account Merchant Info 
  let jenisPayNow = "-";
  let noAkun = "-";
  let expiredDate = "-";

  if (tlv["26"]) {
    const merchantInfo = parseTLV(tlv["26"]);

    // Jenis PayNow
    if (merchantInfo["01"]) {
      switch (merchantInfo["01"]) {
        case "0": jenisPayNow = "Mobile"; break;
        case "1": jenisPayNow = "NRIC"; break;
        case "2": jenisPayNow = "UEN"; break;
        case "3": jenisPayNow = "VPA"; break;
        default: jenisPayNow = "Unknown";
      }
    }


    // No account
    if (merchantInfo["02"]) {
      noAkun = merchantInfo["02"];
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

  // Amount 
  let nominal = "-";
  if (tlv["54"]) {
    nominal = tlv["54"];
  }

  return {
    raw,
    noAkun,
    jenisPayNow,
    nominal,
    expiredDate
  };
}



export default function Home() {
  const [result, setResult] = useState(null);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const img = new Image();
    img.src = URL.createObjectURL(file);

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0, img.width, img.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, canvas.width, canvas.height);

      if (code) {
        const parsed = parsePayNowQR(code.data);
        setResult(parsed);
      } else {
        setResult({ error: "QR tidak terbaca" });
      }
    };
  };

  return (
    <div className="p-6">
      <input type="file" onChange={handleFile} className="mb-4" />

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
                <p>
                  <strong>No Akun:</strong> {result.noAkun}
                </p>
                <p>
                  <strong>Jenis PayNow:</strong> {result.jenisPayNow}
                </p>
                <p>
                  <strong>Nominal:</strong> {result.nominal}
                </p>
                <p>
                  <strong>Expired Date:</strong> {result.expiredDate}
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
