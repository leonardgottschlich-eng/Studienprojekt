import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// HTTPS-Zertifikat: Liegen in certs/ die Dateien cert.key und cert.crt (etwa
// mit mkcert erzeugt), werden sie verwendet. Dem vertrauen die Browser nach
// einmaligem Import der CA ohne Warnungen. Sonst kommt das Wegwerf-Zertifikat
// von basicSsl zum Einsatz. Mit NO_SSL=1 läuft der Server ganz ohne HTTPS
// (http://localhost:5173).
const certDir   = path.join(path.dirname(fileURLToPath(import.meta.url)), 'certs')
const hatMkcert = fs.existsSync(path.join(certDir, 'cert.key')) && fs.existsSync(path.join(certDir, 'cert.crt'))
const ohneSsl   = !!process.env.NO_SSL

// Unter HTTPS spricht der Dev-Server HTTP/2 mit dem Browser. Dort sind
// verbindungsspezifische Header verboten, der Apache des Backends schickt aber
// "Upgrade: h2", "Connection: Upgrade" und "Transfer-Encoding: chunked" mit.
// Werden die durchgereicht, bricht der HTTP/2-Stream ab (im Browser als
// NS_ERROR_NET_RESET). Deshalb werden sie hier entfernt, über HTTP/1.1 setzt
// Node die korrekte Übertragung selbst wieder.
const http2VertraeglicheHeader = (proxy) => {
  proxy.on("proxyRes", (proxyRes) => {
    for (const h of ["upgrade", "connection", "keep-alive", "transfer-encoding", "proxy-connection"]) {
      delete proxyRes.headers[h]
    }
  })
}

// Ziel-Backend der Hochschule. Über VITE_API_TARGET umstellbar, etwa auf
// http://localhost:8080 für eine lokale CodeIgniter-Instanz.
const API_TARGET  = process.env.VITE_API_TARGET  || 'https://app.billsquid.com'
// Lokaler Scan-Server (billsquid_server) für Scanner-Eingang und Bilddateien
const SCAN_TARGET = process.env.VITE_SCAN_TARGET || 'http://localhost:3001'

export default defineConfig({
  plugins: [
    react(),
    ...(!ohneSsl && !hatMkcert ? [basicSsl()] : [])
  ],
  server: {
    https: !ohneSsl && hatMkcert
        ? {
            key:  fs.readFileSync(path.join(certDir, 'cert.key')),
            cert: fs.readFileSync(path.join(certDir, 'cert.crt')),
          }
        : undefined,
    proxy: {
      // /api geht an den lokalen Scan-Server. Dessen Routen heißen /scan/…
      // oder /belege/…, deshalb wird das Präfix entfernt.
      '/api': {
        target: SCAN_TARGET,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        configure: http2VertraeglicheHeader,
      },
      // /backend geht an das CodeIgniter-Backend mit MySQL-Datenbank, so ist
      // kein CORS nötig. Die Backend-Routen tragen das /api-Präfix selbst,
      // daher bleibt es stehen.
      '/backend': {
        target: API_TARGET,
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/backend/, ''),
        configure: http2VertraeglicheHeader,
      }
    }
  }
})
