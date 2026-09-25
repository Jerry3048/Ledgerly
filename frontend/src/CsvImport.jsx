/* LabLedger — shared CSV import modal (equipment). */
import React, { useRef, useState } from 'react';
import { api } from './api';
import { Modal } from './components';
import { downloadCSV, parseCSV, toCSV } from './csv';

export default function CsvImportModal({
  title,
  endpoint,
  templateCols,
  templateFilename,
  sampleRow,
  onClose,
  onDone,
}) {
  const fileRef = useRef(null);
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [uploading, setUploading] = useState(false);

  const downloadTemplate = () => {
    downloadCSV(templateFilename, toCSV(sampleRow ? [sampleRow] : [], templateCols));
  };

  const pickFile = async (e) => {
    setError('');
    setResult(null);
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    try {
      const text = await f.text();
      const parsed = parseCSV(text);
      if (parsed.length === 0) {
        setError('No data rows found. The first row must be the header: ' + templateCols.join(', '));
        setRows([]);
        return;
      }
      if (parsed.length > 1000) {
        setError('Too many rows (max 1000 per import). Split the file and try again.');
        setRows([]);
        return;
      }
      setRows(parsed);
    } catch (err) {
      setError('Could not read that file. Make sure it is a .csv file.');
      setRows([]);
    }
  };

  const upload = async () => {
    setError('');
    setUploading(true);
    try {
      const res = await api(endpoint, { method: 'POST', body: { items: rows } });
      setResult(res);
      if (onDone) await onDone(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button className="btn secondary" onClick={onClose}>
            {result ? 'Close' : 'Cancel'}
          </button>
          {!result && (
            <button className="btn" disabled={rows.length === 0 || uploading} onClick={upload}>
              {uploading ? 'Uploading…' : `Upload ${rows.length} row${rows.length === 1 ? '' : 's'}`}
            </button>
          )}
        </>
      }
    >
      <p className="cell-sub" style={{ marginBottom: 12 }}>
        Upload a <strong>.csv</strong> file. First row must be the header:{' '}
        <span className="mono">{templateCols.join(', ')}</span>
      </p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <button type="button" className="btn secondary small" onClick={downloadTemplate}>
          Download CSV template
        </button>
        <button type="button" className="btn secondary small" onClick={() => fileRef.current?.click()}>
          Choose CSV file
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          style={{ display: 'none' }}
          onChange={pickFile}
        />
      </div>
      {fileName && (
        <p className="cell-sub">
          File: <strong>{fileName}</strong> — {rows.length} data row{rows.length === 1 ? '' : 's'} found.
        </p>
      )}
      {rows.length > 0 && !result && (
        <div className="ledger-wrap" style={{ marginTop: 10, maxHeight: 220, overflow: 'auto' }}>
          <table className="ledger">
            <thead>
              <tr>
                {templateCols.slice(0, 4).map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 5).map((r, i) => (
                <tr key={i}>
                  {templateCols.slice(0, 4).map((c) => (
                    <td key={c}>{r[c] ?? r[c.toLowerCase()] ?? r[c.toLowerCase().replace(/[\s-]+/g, '_')] ?? '—'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > 5 && <p className="cell-sub">…and {rows.length - 5} more rows.</p>}
        </div>
      )}
      {result && (
        <div style={{ marginTop: 10 }}>
          <p>
            Imported <strong>{result.imported}</strong>
            {result.failed > 0 && (
              <span> — <strong>{result.failed}</strong> failed</span>
            )}
            .
          </p>
          {result.errors?.length > 0 && (
            <div className="ledger-wrap" style={{ maxHeight: 180, overflow: 'auto' }}>
              <table className="ledger">
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Problem</th>
                  </tr>
                </thead>
                <tbody>
                  {result.errors.map((e, i) => (
                    <tr key={i}>
                      <td className="mono">{e.row}</td>
                      <td>{e.error}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {error && <p className="form-error">{error}</p>}
    </Modal>
  );
}
