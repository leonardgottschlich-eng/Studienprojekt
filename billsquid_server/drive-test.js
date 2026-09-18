const { google } = require("googleapis");

const auth = new google.auth.GoogleAuth({
    keyFile: "./service-account.json",
    scopes: ["https://www.googleapis.com/auth/drive"],
});

const drive = google.drive({ version: "v3", auth });

async function listeDateien() {
    try {
        const res = await drive.files.list({
            pageSize: 20,
            fields: "files(id, name, mimeType, size, createdTime)",
            orderBy: "createdTime desc",
        });

        const dateien = res.data.files;

        if (!dateien.length) {
            console.log("Keine Dateien gefunden.");
            console.log("Ist der Ordner mit dem Dienstkonto geteilt?");
            return;
        }

        console.log(`${dateien.length} Datei(en) gefunden:\n`);
        dateien.forEach((f) => {
            console.log(`${f.name}`);
            console.log(`   ID:  ${f.id}`);
            console.log(`   Typ: ${f.mimeType}\n`);
        });
    } catch (err) {
        console.error("Fehler:", err.message);
    }
}

listeDateien();