import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Modal,
  Button,
  Upload,
  Table,
  message,
  Alert,
  Typography,
  Flex,
  Tag,
  Select,
  Tooltip,
  Divider,
} from 'antd';
import {
  UploadOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { netWorkCall, apiConfig } from '../../utils';
import {
  parseCSV,
  getCategoryCsvConfig,
  generateCategorySampleCsv,
  CATEGORY_PRESETS,
  getShopArchetype,
} from '../../utils/csv_helper';

const { Text, Paragraph } = Typography;
const { Option } = Select;

const ImportProductCsvModal = ({ open, onClose, shop, onSuccess }) => {
  const [parsedItems, setParsedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [categoriesList, setCategoriesList] = useState([]);
  const [selectedArchetypeOverride, setSelectedArchetypeOverride] = useState(null);

  // Fetch full category records (with form_schema) on open
  useEffect(() => {
    if (open) {
      netWorkCall(apiConfig.my_categories, 'GET', null, false)
        .then((res) => {
          if (res?.data && Array.isArray(res.data)) {
            setCategoriesList(res.data);
          }
        })
        .catch(() => {});
    }
  }, [open]);

  // Determine active category record
  const activeCategory = useMemo(() => {
    if (shop?.shopCategory?.id || shop?.category_id) {
      const match = categoriesList.find(
        (c) => c.id === (shop?.shopCategory?.id || shop?.category_id)
      );
      if (match) return match;
    }
    return shop?.shopCategory || null;
  }, [shop, categoriesList]);

  // Auto-derived shop archetype
  const autoArchetype = useMemo(() => {
    return getShopArchetype(shop, activeCategory);
  }, [shop, activeCategory]);

  // Active archetype (allow manual template switch if shop has multiple categories or special vertical)
  const currentArchetype = selectedArchetypeOverride || autoArchetype;

  // Active CSV configuration for current category
  const csvConfig = useMemo(() => {
    // If user explicitly overrode archetype, use preset directly
    if (selectedArchetypeOverride && CATEGORY_PRESETS[selectedArchetypeOverride]) {
      return {
        ...CATEGORY_PRESETS[selectedArchetypeOverride],
        categoryName: CATEGORY_PRESETS[selectedArchetypeOverride].label,
      };
    }
    return getCategoryCsvConfig(shop, activeCategory);
  }, [shop, activeCategory, selectedArchetypeOverride]);

  // Reset state on open/close
  useEffect(() => {
    if (open) {
      setParsedItems([]);
      setSelectedArchetypeOverride(null);
    }
  }, [open]);

  const handleDownloadSample = () => {
    const csvContent = generateCategorySampleCsv(shop, activeCategory);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const sanitizedStore = (shop?.shop_name || 'store').replace(/[^a-zA-Z0-9_-]/g, '_');
    link.setAttribute('download', `${sanitizedStore}_${csvConfig.archetype}_products_template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success(`Downloaded ${csvConfig.label} sample template!`);
  };

  const handleFileUpload = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const items = parseCSV(text);
        if (items.length === 0) {
          message.error('No valid product rows found in CSV. Please verify column headers and data.');
          return;
        }
        setParsedItems(items);
        message.success(`Parsed ${items.length} items from CSV according to ${csvConfig.label} schema.`);
      } catch (err) {
        console.error('CSV parse error:', err);
        message.error('Failed to parse CSV file. Please ensure it is standard comma-separated text.');
      }
    };
    reader.readAsText(file);
    return false; // prevent automatic HTTP upload
  };

  const handleImportSubmit = async () => {
    if (!shop?.id || parsedItems.length === 0) return;
    setLoading(true);
    try {
      const payload = {
        shop_id: shop.id,
        items: parsedItems.map((item) => ({
          name: item.name,
          price: parseFloat(item.price) || 0,
          mrp: item.mrp ? parseFloat(item.mrp) : undefined,
          unit: item.unit || csvConfig.defaultUnit || 'piece',
          section: item.section || item.metadata?.section || '',
          description: item.description || '',
          listing_type: csvConfig.listingType || 'product',
          metadata: {
            ...(item.metadata || {}),
            section: item.section || item.metadata?.section || '',
            category_id: activeCategory?.id || shop?.category_id || null,
            category_name: activeCategory?.name || csvConfig.label,
          },
        })),
      };

      const res = await netWorkCall(apiConfig.listings_bulk_create, 'POST', JSON.stringify(payload));
      if (res?.success) {
        message.success(res.message || `Successfully imported ${parsedItems.length} items to catalog!`);
        setParsedItems([]);
        onSuccess?.();
        onClose?.();
      } else {
        message.error(res?.error || res?.message || 'Failed to import products.');
      }
    } catch (err) {
      console.error('Bulk import error:', err);
      message.error('An error occurred during bulk product import.');
    } finally {
      setLoading(false);
    }
  };

  // Build dynamic table columns tailored to this category
  const dynamicColumns = useMemo(() => {
    const baseCols = [
      {
        title: 'Product / Item Name',
        dataIndex: 'name',
        key: 'name',
        render: (text) => <Text strong style={{ color: '#0f172a' }}>{text}</Text>,
      },
      {
        title: 'Price (₹)',
        dataIndex: 'price',
        key: 'price',
        width: 110,
        render: (val, record) => (
          <div>
            <span style={{ fontWeight: 700, color: '#4f46e5' }}>₹{val}</span>
            {record.unit && <span style={{ color: '#64748b', fontSize: 11 }}> / {record.unit}</span>}
          </div>
        ),
      },
      {
        title: 'MRP (₹)',
        dataIndex: 'mrp',
        key: 'mrp',
        width: 90,
        render: (val) => (val ? <span style={{ textDecoration: 'line-through', color: '#94a3b8' }}>₹{val}</span> : '-'),
      },
      {
        title: 'Section / Shelf',
        dataIndex: 'section',
        key: 'section',
        render: (val) => (val ? <Tag color="default">{val}</Tag> : <Text type="secondary">-</Text>),
      },
    ];

    // Category-specific preview columns
    if (csvConfig.archetype === 'medical') {
      baseCols.push(
        {
          title: 'Dosage Form',
          key: 'dosage_form',
          render: (_, r) => r.metadata?.dosage_form || r.dosage_form || '-',
        },
        {
          title: 'Rx Required',
          key: 'prescription_required',
          render: (_, r) => {
            const rx = r.metadata?.prescription_required !== undefined
              ? r.metadata.prescription_required
              : r.prescription_required;
            return rx === true || rx === 'true' ? (
              <Tag color="error" style={{ fontWeight: 700 }}>Rx Required</Tag>
            ) : (
              <Tag color="success">OTC</Tag>
            );
          },
        },
        {
          title: 'Expiry',
          key: 'expiry_date',
          render: (_, r) => r.metadata?.expiry_date || r.expiry_date || '-',
        },
        {
          title: 'Composition',
          key: 'composition',
          ellipsis: true,
          render: (_, r) => r.metadata?.composition || r.composition || '-',
        }
      );
    } else if (csvConfig.archetype === 'food') {
      baseCols.push(
        {
          title: 'Dietary',
          key: 'food_type',
          render: (_, r) => {
            const ft = (r.metadata?.food_type || r.food_type || '').toLowerCase();
            return ft === 'veg' ? (
              <Tag color="green" style={{ fontWeight: 700 }}>🟢 Pure Veg</Tag>
            ) : (
              <Tag color="red" style={{ fontWeight: 700 }}>🔴 Non-Veg</Tag>
            );
          },
        },
        {
          title: 'Spice',
          key: 'spice_level',
          render: (_, r) => r.metadata?.spice_level || r.spice_level || 'Medium',
        },
        {
          title: 'Prep Time',
          key: 'prep_time_mins',
          render: (_, r) => {
            const pt = r.metadata?.prep_time_mins || r.prep_time_mins;
            return pt ? `${pt} mins` : '-';
          },
        }
      );
    } else if (csvConfig.archetype === 'service') {
      baseCols.push(
        {
          title: 'Mode',
          key: 'service_mode',
          render: (_, r) => {
            const sm = r.metadata?.service_mode || r.service_mode;
            return sm === 'doorstep' ? (
              <Tag color="blue">Doorstep</Tag>
            ) : sm === 'at_center' ? (
              <Tag color="cyan">At Center</Tag>
            ) : (
              <Tag color="purple">Both</Tag>
            );
          },
        },
        {
          title: 'Duration',
          key: 'duration_mins',
          render: (_, r) => {
            const d = r.metadata?.duration_mins || r.duration_mins;
            return d ? `${d} mins` : '-';
          },
        }
      );
    } else if (csvConfig.archetype === 'rental') {
      baseCols.push(
        {
          title: 'Deposit (₹)',
          key: 'security_deposit',
          render: (_, r) => {
            const dep = r.metadata?.security_deposit || r.security_deposit;
            return dep ? `₹${dep}` : '-';
          },
        },
        {
          title: 'Min Rental',
          key: 'min_rental_days',
          render: (_, r) => {
            const days = r.metadata?.min_rental_days || r.min_rental_days;
            return days ? `${days} day(s)` : '1 day';
          },
        }
      );
    } else {
      // Retail / Grocery custom attributes
      baseCols.push({
        title: 'Specifications',
        key: 'extra_specs',
        render: (_, r) => {
          const metaEntries = Object.entries(r.metadata || {}).filter(
            ([k]) => k !== 'section' && k !== 'category_id' && k !== 'category_name'
          );
          if (metaEntries.length === 0) return <Text type="secondary">-</Text>;
          return (
            <Flex wrap="wrap" gap={4}>
              {metaEntries.slice(0, 3).map(([k, v]) => (
                <Tag key={k} style={{ fontSize: 11, margin: 0 }}>
                  <strong>{k}:</strong> {String(v)}
                </Tag>
              ))}
              {metaEntries.length > 3 && (
                <Text type="secondary" style={{ fontSize: 11 }}>+{metaEntries.length - 3} more</Text>
              )}
            </Flex>
          );
        },
      });
    }

    return baseCols;
  }, [csvConfig]);

  return (
    <Modal
      title={
        <Flex align="center" gap={8}>
          <AppstoreOutlined style={{ color: '#4f46e5', fontSize: 18 }} />
          <span>Bulk Import Catalog via CSV</span>
        </Flex>
      }
      open={open}
      onCancel={() => {
        setParsedItems([]);
        onClose?.();
      }}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button
          key="import"
          type="primary"
          icon={<CheckCircleOutlined />}
          loading={loading}
          disabled={parsedItems.length === 0}
          onClick={handleImportSubmit}
          style={{
            background: parsedItems.length > 0 ? '#4f46e5' : undefined,
            borderColor: parsedItems.length > 0 ? '#4f46e5' : undefined,
          }}
        >
          Confirm & Import ({parsedItems.length})
        </Button>,
      ]}
      width={840}
      destroyOnClose
    >
      {/* Category Type Context Banner */}
      <div
        style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          padding: '12px 16px',
          marginBottom: 16,
        }}
      >
        <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
          <div>
            <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
              Store & Product Category Schema
            </Text>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
              <span style={{ fontSize: 16 }}>{csvConfig.icon}</span>
              <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
                {shop?.shop_name || 'Store'}
              </span>
              <Tag color={csvConfig.badgeColor} style={{ fontWeight: 600, fontSize: 12, borderRadius: 6, margin: 0 }}>
                {csvConfig.label}
              </Tag>
            </div>
          </div>

          {/* Template Switcher Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>Template Schema:</Text>
            <Select
              value={currentArchetype}
              onChange={(val) => {
                setSelectedArchetypeOverride(val);
                setParsedItems([]);
              }}
              size="small"
              style={{ width: 190 }}
            >
              <Option value="medical">💊 Pharmacy & Medical</Option>
              <Option value="food">🍽️ Food & Restaurant</Option>
              <Option value="grocery">🛒 Grocery & Staples</Option>
              <Option value="service">🔧 Services & Repair</Option>
              <Option value="rental">🏍️ Rentals & Assets</Option>
              <Option value="product">🛍️ General Retail</Option>
            </Select>
          </div>
        </Flex>
      </div>

      {/* Dynamic Headers Explanation */}
      <div style={{ marginBottom: 16 }}>
        <Paragraph style={{ marginBottom: 6, fontSize: 13, color: '#334155' }}>
          Upload a CSV file structured specifically for <strong>{csvConfig.label}</strong> with these column headers:
        </Paragraph>
        <div
          style={{
            background: '#f1f5f9',
            padding: '8px 12px',
            borderRadius: 8,
            fontFamily: 'monospace',
            fontSize: 12,
            color: '#0f172a',
            overflowX: 'auto',
            whiteSpace: 'nowrap',
            border: '1px solid #cbd5e1',
          }}
        >
          {csvConfig.headers.join(', ')}
        </div>
      </div>

      {/* Action Buttons */}
      <Flex gap={12} style={{ marginBottom: 16 }} wrap="wrap">
        <Upload
          accept=".csv,text/csv"
          beforeUpload={handleFileUpload}
          showUploadList={false}
        >
          <Button icon={<UploadOutlined />} style={{ fontWeight: 600 }}>
            Select CSV File
          </Button>
        </Upload>

        <Button
          icon={<DownloadOutlined />}
          onClick={handleDownloadSample}
          style={{
            color: '#4f46e5',
            borderColor: '#c7d2fe',
            background: '#eef2ff',
            fontWeight: 600,
          }}
        >
          Download {csvConfig.label} Sample Template (.CSV)
        </Button>
      </Flex>

      {/* Parsed Items Preview Table */}
      {parsedItems.length > 0 && (
        <>
          <Alert
            message={
              <Flex justify="space-between" align="center" style={{ width: '100%' }}>
                <span>
                  <strong>{parsedItems.length}</strong> items parsed and mapped to the{' '}
                  <strong>{csvConfig.label}</strong> schema.
                </span>
                <Button size="small" type="link" danger onClick={() => setParsedItems([])}>
                  Clear File
                </Button>
              </Flex>
            }
            type="info"
            showIcon
            style={{ marginBottom: 12, borderRadius: 8 }}
          />
          <Table
            dataSource={parsedItems.map((it, idx) => ({ ...it, key: idx }))}
            columns={dynamicColumns}
            size="small"
            pagination={{ pageSize: 5 }}
            scroll={{ x: 750 }}
            style={{ border: '1px solid #f1f5f9', borderRadius: 8 }}
          />
        </>
      )}

      {/* Field Descriptions Tooltip Bar */}
      <Divider style={{ margin: '12px 0' }} />
      <div style={{ fontSize: 12, color: '#64748b' }}>
        <Flex align="center" gap={6} style={{ marginBottom: 4 }}>
          <InfoCircleOutlined style={{ color: '#4f46e5' }} />
          <Text strong style={{ fontSize: 12, color: '#475569' }}>
            {csvConfig.label} Column Guide:
          </Text>
        </Flex>
        <Flex wrap="wrap" gap={8} style={{ marginTop: 6 }}>
          {csvConfig.headers.map((h) => (
            <Tooltip key={h} title={csvConfig.headerDescriptions?.[h] || h}>
              <Tag
                style={{
                  cursor: 'pointer',
                  fontSize: 11,
                  borderRadius: 4,
                  background: h === 'name' || h === 'price' ? '#e0e7ff' : '#f8fafc',
                  color: h === 'name' || h === 'price' ? '#3730a3' : '#475569',
                  borderColor: h === 'name' || h === 'price' ? '#c7d2fe' : '#e2e8f0',
                }}
              >
                {h} {h === 'name' || h === 'price' ? '*' : ''}
              </Tag>
            </Tooltip>
          ))}
        </Flex>
      </div>
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
