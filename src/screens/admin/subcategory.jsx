import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import DataTable from '../../app/components/datatable';
import { message } from 'antd';
import { apiConfig, netWorkCall } from '../../app/utils';

const SubCategory = ({
  category_id = null,
  handleProducts = () => { }
}) => {

  console.log('category_id', category_id)
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 7, total: 0 });

  const columns = [
    { key: "name", title: "Name" },
    { key: "img_url", title: "Image" },
    { key: "createdBy", title: "Created By" },
    { key: "is_active", title: "Active" },
    { key: "action", title: "Action" },
    { key: "menu", title: "Products", onClick: (data) => handleProducts(data) },
  ];

  const fetchInitData = async (current = 1) => {
    try {
      const response = await netWorkCall(
        apiConfig.master_sub_categories,
        'POST',
        JSON.stringify({
          category_id: category_id,
          limit: pagination.pageSize,
          offset: (current - 1) * pagination.pageSize,
        }),
        true
      );

      setPagination({
        ...pagination,
        current,
        total: response?.count || 0,
      });
      setRows(response.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleTableChange = (pag) => {
    fetchInitData(pag.current);
  };

  const handleDelete = async (record) => {
    try {
      let res = await netWorkCall(
        apiConfig.master_sub_categories_delete,
        'DELETE',
        JSON.stringify({
          sub_category_id: record.id,
        }),
        true
      );

      // Update the local state
      fetchInitData(pagination.current);

      // Show success message
      message.success(res.message);
    } catch (error) {
      console.error('Error updating category status:', error);
      message.error('Failed to update category status');
    }
  }

  const handleStatusChange = async ({ category_id, is_active }) => {
    try {
      await netWorkCall(
        apiConfig.master_sub_categories_stauts,
        'PUT',
        JSON.stringify({
          subcategory_id: category_id,
          is_active
        }),
        true
      );

      // Update the local state
      fetchInitData(pagination.current);

      // Show success message
      message.success('Subcategory status updated successfully');
    } catch (error) {
      console.error('Error updating subcategory status:', error);
      message.error('Failed to update subcategory status');
    }
  };

  const handleRowChange = async ({ id, name, img_url, is_active }) => {
    try {
      await netWorkCall(
        apiConfig.master_sub_categories_create,
        'POST',
        JSON.stringify({
          subcategory_id: id >= 0 ? id : undefined,
          category_id: category_id,
          name: name,
          img_url: img_url,
          is_active: is_active,
          count: pagination?.total
        }),
        true
      );

      // Update the local state
      fetchInitData(pagination.current);

      // Show success message
      message.success('Subcategory edited successfully');
    } catch (error) {
      console.error('Error editing subcategory:', error);
      message.error('Failed to edit subcategory');
    }
  };

  useEffect(() => {
    fetchInitData();
  }, [category_id]);

  return (
    <>
      <DataTable
        rows={rows}
        pagination={pagination}
        columns={columns}
        initRow={{
          name: '',
          img_url: '',
          is_active: true
        }}
        isAddNew={category_id !== null && category_id >= 0}
        handleTableChange={handleTableChange}
        handleStatusChange={handleStatusChange}
        handleRowChange={handleRowChange}
        handleDelete={handleDelete}
      />
    </>
  );
};

SubCategory.propTypes = {
  category_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  handleProducts: PropTypes.func,
};

export default SubCategory;
