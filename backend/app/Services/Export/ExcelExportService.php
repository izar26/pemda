<?php

declare(strict_types=1);

namespace App\Services\Export;

use OpenSpout\Common\Entity\Cell;
use OpenSpout\Common\Entity\Row;
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
            $options = new Options();
            $writer = new Writer($options);
            $writer->openToFile('php://output');

            $this->writeWorkbook($writer, $title, $headers, $rows, $metadata);

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
        $options = new Options();
        $writer = new Writer($options);
        $writer->openToFile($destinationPath);

        $rowCount = $this->writeWorkbook($writer, $title, $headers, $rows, $metadata);

        $writer->close();

        return $rowCount;
    }

    /**
     * Internal workbook structure and cell renderer.
     */
    private function writeWorkbook(
        Writer $writer,
        string $title,
        array $headers,
        iterable $rows,
        array $metadata
    ): int {
        // Styles Definition
        $titleStyle = (new Style())
            ->withFontBold(true)
            ->withFontSize(14)
            ->withFontColor(Color::rgb(30, 58, 138)); // Deep Navy Blue

        $subTitleStyle = (new Style())
            ->withFontSize(10)
            ->withFontItalic(true)
            ->withFontColor(Color::rgb(100, 116, 139)); // Slate Grey

        $metaKeyStyle = (new Style())
            ->withFontBold(true)
            ->withFontSize(10)
            ->withFontColor(Color::rgb(71, 85, 105));

        $metaValStyle = (new Style())
            ->withFontSize(10)
            ->withFontColor(Color::rgb(15, 23, 42));

        $headerStyle = (new Style())
            ->withFontBold(true)
            ->withFontSize(11)
            ->withFontColor(Color::WHITE)
            ->withBackgroundColor(Color::rgb(30, 58, 138)); // Primary Navy Fill

        $dataRowStyle = (new Style())
            ->withFontSize(10)
            ->withFontColor(Color::rgb(15, 23, 42));

        // 1. Write Header Title Banner
        $writer->addRow(Row::fromValuesWithStyle([mb_strtoupper($title)], $titleStyle));
        $writer->addRow(Row::fromValuesWithStyle(['PEMERINTAH DAERAH - SISTEM TATA KELOLA & MANAJEMEN RISIKO'], $subTitleStyle));
        $writer->addRow(Row::fromValues([])); // Spacer

        // 2. Write Metadata Section
        $writer->addRow(new Row([
            Cell::fromValue('Tanggal Ekspor:', $metaKeyStyle),
            Cell::fromValue(now()->translatedFormat('d F Y H:i:s T'), $metaValStyle),
        ]));

        foreach ($metadata as $key => $val) {
            $writer->addRow(new Row([
                Cell::fromValue($key . ':', $metaKeyStyle),
                Cell::fromValue((string) $val, $metaValStyle),
            ]));
        }

        $writer->addRow(Row::fromValues([])); // Spacer before table

        // 3. Write Table Header Row
        $headerCells = [];
        foreach ($headers as $headerText) {
            $headerCells[] = Cell::fromValue((string) $headerText, $headerStyle);
        }
        $writer->addRow(new Row($headerCells));

        // 4. Stream Data Rows (Efficient Memory Chunking & Formula Injection Prevention)
        $rowCount = 0;
        foreach ($rows as $rowData) {
            $cells = [];
            foreach ($rowData as $val) {
                if (is_int($val) || is_float($val)) {
                    $cells[] = Cell::fromValue($val, $dataRowStyle);
                } elseif (is_bool($val)) {
                    $cells[] = Cell::fromValue($val ? 'YA' : 'TIDAK', $dataRowStyle);
                } elseif (is_null($val)) {
                    $cells[] = Cell::fromValue('-', $dataRowStyle);
                } else {
                    $stringVal = (string) $val;
                    // Avoid formula injection for non-numeric strings
                    if (!is_numeric($stringVal)) {
                        // Neutralize spreadsheet formula injection characters (=, +, -, @, tab, newline)
                        if (preg_match('/^[=\+\-@\t\r]/', $stringVal)) {
                            $stringVal = "'" . $stringVal;
                        }
                    }
                    $cells[] = Cell::fromValue($stringVal, $dataRowStyle);
                }
            }
            $writer->addRow(new Row($cells));
            $rowCount++;
        }

        // 5. Footer Summary Row
        $writer->addRow(Row::fromValues([]));
        $writer->addRow(new Row([
            Cell::fromValue('Total Rekam Data:', $metaKeyStyle),
            Cell::fromValue($rowCount . ' Baris Data', $metaValStyle),
        ]));

        return $rowCount;
    }
}
