import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Button, message } from 'antd';
import { ShoppingOutlined } from '@ant-design/icons';
import { apiConfig, netWorkCall } from '../../app/utils';
import MasterRecords from './master_records';

const PAGE_SIZE = 10;

const SubCategory = ({ category_id = null, handleProducts = () => {} }) => {
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: PAGE_SIZE, total: 0 });
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);
  const requestId = useRef(0);
  const hasCategory = category_id !== null && category_id >= 0;

  const fetchInitData = async (current = 1) => {
    const id = ++requestId.current;
    setLoading(true);
    try {
      const response = await netWorkCall(
        apiConfig.master_sub_categories,
        'POST',
        JSON.stringify({
          category_id: category_id,
          limit: PAGE_SIZE,
          offset: (current - 1) * PAGE_SIZE,
        }),
        true
      );
      if (id !== requestId.current) return;
      if (response?.success === false || !Array.isArray(response?.data)) {
        setError(response?.error || response?.message || 'The server did not return the subcategory list.');
        return;
      }
      const total = response?.count || 0;
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
        apiConfig.master_sub_categories_delete,
        'DELETE',
        JSON.stringify({
          sub_category_id: record.id,
        }),
        true
      );
      if (!res?.success) {
        message.error(res?.error || 'Could not delete the subcategory');
        return;
      }
      message.success('Subcategory deleted');
      fetchInitData(pagination.current);
    } catch (err) {
      console.error('Error deleting subcategory:', err);
      message.error('Could not delete the subcategory');
    }
  };

  const handleStatusChange = async (record, is_active) => {
    try {
      const res = await netWorkCall(
        apiConfig.master_sub_categories_stauts,
        'PUT',
        JSON.stringify({
          subcategory_id: record.id,
          is_active,
        }),
        true
      );
      if (!res?.success) {
        message.error(res?.error || 'Could not update the subcategory status');
        return;
      }
      setRows((prev) => prev.map((row) => (row.id === record.id ? { ...row, is_active } : row)));
      message.success(is_active ? 'Subcategory is active' : 'Subcategory is inactive');
    } catch (err) {
      console.error('Error updating subcategory status:', err);
      message.error('Could not update the subcategory status');
    }
  };

  /** Resolves true when saved, so the form closes. */
  const handleRowChange = async ({ id, name, img_url, is_active }) => {
    try {
      const res = await netWorkCall(
        apiConfig.master_sub_categories_create,
        'POST',
        JSON.stringify({
          subcategory_id: id >= 0 ? id : undefined,
          category_id: category_id,
          name: name,
          img_url: img_url,
          is_active: is_active ?? true,
          count: pagination?.total,
        }),
        true
      );
      if (!res?.success) {
        message.error(res?.error || 'Failed to save subcategory');
        return false;
      }
      fetchInitData(id >= 0 ? pagination.current : 1);
      message.success(res.message || 'Subcategory saved');
      return true;
    } catch (err) {
      console.error('Error saving subcategory:', err);
      message.error('Failed to save subcategory');
      return false;
    }
  };

  useEffect(() => {
    fetchInitData();
  }, [category_id]);

  const productsColumn = {
    key: 'products',
    title: 'Products',
    render: (record, { block } = {}) => (
      <Button
        size={block ? 'middle' : 'small'}
        block={block}
        icon={<ShoppingOutlined />}
        onClick={() => handleProducts(record)}
      >
        Manage products
      </Button>
    ),
  };

  return (
    <MasterRecords
      noun="subcategory"
      nounPlural="subcategories"
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
      canAdd={hasCategory}
      addDisabledReason="Open a category first to add subcategories to it."
      deleteWarning="Its products are deleted too. This cannot be undone."
      extraColumns={[productsColumn]}
    />
  );
};

SubCategory.propTypes = {
  category_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  handleProducts: PropTypes.func,
};

export default SubCategory;
