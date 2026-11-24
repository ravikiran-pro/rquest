import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Modal, Button, Upload, Table, List, Grid, message, Alert, Typography, Tag, Select, Tooltip, Segmented } from 'antd';
import {
  UploadOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { netWorkCall, apiConfig, resolveShopSchema } from '../../utils';
import { shopSubCategories } from '../../utils/shopSubCategories';
import { STOCK_MODES } from '../../utils/stock';
import { fetchResolvedForm, apiErrorText } from '../../utils/catalogue_api';
import {
  parseCSV,
  getCategoryCsvConfig,
  generateCategorySampleCsv,
  CSV_MAX_ROWS,
} from '../../utils/csv_helper';
import './listings.css';

const { Text, Paragraph } = Typography;

const normalise = (s) => String(s || '').trim().toLowerCase();

// Plain-word names for the CSV columns shown in the copy (the file itself keeps the column keys)
const COLUMN_LABELS = {
  sub_category: 'Sub-category',
  stock_mode: 'Stock mode',
  stock_qty: 'Stock count',
  low_stock_threshold: 'Low-stock alert',
};
const columnLabel = (h) => COLUMN_LABELS[h] || h;

/** Problems with one parsed CSV row, before it is sent: a list of messages. */
const rowIssues = (item, { fields, subLookup }) => {
  const issues = [];
  const price = Number(item.price);
  if (!(price > 0)) issues.push('Enter a price');
  if (item.mrp !== undefined && item.mrp !== null && Number(item.mrp) > 0 && price > Number(item.mrp)) {
    issues.push('Price is above MRP');
  }
  if (item.stock_mode && !STOCK_MODES.includes(item.stock_mode)) {
    issues.push('Stock mode must be tracked, toggle or always');
  }
  if (item.stock_mode === 'tracked') {
    const qty = Number(item.stock_qty);
    if (item.stock_qty === undefined || !Number.isInteger(qty) || qty < 0) issues.push('Enter how many are in stock (0 or more)');
  } else if (item.stock_qty !== undefined && !(Number.isInteger(Number(item.stock_qty)) && Number(item.stock_qty) >= 0)) {
    issues.push('Stock count must be a whole number');
  }
  if (item.sub_category && !subLookup.has(normalise(item.sub_category))) {
    issues.push(`"${item.sub_category}" is not one of your store's categories`);
  }
  // Required store fields of the chosen form (rows for another sub-category are checked by the server)
  if (!item.sub_category) {
    (fields || []).forEach((f) => {
      if (!f.required || f.type === 'boolean') return;
      const v = item.metadata?.[f.key];
      if (v === undefined || v === null || v === '') issues.push(`${f.label || f.key} is required`);
    });
  }
  return issues;
};

const ImportProductCsvModal = ({ open, onClose, shop, onSuccess }) => {
  const subs = useMemo(() => shopSubCategories(shop), [shop]);
  const [subId, setSubId] = useState(null);
  const [fields, setFields] = useState([]);
  const [formNote, setFormNote] = useState('');
  const [parsedItems, setParsedItems] = useState([]);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [previewFilter, setPreviewFilter] = useState('all');
  const screens = Grid.useBreakpoint();
  // Under 768px the preview is a card list instead of a wide table (spec F4)
  const isPhone = !screens.md;

  // Lookup by sub-category name or key, for the sub_category column
  const subLookup = useMemo(() => {
    const m = new Map();
    subs.forEach((s) => {
      m.set(normalise(s.name), s);
      if (s.key) m.set(normalise(s.key), s);
    });
    return m;
  }, [subs]);

  useEffect(() => {
    if (!open) return;
    setParsedItems([]);
    setFileName('');
    setResult(null);
    setPreviewFilter('all');
    setSubId(subs[0]?.id ?? shop?.sub_category_id ?? null);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // The form of the chosen sub-category: its keys become template columns
  useEffect(() => {
    if (!open || !shop?.id) return undefined;
    let cancelled = false;
    setFormNote('');
    fetchResolvedForm(shop.id, subId)
      .then((data) => {
        if (!cancelled) setFields(data.fields);
      })
      .catch(() => {
        if (cancelled) return;
        // Older servers: fall back to the form the shop record carries
        setFields(resolveShopSchema(shop));
        setFormNote('Using the standard form for your store.');
      });
    return () => {
      cancelled = true;
    };
  }, [open, shop, subId]);

  const csvConfig = useMemo(() => getCategoryCsvConfig(shop, shop?.shopCategory, fields), [shop, fields]);
  const selectedSub = subs.find((s) => Number(s.id) === Number(subId)) || null;

  const rows = useMemo(
    () => parsedItems.map((item, idx) => ({ ...item, key: idx, issues: rowIssues(item, { fields, subLookup }) })),
    [parsedItems, fields, subLookup]
  );
  const okRows = rows.filter((r) => r.issues.length === 0);
  const badRows = rows.filter((r) => r.issues.length > 0);
  const tooMany = okRows.length > CSV_MAX_ROWS;

  const handleDownloadSample = () => {
    const csvContent = generateCategorySampleCsv(shop, shop?.shopCategory, fields);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const store = (shop?.shop_name || 'store').replace(/[^a-zA-Z0-9_-]/g, '_');
    const sub = (selectedSub?.name || csvConfig.archetype).replace(/[^a-zA-Z0-9_-]/g, '_');
    link.setAttribute('download', `${store}_${sub}_template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const items = parseCSV(e.target.result, fields);
        if (items.length === 0) {
          message.error('No rows with a name were found. Check the column headers.');
          return;
        }
        setParsedItems(items);
        setFileName(file.name);
        setResult(null);
      } catch (err) {
        console.error('CSV parse error:', err);
        message.error('Could not read this file. Save it as comma-separated CSV and try again.');
      }
    };
    reader.readAsText(file);
    return false; // no automatic upload
  };

  const handleImportSubmit = async () => {
    if (!shop?.id || okRows.length === 0 || tooMany) return;
    setLoading(true);
    try {
      const fieldKeys = fields.map((f) => f.key);
      const items = okRows.map((item) => {
        const formValues = {};
        fieldKeys.forEach((k) => {
          if (item.metadata?.[k] !== undefined && item.metadata[k] !== '') formValues[k] = item.metadata[k];
        });
        return {
          name: item.name,
          price: Number(item.price),
          ...(item.mrp ? { mrp: Number(item.mrp) } : {}),
          unit: item.unit || csvConfig.defaultUnit || 'piece',
          ...(item.description ? { description: item.description } : {}),
          ...(item.img_url ? { img_url: item.img_url } : {}),
          ...(item.sub_category ? { sub_category: item.sub_category } : subId ? { sub_category_id: subId } : {}),
          ...(item.section ? { section: item.section } : {}),
          ...(item.stock_mode ? { stock_mode: item.stock_mode } : {}),
          ...(item.stock_qty !== undefined ? { stock_qty: Number(item.stock_qty) } : {}),
          ...(item.low_stock_threshold !== undefined ? { low_stock_threshold: Number(item.low_stock_threshold) } : {}),
          // Form keys go flat (spec §E2) and in metadata for servers that read it there
          ...formValues,
          metadata: formValues,
        };
      });

      const res = await netWorkCall(apiConfig.listings_bulk_create, 'POST', JSON.stringify({ shop_id: shop.id, items }), true);
      if (res?.success) {
        const sourceRows = okRows.map((r) => r.row);
        // The server numbers rows by their place in this request; show the file line when it can be mapped
        const fileRow = (r) => (Number.isInteger(r) && sourceRows[r - 1] ? sourceRows[r - 1] : r);
        setResult({
          count: Number(res.count) || (Array.isArray(res.data) ? res.data.length : 0),
          skipped: (Array.isArray(res.skipped) ? res.skipped : []).map((s) => ({ ...s, row: fileRow(s.row) })),
          warnings: (Array.isArray(res.warnings) ? res.warnings : []).map((w) => ({ ...w, row: fileRow(w.row) })),
          leftOut: badRows,
        });
        onSuccess?.();
      } else {
        message.error(apiErrorText(res, 'Could not import the file.'));
      }
    } catch (err) {
      console.error('Bulk import error:', err);
      message.error('Could not import the file. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { title: 'Row', dataIndex: 'row', width: 60 },
    {
      title: 'Item',
      dataIndex: 'name',
      render: (text, r) => (
        <div style={{ minWidth: 160 }}>
          <div style={{ fontWeight: 600 }}>{text}</div>
          <div className="ms-muted">
            ₹{r.price}
            {r.mrp ? ` · MRP ₹${r.mrp}` : ''}
            {r.unit ? ` / ${r.unit}` : ''}
          </div>
        </div>
      ),
    },
    {
      title: 'Stock',
      key: 'stock',
      width: 120,
      render: (_, r) =>
        r.stock_mode === 'tracked' ? `Count · ${r.stock_qty ?? '?'}` : r.stock_mode === 'always' ? 'Always' : r.stock_mode === 'toggle' ? 'On/Off' : 'Default',
    },
    { title: 'Section', dataIndex: 'section', width: 140, render: (v) => v || <span className="ms-muted">Auto</span> },
    ...(subs.length > 1
      ? [{ title: 'Category', dataIndex: 'sub_category', width: 130, render: (v) => v || selectedSub?.name || '-' }]
      : []),
    {
      title: 'Check',
      key: 'issues',
      width: 220,
      render: (_, r) =>
        r.issues.length === 0 ? (
          <Tag color="success" style={{ margin: 0 }}>
            Ready
          </Tag>
        ) : (
          <span style={{ color: 'var(--error-hover, #b3261e)', fontSize: 12 }}>{r.issues.join('. ')}</span>
        ),
    },
  ];

  const previewRows = previewFilter === 'bad' ? badRows : rows;

  const renderResult = () => (
    <div>
      <Alert
        type={result.count > 0 ? 'success' : 'warning'}
        showIcon
        message={`${result.count} added · ${result.skipped.length + result.leftOut.length} skipped${
          result.warnings.length ? ` · ${result.warnings.length} notes` : ''
        }`}
        style={{ marginBottom: 12 }}
      />
      {result.skipped.length + result.leftOut.length > 0 && (
        <>
          <Text strong>Skipped rows</Text>
          <Table
            size="small"
            pagination={result.skipped.length + result.leftOut.length > 10 ? { pageSize: 10 } : false}
            rowKey={(r, i) => `${r.row}-${i}`}
            scroll={{ x: 420 }}
            style={{ margin: '6px 0 14px' }}
            dataSource={[
              ...result.leftOut.map((r) => ({ row: r.row, name: r.name, problem: r.issues.join('. ') })),
              ...result.skipped.map((s) => ({
                row: s.row,
                name: s.name,
                problem: Array.isArray(s.errors) && s.errors.length ? s.errors.map((e) => e.message).join('. ') : s.reason || s.message || 'Not added',
              })),
            ]}
            columns={[
              { title: 'Row', dataIndex: 'row', width: 60 },
              { title: 'Name', dataIndex: 'name', width: 180, ellipsis: true, render: (v) => v || '-' },
              { title: 'Problem', dataIndex: 'problem' },
            ]}
          />
        </>
      )}
      {result.warnings.length > 0 && (
        <>
          <Text strong>Notes</Text>
          <ul className="ms-muted" style={{ paddingLeft: 18, margin: '6px 0 0' }}>
            {result.warnings.slice(0, 50).map((w, i) => (
              <li key={`${w.row}-${i}`}>
                Row {w.row}: {w.message}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );

  const footer = result
    ? [
        <Button
          key="again"
          onClick={() => {
            setResult(null);
            setParsedItems([]);
            setFileName('');
          }}
        >
          Import another file
        </Button>,
        <Button key="done" type="primary" className="ms-btn-primary" onClick={onClose}>
          Done
        </Button>,
      ]
    : [
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button
          key="import"
          type="primary"
          className="ms-btn-primary"
          icon={<CheckCircleOutlined />}
          loading={loading}
          disabled={okRows.length === 0 || tooMany}
          onClick={handleImportSubmit}
        >
          Import {okRows.length} {okRows.length === 1 ? 'row' : 'rows'}
        </Button>,
      ];

  return (
    <Modal
      title="Import products from CSV"
      open={open}
      onCancel={onClose}
      footer={footer}
      width="min(880px, calc(100vw - 24px))"
      style={{ maxWidth: 'calc(100vw - 24px)', top: 16 }}
      styles={{ body: { maxHeight: 'max(320px, calc(100vh - 170px))', overflowY: 'auto' } }}
      destroyOnClose
    >
      {result ? (
        renderResult()
      ) : (
        <>
          {subs.length > 1 && (
            <div style={{ marginBottom: 12 }}>
              <label className="ms-field-label" htmlFor="csv-sub-select" style={{ display: 'block', marginBottom: 4 }}>
                Template for
              </label>
              <Select
                id="csv-sub-select"
                value={subId}
                onChange={(v) => {
                  setSubId(v);
                  setParsedItems([]);
                }}
                options={subs.map((s) => ({ value: s.id, label: s.name }))}
                style={{ width: 260, maxWidth: '100%' }}
              />
              <div className="ms-muted" style={{ marginTop: 4 }}>
                Rows without a sub_category go to {selectedSub?.name || 'this category'}.
              </div>
            </div>
          )}

          <Paragraph style={{ marginBottom: 6 }}>
            Download the template, add one row per item (up to {CSV_MAX_ROWS}), then upload the file. Every item needs a
            name and price. To count stock, set Stock mode to tracked and fill in Stock count (a column named &quot;stock&quot; also works).
          </Paragraph>
          {formNote && <div className="ms-muted" style={{ marginBottom: 6 }}>{formNote}</div>}

          <div
            style={{
              background: 'var(--surface-container-low, #f7f3ee)',
              padding: '8px 12px',
              borderRadius: 8,
              fontFamily: 'monospace',
              fontSize: 12,
              overflowX: 'auto',
              whiteSpace: 'nowrap',
              border: '1px solid var(--border-color, #ebe7e0)',
              marginBottom: 8,
            }}
          >
            {csvConfig.headers.join(', ')}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
            {csvConfig.headers.map((h) => (
              <Tooltip key={h} title={csvConfig.headerDescriptions?.[h] || h}>
                <Tag style={{ margin: 0, cursor: 'help' }} color={h === 'name' || h === 'price' ? 'blue' : undefined}>
                  {columnLabel(h)}
                  {h === 'name' || h === 'price' ? ' *' : ''}
                </Tag>
              </Tooltip>
            ))}
            <Tooltip title="Hover a column name to see what it means">
              <InfoCircleOutlined className="ms-muted" aria-label="Column help" />
            </Tooltip>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
            <Upload accept=".csv,text/csv" beforeUpload={handleFileUpload} showUploadList={false}>
              <Button icon={<UploadOutlined />} size="large">
                {fileName ? 'Choose another file' : 'Choose CSV file'}
              </Button>
            </Upload>
            <Button icon={<DownloadOutlined />} size="large" onClick={handleDownloadSample}>
              Download template
            </Button>
          </div>

          {rows.length > 0 && (
            <>
              <Alert
                type={badRows.length ? 'warning' : 'info'}
                showIcon
                icon={badRows.length ? <WarningOutlined /> : undefined}
                style={{ marginBottom: 10 }}
                message={`${fileName}: ${okRows.length} ready · ${badRows.length} need fixing`}
                description={
                  tooMany
                    ? `Up to ${CSV_MAX_ROWS} rows can be imported at once. Split the file and upload each part.`
                    : badRows.length
                    ? 'Rows that need fixing are left out. Fix them in your file and upload it again to add them.'
                    : undefined
                }
              />
              {badRows.length > 0 && (
                <Segmented
                  size="small"
                  value={previewFilter}
                  onChange={setPreviewFilter}
                  options={[
                    { label: `All ${rows.length}`, value: 'all' },
                    { label: `Need fixing ${badRows.length}`, value: 'bad' },
                  ]}
                  style={{ marginBottom: 8 }}
                />
              )}
              {isPhone ? (
                <List
                  size="small"
                  dataSource={previewRows}
                  pagination={{ pageSize: 8, showSizeChanger: false }}
                  rowKey={(r) => r.row}
                  renderItem={(r) => (
                    <List.Item style={{ display: 'block', padding: '10px 0' }}>
                      <div className="ms-muted" style={{ fontSize: 12, marginBottom: 4 }}>
                        Row {r.row}
                      </div>
                      {columns.slice(1).map((c) => (
                        <div key={c.key || c.dataIndex} style={{ marginBottom: 4 }}>
                          <span className="ms-muted">{c.title}: </span>
                          {c.render ? c.render(r[c.dataIndex], r) : r[c.dataIndex]}
                        </div>
                      ))}
                    </List.Item>
                  )}
                />
              ) : (
                <Table
                  dataSource={previewRows}
                  columns={columns}
                  size="small"
                  pagination={{ pageSize: 8, showSizeChanger: false }}
                  scroll={{ x: 'max-content' }}
                />
              )}
            </>
          )}
        </>
      )}
    </Modal>
  );
};

ImportProductCsvModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  shop: PropTypes.object,
  onSuccess: PropTypes.func,
};

export default ImportProductCsvModal;
