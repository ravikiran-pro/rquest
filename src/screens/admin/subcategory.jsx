import React, { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Button, Select, Tag, Typography, message } from 'antd';
import { SettingOutlined, ShoppingOutlined } from '@ant-design/icons';
import { apiConfig, netWorkCall } from '../../app/utils';
import MasterRecords from './master_records';
import FormSchemaBuilderModal from './form_schema_builder';

const LISTING_TYPE_LABELS = {
  product: 'Products',
  food: 'Food menu',
  service: 'Services',
  rental: 'Rentals',
};

const PAGE_SIZE = 20;
const SEARCH_DELAY_MS = 300;

/**
 * All sub-categories across every category: a category filter and a search (both
 * applied on the server), status toggle, shop count, listing type and the listing form.
 */
const SubCategory = ({ handleProducts = null }) => {
  const [categories, setCategories] = useState([]);
  // 'all' or a category id
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: PAGE_SIZE,
    total: 0,
  });
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);
  const requestId = useRef(0);
  const [schemaTarget, setSchemaTarget] = useState(null);

  const filterCategoryId = categoryFilter === 'all' ? null : categoryFilter;

  const categoryNames = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories]
  );

  // Category names for the filter and the Category column
  useEffect(() => {
    let cancelled = false;
    netWorkCall(
      apiConfig.master_categories,
      'POST',
      JSON.stringify({ limit: 500, offset: 0 }),
      true
    )
      .then((res) => {
        if (!cancelled && Array.isArray(res?.data)) setCategories(res.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Search as the admin types, after a short pause
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchInitData = async (current = 1) => {
    const id = ++requestId.current;
    setLoading(true);
    try {
      const response = await netWorkCall(
        apiConfig.master_sub_categories,
        'POST',
        JSON.stringify({
          category_id: filterCategoryId ?? undefined,
          search: search || undefined,
          limit: PAGE_SIZE,
          offset: (current - 1) * PAGE_SIZE,
        }),
        true
      );
      if (id !== requestId.current) return;
      if (response?.success === false || !Array.isArray(response?.data)) {
        setError(
          response?.error ||
            response?.message ||
            'The server did not return the subcategory list.'
        );
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
      setError(
        'Could not reach the server. Check your connection and try again.'
      );
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
      setRows((prev) =>
        prev.map((row) => (row.id === record.id ? { ...row, is_active } : row))
      );
      message.success(
        is_active ? 'Subcategory is active' : 'Subcategory is inactive'
      );
    } catch (err) {
      console.error('Error updating subcategory status:', err);
      message.error('Could not update the subcategory status');
    }
  };

  /** Resolves true when saved, so the form closes. */
  const handleRowChange = async ({ id, name, img_url, is_active, category_id: rowCategoryId }) => {
    try {
      // An existing sub-category keeps its own category; a new one goes to the filtered category
      const categoryForSave = id >= 0 && rowCategoryId ? rowCategoryId : filterCategoryId;
      const res = await netWorkCall(
        apiConfig.master_sub_categories_create,
        'POST',
        JSON.stringify({
          subcategory_id: id >= 0 ? id : undefined,
          category_id: categoryForSave ?? undefined,
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

  // Refetch from page 1 when the category filter or the search changes
  useEffect(() => {
    fetchInitData(1);
  }, [filterCategoryId, search]);

  // Every sub-category has its own listing form; shops in it use that form
  const formColumn = {
    key: 'form_schema',
    title: 'Listing form',
    render: (record, { block } = {}) => {
      const fieldCount = Array.isArray(record.form_schema)
        ? record.form_schema.length
        : 0;
      return (
        <Button
          type={fieldCount > 0 ? 'default' : 'dashed'}
          size={block ? 'middle' : 'small'}
          block={block}
          icon={<SettingOutlined />}
          onClick={() => setSchemaTarget(record)}
        >
          {fieldCount > 0
            ? `${fieldCount} ${fieldCount === 1 ? 'field' : 'fields'}`
            : 'Set up form'}
          {record.form_customized ? ' · customised' : ''}
        </Button>
      );
    },
  };

  const categoryColumn = {
    key: 'category',
    title: 'Category',
    render: (record) => (
      <Typography.Text style={{ whiteSpace: 'nowrap' }}>
        {categoryNames.get(record.category_id) || '—'}
      </Typography.Text>
    ),
  };

  const usageColumn = {
    key: 'usage',
    title: 'Type · Shops',
    render: (record) => (
      <span style={{ whiteSpace: 'nowrap' }}>
        <Tag style={{ margin: 0 }}>
          {LISTING_TYPE_LABELS[record.listing_type] || 'Products'}
        </Tag>{' '}
        {record.shop_count || 0} {record.shop_count === 1 ? 'shop' : 'shops'}
      </span>
    ),
  };

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

  const categoryFilterControl = (
    <Select
      aria-label="Filter sub-categories by category"
      value={categoryFilter}
      onChange={(value) => setCategoryFilter(value)}
      showSearch
      optionFilterProp="label"
      style={{ width: 220, maxWidth: '100%' }}
      options={[
        { value: 'all', label: 'All categories' },
        ...categories.map((c) => ({ value: c.id, label: c.name })),
      ]}
    />
  );

  return (
    <>
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
        searchValue={searchInput}
        onSearchChange={(value) => setSearchInput(value)}
        searchPlaceholder="Search sub-categories by name"
        toolbarFilters={categoryFilterControl}
        canAdd={Boolean(filterCategoryId)}
        addDisabledReason="Pick a category in the filter first. New sub-categories are added to it."
        deleteWarning="Its products are deleted too. Sub-categories used by shops cannot be deleted; deactivate them instead."
        extraColumns={[
          categoryColumn,
          usageColumn,
          formColumn,
          ...(handleProducts ? [productsColumn] : []),
        ]}
      />
      <FormSchemaBuilderModal
        open={Boolean(schemaTarget)}
        onClose={() => setSchemaTarget(null)}
        subCategory={schemaTarget}
        onSuccess={() => fetchInitData(pagination.current)}
      />
    </>
  );
};

SubCategory.propTypes = {
  handleProducts: PropTypes.func,
};

export default SubCategory;
