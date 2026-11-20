import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { message } from 'antd';
import { apiConfig, netWorkCall } from '../../app/utils';
import MasterRecords from './master_records';

const PAGE_SIZE = 10;

const Products = ({ category_id = null, sub_category_id = null }) => {
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: PAGE_SIZE, total: 0 });
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);
  const requestId = useRef(0);
  // The server only creates products inside a subcategory
  const canAdd = sub_category_id !== null && sub_category_id >= 0;

  const fetchInitData = async (current = 1) => {
    const id = ++requestId.current;
    setLoading(true);
    try {
      const response = await netWorkCall(
        apiConfig.master_products,
        'POST',
        JSON.stringify({
          category_id: category_id,
          sub_category_id: sub_category_id,
          limit: PAGE_SIZE,
          offset: (current - 1) * PAGE_SIZE,
        }),
        true
      );
      if (id !== requestId.current) return;
      if (response?.success === false || !Array.isArray(response?.data)) {
        setError(response?.error || response?.message || 'The server did not return the product list.');
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
        apiConfig.master_products_delete,
        'DELETE',
        JSON.stringify({
          product_id: record.id,
        }),
        true
      );
      if (!res?.success) {
        message.error(res?.error || 'Could not delete the product');
        return;
      }
      message.success('Product deleted');
      fetchInitData(pagination.current);
    } catch (err) {
      console.error('Error deleting product:', err);
      message.error('Could not delete the product');
    }
  };

  const handleStatusChange = async (record, is_active) => {
    try {
      const res = await netWorkCall(
        apiConfig.master_products_stauts,
        'PUT',
        JSON.stringify({
          product_id: record.id,
          is_active,
        }),
        true
      );
      if (!res?.success) {
        message.error(res?.error || 'Could not update the product status');
        return;
      }
      setRows((prev) => prev.map((row) => (row.id === record.id ? { ...row, is_active } : row)));
      message.success(is_active ? 'Product is active' : 'Product is inactive');
    } catch (err) {
      console.error('Error updating product status:', err);
      message.error('Could not update the product status');
    }
  };

  /** Resolves true when saved, so the form closes. */
  const handleRowChange = async ({ id, name, img_url, description, is_active }) => {
    try {
      const res = await netWorkCall(
        apiConfig.master_products_create,
        'POST',
        JSON.stringify({
          product_id: id >= 0 ? id : undefined,
          category_id: category_id,
          sub_category_id: sub_category_id,
          name: name,
          img_url: img_url,
          description: description,
          is_active: is_active ?? true,
        }),
        true
      );
      if (!res?.success) {
        message.error(res?.error || 'Failed to save product');
        return false;
      }
      fetchInitData(id >= 0 ? pagination.current : 1);
      message.success(res.message || 'Product saved');
      return true;
    } catch (err) {
      console.error('Error saving product:', err);
      message.error('Failed to save product');
      return false;
    }
  };

  useEffect(() => {
    fetchInitData();
  }, [category_id, sub_category_id]);

  return (
    <MasterRecords
      noun="product"
      nounPlural="products"
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
      canAdd={canAdd}
      addDisabledReason="Legacy products are added inside a subcategory. Use the master catalog for new items."
      withDescription
    />
  );
};

Products.propTypes = {
  category_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  sub_category_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default Products;
