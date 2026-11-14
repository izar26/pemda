<?php

declare(strict_types=1);

namespace App\Services\Risiko;

use App\Models\Master\MasterJenisFraud;
use App\Models\Master\MasterKriteriaDampak;
use App\Models\Master\MasterPemilikRisiko;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\Risiko\FraudRiskAssessment;
use App\Models\Risiko\PengajuanPenilaianRisiko;
use App\Models\Risiko\StatusFraudRiskAssessmentOpd;
use App\Models\User;
use App\Policies\Risiko\AnalisisRisikoPolicy;
use App\Services\Risiko\Pengajuan\PengajuanReadinessService;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class FraudRiskAssessmentService
{
    public const PRESET_PROSES_BISNIS = [
        'Pengadaan Barang dan Jasa (PBJ)',
        'Transaksi Keuangan (Penerimaan / Pengeluaran)',
        'Pengelolaan Sumber Daya Manusia (Kepegawaian)',
        'Pengelolaan Aset dan Persediaan',
        'Pelayanan Publik / Perizinan',
    ];

    public const PENYEBAB_OPTIONS = [
        'Kesempatan (Opportunity)',
        'Rasionalisasi (Rationalization)',
        'Kemampuan (Capability)',
        'Tekanan (Pressure)',
    ];

    public const KRITERIA_KEMUNGKINAN_OPTIONS = [
        'Persentase (dlm 1 tahun)',
        'Jumlah Frekuensi (dlm 1 tahun)',
    ];

    public function __construct(
        protected AnalisisRisikoPolicy $policy,
        protected PengajuanReadinessService $readiness,
        protected SkalaRisikoService $skalaRisikoService
    ) {}

    public function list(string $opdId, string $periodeId, User $user, array $filters = []): array
    {
        abort_unless($this->policy->view($user, $opdId), 403);

        $query = FraudRiskAssessment::query()
            ->with(['jenisFraud'])
            ->where('opd_id', $opdId)
            ->where('periode_penilaian_id', $periodeId);

        if (! empty($filters['proses_bisnis'])) {
            $query->where('proses_bisnis', $filters['proses_bisnis']);
        }

        if (! empty($filters['jenis_fraud_id'])) {
            $query->where('jenis_fraud_id', $filters['jenis_fraud_id']);
        }

        if ($search = trim($filters['search'] ?? '')) {
            $pattern = '%'.mb_strtolower($search).'%';
            $query->where(function (Builder $q) use ($pattern) {
                $q->whereRaw('LOWER(proses_bisnis) LIKE ?', [$pattern])
                    ->orWhereRaw('LOWER(identifikasi_risiko_kecurangan) LIKE ?', [$pattern])
                    ->orWhereRaw('LOWER(skenario_kecurangan) LIKE ?', [$pattern])
                    ->orWhereRaw('LOWER(jenis_risiko_kecurangan) LIKE ?', [$pattern])
                    ->orWhereRaw('LOWER(pemilik_risiko) LIKE ?', [$pattern])
                    ->orWhereRaw('LOWER(penyebab) LIKE ?', [$pattern])
                    ->orWhereRaw('LOWER(existing_control) LIKE ?', [$pattern])
                    ->orWhereRaw('LOWER(mitigasi) LIKE ?', [$pattern]);
            });
        }

        $page = (int) ($filters['page'] ?? 1);
        $perPage = (int) ($filters['per_page'] ?? 20);

        /** @var LengthAwarePaginator $paginated */
        $paginated = $query->orderBy('nomor_urut', 'asc')
            ->orderBy('created_at', 'asc')
            ->paginate($perPage, ['*'], 'page', $page);

        $statusNihil = StatusFraudRiskAssessmentOpd::query()
            ->with('confirmer')
            ->where('opd_id', $opdId)
            ->where('periode_penilaian_id', $periodeId)
            ->first();

        return [
            'items' => $paginated->items(),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
                'last_page' => $paginated->lastPage(),
            ],
            'is_nihil' => (bool) ($statusNihil?->is_nihil ?? false),
            'nihil_info' => $statusNihil && $statusNihil->is_nihil ? [
                'confirmed_by' => $statusNihil->confirmer?->name,
                'confirmed_at' => $statusNihil->confirmed_at?->toIso8601String(),
                'catatan' => $statusNihil->catatan,
            ] : null,
            'is_complete' => $this->isComplete($opdId, $periodeId),
        ];
    }

    public function getReferenceOptions(User $user): array
    {
        $jenisFraud = MasterJenisFraud::where('is_active', true)
            ->orderBy('urutan')
            ->get(['id', 'nama', 'urutan']);

        $pemilikRisiko = MasterPemilikRisiko::where('is_active', true)
            ->orderBy('urutan')
            ->get(['id', 'nama', 'urutan']);

        $kriteriaDampak = MasterKriteriaDampak::where('is_active', true)
            ->orderBy('urutan')
            ->get(['id', 'nama', 'urutan']);

        return [
            'jenis_fraud' => $jenisFraud,
            'pemilik_risiko' => $pemilikRisiko,
            'penyebab' => self::PENYEBAB_OPTIONS,
            'kriteria_kemungkinan' => self::KRITERIA_KEMUNGKINAN_OPTIONS,
            'kriteria_dampak' => $kriteriaDampak->pluck('nama')->toArray(),
            'preset_proses_bisnis' => self::PRESET_PROSES_BISNIS,
        ];
    }

    public function store(array $data, User $user): FraudRiskAssessment
    {
        $opdId = (string) $data['opd_id'];
        $periodeId = (string) $data['periode_penilaian_id'];

        $this->assertUserCanEdit($user, $opdId);
        $this->readiness->assertOpdCanEdit($opdId, $periodeId, $user, 'fra');

        if (! PeriodePenilaian::whereKey($periodeId)->where('status', 'aktif')->exists()) {
            throw ValidationException::withMessages(['periode' => ['Periode penilaian tidak aktif.']]);
        }

        $kemungkinanSkor = (int) $data['kemungkinan_skor'];
        $dampakSkor = (int) $data['dampak_skor'];
        $skalaRisiko = $this->skalaRisikoService->hitung($kemungkinanSkor, $dampakSkor) ?? 0;

        $jenisRisikoKecurangan = $data['jenis_risiko_kecurangan'] ?? null;
        if (! empty($data['jenis_fraud_id'])) {
            $master = MasterJenisFraud::find($data['jenis_fraud_id']);
            if ($master) {
                $jenisRisikoKecurangan = $master->nama;
            }
        }

        if (empty($jenisRisikoKecurangan)) {
            $jenisRisikoKecurangan = 'Jenis Fraud Lainnya';
        }

        return DB::transaction(function () use ($opdId, $periodeId, $data, $kemungkinanSkor, $dampakSkor, $skalaRisiko, $jenisRisikoKecurangan, $user) {
            $submission = PengajuanPenilaianRisiko::where('opd_id', $opdId)
                ->where('periode_penilaian_id', $periodeId)
                ->lockForUpdate()
                ->first();

            $this->readiness->assertOpdCanEdit($opdId, $periodeId, $user, 'fra');

            if ($submission && ($submission->submitted_at !== null || $submission->status !== PengajuanPenilaianRisiko::STATUS_DRAFT) && ! $submission->items()->where('form_code', 'fra')->exists()) {
                throw ValidationException::withMessages(['form_fra' => ['Form FRA tidak termasuk dalam pengajuan ini.']]);
            }

            $maxUrut = (int) FraudRiskAssessment::where('opd_id', $opdId)
                ->where('periode_penilaian_id', $periodeId)
                ->max('nomor_urut');

            $item = FraudRiskAssessment::create([
                'opd_id' => $opdId,
                'periode_penilaian_id' => $periodeId,
                'nomor_urut' => $data['nomor_urut'] ?? ($maxUrut + 1),
                'proses_bisnis' => $data['proses_bisnis'],
                'identifikasi_risiko_kecurangan' => $data['identifikasi_risiko_kecurangan'],
                'skenario_kecurangan' => $data['skenario_kecurangan'],
                'jenis_fraud_id' => $data['jenis_fraud_id'] ?? null,
                'jenis_risiko_kecurangan' => $jenisRisikoKecurangan,
                'pemilik_risiko' => $data['pemilik_risiko'],
                'penyebab' => $data['penyebab'],
                'existing_control' => $data['existing_control'],
                'kemungkinan_kriteria' => $data['kemungkinan_kriteria'],
                'kemungkinan_skor' => $kemungkinanSkor,
                'dampak_kriteria' => $data['dampak_kriteria'],
                'dampak_skor' => $dampakSkor,
                'skala_risiko' => $skalaRisiko,
                'mitigasi' => $data['mitigasi'],
                'created_by' => $user->id,
                'updated_by' => $user->id,
            ]);

            // Reset status nihil when an item is added
            StatusFraudRiskAssessmentOpd::updateOrCreate(
                ['opd_id' => $opdId, 'periode_penilaian_id' => $periodeId],
                ['is_nihil' => false, 'confirmed_by' => null, 'confirmed_at' => null, 'catatan' => null]
            );

            return $item->fresh(['jenisFraud']);
        });
    }

    public function update(string $id, array $data, User $user): FraudRiskAssessment
    {
        $item = FraudRiskAssessment::findOrFail($id);
        $opdId = (string) $item->opd_id;
        $periodeId = (string) $item->periode_penilaian_id;

        $this->assertUserCanEdit($user, $opdId);
        $this->readiness->assertOpdCanEdit($opdId, $periodeId, $user, 'fra');

        return DB::transaction(function () use ($item, $opdId, $periodeId, $data, $user) {
            $submission = PengajuanPenilaianRisiko::where('opd_id', $opdId)
                ->where('periode_penilaian_id', $periodeId)
                ->lockForUpdate()
                ->first();

            $this->readiness->assertOpdCanEdit($opdId, $periodeId, $user, 'fra');

            if ($submission && ($submission->submitted_at !== null || $submission->status !== PengajuanPenilaianRisiko::STATUS_DRAFT) && ! $submission->items()->where('form_code', 'fra')->exists()) {
                throw ValidationException::withMessages(['form_fra' => ['Form FRA tidak termasuk dalam pengajuan ini.']]);
            }

            $updatePayload = [];

            foreach ([
                'nomor_urut',
                'proses_bisnis',
                'identifikasi_risiko_kecurangan',
                'skenario_kecurangan',
                'pemilik_risiko',
                'penyebab',
                'existing_control',
                'kemungkinan_kriteria',
                'dampak_kriteria',
                'mitigasi',
            ] as $field) {
                if (array_key_exists($field, $data)) {
                    $updatePayload[$field] = $data[$field];
                }
            }

            if (array_key_exists('jenis_fraud_id', $data)) {
                $updatePayload['jenis_fraud_id'] = $data['jenis_fraud_id'];
                if (! empty($data['jenis_fraud_id'])) {
                    $master = MasterJenisFraud::find($data['jenis_fraud_id']);
                    if ($master) {
                        $updatePayload['jenis_risiko_kecurangan'] = $master->nama;
                    }
                }
            }

            if (array_key_exists('jenis_risiko_kecurangan', $data) && empty($updatePayload['jenis_risiko_kecurangan'])) {
                $updatePayload['jenis_risiko_kecurangan'] = $data['jenis_risiko_kecurangan'];
            }

            $kemungkinan = array_key_exists('kemungkinan_skor', $data) ? (int) $data['kemungkinan_skor'] : $item->kemungkinan_skor;
            $dampak = array_key_exists('dampak_skor', $data) ? (int) $data['dampak_skor'] : $item->dampak_skor;

            if (array_key_exists('kemungkinan_skor', $data)) {
                $updatePayload['kemungkinan_skor'] = $kemungkinan;
            }
            if (array_key_exists('dampak_skor', $data)) {
                $updatePayload['dampak_skor'] = $dampak;
            }

            $updatePayload['skala_risiko'] = $this->skalaRisikoService->hitung($kemungkinan, $dampak) ?? 0;
            $updatePayload['updated_by'] = $user->id;

            $item->update($updatePayload);

            return $item->fresh(['jenisFraud']);
        });
    }

    public function destroy(string $id, User $user): void
    {
        $item = FraudRiskAssessment::findOrFail($id);
        $opdId = (string) $item->opd_id;
        $periodeId = (string) $item->periode_penilaian_id;

        $this->assertUserCanEdit($user, $opdId);
        $this->readiness->assertOpdCanEdit($opdId, $periodeId, $user, 'fra');

        DB::transaction(function () use ($item, $opdId, $periodeId, $user) {
            $submission = PengajuanPenilaianRisiko::where('opd_id', $opdId)
                ->where('periode_penilaian_id', $periodeId)
                ->lockForUpdate()
                ->first();

            $this->readiness->assertOpdCanEdit($opdId, $periodeId, $user, 'fra');

            if ($submission && ($submission->submitted_at !== null || $submission->status !== PengajuanPenilaianRisiko::STATUS_DRAFT) && ! $submission->items()->where('form_code', 'fra')->exists()) {
                throw ValidationException::withMessages(['form_fra' => ['Form FRA tidak termasuk dalam pengajuan ini.']]);
            }

            $item->delete();
        });
    }

    public function setNihil(string $opdId, string $periodeId, bool $isNihil, User $user, ?string $catatan = null): array
    {
        $this->assertUserCanEdit($user, $opdId);
        $this->readiness->assertOpdCanEdit($opdId, $periodeId, $user, 'fra');

        return DB::transaction(function () use ($opdId, $periodeId, $isNihil, $user, $catatan) {
            $submission = PengajuanPenilaianRisiko::where('opd_id', $opdId)
                ->where('periode_penilaian_id', $periodeId)
                ->lockForUpdate()
                ->first();

            $this->readiness->assertOpdCanEdit($opdId, $periodeId, $user, 'fra');

            if ($submission && ($submission->submitted_at !== null || $submission->status !== PengajuanPenilaianRisiko::STATUS_DRAFT) && ! $submission->items()->where('form_code', 'fra')->exists()) {
                throw ValidationException::withMessages(['form_fra' => ['Form FRA tidak termasuk dalam pengajuan ini.']]);
            }

            if ($isNihil) {
                $hasItems = FraudRiskAssessment::where('opd_id', $opdId)
                    ->where('periode_penilaian_id', $periodeId)
                    ->lockForUpdate()
                    ->exists();

                if ($hasItems) {
                    throw ValidationException::withMessages([
                        'nihil' => ['Tidak dapat mengonfirmasi Status Nihil jika masih terdapat catatan Penilaian Risiko Kecurangan (FRA). Hapus semua catatan terlebih dahulu.'],
                    ]);
                }
            }

            $status = StatusFraudRiskAssessmentOpd::updateOrCreate(
                ['opd_id' => $opdId, 'periode_penilaian_id' => $periodeId],
                [
                    'is_nihil' => $isNihil,
                    'confirmed_by' => $isNihil ? $user->id : null,
                    'confirmed_at' => $isNihil ? now() : null,
                    'catatan' => $isNihil ? $catatan : null,
                ]
            );

            return [
                'is_nihil' => $status->is_nihil,
                'nihil_info' => $status->is_nihil ? [
                    'confirmed_by' => $user->name,
                    'confirmed_at' => $status->confirmed_at?->toIso8601String(),
                    'catatan' => $status->catatan,
                ] : null,
                'is_complete' => $this->isComplete($opdId, $periodeId),
            ];
        });
    }

    public function isComplete(string $opdId, string $periodeId): bool
    {
        $statusNihil = StatusFraudRiskAssessmentOpd::where('opd_id', $opdId)
            ->where('periode_penilaian_id', $periodeId)
            ->where('is_nihil', true)
            ->exists();

        if ($statusNihil) {
            return true;
        }

        $count = FraudRiskAssessment::where('opd_id', $opdId)
            ->where('periode_penilaian_id', $periodeId)
            ->count();

        if ($count === 0) {
            return false;
        }

        $hasIncomplete = FraudRiskAssessment::where('opd_id', $opdId)
            ->where('periode_penilaian_id', $periodeId)
            ->where(function (Builder $q) {
                $q->whereNull('proses_bisnis')
                    ->orWhereRaw('TRIM(proses_bisnis) = \'\'')
                    ->orWhereNull('identifikasi_risiko_kecurangan')
                    ->orWhereRaw('TRIM(identifikasi_risiko_kecurangan) = \'\'')
                    ->orWhereNull('skenario_kecurangan')
                    ->orWhereRaw('TRIM(skenario_kecurangan) = \'\'')
                    ->orWhereNull('kemungkinan_skor')
                    ->orWhereNull('dampak_skor')
                    ->orWhereNull('mitigasi')
                    ->orWhereRaw('TRIM(mitigasi) = \'\'');
            })
            ->exists();

        return ! $hasIncomplete;
    }

    private function assertUserCanEdit(User $user, string $opdId): void
    {
        abort_unless($this->policy->view($user, $opdId), 403, 'Akses ditolak untuk data OPD ini.');

        if (! $user->hasRole(['Superadmin', 'Admin Office'])) {
            $canEdit = $user->hasAnyPermission([
                'identifikasi_risiko_opd.edit',
                'identifikasi_risiko_opd_operasional.edit',
                'identifikasi_risiko_pemda.edit',
            ]);
            abort_unless($canEdit, 403, 'Anda tidak memiliki hak akses untuk mengubah data Penilaian Risiko Kecurangan (FRA).');
        }
    }
}
