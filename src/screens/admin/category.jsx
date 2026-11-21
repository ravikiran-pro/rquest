import React, { useEffect, useRef, useState } from 'react';
import { Button, Typography, message } from 'antd';
import { ArrowLeftOutlined, AppstoreOutlined, SettingOutlined } from '@ant-design/icons';
import { apiConfig, netWorkCall } from '../../app/utils';
import MasterRecords from './master_records';
import FormSchemaBuilderModal from './form_schema_builder';
import SubCategory from './subcategory';

const PAGE_SIZE = 10;

const Category = () => {
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: PAGE_SIZE, total: 0 });
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCategoryForSchema, setSelectedCategoryForSchema] = useState(null);
  const [isSchemaModalOpen, setIsSchemaModalOpen] = useState(false);
  // The category whose sub-categories are open (null: the category list)
  const [openCategory, setOpenCategory] = useState(null);
  const requestId = useRef(0);

  const fetchInitData = async (current = 1) => {
    const id = ++requestId.current;
    setLoading(true);
    try {
      const response = await netWorkCall(
        apiConfig.master_categories,
        'POST',
        JSON.stringify({
          limit: PAGE_SIZE,
          offset: (current - 1) * PAGE_SIZE,
        }),
        true
      );
      if (id !== requestId.current) return;
      if (response?.success === false || !Array.isArray(response?.data)) {
        setError(response?.error || response?.message || 'The server did not return the category list.');
        return;
      }
      const total = response?.count || 0;
      // The page emptied (its last row was deleted): step back to the last page with rows
      if (response.data.length === 0 && current > 1 && total > 0) {
        fetchInitData(Math.max(1, Math.ceil(total / PAGE_SIZE)));
        return;
      }
      setError(null);
      setPagination({ current, pageSize: PAGE_SIZE, total });
      setRows(response.data);
    } catch (err) {
      if (id !== requestId.current) return;
      console.error('Error fetching data:', err);
      setError('Could not reach the server. Check your connection and try again.');
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        setLoaded(true);
      }
    }
  };

  const handleDelete = async (record) => {
    try {
      const res = await netWorkCall(
        apiConfig.master_categories_delete,
        'DELETE',
        JSON.stringify({
          category_id: record.id,
        }),
        true
      );
      if (!res?.success) {
        message.error(res?.error || 'Could not delete the category');
        return;
      }
      message.success(res.message || 'Category deleted');
      fetchInitData(pagination.current);
    } catch (err) {
      console.error('Error deleting category:', err);
      message.error('Could not delete the category');
    }
  };

  const handleStatusChange = async (record, is_active) => {
    try {
      const res = await netWorkCall(
        apiConfig.master_categories_stauts,
        'PUT',
        JSON.stringify({
          category_id: record.id,
          is_active,
        }),
        true
      );
      if (!res?.success) {
        message.error(res?.error || 'Could not update the category status');
        return;
      }
      setRows((prev) => prev.map((row) => (row.id === record.id ? { ...row, is_active } : row)));
      message.success(is_active ? 'Category is active' : 'Category is inactive');
    } catch (err) {
      console.error('Error updating category status:', err);
      message.error('Could not update the category status');
    }
  };

  /** Resolves true when saved, so the form closes. */
  const handleRowChange = async ({ id, name, img_url, is_active }) => {
    try {
      const res = await netWorkCall(
        apiConfig.master_categories_create,
        'POST',
        JSON.stringify({
          category_id: id >= 0 ? id : undefined,
          name: name,
          img_url: img_url,
          is_active: is_active ?? true,
          count: pagination?.total,
        }),
        true
      );

      if (!res?.success) {
        message.error(res?.error || 'Failed to save category');
        return false;
      }

      fetchInitData(id >= 0 ? pagination.current : 1);

      if (res.applied_template && res.data) {
        // A new category starts with a ready-made form: open it for review
        message.success(res.message);
        setSelectedCategoryForSchema(res.data);
        setIsSchemaModalOpen(true);
      } else {
        message.success(res.message || 'Category saved successfully');
      }
      return true;
    } catch (err) {
      console.error('Error saving category:', err);
      message.error('Failed to save category');
      return false;
    }
  };

  useEffect(() => {
    fetchInitData();
  }, []);

  // Sub-categories carry the listing forms shops use; open them per category
  const subCategoriesColumn = {
    key: 'sub_categories',
    title: 'Sub-categories',
    render: (record, { block } = {}) => (
      <Button
        type="primary"
        ghost
        size={block ? 'middle' : 'small'}
        block={block}
        icon={<AppstoreOutlined />}
        onClick={() => setOpenCategory(record)}
      >
        Open sub-categories
      </Button>
    ),
  };

  const formColumn = {
    key: 'form_schema',
    title: 'Fallback form',
    render: (record, { block } = {}) => {
      const fieldCount = Array.isArray(record.form_schema) ? record.form_schema.length : 0;
      return (
        <Button
          type={fieldCount > 0 ? 'default' : 'dashed'}
          size={block ? 'middle' : 'small'}
          block={block}
          icon={<SettingOutlined />}
          onClick={() => {
            setSelectedCategoryForSchema(record);
            setIsSchemaModalOpen(true);
          }}
        >
          {fieldCount > 0 ? `${fieldCount} ${fieldCount === 1 ? 'field' : 'fields'} · Edit form` : 'Set up form'}
        </Button>
      );
    },
  };

  if (openCategory) {
    return (
      <>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => setOpenCategory(null)}>
            All categories
          </Button>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {openCategory.name}
          </Typography.Title>
          <Typography.Text type="secondary">
            Each sub-category has its own listing form, used by every shop in it.
          </Typography.Text>
        </div>
        <SubCategory category_id={openCategory.id} />
      </>
    );
  }

  return (
    <>
      <MasterRecords
        noun="category"
        nounPlural="categories"
        rows={rows}
        total={pagination.total}
        page={pagination.current}
        pageSize={PAGE_SIZE}
        loading={loading}
        loaded={loaded}
        error={error}
        onPageChange={fetchInitData}
        onReload={() => fetchInitData(pagination.current)}
        onSave={handleRowChange}
        onToggleActive={handleStatusChange}
        onDelete={handleDelete}
        deleteWarning="Its subcategories and products are deleted too. This cannot be undone."
        extraColumns={[subCategoriesColumn, formColumn]}
      />

      <FormSchemaBuilderModal
        open={isSchemaModalOpen}
        onClose={() => {
          setIsSchemaModalOpen(false);
          setSelectedCategoryForSchema(null);
        }}
        category={selectedCategoryForSchema}
        onSuccess={() => fetchInitData(pagination.current)}
      />
    </>
  );
};

export default Category;
