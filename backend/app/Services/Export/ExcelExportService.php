<?php

declare(strict_types=1);

namespace App\Services\Export;

use OpenSpout\Common\Entity\Cell;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Common\Entity\Style\Border;
use OpenSpout\Common\Entity\Style\BorderName;
use OpenSpout\Common\Entity\Style\BorderPart;
use OpenSpout\Common\Entity\Style\BorderStyle;
use OpenSpout\Common\Entity\Style\BorderWidth;
use OpenSpout\Common\Entity\Style\CellAlignment;
use OpenSpout\Common\Entity\Style\CellVerticalAlignment;
use OpenSpout\Common\Entity\Style\Color;
use OpenSpout\Common\Entity\Style\Style;
use OpenSpout\Writer\XLSX\Options;
use OpenSpout\Writer\XLSX\Writer;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExcelExportService
{
    /**
     * Stream an Excel file (.xlsx) with professional formatting.
     *
     * @param string $filename Base filename without extension or timestamp
     * @param string $title Laporan Title (e.g. "LAPORAN DATA PEGAWAI - PEMDA")
     * @param array<int, string> $headers Array of column header names
     * @param iterable<array<int, mixed>> $rows Generator or array yielding rows of data
     * @param array<string, string> $metadata Optional key-value metadata to display in header section
     * @return StreamedResponse
     */
    public function streamExport(
        string $filename,
        string $title,
        array $headers,
        iterable $rows,
        array $metadata = []
    ): StreamedResponse {
        $cleanFilename = preg_replace('/[^a-zA-Z0-9_\-]/', '_', $filename);
        $fullFilename = sprintf('%s_%s.xlsx', $cleanFilename, date('Ymd_His'));

        return new StreamedResponse(function () use ($title, $headers, $rows, $metadata) {
            [$options, $preparedRows] = $this->prepareOptionsAndRows($headers, $rows, $metadata);

            $writer = new Writer($options);
            $writer->openToFile('php://output');

            $this->writeWorkbook($writer, $options, $title, $headers, $preparedRows, $metadata);

            $writer->close();
        }, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => sprintf('attachment; filename="%s"; filename*=UTF-8\'\'%s', $fullFilename, rawurlencode($fullFilename)),
            'Cache-Control' => 'max-age=0, no-cache, must-revalidate, proxy-revalidate',
            'Pragma' => 'public',
        ]);
    }

    /**
     * Export Excel directly to a file on disk (for background async jobs).
     *
     * @param string $destinationPath Absolute file path to write to
     * @param string $title Title header
     * @param array<int, string> $headers Column headers
     * @param iterable<array<int, mixed>> $rows Generator or rows
     * @param array<string, string> $metadata Metadata key-values
     * @return int Total rows written
     */
    public function exportToFile(
        string $destinationPath,
        string $title,
        array $headers,
        iterable $rows,
        array $metadata = []
    ): int {
        [$options, $preparedRows] = $this->prepareOptionsAndRows($headers, $rows, $metadata);

        $writer = new Writer($options);
        $writer->openToFile($destinationPath);

        $rowCount = $this->writeWorkbook($writer, $options, $title, $headers, $preparedRows, $metadata);

        $writer->close();

        return $rowCount;
    }

    /**
     * Inspects header and sample rows to build optimized column widths and layout options.
     *
     * @param array<int, string> $headers
     * @param iterable<array<int, mixed>> $rows
     * @param array<string, string> $metadata
     * @return array{0: Options, 1: iterable<array<int, mixed>>}
     */
    private function prepareOptionsAndRows(array $headers, iterable $rows, array $metadata): array
    {
        if (is_array($rows)) {
            $sampleRows = array_slice($rows, 0, 60);
            $continuousRows = function () use ($rows) {
                foreach ($rows as $row) {
                    yield $row;
                }
            };
        } else {
            $iterator = $rows instanceof \IteratorAggregate ? $rows->getIterator() : $rows;
            if (!($iterator instanceof \Iterator)) {
                $iterator = new \IteratorIterator($iterator);
                $iterator->rewind();
            }

            $sampleRows = [];
            $sampleCount = 0;
            while ($iterator->valid() && $sampleCount < 60) {
                $sampleRows[] = $iterator->current();
                $sampleCount++;
                $iterator->next();
            }

            $continuousRows = function () use ($sampleRows, $iterator) {
                foreach ($sampleRows as $sRow) {
                    yield $sRow;
                }
                while ($iterator->valid()) {
                    yield $iterator->current();
                    $iterator->next();
                }
            };
        }

        $options = new Options();
        $numCols = max(1, count($headers));

        // 1. Calculate smart, proportional column widths
        foreach ($headers as $colIdx => $header) {
            $colOneBased = $colIdx + 1;
            $headerText = (string) $header;
            $maxLen = mb_strlen($headerText);

            foreach ($sampleRows as $sampleRow) {
                if (isset($sampleRow[$colIdx])) {
                    $valStr = (string) ($sampleRow[$colIdx] ?? '');
                    // Handle multi-line strings
                    $lines = explode("\n", $valStr);
                    foreach ($lines as $line) {
                        $maxLen = max($maxLen, mb_strlen(trim($line)));
                    }
                }
            }

            $hLower = strtolower($headerText);
            if ($hLower === 'no' || $hLower === '#') {
                $width = 7.0;
            } elseif (str_contains($hLower, 'kode') || str_contains($hLower, 'nip')) {
                $width = max(18.0, min(28.0, $maxLen + 4));
            } elseif (str_contains($hLower, 'tanggal') || str_contains($hLower, 'waktu')) {
                $width = max(20.0, min(26.0, $maxLen + 4));
            } elseif (str_contains($hLower, 'status') || str_contains($hLower, '2fa') || str_contains($hLower, 'keaktifan')) {
                $width = max(16.0, min(22.0, $maxLen + 4));
            } elseif (str_contains($hLower, 'email')) {
                $width = max(28.0, min(38.0, $maxLen + 4));
            } elseif (str_contains($hLower, 'nama') || str_contains($hLower, 'opd') || str_contains($hLower, 'instansi')) {
                $width = max(32.0, min(48.0, $maxLen + 4));
            } elseif (str_contains($hLower, 'jabatan') || str_contains($hLower, 'pangkat') || str_contains($hLower, 'kategori') || str_contains($hLower, 'kepala')) {
                $width = max(24.0, min(36.0, $maxLen + 4));
            } elseif (str_contains($hLower, 'deskripsi') || str_contains($hLower, 'izin') || str_contains($hLower, 'keterangan') || str_contains($hLower, 'detail') || str_contains($hLower, 'user agent')) {
                $width = max(40.0, min(58.0, $maxLen + 4));
            } else {
                $width = max(15.0, min(42.0, $maxLen + 4));
            }

            $options->setColumnWidth((float) $width, $colOneBased);
        }

        // 2. Pre-merge Banner and Metadata Rows
        if ($numCols > 1) {
            $options->mergeCells(0, 1, $numCols - 1, 1); // Row 1 Title
            $options->mergeCells(0, 2, $numCols - 1, 2); // Row 2 Subtitle

            // Row 4: Tanggal Ekspor
            $options->mergeCells(1, 4, $numCols - 1, 4);

            // Row 5+: Dynamic Metadata
            $currRow = 5;
            foreach ($metadata as $ignored) {
                $options->mergeCells(1, $currRow, $numCols - 1, $currRow);
                $currRow++;
            }
        }

        return [$options, $continuousRows()];
    }

    /**
     * Internal workbook structure and cell renderer.
     *
     * @param Writer $writer
     * @param Options $options
     * @param string $title
     * @param array<int, string> $headers
     * @param iterable<array<int, mixed>> $rows
     * @param array<string, string> $metadata
     * @return int
     */
    private function writeWorkbook(
        Writer $writer,
        Options $options,
        string $title,
        array $headers,
        iterable $rows,
        array $metadata
    ): int {
        $numCols = max(1, count($headers));

        // Borders Definition
        $thinBorder = new Border(
            new BorderPart(BorderName::LEFT, 'CBD5E1', BorderWidth::THIN, BorderStyle::SOLID),
            new BorderPart(BorderName::RIGHT, 'CBD5E1', BorderWidth::THIN, BorderStyle::SOLID),
            new BorderPart(BorderName::TOP, 'CBD5E1', BorderWidth::THIN, BorderStyle::SOLID),
            new BorderPart(BorderName::BOTTOM, 'CBD5E1', BorderWidth::THIN, BorderStyle::SOLID)
        );

        $headerBorder = new Border(
            new BorderPart(BorderName::LEFT, '1E3A8A', BorderWidth::THIN, BorderStyle::SOLID),
            new BorderPart(BorderName::RIGHT, '1E3A8A', BorderWidth::THIN, BorderStyle::SOLID),
            new BorderPart(BorderName::TOP, '1E3A8A', BorderWidth::THIN, BorderStyle::SOLID),
            new BorderPart(BorderName::BOTTOM, '1E3A8A', BorderWidth::THIN, BorderStyle::SOLID)
        );

        // Header and Banner Styles Definition
        $titleStyle = (new Style())
            ->withFontBold(true)
            ->withFontSize(14)
            ->withFontColor(Color::rgb(30, 58, 138)) // Deep Navy Blue
            ->withCellVerticalAlignment(CellVerticalAlignment::CENTER);

        $subTitleStyle = (new Style())
            ->withFontSize(9)
            ->withFontItalic(true)
            ->withFontColor(Color::rgb(100, 116, 139)) // Slate Grey
            ->withCellVerticalAlignment(CellVerticalAlignment::CENTER);

        $metaKeyStyle = (new Style())
            ->withFontBold(true)
            ->withFontSize(9)
            ->withFontColor(Color::rgb(71, 85, 105))
            ->withCellAlignment(CellAlignment::LEFT)
            ->withCellVerticalAlignment(CellVerticalAlignment::CENTER);

        $metaValStyle = (new Style())
            ->withFontSize(9)
            ->withFontColor(Color::rgb(15, 23, 42))
            ->withCellAlignment(CellAlignment::LEFT)
            ->withCellVerticalAlignment(CellVerticalAlignment::CENTER);

        $headerStyle = (new Style())
            ->withFontBold(true)
            ->withFontSize(10)
            ->withFontColor(Color::WHITE)
            ->withBackgroundColor(Color::rgb(30, 58, 138)) // Primary Navy Fill
            ->withCellAlignment(CellAlignment::CENTER)
            ->withCellVerticalAlignment(CellVerticalAlignment::CENTER)
            ->withBorder($headerBorder);

        // Data Cell Styles (White Base and Subtle Zebra Tint)
        $cellText = (new Style())
            ->withFontSize(10)
            ->withFontColor(Color::rgb(15, 23, 42))
            ->withCellAlignment(CellAlignment::LEFT)
            ->withCellVerticalAlignment(CellVerticalAlignment::CENTER)
            ->withBorder($thinBorder);

        $cellTextZebra = $cellText->withBackgroundColor(Color::rgb(248, 250, 252));

        $cellCenter = (new Style())
            ->withFontSize(10)
            ->withFontColor(Color::rgb(15, 23, 42))
            ->withCellAlignment(CellAlignment::CENTER)
            ->withCellVerticalAlignment(CellVerticalAlignment::CENTER)
            ->withBorder($thinBorder);

        $cellCenterZebra = $cellCenter->withBackgroundColor(Color::rgb(248, 250, 252));

        $cellRight = (new Style())
            ->withFontSize(10)
            ->withFontColor(Color::rgb(15, 23, 42))
            ->withCellAlignment(CellAlignment::RIGHT)
            ->withCellVerticalAlignment(CellVerticalAlignment::CENTER)
            ->withBorder($thinBorder);

        $cellRightZebra = $cellRight->withBackgroundColor(Color::rgb(248, 250, 252));

        $cellWrap = (new Style())
            ->withFontSize(10)
            ->withFontColor(Color::rgb(15, 23, 42))
            ->withCellAlignment(CellAlignment::LEFT)
            ->withCellVerticalAlignment(CellVerticalAlignment::CENTER)
            ->withShouldWrapText(true)
            ->withBorder($thinBorder);

        $cellWrapZebra = $cellWrap->withBackgroundColor(Color::rgb(248, 250, 252));

        // 1. Write Header Title Banner
        $writer->addRow(new Row([Cell::fromValue(mb_strtoupper($title), $titleStyle)], 28.0));
        $writer->addRow(new Row([Cell::fromValue('PEMERINTAH DAERAH - SISTEM TATA KELOLA & MANAJEMEN RISIKO', $subTitleStyle)], 18.0));
        $writer->addRow(Row::fromValues([])); // Row 3: Spacer

        // 2. Write Metadata Section
        $writer->addRow(new Row([
            Cell::fromValue('Tanggal Ekspor:', $metaKeyStyle),
            Cell::fromValue(now()->translatedFormat('d F Y H:i:s T'), $metaValStyle),
        ], 18.0));

        foreach ($metadata as $key => $val) {
            $writer->addRow(new Row([
                Cell::fromValue($key . ':', $metaKeyStyle),
                Cell::fromValue((string) $val, $metaValStyle),
            ], 18.0));
        }

        $writer->addRow(Row::fromValues([])); // Spacer before table

        // 3. Write Table Header Row
        $headerCells = [];
        foreach ($headers as $headerText) {
            $headerCells[] = Cell::fromValue((string) $headerText, $headerStyle);
        }
        $writer->addRow(new Row($headerCells, 26.0));

        // 4. Stream Data Rows (Efficient Memory Chunking, Auto Alignment & Formula Injection Prevention)
        $rowCount = 0;
        foreach ($rows as $rowData) {
            $isZebra = ($rowCount % 2 === 1);
            $cells = [];

            $colIdx = 0;
            foreach ($rowData as $val) {
                $headerText = $headers[$colIdx] ?? '';

                $resolvedStyle = $this->resolveCellStyle(
                    val: $val,
                    colIdx: $colIdx,
                    headerText: $headerText,
                    isZebra: $isZebra,
                    cellText: $cellText,
                    cellTextZebra: $cellTextZebra,
                    cellCenter: $cellCenter,
                    cellCenterZebra: $cellCenterZebra,
                    cellRight: $cellRight,
                    cellRightZebra: $cellRightZebra,
                    cellWrap: $cellWrap,
                    cellWrapZebra: $cellWrapZebra
                );

                if (is_int($val) || is_float($val)) {
                    $cells[] = Cell::fromValue($val, $resolvedStyle);
                } elseif (is_bool($val)) {
                    $cells[] = Cell::fromValue($val ? 'YA' : 'TIDAK', $resolvedStyle);
                } elseif (is_null($val)) {
                    $cells[] = Cell::fromValue('-', $resolvedStyle);
                } else {
                    $stringVal = (string) $val;
                    // Neutralize spreadsheet formula injection characters (=, +, -, @, tab, newline)
                    if (!is_numeric($stringVal) && preg_match('/^[=\+\-@\t\r]/', $stringVal)) {
                        $stringVal = "'" . $stringVal;
                    }
                    $cells[] = Cell::fromValue($stringVal, $resolvedStyle);
                }

                $colIdx++;
            }

            $writer->addRow(new Row($cells, 22.0));
            $rowCount++;
        }

        // 5. Footer Summary Row
        $writer->addRow(Row::fromValues([]));

        $footerMetaStyle = (new Style())
            ->withFontBold(true)
            ->withFontSize(9)
            ->withFontColor(Color::rgb(30, 58, 138))
            ->withCellAlignment(CellAlignment::LEFT)
            ->withCellVerticalAlignment(CellVerticalAlignment::CENTER);

        $summaryRowIndex = 4 + count($metadata) + 2 + $rowCount + 2;
        if ($numCols > 1) {
            $options->mergeCells(1, $summaryRowIndex, $numCols - 1, $summaryRowIndex);
        }

        $writer->addRow(new Row([
            Cell::fromValue('Total Rekam Data:', $metaKeyStyle),
            Cell::fromValue(number_format($rowCount, 0, ',', '.') . ' Baris Data', $footerMetaStyle),
        ], 22.0));

        return $rowCount;
    }

    /**
     * Resolves appropriate cell style based on column heuristics and data type.
     */
    private function resolveCellStyle(
        mixed $val,
        int $colIdx,
        string $headerText,
        bool $isZebra,
        Style $cellText,
        Style $cellTextZebra,
        Style $cellCenter,
        Style $cellCenterZebra,
        Style $cellRight,
        Style $cellRightZebra,
        Style $cellWrap,
        Style $cellWrapZebra
    ): Style {
        $hLower = strtolower($headerText);

        // 1. Column No / #
        if ($colIdx === 0 && ($hLower === 'no' || $hLower === '#')) {
            return $isZebra ? $cellCenterZebra : $cellCenter;
        }

        // 2. Boolean or null
        if (is_bool($val) || is_null($val)) {
            return $isZebra ? $cellCenterZebra : $cellCenter;
        }

        // 3. Integer or float
        if (is_int($val) || is_float($val)) {
            if (
                str_contains($hLower, 'urutan') ||
                str_contains($hLower, 'jumlah') ||
                str_contains($hLower, 'total') ||
                str_contains($hLower, 'count') ||
                str_contains($hLower, 'pegawai')
            ) {
                return $isZebra ? $cellRightZebra : $cellRight;
            }
            return $isZebra ? $cellCenterZebra : $cellCenter;
        }

        $stringVal = (string) $val;

        // 4. Dates & Timestamps (e.g., "12/10/2026", "2026-10-12", "12/10/2026 08:48")
        if (preg_match('/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}(\s+\d{1,2}:\d{2}(:\d{2})?)?$/', $stringVal)) {
            return $isZebra ? $cellCenterZebra : $cellCenter;
        }

        // 5. Short Codes, NIP, Status, IP addresses
        if (
            str_contains($hLower, 'kode') ||
            str_contains($hLower, 'nip') ||
            str_contains($hLower, 'status') ||
            str_contains($hLower, '2fa') ||
            str_contains($hLower, 'ip')
        ) {
            return $isZebra ? $cellCenterZebra : $cellCenter;
        }

        if (in_array(strtolower($stringVal), ['aktif', 'nonaktif', 'ya', 'tidak', 'arsip', 'sistem bawaan', 'kustom opd'], true)) {
            return $isZebra ? $cellCenterZebra : $cellCenter;
        }

        // 6. Long descriptions, permissions, user agent
        if (
            mb_strlen($stringVal) > 40 ||
            str_contains($hLower, 'deskripsi') ||
            str_contains($hLower, 'izin') ||
            str_contains($hLower, 'keterangan') ||
            str_contains($hLower, 'detail') ||
            str_contains($hLower, 'user agent')
        ) {
            return $isZebra ? $cellWrapZebra : $cellWrap;
        }

        return $isZebra ? $cellTextZebra : $cellText;
    }
}
