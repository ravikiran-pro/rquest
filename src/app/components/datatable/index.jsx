import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Space, Table, Tag, Input, Button, Row, Col, Avatar, Upload } from 'antd';
import { apiConfig, config } from '../../utils';
import { PlusOutlined, PictureOutlined } from '@ant-design/icons';
import { colors, typography, radii } from '../../styles/theme';

const DataTable = ({ rows, columns, initRow, isAddNew, pagination, handleTableChange, handleStatusChange, handleRowChange, handleDelete }) => {
  const [data, setData] = useState(Array.isArray(rows) ? rows : []);
  const [editableRow, setEditableRow] = useState(null);
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    setData(Array.isArray(rows) ? rows : []);
    setEditableRow(null);
    setIsNew(false);
  }, [rows]);

  const handleStateUpdate = (updatedState, index) => {
    const nextRow = {
      ...(data?.[index] || {}),
      ...updatedState,
    };
    setData((prev) => (prev || []).map((row, idx) => (idx === index ? nextRow : row)));
    return nextRow;
  };

  const handleChange = (keyName, value, index) => {
    if (keyName === 'is_active') {
      handleStatusChange({ category_id: data[index]?.id, is_active: value });
    }
    handleStateUpdate({ [keyName]: value }, index);
  };

  const handleEdit = (index) => {
    setEditableRow(index);
  };

  const handleSave = (index) => {
    const currentRow = data?.[index];
    if (currentRow) {
      handleRowChange({ ...currentRow });
    }
    setEditableRow(null);
    setIsNew(false);
  };

  const handleToggleNew = () => {
    if (isNew) {
      setData(Array.isArray(rows) ? [...rows] : []);
      setEditableRow(null);
      setIsNew(false);
    } else {
      setData((prev) => [{ ...(initRow || {}), __tempKey: `new-${Date.now()}` }, ...(prev || [])]);
      setEditableRow(0);
      setIsNew(true);
    }
  };

  const onImageUpload = async (file, index) => {
    try {
      const formData = new FormData();
      formData.append('fileData', file);

      const response = await fetch(`${config.api_url}/api/v1/${apiConfig.upload}`, {
        method: 'POST',
        body: formData,
      });
      const resJson = await response.json();
      handleStateUpdate({ img_url: resJson?.data?.Location }, index);
    } catch (error) {
      console.error(error);
    }
    return false;
  };

  const renderCell = (item, value, record, index) => {
    if (typeof item.render === 'function') {
      return item.render(value, record, index);
    }
    const key = item.key;
    const isEditable = index === editableRow;

    switch (key) {
      case 'img_url':
        return isEditable ? (
          <Upload
            listType="picture"
            beforeUpload={(file) => onImageUpload(file, index)}
            maxCount={1}
          >
            <Button type="link" size="small" style={{ color: colors.secondary, fontWeight: 600, padding: 0 }}>
              Upload
            </Button>
          </Upload>
        ) : (
          <Avatar
            src={value || undefined}
            icon={!value ? <PictureOutlined /> : undefined}
            alt={record?.name || 'Item'}
            style={{ backgroundColor: colors.primaryLight, color: colors.primary }}
          />
        );
      case 'menu':
        return (
          <Button
            type="default"
            style={{
              borderColor: colors.border,
              color: colors.primary,
              fontWeight: 600,
              borderRadius: radii.md,
            }}
            onClick={() => item?.onClick(record)}
          >
            Add {item?.title}
          </Button>
        );
      case 'createdBy':
        return <span style={{ color: colors.textMuted, fontFamily: typography.fontFamily.body }}>Admin</span>;
      case 'is_active':
        return (
          <Tag
            style={{
              cursor: 'pointer',
              borderRadius: radii.full,
              fontWeight: 600,
              fontSize: 12,
              padding: '2px 10px',
              background: value ? colors.semantic.successLight : colors.semantic.errorLight,
              color: value ? colors.semantic.success : colors.semantic.error,
              borderColor: value ? colors.semantic.successBorder : colors.semantic.errorBorder,
            }}
            onClick={() => handleChange('is_active', !value, index)}
          >
            {value ? 'Active' : 'Inactive'}
          </Tag>
        );
      case 'action':
        return isEditable ? (
          <Space size="middle">
            <Button
              type="link"
              size="small"
              style={{ color: colors.secondary, fontWeight: 600, padding: 0 }}
              onClick={() => handleSave(index)}
            >
              Save
            </Button>
            <Button
              type="link"
              size="small"
              style={{ color: colors.textMuted, fontWeight: 500, padding: 0 }}
              onClick={() => {
                setData(Array.isArray(rows) ? [...rows] : []);
                setEditableRow(null);
                setIsNew(false);
              }}
            >
              Cancel
            </Button>
          </Space>
        ) : (
          <Space size="middle">
            <Button
              type="link"
              size="small"
              style={{ color: colors.secondary, fontWeight: 600, padding: 0 }}
              onClick={() => handleEdit(index)}
            >
              Edit
            </Button>
            <Button
              type="link"
              danger
              size="small"
              style={{ color: colors.semantic.error, fontWeight: 600, padding: 0 }}
              onClick={() => handleDelete(record)}
            >
              Delete
            </Button>
          </Space>
        );
      default:
        return isEditable ? (
          <Input
            value={value ?? ''}
            style={{ borderRadius: radii.md, borderColor: colors.border }}
            onChange={(e) => handleChange(key, e.target.value, index)}
          />
        ) : (
          <span style={{ color: colors.textMain, fontFamily: typography.fontFamily.body }}>{value}</span>
        );
    }
  };

  const columnsRender = columns.map((item) => ({
    ...item,
    title: (
      <span style={{ fontFamily: typography.fontFamily.headline, fontWeight: 700, color: colors.textMain }}>
        {item.title}
      </span>
    ),
    dataIndex: item.key,
    key: item.key,
    render: (value, record, index) => renderCell(item, value, record, index),
  }));

  return (
    <>
      <Col span={24} style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 18 }}>
        {isAddNew && (
          <Row>
            <Col>
              <Button
                type="primary"
                style={{
                  background: colors.primary,
                  borderColor: colors.primary,
                  borderRadius: radii.md,
                  fontWeight: 600,
                  boxShadow: '0 2px 8px rgba(11, 45, 107, 0.18)',
                }}
                onClick={handleToggleNew}
              >
                {isNew ? 'Cancel New' : 'Add New'}
                <PlusOutlined />
              </Button>
            </Col>
          </Row>
        )}
      </Col>
      <div
        style={{
          border: `1px solid ${colors.border}`,
          borderRadius: radii.lg,
          overflow: 'hidden',
          background: colors.surface,
        }}
      >
        <Table
          rowKey={(record, idx) =>
            record?.id !== undefined && record?.id !== null
              ? record.id
              : record?.__tempKey || `row-${idx}`
          }
          columns={columnsRender}
          dataSource={data}
          pagination={pagination}
          onChange={handleTableChange}
          scroll={{ x: 'max-content' }}
        />
      </div>
    </>
  );
};

DataTable.propTypes = {
  rows: PropTypes.array,
  columns: PropTypes.array,
  initRow: PropTypes.object,
  isAddNew: PropTypes.bool,
  pagination: PropTypes.object,
  handleTableChange: PropTypes.func,
  handleStatusChange: PropTypes.func,
  handleRowChange: PropTypes.func,
  handleDelete: PropTypes.func,
};

export default DataTable;

