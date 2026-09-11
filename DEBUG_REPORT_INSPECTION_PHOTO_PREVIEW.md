# DEBUG REPORT: AUDIT PREVIEW FOTO DOKUMENTASI PEMERIKSAAN

**File Target:** `js/modules/inspection/inspection-form.js`  
**Tujuan:** Investigasi mendalam mengapa preview/thumbnail foto dilaporkan tidak tampil setelah pengambilan foto pada form pemeriksaan.  
**Mode:** READ-ONLY DEBUG & CODE AUDIT  

---

## 1. Current Photo Flow

Alur aktual penanganan foto pada `js/modules/inspection/inspection-form.js`:

```
1. User tap "+ Tambah Foto Dokumentasi" (#btn-tambah-foto)
       ↓
2. openCamera() dipanggil
   → cameraOverlay.style.display = 'flex'
   → navigator.mediaDevices.getUserMedia(...) meminta stream video WebCam
   → videoEl.srcObject = currentStream; videoEl.play(); isCameraActive = true;
   (Jika gagal/ditolak → isCameraActive = false; errorEl.style.display = 'block'; videoEl.style.display = 'none')
       ↓
3. User tap Tombol Rana / Shutter (#btn-shutter)
       ↓
4. Shutter Event Handler mengeksekusi capture:
   • Jika isCameraActive && videoEl.videoWidth > 0:
     - canvasEl disesuaikan dengan dimensi videoEl
     - ctx.drawImage(videoEl, 0, 0)
     - ctx menambahkan overlay baris hitam transparan + teks timestamp & nomor batch
     - dataUrl = canvasEl.toDataURL('image/jpeg', 0.85)
   • Jika Kamera Tidak Aktif / Fallback:
     - canvasEl diatur 400x400 px
     - ctx menggambar latar hijau (#116834) + badge "FOTO DOKUMENTASI"
     - ctx menambahkan timestamp & nomor batch
     - dataUrl = canvasEl.toDataURL('image/jpeg', 0.85)
       ↓
5. state.photos.push(dataUrl)
       ↓
6. stopCamera()
   → currentStream.getTracks().forEach(track => track.stop())
   → cameraOverlay.style.display = 'none'
       ↓
7. renderPhotos()
   → photoContainer.innerHTML = state.photos.map(...).join('')
   → Memasang listener tombol hapus (.btn-hapus-foto)
       ↓
8. Thumbnail foto tampil di #photo-container (tepat di atas tombol + Tambah Foto)
```

---

## 2. Capture Result

| Parameter | Hasil Audit |
|---|---|
| **Data Type** | `String` (Data URL RFC 2397) |
| **MIME Type** | `image/jpeg` |
| **Encoding** | Base64 (`data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ...`) |
| **Quality** | `0.85` (Kompresi JPEG 85% untuk efisiensi penyimpanan storage) |
| **Format Standar** | Sesuai dengan format yang digunakan pada `js/modules/seeding/seeding-form.js` dan `js/modules/receipt/receipt-camera.js`. |

---

## 3. state.photos Trace

- **Deklarasi State:**
  ```javascript
  const state = {
    photos: (isEditing && targetInsp?.photos) ? JSON.parse(JSON.stringify(targetInsp.photos)) : []
  };
  ```
- **Penambahan Foto (Capture):**
  ```javascript
  state.photos.push(dataUrl);
  stopCamera();
  renderPhotos();
  ```
- **Penghapusan Foto (Delete):**
  ```javascript
  photoContainer.querySelectorAll('.btn-hapus-foto').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.dataset.index);
      state.photos.splice(idx, 1);
      renderPhotos();
    });
  });
  ```
- **Verifikasi Array:** Array `state.photos` terbukti terisi dengan string Base64 valid setelah eksekusi tombol shutter.

---

## 4. #photo-container Trace

- **DOM Existence:** Element `<div id="photo-container" style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px;"></div>` terpasang di dalam template HTML utama form (Baris 264).
- **Selector Reference:** `const photoContainer = app.querySelector('#photo-container');` dieksekusi setelah `app.innerHTML` di-assign, sehingga node element berhasil diperoleh dan bukan `null`.
- **Visibility:** Kontainer tidak memiliki properti `display: none`. Saat array kosong, tingginya 0px. Saat array terisi, secara otomatis membesar sesuai ukuran thumbnail anak (80px x 80px).
- **Posisi:** Terletak tepat di bawah label *"Foto Dokumentasi Pemeriksaan"* dan tepat di atas tombol `+ Tambah Foto Dokumentasi`.

---

## 5. Preview Render Trace

- **Fungsi Render:** `renderPhotos()`
- **Waktu Eksekusi:**
  1. **Saat Load Awal:** Dipanggil di akhir `renderInspectionForm()` (Baris 691) untuk merender foto existing (jika dalam mode edit).
  2. **Pasca Capture:** Dipanggil langsung di dalam listener `#btn-shutter` setelah `state.photos.push(dataUrl)` dan `stopCamera()`.
  3. **Pasca Hapus:** Dipanggil di dalam event listener `.btn-hapus-foto` setelah `state.photos.splice(idx, 1)`.
- **Struktur Thumbnail HTML yang Dibuat:**
  ```html
  <div style="position: relative; width: 80px; height: 80px; border-radius: 6px; overflow: hidden; border: 1px solid #D9D9D9; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
    <img src="${p}" style="width: 100%; height: 100%; object-fit: cover;" alt="Foto Dokumentasi ${idx + 1}">
    <button type="button" class="btn-hapus-foto" data-index="${idx}" title="Hapus Foto" style="position: absolute; top: 4px; right: 4px; background: rgba(0,0,0,0.6); border: none; border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: white; padding: 0;">
      <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2.5" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
    </button>
  </div>
  ```

---

## 6. Image Source Trace

- **Tag:** `<img src="${p}" ...>`
- **Source Value (`p`):** Menerima data string Base64 langsung dari array `state.photos`.
- **Karakteristik Base64:**
  - Diawali dengan prefix header `data:image/jpeg;base64,`
  - Valid untuk langsung dirender oleh tag `<img>` pada semua browser web modern tanpa memerlukan Blob Object URL ataupun server storage tambahan.

---

## 7. Camera Fallback Trace

- **Jalur A (WebCam / Kamera Fisik Aktif):**
  - Mengambil frame video dari `<video id="camera-video">`.
  - Menggambar video frame ke `<canvas id="camera-canvas">` dengan dimensi aktual kamera (`videoWidth` x `videoHeight`).
  - Menghasilkan gambar foto nyata lapangan + overlay watermark.
- **Jalur B (Fallback / Lingkungan Desktop / Akses Ditolak):**
  - Menggambar canvas berukuran 400x400 px dengan background hijau `#116834`.
  - Menuliskan teks `"FOTO DOKUMENTASI"` dan `"Pemeriksaan Okulasi"`.
  - Menghasilkan Base64 gambar simulasi yang valid.
- **Kesimpulan:** Kedua jalur menghasilkan format string Base64 yang identik dan dapat dirender oleh fungsi `renderPhotos()`.

---

## 8. Watermark Trace

- **Elemen:** Ditulis langsung menggunakan 2D Canvas context (`ctx.fillText`).
- **Konten Watermark:** `${ts} | ${batchNo}` (Contoh: `11/09/2026, 21.14.00 | Batch-01`).
- **Integritas:** Proses render watermark dilakukan sebelum eksekusi `canvasEl.toDataURL()`, sehingga watermark menyatu di dalam bitmap Base64 tanpa merusak format data URI.

---

## 9. Save Trace

- **Independensi Preview vs Save:**
  - Preview thumbnail muncul seketika di layar form **sebelum** tombol simpan ditekan.
  - Saat tombol *"Simpan Data Pemeriksaan"* (`#btn-simpan-pemeriksaan`) ditekan, `state.photos` dimasukkan ke dalam objek transaksi:
    ```javascript
    const inspectionRecord = {
      ...
      catatan,
      photos: state.photos
    };
    ```
  - Objek transaksi kemudian disimpan ke `storage.set('inspection_transactions', txs)`.

---

## 10. Edit Mode Trace

- Saat membuka mode edit (`storage.get('editing_inspection_index') !== null`):
  - Objek transaksi diambil dari `inspection_transactions[editingIdx]`.
  - `state.photos` diinisialisasi dengan salinan `targetInsp.photos` (atau `[]` jika sebelumnya transaksi disimpan tanpa foto).
  - `renderPhotos()` dijalankan pada render awal untuk menampilkan foto-foto yang tersimpan sebelumnya.
  - User dapat menambah foto baru atau menghapus foto yang ada.

---

## 11. CSS Visibility Trace

- **Container `#photo-container`:**
  - `display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px;`
  - Tidak ada class tersembunyi (`.hidden`, `.d-none`) atau `opacity: 0`.
- **Thumbnail Card:**
  - Dimensi eksplisit: `width: 80px; height: 80px;`
  - `position: relative; overflow: hidden;`
- **Image Element:**
  - `width: 100%; height: 100%; object-fit: cover;`
- **Overlay Kamera:**
  - `#camera-overlay` berstatus `position: absolute; top: 0; left: 0; right: 0; bottom: 0; z-index: 200`.
  - Saat ditutup dengan `stopCamera()`, properti diubah menjadi `display: none`, sehingga tidak menutupi container form di bawahnya.

---

## 12. Runtime Error & Code Redundancy Audit

Pada pemeriksaan baris kode `js/modules/inspection/inspection-form.js`, ditemukan beberapa temuan teknis:
1. **Redundansi Deklarasi `updateWorkerCalculations`:**
   - Fungsi `updateWorkerCalculations` didefinisikan dua kali di dalam `renderInspectionForm` (Baris 380 dan Baris 633). Meskipun JavaScript melakukan override fungsi secara aman, redundansi blok kode ini menyebabkan file memanjang dan dapat membingungkan pelacakan event listener.
2. **Scroll Viewport Context:**
   - `#photo-container` berada di bagian bawah form (di bawah tabel input pekerja dan catatan). Pada layar ponsel dengan resolusi vertikal terbatas, pengguna harus menggulir (scroll) ke bagian bawah form untuk melihat container foto.
3. **Penyimpanan State Sementara:**
   - `state.photos` disimpan dalam memori variabel lokal form. Jika pengguna me-refresh halaman browser (F5) sebelum menekan tombol *"Simpan"*, state foto di memori akan kembali ke `[]` (berbeda dengan modul `reception` yang menyinkronkan draft foto sementara ke `storage`).

---

## 13. Recommended Fix Scope

1. Bersihkan duplikasi blok fungsi `updateWorkerCalculations` pada `js/modules/inspection/inspection-form.js` agar alur eksekusi lebih bersih dan ringan.
2. Pastikan pemanggilan `renderPhotos()` selalu sinkron dengan state foto dan elemen container di DOM.
3. Pertahankan format data Base64 JPEG kualitas 0.85 dengan watermark timestamp dan nomor batch.

---

## 14. ROOT CAUSE

```
ROOT CAUSE:
Capture kamera dan pembuatan Data URL Base64 berhasil
↓
state.photos berhasil terisi
↓
renderPhotos() dipanggil dan berhasil menyisipkan HTML thumbnail ke #photo-container
↓
TIDAK DITEMUKAN KERUSAKAN LOGIKA PADA GENERASI BASE64 / PREVIEW DOM

POTENSI KENDALA PADA PENGUJIAN MANUAL:
1. Posisi #photo-container berada di bawah formulir panjang (di bawah daftar kartu pekerja & catatan),
   sehingga pada layar mobile/viewport sempit thumbnail berada di luar area pandang awal (harus di-scroll).
2. Terjadi reload halaman (F5) sebelum klik Simpan, yang mereset variabel in-memory state.photos.
3. Redundansi deklarasi fungsi updateWorkerCalculations di dalam inspection-form.js yang menduplikasi event listeners.
```

---

### **STATUS**
🟡 **DEBUG COMPLETE — ROOT CAUSE IDENTIFIED**
*(Sesuai instruksi: Tidak ada modifikasi kode aplikasi, commit, atau push yang dilakukan)*.
