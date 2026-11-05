# Backend Guidelines (Laravel)

Pedoman umum dan protokol anti-slop proyek ini dikelola terpusat di file utama:
👉 [**Root AGENTS.md**](../AGENTS.md)

Pastikan selalu mematuhi:
1. **Strict Planning**: Buat rencana ringkas sebelum membuat/mengubah kode.
2. **Layered Architecture**: Controller tipis -> FormRequest untuk validasi -> Service untuk logika bisnis -> JsonResource/Policy.
3. **Format & Test**: Selalu jalankan `php vendor/bin/pint` dan `php artisan test` pada fitur terkait sebelum menyatakan selesai.
4. **No Fluff**: Tanpa komentar basa-basi dan tanpa placeholder `// TODO`.
